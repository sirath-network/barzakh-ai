/**
 * Cronos Blockchain Tools
 * 
 * AI-callable tools for interacting with Cronos EVM blockchain.
 * Supports wallet analysis, transaction details, token info, and block data.
 */

import { tool } from "ai";
import { z } from "zod";

// Cronos RPC endpoints
const CRONOS_MAINNET_RPC = "https://evm.cronos.org";
const CRONOS_TESTNET_RPC = "https://evm-t3.cronos.org";

// Cronos Explorer API (official)
const CRONOS_EXPLORER_API = "https://explorer-api.cronos.org/mainnet/api/v2";
const CRONOS_TESTNET_EXPLORER_API = "https://explorer-api.cronos.org/testnet/api/v2";

/**
 * Helper to get current block number from Cronos RPC
 */
async function getCurrentCronosBlock(testnet = false): Promise<number> {
    const rpcUrl = testnet ? CRONOS_TESTNET_RPC : CRONOS_MAINNET_RPC;
    const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    });
    const data = await response.json();
    return parseInt(data.result, 16);
}

/**
 * Get Cronos wallet balance
 */
export const getCronosBalance = tool({
    description: "Get CRO balance for a wallet address on Cronos EVM (Chain ID 25). NOT for Cronos zkEVM. Supports both mainnet and testnet.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        testnet: z.boolean().optional().describe("Use testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ address, testnet = false }) => {
        try {
            const rpcUrl = testnet ? CRONOS_TESTNET_RPC : CRONOS_MAINNET_RPC;

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

            // Convert from wei to CRO (18 decimals)
            const balanceWei = BigInt(data.result);
            const balanceCRO = Number(balanceWei) / 1e18;

            return {
                address,
                network: testnet ? "Cronos Testnet" : "Cronos Mainnet",
                chainId: testnet ? 338 : 25,
                balance: {
                    wei: balanceWei.toString(),
                    cro: balanceCRO.toFixed(6),
                    formatted: `${balanceCRO.toFixed(4)} CRO`,
                },
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching Cronos balance:", error);
            return {
                error: "Failed to fetch Cronos wallet balance",
                details: error.message,
            };
        }
    },
});

/**
 * Get Cronos block information
 */
