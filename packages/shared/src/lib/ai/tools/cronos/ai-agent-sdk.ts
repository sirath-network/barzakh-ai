/**
 * Crypto.com AI Agent SDK Integration
 * 
 * Provides natural language blockchain query capabilities using
 * Crypto.com's AI Agent Service API.
 * 
 * Documentation: https://ai-agent-docs.crypto.com/
 */

import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@crypto.com/ai-agent-client";

// Chain IDs for Cronos networks
const CRONOS_CHAINS = {
    // Cronos EVM
    CRONOS_MAINNET: 25,
        // Cronos zkEVM
    CRONOS_ZKEVM_MAINNET: 388,
    } as const;

type CronosChainKey = keyof typeof CRONOS_CHAINS;

// Client type from the SDK
type CdcAiAgentClient = ReturnType<typeof createClient>;

// Cache for client instances
let clientCache: Record<number, CdcAiAgentClient> = {};

/**
 * Get or create an AI Agent client for a specific chain
 */
function getClient(chainId: number): CdcAiAgentClient {
    if (!clientCache[chainId]) {
        // Try to get OpenAI key, or fallback to OpenRouter key
        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            throw new Error("Missing API Key: OPENAI_API_KEY or OPENROUTER_API_KEY is required for Crypto.com AI Agent SDK");
        }

        clientCache[chainId] = createClient({
            openAI: {
                apiKey,
            },
            chainId,
            explorerKeys: {
                cronosMainnetKey: process.env.CRONOS_EXPLORER_API_KEY,
                cronosTestnetKey: process.env.CRONOS_EXPLORER_API_KEY,
                cronosZkEvmKey: process.env.ZKEVM_CRONOS_EXPLORER_API_KEY,
                cronosZkEvmTestnetKey: process.env.ZKEVM_CRONOS_EXPLORER_API_KEY,
            },
        });
    }

    return clientCache[chainId];
}

/**
 * Query Cronos blockchain using natural language via Crypto.com AI Agent SDK
 */
export const queryCryptoComAI = tool({
    description: `Execute natural language queries against Cronos blockchain using Crypto.com's AI Agent SDK.
REQUIRED for all Cronos zkEVM queries. Also supports Cronos EVM.

Examples of queries you can make:
- "What is the balance of 0x... on Cronos?"
- "Get the latest block information"
- "Show transaction details for 0x..."
- "What's the gas price on Cronos?"
- "Get token info for contract 0x..."

Supported networks: Cronos EVM (mainnet) and Cronos zkEVM (mainnet).`,
    parameters: z.object({
        query: z.string().describe("Natural language query about Cronos blockchain (e.g., 'What is the balance of 0x...?')"),
        network: z.enum(["CRONOS_MAINNET", "CRONOS_ZKEVM_MAINNET"])
            .optional()
            .default("CRONOS_MAINNET")
            .describe("Which Cronos network to query"),
    }),
    execute: async ({ query, network = "CRONOS_MAINNET" }) => {
        try {
            const chainId = CRONOS_CHAINS[network as CronosChainKey];
            const client = getClient(chainId);

            console.log(`[AI-Agent-SDK] Querying ${network} (chainId: ${chainId}): "${query}"`);

            const response = await client.agent.generateQuery(query);

            // Parse the response
            const result = {
                network,
                chainId,
                query,
                status: response.status,
                results: response.results || [],
                message: response.message,
                timestamp: new Date().toISOString(),
                source: "Crypto.com AI Agent SDK",
            };

            console.log(`[AI-Agent-SDK] Response received for: "${query}"`);

            return result;
        } catch (error: any) {
            console.error("[AI-Agent-SDK] Error:", error);

            // Return structured error for AI to interpret
            return {
                error: "Failed to query Crypto.com AI Agent",
                details: error.message || "Unknown error",
                query,
                network,
                hint: "Try rephrasing your query or use the direct Cronos tools (getCronosBalance, getCronosTransaction, etc.)",
            };
        }
    },
});

