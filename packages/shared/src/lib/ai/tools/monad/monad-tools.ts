/**
 * Monad Blockchain Tools
 * 
 * AI-callable tools for interacting with Monad Network (High-performance EVM L1).
 * Supports wallet analysis, transaction details, token info, portfolio, DeFi, and NFTs.
 * Uses Zerion API for comprehensive on-chain data.
 * 
 * Network Details:
 * - Mainnet: Chain ID 143
 * - Native Token: MON
 * - Explorer: https://monadscan.com
 */

import { tool } from "ai";
import { z } from "zod";
import { getZerionApiKey } from "../../../utils/utils";
import { zerionBaseURL } from "../onchain/constant";

// Monad RPC endpoint (Mainnet)
const MONAD_MAINNET_RPC = "https://rpc.monad.xyz";

// Monad chain identifiers
const MONAD_CHAIN_ID = 143;
const MONAD_ZERION_CHAIN = "monad"; // Zerion chain identifier

// Explorer URL
const MONAD_EXPLORER = "https://monadscan.com";

// Helper to format amounts consistently
const formatAmount = (val: string | number) => {
    if (!val) return "0";
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return "0";

    if (Math.abs(num) >= 1_000_000_000_000) {
        return (num / 1_000_000_000_000).toFixed(2).replace(/\.00$/, '') + " T";
    }
    if (Math.abs(num) >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + " B";
    }
    if (Math.abs(num) >= 1_000_000) {
        return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + " M";
    }
    if (Math.abs(num) >= 1_000) {
        return (num / 1_000).toFixed(2).replace(/\.00$/, '') + " K";
    }

    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 6,
        useGrouping: true
    }).format(num);
};

/**
 * Get Monad wallet MON balance
 */
export const getMonadBalance = tool({
    description: "Get MON balance for a wallet address on Monad Network (Chain ID 143). Monad is a high-performance EVM-compatible L1 with parallelized execution.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
    }),
    execute: async ({ address }) => {
        try {
            const response = await fetch(MONAD_MAINNET_RPC, {
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

            // Convert from wei to MON (18 decimals)
            const balanceWei = BigInt(data.result);
            const balanceMON = Number(balanceWei) / 1e18;

            return {
                address,
                network: "Monad Mainnet",
                chainId: MONAD_CHAIN_ID,
                balance: {
                    wei: balanceWei.toString(),
                    mon: balanceMON.toFixed(6),
                    formatted: `${balanceMON.toFixed(4)} MON`,
                },
                explorerUrl: `${MONAD_EXPLORER}/address/${address}`,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching Monad balance:", error);
            return {
                error: "Failed to fetch Monad wallet balance",
                details: error.message,
            };
        }
    },
});

/**
 * Get Monad transaction details
 */
export const getMonadTransaction = tool({
    description: "Get details of a specific transaction on Monad Network by transaction hash.",
    parameters: z.object({
        txHash: z.string().describe("Transaction hash (0x... - must be 66 characters including 0x prefix)"),
    }),
    execute: async ({ txHash }) => {
        try {
            const cleanHash = txHash.trim();
            if (!cleanHash.startsWith("0x") || cleanHash.length !== 66) {
                return {
                    error: "Invalid transaction hash format",
                    details: "Transaction hash must be 66 characters starting with 0x",
                };
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                const [txResponse, receiptResponse] = await Promise.all([
                    fetch(MONAD_MAINNET_RPC, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "eth_getTransactionByHash",
                            params: [cleanHash],
                            id: 1,
                        }),
                        signal: controller.signal,
                    }),
                    fetch(MONAD_MAINNET_RPC, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "eth_getTransactionReceipt",
                            params: [cleanHash],
                            id: 2,
                        }),
                        signal: controller.signal,
                    })
                ]);

                const txData = await txResponse.json();
                const receiptData = await receiptResponse.json();

                if (txData.error || !txData.result) {
                    throw new Error(txData.error?.message || "Transaction not found");
                }

                const tx = txData.result;
                const receipt = receiptData.result;

                const valueWei = BigInt(tx.value);
                const valueMON = Number(valueWei) / 1e18;
                const gasPrice = parseInt(tx.gasPrice, 16);
                const gasUsed = receipt ? parseInt(receipt.gasUsed, 16) : null;
                const txFee = gasUsed ? (gasPrice * gasUsed) / 1e18 : null;

                return {
                    network: "Monad Mainnet",
                    hash: txHash,
                    status: receipt ? (receipt.status === "0x1" ? "Success" : "Failed") : "Pending",
                    blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
                    from: tx.from,
                    to: tx.to,
                    value: {
                        wei: valueWei.toString(),
                        mon: valueMON.toFixed(6),
                        formatted: `${valueMON.toFixed(4)} MON`,
                    },
                    gasPrice: `${(gasPrice / 1e9).toFixed(2)} Gwei`,
                    gasUsed: gasUsed,
                    transactionFee: txFee ? `${txFee.toFixed(6)} MON` : null,
                    nonce: parseInt(tx.nonce, 16),
                    inputData: tx.input.length > 10 ? `${tx.input.slice(0, 10)}...` : tx.input,
                    isContractInteraction: tx.input !== "0x" && tx.input.length > 2,
                    explorerUrl: `${MONAD_EXPLORER}/tx/${txHash}`,
                };
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error: any) {
            console.error("Error fetching Monad transaction:", error);
            return {
                error: "Failed to fetch Monad transaction",
                details: error.message,
            };
        }
    },
});

