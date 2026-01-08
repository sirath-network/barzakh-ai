/**
 * Relay Protocol Cross-Chain Swap & Bridge Tools
 *
 * AI-callable tools for cross-chain swaps and bridging using Relay Protocol.
 * Supports 25+ EVM chains with instant execution.
 *
 * @see https://docs.relay.link/references/relay-kit/sdk/overview
 */

import { tool } from "ai";
import { z } from "zod";
import {
    createClient,
    getClient,
    convertViemChainToRelayChain,
    MAINNET_RELAY_API,
} from "@relayprotocol/relay-sdk";
import {
    mainnet,
    optimism,
    arbitrum,
    base,
    polygon,
    avalanche,
    bsc,
    zkSync,
    linea,
    scroll,
    blast,
    manta,
    mode,
    zora,
    gnosis,
    fantom,
    celo,
    cronos,
} from "viem/chains";

// Initialize Relay client with supported chains
const SUPPORTED_CHAINS = [
    mainnet,
    optimism,
    arbitrum,
    base,
    polygon,
    avalanche,
    bsc,
    zkSync,
    linea,
    scroll,
    blast,
    manta,
    mode,
    zora,
    gnosis,
    fantom,
    celo,
    cronos,
];

// Chain ID to name mapping for display (all Relay Protocol supported chains)
const CHAIN_NAMES: Record<number, string> = {
    1: "Ethereum",
    10: "Optimism",
    25: "Cronos",
    56: "BNB Chain",
    100: "Gnosis",
    130: "Unichain",
    137: "Polygon",
    143: "Monad",
    146: "Sonic",
    169: "Manta Pacific",
    288: "Boba",
    324: "zkSync Era",
    360: "Shape",
    466: "AppChain",
    480: "World Chain",
    690: "Redstone",
    747: "Flow EVM",
    988: "Stable",
    999: "HyperEVM",
    1088: "Metis",
    1101: "Polygon zkEVM",
    1135: "Lisk",
    1329: "Sei",
    1337: "Hyperliquid",
    1424: "Perennial",
    1514: "Story",
    1625: "Gravity",
    1868: "Soneium",
    1923: "SwellChain",
    1996: "Sanko",
    2020: "Ronin",
    2741: "Abstract",
    2818: "Morph",
    5000: "Mantle",
    5031: "Somnia",
    5330: "Superseed",
    7560: "Cyber",
    7869: "Powerloom",
    7897: "Arena-Z",
    8333: "B3",
    8453: "Base",
    9745: "Plasma",
    33139: "ApeChain",
    33979: "Funkichain",
    34443: "Mode",
    42018: "Mythos",
    42161: "Arbitrum",
    42170: "Arbitrum Nova",
    42220: "Celo",
    43111: "Hemi",
    43114: "Avalanche",
    43419: "Gunz",
    48900: "Zircuit",
    55244: "Superposition",
    57073: "Ink",
    59144: "Linea",
    60808: "BOB",
    69000: "Animechain",
    80094: "Berachain",
    81457: "Blast",
    98866: "Plume",
    167000: "Taiko",
    510003: "Syndicate",
    534352: "Scroll",
    543210: "Zero",
    660279: "Xai",
    747474: "Katana",
    7777777: "Zora",
};

// Token support level per chain: "All" = any token with DEX liquidity, "Limited" = specific tokens only
const TOKEN_SUPPORT: Record<number, "All" | "Limited"> = {
    1: "All",        // Ethereum
    10: "All",       // Optimism
    25: "All",       // Cronos
    56: "All",       // BNB
    100: "All",      // Gnosis
    130: "All",      // Unichain
    137: "All",      // Polygon
    143: "All",      // Monad
    146: "All",      // Sonic
    169: "All",      // Manta Pacific
    288: "All",      // Boba Network
    324: "All",      // zkSync Era
    360: "All",      // Shape
    466: "Limited",  // AppChain
    480: "All",      // World Chain
    690: "All",      // Redstone
    747: "All",      // Flow EVM
    988: "Limited",  // Stable
    999: "All",      // HyperEVM
    1088: "All",     // Metis
    1101: "All",     // Polygon zkEVM
    1135: "Limited", // Lisk
    1329: "Limited", // Sei
    1337: "All",     // Hyperliquid
    1424: "Limited", // Perennial
    1514: "All",     // Story
    1625: "All",     // Gravity
    1868: "All",     // Soneium
    1923: "Limited", // SwellChain
    1996: "Limited", // Sanko
    2020: "All",     // Ronin
    2741: "All",     // Abstract
    2818: "Limited", // Morph
    5000: "All",     // Mantle
    5031: "Limited", // Somnia
    5330: "Limited", // Superseed
    7560: "All",     // Cyber
    7869: "Limited", // Powerloom v2
    7897: "Limited", // Arena-Z
    8333: "Limited", // B3
    8453: "All",     // Base
    9745: "All",     // Plasma
    21000000: "All", // Corn
    33139: "All",    // ApeChain
    33979: "Limited",// Funkichain
    34443: "All",    // Mode
    42018: "Limited",// Mythos
    42161: "All",    // Arbitrum
    42170: "All",    // Arbitrum Nova
    42220: "All",    // Celo
    43111: "All",    // Hemi
    43114: "All",    // Avalanche
    43419: "Limited",// Gunz
    48900: "Limited",// Zircuit
    55244: "Limited",// Superposition
    57073: "All",    // Ink
    59144: "All",    // Linea
    60808: "Limited",// BOB
    69000: "Limited",// Animechain
    80094: "All",    // Berachain
    81457: "All",    // Blast
    98866: "All",    // Plume
    167000: "All",   // Taiko
    510003: "Limited",// Syndicate Commons
    534352: "All",   // Scroll
    543210: "All",   // ZERO
    660279: "Limited",// Xai
    666666666: "Limited", // Degen
    747474: "All",   // Katana
    888888888: "Limited", // Ancient8
    1380012617: "All", // RARI
    7777777: "All",  // Zora
    8253038: "Limited", // Bitcoin
    792703809: "All", // Solana
    728126428: "Limited", // Tron
    9286185: "Limited", // Eclipse
    9286186: "Limited", // Soon
    5064014: "Limited", // Ethereal
    984122: "Limited", // Forma
};

