import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";
import { processExternalContent } from "../security/external-content-scanner";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_ENDPOINT = process.env.FIRECRAWL_API_ENDPOINT;

const app = FIRECRAWL_API_KEY ? new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY }) : null;

export async function scrapeSite(linkToScrape: string) {
  if (!FIRECRAWL_API_KEY || !FIRECRAWL_API_ENDPOINT) {
    throw new Error(
      "Missing required environment variables: FIRECRAWL_API_KEY or FIRECRAWL_API_ENDPOINT"
    );
  }

  if (!app) {
    throw new Error("FirecrawlApp not initialized");
  }

  try {
    console.log("scraping link : ", linkToScrape);

    const scrapeResult = (await app.scrapeUrl(linkToScrape, {
      formats: ["markdown", "links"],
    })) as ScrapeResponse;

    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`);
    }

    console.log("scrapeResult.markdown----------------", scrapeResult.markdown);
    console.log("scrapeResult.links----------------", scrapeResult.links);
    
    // =====================================================
    // SECURITY: Scan and sanitize external content
    // Protects against indirect prompt injection attacks
    // where malicious websites embed instructions to manipulate AI
    // =====================================================
    const { content: sanitizedContent, scanResult } = processExternalContent(
      scrapeResult.markdown || '',
      { sanitize: true, blockOnThreat: false }
    );
    
    if (!scanResult.safe) {
      console.warn(`[SECURITY] Threats detected in scraped content from ${linkToScrape}:`, {
        threats: scanResult.threats.slice(0, 5).map(t => t.description),
        riskScore: scanResult.riskScore,
      });
    }
    
    return {
      pageContent: sanitizedContent,
      pageLinks: scrapeResult.links,
      securityWarning: !scanResult.safe 
        ? `Content was sanitized due to ${scanResult.threats.length} potential security issues`
        : undefined,
    };
  } catch (error) {
    console.error("Error in scrapeSite:", error);
    throw error; // Re-throw to allow handling by the caller
  }
}