/**
 * Get Monad gas price
 */
export const getMonadGasPrice = tool({
    description: "Get current gas price on Monad Network for transaction fee estimation. Monad has high throughput with low fees.",
    parameters: z.object({}),
    execute: async () => {
        try {
            const response = await fetch(MONAD_MAINNET_RPC, {
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

            const estimates = {
                simpleTransfer: ((gasPriceWei * 21000) / 1e18).toFixed(8) + " MON",
                tokenTransfer: ((gasPriceWei * 65000) / 1e18).toFixed(8) + " MON",
                swap: ((gasPriceWei * 200000) / 1e18).toFixed(8) + " MON",
            };

            return {
                network: "Monad Mainnet",
                gasPrice: {
                    wei: gasPriceWei,
                    gwei: gasPriceGwei.toFixed(4),
                    formatted: `${gasPriceGwei.toFixed(4)} Gwei`,
                },
                estimatedCosts: estimates,
                note: "Monad is a high-throughput L1 with parallelized EVM execution",
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching gas price:", error);
            return {
                error: "Failed to fetch Monad gas price",
                details: error.message,
            };
        }
    },
});

/**
 * Get Monad transaction history using Zerion API
 */
export const getMonadTransactionHistory = tool({
    description: "Get detailed transaction history for a wallet address on Monad Network using Zerion API. Returns comprehensive information about each transaction. IMPORTANT: The UI will automatically render a transaction history table. Just provide a brief 1-sentence summary.",
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

            const url = `${zerionBaseURL}/v1/wallets/${address}/transactions/?filter[chain_ids]=${MONAD_ZERION_CHAIN}&currency=usd&page[size]=${Math.min(limit, 50)}`;

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
                    network: "Monad Mainnet",
                    transactions: [],
                    transactionCount: 0,
                    message: "No transactions found for this wallet on Monad.",
                };
            }

            const transactions = data.data
                .filter((tx: any) => !tx.attributes.flags?.is_trash)
                .map((tx: any) => {
                    const attrs = tx.attributes;
                    const transfers = attrs.transfers || [];

                    const hasIncoming = transfers.some((t: any) => t.direction === "in");
                    const hasOutgoing = transfers.some((t: any) => t.direction === "out");
                    let direction = "SELF";
                    if (hasOutgoing && !hasIncoming) direction = "OUT";
                    else if (hasIncoming && !hasOutgoing) direction = "IN";

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

                    let value = "0 MON";
                    if (transfers.length > 0) {
                        const mainTransfer = transfers[0];
                        const amount = mainTransfer.quantity?.float || 0;
                        const symbol = mainTransfer.fungible_info?.symbol || "MON";
                        value = `${formatAmount(amount)} ${symbol}`;
                    }

                    const tokenTransfer = transfers.length > 0 ? transfers.map((t: any) => ({
                        direction: t.direction === "out" ? "Sent" : "Received",
                        amount: (t.quantity?.float || 0).toFixed(6),
                        symbol: t.fungible_info?.symbol || "MON",
                        formatted: `${t.direction === "out" ? "-" : "+"}${formatAmount(t.quantity?.float || 0)} ${t.fungible_info?.symbol || "MON"}`,
                    })) : null;

                    return {
                        hash: attrs.hash,
                        explorerUrl: `${MONAD_EXPLORER}/tx/${attrs.hash}`,
                        blockNumber: attrs.mined_at_block,
                        timestamp: attrs.mined_at,
                        direction,
                        txType,
                        status: attrs.status === "confirmed" ? "✅ Success" : attrs.status === "failed" ? "❌ Failed" : attrs.status,
                        from: attrs.sent_from,
                        to: attrs.sent_to || "Contract",
                        value,
                        tokenTransfer: tokenTransfer && tokenTransfer.length === 1 ? tokenTransfer[0] : tokenTransfer,
                        txFee: attrs.fee ? `${attrs.fee.quantity?.float?.toFixed(8) || 0} MON` : null,
                    };
                });

            return {
                address,
                network: "Monad Mainnet",
                transactionCount: transactions.length,
                transactions,
                viewAllUrl: `${MONAD_EXPLORER}/address/${address}`,
                explorerUrl: `${MONAD_EXPLORER}/address/${address}`,
            };
        } catch (error: any) {
            console.error("Error fetching Monad transaction history:", error);
            return {
                error: "Failed to fetch transaction history",
                details: error.message,
            };
        }
    },
});

