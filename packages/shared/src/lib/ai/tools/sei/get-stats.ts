import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";

export const getSeiStats = tool({
  description: "Get Sei blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching Sei stats ");
      const response = await getStatPageScreenshot(
        "https://seitrace.com/stats?chain=pacific-1"
      );

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in  getSeiStats:", error);

      return {
        success: false,
        message: "Error in getting  getSeiStats stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
