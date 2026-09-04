import { tool } from "ai";
import { z } from "zod";
import { setDefaultResultOrder } from "node:dns";
import { setGlobalDispatcher, Agent } from "undici";
import { newsSearch } from "./news-search";
import { sanitizeExternalContent, scanExternalContent } from "../../security/external-content-scanner";

export type TavilySearchOptions = {
  days?: number;
  timeRange?: "day" | "week" | "month" | "year";
  [key: string]: any;
};

/** Reduces dual-stack (IPv6/IPv4) connection failures that surface as AggregateError on some hosts (e.g. WSL2). */
let tavilyDnsPreferIpv4Applied = false;
function ensureTavilyDnsPreferIpv4(): void {
  if (tavilyDnsPreferIpv4Applied) return;
  try {
    setDefaultResultOrder("ipv4first");
    setGlobalDispatcher(
      new Agent({
        connect: {
          autoSelectFamily: false,
        },
      })
    );
    tavilyDnsPreferIpv4Applied = true;
  } catch {
    try {
      setDefaultResultOrder("ipv4first");
      tavilyDnsPreferIpv4Applied = true;
    } catch {
      // Edge / restricted runtimes
    }
  }
}

const TAVILY_PARALLEL_LIMIT = 6;

async function allSettledWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function runWorker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        const value = await worker(items[i], i);
        results[i] = { status: "fulfilled", value };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

function sanitizeUrl(url: string): string {
  return url.replace(/\s+/g, "%20");
}

const TRANSIENT_AXIOS_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ERR_NETWORK",
  "EPIPE",
  "ECANCELED",
  "ECONNABORTED",
]);

const MAX_TRANSIENT_RETRIES = 1;
const TRANSIENT_BACKOFF_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatAggregateErrorForLog(err: unknown): string {
  // ponytail: recursively unwrap cause and format AggregateError errors
  if (err instanceof AggregateError && Array.isArray(err.errors)) {
    return err.errors.map((e) => formatAggregateErrorForLog(e)).join("; ");
  }
  if (err && typeof err === "object" && "cause" in err && (err as { cause?: unknown }).cause) {
    return formatAggregateErrorForLog((err as { cause: unknown }).cause);
  }
  return err instanceof Error ? err.message : String(err);
}

function isTransientNetworkError(error: unknown, depth = 0): boolean {
  if (error == null || depth > 6) return false;

  if (error instanceof AggregateError) {
    return error.errors.some((e) => isTransientNetworkError(e, depth + 1));
  }

  if (typeof error !== "object") {
    const s = String(error);
    return (
      s.includes("AggregateError") ||
      TRANSIENT_AXIOS_CODES.has(s) ||
      [...TRANSIENT_AXIOS_CODES].some((c) => s.includes(c))
    );
  }

  const e = error as Record<string, unknown>;
  const code = typeof e.code === "string" ? e.code : undefined;
  if (code && TRANSIENT_AXIOS_CODES.has(code)) return true;

  if (e.cause) return isTransientNetworkError(e.cause, depth + 1);

  const msg = String(e.message ?? "");
  if (msg.includes("AggregateError")) return true;
  if ([...TRANSIENT_AXIOS_CODES].some((c) => msg.includes(c))) return true;
  if (msg.includes("unexpected error occurred while making the request")) {
    return (
      msg.includes("AggregateError") ||
      [...TRANSIENT_AXIOS_CODES].some((c) => msg.includes(c))
    );
  }

  return false;
}

async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return (
      response.ok &&
      (response.headers.get("content-type")?.startsWith("image/") ?? false)
    );
  } catch {
    return false;
  }
}

let currentApiKeyIndex = 0;