/**
 * Get complete Monad portfolio using Zerion API
 */
export const getMonadPortfolio = tool({
    description: "Get complete portfolio for a wallet on Monad Network including tokens, DeFi positions, and NFTs. Returns rich data that renders beautifully in the UI. IMPORTANT: The UI will automatically render a portfolio table. Just provide a brief 1-sentence summary.",
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

            console.log("Fetching Monad portfolio for:", address);

            // Fetch portfolio overview
            const portfolioUrl = `${zerionBaseURL}/v1/wallets/${address}/portfolio?currency=usd`;
            const portfolioResponse = await fetch(portfolioUrl, options);

            if (!portfolioResponse.ok) {
                const errorDetails = await portfolioResponse.text();
                console.error(`Zerion portfolio API error ${portfolioResponse.status}:`, errorDetails);
                return `Failed to fetch Monad portfolio: API returned ${portfolioResponse.status}`;
            }

            const portfolioData = await portfolioResponse.json();

            if (!portfolioData || !portfolioData.data || !portfolioData.data.attributes) {
                return {
                    error: "No portfolio data found",
                    address,
                    network: "Monad Mainnet",
                };
            }

            // Fetch positions filtered to Monad chain
            const positionsUrl = `${zerionBaseURL}/v1/wallets/${address}/positions/?filter[chain_ids]=${MONAD_ZERION_CHAIN}&filter[trash]=only_non_trash&sort=-value&currency=usd&page[size]=50`;
            const positionsResponse = await fetch(positionsUrl, options);

            let monadPositions: any[] = [];
            let monadTotalValue = 0;

            if (positionsResponse.ok) {
                const positionsData = await positionsResponse.json();
                monadPositions = positionsData.data || [];
                monadTotalValue = monadPositions.reduce((sum: number, pos: any) =>
                    sum + (pos.attributes?.value || 0), 0
                );
            }

            // Fetch DeFi positions on Monad
            let defiPositions: any[] = [];
            try {
                const defiUrl = `${zerionBaseURL}/v1/wallets/${address}/positions/?filter[positions]=only_complex&filter[chain_ids]=${MONAD_ZERION_CHAIN}&filter[trash]=only_non_trash&currency=usd&sort=value`;
                const defiResponse = await fetch(defiUrl, options);
                if (defiResponse.ok) {
                    const defiData = await defiResponse.json();
                    defiPositions = defiData.data || [];
                }
            } catch (error) {
                console.error("Error fetching Monad DeFi positions:", error);
            }

            // Build positions distribution
            const positionsDistribution: Record<string, number> = {};
            if (monadTotalValue > 0) {
                positionsDistribution[MONAD_ZERION_CHAIN] = monadTotalValue;
            }

            // Build token icons map
            const tokenIcons: Record<string, string> = {};
            monadPositions.forEach((pos: any) => {
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
                    chain: MONAD_ZERION_CHAIN,
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
                        positions: monadTotalValue
                    },
                    changes: portfolioData.data.attributes.changes || { percent_1d: 0 },
                    positions_distribution_by_chain: positionsDistribution,
                    token_icons: tokenIcons,
                },
                currency: "usd",
                defi: defiSummary,
                network: "Monad Mainnet",
                explorerUrl: `${MONAD_EXPLORER}/address/${address}`,
            };
        } catch (error: any) {
            console.error("[Monad Portfolio] Error:", error);
            return {
                error: "Failed to fetch Monad portfolio",
                details: error.message,
                explorerUrl: `${MONAD_EXPLORER}/address/${address}`,
            };
        }
    },
});

