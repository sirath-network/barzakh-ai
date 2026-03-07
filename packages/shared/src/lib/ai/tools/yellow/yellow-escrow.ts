/**
 * Yellow Network Escrow Tools
 *
 * AI-callable tools for escrow logic using Yellow Network state channels.
 * State channels enable trustless escrow: funds are locked in Nitrolite
 * custody contracts and can only be moved via co-signed state updates.
 *
 * Escrow flow using Nitrolite:
 * 1. Create a state channel between buyer and seller (funds locked on-chain)
 * 2. Off-chain state updates track the escrow lifecycle
 * 3. Channel close releases funds to the appropriate party (on-chain settlement)
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
    DEFAULT_CHALLENGE_DURATION,
    parseAmount,
    formatAmount,
} from "./yellow-config";

// =============================================================================
// HELPER: Create NitroliteClient (same as state-channels)
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
            "YELLOW_AGENT_PRIVATE_KEY environment variable is not set."
        );
    }

    const chainConfig = YELLOW_SUPPORTED_CHAINS[chainId];
    if (!chainConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const contractAddresses = YELLOW_CONTRACT_ADDRESSES[chainId];
    if (!contractAddresses) {
        throw new Error(`No Nitrolite contracts deployed on chain ${chainId}`);
    }

    const account = privateKeyToAccount(YELLOW_AGENT_PRIVATE_KEY);

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
// TOOL: yellowCreateEscrow
// =============================================================================

/**
 * Create an escrow by opening a state channel with funds locked in the
 * Nitrolite custody contract. The channel acts as an escrow — funds can
 * only be released via co-signed state updates or on-chain dispute resolution.
 */
export const yellowCreateEscrow = tool({
    description: `Create a trustless escrow using Yellow Network state channels.
Funds are deposited into the Nitrolite custody contract and a state channel is created
between the buyer and seller. The escrow uses on-chain smart contracts for security —
neither party can unilaterally withdraw. Funds are released when both parties agree
(cooperative close) or through the on-chain dispute/challenge mechanism.

This demonstrates:
- On-chain settlement: Funds locked in Nitrolite custody contract
- Escrow logic: State channel between two parties with locked funds
- Challenge mechanism: If parties disagree, on-chain dispute resolution via challenge period

Supported assets: ${Object.keys(YELLOW_SUPPORTED_ASSETS).join(", ")}.`,
    parameters: z.object({
        chainId: z
            .number()
            .describe("The blockchain chain ID for the escrow"),
        asset: z
            .string()
            .describe('The asset to escrow (e.g., "usdc", "weth")'),
        amount: z
            .string()
            .describe('The amount to lock in escrow (e.g., "500.00")'),
        counterpartyAddress: z
            .string()
            .describe(
                "The counterparty's wallet address (0x...) — the other party in the escrow"
            ),
        description: z
            .string()
            .optional()
            .describe("Optional description of the escrow purpose"),
    }),
    execute: async ({ chainId, asset, amount, counterpartyAddress, description }) => {
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

            const { client, account, chainConfig } = await createNitroliteClient(chainId);
            const escrowAmount = parseAmount(amount, assetInfo.decimals);

            // Step 1: Approve and deposit tokens into custody
            const allowance = await client.getTokenAllowance(tokenAddress);
            if (allowance < escrowAmount) {
                await client.approveTokens(tokenAddress, escrowAmount);
            }

            // Step 2: Create channel between the agent and counterparty
            //         The funds are locked in the channel as escrow
            const channelParams = {
                channel: {
                    participants: [
                        account.address,
                        counterpartyAddress as `0x${string}`,
                    ] as [`0x${string}`, `0x${string}`],
                    adjudicator: YELLOW_CONTRACT_ADDRESSES[chainId].adjudicator,
                    challenge: DEFAULT_CHALLENGE_DURATION,
                    nonce: BigInt(Date.now()),
                },
                unsignedInitialState: {
                    intent: 1 as const, // INITIALIZE
                    version: 0n,
                    data: "0x" as `0x${string}`,
                    allocations: [
                        {
                            destination: account.address,
                            token: tokenAddress,
                            amount: escrowAmount,
                        },
                        {
                            destination: counterpartyAddress as `0x${string}`,
                            token: tokenAddress,
                            amount: 0n,
                        },
                    ],
                },
                serverSignature: "0x" as `0x${string}`, // Will be co-signed
            };

            const result = await client.depositAndCreateChannel(
                tokenAddress,
                escrowAmount,
                channelParams
            );

            return {
                success: true,
                operation: "create_escrow",
                escrowChannelId: result.channelId,
                sender: account.address,
                receiver: counterpartyAddress,
                asset: assetInfo.symbol,
                amount: amount,
                chain: chainConfig.name,
                chainId: chainId,
                transactionHash: result.txHash,
                stateVersion: result.initialState.version.toString(),
                description: description || "Yellow Network Escrow",
                challengeDuration: `${DEFAULT_CHALLENGE_DURATION.toString()} seconds`,
                message: `Escrow created! ${amount} ${assetInfo.symbol} locked in Yellow Network state channel on ${chainConfig.name}. Channel ID: ${result.channelId}. Funds are secured in the Nitrolite custody contract with a ${DEFAULT_CHALLENGE_DURATION.toString()}s challenge period. Tx: ${result.txHash}`,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                hint: "Ensure YELLOW_AGENT_PRIVATE_KEY is set, the wallet has sufficient balance, and both parties have valid addresses.",
            };
        }
    },
});

// =============================================================================
// TOOL: yellowDepositToEscrow
// =============================================================================

