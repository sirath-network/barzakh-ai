/**
 * Yellow Network State Channel Tools
 *
 * AI-callable tools for managing state channels on Yellow Network
 * using the Nitrolite SDK v0.5.3 (ERC-7824 state channels).
 *
 * Key features demonstrated:
 * - Off-chain matching: State signing happens off-chain for instant operations
 * - On-chain settlement: Deposit/withdrawal/checkpoint settle on the blockchain
 * - Escrow: Funds locked in Nitrolite custody contracts
 *
 * The NitroliteClient uses viem for blockchain interactions:
 * - PublicClient for reading chain state
 * - WalletClient for signing transactions
 * - StateSigner (WalletStateSigner) for signing channel states
 *
 * @see https://github.com/erc7824/nitrolite
 */

import { tool } from "ai";
import { z } from "zod";
import {
    YELLOW_AGENT_PRIVATE_KEY,
    YELLOW_SUPPORTED_ASSETS,
    YELLOW_SUPPORTED_CHAINS,
    YELLOW_CONTRACT_ADDRESSES,
    YELLOW_TOKEN_ADDRESSES,
    CHANNEL_STATUS_LABELS,
    CHANNEL_STATUS_FROM_INT,
    DEFAULT_CHALLENGE_DURATION,
    parseAmount,
    formatAmount,
    type YellowChannelStatus,
} from "./yellow-config";

// =============================================================================
// HELPER: Create NitroliteClient
// =============================================================================

async function createNitroliteClient(chainId: number) {
    const {
        NitroliteClient,
        WalletStateSigner,
    } = await import("@erc7824/nitrolite");
    const {
        createPublicClient,
        createWalletClient,
        http,
    } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    if (!YELLOW_AGENT_PRIVATE_KEY) {
        throw new Error(
            "YELLOW_AGENT_PRIVATE_KEY environment variable is not set. " +
            "Please configure it to enable Yellow Network state channel operations."
        );
    }

    const chainConfig = YELLOW_SUPPORTED_CHAINS[chainId];
    if (!chainConfig) {
        throw new Error(
            `Unsupported chain ID: ${chainId}. Supported: ${Object.entries(YELLOW_SUPPORTED_CHAINS)
                .map(([id, c]) => `${c.name} (${id})`)
                .join(", ")}`
        );
    }

    const contractAddresses = YELLOW_CONTRACT_ADDRESSES[chainId];
    if (!contractAddresses) {
        throw new Error(
            `No Nitrolite contracts deployed on chain ${chainId} (${chainConfig.name})`
        );
    }

    const account = privateKeyToAccount(YELLOW_AGENT_PRIVATE_KEY);

    // Build a minimal chain object for viem
    const chain = {
        id: chainId,
        name: chainConfig.name,
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [chainConfig.rpcUrl] } },
    } as any;

    const publicClient = createPublicClient({
        chain,
        transport: http(chainConfig.rpcUrl),
    });

    const walletClient = createWalletClient({
        account,
        chain,
        transport: http(chainConfig.rpcUrl),
    });

    const stateSigner = new WalletStateSigner(walletClient as any);

    const client = new NitroliteClient({
        publicClient: publicClient as any,
        walletClient: walletClient as any,
        stateSigner,
        addresses: contractAddresses,
        chainId,
        challengeDuration: DEFAULT_CHALLENGE_DURATION,
    });

    return { client, account, chainConfig };
}

// =============================================================================
// TOOL: yellowDeposit
// =============================================================================

/**
 * Deposit funds into Yellow Network custody contract.
 * This locks tokens on-chain, making them available for state channel operations.
 */