/**
 * Get Monad DeFi positions using Zerion API
 */
export const getMonadDefiPositions = tool({
    description: "Get DeFi positions (lending, staking, LP positions, etc.) for a wallet on Monad Network. Shows protocol-specific positions with values.",
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
                return {
                    error: "Zerion API not configured",
                    details: "Please contact support.",
                };
            }

            const defiUrl = `${zerionBaseURL}/v1/wallets/${address}/positions/?filter[positions]=only_complex&filter[chain_ids]=${MONAD_ZERION_CHAIN}&filter[trash]=only_non_trash&currency=usd&sort=-value&page[size]=50`;

            const response = await fetch(defiUrl, {
                method: "GET",
                headers: {
                    accept: "application/json",
                    authorization: `Basic ${apiKey}`,
                },
            });

            if (!response.ok) {
                const errorDetails = await response.text();
                console.error(`Zerion DeFi API error ${response.status}:`, errorDetails);
                return `Failed to fetch Monad DeFi positions: API returned ${response.status}`;
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return {
                    address,
                    network: "Monad Mainnet",
                    positions: [],
                    totalValue: 0,
                    message: "No DeFi positions found for this wallet on Monad.",
                };
            }

            const positions = data.data.map((pos: any) => {
                const attrs = pos.attributes;
                return {
                    protocol: attrs.application_metadata?.name || attrs.protocol || 'Unknown',
                    positionType: attrs.position_type || 'Unknown',
                    value: attrs.value || 0,
                    valueFormatted: `$${formatAmount(attrs.value || 0)}`,
                    tokens: attrs.fungible_info ? [{
                        symbol: attrs.fungible_info.symbol,
                        name: attrs.fungible_info.name,
                        amount: attrs.quantity?.float || 0,
                        amountFormatted: formatAmount(attrs.quantity?.float || 0),
                    }] : [],
                    chain: MONAD_ZERION_CHAIN,
                };
            });

            const totalValue = positions.reduce((sum: number, pos: any) => sum + pos.value, 0);

            return {
                address,
                network: "Monad Mainnet",
                positionCount: positions.length,
                totalValue,
                totalValueFormatted: `$${formatAmount(totalValue)}`,
                positions,
                explorerUrl: `${MONAD_EXPLORER}/address/${address}`,
            };
        } catch (error: any) {
            console.error("Error fetching Monad DeFi positions:", error);
            return {
                error: "Failed to fetch DeFi positions",
                details: error.message,
            };
        }
    },
});

/**
 * Get Monad NFT holdings using Zerion API
 */
