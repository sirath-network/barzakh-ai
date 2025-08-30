// utils/x-search.ts
import { tool } from "ai";
import { z } from "zod";
import xClient from "../../utils/x-client";

// Rate limiting utilities
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await delay(waitTime);
  }
  
  lastRequestTime = Date.now();
};

export const xSearch = tool({
  description: "Search for tweets on X (formerly Twitter).",
  parameters: z.object({
    query: z.string().describe("The search query."),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      // Wait to respect rate limits
      await waitForRateLimit();
      
      // Search for tweets using the X API client.
      const searchResult = await xClient.v2.search(query.trim(), {
        "tweet.fields": ["public_metrics", "created_at"],
        expansions: ["author_id"],
        // Meminta data profil pengguna yang lebih lengkap
        "user.fields": ["username", "name", "profile_image_url", "verified", "public_metrics"],
        max_results: 10, // Limit results to reduce API usage
      });

      // Check if we have data before processing
      if (!searchResult.data?.data || searchResult.data.data.length === 0) {
        return {
          tweets: [],
          message: "No tweets found for this query"
        };
      }

      // Process the search results.
      const tweets = searchResult.data.data.map((tweet) => {
        const author = searchResult.data.includes?.users?.find(
          (user) => user.id === tweet.author_id
        );
        return {
          // Memastikan semua data yang dibutuhkan diteruskan
          id: tweet.id,
          text: tweet.text,
          author: {
            name: author?.name || "Unknown",
            username: author?.username || "unknown",
            profile_image_url: author?.profile_image_url,
            verified: author?.verified,
            public_metrics: author?.public_metrics,
          },
          createdAt: tweet.created_at,
          publicMetrics: tweet.public_metrics,
        };
      });

      return {
        query: query,
        tweets,
      };
    } catch (error: any) {
      console.error("Error searching on X:", error);
      
      // Handle specific rate limit errors
      if (error.code === 429) {
        return {
          error: "X API rate limit exceeded. Please try again later.",
          tweets: [],
        };
      }
      
      // Handle other API errors
      if (error.code) {
        return {
          error: `X API error (${error.code}): ${error.detail || 'Unknown error'}`,
          tweets: [],
        };
      }
      
      return {
        error: "An error occurred while searching on X.",
        tweets: [],
      };
    }
  },
});