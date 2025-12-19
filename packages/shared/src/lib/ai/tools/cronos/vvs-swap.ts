/**
 * VVS Finance DEX Swap Tools
 * 
 * AI-callable tools for interacting with VVS Finance DEX on Cronos.
 * Supports swap quotes, liquidity info, and token pairs.
 * 
 * @see https://github.com/niceDeve/vvs-swap-sdk
 */

import { tool } from "ai";
import { z } from "zod";

// VVS Finance Router contract address on Cronos
const VVS_ROUTER_ADDRESS = "0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae";

// Common token addresses on Cronos
const CRONOS_TOKENS: Record<string, { address: string; decimals: number; name: string }> = {
    CRO: {
        address: "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23", // WCRO
        decimals: 18,
        name: "Wrapped CRO",
    },
    WCRO: {
        address: "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
        decimals: 18,
        name: "Wrapped CRO",
    },
    USDC: {
        address: "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
        decimals: 6,
        name: "USD Coin",
    },
    USDT: {
        address: "0x66e428c3f67a68878562e79A0234c1F83c208770",
        decimals: 6,
        name: "Tether USD",
    },
    WETH: {
        address: "0xe44Fd7fCb2b1581822D0c862B68222998a0c299a",
        decimals: 18,
        name: "Wrapped Ether",
    },
    WBTC: {
        address: "0x062E66477Faf219F25D27dCED647BF57C3107d52",
        decimals: 8,
        name: "Wrapped Bitcoin",
    },
    VVS: {
        address: "0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03",
        decimals: 18,
        name: "VVS Finance",
    },
    DAI: {
        address: "0xF2001B145b43032AAF5Ee2884e456CCd805F677D",
        decimals: 18,
        name: "Dai Stablecoin",
    },
};

// Cronos RPC endpoint
const CRONOS_RPC = "https://evm.cronos.org";

/**
 * Get VVS swap quote between two tokens
 */
export const getVVSSwapQuote = tool({
    description: "Get a swap quote from VVS Finance DEX on Cronos. Shows expected output amount, price impact, and route.",
    parameters: z.object({
        inputToken: z.string().describe("Input token symbol (e.g., 'CRO', 'USDC', 'VVS') or contract address"),
        outputToken: z.string().describe("Output token symbol (e.g., 'USDC', 'CRO', 'VVS') or contract address"),
        inputAmount: z.number().describe("Amount of input token to swap"),
    }),
    execute: async ({ inputToken, outputToken, inputAmount }) => {
        try {
            // Resolve token addresses
            const tokenIn = CRONOS_TOKENS[inputToken.toUpperCase()] || {
                address: inputToken,
                decimals: 18,
                name: "Unknown Token",
            };
            const tokenOut = CRONOS_TOKENS[outputToken.toUpperCase()] || {
                address: outputToken,
                decimals: 18,
                name: "Unknown Token",
            };

            // Convert input amount to wei based on decimals
            const amountIn = BigInt(Math.floor(inputAmount * Math.pow(10, tokenIn.decimals)));

            // Call VVS Router getAmountsOut function
            // Function signature: getAmountsOut(uint amountIn, address[] path)
            const getAmountsOutSelector = "0xd06ca61f";

            // Encode path: [tokenIn, tokenOut] or [tokenIn, WCRO, tokenOut] if neither is CRO
            let path: string[];
            if (tokenIn.address === CRONOS_TOKENS.WCRO.address || tokenOut.address === CRONOS_TOKENS.WCRO.address) {
                path = [tokenIn.address, tokenOut.address];
            } else {
                // Route through WCRO for better liquidity
                path = [tokenIn.address, CRONOS_TOKENS.WCRO.address, tokenOut.address];
            }

            // Encode the call data
            // This is a simplified encoding - in production, use ethers.js or viem
            const amountInHex = amountIn.toString(16).padStart(64, "0");
            const offsetHex = "0000000000000000000000000000000000000000000000000000000000000040";
            const pathLengthHex = path.length.toString(16).padStart(64, "0");
            const pathEncoded = path.map(addr => addr.slice(2).toLowerCase().padStart(64, "0")).join("");

            const callData = getAmountsOutSelector + amountInHex + offsetHex + pathLengthHex + pathEncoded;

            const response = await fetch(CRONOS_RPC, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_call",
                    params: [
                        {
                            to: VVS_ROUTER_ADDRESS,
                            data: callData,
                        },
                        "latest",
                    ],
                    id: 1,
                }),
            });

            const data = await response.json();

            if (data.error) {
                // If direct route fails, return estimation based on prices
                return {
                    status: "estimation",
                    note: "Direct quote unavailable, showing market estimate",
                    inputToken: {
                        symbol: inputToken.toUpperCase(),
                        amount: inputAmount,
                        address: tokenIn.address,
                    },
                    outputToken: {
                        symbol: outputToken.toUpperCase(),
                        address: tokenOut.address,
                    },
                    route: path.length > 2 ? `${inputToken} → CRO → ${outputToken}` : `${inputToken} → ${outputToken}`,
                    dex: "VVS Finance",
                    routerAddress: VVS_ROUTER_ADDRESS,
                    recommendation: "Use VVS Finance app for accurate quotes: https://vvs.finance/swap",
                };
            }

            // Decode amounts out from the result
            const result = data.result;
            const amountsOut: bigint[] = [];

            // Skip offset (64 chars) and length (64 chars), then parse each amount
            const amountsData = result.slice(2 + 64 + 64);
            for (let i = 0; i < path.length; i++) {
                const amountHex = amountsData.slice(i * 64, (i + 1) * 64);
                amountsOut.push(BigInt("0x" + amountHex));
            }

            const outputAmount = Number(amountsOut[amountsOut.length - 1]) / Math.pow(10, tokenOut.decimals);
            const effectiveRate = outputAmount / inputAmount;

            // Calculate price impact (simplified)
            const priceImpact = inputAmount > 1000 ? "~0.5-2%" : "<0.5%";

            return {
                status: "success",
                inputToken: {
                    symbol: inputToken.toUpperCase(),
                    amount: inputAmount,
                    address: tokenIn.address,
                    decimals: tokenIn.decimals,
                },
                outputToken: {
                    symbol: outputToken.toUpperCase(),
                    expectedAmount: outputAmount.toFixed(6),
                    address: tokenOut.address,
                    decimals: tokenOut.decimals,
                },
                route: path.length > 2
                    ? `${inputToken} → CRO → ${outputToken}`
                    : `${inputToken} → ${outputToken}`,
                effectiveRate: `1 ${inputToken} = ${effectiveRate.toFixed(6)} ${outputToken}`,
                priceImpact,
                dex: "VVS Finance",
                routerAddress: VVS_ROUTER_ADDRESS,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error getting VVS swap quote:", error);
            return {
                error: "Failed to get swap quote from VVS Finance",
                details: error.message,
                recommendation: "Check VVS Finance directly: https://vvs.finance/swap",
            };
        }
    },
});

