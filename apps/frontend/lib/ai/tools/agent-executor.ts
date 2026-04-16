import { tool } from "ai";
import { z } from "zod";
import { executeRelaySwap } from "@/lib/agent/agent-payment-executor";
import { createClient } from "@relayprotocol/relay-sdk";
import { hasDelegation, getUserAgentWalletAddress } from "@/lib/agent/agent-wallet-store";
import type { TransactionSerializable } from "viem";

export const createExecuteAgenticRelaySwap = (userId: string) => tool({
    description: `Execute a Relay cross-chain swap autonomously using the user's embedded agent wallet.
Use this ONLY if Agent Automation is ENABLED and you have verified the user has sufficient balance in the embedded wallet.
Unlike prepareRelayTransaction, this will actually securely sign and broadcast the transaction on behalf of the user instantly.`,
    parameters: z.object({
        fromChainId: z.number().describe("Source chain ID where funds are coming from"),
        toChainId: z.number().describe("Destination chain ID to bridge funds to"),
        fromToken: z.string().describe("Source token symbol or address (e.g. 'ETH', 'USDC')"),
        toToken: z.string().describe("Destination token symbol or address"),
        amount: z.string().describe("Amount to swap in whole units (e.g., '0.1' for 0.1 ETH). USD amounts are not supported here, you must convert to exact token amounts first if needed."),
    }),
    execute: async ({
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
    }) => {
        try {
            // Check authorization
            const isAgentEnabled = await hasDelegation(userId);
            if (!isAgentEnabled) {
                return {
                    status: "error",
                    message: "Agent access is not delegated. Tell the user they must enable Agent Automation in settings first."
                };
            }

            const walletAddress = await getUserAgentWalletAddress(userId);
            if (!walletAddress) {
                return {
                    status: "error",
                    message: "No embedded agent wallet found."
                };
            }

            console.log(`[AgentExecutor] Autonomous swap triggered for ${userId} (${walletAddress})`);

            // Initialize Relay Client natively
            const client = createClient({
                baseApiUrl: "https://api.relay.link"
            });

            // Get the executable transaction from Relay SDK
            console.log(`[AgentExecutor] Fetching quote...`);
            const txQuote = await client.actions.getQuote({
                chainId: fromChainId,
                toChainId: toChainId,
                currency: fromToken,
                toCurrency: toToken,
                amount: amount,
                tradeType: 'EXACT_INPUT',
                user: walletAddress,
                recipient: walletAddress // Auto-send to their own wallet
            });

            if (!txQuote.steps || txQuote.steps.length === 0) {
                return {
                    status: "error",
                    message: "Failed to generate transaction steps from Relay API."
                };
            }

            // Extract the transaction details
            const item = txQuote.steps[0].items[0];
            const txData = item.data || item;
            
            // Build the transaction literal expected by Viem/Dynamic
            const transaction: TransactionSerializable = {
                to: txData.to,
                value: txData.value ? BigInt(txData.value) : 0n,
                data: txData.data || "0x",
                chainId: txData.chainId || fromChainId,
            };

            console.log(`[AgentExecutor] Signing and broadcasting transaction...`);
            
            // Call the executor
            const result = await executeRelaySwap({
                userId,
                inputAmount: amount,
                inputToken: fromToken,
                outputToken: toToken,
                chainId: fromChainId,
                transaction,
            });

            if (result.success) {
                return {
                    status: "success",
                    message: "Autonomous execution completed!",
                    transactionHash: result.transactionHash,
                    spentAmount: result.spentAmount,
                    explorerUrl: result.transactionHash ? `https://relay.link/transaction/${result.transactionHash}` : undefined
                };
            } else {
                return {
                    status: "error",
                    message: result.error || "Autonomous execution failed during broadcast."
                };
            }
        } catch (error: any) {
            console.error("[AgentExecutor] Critical script error:", error);
            return {
                status: "error",
                message: error.message || "An exception occurred while executing autonomously."
            };
        }
    }
});