/**
 * Get blockchain statistics using AI Agent SDK
 */
export const getCryptoComChainStats = tool({
    description: "Get comprehensive blockchain statistics for Cronos networks using Crypto.com AI Agent SDK.",
    parameters: z.object({
        network: z.enum(["CRONOS_MAINNET", "CRONOS_ZKEVM_MAINNET"])
            .optional()
            .default("CRONOS_MAINNET")
            .describe("Which Cronos network to get stats for"),
    }),
    execute: async ({ network = "CRONOS_MAINNET" }) => {
        try {
            const chainId = CRONOS_CHAINS[network as CronosChainKey];
            const client = getClient(chainId);

            console.log(`[AI-Agent-SDK] Getting chain stats for ${network}`);

            const response = await client.agent.generateQuery(
                "Get the current blockchain statistics including latest block, gas price, and network status"
            );

            return {
                network,
                chainId,
                status: response.status,
                stats: response.results || [],
                timestamp: new Date().toISOString(),
                source: "Crypto.com AI Agent SDK",
            };
        } catch (error: any) {
            console.error("[AI-Agent-SDK] Stats error:", error);
            return {
                error: "Failed to get chain statistics",
                details: error.message,
                network,
            };
        }
    },
});

/**
 * Execute a wallet analysis query using AI Agent SDK
 */
export const analyzeWalletWithAI = tool({
    description: "Analyze a wallet address on Cronos using Crypto.com AI Agent SDK. NOTE: For token holdings and portfolio on zkEVM, use getZkEVMPortfolio or getZkEVMTokenList instead - this tool only returns native balance.",
    parameters: z.object({
        address: z.string().describe("Wallet address to analyze (0x...)"),
        network: z.enum(["CRONOS_MAINNET", "CRONOS_ZKEVM_MAINNET"])
            .optional()
            .default("CRONOS_MAINNET")
            .describe("Which Cronos network to analyze on. CRITICAL: If the user mentions 'zkEVM', you MUST select CRONOS_ZKEVM_MAINNET."),
    }),
    execute: async ({ address, network = "CRONOS_MAINNET" }) => {
        try {
            // Validate address format
            if (!address.startsWith("0x") || address.length !== 42) {
                return {
                    error: "Invalid address format",
                    details: "Address must be a valid Ethereum-style address (0x + 40 hex characters)",
                };
            }

            const chainId = CRONOS_CHAINS[network as CronosChainKey];
            const client = getClient(chainId);

            console.log(`[AI-Agent-SDK] Analyzing wallet ${address} on ${network}`);

            const response = await client.agent.generateQuery(
                `Analyze the wallet ${address}. Show the native token balance, any token holdings, and summarize recent transaction activity.`
            );

            return {
                address,
                network,
                chainId,
                status: response.status,
                analysis: response.results || [],
                message: response.message,
                timestamp: new Date().toISOString(),
                source: "Crypto.com AI Agent SDK",
                explorerUrl: network.includes("ZKEVM")
                    ? `https://explorer.zkevm.cronos.org/address/${address}`
                    : `https://explorer.cronos.org/address/${address}`,
            };
        } catch (error: any) {
            console.error("[AI-Agent-SDK] Wallet analysis error details:", JSON.stringify(error, null, 2));

            // Extract error message from the client error object if possible
            const errorMessage = error.response?.data?.message || error.message || "Unknown error";

            return {
                error: "Failed to analyze wallet",
                details: errorMessage,
                address,
                network,
                hint: "The AI Agent service returned an error. If this is a zkEVM wallet, please ensure you specified 'on current zkEVM' in your request.",
            };
        }
    },
});

// Export all AI Agent SDK tools
export const cryptoComAIAgentTools = {
    queryCryptoComAI,
    getCryptoComChainStats,
    analyzeWalletWithAI,
};