export const getMonadNFTs = tool({
    description: "Get NFT holdings for a wallet on Monad Network. Shows all NFT collections and individual NFTs owned.",
    parameters: z.object({
        address: z.string().describe("Wallet address (0x...)"),
        limit: z.number().optional().describe("Number of NFTs to fetch (default: 20, max: 50)"),
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
                return {
                    error: "Zerion API not configured",
                    details: "Please contact support.",
                };
            }

            const nftUrl = `${zerionBaseURL}/v1/wallets/${address}/nft-positions/?filter[chain_ids]=${MONAD_ZERION_CHAIN}&currency=usd&page[size]=${Math.min(limit, 50)}`;

            const response = await fetch(nftUrl, {
                method: "GET",
                headers: {
                    accept: "application/json",
                    authorization: `Basic ${apiKey}`,
                },
            });

            if (!response.ok) {
                const errorDetails = await response.text();
                console.error(`Zerion NFT API error ${response.status}:`, errorDetails);
                return `Failed to fetch Monad NFTs: API returned ${response.status}`;
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return {
                    address,
                    network: "Monad Mainnet",
                    nfts: [],
                    nftCount: 0,
                    message: "No NFTs found for this wallet on Monad.",
                };
            }

            const nfts = data.data.map((nft: any) => {
                const attrs = nft.attributes;
                const nftInfo = attrs.nft_info || {};
                return {
                    name: nftInfo.name || 'Unknown NFT',
                    collection: nftInfo.collection?.name || 'Unknown Collection',
                    tokenId: nftInfo.token_id,
                    contractAddress: nftInfo.contract_address,
                    imageUrl: nftInfo.content?.preview?.url || nftInfo.content?.detail?.url || null,
                    floorPrice: nftInfo.floor_price ? `${formatAmount(nftInfo.floor_price)} MON` : null,
                    value: attrs.value || 0,
                    valueFormatted: attrs.value ? `$${formatAmount(attrs.value)}` : null,
                    chain: MONAD_ZERION_CHAIN,
                };
            });

            const totalValue = nfts.reduce((sum: number, nft: any) => sum + (nft.value || 0), 0);

            return {
                address,
                network: "Monad Mainnet",
                nftCount: nfts.length,
                totalValue,
                totalValueFormatted: `$${formatAmount(totalValue)}`,
                nfts,
                explorerUrl: `${MONAD_EXPLORER}/address/${address}`,
            };
        } catch (error: any) {
            console.error("Error fetching Monad NFTs:", error);
            return {
                error: "Failed to fetch NFTs",
                details: error.message,
            };
        }
    },
});

/**
 * Get Monad token positions using Zerion API
 */
export const getMonadTokenPositions = tool({
    description: "Get all token positions (holdings) for a wallet on Monad Network including token balances and USD values.",
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
                return {
                    error: "Zerion API not configured",
                    details: "Please contact support.",
                };
            }

            const positionsUrl = `${zerionBaseURL}/v1/wallets/${address}/positions/?filter[chain_ids]=${MONAD_ZERION_CHAIN}&filter[positions]=only_simple&filter[trash]=only_non_trash&sort=-value&currency=usd&page[size]=50`;

            const response = await fetch(positionsUrl, {
                method: "GET",
                headers: {
                    accept: "application/json",
                    authorization: `Basic ${apiKey}`,
                },
            });

            if (!response.ok) {
                const errorDetails = await response.text();
                console.error(`Zerion positions API error ${response.status}:`, errorDetails);
                return `Failed to fetch Monad token positions: API returned ${response.status}`;
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                return {
                    address,
                    network: "Monad Mainnet",
                    tokens: [],
                    tokenCount: 0,
                    totalValue: 0,
                    message: "No token positions found for this wallet on Monad.",
                };
            }

            const tokens = data.data.map((pos: any) => {
                const attrs = pos.attributes;
                const fungible = attrs.fungible_info || {};
                return {
                    symbol: fungible.symbol || 'Unknown',
                    name: fungible.name || 'Unknown Token',
                    contractAddress: fungible.implementations?.[0]?.address || null,
                    balance: attrs.quantity?.float || 0,
                    balanceFormatted: formatAmount(attrs.quantity?.float || 0),
                    value: attrs.value || 0,
                    valueFormatted: `$${formatAmount(attrs.value || 0)}`,
                    price: attrs.price || 0,
                    priceFormatted: attrs.price ? `$${attrs.price.toFixed(4)}` : null,
                    iconUrl: fungible.icon?.url || null,
                    verified: fungible.flags?.verified || false,
                };
            });

            const totalValue = tokens.reduce((sum: number, t: any) => sum + t.value, 0);

            return {
                address,
                network: "Monad Mainnet",
                tokenCount: tokens.length,
                totalValue,
                totalValueFormatted: `$${formatAmount(totalValue)}`,
                tokens,
                explorerUrl: `${MONAD_EXPLORER}/address/${address}`,
            };
        } catch (error: any) {
            console.error("Error fetching Monad token positions:", error);
            return {
                error: "Failed to fetch token positions",
                details: error.message,
            };
        }
    },
});

// Export all Monad blockchain tools
export const monadBlockchainTools = {
    getMonadBalance,
    getMonadTransaction,
    getMonadGasPrice,
    getMonadTransactionHistory,
    getMonadPortfolio,
    getMonadDefiPositions,
    getMonadNFTs,
    getMonadTokenPositions,
};