export const getCronosBlockInfo = tool({
    description: "Get information about a specific block or the latest block on Cronos blockchain.",
    parameters: z.object({
        blockNumber: z.string().optional().describe("Block number in hex (e.g., '0x1234') or 'latest'"),
        testnet: z.boolean().optional().describe("Use testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ blockNumber = "latest", testnet = false }) => {
        try {
            const rpcUrl = testnet ? CRONOS_TESTNET_RPC : CRONOS_MAINNET_RPC;

            const response = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBlockByNumber",
                    params: [blockNumber, false], // false = don't include full transaction objects
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

            return {
                network: testnet ? "Cronos Testnet" : "Cronos Mainnet",
                blockNumber: parseInt(block.number, 16),
                blockHash: block.hash,
                parentHash: block.parentHash,
                timestamp: new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
                gasUsed: parseInt(block.gasUsed, 16),
                gasLimit: parseInt(block.gasLimit, 16),
                transactionCount: block.transactions?.length || 0,
                miner: block.miner,
                baseFeePerGas: block.baseFeePerGas ? parseInt(block.baseFeePerGas, 16) : null,
            };
        } catch (error: any) {
            console.error("Error fetching Cronos block:", error);
            return {
                error: "Failed to fetch Cronos block information",
                details: error.message,
            };
        }
    },
});

/**
 * Get Cronos transaction details
 */
export const getCronosTransaction = tool({
    description: "Get details of a specific transaction on Cronos EVM (Chain ID 25) by transaction hash. NOT for Cronos zkEVM.",
    parameters: z.object({
        txHash: z.string().describe("Transaction hash (0x... - must be 66 characters including 0x prefix)"),
        testnet: z.boolean().optional().describe("Use testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ txHash, testnet = false }) => {
        try {
            // Validate transaction hash format
            const cleanHash = txHash.trim();
            if (!cleanHash.startsWith("0x")) {
                return {
                    error: "Invalid transaction hash format",
                    details: "Transaction hash must start with '0x'",
                    hint: "Please provide a valid transaction hash like 0x123abc...",
                };
            }

            // Transaction hash should be exactly 66 characters (0x + 64 hex chars)
            if (cleanHash.length !== 66) {
                return {
                    error: "Invalid transaction hash length",
                    details: `Expected 66 characters (0x + 64 hex chars), got ${cleanHash.length}`,
                    hint: "A valid Cronos transaction hash looks like 0x1234567890abcdef... (66 total characters)",
                };
            }

            // Validate hex characters
            const hexPart = cleanHash.slice(2);
            if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
                return {
                    error: "Invalid transaction hash characters",
                    details: "Hash must contain only hexadecimal characters (0-9, a-f, A-F)",
                };
            }

            const rpcUrl = testnet ? CRONOS_TESTNET_RPC : CRONOS_MAINNET_RPC;

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
                throw new Error(txData.error?.message || "Transaction not found - the hash may be invalid or the transaction doesn't exist on Cronos");
            }

            const tx = txData.result;

            // Get transaction receipt for status
            const receiptResponse = await fetch(rpcUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getTransactionReceipt",
                    params: [txHash],
                    id: 2,
                }),
            });

            const receiptData = await receiptResponse.json();
            const receipt = receiptData.result;

            const valueWei = BigInt(tx.value);
            const valueCRO = Number(valueWei) / 1e18;
            const gasPrice = parseInt(tx.gasPrice, 16);
            const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : null;
            const txFee = gasUsed ? (gasPrice * gasUsed) / 1e18 : null;

            return {
                network: testnet ? "Cronos Testnet" : "Cronos Mainnet",
                hash: txHash,
                status: receipt ? (receipt.status === "0x1" ? "Success" : "Failed") : "Pending",
                blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
                from: tx.from,
                to: tx.to,
                value: {
                    wei: valueWei.toString(),
                    cro: valueCRO.toFixed(6),
                    formatted: `${valueCRO.toFixed(4)} CRO`,
                },
                gasPrice: `${(gasPrice / 1e9).toFixed(2)} Gwei`,
                gasUsed: gasUsed,
                transactionFee: txFee ? `${txFee.toFixed(6)} CRO` : null,
                nonce: parseInt(tx.nonce, 16),
                inputData: tx.input.length > 10 ? `${tx.input.slice(0, 10)}...` : tx.input,
                isContractInteraction: tx.input !== "0x" && tx.input.length > 2,
            };
        } catch (error: any) {
            console.error("Error fetching Cronos transaction:", error);
            return {
                error: "Failed to fetch Cronos transaction",
                details: error.message,
            };
        }
    },
});

/**
 * Get CRC-20 token balance on Cronos
 */
