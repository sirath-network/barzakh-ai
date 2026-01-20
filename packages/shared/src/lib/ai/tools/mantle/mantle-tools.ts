/**
 * Mantle Network Blockchain Tools
 * 
 * AI-callable tools for interacting with Mantle Network (L2 on Ethereum).
 * Supports wallet analysis, transaction details, token info, and block data.
 * 
 * Network Details:
 * - Mainnet: Chain ID 5000, RPC: https://rpc.mantle.xyz
 * - Testnet (Sepolia): Chain ID 5003, RPC: https://rpc.sepolia.mantle.xyz
 * - Native Token: MNT
 */

import { tool } from "ai";
import { z } from "zod";
import { getZerionApiKey } from "../../../utils/utils";
import { zerionBaseURL } from "../onchain/constant";

// Mantle RPC endpoints
const MANTLE_MAINNET_RPC = "https://rpc.mantle.xyz";
const MANTLE_TESTNET_RPC = "https://rpc.sepolia.mantle.xyz";

// Etherscan V2 API (unified endpoint for all supported chains)
const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";
const MANTLE_CHAIN_ID = 5000;
const MANTLE_TESTNET_CHAIN_ID = 5003;

// Explorer URLs
const MANTLE_EXPLORER = "https://mantlescan.xyz";
const MANTLE_TESTNET_EXPLORER = "https://sepolia.mantlescan.xyz";

/**
 * Helper to get current block number from Mantle RPC
 */
async function getCurrentMantleBlock(testnet = false): Promise<number> {
    const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;
    const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    });
    const data = await response.json();
    return parseInt(data.result, 16);
}

/**
 * Helper to make Etherscan V2 API calls
 */
async function etherscanV2Request(params: Record<string, string>, testnet = false): Promise<any> {
    const apiKey = process.env.ETHERSCAN_API_KEY || "";
    const chainId = testnet ? MANTLE_TESTNET_CHAIN_ID : MANTLE_CHAIN_ID;

    const queryParams = new URLSearchParams({
        chainid: chainId.toString(),
        ...params,
        ...(apiKey && { apikey: apiKey }),
    });

    const url = `${ETHERSCAN_V2_API}?${queryParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Etherscan API request failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Helper to fetch token holdings by analyzing token transfers
 * Since MantleScan's tokenlist API requires authentication and custom API returns 500,
 * we extract unique tokens from token transfers and fetch current balances via RPC
 */
async function fetchTokenHoldingsFromTransfers(address: string, testnet = false): Promise<any[]> {
    const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;

    try {
        // Get recent token transfers to discover token contracts the address has interacted with
        const transferData = await etherscanV2Request({
            module: "account",
            action: "tokentx",
            address,
            page: "1",
            offset: "100", // Get last 100 token transfers
            sort: "desc",
        }, testnet);

        if (transferData.status !== "1" || !transferData.result || !Array.isArray(transferData.result)) {
            return [];
        }

        // Extract unique token contracts
        const tokenMap = new Map<string, { name: string; symbol: string; decimals: number }>();
        for (const tx of transferData.result) {
            if (!tokenMap.has(tx.contractAddress.toLowerCase())) {
                tokenMap.set(tx.contractAddress.toLowerCase(), {
                    name: tx.tokenName || "Unknown",
                    symbol: tx.tokenSymbol || "???",
                    decimals: parseInt(tx.tokenDecimal) || 18,
                });
            }
        }

        // Fetch current balance for each token via RPC
        const tokens: any[] = [];

        for (const [contractAddress, tokenInfo] of tokenMap) {
            try {
                // ERC-20 balanceOf function signature
                const balanceOfSelector = "0x70a08231";
                const paddedAddress = address.slice(2).padStart(64, "0");
                const callData = balanceOfSelector + paddedAddress;

                const response = await fetch(rpcUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "eth_call",
                        params: [{ to: contractAddress, data: callData }, "latest"],
                        id: 1,
                    }),
                });

                const data = await response.json();

                if (data.result && data.result !== "0x" && data.result !== "0x0") {
                    const balanceRaw = BigInt(data.result);
                    if (balanceRaw > 0n) {
                        const balance = Number(balanceRaw) / Math.pow(10, tokenInfo.decimals);
                        if (balance > 0.000001) {
                            tokens.push({
                                contractAddress,
                                name: tokenInfo.name,
                                symbol: tokenInfo.symbol,
                                decimals: tokenInfo.decimals,
                                balance,
                                balanceFormatted: balance.toFixed(6),
                                isNative: false,
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip tokens that fail balance check
                console.error(`[Mantle] Failed to fetch balance for ${contractAddress}:`, e);
            }
        }

        // Sort by balance descending
        tokens.sort((a, b) => b.balance - a.balance);

        return tokens;
    } catch (error) {
        console.error("[Mantle] Error fetching token holdings from transfers:", error);
        return [];
    }
}

/**
 * Get Mantle wallet balance
 */
export const getMantleBalance = tool({
    description: "Get MNT balance for a wallet address on Mantle Network (Chain ID 5000). Mantle is an Ethereum L2 with low fees. Supports both mainnet and Sepolia testnet.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ address, testnet = false }) => {
        try {
            const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;

            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBalance",
                    params: [address, "latest"],
                    id: 1,
                }),
            });

            if (!response.ok) {
                throw new Error(`RPC request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            // Convert from wei to MNT (18 decimals)
            const balanceWei = BigInt(data.result);
            const balanceMNT = Number(balanceWei) / 1e18;

            const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;

            return {
                address,
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                chainId: testnet ? MANTLE_TESTNET_CHAIN_ID : MANTLE_CHAIN_ID,
                balance: {
                    wei: balanceWei.toString(),
                    mnt: balanceMNT.toFixed(6),
                    formatted: `${balanceMNT.toFixed(4)} MNT`,
                },
                explorerUrl: `${explorer}/address/${address}`,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching Mantle balance:", error);
            return {
                error: "Failed to fetch Mantle wallet balance",
                details: error.message,
            };
        }
    },
});

