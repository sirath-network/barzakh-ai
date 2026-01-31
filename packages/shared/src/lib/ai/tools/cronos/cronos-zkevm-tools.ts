/**
 * Cronos zkEVM Direct Tools
 * 
 * Provides direct API access to Cronos zkEVM blockchain explorer,
 * bypassing the AI Agent SDK for reliable, deterministic results.
 * 
 * API Base: https://explorer-api.zkevm.cronos.org/api/v1
 * Format: /{module}/{action}?params&apikey={apikey}
 * Requires: ZKEVM_CRONOS_EXPLORER_API_KEY environment variable
 * 
 * Official Endpoints:
 * - account/getBalance
 * - account/getTxsByAddress (requires startBlock, endBlock, session)
 * - account/getInternalTxsByAddress
 * - account/getERC20TransferByAddress
 * - token/getAccountBalanceByContract
 * - token/getTotalSupplyByContract
 * - transaction/getStatus
 * - contract/getAbi
 * - contract/getSourceCode
 * - price/getZkcroPrice
 * - block/getBlock
 * - ethproxy/getBlockNumber
 */

import { tool } from "ai";
import { z } from "zod";

// Cronos zkEVM Explorer API base URL
const ZKEVM_EXPLORER_API = "https://explorer-api.zkevm.cronos.org/api/v1";
const ZKEVM_EXPLORER_TABLE = "https://explorer.zkevm.cronos.org/table";
const ZKEVM_RPC = "https://mainnet.zkevm.cronos.org";

/**
 * Helper to make API requests to zkEVM Explorer
 * Uses path-based format: /api/v1/{module}/{action}?params
 */
async function zkevmApiRequest(module: string, action: string, params: Record<string, string> = {}) {
    const apiKey = process.env.ZKEVM_CRONOS_EXPLORER_API_KEY;
    if (!apiKey) {
        throw new Error("ZKEVM_CRONOS_EXPLORER_API_KEY is required for Cronos zkEVM tools");
    }

    // Path-based URL format: /api/v1/{module}/{action}
    const url = new URL(`${ZKEVM_EXPLORER_API}/${module}/${action}`);
    url.searchParams.set("apikey", apiKey);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    console.log(`[zkEVM API] ${module}/${action}:`, url.toString().replace(apiKey, "***"));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`zkEVM API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Helper to fetch ERC-20 token balances from zkEVM Explorer's internal table endpoint
 * This endpoint returns the full token list in __NEXT_DATA__ JSON embedded in HTML
 */
async function fetchZkEVMTokenBalances(address: string): Promise<any[]> {
    const url = `${ZKEVM_EXPLORER_TABLE}/erc20TokenBalance?address=${address}&p=1&ps=500`;
    console.log(`[zkEVM Token] Fetching token balances from explorer table: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
        headers: {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
        },
        signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`Failed to fetch token balances: ${response.status}`);
    }

    const html = await response.text();

    // Extract __NEXT_DATA__ JSON from HTML
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!nextDataMatch) {
        throw new Error("Could not find __NEXT_DATA__ in explorer response");
    }

    const nextData = JSON.parse(nextDataMatch[1]);
    const tokens = nextData.props?.pageProps?.data?.result || [];

    console.log(`[zkEVM Token] Found ${tokens.length} tokens from explorer`);
    return tokens;
}


/**
 * Get native token balance on Cronos zkEVM
 */