export const getCronosTokenBalance = tool({
    description: "Get CRC-20 token balance for a wallet on Cronos. Specify the token contract address.",
    parameters: z.object({
        walletAddress: z.string().describe("Wallet address (0x...)"),
        tokenAddress: z.string().describe("CRC-20 token contract address (0x...)"),
        testnet: z.boolean().optional().describe("Use testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ walletAddress, tokenAddress, testnet = false }) => {
        try {
            const rpcUrl = testnet ? CRONOS_TESTNET_RPC : CRONOS_MAINNET_RPC;

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
                    params: [
                        {
                            to: tokenAddress,
                            data: callData,
                        },
                        "latest",
                    ],
                    id: 1,
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const balanceHex = data.result;

            // Handle empty or invalid balance responses
            let balance: bigint;
            if (!balanceHex || balanceHex === "0x" || balanceHex === "0x0") {
                balance = BigInt(0);
            } else {
                try {
                    balance = BigInt(balanceHex);
                } catch (e) {
                    console.error("Failed to parse balance hex:", balanceHex);
                    balance = BigInt(0);
                }
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

            return {
                network: testnet ? "Cronos Testnet" : "Cronos Mainnet",
                wallet: walletAddress,
                token: tokenAddress,
                balance: {
                    raw: balance.toString(),
                    formatted: formattedBalance.toFixed(6),
                    decimals,
                },
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching token balance:", error);
            return {
                error: "Failed to fetch CRC-20 token balance",
                details: error.message,
            };
        }
    },
});

/**
 * Get Cronos network gas price
 */
export const getCronosGasPrice = tool({
    description: "Get current gas price on Cronos network for transaction fee estimation.",
    parameters: z.object({
        testnet: z.boolean().optional().describe("Use testnet instead of mainnet (default: false)"),
    }),
    execute: async ({ testnet = false }) => {
        try {
            const rpcUrl = testnet ? CRONOS_TESTNET_RPC : CRONOS_MAINNET_RPC;

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
                simpleTransfer: ((gasPriceWei * 21000) / 1e18).toFixed(6) + " CRO",
                tokenTransfer: ((gasPriceWei * 65000) / 1e18).toFixed(6) + " CRO",
                swap: ((gasPriceWei * 200000) / 1e18).toFixed(6) + " CRO",
            };

            return {
                network: testnet ? "Cronos Testnet" : "Cronos Mainnet",
                gasPrice: {
                    wei: gasPriceWei,
                    gwei: gasPriceGwei.toFixed(2),
                    formatted: `${gasPriceGwei.toFixed(2)} Gwei`,
                },
                estimatedCosts: estimates,
                note: "Cronos has very low gas fees (~10x cheaper than Ethereum)",
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching gas price:", error);
            return {
                error: "Failed to fetch Cronos gas price",
                details: error.message,
            };
        }
    },
});

/**
 * Get Cronos transaction history for an address
 * Note: Uses dynamic block range (last 10,000 blocks) for reliability
 */
export const getCronosTransactionHistory = tool({
    description: "Get transaction history for a wallet address on Cronos blockchain. Returns list of transactions from last 10,000 blocks.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        page: z.number().optional().describe("Page number (default: 1)"),
        limit: z.number().optional().describe("Number of transactions per page (default: 10, max: 100)"),
        sort: z.enum(["asc", "desc"]).optional().describe("Sort order by timestamp - 'asc' for oldest first, 'desc' for newest first (default: desc)"),
        blockRange: z.number().optional().describe("Number of recent blocks to search (default: 10000)"),
    }),
    execute: async ({ address, page = 1, limit = 10, sort = "desc", blockRange = 10000 }) => {
        try {
            // Validate address format
            if (!address.startsWith("0x") || address.length !== 42) {
                return {
                    error: "Invalid address format",
                    details: "Address must be a valid Ethereum-style address (0x + 40 hex characters)",
                };
            }

            // Get current block number and calculate range
            const currentBlock = await getCurrentCronosBlock();
            const startBlock = Math.max(0, currentBlock - Math.min(blockRange, 10000));

            console.log(`[Cronos] Fetching txs from block ${startBlock} to ${currentBlock}`);

            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${currentBlock}&page=${page}&offset=${Math.min(limit, 100)}&sort=${sort}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`Cronos Explorer API request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== "1" || !data.result) {
                // No transactions found is not an error
                if (data.message === "No transactions found") {
                    return {
                        address,
                        network: "Cronos Mainnet",
                        blockRange: { from: startBlock, to: currentBlock },
                        transactions: [],
                        totalFound: 0,
                        message: "No transactions found for this address in the last 10,000 blocks",
                    };
                }
                throw new Error(data.message || "Failed to fetch transaction history");
            }

            const transactions = data.result.map((tx: any) => ({
                hash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                from: tx.from,
                to: tx.to,
                value: {
                    wei: tx.value,
                    cro: (parseFloat(tx.value) / 1e18).toFixed(6) + " CRO",
                },
                gasUsed: tx.gasUsed,
                gasPrice: (parseInt(tx.gasPrice) / 1e9).toFixed(2) + " Gwei",
                txFee: ((parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18).toFixed(6) + " CRO",
                status: tx.isError === "0" ? "Success" : "Failed",
                functionName: tx.functionName || null,
                methodId: tx.methodId || null,
                explorerUrl: `https://explorer.cronos.org/tx/${tx.hash}`,
            }));

            // Find first transaction if sorting ascending
            const firstTransaction = sort === "asc" && transactions.length > 0
                ? transactions[0]
                : null;

            return {
                address,
                network: "Cronos Mainnet",
                chainId: 25,
                page,
                limit,
                transactionCount: transactions.length,
                transactions,
                firstTransaction: firstTransaction ? {
                    hash: firstTransaction.hash,
                    timestamp: firstTransaction.timestamp,
                    from: firstTransaction.from,
                    to: firstTransaction.to,
                    value: firstTransaction.value.cro,
                } : null,
                explorerUrl: `https://explorer.cronos.org/address/${address}`,
            };
        } catch (error: any) {
            console.error("Error fetching Cronos transaction history:", error);
            return {
                error: "Failed to fetch transaction history",
                details: error.message,
                hint: "Make sure CRONOS_EXPLORER_API_KEY is set in environment variables for best results",
            };
        }
    },
});

