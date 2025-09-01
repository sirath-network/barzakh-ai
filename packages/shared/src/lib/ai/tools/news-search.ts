import { tool } from "ai";
import { z } from "zod";

export const newsSearch = tool({
  description: "Search for news articles on NewsAPI.org.",
  parameters: z.object({
    query: z.string().describe("The search query."),
  }),
  execute: async ({ query }: { query: string }) => {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error("Missing NEWS_API_KEY environment variable.");
    }

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&apiKey=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `NewsAPI request failed with status ${response.status}: ${errorData.message}`
        );
      }

      const data = await response.json();

      if (data.status === "error") {
        throw new Error(`NewsAPI error: ${data.message}`);
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
      console.error("Error searching for news:", error);
      return {
        error: "An error occurred while searching for news.",
        articles: [],
      };
    }
  },
});