export const getZkEVMBalance = tool({
    description: "Get the native zkCRO balance of a wallet address on Cronos zkEVM (Chain ID 388). Use for zkEVM balance queries.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) {
                return { error: "Invalid address format", details: "Address must be 0x followed by 40 hex characters" };
            }

            let balanceWei: bigint;

            try {
                // Try explorer API first (uses getBalance endpoint)
                const data = await zkevmApiRequest("account", "getBalance", { address });
                // Handle nested response format: { result: { balance: "..." } }
                const balanceStr = typeof data.result === 'object' ? data.result.balance : data.result;
                balanceWei = BigInt(balanceStr || "0");
            } catch (apiError) {
                // Fallback to RPC if explorer API fails
                console.log("[zkEVM] Explorer API failed, using RPC fallback");
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const rpcResponse = await fetch(ZKEVM_RPC, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 }),
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                const rpcData = await rpcResponse.json();
                balanceWei = BigInt(rpcData.result || "0");
            }

            const balanceZkCRO = Number(balanceWei) / 1e18;
            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                balance: { wei: balanceWei.toString(), zkCRO: balanceZkCRO.toFixed(6), formatted: `${balanceZkCRO.toFixed(4)} zkCRO` },
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}`,
            };
        } catch (error: any) {
            console.error("[zkEVM] Balance error:", error);
            return { error: "Failed to fetch zkEVM balance", details: error.message, address };
        }
    },
});

/**
 * Get transaction history on Cronos zkEVM
 * Endpoint: account/getTxsByAddress + getERC20TransferByAddress + getInternalTxsByAddress
 * Note: API limits block range to max 10,000 blocks per request, so we paginate
 * Merges token transfers and internal transactions for accurate display
 */
export const getZkEVMTransactionHistory = tool({
    description: "Get the latest transactions for a wallet address on Cronos zkEVM (Chain ID 388). Use for zkEVM transaction history.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        blockRange: z.number().optional().default(100000).describe("Number of recent blocks to search (default: 100000, fetched in 10k chunks)"),
    }),
    execute: async ({ address, blockRange = 100000 }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) {
                return { error: "Invalid address format", details: "Address must be 0x followed by 40 hex characters" };
            }

            // Get current block number
            const blockData = await zkevmApiRequest("ethproxy", "getBlockNumber", {});
            const currentBlock = parseInt(blockData.result, 16);
            const targetStartBlock = Math.max(0, currentBlock - blockRange);

            console.log(`[zkEVM] Fetching txs, token transfers, and internal txs from block ${targetStartBlock} to ${currentBlock}`);

            // API limits to 10,000 blocks per request - fetch in parallel chunks
            const CHUNK_SIZE = 10000;
            const MAX_CHUNKS = 5; // Reduce to 5 chunks since we're fetching 3 types

            const allTxs: any[] = [];
            const allTokenTransfers: any[] = [];
            const allInternalTxs: any[] = [];

            // Build requests for all chunks
            let endBlock = currentBlock;
            let chunksProcessed = 0;

            while (endBlock > targetStartBlock && chunksProcessed < MAX_CHUNKS) {
                const startBlock = Math.max(targetStartBlock, endBlock - CHUNK_SIZE);

                try {
                    // Fetch all 3 types in parallel for this chunk
                    const [txData, tokenData, internalData] = await Promise.all([
                        zkevmApiRequest("account", "getTxsByAddress", {
                            address,
                            startBlock: startBlock.toString(),
                            endBlock: endBlock.toString(),
                        }).catch(() => ({ result: [] })),
                        zkevmApiRequest("account", "getERC20TransferByAddress", {
                            address,
                            startBlock: startBlock.toString(),
                            endBlock: endBlock.toString(),
                        }).catch(() => ({ result: [] })),
                        zkevmApiRequest("account", "getInternalTxsByAddress", {
                            address,
                            startBlock: startBlock.toString(),
                            endBlock: endBlock.toString(),
                        }).catch(() => ({ result: [] })),
                    ]);

                    // Collect all data
                    const txList = txData.result || txData.items || [];
                    const tokenList = tokenData.result || tokenData.items || [];
                    const internalList = internalData.result || internalData.items || [];

                    allTxs.push(...txList);
                    allTokenTransfers.push(...tokenList);
                    allInternalTxs.push(...internalList);

                } catch (chunkError: any) {
                    console.error(`[zkEVM] Chunk ${startBlock}-${endBlock} failed:`, chunkError.message);
                }

                endBlock = startBlock;
                chunksProcessed++;
            }

            // Group token transfers by transaction hash
            const tokenTransfersByHash = new Map<string, any[]>();
            for (const transfer of allTokenTransfers) {
                const hash = (transfer.transactionHash || transfer.hash || "").toLowerCase();
                if (!hash) continue;

                const toAddr = typeof transfer.to === 'object' ? transfer.to?.address : transfer.to;
                const isReceiving = (toAddr || "").toLowerCase() === address.toLowerCase();

                // Extract token metadata - API returns it nested in tokenMetadata object
                const tokenMeta = transfer.tokenMetadata || {};
                const tokenSymbol = tokenMeta.tokenSymbol || transfer.tokenSymbol || "TOKEN";
                const tokenName = tokenMeta.tokenName || transfer.tokenName || "Unknown Token";
                const decimals = parseInt(tokenMeta.decimals || transfer.tokenDecimal || "18", 10);
                const contractAddress = tokenMeta.tokenAddress || transfer.contractAddress || "";

                const rawValue = BigInt(transfer.value || "0");
                const tokenAmount = Number(rawValue) / Math.pow(10, decimals);
                const sign = isReceiving ? "+" : "-";

                const transferData = {
                    direction: isReceiving ? "Received" : "Sent",
                    amount: tokenAmount.toFixed(6),
                    symbol: tokenSymbol,
                    formatted: `${sign}${tokenAmount.toFixed(4)} ${tokenSymbol}`,
                    tokenName: tokenName,
                    contractAddress: contractAddress,
                };

                if (!tokenTransfersByHash.has(hash)) {
                    tokenTransfersByHash.set(hash, []);
                }
                tokenTransfersByHash.get(hash)!.push(transferData);
            }

            // Add internal transactions (native zkCRO from contract calls/swaps)
            for (const intTx of allInternalTxs) {
                const hash = (intTx.transactionHash || intTx.hash || "").toLowerCase();
                if (!hash) continue;

                const intToAddr = typeof intTx.to === 'object' ? intTx.to?.address : intTx.to;
                const isReceiving = (intToAddr || "").toLowerCase() === address.toLowerCase();
                const valueZkCRO = parseFloat(intTx.value || "0") / 1e18;

                if (valueZkCRO > 0.000001) {
                    const sign = isReceiving ? "+" : "-";
                    const transferData = {
                        direction: isReceiving ? "Received" : "Sent",
                        amount: valueZkCRO.toFixed(6),
                        symbol: "zkCRO",
                        formatted: `${sign}${valueZkCRO.toFixed(4)} zkCRO`,
                        tokenName: "Cronos zkEVM",
                        contractAddress: "",
                    };

                    if (!tokenTransfersByHash.has(hash)) {
                        tokenTransfersByHash.set(hash, []);
                    }
                    tokenTransfersByHash.get(hash)!.push(transferData);
                }
            }

            // Build final transaction list with merged token data
            const transactions = allTxs.map((tx: any) => {
                const hash = (tx.transactionHash || tx.hash || "").toLowerCase();
                const isFrom = (tx.from?.address || tx.from || "").toLowerCase() === address.toLowerCase();
                const isTo = (tx.to?.address || tx.to || "").toLowerCase() === address.toLowerCase();

                let direction = "SELF";
                if (isFrom && !isTo) direction = "OUT";
                else if (isTo && !isFrom) direction = "IN";

                // Native value
                const valueWei = BigInt(tx.value || "0");
                const valueZkCRO = Number(valueWei) / 1e18;

                // Get merged token transfers
                const tokenTransfers = tokenTransfersByHash.get(hash);
                const hasTokenTransfers = tokenTransfers && tokenTransfers.length > 0;

                // Determine transaction type
                let txType = "Transaction";
                if (hasTokenTransfers && tokenTransfers!.length > 1) {
                    txType = "Trade";
                } else if (hasTokenTransfers) {
                    txType = "Transfer";
                } else if (valueZkCRO > 0) {
                    txType = direction === "IN" ? "Receive" : "Send";
                }

                // Build display value
                let valueFormatted: string;
                let tokenTransferData: any = undefined;

                if (hasTokenTransfers) {
                    if (tokenTransfers!.length === 1) {
                        valueFormatted = tokenTransfers![0].formatted;
                        tokenTransferData = tokenTransfers![0];
                    } else if (tokenTransfers!.length === 2) {
                        const outTransfer = tokenTransfers!.find(t => t.direction === "Sent");
                        const inTransfer = tokenTransfers!.find(t => t.direction === "Received");
                        if (outTransfer && inTransfer) {
                            valueFormatted = `${parseFloat(outTransfer.amount).toFixed(4)} ${outTransfer.symbol} → ${parseFloat(inTransfer.amount).toFixed(4)} ${inTransfer.symbol}`;
                        } else {
                            valueFormatted = tokenTransfers!.map(t => t.formatted).join(", ");
                        }
                        tokenTransferData = tokenTransfers;
                    } else {
                        valueFormatted = tokenTransfers!.map(t => t.formatted).join(", ");
                        tokenTransferData = tokenTransfers;
                    }
                } else {
                    const sign = direction === "IN" ? "+" : direction === "OUT" ? "-" : "";
                    valueFormatted = `${sign}${valueZkCRO.toFixed(6)} zkCRO`;
                }

                return {
                    hash: tx.transactionHash || tx.hash,
                    from: tx.from?.address || tx.from,
                    to: tx.to?.address || tx.to,
                    value: valueFormatted,
                    direction,
                    txType,
                    timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null,
                    blockNumber: tx.blockNumber,
                    status: tx.status === 1 || tx.isError === "0" ? "Success" : "Failed",
                    tokenTransfer: tokenTransferData,
                    explorerUrl: `https://explorer.zkevm.cronos.org/tx/${tx.transactionHash || tx.hash}`,
                };
            });

            // Sort by block number descending (newest first) and deduplicate
            const seen = new Set<string>();
            const uniqueTxs = transactions.filter(tx => {
                if (seen.has(tx.hash)) return false;
                seen.add(tx.hash);
                return true;
            });
            uniqueTxs.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                blockRange: { from: targetStartBlock, to: currentBlock },
                transactionCount: uniqueTxs.length,
                transactions: uniqueTxs.slice(0, 50),
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}`,
            };
        } catch (error: any) {
            console.error("[zkEVM] Transaction history error:", error);
            return { error: "Failed to fetch zkEVM transaction history", details: error.message, address };
        }
    },
});

/**
 * Get transaction status by hash on Cronos zkEVM
 * Endpoint: transaction/getStatus
 */
export const getZkEVMTransaction = tool({
    description: "Get the status of a specific transaction on Cronos zkEVM (Chain ID 388) by transaction hash.",
    parameters: z.object({
        txHash: z.string().describe("Transaction hash (0x... - 66 characters)"),
    }),
    execute: async ({ txHash }) => {
        try {
            if (!txHash.startsWith("0x") || txHash.length !== 66) {
                return { error: "Invalid transaction hash format", details: "Hash must be 0x followed by 64 hex characters" };
            }

            const data = await zkevmApiRequest("transaction", "getStatus", { txHash });

            return {
                txHash,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                status: data.result?.isError === "0" ? "Success" : data.result?.isError === "1" ? "Failed" : data.result?.status || "Unknown",
                errDescription: data.result?.errDescription,
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/tx/${txHash}`,
            };
        } catch (error: any) {
            console.error("[zkEVM] Transaction lookup error:", error);
            return { error: "Failed to fetch zkEVM transaction status", details: error.message, txHash };
        }
    },
});