/**
 * Get balance for multiple addresses at once
 */
export const getCronosBalanceMulti = tool({
    description: "Get CRO balances for multiple wallet addresses on Cronos in a single call. More efficient than calling getCronosBalance multiple times.",
    parameters: z.object({
        addresses: z.array(z.string()).describe("Array of wallet addresses (0x...)"),
    }),
    execute: async ({ addresses }) => {
        try {
            const addressList = addresses.join(",");
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=account&action=balancemulti&address=${addressList}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch balances");
            }

            const balances = data.result.map((item: any) => ({
                address: item.account,
                balance: {
                    wei: item.balance,
                    cro: (parseFloat(item.balance) / 1e18).toFixed(6),
                    formatted: `${(parseFloat(item.balance) / 1e18).toFixed(4)} CRO`,
                },
            }));

            return {
                network: "Cronos Mainnet",
                chainId: 25,
                addressCount: balances.length,
                balances,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            return { error: "Failed to fetch multiple balances", details: error.message };
        }
    },
});

/**
 * Get internal transactions for an address
 * Note: Uses dynamic block range (last 10,000 blocks) for reliability
 */
export const getCronosInternalTxList = tool({
    description: "Get internal transactions (contract calls that transfer value) for a wallet address on Cronos from last 10,000 blocks.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        page: z.number().optional().describe("Page number"),
        limit: z.number().optional().describe("Results per page (max 100)"),
        blockRange: z.number().optional().describe("Number of recent blocks to search (default: 10000)"),
    }),
    execute: async ({ address, page = 1, limit = 20, blockRange = 10000 }) => {
        try {
            // Get current block number and calculate range
            const currentBlock = await getCurrentCronosBlock();
            const startBlock = Math.max(0, currentBlock - Math.min(blockRange, 10000));

            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=account&action=txlistinternal&address=${address}&startblock=${startBlock}&endblock=${currentBlock}&page=${page}&offset=${Math.min(limit, 100)}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1" || !data.result) {
                if (data.message === "No transactions found") {
                    return { address, network: "Cronos Mainnet", blockRange: { from: startBlock, to: currentBlock }, internalTransactions: [], message: "No internal transactions found in last 10,000 blocks" };
                }
                throw new Error(data.message || "Failed to fetch internal transactions");
            }

            const transactions = data.result.map((tx: any) => ({
                hash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                from: tx.from,
                to: tx.to,
                value: `${(parseFloat(tx.value) / 1e18).toFixed(6)} CRO`,
                gas: tx.gas,
                gasUsed: tx.gasUsed,
                type: tx.type,
                isError: tx.isError === "1",
                errCode: tx.errCode || null,
            }));

            return {
                address,
                network: "Cronos Mainnet",
                chainId: 25,
                internalTransactionCount: transactions.length,
                internalTransactions: transactions,
            };
        } catch (error: any) {
            return { error: "Failed to fetch internal transactions", details: error.message };
        }
    },
});

/**
 * Get token transfers (CRC-20) for an address
 */
