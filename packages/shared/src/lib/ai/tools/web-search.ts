import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import { newsSearch } from "./news-search";

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
    "Search the web for information with multiple queries, max results, and search depth.",
  parameters: z.object({
    queries: z.array(
      z.string().describe("Array of search queries to look up on the web.")
    ),
    maxResults: z
      .array(
        z
          .number()
          .describe("Array of maximum number of results to return per query.")
      )
      .optional()
      .default([10]),
    topics: z
      .array(
        z
          .enum(["general", "news"])
          .describe("Array of topic types to search for.")
      )
      .optional()
      .default(["general"]),
    searchDepth: z
      .array(
        z
          .enum(["basic", "advanced"])
          .describe("Array of search depths to use.")
      )
      .optional()
      .default(["basic"]),
    exclude_domains: z
      .array(z.string())
      .describe("A list of domains to exclude from all search results.")
      .default([]),
  }),
  execute: async ({
    queries,
    maxResults = [10],
    topics = ["general"],
    searchDepth = ["basic"],
    exclude_domains = [],
  }: {
    queries: string[];
    maxResults?: number[];
    topics?: ("general" | "news")[];
    searchDepth?: ("basic" | "advanced")[];
    exclude_domains?: string[];
  }) => {
    const includeImageDescriptions = true;

    console.log("WEB SEARCH STARTING =======");
    console.log("Queries:", queries);
    console.log("Max Results:", maxResults);
    console.log("Topics:", topics);
    console.log("Search Depths:", searchDepth);
    console.log("Exclude Domains:", exclude_domains);

    const searchWithRetry = async (query: string, index: number) => {
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
          const data = await tvly.search(query, {
            topic: topics[index] || topics[0] || "general",
            days: topics[index] === "news" ? 7 : undefined,
            maxResults: maxResults[index] || maxResults[0] || 10,
            searchDepth: searchDepth[index] || searchDepth[0] || "basic",
            includeAnswer: true,
            includeImages: false,
            includeImageDescriptions: false,
            excludeDomains: exclude_domains,
          });

          return {
            query,
            results: data.results.map((obj: any) => ({
              url: obj.url,
              title: obj.title,
              content: obj.content,
              raw_content: obj.raw_content,
              published_date:
                topics[index] === "news" ? obj.published_date : undefined,
            })),
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

    // Execute web searches in parallel
    const webSearchPromises = queries.map(searchWithRetry);

    const webSearchResults = await Promise.all(webSearchPromises);

    let newsSearchResults: any = null;
    if (topics.includes("news")) {
      console.log("Starting News searches sequentially...");
      newsSearchResults = [];

      // Execute News searches SEQUENTIALLY to avoid rate limits
      for (const query of queries) {
        try {
          console.log(`Searching News for: ${query}`);
          const result = await newsSearch.execute({ query }, { toolCallId: 'internal-call', messages: [] });
          newsSearchResults.push(result);
          console.log(`News search completed for: ${query}`);
        } catch (error) {
          console.error(`News search failed for query "${query}":`, error);
          // Push empty result to maintain array structure
          newsSearchResults.push({
            error: "News search failed for this query",
            articles: [],
          });
        }
      }
    }

    console.log("WEB SEARCH COMPLETED =======");

    return {
      web: webSearchResults,
      news: newsSearchResults,
    };
  },
});