// Native token address (zero address)
const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";

// Placeholder address for preview quotes (cannot use zero address as ERC20 tokens cannot be sent to it)
const PREVIEW_PLACEHOLDER_ADDRESS = "0x0000000000000000000000000000000000000001";

// Token addresses per chain (stablecoins + popular tokens)
const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
    1: {
        // Ethereum
        USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        DAI: "0x6b175474e89094c44da98b954eedeac495271d0f",
        WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        WBTC: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        CBBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    },
    10: {
        // Optimism
        USDC: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
        USDT: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
        DAI: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        WETH: "0x4200000000000000000000000000000000000006",
        WBTC: "0x68f180fcce6836688e9084f035309e29bf0a2095",
    },
    42161: {
        // Arbitrum
        USDC: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
        USDT: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        DAI: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
        WETH: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
        WBTC: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    },
    8453: {
        // Base
        USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        WETH: "0x4200000000000000000000000000000000000006",
        CBBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    },
    137: {
        // Polygon
        USDC: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
        USDT: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
        DAI: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
        WETH: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
        WBTC: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
    },
    25: {
        // Cronos
        USDC: "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
        USDT: "0x66e428c3f67a68878562e79A0234c1F83c208770",
        WETH: "0xe44Fd7fCb2b1581822D0c862B68222998a0c299a",
        WBTC: "0x062E66477Faf219F25D27dCED647BF57C3107d52",
    },
};

// CoinGecko ID mapping for price lookups
const TOKEN_COINGECKO_IDS: Record<string, string> = {
    ETH: "ethereum",
    WETH: "ethereum",
    BTC: "bitcoin",
    WBTC: "wrapped-bitcoin",
    MATIC: "matic-network",
    POL: "matic-network",
    AVAX: "avalanche-2",
    BNB: "binancecoin",
    CRO: "crypto-com-chain",
    FTM: "fantom",
    OP: "optimism",
    ARB: "arbitrum",
    BERA: "berachain-bera",
    SOL: "solana",
    S: "sonic",
    MON: "monad",
    APE: "apecoin",
    XAI: "xai-blockchain",
    METIS: "metis-token",
    CELO: "celo",
    MNT: "mantle",
    RON: "ronin",
    G: "gravity-0x9c7bebaf",
    HYPE: "hyperliquid",
    IP: "story-protocol",
    ANIME: "animecoin",
    PLUME: "plume-network",
    // Stablecoins (1:1 with USD)
    USDC: "usd-coin",
    USDT: "tether",
    DAI: "dai",
};

// Native token symbols by chain (for USD conversion)
const NATIVE_SYMBOLS: Record<number, string> = {
    1: "ETH",
    10: "ETH",
    25: "CRO",
    56: "BNB",
    100: "ETH", // Gnosis uses xDAI but ETH for pricing
    130: "ETH", // Unichain
    137: "POL",
    143: "MON", // Monad
    146: "S", // Sonic
    169: "ETH", // Manta
    288: "ETH", // Boba
    324: "ETH", // zkSync
    360: "ETH", // Shape
    480: "ETH", // World Chain
    690: "ETH", // Redstone
    999: "HYPE", // HyperEVM
    1088: "METIS",
    1101: "ETH", // Polygon zkEVM
    1135: "ETH", // Lisk
    1329: "ETH", // Sei uses USDC
    1514: "IP", // Story
    1625: "G", // Gravity
    1868: "ETH", // Soneium
    1923: "ETH", // SwellChain
    1996: "ETH", // Sanko (DMT)
    2020: "RON", // Ronin
    2741: "ETH", // Abstract
    2818: "ETH", // Morph
    5000: "MNT", // Mantle
    5330: "ETH", // Superseed
    7560: "ETH", // Cyber
    8333: "ETH", // B3
    8453: "ETH", // Base
    33139: "APE", // ApeChain
    34443: "ETH", // Mode
    42161: "ETH", // Arbitrum
    42170: "ETH", // Arbitrum Nova
    42220: "CELO",
    43111: "ETH", // Hemi
    43114: "AVAX",
    48900: "ETH", // Zircuit
    55244: "ETH", // Superposition
    57073: "ETH", // Ink
    59144: "ETH", // Linea
    60808: "ETH", // BOB
    69000: "ANIME", // Animechain
    80094: "BERA", // Berachain
    81457: "ETH", // Blast
    98866: "PLUME", // Plume
    167000: "ETH", // Taiko
    534352: "ETH", // Scroll
    660279: "XAI", // Xai
    7777777: "ETH", // Zora
};