/**
 * Get ERC-20 token balance on Cronos zkEVM
 * Endpoint: token/getAccountBalanceByContract
 */
export const getZkEVMTokenBalance = tool({
    description: "Get an ERC-20 token balance for a wallet on Cronos zkEVM (Chain ID 388). Requires token contract address.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        contractAddress: z.string().describe("ERC-20 token contract address (0x...)"),
    }),
    execute: async ({ address, contractAddress }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) return { error: "Invalid wallet address format" };
            if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) return { error: "Invalid contract address format" };

            const data = await zkevmApiRequest("token", "getAccountBalanceByContract", { address, contractAddress });
            const balance = data.result || "0";

            return {
                address,
                contractAddress,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                balance,
                note: "Balance is in raw token units. Divide by 10^decimals for human-readable value.",
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}`,
            };
        } catch (error: any) {
            console.error("[zkEVM] Token balance error:", error);
            return { error: "Failed to fetch zkEVM token balance", details: error.message, address, contractAddress };
        }
    },
});

/**
 * Get zkCRO price
 * Endpoint: price/getZkcroPrice
 */
export const getZkEVMGasPrice = tool({
    description: "Get the current zkCRO price on Cronos zkEVM (Chain ID 388).",
    parameters: z.object({}),
    execute: async () => {
        try {
            const data = await zkevmApiRequest("price", "getZkcroPrice", {});

            return {
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                zkcroPriceUSD: data.result?.ethusd || data.result?.price || "N/A",
                zkcroPriceBTC: data.result?.ethbtc || "N/A",
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("[zkEVM] Price error:", error);
            return { error: "Failed to fetch zkCRO price", details: error.message };
        }
    },
});

/**
 * Get ERC-20 token transfers for a wallet on Cronos zkEVM
 * Endpoint: account/getERC20TransferByAddress
 * Note: API limits block range to max 10,000 blocks per request, so we paginate
 */
export const getZkEVMTokenTransfers = tool({
    description: "Get ERC-20 token transfer history for a wallet on Cronos zkEVM (Chain ID 388).",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        blockRange: z.number().optional().default(100000).describe("Number of recent blocks to search (default: 100000, fetched in 10k chunks)"),
    }),
    execute: async ({ address, blockRange = 100000 }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) return { error: "Invalid wallet address format" };

            // Get current block number first
            const blockData = await zkevmApiRequest("ethproxy", "getBlockNumber", {});
            const currentBlock = parseInt(blockData.result, 16);
            const targetStartBlock = Math.max(0, currentBlock - blockRange);

            // API limits to 10,000 blocks per request, so paginate in chunks
            const CHUNK_SIZE = 10000;
            const MAX_CHUNKS = 10;
            const allTransfers: any[] = [];

            let endBlock = currentBlock;
            let chunksProcessed = 0;

            while (endBlock > targetStartBlock && chunksProcessed < MAX_CHUNKS) {
                const startBlock = Math.max(targetStartBlock, endBlock - CHUNK_SIZE);

                try {
                    const data = await zkevmApiRequest("account", "getERC20TransferByAddress", {
                        address,
                        startBlock: startBlock.toString(),
                        endBlock: endBlock.toString(),
                    });

                    const txList = data.result || data.items || [];
                    for (const tx of txList) {
                        // Extract token metadata from nested object
                        const tokenMeta = tx.tokenMetadata || {};
                        allTransfers.push({
                            hash: tx.transactionHash || tx.hash,
                            from: typeof tx.from === 'object' ? tx.from.address : tx.from,
                            to: typeof tx.to === 'object' ? tx.to.address : tx.to,
                            tokenName: tokenMeta.tokenName || tx.tokenName || "Unknown Token",
                            tokenSymbol: tokenMeta.tokenSymbol || tx.tokenSymbol || "TOKEN",
                            tokenDecimal: tokenMeta.decimals || tx.tokenDecimal || "18",
                            value: tx.value,
                            contractAddress: tokenMeta.tokenAddress || tx.contractAddress || "",
                            timestamp: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : null,
                        });
                    }
                } catch (chunkError: any) {
                    console.error(`[zkEVM] Token transfer chunk ${startBlock}-${endBlock} failed:`, chunkError.message);
                }

                endBlock = startBlock;
                chunksProcessed++;
            }

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                blockRange: { from: targetStartBlock, to: currentBlock },
                transferCount: allTransfers.length,
                transfers: allTransfers.slice(0, 50),
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("[zkEVM] Token transfers error:", error);
            return { error: "Failed to fetch zkEVM token transfers", details: error.message, address };
        }
    },
});

/**
 * Get internal transactions for a wallet on Cronos zkEVM
 * Endpoint: account/getInternalTxsByAddress
 * Note: API limits block range to max 10,000 blocks per request, so we paginate
 */
export const getZkEVMInternalTxList = tool({
    description: "Get internal transactions for a wallet on Cronos zkEVM (Chain ID 388).",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        blockRange: z.number().optional().default(100000).describe("Number of recent blocks to search (default: 100000, fetched in 10k chunks)"),
    }),
    execute: async ({ address, blockRange = 100000 }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) return { error: "Invalid wallet address format" };

            // Get current block number first
            const blockData = await zkevmApiRequest("ethproxy", "getBlockNumber", {});
            const currentBlock = parseInt(blockData.result, 16);
            const targetStartBlock = Math.max(0, currentBlock - blockRange);

            // API limits to 10,000 blocks per request, so paginate in chunks
            const CHUNK_SIZE = 10000;
            const MAX_CHUNKS = 10;
            const allTransactions: any[] = [];

            let endBlock = currentBlock;
            let chunksProcessed = 0;

            while (endBlock > targetStartBlock && chunksProcessed < MAX_CHUNKS) {
                const startBlock = Math.max(targetStartBlock, endBlock - CHUNK_SIZE);

                try {
                    const data = await zkevmApiRequest("account", "getInternalTxsByAddress", {
                        address,
                        startBlock: startBlock.toString(),
                        endBlock: endBlock.toString(),
                    });

                    const txList = data.result || data.items || [];
                    for (const tx of txList) {
                        allTransactions.push({
                            hash: tx.transactionHash || tx.hash,
                            from: typeof tx.from === 'object' ? tx.from.address : tx.from,
                            to: typeof tx.to === 'object' ? tx.to.address : tx.to,
                            value: tx.value ? `${(Number(BigInt(tx.value)) / 1e18).toFixed(6)} zkCRO` : "0 zkCRO",
                            type: tx.type,
                            isError: tx.isError,
                        });
                    }
                } catch (chunkError: any) {
                    console.error(`[zkEVM] Internal tx chunk ${startBlock}-${endBlock} failed:`, chunkError.message);
                }

                endBlock = startBlock;
                chunksProcessed++;
            }

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                blockRange: { from: targetStartBlock, to: currentBlock },
                transactionCount: allTransactions.length,
                transactions: allTransactions.slice(0, 50),
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("[zkEVM] Internal tx error:", error);
            return { error: "Failed to fetch zkEVM internal transactions", details: error.message, address };
        }
    },
});

/**
 * Get contract ABI on Cronos zkEVM
 * Endpoint: contract/getAbi
 */
export const getZkEVMContractABI = tool({
    description: "Get the ABI for a verified contract on Cronos zkEVM (Chain ID 388).",
    parameters: z.object({
        address: z.string().describe("Contract address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) return { error: "Invalid contract address format" };

            const data = await zkevmApiRequest("contract", "getAbi", { address });

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                abi: data.result,
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}`,
            };
        } catch (error: any) {
            console.error("[zkEVM] Contract ABI error:", error);
            return { error: "Failed to fetch contract ABI", details: error.message, address };
        }
    },
});

