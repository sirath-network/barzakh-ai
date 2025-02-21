import { generateText, tool } from "ai";
import { z } from "zod";
import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";
import { openai } from "@ai-sdk/openai";
import { myProvider } from "../../models";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_ENDPOINT = process.env.FIRECRAWL_API_ENDPOINT;

if (!FIRECRAWL_API_KEY || !FIRECRAWL_API_ENDPOINT) {
  throw new Error(
    "Missing required environment variables: FIRECRAWL_API_KEY or FIRECRAWL_API_ENDPOINT"
  );
}

const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

// extract only the relevant api endpoint information
function extractParametersSection(text: string): string | null {
  // Case-insensitive regex to match from "parameters" to "bad input parameter"
  const regex = /parameters[\s\S]*?bad input parameter/i;
  const match = text.match(regex);
  return match ? match[0] : null;
}

export const getCreditcoinApiDoc = tool({
  description: "Get real-time Creditcoin Blockscout API documentation.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    let scrapeResult;
    try {
      console.log(
        "Scraping link:",
        "https://creditcoin.blockscout.com/api-docs for query ",
        userQuery
      );
      scrapeResult = (await app.scrapeUrl(
        "https://creditcoin.blockscout.com/api-docs",
        {
          formats: ["rawHtml"],
        }
      )) as ScrapeResponse;

      if (!scrapeResult.success) {
        throw new Error(`Failed to scrape: ${scrapeResult.error}`);
      }

      //give the scrascrapeResult.html to ai to get the id of the div containg the useful endpoint
      const response = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `\n
    -  you will return the id of the div containing the api endpoint in the given html, which can be helpfull to answers user query. the id will always begin with "operations-". do not give any type of id. only return the div id, nothing else. give the exact div id as in the html, do not modify it in any way. `,
        prompt: JSON.stringify(
          `the html is ${scrapeResult.rawHtml} and user Query is ${userQuery}`
        ),
      });

      console.log("divId ------------ ", response.steps[0].text);
      const divId = response.steps[0].text;
      // now click the button with the id to expand the dropdown
      console.log("clicking div with id", divId);

      scrapeResult = (await app.scrapeUrl(
        "https://creditcoin.blockscout.com/api-docs",
        {
          formats: ["markdown"],
          actions: [
            {
              type: "click",
              selector: `#${divId} > div > button:nth-child(1)`,
            },
          ],
        }
      )) as ScrapeResponse;

      if (!scrapeResult.success) {
        throw new Error(`Failed to scrape: ${scrapeResult.error}`);
      }
      // const extractedApiEndpointInfo = extractParametersSection(
      //   scrapeResult.markdown?.toString()!
      // );

      // console.log("markdown is ------------ ", scrapeResult.markdown);
      return scrapeResult.markdown;
    } catch (error) {
      console.error("Error in getCreditcoinApiDoc:", error);
      throw error;
    }
  },
});