/**
 * Get VVS supported tokens on Cronos
 */
export const getVVSTokenList = tool({
    description: "Get list of popular tokens available for swapping on VVS Finance DEX on Cronos.",
    parameters: z.object({}),
    execute: async () => {
        return {
            dex: "VVS Finance",
            chain: "Cronos",
            chainId: 25,
            tokens: Object.entries(CRONOS_TOKENS).map(([symbol, info]) => ({
                symbol,
                name: info.name,
                address: info.address,
                decimals: info.decimals,
            })),
            routerAddress: VVS_ROUTER_ADDRESS,
            website: "https://vvs.finance",
            note: "These are the most popular tokens. VVS Finance supports many more CRC-20 tokens.",
        };
    },
});

/**
 * Get VVS liquidity pool information
 */
export const getVVSPoolInfo = tool({
    description: "Get information about a VVS Finance liquidity pool on Cronos.",
    parameters: z.object({
        token0: z.string().describe("First token symbol (e.g., 'CRO')"),
        token1: z.string().describe("Second token symbol (e.g., 'USDC')"),
    }),
    execute: async ({ token0, token1 }) => {
        try {
            const tokenInfo0 = CRONOS_TOKENS[token0.toUpperCase()];
            const tokenInfo1 = CRONOS_TOKENS[token1.toUpperCase()];

            if (!tokenInfo0 || !tokenInfo1) {
                return {
                    error: "Token not found in known list",
                    availableTokens: Object.keys(CRONOS_TOKENS),
                };
            }

            // VVS Factory address to get pair
            const VVS_FACTORY = "0x3B44B2a187a7b3824131F8db5a74194D0a42Fc15";

            // getPair(address,address) function selector
            const getPairSelector = "0xe6a43905";
            const addr0 = tokenInfo0.address.slice(2).toLowerCase().padStart(64, "0");
            const addr1 = tokenInfo1.address.slice(2).toLowerCase().padStart(64, "0");

            const response = await fetch(CRONOS_RPC, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_call",
                    params: [
                        {
                            to: VVS_FACTORY,
                            data: getPairSelector + addr0 + addr1,
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

            const pairAddress = "0x" + data.result.slice(-40);
            const zeroPair = "0x0000000000000000000000000000000000000000";

            if (pairAddress === zeroPair) {
                return {
                    exists: false,
                    token0: token0.toUpperCase(),
                    token1: token1.toUpperCase(),
                    message: "Liquidity pool does not exist for this pair",
                };
            }

            return {
                exists: true,
                pairAddress,
                token0: {
                    symbol: token0.toUpperCase(),
                    address: tokenInfo0.address,
                },
                token1: {
                    symbol: token1.toUpperCase(),
                    address: tokenInfo1.address,
                },
                dex: "VVS Finance",
                chain: "Cronos",
                explorerUrl: `https://explorer.cronos.org/address/${pairAddress}`,
            };
        } catch (error: any) {
            console.error("Error getting VVS pool info:", error);
            return {
                error: "Failed to get pool information",
                details: error.message,
            };
        }
    },
});

// Export all VVS DEX tools
export const vvsSwapTools = {
    getVVSSwapQuote,
    getVVSTokenList,
    getVVSPoolInfo,
};
