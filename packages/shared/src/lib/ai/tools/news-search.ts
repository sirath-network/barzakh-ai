import { tool } from "ai";
import { z } from "zod";

// Store API keys and the index of the current key at the module level.
let apiKeys: string[] = [];
let currentApiKeyIndex = 0;

function getApiKeys() {
  if (apiKeys.length === 0) {
    const keys = process.env.NEWS_API_KEY;
    if (!keys) {
      throw new Error("Missing NEWS_API_KEY environment variable.");
    }
    apiKeys = keys.split(',').map(key => key.trim());
  }
  return apiKeys;
}

function getNextApiKey() {
  const keys = getApiKeys();
  if (keys.length === 0) {
    return null;
  }
  const key = keys[currentApiKeyIndex];
  currentApiKeyIndex = (currentApiKeyIndex + 1) % keys.length;
  return key;
}

export const newsSearch = tool({
  description: "Search for news articles on NewsAPI.org.",
  parameters: z.object({
    query: z.string().describe("The search query."),
  }),
  execute: async ({ query }: { query: string }) => {
    const keys = getApiKeys();
    if (keys.length === 0) {
      throw new Error("Missing NEWS_API_KEY environment variable.");
    }

    let lastError: any = null;

    for (let i = 0; i < keys.length; i++) {
      const apiKey = getNextApiKey();
      if (!apiKey) continue;

      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        query
      )}&apiKey=${apiKey}`;

      try {
        const response = await fetch(url);

        if (response.status === 429) {
          console.warn(`API key ending in ...${apiKey.slice(-4)} is rate-limited. Trying next key.`);
          lastError = new Error(`NewsAPI request failed with status ${response.status}: Too Many Requests`);
          continue; // Try the next key
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          lastError = new Error(
            `NewsAPI request failed with status ${response.status}: ${errorData.message}`
          );
          // For other errors, we might not want to retry, but for now we'll continue
          continue;
        }

        const data = await response.json();

        if (data.status === "error") {
          lastError = new Error(`NewsAPI error: ${data.message}`);
          continue; // Try the next key
        }

        return {
          articles: data.articles.map((article: any) => ({
            source: article.source.name,
            author: article.author,
            title: article.title,
            description: article.description,
            url: article.url,
            publishedAt: article.publishedAt,
            content: article.content,
          })),
        };
      } catch (error: any) {
        lastError = error;
        console.error("Error searching for news with a specific key:", error);
        // This catches network errors etc. We'll try the next key.
      }
    }

    console.error("All NewsAPI keys are rate-limited or resulted in an error.", lastError);
    return {
      error: "All available NewsAPI keys are rate-limited or failed. Please try again later.",
      articles: [],
    };
  },
});
