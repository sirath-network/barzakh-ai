import {
  getAllPaths,
  getAllPathsAndDesc,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "../../utils/openapi";
import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../models";

export const novesSupportedChains = [
  "arbitrum",
  "arbitrum-nova",
  "artela",
  "astar",
  "avalanche",
  "avalanche-fuji",
  "base",
  "berachain-bartio",
  "blast",
  "bsc",
  "camp-testnet",
  "camp-testnet-v2",
  "celo",
  "chiliz",
  "core",
  "cronos",
  "degen",
  "eth",
  "eth-holesky",
  "eth-sepolia",
  "ethxy-testnet",
  "fantom",
  "flow-evm",
  "fluent-devnet",
  "fraxtal",
  "fuse",
  "gelato-testnet-arbitrum-blueberry",
  "gelato-testnet-optimism-raspberry",
  "gelato-testnet-polygon-blackberry",
  "gnosis",
  "ink",
  "ink-sepolia",
  "kava-evm",
  "lightlink",
  "linea",
  "lukso",
  "manta-pacific",
  "mantle",
  "matchain",
  "metal",
  "metis",
  "mode",
  "moonbeam",
  "moonriver",
  "morph",
  "morph-holesky-testnet",
  "movement-mevm",
  "optimism",
  "orderly-network",
  "plume-devnet",
  "polygon",
  "polygon-zkevm",
  "pulsechain",
  "rari",
  "rollux",
  "rollux-testnet",
  "scroll",
  "sophon-testnet",
  "superposition-testnet",
  "superseed-sepolia",
  "taiko-katla",
  "telos",
  "xai",
  "xdc",
  "zetachain-evm",
  "zetachain-evm-testnet",
  "sei",
  "zksync-era",
  "zora",
] as const;

export const translateTransactions = tool({
  description:
    "Translate raw blockchain transactions into human-friendly, enriched form.",
  parameters: z.object({
    transactionDetails: z.string().describe("Details of the transaction."),
    chain: z
      .enum(novesSupportedChains)
      .describe("Evm chain name")
      .default("eth"),
    userQuery: z.string().describe("query of the user"),
  }),
  execute: async ({ transactionDetails, chain, userQuery }) => {
    const novesApiKey = process.env.NOVES_API_KEY;
    if (!novesApiKey) {
      console.log(" NOVES_API_KEY not found!!");
      return "failed to summarize transaction";
    }
    try {
      console.log("getting txn summary...");
      const openapidata = await loadOpenAPI(
        "https://translate.noves.fi/swagger/v1/swagger.json"
      );
      const novesOpenapidata = await loadOpenAPIFromJson(openapidata);
      const novesAllPathsAndDesc = await getAllPathsAndDesc(novesOpenapidata);

      // Chain mapping Noves vs Standard/Zerion
      const chainMapping: Record<string, string> = {
        "ethereum": "eth",
        "binance-smart-chain": "bsc",
        "arbitrum-one": "arbitrum",
        "avalanche-c-chain": "avalanche",
        // Add others as needed, Noves uses 'eth', 'base', 'optimism' which match mostly
      };

      const mappedChain = chainMapping[chain.toLowerCase()] || chain;

      // Try to parse transactionDetails to extract hashes programmatically
      // This avoids LLM hallucination or truncation issues
      let programmaticEndpoints: string[] = [];
      try {
        const parsedData = JSON.parse(transactionDetails);
        // Handle Zerion-like structure (items array, or root array)
        const items = Array.isArray(parsedData) ? parsedData : (parsedData.items || parsedData.transactions || []);

        if (Array.isArray(items) && items.length > 0) {
          programmaticEndpoints = items.map((tx: any) => {
            // Extract hash from various possible locations
            const hash = tx.hash || tx.id || (tx.attributes && tx.attributes.hash);
            if (hash && typeof hash === 'string' && hash.startsWith('0x')) {
              return `/evm/${mappedChain}/v5/tx/${hash}`;
            }
            return null;
          }).filter(e => e !== null) as string[];
        }
      } catch (e) {
        // Not JSON, ignore
        console.log("transactionDetails is not valid JSON, falling back to LLM endpoint selection.");
      }

      let limitedApiEndpointsArray: string[] = [];

      if (programmaticEndpoints.length > 0) {
        console.log(`Programmatically generated ${programmaticEndpoints.length} endpoints.`);
        limitedApiEndpointsArray = programmaticEndpoints.slice(0, 5); // Take max 5
      } else {
        // Fallback to LLM if no structured data found (e.g. user provided raw text)
        console.log("Using LLM to select endpoints...");
        const { object: apiEndpointsArray } = await generateObject({
          model: myProvider.languageModel("model-router"),
          output: "array",
          schema: z.string().describe("the api endpoint"),
          system: `\n
          You are provided the list of Translate APIs endpoints. The Translate APIs categorize transactions, standardizing them across chains and across protocols to produce a rich set of data that allows you to translate the transactions in to human readable format. They readily support accounting and finance scenarios, along with any system that benefits from structured and tagged data.supported chains are ${novesSupportedChains}. use these chain names in the query url.`,
          prompt: JSON.stringify(
            `The list of api endpoints and their descriptions are ${novesAllPathsAndDesc} and user Query is ${userQuery} and the chain is ${mappedChain} and the transaction details are ${transactionDetails}`
          ),
        });
        limitedApiEndpointsArray = apiEndpointsArray.slice(0, 3);
      }

      console.log(
        `Selected api endpoints: `,
        limitedApiEndpointsArray
      );

      const options = {
        method: "GET",
        headers: { accept: "application/json", apiKey: novesApiKey! },
      };

      // make the api calls
      const requests = limitedApiEndpointsArray.map((endpoint) => {
        // Strip "GET " prefix and whitespace if present (legacy clean up)
        const cleanEndpoint = endpoint.replace(/^(GET|POST)\s+/, '').trim();
        const fullUrl = `https://translate.noves.fi${cleanEndpoint}`;
        return fetch(fullUrl, options); // Return the promise
      });

      const results = await Promise.all(
        requests.map(async (request) => {
          try {
            const response = await request;
            const json = await response.json();
            console.log("API Response:", json);
            return json;
          } catch (error) {
            console.error("Error parsing API response:", error);
            return null;
          }
        })
      );

      console.log("Final parsed results:", results);

      // Transform results into EvmTransactionHistory format
      const transactions = results
        .filter((r) => r && r.items)
        .flatMap((r) => r.items)
        .map((item: any) => {
          // Attempt to extract relevant fields from Noves structure
          // Noves structure varies, but usually has transactionHash, from, to, etc. in rawTransactionData or top level
          const raw = item.rawTransactionData || {};

          return {
            hash: item.transactionHash || raw.transactionHash || raw.hash || `tx-${Math.random()}`,
            timestamp: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : new Date().toISOString(), // Noves often uses unix timestamp
            direction: item.accountAddress?.toLowerCase() === raw.from?.toLowerCase() ? "OUT" : "IN",
            txType: item.classificationData?.type || "Transaction",
            status: "Confirmed", // Assumed success if in history
            from: raw.from || item.fromAddress || "Unknown",
            to: raw.to || item.toAddress || "Unknown",
            value: raw.value ? (parseInt(raw.value) / 1e18).toString() : "0", // simplistic ETH conversion if wei
            explorerUrl: "", // Component deals with this if missing, or we could generate it
            // Map transfers if available for better UI display
            tokenTransfer: item.transfers?.map((t: any) => ({
              direction: t.from?.toLowerCase() === item.accountAddress?.toLowerCase() ? "OUT" : "IN",
              amount: t.amount,
              symbol: t.token?.symbol || "Unknown",
              formatted: `${t.amount} ${t.token?.symbol || ""}`
            }))[0] // Just take first for now or mapped component handles array? Component handles array.
          };
        });

      // Return a structure compatible with EvmTransactionHistory
      return {
        address: transactionDetails, // formatted address
        network: chain,
        transactionCount: transactions.length,
        transactions: transactions,
        // Keep original data for fallback or debug
        raw: results
      };
    } catch (error) {
      console.error("Error in summarizing transactions:", error);
      return error; // Re-throw to allow handling by the caller
    }
  },
});