export const getCronosTokenTransfers = tool({
    description: "Get CRC-20 token transfer events for a wallet address on Cronos. Shows all token transfers in/out.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        contractAddress: z.string().optional().describe("Filter by specific token contract address"),
        page: z.number().optional().describe("Page number"),
        limit: z.number().optional().describe("Results per page (max 100)"),
    }),
    execute: async ({ address, contractAddress, page = 1, limit = 20 }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            let apiUrl = `${CRONOS_EXPLORER_API}?module=account&action=tokentx&address=${address}&page=${page}&offset=${Math.min(limit, 100)}`;
            if (contractAddress) apiUrl += `&contractaddress=${contractAddress}`;
            if (apiKey) apiUrl += `&apikey=${apiKey}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1" || !data.result) {
                if (data.message === "No transactions found") {
                    return { address, network: "Cronos Mainnet", tokenTransfers: [], message: "No token transfers found" };
                }
                throw new Error(data.message || "Failed to fetch token transfers");
            }

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
                gas: tx.gas,
                gasPrice: `${(parseInt(tx.gasPrice) / 1e9).toFixed(2)} Gwei`,
            }));

            return {
                address,
                network: "Cronos Mainnet",
                chainId: 25,
                transferCount: transfers.length,
                tokenTransfers: transfers,
            };
        } catch (error: any) {
            return { error: "Failed to fetch token transfers", details: error.message };
        }
    },
});

/**
 * Get list of tokens held by an address
 */
export const getCronosTokenList = tool({
    description: "Get list of all CRC-20 tokens held by a wallet address on Cronos with their balances.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=account&action=tokenlist&address=${address}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1" || !data.result) {
                if (data.message === "No tokens found") {
                    return { address, network: "Cronos Mainnet", tokens: [], message: "No tokens found" };
                }
                throw new Error(data.message || "Failed to fetch token list");
            }

            const tokens = data.result.map((token: any) => ({
                contractAddress: token.contractAddress,
                name: token.name,
                symbol: token.symbol,
                decimals: parseInt(token.decimals),
                balance: (parseFloat(token.balance) / Math.pow(10, parseInt(token.decimals))).toFixed(6),
                type: token.type,
            }));

            return {
                address,
                network: "Cronos Mainnet",
                chainId: 25,
                tokenCount: tokens.length,
                tokens,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            return { error: "Failed to fetch token list", details: error.message };
        }
    },
});

/**
 * Get blocks mined by an address (for validators)
 */
export const getCronosMinedBlocks = tool({
    description: "Get list of blocks mined/validated by a specific address on Cronos. Useful for validator analysis.",
    parameters: z.object({
        address: z.string().describe("Validator/miner address (0x...)"),
        page: z.number().optional().describe("Page number"),
        limit: z.number().optional().describe("Results per page"),
    }),
    execute: async ({ address, page = 1, limit = 20 }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=account&action=getminedblocks&address=${address}&page=${page}&offset=${limit}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1" || !data.result) {
                return { address, network: "Cronos Mainnet", blocks: [], message: "No mined blocks found" };
            }

            const blocks = data.result.map((block: any) => ({
                blockNumber: parseInt(block.blockNumber),
                timestamp: new Date(parseInt(block.timeStamp) * 1000).toISOString(),
                blockReward: `${(parseFloat(block.blockReward) / 1e18).toFixed(6)} CRO`,
            }));

            return {
                address,
                network: "Cronos Mainnet",
                chainId: 25,
                blockCount: blocks.length,
                blocks,
            };
        } catch (error: any) {
            return { error: "Failed to fetch mined blocks", details: error.message };
        }
    },
});

/**
 * Get CRO token supply
 */
export const getCronosSupply = tool({
    description: "Get the total circulating supply of CRO on Cronos network.",
    parameters: z.object({}),
    execute: async () => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=stats&action=ethsupply${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch supply");
            }

            const supplyWei = data.result;
            const supplyCRO = parseFloat(supplyWei) / 1e18;

            return {
                network: "Cronos Mainnet",
                chainId: 25,
                totalSupply: {
                    wei: supplyWei,
                    cro: supplyCRO.toFixed(2),
                    formatted: `${(supplyCRO / 1e9).toFixed(2)} Billion CRO`,
                },
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            return { error: "Failed to fetch CRO supply", details: error.message };
        }
    },
});

/**
 * Get CRO price from explorer
 */
export const getCronosPriceFromExplorer = tool({
    description: "Get the current CRO price in USD and BTC from Cronos Explorer API.",
    parameters: z.object({}),
    execute: async () => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=stats&action=ethprice${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch price");
            }

            return {
                network: "Cronos Mainnet",
                token: "CRO",
                price: {
                    usd: data.result.ethusd,
                    btc: data.result.ethbtc,
                },
                lastUpdated: new Date(parseInt(data.result.ethusd_timestamp) * 1000).toISOString(),
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            return { error: "Failed to fetch CRO price", details: error.message };
        }
    },
});

/**
 * Get token total supply
 */
export const getCronosTokenSupply = tool({
    description: "Get the total supply of a specific CRC-20 token on Cronos by its contract address.",
    parameters: z.object({
        contractAddress: z.string().describe("Token contract address (0x...)"),
    }),
    execute: async ({ contractAddress }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=stats&action=tokensupply&contractaddress=${contractAddress}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch token supply");
            }

            return {
                network: "Cronos Mainnet",
                contractAddress,
                totalSupply: data.result,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            return { error: "Failed to fetch token supply", details: error.message };
        }
    },
});

/**
 * Get block reward
 */
export const getCronosBlockReward = tool({
    description: "Get block and uncle reward by block number on Cronos.",
    parameters: z.object({
        blockNumber: z.number().describe("Block number"),
    }),
    execute: async ({ blockNumber }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=block&action=getblockreward&blockno=${blockNumber}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch block reward");
            }

            const result = data.result;
            return {
                network: "Cronos Mainnet",
                blockNumber: parseInt(result.blockNumber),
                timestamp: new Date(parseInt(result.timeStamp) * 1000).toISOString(),
                blockMiner: result.blockMiner,
                blockReward: `${(parseFloat(result.blockReward) / 1e18).toFixed(6)} CRO`,
                uncleReward: result.uncles ? `${(parseFloat(result.uncleInclusionReward || "0") / 1e18).toFixed(6)} CRO` : "0 CRO",
            };
        } catch (error: any) {
            return { error: "Failed to fetch block reward", details: error.message };
        }
    },
});

/**
 * Get block number by timestamp
 */
export const getCronosBlockByTime = tool({
    description: "Get the block number that was mined at a specific timestamp on Cronos.",
    parameters: z.object({
        timestamp: z.number().describe("Unix timestamp in seconds"),
        closest: z.enum(["before", "after"]).optional().describe("Find block before or after timestamp (default: before)"),
    }),
    execute: async ({ timestamp, closest = "before" }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=${closest}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch block by time");
            }

            return {
                network: "Cronos Mainnet",
                timestamp: new Date(timestamp * 1000).toISOString(),
                closest,
                blockNumber: parseInt(data.result),
                explorerUrl: `https://explorer.cronos.org/block/${data.result}`,
            };
        } catch (error: any) {
            return { error: "Failed to fetch block by time", details: error.message };
        }
    },
});

