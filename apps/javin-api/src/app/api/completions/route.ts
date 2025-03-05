import { getGroupConfig, systemPrompt } from "@javin/shared/src/lib/ai/prompts";
import { myProvider } from "@javin/shared/src/lib/ai/models";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@javin/shared/src/lib/utils/utils";
import { webSearch } from "@javin/shared/src//lib/ai/tools/web-search";
import { getSolanaChainWalletPortfolio } from "@javin/shared/src/lib/ai/tools/solana/wallet-portfolio-solana";
import { getEvmMultiChainWalletPortfolio } from "@javin/shared/src/lib/ai/tools/evm/wallet-portfolio-evm";
import { searchSolanaTokenMarketData } from "@javin/shared/src/lib/ai/tools/solana/search-token-solana";
import { searchEvmTokenMarketData } from "@javin/shared/src/lib/ai/tools/evm/search-token-evm";
import { getSiteContent } from "@javin/shared/src/lib/ai/tools/scrap-site";
import { getVanaStats } from "@javin/shared/src/lib/ai/tools/vana/get-stats";
import { getVanaApiData } from "@javin/shared/src/lib/ai/tools/vana/get-vana-api-data";
import { getCreditcoinStats } from "@javin/shared/src/lib/ai/tools/creditcoin/get-stats";
import { getCreditcoinApiData } from "@javin/shared/src/lib/ai/tools/creditcoin/get-creditcon-api-data";
import { ensToAddress } from "@javin/shared/src/lib/ai/tools/ens-to-address";
import { getWormholeApiData } from "@javin/shared/src/lib/ai/tools/wormhole/get-wormhole-api-data";
import { getFlowApiData } from "@javin/shared/src/lib/ai/tools/flow/get-flow-api-data";
import { getFlowStats } from "@javin/shared/src/lib/ai/tools/flow/get-stats";
import { translateTransactions } from "@javin/shared/src/lib/ai/tools/translate-transactions";
import { getEvmOnchainDataUsingZerion } from "@javin/shared/src/lib/ai/tools/onchain/get_evm_onchain_data_using_zerion";
import { getEvmOnchainDataUsingEtherscan } from "@javin/shared/src/lib/ai/tools/onchain/get_evm_onchain_data_using_etherscan";
import { openai } from "@ai-sdk/openai";
import {
  createDataStreamResponse,
  smoothStream,
  streamText,
  createDataStream,
} from "ai";
import {
  PromptRequest,
  PromptRequestSchema,
  TextCompletionStreaming,
} from "./type";
import { z } from "zod";

export const maxDuration = 60;

// export async function POST(request: Request) {
//   const {
//     model,
//     prompt,
//   }: {
//     model: string;
//     prompt: string;
//   } = await request.json();

//   const { tools: activeTools, systemPrompt } = await getGroupConfig("on_chain");

//   return createDataStreamResponse({
//     execute: (dataStream) => {
//       const result = streamText({
//         model: openai(model),
//         system: systemPrompt,
//         prompt: prompt,
//         maxSteps: 10,
//         experimental_activeTools:
//           model === "chat-model-reasoning" ? [] : [...activeTools],
//         experimental_transform: smoothStream({ chunking: "word" }),
//         experimental_generateMessageId: generateUUID,
//         onChunk: async ({ chunk }) => {
//           console.log("onChunk = ", chunk);
//         },
//         tools: {
//           webSearch,
//           getEvmMultiChainWalletPortfolio,
//           getSolanaChainWalletPortfolio,
//           searchSolanaTokenMarketData,
//           searchEvmTokenMarketData,
//           getSiteContent,
//           getCreditcoinApiData,
//           getVanaApiData,
//           getVanaStats,
//           getCreditcoinStats,
//           getEvmOnchainData,
//           ensToAddress,
//           getWormholeApiData,
//           getFlowApiData,
//           getFlowStats,
//         },
//         onFinish: async ({ response, reasoning }) => {
//           //   do something if needed
//         },
//         experimental_telemetry: {
//           isEnabled: true,
//           functionId: "stream-text",
//         },
//       });

//       result.mergeIntoDataStream(dataStream, {
//         sendReasoning: true,
//       });
//     },
//     onError: (error: any) => {
//       console.log(error);
//       return "Oops, something went wrong!. Please try again in new chat";
//     },
//   });
// }

export async function POST(request: Request) {
  try {
    const EXTERNALAPIKEY = process.env.SENTIENT_EXTERNAL_APIKEY;

    const authHeader = request.headers.get("Authorization");

    if (!authHeader || authHeader !== `Bearer ${EXTERNALAPIKEY}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const validatedData = PromptRequestSchema.parse(body);

    const {
      model,
      prompt,
      max_tokens,
      temperature,
      stream: StreamingTrue,
    } = validatedData;

    if (!StreamingTrue) {
      return new Response(
        JSON.stringify({ error: "only streaming is suported as of now. use stream:true." }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { tools: activeTools, systemPrompt } = await getGroupConfig(
      "on_chain"
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = streamText({
            model: openai(model),
            system: systemPrompt,
            prompt: prompt,
            maxSteps: 10,
            experimental_activeTools:
              model === "chat-model-reasoning" ? [] : [...activeTools],
            onChunk: async ({ chunk }) => {
              // MAKE THIS INTO OPENAI API STANDARD MESSAGE AND PUSH IN CONTROLLER
              console.log("onChunk = ", chunk);
            },
            tools: {
              webSearch,
              getEvmMultiChainWalletPortfolio,
              getSolanaChainWalletPortfolio,
              searchSolanaTokenMarketData,
              searchEvmTokenMarketData,
              getSiteContent,
              getCreditcoinApiData,
              getVanaApiData,
              getVanaStats,
              getCreditcoinStats,
              getEvmOnchainDataUsingZerion,
              getEvmOnchainDataUsingEtherscan,
              ensToAddress,
              getWormholeApiData,
              getFlowApiData,
              getFlowStats,
              translateTransactions,
            },
            maxTokens: max_tokens,
            temperature: temperature,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
          });
          for await (const chunk of result.textStream) {
            console.log("chunk = ", chunk);
            const message: TextCompletionStreaming = {
              id: generateUUID(),
              object: "text_completion",
              created: Math.floor(Date.now() / 1000),
              choices: [
                { text: chunk, index: 0, finish_reason: null, logprobs: null },
              ],
              model,
              system_fingerprint: "",
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
            );
          }

          // Send stop signal
          const stopMessage: TextCompletionStreaming = {
            id: generateUUID(),
            object: "text_completion",
            created: Math.floor(Date.now() / 1000),
            choices: [
              { text: null, index: 0, finish_reason: "stop", logprobs: null },
            ],
            model,
            system_fingerprint: "",
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(stopMessage)}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: error.errors }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
