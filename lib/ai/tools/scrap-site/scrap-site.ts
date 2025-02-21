type FirecrawlData = {
  success: string;
  error: string;
  data: {
    markdown: string;
  };
  details: {
    code: string;
    message: string;
  };
};

export async function getScrapJobData(linkToScrape: string) {
  try {
    console.log("scraping link : ", linkToScrape);
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    const FIRECRAWL_API_ENDPOINT = process.env.FIRECRAWL_API_ENDPOINT;

    if (!FIRECRAWL_API_KEY || !FIRECRAWL_API_ENDPOINT) {
      throw new Error(
        "Missing required environment variables: FIRECRAWL_API_KEY or FIRECRAWL_API_ENDPOINT"
      );
    }

    const response = await fetch(FIRECRAWL_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: linkToScrape,
        formats: ["markdown"],
      }),
    });

    const data: FirecrawlData = await response.json();
    if (!data.success) {
      throw new Error(`${data.error} ----  ${data.details}`);
    }

    return data.data.markdown;
  } catch (error) {
    console.error("Error in getCrawlJobData:", error);
    throw error; // Re-throw to allow handling by the caller
  }
}