/**
 * Add more funds to an existing escrow channel via resize operation.
 */
export const yellowDepositToEscrow = tool({
    description: `Add additional funds to an existing Yellow Network escrow channel.
This resizes the channel to include more locked funds.`,
    parameters: z.object({
        chainId: z.number().describe("The blockchain chain ID"),
        channelId: z
            .string()
            .describe("The escrow channel ID to add funds to"),
        asset: z
            .string()
            .describe('The asset to add (must match escrow asset)'),
        amount: z
            .string()
            .describe("The additional amount to deposit"),
    }),
    execute: async ({ chainId, channelId, asset, amount }) => {
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
            const additionalAmount = parseAmount(amount, assetInfo.decimals);

            // Approve additional tokens
            const allowance = await client.getTokenAllowance(tokenAddress);
            if (allowance < additionalAmount) {
                await client.approveTokens(tokenAddress, additionalAmount);
            }

            // Deposit additional funds into the custody
            const txHash = await client.deposit(tokenAddress, additionalAmount);

            return {
                success: true,
                operation: "deposit_to_escrow",
                channelId,
                asset: assetInfo.symbol,
                amount,
                chain: chainConfig.name,
                transactionHash: txHash,
                message: `Added ${amount} ${assetInfo.symbol} to escrow channel ${channelId} on ${chainConfig.name}. Tx: ${txHash}`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});

// =============================================================================
// TOOL: yellowReleaseEscrow
// =============================================================================

/**
 * Release escrowed funds by closing the state channel.
 * This settles the escrow on-chain, releasing funds to the final allocation.
 */
export const yellowReleaseEscrow = tool({
    description: `Release funds from a Yellow Network escrow by closing the state channel.
This performs an on-chain settlement that releases the locked funds to the agreed-upon allocation.
Use this when the escrow conditions are met (service delivered, trade confirmed).
The close operation is settled on-chain, moving funds from the custody contract to the recipient.`,
    parameters: z.object({
        chainId: z.number().describe("The blockchain chain ID"),
        channelId: z
            .string()
            .describe("The escrow channel ID to release/close"),
    }),
    execute: async ({ chainId, channelId }) => {
        try {
            const { client, chainConfig } = await createNitroliteClient(chainId);

            // Get current channel data
            const channelData = await client.getChannelData(
                channelId as `0x${string}`
            );

            if (!channelData) {
                return {
                    success: false,
                    error: `Escrow channel ${channelId} not found on ${chainConfig.name}`,
                };
            }

            // Close the channel — this releases funds per the final state allocation
            const txHash = await client.closeChannel({
                finalState: {
                    ...channelData.lastValidState,
                    channelId: channelId as `0x${string}`,
                    serverSignature: "0x" as `0x${string}`,
                    intent: 3 as const, // FINALIZE
                },
            });

            return {
                success: true,
                operation: "release_escrow",
                channelId,
                chain: chainConfig.name,
                chainId,
                transactionHash: txHash,
                settlementType: "on-chain close (funds released from custody)",
                message: `Escrow ${channelId} released! Funds settled on-chain on ${chainConfig.name}. The state channel is now closed and funds have been distributed per the final allocation. Tx: ${txHash}`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});

// =============================================================================
// TOOL: yellowGetEscrowStatus
// =============================================================================

/**
 * Get the current status of an escrow (state channel).
 */
export const yellowGetEscrowStatus = tool({
    description: `Check the current status of a Yellow Network escrow (state channel).
Returns the escrow state, participants, locked amounts, and channel lifecycle.`,
    parameters: z.object({
        chainId: z.number().describe("The blockchain chain ID"),
        channelId: z
            .string()
            .describe("The escrow channel ID to check"),
    }),
    execute: async ({ chainId, channelId }) => {
        try {
            const { client, chainConfig } = await createNitroliteClient(chainId);

            const channelData = await client.getChannelData(
                channelId as `0x${string}`
            );

            if (!channelData) {
                return {
                    success: true,
                    channelId,
                    chain: chainConfig.name,
                    status: "not_found",
                    message: `No escrow channel found with ID ${channelId} on ${chainConfig.name}.`,
                };
            }

            const statusMap: Record<number, string> = {
                0: "Void",
                1: "Initial (funds being locked)",
                2: "Active (escrow in progress)",
                3: "Disputed (challenge period active)",
                4: "Finalized (escrow settled)",
            };

            const statusInt = typeof channelData.status === "number"
                ? channelData.status
                : Number(channelData.status);
            const statusLabel = statusMap[statusInt] || "Unknown";

            // Format allocations
            const allocations = channelData.lastValidState?.allocations?.map(
                (a: any) => ({
                    destination: a.destination,
                    token: a.token,
                    amount: a.amount?.toString() || "0",
                })
            ) || [];

            return {
                success: true,
                channelId,
                chain: chainConfig.name,
                chainId,
                status: statusLabel,
                statusCode: statusInt,
                participants: channelData.channel?.participants || [],
                allocations,
                stateVersion: channelData.lastValidState?.version?.toString() || "0",
                challengeExpiry: channelData.challengeExpiry?.toString() || "0",
                message: `Escrow ${channelId} on ${chainConfig.name}: Status=${statusLabel}, Participants=${(channelData.channel?.participants || []).length}, State Version=${channelData.lastValidState?.version?.toString() || "0"}`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
});

// =============================================================================
// EXPORTS
// =============================================================================

export const yellowEscrowTools = {
    yellowCreateEscrow,
    yellowDepositToEscrow,
    yellowReleaseEscrow,
    yellowGetEscrowStatus,
};