/**
 * Get transaction info by hash
 */
export const getCronosTxInfo = tool({
    description: "Get detailed transaction information including execution status from Cronos Explorer API.",
    parameters: z.object({
        txHash: z.string().describe("Transaction hash (0x...)"),
    }),
    execute: async ({ txHash }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=transaction&action=gettxinfo&txhash=${txHash}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch transaction info");
            }

            const tx = data.result;
            return {
                network: "Cronos Mainnet",
                hash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
                from: tx.from,
                to: tx.to,
                value: `${(parseFloat(tx.value) / 1e18).toFixed(6)} CRO`,
                gasLimit: tx.gas,
                gasUsed: tx.gasUsed,
                gasPrice: `${(parseInt(tx.gasPrice) / 1e9).toFixed(2)} Gwei`,
                isError: tx.isError === "1",
                input: tx.input.length > 66 ? `${tx.input.slice(0, 66)}...` : tx.input,
                explorerUrl: `https://explorer.cronos.org/tx/${txHash}`,
            };
        } catch (error: any) {
            return { error: "Failed to fetch transaction info", details: error.message };
        }
    },
});

/**
 * Get transaction receipt status
 */
export const getCronosTxReceiptStatus = tool({
    description: "Check if a transaction was successful or failed on Cronos by its hash.",
    parameters: z.object({
        txHash: z.string().describe("Transaction hash (0x...)"),
    }),
    execute: async ({ txHash }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=transaction&action=gettxreceiptstatus&txhash=${txHash}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch receipt status");
            }

            return {
                network: "Cronos Mainnet",
                txHash,
                status: data.result.status === "1" ? "Success" : "Failed",
                statusCode: data.result.status,
                explorerUrl: `https://explorer.cronos.org/tx/${txHash}`,
            };
        } catch (error: any) {
            return { error: "Failed to fetch transaction status", details: error.message };
        }
    },
});