/**
 * Get Mantle block information
 */
export const getMantleBlockInfo = tool({
    description: "Get information about a specific block or the latest block on Mantle Network.",
    parameters: z.object({
        blockNumber: z.string().optional().describe("Block number in hex (e.g., '0x1234') or 'latest'"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ blockNumber = "latest", testnet = false }) => {
        try {
            const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;

            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBlockByNumber",
                    params: [blockNumber, false],
                    id: 1,
                }),
            });

            if (!response.ok) {
                throw new Error(`RPC request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const block = data.result;
            const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;
            const blockNum = parseInt(block.number, 16);

            return {
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                blockNumber: blockNum,
                blockHash: block.hash,
                parentHash: block.parentHash,
                timestamp: new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
                gasUsed: parseInt(block.gasUsed, 16),
                gasLimit: parseInt(block.gasLimit, 16),
                transactionCount: block.transactions?.length || 0,
                miner: block.miner,
                baseFeePerGas: block.baseFeePerGas ? parseInt(block.baseFeePerGas, 16) : null,
                explorerUrl: `${explorer}/block/${blockNum}`,
            };
        } catch (error: any) {
            console.error("Error fetching Mantle block:", error);
            return {
                error: "Failed to fetch Mantle block information",
                details: error.message,
            };
        }
    },
});

/**
 * Get Mantle transaction details
 */
export const getMantleTransaction = tool({
    description: "Get details of a specific transaction on Mantle Network by transaction hash.",
    parameters: z.object({
        txHash: z.string().describe("Transaction hash (0x... - must be 66 characters including 0x prefix)"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ txHash, testnet = false }) => {
        try {
            const cleanHash = txHash.trim();
            if (!cleanHash.startsWith("0x") || cleanHash.length !== 66) {
                return {
                    error: "Invalid transaction hash format",
                    details: "Transaction hash must be 66 characters starting with 0x",
                };
            }

            const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;

            // Get transaction details
            const txResponse = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getTransactionByHash",
                    params: [cleanHash],
                    id: 1,
                }),
            });

            const txData = await txResponse.json();

            if (txData.error || !txData.result) {
                throw new Error(txData.error?.message || "Transaction not found");
            }

            const tx = txData.result;

            // Get transaction receipt for status
            const receiptResponse = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getTransactionReceipt",
                    params: [cleanHash],
                    id: 2,
                }),
            });

            const receiptData = await receiptResponse.json();
            const receipt = receiptData.result;

            const valueWei = BigInt(tx.value);
            const valueMNT = Number(valueWei) / 1e18;
            const gasPrice = parseInt(tx.gasPrice, 16);
            const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : null;
            const txFee = gasUsed ? (gasPrice * gasUsed) / 1e18 : null;

            const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;

            return {
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                hash: txHash,
                status: receipt ? (receipt.status === "0x1" ? "Success" : "Failed") : "Pending",
                blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
                from: tx.from,
                to: tx.to,
                value: {
                    wei: valueWei.toString(),
                    mnt: valueMNT.toFixed(6),
                    formatted: `${valueMNT.toFixed(4)} MNT`,
                },
                gasPrice: `${(gasPrice / 1e9).toFixed(2)} Gwei`,
                gasUsed: gasUsed,
                transactionFee: txFee ? `${txFee.toFixed(6)} MNT` : null,
                nonce: parseInt(tx.nonce, 16),
                inputData: tx.input.length > 10 ? `${tx.input.slice(0, 10)}...` : tx.input,
                isContractInteraction: tx.input !== "0x" && tx.input.length > 2,
                explorerUrl: `${explorer}/tx/${txHash}`,
            };
        } catch (error: any) {
            console.error("Error fetching Mantle transaction:", error);
            return {
                error: "Failed to fetch Mantle transaction",
                details: error.message,
            };
        }
    },
});

/**
 * Get ERC-20 token balance on Mantle
 */
export const getMantleTokenBalance = tool({
    description: "Get ERC-20 token balance for a wallet on Mantle Network. Specify the token contract address.",
    parameters: z.object({
        walletAddress: z.string().describe("Wallet address (0x...)"),
        tokenAddress: z.string().describe("ERC-20 token contract address (0x...)"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ walletAddress, tokenAddress, testnet = false }) => {
        try {
            const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;

            // ERC-20 balanceOf function signature
            const balanceOfSelector = "0x70a08231";
            const paddedAddress = walletAddress.slice(2).padStart(64, "0");
            const callData = balanceOfSelector + paddedAddress;

            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_call",
                    params: [{ to: tokenAddress, data: callData }, "latest"],
                    id: 1,
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const balanceHex = data.result;
            let balance: bigint;
            if (!balanceHex || balanceHex === "0x" || balanceHex === "0x0") {
                balance = BigInt(0);
            } else {
                balance = BigInt(balanceHex);
            }

            // Try to get token decimals
            const decimalsSelector = "0x313ce567";
            const decimalsResponse = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_call",
                    params: [{ to: tokenAddress, data: decimalsSelector }, "latest"],
                    id: 2,
                }),
            });

            const decimalsData = await decimalsResponse.json();
            const decimals = decimalsData.result ? parseInt(decimalsData.result, 16) : 18;

            const formattedBalance = Number(balance) / Math.pow(10, decimals);

            const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;

            return {
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                wallet: walletAddress,
                token: tokenAddress,
                balance: {
                    raw: balance.toString(),
                    formatted: formattedBalance.toFixed(6),
                    decimals,
                },
                explorerUrl: `${explorer}/token/${tokenAddress}?a=${walletAddress}`,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching token balance:", error);
            return {
                error: "Failed to fetch ERC-20 token balance",
                details: error.message,
            };
        }
    },
});

/**
 * Get Mantle network gas price
 */
export const getMantleGasPrice = tool({
    description: "Get current gas price on Mantle Network for transaction fee estimation. Mantle has very low L2 fees.",
    parameters: z.object({
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ testnet = false }) => {
        try {
            const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;

            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_gasPrice",
                    params: [],
                    id: 1,
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const gasPriceWei = parseInt(data.result, 16);
            const gasPriceGwei = gasPriceWei / 1e9;

            // Estimate costs for common operations
            const estimates = {
                simpleTransfer: ((gasPriceWei * 21000) / 1e18).toFixed(8) + " MNT",
                tokenTransfer: ((gasPriceWei * 65000) / 1e18).toFixed(8) + " MNT",
                swap: ((gasPriceWei * 200000) / 1e18).toFixed(8) + " MNT",
            };

            return {
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                gasPrice: {
                    wei: gasPriceWei,
                    gwei: gasPriceGwei.toFixed(4),
                    formatted: `${gasPriceGwei.toFixed(4)} Gwei`,
                },
                estimatedCosts: estimates,
                note: "Mantle is an L2 with very low gas fees compared to Ethereum mainnet",
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching gas price:", error);
            return {
                error: "Failed to fetch Mantle gas price",
                details: error.message,
            };
        }
    },
});

/**
 * Get Mantle transaction history for an address using Zerion API
 */
export const getMantleTransactionHistory = tool({
    description: "Get detailed transaction history for a wallet address on Mantle Network using Zerion API. Returns comprehensive information about each transaction including type, direction, value, token transfers, and explorer links. IMPORTANT: The UI will automatically render a transaction history table from the result. DO NOT list the transactions in your text response. Just provide a brief 1-sentence summary.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        limit: z.number().optional().describe("Number of transactions to fetch (default: 20, max: 50)"),
    }),
    execute: async ({ address, limit = 20 }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) {
                return {
                    error: "Invalid address format",
                    details: "Address must be a valid Ethereum-style address (0x + 40 hex characters)",
                };
            }

            const apiKey = getZerionApiKey();
            if (!apiKey) {
                console.error("ZERION_DEV_API_KEY not configured");
                return {
                    error: "Zerion API not configured",
                    details: "Please contact support.",
                };
            }

            // Use Zerion API with Mantle chain filter
            const url = `${zerionBaseURL}/v1/wallets/${address}/transactions/?filter[chain_ids]=mantle&currency=usd&page[size]=${Math.min(limit, 50)}`;

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
                    return "Invalid wallet address format. Please verify and try again.";
                }
                return `API Error: ${response.status}`;
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return {
                    address,
                    network: "Mantle Mainnet",
                    transactions: [],
                    transactionCount: 0,
                    message: "No transactions found for this wallet on Mantle.",
                };
            }

            // Transform Zerion response to our format
            const transactions = data.data
                .filter((tx: any) => !tx.attributes.flags?.is_trash)
                .map((tx: any) => {
                    const attrs = tx.attributes;
                    const transfers = attrs.transfers || [];

                    // Determine direction
                    const hasIncoming = transfers.some((t: any) => t.direction === "in");
                    const hasOutgoing = transfers.some((t: any) => t.direction === "out");
                    let direction = "SELF";
                    if (hasOutgoing && !hasIncoming) direction = "OUT";
                    else if (hasIncoming && !hasOutgoing) direction = "IN";

                    // Format operation type
                    const typeMap: Record<string, string> = {
                        receive: "Receive",
                        send: "Send",
                        trade: "Swap",
                        execute: "Contract",
                        approve: "Approval",
                        mint: "Mint",
                        burn: "Burn",
                        stake: "Stake",
                        unstake: "Unstake",
                        claim: "Claim",
                        deposit: "Deposit",
                        withdraw: "Withdraw",
                        bridge: "Bridge",
                    };
                    const txType = typeMap[attrs.operation_type] || attrs.operation_type;

                    // Format value display from transfers
                    let value = "0 MNT";
                    if (transfers.length > 0) {
                        const mainTransfer = transfers[0];
                        const amount = mainTransfer.quantity?.float || 0;
                        const symbol = mainTransfer.fungible_info?.symbol || "MNT";
                        value = `${amount.toFixed(6)} ${symbol}`;
                    }

                    // Format token transfers
                    const tokenTransfer = transfers.length > 0 ? transfers.map((t: any) => ({
                        direction: t.direction === "out" ? "Sent" : "Received",
                        amount: (t.quantity?.float || 0).toFixed(6),
                        symbol: t.fungible_info?.symbol || "MNT",
                        formatted: `${t.direction === "out" ? "-" : "+"}${(t.quantity?.float || 0).toFixed(4)} ${t.fungible_info?.symbol || "MNT"}`,
                    })) : null;

                    return {
                        hash: attrs.hash,
                        explorerUrl: `${MANTLE_EXPLORER}/tx/${attrs.hash}`,
                        blockNumber: attrs.mined_at_block,
                        timestamp: attrs.mined_at,
                        direction,
                        txType,
                        status: attrs.status === "confirmed" ? "✅ Success" : attrs.status === "failed" ? "❌ Failed" : attrs.status,
                        from: attrs.sent_from,
                        to: attrs.sent_to || "Contract",
                        value,
                        tokenTransfer: tokenTransfer && tokenTransfer.length === 1 ? tokenTransfer[0] : tokenTransfer,
                        txFee: attrs.fee ? `${attrs.fee.quantity?.float?.toFixed(8) || 0} MNT` : null,
                    };
                });

            return {
                address,
                network: "Mantle Mainnet",
                transactionCount: transactions.length,
                transactions,
                viewAllUrl: `${MANTLE_EXPLORER}/address/${address}`,
                explorerUrl: `${MANTLE_EXPLORER}/address/${address}`,
            };
        } catch (error: any) {
            console.error("Error fetching Mantle transaction history:", error);
            return {
                error: "Failed to fetch transaction history",
                details: error.message,
            };
        }
    },
});

/**
 * Get token transfers for an address on Mantle
 */
export const getMantleTokenTransfers = tool({
    description: "Get ERC-20 token transfer events for a wallet address on Mantle Network. Shows all token transfers in/out.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        contractAddress: z.string().optional().describe("Filter by specific token contract address"),
        page: z.number().optional().describe("Page number"),
        limit: z.number().optional().describe("Results per page (max 100)"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ address, contractAddress, page = 1, limit = 20, testnet = false }) => {
        try {
            // Get current block and calculate start block (last 10k blocks)
            const currentBlock = await getCurrentMantleBlock(testnet);
            const startBlock = Math.max(0, currentBlock - 500000);

            const params: Record<string, string> = {
                module: "account",
                action: "tokentx",
                address,
                startblock: startBlock.toString(),
                endblock: currentBlock.toString(),
                page: page.toString(),
                offset: Math.min(limit, 100).toString(),
                sort: "desc",
            };

            if (contractAddress) {
                params.contractaddress = contractAddress;
            }

            const data = await etherscanV2Request(params, testnet);

            if (data.status !== "1" || !data.result) {
                // Handle various error cases gracefully instead of throwing
                const errorMessage = data.message || data.result || "Unknown error";

                if (errorMessage === "No transactions found" || errorMessage.includes("No records")) {
                    return {
                        address,
                        network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                        tokenTransfers: [],
                        message: "No token transfers found for this address",
                    };
                }

                // Handle NOTOK, rate limiting, API key issues gracefully
                if (errorMessage === "NOTOK" || errorMessage.includes("rate limit") || errorMessage.includes("API")) {
                    console.warn(`Mantle token transfers API returned: ${errorMessage}`);
                    return {
                        address,
                        network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                        tokenTransfers: [],
                        message: `Unable to fetch token transfers: ${errorMessage}. The Etherscan API may be rate limited or require an API key.`,
                        error: errorMessage,
                    };
                }

                // For other errors, return gracefully instead of throwing
                console.error(`Mantle token transfers error: ${errorMessage}`);
                return {
                    address,
                    network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                    tokenTransfers: [],
                    message: `Failed to fetch token transfers: ${errorMessage}`,
                    error: errorMessage,
                };
            }

            const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;

            const transfers = data.result.map((tx: any) => ({
                hash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                from: tx.from,
                to: tx.to,
                tokenName: tx.tokenName,
                tokenSymbol: tx.tokenSymbol,
                tokenDecimal: parseInt(tx.tokenDecimal),
                value: (parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal))).toFixed(6),
                contractAddress: tx.contractAddress,
                explorerUrl: `${explorer}/tx/${tx.hash}`,
            }));

            return {
                address,
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                chainId: testnet ? MANTLE_TESTNET_CHAIN_ID : MANTLE_CHAIN_ID,
                transferCount: transfers.length,
                tokenTransfers: transfers,
            };
        } catch (error: any) {
            console.error("Error fetching token transfers:", error);
            return {
                error: "Failed to fetch token transfers",
                details: error.message,
            };
        }
    },
});

/**
 * Get list of tokens held by an address on Mantle
 */
export const getMantleTokenList = tool({
    description: "Get list of all ERC-20 tokens held by a wallet address on Mantle Network with their balances.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ address, testnet = false }) => {
        try {
            const allTokens = await fetchTokenHoldingsFromTransfers(address, testnet);

            // Filter out native MNT and format tokens
            const tokens = allTokens
                .filter((t: any) => !t.isNative && t.balance > 0.000001)
                .map((t: any) => ({
                    contractAddress: t.contractAddress,
                    name: t.name,
                    symbol: t.symbol,
                    balance: t.balanceFormatted,
                    price: t.price > 0 ? `$${t.price.toFixed(4)}` : "-",
                    valueUsd: t.valueUsd > 0 ? `$${t.valueUsd.toFixed(2)}` : "-",
                }));

            const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;

            return {
                address,
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                chainId: testnet ? MANTLE_TESTNET_CHAIN_ID : MANTLE_CHAIN_ID,
                tokenCount: tokens.length,
                tokens,
                timestamp: new Date().toISOString(),
                explorerUrl: `${explorer}/address/${address}?tab=tokens`,
            };
        } catch (error: any) {
            console.error("Error fetching token list:", error);
            const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;
            return {
                error: "Failed to fetch token list",
                details: error.message,
                explorerUrl: `${explorer}/address/${address}?tab=tokens`,
                hint: "You can view tokens directly on MantleScan using the link above.",
            };
        }
    },
});

/**
 * Get complete portfolio (native + tokens) for a Mantle address
 */
/**
 * Get complete Mantle portfolio using Zerion API
 * Returns data compatible with PortfolioTable UI component
 */
export const getMantlePortfolio = tool({
    description: "Get complete portfolio for a wallet on Mantle Network including tokens, DeFi positions, and NFTs. Returns rich data that renders beautifully in the UI. IMPORTANT: The UI will automatically render a portfolio table with charts and expandable sections. Just provide a brief 1-sentence summary in your response.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            if (!address.startsWith("0x") || address.length !== 42) {
                return {
                    error: "Invalid address format",
                    details: "Address must be a valid Ethereum-style address (0x + 40 hex characters)",
                };
            }

            const apiKey = getZerionApiKey();
            if (!apiKey) {
                console.error("ZERION_DEV_API_KEY not configured");
                return {
                    error: "Zerion API not configured",
                    details: "Please contact support.",
                };
            }

            const options = {
                method: "GET",
                headers: {
                    accept: "application/json",
                    authorization: `Basic ${apiKey}`,
                },
            };

            console.log("Fetching Mantle portfolio for:", address);

            // Fetch portfolio overview (filtered to Mantle)
            const portfolioUrl = `${zerionBaseURL}/v1/wallets/${address}/portfolio?currency=usd`;
            const portfolioResponse = await fetch(portfolioUrl, options);

            if (!portfolioResponse.ok) {
                const errorDetails = await portfolioResponse.text();
                console.error(`Zerion portfolio API error ${portfolioResponse.status}:`, errorDetails);
                return `Failed to fetch Mantle portfolio: API returned ${portfolioResponse.status}`;
            }

            const portfolioData = await portfolioResponse.json();

            if (!portfolioData || !portfolioData.data || !portfolioData.data.attributes) {
                return {
                    error: "No portfolio data found",
                    address,
                    network: "Mantle Mainnet",
                };
            }

            // Fetch positions filtered to Mantle chain
            const positionsUrl = `${zerionBaseURL}/v1/wallets/${address}/positions/?filter[chain_ids]=mantle&sort=-value&currency=usd&page[size]=50`;
            const positionsResponse = await fetch(positionsUrl, options);

            let mantlePositions: any[] = [];
            let mantleTotalValue = 0;

            if (positionsResponse.ok) {
                const positionsData = await positionsResponse.json();
                mantlePositions = positionsData.data || [];
                mantleTotalValue = mantlePositions.reduce((sum: number, pos: any) =>
                    sum + (pos.attributes?.value || 0), 0
                );
            }

            // Fetch DeFi positions on Mantle
            let defiPositions: any[] = [];
            try {
                const defiUrl = `${zerionBaseURL}/v1/wallets/${address}/positions/?filter[positions]=only_complex&filter[chain_ids]=mantle&filter[trash]=only_non_trash&currency=usd&sort=value`;
                const defiResponse = await fetch(defiUrl, options);
                if (defiResponse.ok) {
                    const defiData = await defiResponse.json();
                    defiPositions = defiData.data || [];
                }
            } catch (error) {
                console.error("Error fetching Mantle DeFi positions:", error);
            }

            // Build positions_distribution_by_chain with mantle data
            const positionsDistribution: Record<string, number> = {};
            if (mantleTotalValue > 0) {
                positionsDistribution['mantle'] = mantleTotalValue;
            }

            // Build token icons map
            const tokenIcons: Record<string, string> = {};
            mantlePositions.forEach((pos: any) => {
                const symbol = pos.attributes?.fungible_info?.symbol;
                const icon = pos.attributes?.fungible_info?.icon?.url;
                if (symbol && icon) {
                    tokenIcons[symbol] = icon;
                }
            });

            // Build DeFi summary
            const defiSummary = {
                hasDefiPositions: defiPositions.length > 0,
                totalDefiValue: defiPositions.reduce((sum: number, pos: any) => sum + (pos.attributes?.value || 0), 0),
                positionCount: defiPositions.length,
                positions: defiPositions.slice(0, 20).map((pos: any) => ({
                    protocol: pos.attributes?.application_metadata?.name || pos.attributes?.protocol || 'Unknown',
                    type: pos.attributes?.position_type || pos.type || 'unknown',
                    chain: 'mantle',
                    value: pos.attributes?.value || 0,
                    tokens: pos.attributes?.fungible_info ? [{
                        symbol: pos.attributes.fungible_info.symbol,
                        name: pos.attributes.fungible_info.name,
                        amount: pos.attributes.quantity?.float || 0,
                    }] : []
                }))
            };

            // Return in PortfolioData format for the UI component
            return {
                id: address,
                type: "wallets",
                attributes: {
                    total: {
                        positions: mantleTotalValue
                    },
                    changes: portfolioData.data.attributes.changes || { percent_1d: 0 },
                    positions_distribution_by_chain: positionsDistribution,
                    token_icons: tokenIcons,
                },
                currency: "usd",
                defi: defiSummary,
                // Additional context for the AI
                network: "Mantle Mainnet",
                explorerUrl: `${MANTLE_EXPLORER}/address/${address}`,
            };
        } catch (error: any) {
            console.error("[Mantle Portfolio] Error:", error);
            return {
                error: "Failed to fetch Mantle portfolio",
                details: error.message,
                explorerUrl: `${MANTLE_EXPLORER}/address/${address}`,
            };
        }
    },
});

/**
 * Get verified contract ABI on Mantle
 */
export const getMantleContractABI = tool({
    description: "Get the ABI of a verified smart contract on Mantle Network.",
    parameters: z.object({
        contractAddress: z.string().describe("Contract address (0x...)"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ contractAddress, testnet = false }) => {
        try {
            const data = await etherscanV2Request({
                module: "contract",
                action: "getabi",
                address: contractAddress,
            }, testnet);

            if (data.status === "1" && data.result) {
                const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;
                return {
                    contractAddress,
                    network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                    verified: true,
                    abi: data.result,
                    explorerUrl: `${explorer}/address/${contractAddress}#code`,
                };
            }

            return {
                contractAddress,
                verified: false,
                message: data.result || "Contract not verified or ABI not available",
            };
        } catch (error: any) {
            console.error("Error fetching contract ABI:", error);
            return {
                error: "Failed to fetch contract ABI",
                details: error.message,
            };
        }
    },
});