let isClientInitialized = false;

/**
 * Initialize the Relay client (lazy initialization)
 */
function initializeRelayClient(): void {
    if (isClientInitialized) return;

    try {
        createClient({
            baseApiUrl: MAINNET_RELAY_API,
            source: "barzakh-ai",
            chains: SUPPORTED_CHAINS.map((chain) =>
                convertViemChainToRelayChain(chain)
            ),
        });
        isClientInitialized = true;
        console.log("[Relay] Client initialized successfully");
    } catch (error) {
        console.error("[Relay] Failed to initialize client:", error);
        throw error;
    }
}

/**
 * Fetch quote directly from Relay API (bypasses SDK which uses outdated params)
 * SDK v4.0.1 uses /quote/v2 with chainId/toChainId but API now expects
 * originChainId/destinationChainId/originCurrency/destinationCurrency
 */
async function fetchRelayQuoteDirectly(params: {
    originChainId: number;
    destinationChainId: number;
    originCurrency: string;
    destinationCurrency: string;
    amount: string;
    user: string;
    recipient: string;
    tradeType?: string;
}): Promise<any> {
    const response = await fetch("https://api.relay.link/quote", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            originChainId: params.originChainId,
            destinationChainId: params.destinationChainId,
            originCurrency: params.originCurrency,
            destinationCurrency: params.destinationCurrency,
            amount: params.amount,
            user: params.user,
            recipient: params.recipient,
            tradeType: params.tradeType || "EXACT_INPUT",
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
            type: "APIError",
            statusCode: response.status,
            message: errorData.message || `API error: ${response.status}`,
            rawError: errorData,
            endpoint: "https://api.relay.link/quote",
        };
    }

    return response.json();
}