/**
 * Get event logs
 * Note: Uses dynamic block range (last 10,000 blocks) for reliability
 */
export const getCronosLogs = tool({
    description: "Get event logs from Cronos blockchain from last 10,000 blocks. Useful for tracking contract events, transfers, approvals, etc.",
    parameters: z.object({
        contractAddress: z.string().describe("Contract address to query logs from (0x...)"),
        topic0: z.string().optional().describe("Event signature hash (e.g., Transfer event: 0xddf252ad...)"),
        blockRange: z.number().optional().describe("Number of recent blocks to search (default: 10000)"),
    }),
    execute: async ({ contractAddress, topic0, blockRange = 10000 }) => {
        try {
            // Get current block number and calculate range
            const currentBlock = await getCurrentCronosBlock();
            const fromBlock = Math.max(0, currentBlock - Math.min(blockRange, 10000));

            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            let apiUrl = `${CRONOS_EXPLORER_API}?module=logs&action=getLogs&address=${contractAddress}&fromBlock=${fromBlock}&toBlock=${currentBlock}`;
            if (topic0) apiUrl += `&topic0=${topic0}`;
            if (apiKey) apiUrl += `&apikey=${apiKey}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1" || !data.result) {
                return { contractAddress, network: "Cronos Mainnet", blockRange: { from: fromBlock, to: currentBlock }, logs: [], message: "No logs found in last 10,000 blocks" };
            }

            const logs = data.result.slice(0, 20).map((log: any) => ({
                address: log.address,
                blockNumber: parseInt(log.blockNumber, 16),
                timestamp: new Date(parseInt(log.timeStamp, 16) * 1000).toISOString(),
                transactionHash: log.transactionHash,
                topics: log.topics,
                data: log.data.length > 66 ? `${log.data.slice(0, 66)}...` : log.data,
            }));

            return {
                contractAddress,
                network: "Cronos Mainnet",
                chainId: 25,
                logCount: logs.length,
                logs,
            };
        } catch (error: any) {
            return { error: "Failed to fetch logs", details: error.message };
        }
    },
});

/**
 * Get token info
 */
export const getCronosTokenInfo = tool({
    description: "Get detailed information about a CRC-20 token on Cronos including name, symbol, decimals, and total supply.",
    parameters: z.object({
        contractAddress: z.string().describe("Token contract address (0x...)"),
    }),
    execute: async ({ contractAddress }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=token&action=getToken&contractaddress=${contractAddress}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                throw new Error(data.message || "Failed to fetch token info");
            }

            const token = data.result;
            return {
                network: "Cronos Mainnet",
                contractAddress,
                name: token.name,
                symbol: token.symbol,
                decimals: parseInt(token.decimals),
                totalSupply: token.totalSupply,
                type: token.type,
                explorerUrl: `https://explorer.cronos.org/token/${contractAddress}`,
            };
        } catch (error: any) {
            return { error: "Failed to fetch token info", details: error.message };
        }
    },
});

/**
 * Get token holders
 */
export const getCronosTokenHolders = tool({
    description: "Get list of top holders for a CRC-20 token on Cronos. Shows distribution of token ownership.",
    parameters: z.object({
        contractAddress: z.string().describe("Token contract address (0x...)"),
        page: z.number().optional().describe("Page number"),
        limit: z.number().optional().describe("Results per page"),
    }),
    execute: async ({ contractAddress, page = 1, limit = 20 }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=token&action=getTokenHolders&contractaddress=${contractAddress}&page=${page}&offset=${limit}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1" || !data.result) {
                return { contractAddress, network: "Cronos Mainnet", holders: [], message: "No holders found" };
            }

            const holders = data.result.map((holder: any, index: number) => ({
                rank: (page - 1) * limit + index + 1,
                address: holder.address,
                balance: holder.value,
                percentage: holder.percentage || null,
            }));

            return {
                contractAddress,
                network: "Cronos Mainnet",
                chainId: 25,
                holderCount: holders.length,
                holders,
                explorerUrl: `https://explorer.cronos.org/token/${contractAddress}`,
            };
        } catch (error: any) {
            return { error: "Failed to fetch token holders", details: error.message };
        }
    },
});