/**
 * Get verified contract source code on Mantle
 */
export const getMantleContractSource = tool({
    description: "Get the source code of a verified smart contract on Mantle Network.",
    parameters: z.object({
        contractAddress: z.string().describe("Contract address (0x...)"),
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ contractAddress, testnet = false }) => {
        try {
            const data = await etherscanV2Request({
                module: "contract",
                action: "getsourcecode",
                address: contractAddress,
            }, testnet);

            if (data.status === "1" && data.result && data.result[0]) {
                const contract = data.result[0];
                const explorer = testnet ? MANTLE_TESTNET_EXPLORER : MANTLE_EXPLORER;

                if (contract.SourceCode) {
                    return {
                        contractAddress,
                        network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                        verified: true,
                        contractName: contract.ContractName,
                        compilerVersion: contract.CompilerVersion,
                        optimizationUsed: contract.OptimizationUsed === "1",
                        runs: parseInt(contract.Runs) || null,
                        sourceCode: contract.SourceCode.length > 5000
                            ? contract.SourceCode.slice(0, 5000) + "... [truncated]"
                            : contract.SourceCode,
                        abi: contract.ABI,
                        explorerUrl: `${explorer}/address/${contractAddress}#code`,
                    };
                }
            }

            return {
                contractAddress,
                verified: false,
                message: "Contract not verified or source code not available",
            };
        } catch (error: any) {
            console.error("Error fetching contract source:", error);
            return {
                error: "Failed to fetch contract source code",
                details: error.message,
            };
        }
    },
});

