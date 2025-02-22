import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import { getAllPaths, getPathInfo, loadOpenAPI } from "@/lib/utils/openapi";

export const getCreditcoinApiDoc = tool({
  description: "Get real-time Creditcoin Blockscout API documentation.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      const openapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/blockscout/blockscout-api-v2-swagger/main/swagger.yaml"
      );
      const allPaths = await getAllPaths(openapidata);
      const allPathString = allPaths.join(", ");

      const response = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `\n
        You will return the name of the api endpoint in the given list of api endpoint, which can be helpfull to answers user query. Do not modify it in any way.`,
        prompt: JSON.stringify(
          `the list of api endpoints are ${allPathString} and user Query is ${userQuery}`
        ),
      });
      const apiEndpointName = response.steps[0].text;
      // console.log("api endpoint name choosen ------------ ", apiEndpointName);

      const apiEndpointInfo = await getPathInfo(openapidata, apiEndpointName);
      const apiEndpointInfoString = JSON.stringify(apiEndpointInfo);
      // console.log("apiEndpointInfoString -------- ", apiEndpointInfoString);

      console.log(
        `the api endpoint selected is https://creditcoin.blockscout.com/api/v2${apiEndpointName}`
      );

      return `the api endpoint you should call is-  https://creditcoin.blockscout.com/api/v2${apiEndpointName}  - and info about the endpoint is - ${apiEndpointInfoString}`;
    } catch (error) {
      console.error("Error in getCreditcoinApiDoc:", error);
      throw error;
    }
  },
});