/**
 * Get contract source code on Cronos zkEVM
 * Endpoint: contract/getSourceCode
 */
export const getZkEVMContractSource = tool({
    description: "Get the source code for a verified contract on Cronos zkEVM (Chain ID 388).",
    parameters: z.object({
        address: z.string().describe("Contract address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) return { error: "Invalid contract address format" };

            const data = await zkevmApiRequest("contract", "getSourceCode", { address });
            const source = Array.isArray(data.result) ? data.result[0] : data.result;

            if (!source) return { error: "Contract not verified or source not found", address };

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                contractName: source.ContractName || source.contractName,
                compiler: source.CompilerVersion || source.compilerVersion,
                optimization: source.OptimizationUsed === "1" || source.optimization,
                sourceCode: source.SourceCode?.substring(0, 1000) + "...",
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}`,
            };
        } catch (error: any) {
            console.error("[zkEVM] Contract source error:", error);
            return { error: "Failed to fetch contract source", details: error.message, address };
        }
    },
});

/**
 * Get token total supply on Cronos zkEVM
 * Endpoint: token/getTotalSupplyByContract
 */
export const getZkEVMTokenSupply = tool({
    description: "Get the total supply of an ERC-20 token on Cronos zkEVM (Chain ID 388).",
    parameters: z.object({
        address: z.string().describe("Token contract address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) return { error: "Invalid contract address format" };

            const data = await zkevmApiRequest("token", "getTotalSupplyByContract", { address });

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                totalSupply: data.result,
                note: "Supply is in raw token units. Divide by 10^decimals for human-readable value.",
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("[zkEVM] Token supply error:", error);
            return { error: "Failed to fetch token supply", details: error.message, address };
        }
    },
});

/**
 * Get block info on Cronos zkEVM
 * Endpoint: block/getBlock
 */
export const getZkEVMBlockInfo = tool({
    description: "Get block information on Cronos zkEVM (Chain ID 388) by block height.",
    parameters: z.object({
        blockHeight: z.string().describe("Block height/number"),
    }),
    execute: async ({ blockHeight }) => {
        try {
            const data = await zkevmApiRequest("block", "getBlock", { blockHeight });

            return {
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                block: data.result,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("[zkEVM] Block info error:", error);
            return { error: "Failed to fetch block info", details: error.message, blockHeight };
        }
    },
});

/**
 * Get list of ERC-20 tokens held by an address on Cronos zkEVM
 * Uses the explorer's internal table endpoint for complete token list
 */
export const getZkEVMTokenList = tool({
    description: "Get list of all ERC-20 tokens held by a wallet address on Cronos zkEVM (Chain ID 388) with their balances.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) {
                return { error: "Invalid address format", details: "Address must be 0x followed by 40 hex characters" };
            }

            // Fetch token balances from explorer's table endpoint (most reliable method)
            console.log(`[zkEVM TokenList] Fetching tokens for ${address}`);

            const rawTokens = await fetchZkEVMTokenBalances(address);

            const tokens = rawTokens.map((token: any) => {
                const decimals = parseInt(token.decimals || "18");
                const rawBalance = token.balance || "0";
                const balance = parseFloat(rawBalance) / Math.pow(10, decimals);
                return {
                    contractAddress: token.tokenAddress,
                    name: token.tokenName || "Unknown",
                    symbol: token.tokenSymbol || "???",
                    decimals,
                    balance,
                    balanceFormatted: balance.toFixed(6),
                    rawBalance,
                };
            }).filter((t: any) => t.balance > 0.000001); // Filter dust

            tokens.sort((a: any, b: any) => b.balance - a.balance);

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                tokenCount: tokens.length,
                tokens,
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}?tab=tokens`,
            };
        } catch (error: any) {
            console.error("[zkEVM TokenList] Error:", error);
            return {
                error: "Failed to fetch zkEVM token list",
                details: error.message,
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}?tab=tokens`,
                hint: "You can view the full token list on the zkEVM Explorer using the link above.",
            };
        }
    },
});



/**
 * Get complete portfolio for a Cronos zkEVM address (native zkCRO + all tokens)
 */
export const getZkEVMPortfolio = tool({
    description: "Get complete portfolio for a Cronos zkEVM wallet address including native zkCRO balance and all ERC-20 token holdings. This is the best tool for viewing a wallet's full holdings on Cronos zkEVM (Chain ID 388).",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) {
                return { error: "Invalid address format", details: "Address must be 0x followed by 40 hex characters" };
            }

            // 1. Get native zkCRO balance
            let balanceWei: bigint;
            try {
                const balanceData = await zkevmApiRequest("account", "getBalance", { address });
                const balanceStr = typeof balanceData.result === 'object' ? balanceData.result.balance : balanceData.result;
                balanceWei = BigInt(balanceStr || "0");
            } catch (apiError) {
                // Fallback to RPC
                const rpcResponse = await fetch(ZKEVM_RPC, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 1 }),
                });
                const rpcData = await rpcResponse.json();
                balanceWei = BigInt(rpcData.result || "0");
            }

            const balanceZkCRO = Number(balanceWei) / 1e18;

            // 2. Get ERC-20 tokens from explorer's table endpoint
            let tokens: any[] = [];
            let tokenFetchError: string | null = null;

            try {
                console.log(`[zkEVM Portfolio] Fetching tokens for ${address}`);
                const rawTokens = await fetchZkEVMTokenBalances(address);

                tokens = rawTokens.map((token: any) => {
                    const decimals = parseInt(token.decimals || "18");
                    const rawBalance = token.balance || "0";
                    const balance = parseFloat(rawBalance) / Math.pow(10, decimals);
                    return {
                        contractAddress: token.tokenAddress,
                        name: token.tokenName || "Unknown",
                        symbol: token.tokenSymbol || "???",
                        decimals,
                        balance,
                        balanceFormatted: balance.toFixed(6),
                    };
                }).filter((t: any) => t.balance > 0.000001);

                tokens.sort((a: any, b: any) => b.balance - a.balance);
                console.log(`[zkEVM Portfolio] Got ${tokens.length} tokens`);
            } catch (e: any) {
                console.error("[zkEVM Portfolio] Error fetching tokens:", e);
                tokenFetchError = e.message;
            }

            return {
                address,
                network: "Cronos zkEVM Mainnet",
                chainId: 388,
                nativeBalance: {
                    symbol: "zkCRO",
                    wei: balanceWei.toString(),
                    balance: balanceZkCRO,
                    formatted: `${balanceZkCRO.toFixed(4)} zkCRO`,
                },
                tokenCount: tokens.length,
                tokens,
                ...(tokenFetchError && { tokenFetchWarning: `Token fetch had issues: ${tokenFetchError}. Showing partial results.` }),
                timestamp: new Date().toISOString(),
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}?tab=tokens`,
            };
        } catch (error: any) {
            console.error("[zkEVM Portfolio] Error:", error);
            return {
                error: "Failed to fetch zkEVM portfolio",
                details: error.message,
                explorerUrl: `https://explorer.zkevm.cronos.org/address/${address}?tab=tokens`,
                hint: "You can view the full portfolio on zkEVM Explorer using the link above.",
            };
        }
    },
});



// Export all zkEVM tools
export const cronosZkEVMTools = {
    getZkEVMBalance,
    getZkEVMTransactionHistory,
    getZkEVMTransaction,
    getZkEVMTokenBalance,
    getZkEVMGasPrice,
    getZkEVMTokenTransfers,
    getZkEVMInternalTxList,
    getZkEVMContractABI,
    getZkEVMContractSource,
    getZkEVMTokenSupply,
    getZkEVMBlockInfo,
    getZkEVMTokenList,
    getZkEVMPortfolio,
};
