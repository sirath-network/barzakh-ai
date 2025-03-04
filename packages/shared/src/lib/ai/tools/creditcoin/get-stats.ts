import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";

export const getCreditcoinStats = tool({
  description: "Get Creditcoin blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching Creditcoin stats ");
      const response = await getStatPageScreenshot(
        "https://creditcoin.blockscout.com/stats"
      );

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in getCreditcoinStats:", error);

      return {
        success: false,
        message: "Error in getting creditcoin stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