export const yellowDeposit = tool({
    description: `Deposit funds into a Yellow Network custody contract on-chain. 
This locks tokens in the Nitrolite smart contract, enabling off-chain state channel operations.
The deposit is settled on-chain — demonstrating the on-chain settlement side of the Yellow Network flow.
After depositing, the user can create channels for instant, gasless off-chain transfers.
Supported assets: ${Object.keys(YELLOW_SUPPORTED_ASSETS).join(", ")}.
Supported chains: ${Object.entries(YELLOW_SUPPORTED_CHAINS)
            .map(([id, c]) => `${c.name} (${id})`)
            .join(", ")}.`,
    parameters: z.object({
        chainId: z
            .number()
            .describe(
                "The blockchain chain ID to deposit on (e.g., 8453 for Base)"
            ),
        asset: z
            .string()
            .describe(
                'The asset symbol to deposit (e.g., "usdc", "weth")'
            ),
        amount: z
            .string()
            .describe(
                'The amount to deposit as a decimal string (e.g., "100.50")'
            ),
    }),
    execute: async ({ chainId, asset, amount }) => {
        try {
            const assetLower = asset.toLowerCase();
            const assetInfo = YELLOW_SUPPORTED_ASSETS[assetLower];
            if (!assetInfo) {
                return {
                    success: false,
                    error: `Unsupported asset: ${asset}. Supported: ${Object.keys(YELLOW_SUPPORTED_ASSETS).join(", ")}`,
                };
            }

            const tokenAddresses = YELLOW_TOKEN_ADDRESSES[chainId];
            const tokenAddress = tokenAddresses?.[assetInfo.symbol];
            if (!tokenAddress) {
                return {
                    success: false,
                    error: `Token ${assetInfo.symbol} not available on chain ${chainId}`,
                };
            }

            const { client, chainConfig } = await createNitroliteClient(chainId);
            const depositAmount = parseAmount(amount, assetInfo.decimals);

            // Step 1: Approve token spending (if ERC-20)
            const allowance = await client.getTokenAllowance(tokenAddress);
            if (allowance < depositAmount) {
                const approveTx = await client.approveTokens(
                    tokenAddress,
                    depositAmount
                );
                console.log(`[Yellow] Token approval tx: ${approveTx}`);
            }

            // Step 2: Deposit into custody contract (on-chain settlement)
            const txHash = await client.deposit(tokenAddress, depositAmount);

            return {
                success: true,
                operation: "deposit",
                asset: assetInfo.symbol,
                amount: amount,
                chain: chainConfig.name,
                chainId: chainId,
                transactionHash: txHash,
                settlementType: "on-chain (funds locked in Nitrolite custody)",
                message: `Successfully deposited ${amount} ${assetInfo.symbol} into Yellow Network on ${chainConfig.name}. Funds are now locked in the Nitrolite custody contract and available for state channel operations. Tx: ${txHash}`,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                hint: "Ensure YELLOW_AGENT_PRIVATE_KEY is configured and the wallet has sufficient token balance and ETH for gas.",
            };
        }
    },
});

// =============================================================================
// TOOL: yellowWithdraw
// =============================================================================

/**
 * Withdraw funds from Yellow Network custody contract back to the wallet.
 */