// Cache for chain token data from Relay API
const chainTokenCache: Map<number, { tokens: Record<string, string>; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch token info for a chain from Relay API and cache it
 * Returns a map of symbol -> address
 */
async function fetchChainTokens(chainId: number): Promise<Record<string, string>> {
    // Check cache first
    const cached = chainTokenCache.get(chainId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.tokens;
    }

    try {
        const response = await fetch("https://api.relay.link/chains");
        if (!response.ok) {
            console.warn(`[Relay] Failed to fetch chains: ${response.status}`);
            return {};
        }

        const data = await response.json();
        const chain = data.chains?.find((c: any) => c.id === chainId);

        if (!chain) {
            console.warn(`[Relay] Chain ${chainId} not found in API response`);
            return {};
        }

        const tokens: Record<string, string> = {};

        // Add native currency
        if (chain.currency?.symbol && chain.currency?.address) {
            tokens[chain.currency.symbol.toUpperCase()] = chain.currency.address;
        }

        // Add featured tokens
        for (const token of chain.featuredTokens || []) {
            if (token.symbol && token.address) {
                tokens[token.symbol.toUpperCase()] = token.address;
            }
        }

        // Add ERC20 currencies
        for (const token of chain.erc20Currencies || []) {
            if (token.symbol && token.address) {
                tokens[token.symbol.toUpperCase()] = token.address;
            }
        }

        // Cache the result
        chainTokenCache.set(chainId, { tokens, timestamp: Date.now() });
        console.log(`[Relay] Cached ${Object.keys(tokens).length} tokens for chain ${chainId}`);

        return tokens;
    } catch (error) {
        console.error(`[Relay] Error fetching chain tokens:`, error);
        return {};
    }
}

/**
 * Fetch token price in USD from CoinGecko
 */
async function getTokenPriceUSD(tokenSymbol: string): Promise<number | null> {
    try {
        const symbol = tokenSymbol.toUpperCase();

        // Stablecoins are ~$1
        if (["USDC", "USDT", "DAI", "BUSD"].includes(symbol)) {
            return 1.0;
        }

        const coingeckoId = TOKEN_COINGECKO_IDS[symbol];
        if (!coingeckoId) {
            console.warn(`[Relay] No CoinGecko ID for ${symbol}`);
            return null;
        }

        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
            { headers: { accept: "application/json" } }
        );

        if (!response.ok) {
            console.warn(`[Relay] CoinGecko API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data[coingeckoId]?.usd || null;
    } catch (error) {
        console.error("[Relay] Price fetch error:", error);
        return null;
    }
}

/**
 * Parse amount string - supports USD amounts like "$0.5", "0.5 USD", "0.5$"
 * Returns { isUSD: boolean, value: number }
 */
function parseAmount(amountStr: string): { isUSD: boolean; value: number } {
    const cleaned = amountStr.trim();

    // Check for USD patterns: $0.5, 0.5$, 0.5 USD, 0.5USD, USD 0.5
    const usdPatterns = [
        /^\$([\d.]+)$/,           // $0.5
        /^([\d.]+)\$$/,           // 0.5$
        /^([\d.]+)\s*USD$/i,      // 0.5 USD or 0.5USD
        /^USD\s*([\d.]+)$/i,      // USD 0.5 or USD0.5
    ];

    for (const pattern of usdPatterns) {
        const match = cleaned.match(pattern);
        if (match) {
            return { isUSD: true, value: parseFloat(match[1]) };
        }
    }

    // Not USD, parse as regular number
    return { isUSD: false, value: parseFloat(cleaned) };
}

/**
 * Convert USD amount to token amount
 */
async function convertUSDToTokenAmount(
    usdAmount: number,
    tokenSymbol: string,
    chainId: number
): Promise<{ amount: string; priceUsed: number } | null> {
    // Get token symbol for native tokens
    const symbol = tokenSymbol.toLowerCase() === "native"
        ? NATIVE_SYMBOLS[chainId] || "ETH"
        : tokenSymbol.toUpperCase();

    const price = await getTokenPriceUSD(symbol);
    if (!price) {
        return null;
    }

    const tokenAmount = usdAmount / price;
    return {
        amount: tokenAmount.toFixed(8), // 8 decimal places for precision
        priceUsed: price,
    };
}

/**
 * Get list of supported chains for Relay cross-chain operations
 */
export const getRelaySupportedChains = tool({
    description:
        "Get list of blockchain networks supported by Relay Protocol for cross-chain swaps and bridging. Shows tokenSupport level: 'All' means any token works, 'Limited' means only specific tokens.",
    parameters: z.object({}),
    execute: async () => {
        return {
            protocol: "Relay Protocol",
            supportedChains: SUPPORTED_CHAINS.map((chain) => ({
                chainId: chain.id,
                name: CHAIN_NAMES[chain.id] || chain.name,
                nativeCurrency: chain.nativeCurrency,
                tokenSupport: TOKEN_SUPPORT[chain.id] || "Unknown",
            })),
            features: [
                "Cross-chain swaps",
                "Native token bridging",
                "Same-chain swaps",
                "MEV protection",
                "Instant execution via solver network",
            ],
            note: "Chains with tokenSupport 'All' support any token with DEX liquidity. Chains with 'Limited' only support specific bridgeable tokens.",
            documentation: "https://docs.relay.link",
        };
    },
});

/**
 * Get a quote for cross-chain swap or bridge
 */
export const getRelayQuote = tool({
    description: `Get a quote for cross-chain swap or bridge using Relay Protocol.
Supports swapping any token on any supported chain to any other token on any chain.
Most major chains (Ethereum, Optimism, Arbitrum, Base, etc.) have tokenSupport: "All" - meaning any token with DEX liquidity works.

**SUPPORTS USD AMOUNTS**: You can specify amounts in USD like "$0.5", "0.5 USD", or "0.5$" and the tool will automatically convert to the token amount.

Examples:
- Swap $0.5 worth of ETH on Ethereum to USDC on Arbitrum
- Bridge $10 of USDC from Polygon to Base
- Swap 0.001 ETH on Optimism to ETH on Arbitrum
- Bridge $5 worth of native token from Cronos to Ethereum`,
    parameters: z.object({
        fromChainId: z
            .number()
            .describe(
                "Source chain ID (e.g., 1 for Ethereum, 10 for Optimism, 25 for Cronos)"
            ),
        toChainId: z
            .number()
            .describe(
                "Destination chain ID (e.g., 42161 for Arbitrum, 8453 for Base)"
            ),
        fromToken: z
            .string()
            .describe(
                "Source token - use 'native' for native token (ETH/MATIC/etc) or token symbol (USDC/USDT) or contract address"
            ),
        toToken: z
            .string()
            .describe(
                "Destination token - use 'native' for native token or token symbol or contract address"
            ),
        amount: z
            .string()
            .describe(
                "Amount to swap - can be token amount (e.g., '0.1') OR USD amount (e.g., '$0.5', '0.5 USD', '0.5$')"
            ),
        userAddress: z
            .string()
            .optional() // Made optional for initial intent
            .describe("User wallet address that will execute the swap. If not provided, a preview quote will be generated."),
        recipientAddress: z
            .string()
            .optional()
            .describe("Recipient address (defaults to user address if not provided)"),
    }),
    execute: async ({
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
        userAddress,
        recipientAddress,
    }) => {
        try {
            // Validate addresses
            if (userAddress && !isValidEvmAddress(userAddress)) {
                return {
                    status: "error",
                    error: "Invalid wallet address",
                    details: `The provided address '${userAddress}' is not a valid EVM address.`,
                    suggestion: "Please provide a valid Ethereum wallet address starting with 0x.",
                };
            }

            if (recipientAddress && !isValidEvmAddress(recipientAddress)) {
                return {
                    status: "error",
                    error: "Invalid recipient address",
                    details: `The provided address '${recipientAddress}' is not a valid EVM address.`,
                    suggestion: "Please provide a valid Ethereum recipient address starting with 0x.",
                };
            }

            // Use a non-zero placeholder if no user address provided (zero address can't receive ERC20s)
            const effectiveUserAddress = userAddress || PREVIEW_PLACEHOLDER_ADDRESS;

            initializeRelayClient();

            const client = getClient();
            if (!client) {
                throw new Error("Relay client not initialized");
            }

            // Resolve token addresses (with async API fallback)
            const fromTokenAddress = await resolveTokenAddressAsync(fromToken, fromChainId);
            const toTokenAddress = await resolveTokenAddressAsync(toToken, toChainId);

            // Parse amount - check if it's USD or token amount
            const parsedAmount = parseAmount(amount);
            let actualAmount: string;
            let usdConversionInfo: { priceUsed: number; originalUSD: number } | null = null;

            if (parsedAmount.isUSD) {
                // Convert USD to token amount
                const conversion = await convertUSDToTokenAmount(
                    parsedAmount.value,
                    fromToken,
                    fromChainId
                );

                if (!conversion) {
                    return {
                        status: "error",
                        error: "Failed to convert USD amount to token amount",
                        details: `Could not fetch price for ${fromToken}. Try using token amount directly.`,
                        suggestion: "Use a direct token amount like '0.001' instead of USD amount.",
                    };
                }

                actualAmount = conversion.amount;
                usdConversionInfo = {
                    priceUsed: conversion.priceUsed,
                    originalUSD: parsedAmount.value,
                };
                console.log(
                    `[Relay] Converted $${parsedAmount.value} USD to ${actualAmount} ${fromToken} (price: $${conversion.priceUsed})`
                );
            } else {
                actualAmount = parsedAmount.value.toString();
            }

            // Convert amount to smallest unit (assuming 18 decimals, will be adjusted by SDK)
            const decimals = fromTokenAddress === NATIVE_TOKEN ? 18 : 6; // Assume 6 for stables
            const amountInSmallestUnit = (
                parseFloat(actualAmount) * Math.pow(10, decimals)
            ).toString();

            console.log(
                `[Relay] Getting quote: ${actualAmount} ${fromToken} on chain ${fromChainId} -> ${toToken} on chain ${toChainId}`
            );

            // Use direct API call instead of SDK (SDK v4.0.1 uses outdated /quote/v2 endpoint)
            const quote = await fetchRelayQuoteDirectly({
                originChainId: fromChainId,
                destinationChainId: toChainId,
                originCurrency: fromTokenAddress,
                destinationCurrency: toTokenAddress,
                amount: amountInSmallestUnit,
                user: effectiveUserAddress,
                recipient: recipientAddress || effectiveUserAddress,
                tradeType: 'EXACT_INPUT',
            });

            // Extract relevant quote information
            const quoteDetails = extractQuoteDetails(quote, fromChainId, toChainId);

            return {
                status: "success",
                protocol: "Relay Protocol",
                quote: quoteDetails,
                fromChain: CHAIN_NAMES[fromChainId] || `Chain ${fromChainId}`,
                toChain: CHAIN_NAMES[toChainId] || `Chain ${toChainId}`,
                // Return key parameters for frontend to reconstruct/execute
                toolParams: {
                    fromChainId,
                    toChainId,
                    fromToken: fromTokenAddress,
                    toToken: toTokenAddress,
                    amount: amountInSmallestUnit, // Use atomic units (wei) for execution
                    isUSD: false
                },
                ...(usdConversionInfo && {
                    usdConversion: {
                        requestedUSD: `$${usdConversionInfo.originalUSD}`,
                        tokenAmount: actualAmount,
                        priceUsed: `$${usdConversionInfo.priceUsed}`,
                    },
                }),
                timestamp: new Date().toISOString(),
                note: userAddress ? "Quote is valid for a limited time." : "Preview quote. Connect wallet to execute.",
                // Store raw quote for execution
                _rawQuote: quote,
            };
        } catch (error: any) {
            console.error("[Relay] Quote error:", error);

            // Extract detailed error info from Relay API errors
            const statusCode = error.statusCode || error.status || "unknown";
            const rawErrorMsg = error.rawError?.message || error.rawError?.error || "";
            const endpoint = error.endpoint || "";

            return {
                status: "error",
                error: "Failed to get quote from Relay Protocol",
                details: error.message || "Unknown error",
                statusCode,
                rawError: rawErrorMsg,
                endpoint,
                suggestion: getErrorSuggestion(error),
            };
        }
    },
});

/**
 * Get a quote specifically for native token bridging
 */
export const getRelayBridgeQuote = tool({
    description: `Get a quote for bridging native tokens (ETH, MATIC, etc.) between chains using Relay Protocol.
This is optimized for simple native token bridges.

**SUPPORTS USD AMOUNTS**: You can specify amounts in USD like "$0.5", "0.5 USD", or "0.5$".

Examples:
- Bridge $5 worth of ETH from Ethereum to Optimism
- Bridge 0.5 ETH from Ethereum to Optimism
- Bridge $10 of native token from Arbitrum to Base`,
    parameters: z.object({
        fromChainId: z.number().describe("Source chain ID"),
        toChainId: z.number().describe("Destination chain ID"),
        amount: z
            .string()
            .describe("Amount to bridge - can be token amount (e.g., '0.1') OR USD amount (e.g., '$0.5', '0.5 USD')"),
        userAddress: z.string().optional().describe("User wallet address"), // Made optional
    }),
    execute: async ({ fromChainId, toChainId, amount, userAddress }) => {
        try {
            // Validate address
            if (userAddress && !isValidEvmAddress(userAddress)) {
                return {
                    status: "error",
                    error: "Invalid wallet address",
                    details: `The provided address '${userAddress}' is not a valid EVM address.`,
                    suggestion: "Please provide a valid Ethereum wallet address starting with 0x.",
                };
            }

            // Use zero address if no user address provided
            // Use a non-zero placeholder if no user address provided (zero address can't receive ERC20s)
            const effectiveUserAddress = userAddress || PREVIEW_PLACEHOLDER_ADDRESS;

            initializeRelayClient();

            const client = getClient();
            if (!client) {
                throw new Error("Relay client not initialized");
            }

            // Parse amount - check if it's USD or token amount
            const parsedAmount = parseAmount(amount);
            let actualAmount: string;
            let usdConversionInfo: { priceUsed: number; originalUSD: number } | null = null;

            if (parsedAmount.isUSD) {
                // Convert USD to native token amount
                const conversion = await convertUSDToTokenAmount(
                    parsedAmount.value,
                    "native",
                    fromChainId
                );

                if (!conversion) {
                    return {
                        status: "error",
                        error: "Failed to convert USD amount to token amount",
                        details: `Could not fetch price for native token on chain ${fromChainId}.`,
                        suggestion: "Use a direct token amount like '0.01' instead of USD amount.",
                    };
                }

                actualAmount = conversion.amount;
                usdConversionInfo = {
                    priceUsed: conversion.priceUsed,
                    originalUSD: parsedAmount.value,
                };
                console.log(
                    `[Relay] Converted $${parsedAmount.value} USD to ${actualAmount} native token (price: $${conversion.priceUsed})`
                );
            } else {
                actualAmount = parsedAmount.value.toString();
            }

            const amountWei = (parseFloat(actualAmount) * 1e18).toFixed(0);

            console.log(
                `[Relay] Getting bridge quote: ${actualAmount} native token from chain ${fromChainId} -> chain ${toChainId}`
            );

            // Use direct API call instead of SDK (SDK v4.0.1 uses outdated /quote/v2 endpoint)
            const quote = await fetchRelayQuoteDirectly({
                originChainId: fromChainId,
                destinationChainId: toChainId,
                originCurrency: NATIVE_TOKEN,
                destinationCurrency: NATIVE_TOKEN,
                amount: amountWei,
                user: effectiveUserAddress,
                recipient: effectiveUserAddress,
                tradeType: 'EXACT_INPUT',
            });

            const quoteDetails = extractQuoteDetails(quote, fromChainId, toChainId);

            return {
                status: "success",
                type: "native_bridge",
                protocol: "Relay Protocol",
                quote: quoteDetails,
                fromChain: CHAIN_NAMES[fromChainId] || `Chain ${fromChainId}`,
                toChain: CHAIN_NAMES[toChainId] || `Chain ${toChainId}`,
                inputAmount: actualAmount,
                // Return key parameters for frontend
                toolParams: {
                    fromChainId,
                    toChainId,
                    fromToken: NATIVE_TOKEN,
                    toToken: NATIVE_TOKEN,
                    amount: amountWei, // Use atomic units (wei) for execution
                    isUSD: false
                },
                ...(usdConversionInfo && {
                    usdConversion: {
                        requestedUSD: `$${usdConversionInfo.originalUSD}`,
                        tokenAmount: actualAmount,
                        priceUsed: `$${usdConversionInfo.priceUsed}`,
                    },
                }),
                timestamp: new Date().toISOString(),
                _rawQuote: quote,
            };
        } catch (error: any) {
            console.error("[Relay] Bridge quote error:", error);
            return {
                status: "error",
                error: "Failed to get bridge quote",
                details: error.message,
                suggestion: getErrorSuggestion(error),
            };
        }
    },
});

/**
 * Prepare transaction data for Relay swap/bridge execution
 * Returns transaction data that frontend can use with user's wallet
 */
export const prepareRelayTransaction = tool({
    description: `Prepare transaction data for executing a Relay swap or bridge.
Returns the transaction parameters that need to be signed and submitted by the user's wallet.
Use this after getting a quote to prepare the actual transaction.

**SUPPORTS USD AMOUNTS**: You can specify amounts in USD like "$0.5", "0.5 USD", or "0.5$".

Examples:
- Swap $5 of ETH from Arbitrum to Optimism
- Bridge $10 worth of native token from Base to Polygon`,
    parameters: z.object({
        fromChainId: z.number().describe("Source chain ID"),
        toChainId: z.number().describe("Destination chain ID"),
        fromToken: z.string().describe("Source token (native/symbol/address)"),
        toToken: z.string().describe("Destination token"),
        amount: z.string().describe("Amount to swap - can be token amount (e.g., '0.1') OR USD amount (e.g., '$0.5', '0.5 USD')"),
        userAddress: z.string().describe("User wallet address"),
        recipientAddress: z.string().optional().describe("Recipient address"),
    }),
    execute: async ({
        fromChainId,
        toChainId,
        fromToken,
        toToken,
        amount,
        userAddress,
        recipientAddress,
    }) => {
        try {
            // Validate addresses
            if (userAddress && !isValidEvmAddress(userAddress)) {
                return {
                    status: "error",
                    error: "Invalid wallet address",
                    details: `The provided address '${userAddress}' is not a valid EVM address.`,
                    suggestion: "Please provide a valid Ethereum wallet address starting with 0x.",
                };
            }

            // Use zero address if no user address provided (for preview)
            // Use a non-zero placeholder if no user address provided (zero address can't receive ERC20s)
            const effectiveUserAddress = userAddress || PREVIEW_PLACEHOLDER_ADDRESS;

            initializeRelayClient();

            const client = getClient();
            if (!client) {
                throw new Error("Relay client not initialized");
            }

            // Resolve token addresses (with async API fallback)
            const fromTokenAddress = await resolveTokenAddressAsync(fromToken, fromChainId);
            const toTokenAddress = await resolveTokenAddressAsync(toToken, toChainId);

            // Parse amount - check if it's USD or token amount
            const parsedAmount = parseAmount(amount);
            let actualAmount: string;
            let usdConversionInfo: { priceUsed: number; originalUSD: number } | null = null;

            if (parsedAmount.isUSD) {
                // Convert USD to token amount
                const conversion = await convertUSDToTokenAmount(
                    parsedAmount.value,
                    fromToken,
                    fromChainId
                );

                if (!conversion) {
                    return {
                        status: "error",
                        error: "Failed to convert USD amount to token amount",
                        details: `Could not fetch price for ${fromToken}. Try using token amount directly.`,
                        suggestion: "Use a direct token amount like '0.001' instead of USD amount.",
                    };
                }

                actualAmount = conversion.amount;
                usdConversionInfo = {
                    priceUsed: conversion.priceUsed,
                    originalUSD: parsedAmount.value,
                };
                console.log(
                    `[Relay] Converted $${parsedAmount.value} USD to ${actualAmount} ${fromToken} (price: $${conversion.priceUsed})`
                );
            } else {
                actualAmount = parsedAmount.value.toString();
            }

            const decimals = fromTokenAddress === NATIVE_TOKEN ? 18 : 6;
            const amountInSmallestUnit = (
                parseFloat(actualAmount) * Math.pow(10, decimals)
            ).toString();

            const quote = await client.actions.getQuote({
                chainId: fromChainId,
                toChainId: toChainId,
                currency: fromTokenAddress,
                toCurrency: toTokenAddress,
                tradeType: 'EXACT_INPUT',
                amount: amountInSmallestUnit,
                user: userAddress,
                recipient: recipientAddress || userAddress,
            });

            // Extract transaction steps from quote
            const steps = quote.steps || [];
            const transactions = steps.flatMap((step: any) =>
                (step.items || []).map((item: any) => ({
                    to: item.data?.to,
                    data: item.data?.data,
                    value: item.data?.value || "0",
                    chainId: item.data?.chainId || fromChainId,
                }))
            );

            return {
                status: "success",
                message:
                    "Transaction data prepared. User wallet signature required to execute.",
                protocol: "Relay Protocol",
                sourceChain: CHAIN_NAMES[fromChainId],
                destinationChain: CHAIN_NAMES[toChainId],
                ...(usdConversionInfo && {
                    usdConversion: {
                        requestedUSD: `$${usdConversionInfo.originalUSD}`,
                        tokenAmount: actualAmount,
                        priceUsed: `$${usdConversionInfo.priceUsed}`,
                    },
                }),
                transactions: transactions,
                quoteDetails: extractQuoteDetails(quote, fromChainId, toChainId),
                instructions: [
                    "1. User wallet must be connected to the source chain",
                    "2. Execute each transaction in order",
                    "3. Wait for confirmation on destination chain",
                ],
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("[Relay] Prepare transaction error:", error);
            return {
                status: "error",
                error: "Failed to prepare transaction",
                details: error.message,
                suggestion: getErrorSuggestion(error),
            };
        }
    },
});

// Helper functions

function resolveTokenAddress(token: string, chainId: number): string {
    if (token.toLowerCase() === "native" || token.toLowerCase() === "eth") {
        return NATIVE_TOKEN;
    }

    // Check if it's already an address
    if (token.startsWith("0x") && token.length === 42) {
        return token.toLowerCase();
    }

    // Try to resolve from known token addresses
    const chainTokens = TOKEN_ADDRESSES[chainId];
    if (chainTokens && chainTokens[token.toUpperCase()]) {
        return chainTokens[token.toUpperCase()];
    }

    // Return as-is if we can't resolve (might be a symbol the SDK understands)
    return token;
}

/**
 * Async version that tries API lookup after static mapping fails
 */
async function resolveTokenAddressAsync(token: string, chainId: number): Promise<string> {
    // First try sync resolution
    const resolved = resolveTokenAddress(token, chainId);

    // If it returned unresolved (not an address), try dynamic lookup
    if (!resolved.startsWith("0x") || resolved.length !== 42) {
        const apiTokens = await fetchChainTokens(chainId);
        const upperSymbol = token.toUpperCase();
        if (apiTokens[upperSymbol]) {
            console.log(`[Relay] Resolved ${token} to ${apiTokens[upperSymbol]} via API`);
            return apiTokens[upperSymbol];
        }
    }

    return resolved;
}

function isValidEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function getTokenSupport(chainId: number): "All" | "Limited" | "Unknown" {
    return TOKEN_SUPPORT[chainId] || "Unknown";
}

function hasLimitedTokenSupport(chainId: number): boolean {
    return TOKEN_SUPPORT[chainId] === "Limited";
}

function extractQuoteDetails(
    quote: any,
    fromChainId: number,
    toChainId: number
): Record<string, any> {
    try {
        const details = quote.details || {};
        const fees = quote.fees || {};

        return {
            inputAmount: details.currencyIn?.amountFormatted || "N/A",
            inputToken:
                details.currencyIn?.currency?.symbol ||
                details.currencyIn?.currency?.name ||
                "Unknown",
            outputAmount: details.currencyOut?.amountFormatted || "N/A",
            outputToken:
                details.currencyOut?.currency?.symbol ||
                details.currencyOut?.currency?.name ||
                "Unknown",
            rate: details.rate || "N/A",
            gasFee: fees.gas?.amountFormatted || "N/A",
            relayerFee: fees.relayer?.amountFormatted || "N/A",
            totalFee: fees.total?.amountFormatted || "N/A",
            estimatedTime: quote.timeEstimate || "~1-2 minutes",
            steps: quote.steps?.length || 0,
        };
    } catch {
        return {
            raw: "Quote details parsing failed. Raw quote available.",
        };
    }
}

function getErrorSuggestion(error: any): string {
    const message = error.message?.toLowerCase() || "";
    const rawError = error.rawError?.message?.toLowerCase() || "";
    const fullMessage = message + " " + rawError;

    if (fullMessage.includes("destination transaction failed")) {
        return "This swap route is not supported. Try: 1) Bridging native tokens only (ETH to ETH), 2) Using same token on both chains (USDC to USDC), or 3) Swapping on the same chain first.";
    }
    if (fullMessage.includes("insufficient")) {
        return "Check that you have enough balance including gas fees.";
    }
    if (fullMessage.includes("chain") || fullMessage.includes("unsupported")) {
        return "This chain combination may not be supported. Try different chains.";
    }
    if (fullMessage.includes("amount") || fullMessage.includes("too small") || fullMessage.includes("minimum")) {
        return "The amount may be too small. Try a larger value (e.g., at least $1 worth).";
    }
    if (fullMessage.includes("token") || fullMessage.includes("currency")) {
        return "Token not supported for bridging. Try native tokens (ETH) or major stablecoins (USDC).";
    }
    if (fullMessage.includes("address") || fullMessage.includes("invalid address")) {
        return "The wallet address provided is invalid. Please provide a valid 0x address.";
    }
    if (fullMessage.includes("no route") || fullMessage.includes("route not found")) {
        return "No route found for this swap. Try bridging the same token (ETH to ETH) or use a more common token pair.";
    }

    return "This route may not be supported. Try: 1) Native token bridge (ETH to ETH), 2) Smaller/larger amount, or 3) Relay app at https://relay.link";
}

// Export all Relay tools
export const relayTools = {
    getRelaySupportedChains,
    getRelayQuote,
    getRelayBridgeQuote,
    prepareRelayTransaction,
};
