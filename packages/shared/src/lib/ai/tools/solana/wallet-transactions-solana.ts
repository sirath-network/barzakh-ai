import { tool } from "ai";
import { z } from "zod";
import { getZerionApiKey } from "../../../utils/utils";
import { zerionBaseURL } from "../onchain/constant";

// Zerion Transaction Response Types
interface ZerionFungibleInfo {
    name: string;
    symbol: string;
    icon: { url: string } | null;
}

interface ZerionTransfer {
    fungible_info: ZerionFungibleInfo;
    direction: "in" | "out";
    quantity: {
        float: number;
        numeric: string;
    };
    value: number | null;
    price: number | null;
    sender: string;
    recipient: string;
}

interface ZerionTransactionAttributes {
    operation_type: string;
    hash: string;
    mined_at: string;
    mined_at_block: number;
    sent_from: string;
    sent_to: string;
    status: string;
    fee: {
        fungible_info: ZerionFungibleInfo;
        quantity: { float: number };
        value: number | null;
    } | null;
    transfers: ZerionTransfer[];
    flags: {
        is_trash: boolean;
    };
}

interface ZerionTransaction {
    type: string;
    id: string;
    attributes: ZerionTransactionAttributes;
}

interface ZerionTransactionsResponse {
    data: ZerionTransaction[];
    links?: {
        self: string;
        next?: string;
    };
}

// Simplified transaction type for AI response
export interface SolanaTransaction {
    hash: string;
    type: string;
    status: string;
    timestamp: string;
    from: string;
    to: string;
    fee: {
        amount: number;
        symbol: string;
        valueUsd: number | null;
    } | null;
    transfers: Array<{
        direction: "in" | "out";
        token: string;
        symbol: string;
        amount: number;
        valueUsd: number | null;
        from: string;
        to: string;
    }>;
}

export interface TransactionHistoryResponse {
    wallet: string;
    chain: "solana";
    transactions: SolanaTransaction[];
    totalCount: number;
}

// Transform Zerion response to simplified format
const transformTransactions = (
    response: ZerionTransactionsResponse,
    walletAddress: string
): TransactionHistoryResponse => {
    const transactions: SolanaTransaction[] = response.data
        .filter((tx) => !tx.attributes.flags.is_trash) // Filter out spam
        .map((tx) => ({
            hash: tx.attributes.hash,
            type: formatOperationType(tx.attributes.operation_type),
            status: tx.attributes.status,
            timestamp: tx.attributes.mined_at,
            from: tx.attributes.sent_from,
            to: tx.attributes.sent_to || "",
            fee: tx.attributes.fee
                ? {
                    amount: tx.attributes.fee.quantity.float,
                    symbol: tx.attributes.fee.fungible_info.symbol,
                    valueUsd: tx.attributes.fee.value,
                }
                : null,
            transfers: tx.attributes.transfers.map((transfer) => ({
                direction: transfer.direction,
                token: transfer.fungible_info.name,
                symbol: transfer.fungible_info.symbol,
                amount: transfer.quantity.float,
                valueUsd: transfer.value,
                from: transfer.sender,
                to: transfer.recipient,
            })),
        }));

    return {
        wallet: walletAddress,
        chain: "solana",
        transactions,
        totalCount: transactions.length,
    };
};

// Format operation type for better readability
const formatOperationType = (type: string): string => {
    const typeMap: Record<string, string> = {
        receive: "Receive",
        send: "Send",
        trade: "Swap",
        execute: "Contract Execution",
        approve: "Approval",
        mint: "Mint",
        burn: "Burn",
        stake: "Stake",
        unstake: "Unstake",
        claim: "Claim Rewards",
        deposit: "Deposit",
        withdraw: "Withdraw",
        bridge: "Bridge",
        borrow: "Borrow",
        repay: "Repay",
    };
    return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

export const getSolanaWalletTransactions = tool({
    description:
        "Fetch recent transaction history for a Solana wallet address. Returns the last transactions including sends, receives, swaps, and other operations. IMPORTANT: The UI will automatically render a transaction history table from the result. DO NOT list the transactions in your text response. Just provide a brief 1-sentence summary.",
    parameters: z.object({
        wallet_address: z
            .string()
            .describe("Solana wallet address (Base58 format)"),
        limit: z
            .number()
            .min(1)
            .max(50)
            .default(20)
            .describe("Number of transactions to fetch (max 50)"),
    }),
    execute: async ({
        wallet_address,
        limit = 20,
    }: {
        wallet_address: string;
        limit?: number;
    }): Promise<TransactionHistoryResponse | string> => {
        const apiKey = getZerionApiKey();

        if (!apiKey) {
            console.error("ZERION_DEV_API_KEY not configured");
            return "Solana transaction service is not configured. Please contact support.";
        }

        try {
            // Use Zerion API with Solana chain filter
            const url = `${zerionBaseURL}/v1/wallets/${wallet_address}/transactions/?filter[chain_ids]=solana&currency=usd&page[size]=${limit}`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    accept: "application/json",
                    authorization: `Basic ${apiKey}`,
                },
            });

            if (!response.ok) {
                let errorDetails = "";
                try {
                    const errorJson = await response.json();
                    errorDetails = JSON.stringify(errorJson);
                } catch {
                    errorDetails = await response.text();
                }
                console.error(`Zerion API Error ${response.status}:`, errorDetails);

                if (response.status === 400) {
                    return "Invalid Solana address format. Please verify and try again.";
                }
                return `API Error: ${response.status}`;
            }

            const data: ZerionTransactionsResponse = await response.json();

            if (!data.data || data.data.length === 0) {
                return "No transaction history found for this wallet on Solana.";
            }

            const result = transformTransactions(data, wallet_address);

            if (result.transactions.length === 0) {
                return "No non-spam transactions found for this wallet.";
            }

            return result;
        } catch (error) {
            console.error("Error fetching Solana transactions:", error);
            return "Failed to fetch transaction history. Please try again.";
        }
    },
});
