import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import { getAllPaths, getPathInfo, loadOpenAPI } from "@/lib/utils/openapi";

export const getVanaApiDoc = tool({
  description: "Get real-time Vana Blockscout API documentation.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      const openapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/blockscout/blockscout-api-v2-swagger/main/swagger.yaml"
      );
      const allPaths = await getAllPaths(openapidata);
      console.log("use prompt is -- ", userQuery);
      const response = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `\n
        You will just return the name of the api endpoint in the given list of api endpoint and their summary, which can be helpfull to answers user query. Do not modify it in any way.`,
        prompt: JSON.stringify(
          `The list of api endpoints and their summary are ${allPaths} and user Query is ${userQuery}`
        ),
      });
      const apiEndpointName = response.steps[0].text;
      console.log(
        `AI selected the api endpoint as https://api.vanascan.io/api/v2${apiEndpointName}`
      );

      const apiEndpointInfo = await getPathInfo(openapidata, apiEndpointName);
      // console.log("apiEndpointInfo is -------- ", apiEndpointInfo);
      const apiEndpointInfoString = JSON.stringify(apiEndpointInfo);
      // console.log("apiEndpointInfoString -------- ", apiEndpointInfoString);

      return `the api endpoint you should call is-  https://api.vanascan.io/api/v2${apiEndpointName}  - and info about the endpoint is - ${apiEndpointInfoString}`;
    } catch (error) {
      console.error("Error in getVanaApiDoc:", error);
      throw error;
    }
  },
});