/**
 * Get Mantle L2 rollup information
 */
export const getMantleRollupInfo = tool({
    description: "Get Mantle Network L2 rollup information including sync status, L1 connection, and rollup context. Mantle-specific endpoint.",
    parameters: z.object({
        testnet: z.boolean().optional().describe("Use Sepolia testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ testnet = false }) => {
        try {
            const rpcUrl = testnet ? MANTLE_TESTNET_RPC : MANTLE_MAINNET_RPC;

            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "rollup_getInfo",
                    params: [],
                    id: 1,
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const info = data.result;

            return {
                network: testnet ? "Mantle Sepolia Testnet" : "Mantle Mainnet",
                chainId: testnet ? MANTLE_TESTNET_CHAIN_ID : MANTLE_CHAIN_ID,
                mode: info.mode,
                syncing: info.syncing,
                ethContext: info.ethContext ? {
                    l1BlockNumber: info.ethContext.blockNumber ? parseInt(info.ethContext.blockNumber, 16) : null,
                    l1Timestamp: info.ethContext.timestamp ? new Date(parseInt(info.ethContext.timestamp, 16) * 1000).toISOString() : null,
                } : null,
                rollupContext: info.rollupContext ? {
                    queueIndex: info.rollupContext.queueIndex ? parseInt(info.rollupContext.queueIndex, 16) : null,
                    index: info.rollupContext.index ? parseInt(info.rollupContext.index, 16) : null,
                    verifiedIndex: info.rollupContext.verifiedIndex ? parseInt(info.rollupContext.verifiedIndex, 16) : null,
                } : null,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching rollup info:", error);
            return {
                error: "Failed to fetch Mantle rollup info",
                details: error.message,
                note: "This endpoint uses Mantle-specific RPC method 'rollup_getInfo'",
            };
        }
    },
});


// Export all Mantle blockchain tools
export const mantleBlockchainTools = {
    getMantleBalance,
    getMantleBlockInfo,
    getMantleTransaction,
    getMantleTokenBalance,
    getMantleGasPrice,
    getMantleTransactionHistory,
    getMantleTokenTransfers,
    getMantleTokenList,
    getMantlePortfolio,
    getMantleContractABI,
    getMantleContractSource,
    getMantleRollupInfo,
};
