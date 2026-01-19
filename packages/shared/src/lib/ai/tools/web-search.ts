import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import { newsSearch } from "./news-search";
import { sanitizeExternalContent, scanExternalContent } from "../../security/external-content-scanner";

function sanitizeUrl(url: string): string {
  return url.replace(/\s+/g, "%20");
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

// Simple key rotation
const apiKeys =
  process.env.TAVILY_API_KEYS?.split(",")
    .map(key => key.trim())
    .filter(key => key) ?? [];
let currentApiKeyIndex = 0;

function getNextApiKey(): string | undefined {
  if (apiKeys.length === 0) {
    return undefined;
  }
  const key = apiKeys[currentApiKeyIndex];
  currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
  return key;
}

export const webSearch = tool({
  description:
    "Search the web for REAL-TIME, up-to-date information. Use this tool for current events, latest news, recent updates, and any information that may have changed since your training data. IMPORTANT: For crypto/blockchain/token queries, ALWAYS use ALL THREE topic types ['general', 'news', 'finance'] to get comprehensive results from different sources. This ensures you find both news articles and financial data. For social sentiment or latest updates, ALWAYS include a specific query targeting x.com (e.g., 'query site:x.com') in the 'queries' array.",
  parameters: z.object({
    queries: z.array(
      z.string().describe("Array of search queries. Do NOT include specific years like '2025' or '2026' - let the search find the most relevant results. Use 'latest' or 'upcoming' for time-sensitive queries instead of hardcoded years.")
    ),
    maxResults: z
      .array(
        z
          .number()
          .describe("Array of maximum number of results to return per query.")
      )
      .optional()
      .default([5]),
    topics: z
      .array(
        z
          .enum(["general", "news", "finance"])
          .describe("Topic types to search. For crypto/blockchain queries, ALWAYS pass ALL THREE: ['general', 'news', 'finance'] for comprehensive coverage. 'finance' is critical for token/TGE/market queries.")
      )
      .optional()
      .default(["general", "news", "finance"]),
    searchDepth: z
      .array(
        z
          .enum(["basic", "advanced"])
          .describe("Array of search depths. Use 'advanced' for comprehensive research that needs more detailed results.")
      )
      .optional()
      .default(["advanced"]),
    timeRange: z
      .enum(["day", "week", "month", "year", "all"])
      .describe("Time range to filter results. Use 'day' for today's news, 'week' for recent updates, 'month' for monthly trends. Default is 'week' for most queries.")
      .optional()
      .default("week"),
    include_domains: z
      .array(z.string())
      .describe("Optional list of domains to restrict results to. Only use if you specifically need results from certain sites (e.g., ['x.com'] for tweets only). Leave empty for diverse sources.")
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
    topics = ["general", "news", "finance"],
    searchDepth = ["advanced"],
    timeRange = "week",
    include_domains = [],
    exclude_domains = [],
  }: {
    queries: string[];
    maxResults?: number[];
    topics?: ("general" | "news" | "finance")[];
    searchDepth?: ("basic" | "advanced")[];
    timeRange?: "day" | "week" | "month" | "year" | "all";
    include_domains?: string[];
    exclude_domains?: string[];
  }) => {
    const includeImageDescriptions = true;

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

    const searchWithRetry = async (query: string, topic: "general" | "news" | "finance", index: number) => {
      let attempts = 0;
      while (attempts < apiKeys.length) {
        const apiKey = getNextApiKey();
        if (!apiKey) {
          throw new Error(
            "No Tavily API keys found. Please set TAVILY_API_KEYS environment variable."
          );
        }

        try {
          const tvly = tavily({ apiKey });
          const isNewsOrFinance = topic === "news" || topic === "finance";
          const daysValue = timeRangeToDays[timeRange] ?? (isNewsOrFinance ? 7 : undefined);

          const data = await tvly.search(query, {
            topic: topic,
            days: daysValue,
            maxResults: maxResults[index] || maxResults[0] || 10,
            searchDepth: searchDepth[index] || searchDepth[0] || "advanced",
            includeAnswer: "advanced" as unknown as boolean,
            includeImages: false,
            includeImageDescriptions: false,
            includeDomains: include_domains.length > 0 ? include_domains : undefined,
            excludeDomains: exclude_domains,
          });

          return {
            query,
            topic,
            answer: (data as any).answer,
            results: data.results.map((obj: any) => {
              // Sanitize content to prevent indirect prompt injection
              const contentScan = scanExternalContent(obj.content || '');
              const rawContentScan = obj.raw_content ? scanExternalContent(obj.raw_content) : null;

              if (!contentScan.safe || (rawContentScan && !rawContentScan.safe)) {
                console.warn(`[WEB-SEARCH-SECURITY] Threats in result from ${obj.url}:`, {
                  contentThreats: contentScan.threats.slice(0, 2).map(t => t.description),
                  rawContentThreats: rawContentScan?.threats.slice(0, 2).map(t => t.description),
                });
              }

              return {
                url: obj.url,
                title: obj.title,
                content: sanitizeExternalContent(obj.content || ''),
                raw_content: obj.raw_content ? sanitizeExternalContent(obj.raw_content) : undefined,
                published_date: obj.published_date,
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
              ).then(results =>
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
              ).then(results =>
                results.filter((url): url is string => url !== null)
              ),
          };
        } catch (error: any) {
          if (error.status === 429 || error.status === 432) {
            // 429 is Too Many Requests, 432 is a custom Tavily error for key issues
            console.warn(
              `API key ${apiKey.slice(0, 8)}... failed. Rotating to next key.`
            );
            attempts++;
          } else {
            throw error;
          }
        }
      }
      throw new Error("All Tavily API keys are rate-limited or invalid.");
    };

    // Create search combinations: each query × each topic
    const searchCombinations: { query: string; topic: "general" | "news" | "finance"; index: number }[] = [];
    for (let i = 0; i < queries.length; i++) {
      for (const topic of topics) {
        searchCombinations.push({ query: queries[i], topic, index: i });
      }
    }

    // Execute all searches in parallel (Web + News)
    console.log(`Executing ${searchCombinations.length} searches (${queries.length} queries × ${topics.length} topics)...`);

    const tavilySearchPromise = Promise.all(
      searchCombinations.map(({ query, topic, index }) => searchWithRetry(query, topic, index))
    );

    let newsSearchPromise: Promise<any> = Promise.resolve(null);
    if (topics.includes("news")) {
      console.log("Starting News searches in parallel...");
      const newsSearchPromises = queries.map(async (query) => {
        try {
          console.log(`Searching News for: ${query}`);
          const result = await newsSearch.execute({ query }, { toolCallId: 'internal-call', messages: [] });
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

    // Await both sets of searches concurrently
    const [allSearchResults, newsSearchResults] = await Promise.all([
      tavilySearchPromise,
      newsSearchPromise
    ]);

    // Group results by query and merge/deduplicate
    const groupedResults: Record<string, {
      results: any[];
      images: any[];
      answers: string[];
      seenUrls: Set<string>;
    }> = {};

    for (const result of allSearchResults) {
      if (!groupedResults[result.query]) {
        groupedResults[result.query] = {
          results: [],
          images: [],
          answers: [],
          seenUrls: new Set()
        };
      }

      const group = groupedResults[result.query];

      // Add answer if available
      if (result.answer) {
        group.answers.push(result.answer);
      }

      // Deduplicate results by URL
      for (const r of result.results) {
        if (group.results.length >= 10) break; // Cap results at 10 per query to prevent context explosion
        if (!group.seenUrls.has(r.url)) {
          group.seenUrls.add(r.url);
          group.results.push(r);
        }
      }

      // Add images (deduplicate by URL)
      for (const img of result.images) {
        const imgUrl = typeof img === 'string' ? img : img.url;
        if (!group.seenUrls.has(imgUrl)) {
          group.seenUrls.add(imgUrl);
          group.images.push(img);
        }
      }
    }

    // Convert to array format for response (matching frontend expected structure)
    const webSearchResults = Object.entries(groupedResults).map(([query, data]) => ({
      query,
      results: data.results,
      images: data.images,
      // Include the best answer (first non-empty one from all topic searches)
      answer: data.answers.find(a => a && a.length > 0) || null,
    }));

    console.log("WEB SEARCH COMPLETED =======");

    return {
      web: webSearchResults,
      news: newsSearchResults,
    };
  },
});