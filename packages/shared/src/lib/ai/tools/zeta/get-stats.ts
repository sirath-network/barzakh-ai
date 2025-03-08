import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";

export const getZetaStats = tool({
  description: "Get ZetaChain blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching ZetaChain stats ");
      const response = await getStatPageScreenshot(
        "https://zetachain.blockscout.com/stats"
      );

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in  getZetaStats:", error);

      return {
        success: false,
        message: "Error in getting  getZetaStats stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