/**
 * Get contract ABI
 */
export const getCronosContractABI = tool({
    description: "Get the ABI (Application Binary Interface) for a verified smart contract on Cronos. Required for interacting with contracts.",
    parameters: z.object({
        contractAddress: z.string().describe("Smart contract address (0x...)"),
    }),
    execute: async ({ contractAddress }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=contract&action=getabi&address=${contractAddress}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1") {
                return {
                    contractAddress,
                    network: "Cronos Mainnet",
                    verified: false,
                    message: data.result || "Contract not verified or ABI not available",
                };
            }

            const abi = JSON.parse(data.result);
            const functions = abi.filter((item: any) => item.type === "function").map((fn: any) => fn.name);
            const events = abi.filter((item: any) => item.type === "event").map((ev: any) => ev.name);

            return {
                contractAddress,
                network: "Cronos Mainnet",
                verified: true,
                functionCount: functions.length,
                eventCount: events.length,
                functions: functions.slice(0, 20),
                events: events.slice(0, 10),
                abiLength: abi.length,
                explorerUrl: `https://explorer.cronos.org/address/${contractAddress}#code`,
            };
        } catch (error: any) {
            return { error: "Failed to fetch contract ABI", details: error.message };
        }
    },
});

/**
 * Get contract source code
 */
export const getCronosContractSource = tool({
    description: "Get the verified source code for a smart contract on Cronos. Shows implementation details, compiler version, and settings.",
    parameters: z.object({
        contractAddress: z.string().describe("Smart contract address (0x...)"),
    }),
    execute: async ({ contractAddress }) => {
        try {
            const apiKey = process.env.CRONOS_EXPLORER_API_KEY || "";
            const apiUrl = `${CRONOS_EXPLORER_API}?module=contract&action=getsourcecode&address=${contractAddress}${apiKey ? `&apikey=${apiKey}` : ""}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.status !== "1" || !data.result?.[0]) {
                throw new Error(data.message || "Failed to fetch source code");
            }

            const contract = data.result[0];

            return {
                contractAddress,
                network: "Cronos Mainnet",
                contractName: contract.ContractName || "Unknown",
                compilerVersion: contract.CompilerVersion,
                optimizationUsed: contract.OptimizationUsed === "1",
                runs: contract.Runs ? parseInt(contract.Runs) : null,
                evmVersion: contract.EVMVersion || null,
                licenseType: contract.LicenseType || "Unknown",
                isProxy: contract.Proxy === "1",
                implementation: contract.Implementation || null,
                sourceCodeAvailable: !!contract.SourceCode,
                sourceCodeLength: contract.SourceCode?.length || 0,
                explorerUrl: `https://explorer.cronos.org/address/${contractAddress}#code`,
            };
        } catch (error: any) {
            return { error: "Failed to fetch contract source", details: error.message };
        }
    },
});

// Export all Cronos blockchain tools
export const cronosBlockchainTools = {
    getCronosBalance,
    getCronosBlockInfo,
    getCronosTransaction,
    getCronosTokenBalance,
    getCronosGasPrice,
    getCronosTransactionHistory,
    // New Explorer API tools
    getCronosBalanceMulti,
    getCronosInternalTxList,
    getCronosTokenTransfers,
    getCronosTokenList,
    getCronosMinedBlocks,
    getCronosSupply,
    getCronosPriceFromExplorer,
    getCronosTokenSupply,
    getCronosBlockReward,
    getCronosBlockByTime,
    getCronosTxInfo,
    getCronosTxReceiptStatus,
    getCronosLogs,
    getCronosTokenInfo,
    getCronosTokenHolders,
    getCronosContractABI,
    getCronosContractSource,
};
