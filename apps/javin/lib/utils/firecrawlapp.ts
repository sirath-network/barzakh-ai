import FirecrawlApp from "@mendable/firecrawl-js";

// const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
// const FIRECRAWL_API_ENDPOINT = process.env.FIRECRAWL_API_ENDPOINT;
// if (!FIRECRAWL_API_KEY || !FIRECRAWL_API_ENDPOINT) {
//   throw new Error(
//     "Missing required environment variables: FIRECRAWL_API_KEY or FIRECRAWL_API_ENDPOINT"
//   );
// }

export const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || "" });