function getNextApiKey(): string | undefined {
  const envKeys = (process.env.TAVILY_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (envKeys.length === 0) {
    return undefined;
  }
  const key = envKeys[currentApiKeyIndex % envKeys.length];
  currentApiKeyIndex = (currentApiKeyIndex + 1) % envKeys.length;
  return key;
}

type TavilyTopic = "general" | "news" | "finance";

type SearchRow = {
  query: string;
  topic: TavilyTopic;
  answer?: string;
  results: Array<{
    url: string;
    title: string;
    content: string;
    raw_content?: string;
    published_date?: string;
  }>;
  images: unknown[];
};

function getRawText(obj: Record<string, unknown>): string | undefined {
  const raw =
    (typeof obj.rawContent === "string" && obj.rawContent) ||
    (typeof obj.raw_content === "string" && obj.raw_content) ||
    undefined;
  return raw;
}

function getPublishedDate(obj: Record<string, unknown>): string | undefined {
  return (
    (typeof obj.publishedDate === "string" && obj.publishedDate) ||
    (typeof obj.published_date === "string" && obj.published_date) ||
    undefined
  );
}

async function fetchTavilySearch(apiKey: string, query: string, options: any): Promise<any> {
  const payload: Record<string, any> = {
    api_key: apiKey,
    query,
    topic: options.topic || "general",
    search_depth: options.searchDepth || "advanced",
    max_results: options.maxResults || 5,
    include_answer: options.includeAnswer || "advanced",
    include_images: false,
    include_image_descriptions: false,
  };
  if (options.includeDomains && options.includeDomains.length > 0) {
    payload.include_domains = options.includeDomains;
  }
  if (options.excludeDomains && options.excludeDomains.length > 0) {
    payload.exclude_domains = options.excludeDomains;
  }
  if (options.days !== undefined) {
    payload.days = options.days;
  }
  if (options.timeRange !== undefined) {
    payload.time_range = options.timeRange;
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Tavily HTTP ${res.status}: ${errText || res.statusText}`);
  }

  return await res.json();
}

export const webSearch = tool({
  description:
    "Search the web for REAL-TIME, up-to-date information, news, roadmap updates, release schedules, documentation, technical details, prices, and facts. Pass 1-3 distinct, well-targeted queries to maximize coverage (e.g. general query + specific term query). Default topics ['general'], searchDepth ['advanced'], and maxResults [5]. Add 'news' for explicit news coverage; add 'finance' for explicit market/price data.",
  parameters: z.object({
    queries: z.array(
      z.string().describe("Array of search queries. Do NOT include specific years like '2025' or '2026' unless asked - let the search find the most relevant results. Use 'latest' or 'upcoming' for time-sensitive queries.")
    ),
    maxResults: z
      .array(
        z
          .number()
          .describe("Array of maximum number of results to return per query. Default is [5].")
      )
      .optional()
      .default([5]),
    topics: z
      .array(
        z
          .enum(["general", "news", "finance"])
          .describe("Topic types to search. Default to ['general']. Add 'news' for explicit news requests; add 'finance' for explicit market/price data.")
      )
      .optional()
      .default(["general"]),
    searchDepth: z
      .array(
        z
          .enum(["basic", "advanced"])
          .describe("Array of search depths. Default to ['advanced'] for rich, accurate results.")
      )
      .optional()
      .default(["advanced"]),
    timeRange: z
      .enum(["day", "week", "month", "year", "all"])
      .describe("Time range to filter results. Use 'day' for today's news, 'week' for weekly updates, 'month' for monthly trends, 'all' for best overall relevance. Default is 'all'.")
      .optional()
      .default("all"),
    include_domains: z
      .array(z.string())
      .describe("Optional list of domains to restrict results to. Leave empty for diverse sources.")
      .optional()
      .default([]),
    exclude_domains: z
      .array(z.string())
      .describe("A list of domains to exclude from all search results.")
      .default([]),
  }),
  execute: async ({
    queries,
    maxResults = [5],
    topics = ["general"],
    searchDepth = ["advanced"],
    timeRange = "all",
    include_domains = [],
    exclude_domains = [],
  }: {
    queries: string[];
    maxResults?: number[];
    topics?: TavilyTopic[];
    searchDepth?: ("basic" | "advanced")[];
    timeRange?: "day" | "week" | "month" | "year" | "all";
    include_domains?: string[];
    exclude_domains?: string[];
  }) => {
    const includeImageDescriptions = true;
    const warnings: string[] = [];

    console.log("WEB SEARCH STARTING =======");
    console.log("Queries:", queries);
    console.log("Max Results:", maxResults);
    console.log("Topics:", topics);
    console.log("Search Depths:", searchDepth);
    console.log("Time Range:", timeRange);
    console.log("Include Domains:", include_domains);
    console.log("Exclude Domains:", exclude_domains);

    // Map timeRange to days for Tavily API
    const timeRangeToDays: Record<string, number | undefined> = {
      day: 1,
      week: 7,
      month: 30,
      year: 365,
      all: undefined,
    };

    const tavilyTimeRange: "day" | "week" | "month" | "year" | undefined =
      timeRange === "all" ? undefined : timeRange;

    ensureTavilyDnsPreferIpv4();

    const envKeysCount = (process.env.TAVILY_API_KEYS || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean).length;

    const searchWithRetry = async (
      query: string,
      topic: TavilyTopic,
      index: number
    ): Promise<SearchRow> => {
      let rateLimitRotations = 0;

      while (rateLimitRotations < Math.max(envKeysCount, 1)) {
        const apiKey = getNextApiKey();
        if (!apiKey) {
          throw new Error(
            "No Tavily API keys found. Please set TAVILY_API_KEYS environment variable."
          );
        }

        let transientAttempt = 0;

        while (transientAttempt <= MAX_TRANSIENT_RETRIES) {
          try {
            const isNewsOrFinance = topic === "news" || topic === "finance";
            const daysValue =
              timeRangeToDays[timeRange] ?? (isNewsOrFinance && timeRange !== "all" ? 7 : undefined);

            const depth =
              searchDepth[index] || searchDepth[0] || "advanced";
            // Tavily REST API accepts none | basic | advanced (SDK types are incomplete).
            const includeAnswerLevel: "none" | "basic" | "advanced" =
              depth === "advanced" ? "advanced" : "basic";

            const timeFilter: Pick<TavilySearchOptions, "days" | "timeRange"> =
              timeRange === "all"
                ? {}
                : daysValue !== undefined
                  ? { days: daysValue }
                  : tavilyTimeRange !== undefined
                    ? { timeRange: tavilyTimeRange }
                    : {};

            let data = await fetchTavilySearch(apiKey, query, {
              topic,
              maxResults: maxResults[index] || maxResults[0] || 5,
              searchDepth: depth,
              includeAnswer: includeAnswerLevel,
              includeImages: false,
              includeImageDescriptions: false,
              includeDomains:
                include_domains.length > 0 ? include_domains : undefined,
              excludeDomains: exclude_domains,
              ...timeFilter,
            });

            // Fallback: If time-filtered search returned 0 results, retry without time constraint
            if ((!data.results || data.results.length === 0) && timeRange !== "all") {
              console.log(`[WEB-SEARCH] Time-filtered search returned 0 results for "${query}". Retrying with all-time search...`);
              data = await fetchTavilySearch(apiKey, query, {
                topic,
                maxResults: maxResults[index] || maxResults[0] || 5,
                searchDepth: depth,
                includeAnswer: includeAnswerLevel,
                includeImages: false,
                includeImageDescriptions: false,
                includeDomains:
                  include_domains.length > 0 ? include_domains : undefined,
                excludeDomains: exclude_domains,
              });
            }

            return {
              query,
              topic,
              answer: data.answer,
              results: (data.results || []).map((obj: any) => {
                const row = obj as unknown as Record<string, unknown>;
                const rawText = getRawText(row);
                const contentScan = scanExternalContent(
                  typeof row.content === "string" ? row.content : ""
                );
                const rawContentScan = rawText
                  ? scanExternalContent(rawText)
                  : null;

                if (
                  !contentScan.safe ||
                  (rawContentScan && !rawContentScan.safe)
                ) {
                  console.warn(
                    `[WEB-SEARCH-SECURITY] Threats in result from ${row.url}:`,
                    {
                      contentThreats: contentScan.threats
                        .slice(0, 2)
                        .map((t) => t.description),
                      rawContentThreats: rawContentScan?.threats
                        .slice(0, 2)
                        .map((t) => t.description),
                    }
                  );
                }

                return {
                  url: String(row.url ?? ""),
                  title: String(row.title ?? ""),
                  content: sanitizeExternalContent(
                    typeof row.content === "string" ? row.content : ""
                  ),
                  raw_content: rawText
                    ? sanitizeExternalContent(rawText)
                    : undefined,
                  published_date: getPublishedDate(row),
                };
              }),
              images: includeImageDescriptions
                ? await Promise.all(
                    data.images.map(
                      async ({
                        url,
                        description,
                      }: {
                        url: string;
                        description?: string;
                      }) => {
                        const sanitizedUrl = sanitizeUrl(url);
                        const isValid = await isValidImageUrl(sanitizedUrl);

                        return isValid
                          ? {
                              url: sanitizedUrl,
                              description: description ?? "",
                            }
                          : null;
                      }
                    )
                  ).then((results) =>
                    results.filter(
                      (
                        image
                      ): image is {
                        url: string;
                        description: string;
                      } =>
                        image !== null &&
                        typeof image === "object" &&
                        typeof image.description === "string" &&
                        image.description !== ""
                    )
                  )
                : await Promise.all(
                    data.images.map(async ({ url }: { url: string }) => {
                      const sanitizedUrl = sanitizeUrl(url);
                      return (await isValidImageUrl(sanitizedUrl))
                        ? sanitizedUrl
                        : null;
                    })
                  ).then((results) =>
                    results.filter((url): url is string => url !== null)
                  ),
            };
          } catch (error: unknown) {
            const err = error as {
              status?: number;
              response?: { status?: number };
            };
            const httpStatus = err.status ?? err.response?.status;
            if (httpStatus === 429 || httpStatus === 432) {
              console.warn(
                `API key ${apiKey.slice(0, 8)}... failed. Rotating to next key.`
              );
              rateLimitRotations++;
              break;
            }

            if (
              isTransientNetworkError(error) &&
              transientAttempt < MAX_TRANSIENT_RETRIES
            ) {
              transientAttempt++;
              const detail = formatAggregateErrorForLog(error);
              console.warn(
                `[WEB-SEARCH] Transient Tavily error (${topic}), retry ${transientAttempt}/${MAX_TRANSIENT_RETRIES}: ${detail}`
              );
              await sleep(TRANSIENT_BACKOFF_MS * transientAttempt);
              continue;
            }

            if (error instanceof AggregateError) {
              console.error(
                `[WEB-SEARCH] Tavily failed (${query} / ${topic}) AggregateError.errors:`,
                formatAggregateErrorForLog(error)
              );
            } else if (
              error &&
              typeof error === "object" &&
              "cause" in error &&
              (error as { cause?: unknown }).cause
            ) {
              const c = (error as { cause: unknown }).cause;
              console.error(
                `[WEB-SEARCH] Tavily failed (${query} / ${topic}) cause:`,
                formatAggregateErrorForLog(c)
              );
            }

            throw error;
          }
        }

        continue;
      }

      throw new Error("All Tavily API keys are rate-limited or invalid.");
    };

    // Create search combinations: each query × each topic
    const searchCombinations: {
      query: string;
      topic: TavilyTopic;
      index: number;
    }[] = [];
    for (let i = 0; i < queries.length; i++) {
      for (const topic of topics) {
        searchCombinations.push({ query: queries[i], topic, index: i });
      }
    }

    console.log(
      `Executing ${searchCombinations.length} searches (${queries.length} queries × ${topics.length} topics)...`
    );

    const tavilySearchPromise =
      envKeysCount === 0
        ? Promise.resolve(
            [] as PromiseSettledResult<SearchRow>[]
          )
        : allSettledWithLimit(
            searchCombinations,
            TAVILY_PARALLEL_LIMIT,
            ({ query, topic, index }) => searchWithRetry(query, topic, index)
          );

    let newsSearchPromise: Promise<unknown> = Promise.resolve(null);
    if (topics.includes("news")) {
      console.log("Starting News searches in parallel...");
      const newsSearchPromises = queries.map(async (query) => {
        try {
          console.log(`Searching News for: ${query}`);
          const result = await newsSearch.execute(
            { query },
            { toolCallId: "internal-call", messages: [] }
          );
          console.log(`News search completed for: ${query}`);
          return result;
        } catch (error) {
          console.error(`News search failed for query "${query}":`, error);
          return {
            error: "News search failed for this query",
            articles: [],
          };
        }
      });
      newsSearchPromise = Promise.all(newsSearchPromises);
    }

    const [tavilySettled, newsSearchResults] = await Promise.all([
      tavilySearchPromise,
      newsSearchPromise,
    ]);

    const tavilyFailureDetails: string[] = [];

    if (envKeysCount === 0) {
      warnings.push(
        "Tavily was skipped: TAVILY_API_KEYS is not set. Only News (if configured) is available."
      );
    }

    const allSearchResults: SearchRow[] = [];
    if (Array.isArray(tavilySettled)) {
      for (let i = 0; i < tavilySettled.length; i++) {
        const settled = tavilySettled[i] as PromiseSettledResult<SearchRow>;
        const combo = searchCombinations[i];
        if (settled.status === "fulfilled") {
          allSearchResults.push(settled.value);
        } else {
          const reason = settled.reason;
          const detail = formatAggregateErrorForLog(reason);
          const msg = `Tavily search failed for query "${combo?.query}" topic "${combo?.topic}": ${detail}`;
          console.error(`[WEB-SEARCH] ${msg}`);
          tavilyFailureDetails.push(msg);
        }
      }
    }

    const tavilySuccessByQuery = new Map<string, number>();
    for (const row of allSearchResults) {
      tavilySuccessByQuery.set(
        row.query,
        (tavilySuccessByQuery.get(row.query) ?? 0) + 1
      );
    }
    const noTavilyPerQuery: string[] = [];
    for (const q of queries) {
      const expectedTopics = topics.length;
      const ok = tavilySuccessByQuery.get(q) ?? 0;
      if (envKeysCount > 0 && ok === 0 && expectedTopics > 0) {
        noTavilyPerQuery.push(
          `No Tavily results for query "${q}" (all ${expectedTopics} topic attempts failed).`
        );
      }
    }

    // Group results by query and merge/deduplicate
    const groupedResults: Record<
      string,
      {
        results: SearchRow["results"];
        images: unknown[];
        answers: string[];
        seenUrls: Set<string>;
      }
    > = {};

    for (const result of allSearchResults) {
      if (!groupedResults[result.query]) {
        groupedResults[result.query] = {
          results: [],
          images: [],
          answers: [],
          seenUrls: new Set(),
        };
      }

      const group = groupedResults[result.query];

      if (result.answer) {
        group.answers.push(result.answer);
      }

      for (const r of result.results) {
        if (group.results.length >= 10) break;
        if (!group.seenUrls.has(r.url)) {
          group.seenUrls.add(r.url);
          group.results.push(r);
        }
      }

      for (const img of result.images) {
        const imgUrl = typeof img === "string" ? img : (img as { url: string }).url;
        if (!group.seenUrls.has(imgUrl)) {
          group.seenUrls.add(imgUrl);
          group.images.push(img);
        }
      }
    }

    const webSearchResults = queries.map((query) => {
      const data = groupedResults[query];
      if (!data) {
        return {
          query,
          results: [] as SearchRow["results"],
          images: [] as unknown[],
          answer: null as string | null,
        };
      }
      return {
        query,
        results: data.results,
        images: data.images,
        answer: data.answers.find((a) => a && a.length > 0) || null,
      };
    });

    console.log("WEB SEARCH COMPLETED =======");

    const webHasArticles = webSearchResults.some(
      (w) => (w.results?.length ?? 0) > 0 || !!(w.answer && w.answer.length > 0)
    );
    const newsBlocks = Array.isArray(newsSearchResults) ? newsSearchResults : [];
    const newsHasArticles = newsBlocks.some(
      (n) =>
        n &&
        typeof n === "object" &&
        Array.isArray((n as { articles?: unknown[] }).articles) &&
        (n as { articles: unknown[] }).articles.length > 0
    );

    const warningsOut = [...warnings];
    if (newsHasArticles && !webHasArticles) {
      warningsOut.push(
        "Tavily (general web index) returned no pages, but NewsAPI returned articles in `news`. Answer using those articles (summarize with source names and dates). Do not tell the user the search completely failed or that you lack retrieved material."
      );
      if (tavilyFailureDetails.length > 0) {
        console.warn(
          `[WEB-SEARCH] All Tavily topic calls failed (${tavilyFailureDetails.length}); news articles present — consolidated warning for model.`
        );
      }
    } else {
      warningsOut.push(...tavilyFailureDetails);
      warningsOut.push(...noTavilyPerQuery);
    }

    return {
      web: webSearchResults,
      news: newsSearchResults,
      ...(warningsOut.length > 0 ? { warnings: warningsOut } : {}),
    };
  },
});