export const yellowWithdraw = tool({
    description: `Withdraw funds from Yellow Network custody contract back to your on-chain wallet.
This moves tokens out of the Nitrolite custody contract, settling the withdrawal on-chain.`,
    parameters: z.object({
        chainId: z
            .number()
            .describe("The blockchain chain ID to withdraw on"),
        asset: z
            .string()
            .describe('The asset symbol to withdraw (e.g., "usdc", "weth")'),
        amount: z
            .string()
            .describe(
                'The amount to withdraw as a decimal string (e.g., "50.00")'
            ),
    }),
    execute: async ({ chainId, asset, amount }) => {
        try {
            const assetLower = asset.toLowerCase();
            const assetInfo = YELLOW_SUPPORTED_ASSETS[assetLower];
            if (!assetInfo) {
                return { success: false, error: `Unsupported asset: ${asset}` };
            }

            const tokenAddresses = YELLOW_TOKEN_ADDRESSES[chainId];
            const tokenAddress = tokenAddresses?.[assetInfo.symbol];
            if (!tokenAddress) {
                return {
                    success: false,
                    error: `Token ${assetInfo.symbol} not available on chain ${chainId}`,
                };
            }

            const { client, chainConfig } = await createNitroliteClient(chainId);
            const withdrawAmount = parseAmount(amount, assetInfo.decimals);

            const txHash = await client.withdrawal(tokenAddress, withdrawAmount);

            return {
                success: true,
                operation: "withdraw",
                asset: assetInfo.symbol,
                amount: amount,
                chain: chainConfig.name,
                chainId: chainId,
                transactionHash: txHash,
                settlementType: "on-chain (funds released from custody)",
                message: `Successfully withdrew ${amount} ${assetInfo.symbol} from Yellow Network on ${chainConfig.name}. Funds returned to on-chain wallet. Tx: ${txHash}`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});

// =============================================================================
// TOOL: yellowTransfer (Off-chain state channel transfer)
// =============================================================================

/**
 * Execute a checkpoint on a state channel — settling off-chain state on-chain.
 * This demonstrates the off-chain → on-chain settlement pattern.
 */
export const yellowTransfer = tool({
    description: `Execute a state channel checkpoint on Yellow Network, settling the latest off-chain state on-chain.
This is the core demonstration of Yellow Network's off-chain matching + on-chain settlement:
1. Off-chain: States are signed between parties instantly (no gas)
2. On-chain: A checkpoint transaction settles the latest state on the blockchain
The checkpoint ensures the on-chain state matches the latest agreed-upon off-chain state.`,
    parameters: z.object({
        chainId: z
            .number()
            .describe("The blockchain chain ID"),
        channelId: z
            .string()
            .describe("The state channel ID (hex) to checkpoint"),
    }),
    execute: async ({ chainId, channelId }) => {
        try {
            const { client, chainConfig } = await createNitroliteClient(chainId);

            // Get current channel data to build checkpoint
            const channelData = await client.getChannelData(channelId as `0x${string}`);

            if (!channelData) {
                return {
                    success: false,
                    error: `Channel ${channelId} not found on ${chainConfig.name}`,
                };
            }

            // Checkpoint the channel (settle off-chain state on-chain)
            const txHash = await client.checkpointChannel({
                channelId: channelId as `0x${string}`,
                candidateState: channelData.lastValidState,
            });

            return {
                success: true,
                operation: "checkpoint",
                channelId: channelId,
                chain: chainConfig.name,
                chainId: chainId,
                transactionHash: txHash,
                settlementType: "on-chain checkpoint (off-chain state → on-chain)",
                message: `Successfully checkpointed state channel ${channelId} on ${chainConfig.name}. Off-chain state is now settled on-chain. Tx: ${txHash}`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});

// =============================================================================
// TOOL: yellowGetBalance
// =============================================================================

/**
 * Query balance for a token in the Yellow Network custody contract.
 */
export const yellowGetBalance = tool({
    description: `Check the balance of tokens deposited in Yellow Network custody contract.
Returns the on-chain balance available for state channel operations.`,
    parameters: z.object({
        chainId: z
            .number()
            .describe("The blockchain chain ID to check balance on"),
        asset: z
            .string()
            .describe(
                'The asset symbol to check balance for (e.g., "usdc", "weth")'
            ),
    }),
    execute: async ({ chainId, asset }) => {
        try {
            const assetLower = asset.toLowerCase();
            const assetInfo = YELLOW_SUPPORTED_ASSETS[assetLower];
            if (!assetInfo) {
                return { success: false, error: `Unsupported asset: ${asset}` };
            }

            const tokenAddresses = YELLOW_TOKEN_ADDRESSES[chainId];
            const tokenAddress = tokenAddresses?.[assetInfo.symbol];
            if (!tokenAddress) {
                return {
                    success: false,
                    error: `Token ${assetInfo.symbol} not available on chain ${chainId}`,
                };
            }

            const { client, chainConfig } = await createNitroliteClient(chainId);

            const balance = await client.getAccountBalance(tokenAddress);
            const formattedBalance = formatAmount(balance, assetInfo.decimals);

            return {
                success: true,
                asset: assetInfo.symbol,
                balance: formattedBalance,
                rawBalance: balance.toString(),
                chain: chainConfig.name,
                chainId: chainId,
                message: `Yellow Network balance on ${chainConfig.name}: ${formattedBalance} ${assetInfo.symbol} (locked in custody contract)`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});

// =============================================================================
// TOOL: yellowGetChannelStatus
// =============================================================================

/**
 * Get the status of a Yellow Network state channel.
 */
export const yellowGetChannelStatus = tool({
    description: `Get the current status of a Yellow Network state channel.
Shows the channel lifecycle state (Void → Initial → Active → Dispute → Final),
the channel participants, and latest state version.`,
    parameters: z.object({
        chainId: z
            .number()
            .describe("The blockchain chain ID"),
        channelId: z
            .string()
            .optional()
            .describe(
                "Optional specific channel ID to check. If not provided, lists all open channels."
            ),
    }),
    execute: async ({ chainId, channelId }) => {
        try {
            const { client, chainConfig } = await createNitroliteClient(chainId);

            if (channelId) {
                // Get specific channel data
                const channelData = await client.getChannelData(
                    channelId as `0x${string}`
                );

                if (!channelData) {
                    return {
                        success: true,
                        channelId,
                        chain: chainConfig.name,
                        status: "void" as YellowChannelStatus,
                        statusLabel: CHANNEL_STATUS_LABELS["void"],
                        message: `No channel found with ID ${channelId} on ${chainConfig.name}.`,
                    };
                }

                const statusInt = typeof channelData.status === "number"
                    ? channelData.status
                    : Number(channelData.status);
                const status = CHANNEL_STATUS_FROM_INT[statusInt] || "void";

                return {
                    success: true,
                    channelId,
                    chain: chainConfig.name,
                    status,
                    statusLabel: CHANNEL_STATUS_LABELS[status],
                    participants: channelData.channel?.participants || [],
                    stateVersion: channelData.lastValidState?.version?.toString() || "0",
                    message: `Channel ${channelId} on ${chainConfig.name}: Status=${CHANNEL_STATUS_LABELS[status]}, Version=${channelData.lastValidState?.version?.toString() || "0"}`,
                };
            } else {
                // List all open channels
                const openChannels = await client.getOpenChannels();

                return {
                    success: true,
                    chain: chainConfig.name,
                    channelCount: openChannels.length,
                    channels: openChannels.map((ch: any) => ch.toString()),
                    message: openChannels.length > 0
                        ? `Found ${openChannels.length} open channel(s) on ${chainConfig.name}: ${openChannels.map((ch: any) => ch.toString()).join(", ")}`
                        : `No open channels found on ${chainConfig.name}. Deposit funds and create a channel first.`,
                };
            }
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});

// =============================================================================
// EXPORTS
// =============================================================================

export const yellowStateChannelTools = {
    yellowDeposit,
    yellowWithdraw,
    yellowTransfer,
    yellowGetBalance,
    yellowGetChannelStatus,
};
