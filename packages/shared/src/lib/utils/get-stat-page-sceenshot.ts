import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_ENDPOINT = process.env.FIRECRAWL_API_ENDPOINT;

let app: FirecrawlApp | undefined;

if (FIRECRAWL_API_KEY && FIRECRAWL_API_ENDPOINT) {
  app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
} else {
  console.warn(
    "Missing required environment variables: FIRECRAWL_API_KEY or FIRECRAWL_API_ENDPOINT. The getStatPageScreenshot tool will not be available."
  );
}

// visits stat page, clicks on fullscreen mode and takes a screenshot
export async function getStatPageScreenshot(statsPageUrl: string) {
  if (!app) {
    return "The getStatPageScreenshot tool is not available due to missing environment variables.";
  }
  try {
    console.log("visiting link : ", statsPageUrl);

    const scrapeResult = (await app.scrapeUrl(statsPageUrl, {
      formats: ["markdown"],
    })) as ScrapeResponse;

    if (!scrapeResult.success) {
      return `Failed to scrape: ${scrapeResult.error}`;
    }

    console.log("scrape result ----- ", scrapeResult.markdown);
    return scrapeResult.markdown;
  } catch (error) {
    console.error("Error in getStatPageScreenshot:", error);
    throw error; // Re-throw to allow handling by the caller
  }
}