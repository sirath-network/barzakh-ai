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
    arbitrumNova,
    base,
    polygon,
    polygonZkEvm,
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
    metis,
    boba,
    ronin,
    sei,
    taiko,
    redstone,
    lisk,
    morph,
    cyber,
    berachain,
    soneium,
    worldchain,
    xai,
    zircuit,
    // Newly added confirmed viem chains
    abstract,
    ancient8,
    apeChain,
    arenaz,
    b3,
    corn,
    degen,
    flowMainnet,
    forma,
    funkiMainnet,
    gravity,
    gunz,
    hemi,
    hyperEvm,
    ink,
    katana,
    plasma,
    plume,
    sanko,
    shape,
    somnia,
    sonic,
    story,
    superposition,
    superseed,
    swellchain,
    unichain,
    zeroNetwork,
} from "viem/chains";

// Initialize Relay client with supported chains
const SUPPORTED_CHAINS = [
    mainnet,
    optimism,
    arbitrum,
    arbitrumNova,
    base,
    polygon,
    polygonZkEvm,
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
    metis,
    boba,
    ronin,
    sei,
    taiko,
    redstone,
    lisk,
    morph,
    cyber,
    berachain,
    soneium,
    worldchain,
    xai,
    zircuit,
    abstract,
    ancient8,
    apeChain,
    arenaz,
    b3,
    corn,
    degen,
    flowMainnet,
    forma,
    funkiMainnet,
    gravity,
    gunz,
    hemi,
    hyperEvm,
    ink,
    katana,
    plasma,
    plume,
    sanko,
    shape,
    somnia,
    sonic,
    story,
    superposition,
    superseed,
    swellchain,
    unichain,
    zeroNetwork,
];

// Chain ID to name mapping for display (all Relay Protocol supported chains)
// Chain ID to name mapping based on user request
const CHAIN_NAMES: Record<number, string> = {
    1: "Ethereum",
    10: "Optimism",
    25: "Cronos",
    56: "BNB",
    100: "Gnosis",
    130: "Unichain",
    137: "Polygon",
    143: "Monad",
    146: "Sonic",
    169: "Manta Pacific",
    288: "Boba Network",
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
    7869: "Powerloom v2",
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
    510003: "Syndicate Commons",
    534352: "Scroll",
    543210: "ZERO",
    660279: "Xai",
    666666666: "Degen",
    747474: "Katana",
    888888888: "Ancient8",
    1380012617: "RARI",
    7777777: "Zora",
    8253038: "Bitcoin",
    792703809: "Solana",
    728126428: "Tron",
    9286185: "Eclipse",
    9286186: "Soon",
    5064014: "Ethereal",
    984122: "Forma",
    3586256: "Lighter",
    21000000: "Corn",
};

// Token support level per chain: "All" = any token with DEX liquidity, "Limited" = specific tokens only
// Token support level per chain: "All" | "Limited"
const TOKEN_SUPPORT: Record<number, "All" | "Limited"> = {
    2741: "All",
    888888888: "Limited",
    69000: "Limited",
    33139: "All",
    466: "Limited",
    42161: "All",
    42170: "All",
    7897: "Limited",
    43114: "All",
    8333: "Limited",
    8453: "All",
    80094: "All",
    8253038: "Limited",
    81457: "All",
    56: "All",
    60808: "Limited",
    288: "All",
    42220: "All",
    21000000: "All",
    25: "All",
    7560: "All",
    666666666: "Limited",
    9286185: "Limited",
    5064014: "Limited",
    1: "All",
    747: "All",
    984122: "Limited",
    33979: "Limited",
    100: "All",
    1625: "All",
    43419: "Limited",
    43111: "All",
    999: "All",
    1337: "All",
    57073: "All",
    747474: "All",
    3586256: "All",
    59144: "All",
    1135: "Limited",
    169: "All",
    5000: "All",
    1088: "All",
    34443: "All",
    143: "All",
    2818: "Limited",
    42018: "Limited",
    10: "All",
    1424: "Limited",
    9745: "All",
    98866: "All",
    137: "All",
    1101: "All",
    7869: "Limited",
    1380012617: "All",
    690: "All",
    2020: "All",
    1996: "Limited",
    534352: "All",
    1329: "Limited",
    360: "All",
    792703809: "All",
    5031: "Limited",
    1868: "All",
    146: "All",
    9286186: "Limited",
    988: "Limited",
    1514: "All",
    55244: "Limited",
    5330: "Limited",
    1923: "Limited",
    510003: "Limited",
    167000: "All",
    728126428: "Limited",
    130: "All",
    480: "All",
    660279: "Limited",
    543210: "All",
    48900: "Limited",
    324: "All",
    7777777: "All",
};

// Native token address (zero address)
const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000";
// Solana native SOL address (System Program) - NOT wSOL which is So11111111111111111111111111111111111111112
const SOLANA_NATIVE_ADDRESS = "11111111111111111111111111111111";

function getNativeTokenAddress(chainId: number): string {
    if (chainId === 792703809) return SOLANA_NATIVE_ADDRESS;
    return NATIVE_TOKEN;
}

// Placeholder address for preview quotes (cannot use zero address as ERC20 tokens cannot be sent to it)
const PREVIEW_PLACEHOLDER_ADDRESS = "0x0000000000000000000000000000000000000001";
// Use a valid-looking generic Solana address (System Program 111... is sometimes rejected as recipient)
// This is a burn address often used (or just a valid format)
// Actually, let's use a real-looking Dead address to be safe, or just keep 111... if we are sure.
// But user got 500 error with it. Let's try the "Dead" wallet concept or just a random valid key.
// "Bitc0in..." is sometimes used on Solana? No.
// Let's use a generated valid address.
// 44444444444444444444444444444444444444444444
// But wait, 111... IS the native system program.
// Let's try using the user's EVM address but encoded as base58? No.
// Let's try passing undefined/null? No, API requires string.
// Let's use:
// "Dead111111111111111111111111111111111111111" (might be invalid base58 or checksum)
// Let's use the Wrapped SOL address as a placeholder recipient?
// So11111111111111111111111111111111111111112
const SOLANA_PLACEHOLDER = "So11111111111111111111111111111111111111112";

const BITCOIN_PLACEHOLDER_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"; // Genesis
const TRON_PLACEHOLDER_ADDRESS = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"; // Foundation
const ECLIPSE_PLACEHOLDER_ADDRESS = "0x0000000000000000000000000000000000000001"; // Eclipse uses casting

function getPlaceholderAddress(chainId: number): string {
    if (chainId === 792703809) return SOLANA_PLACEHOLDER;
    if (chainId === 8253038) return BITCOIN_PLACEHOLDER_ADDRESS;
    if (chainId === 728126428) return TRON_PLACEHOLDER_ADDRESS;
    return PREVIEW_PLACEHOLDER_ADDRESS;
}

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
        VVS: "0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03",
        WCRO: "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
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
    1329: "SEI", // Sei
    1514: "IP", // Story
    1625: "G", // Gravity
    1868: "ETH", // Soneium
    1923: "ETH", // SwellChain
    1996: "DMT", // Sanko
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
    98866: "ETH", // Plume
    167000: "ETH", // Taiko
    534352: "ETH", // Scroll
    660279: "XAI", // Xai
    7777777: "ETH", // Zora
    21000000: "BTC", // Corn
    9286185: "ETH", // Eclipse
    8253038: "BTC", // Bitcoin
    792703809: "SOL", // Solana
    728126428: "TRX", // Tron
    888888888: "ETH", // Ancient8
    666666666: "DEGEN", // Degen
    9286186: "ETH", // Soon
    5064014: "ETH", // Ethereal
    747: "FLOW", // Flow EVM
    984122: "TIA", // Forma
    33979: "ETH", // Funkichain
    43419: "GUN", // Gunz

    1337: "HYPE", // Hyperliquid
    747474: "ETH", // Katana
    3586256: "ETH", // Lighter
    42018: "MYTH", // Mythos
    1424: "ETH", // Perennial
    9745: "ETH", // Plasma
    7869: "ETH", // Powerloom
    1380012617: "ETH", // RARI
    5031: "STT", // Somnia
    988: "ETH", // Stable
    510003: "ETH", // Syndicate
    543210: "ETH", // ZERO
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

// Cache for chain token data from Relay API (includes decimals)
interface TokenInfo {
    address: string;
    decimals: number;
}
const chainTokenCache: Map<number, { tokens: Record<string, TokenInfo>; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch token info for a chain from Relay API and cache it
 * Returns a map of symbol -> {address, decimals}
 */
async function fetchChainTokens(chainId: number): Promise<Record<string, TokenInfo>> {
    // Check cache first
    const cached = chainTokenCache.get(chainId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.tokens;
    }

    try {
        // Use the Currencies API (POST /currencies/v1) which returns all supported tokens
        const response = await fetch("https://api.relay.link/currencies/v1", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ chainIds: [chainId] }),
        });

        if (!response.ok) {
            console.warn(`[Relay] Failed to fetch currencies: ${response.status}`);
            return {};
        }

        const currencies = await response.json();

        if (!Array.isArray(currencies) || currencies.length === 0) {
            console.warn(`[Relay] No currencies found for chain ${chainId}`);
            return {};
        }

        const tokens: Record<string, TokenInfo> = {};

        // The API returns an array where each item is itself an array containing one token object
        // Structure: [[{token1}], [{token2}], ...]
        for (const item of currencies) {
            // Each item is an array containing one token object
            const token = Array.isArray(item) ? item[0] : item;
            if (token && token.symbol && token.address) {
                tokens[token.symbol.toUpperCase()] = {
                    address: token.address,
                    decimals: token.decimals ?? 18, // Default to 18 if not specified
                };
            }
        }

        // Cache the result
        chainTokenCache.set(chainId, { tokens, timestamp: Date.now() });

        return tokens;
    } catch (error) {
        console.error(`[Relay] Error fetching chain tokens:`, error);
        return {};
    }
}

// Known native token decimals by chain (for chains where 18 is not correct)
const NATIVE_TOKEN_DECIMALS: Record<number, number> = {
    792703809: 9,   // Solana (SOL)
    8253038: 8,     // Bitcoin (BTC)
    728126428: 6,   // Tron (TRX)
    43114: 18,      // Avalanche (AVAX)
    56: 18,         // BNB Chain
    137: 18,        // Polygon (POL/MATIC)
};

/**
 * Get token decimals for a token on a specific chain
 * Handles native tokens correctly by mapping to chain's native symbol
 * Returns chain-specific fallback for native tokens, or 18 as general default
 */
async function getTokenDecimals(tokenSymbol: string, chainId: number): Promise<number> {
    const symbol = tokenSymbol.toUpperCase();

    // Handle "native" keyword - map to the chain's native token symbol
    const effectiveSymbol = symbol === "NATIVE"
        ? (NATIVE_SYMBOLS[chainId] || "ETH").toUpperCase()
        : symbol;

    // If it's a native token (either by keyword or by symbol matching chain's native)
    const nativeSymbol = NATIVE_SYMBOLS[chainId]?.toUpperCase();
    if (effectiveSymbol === nativeSymbol || symbol === "NATIVE") {
        // Return known decimals for this chain, or default 18
        return NATIVE_TOKEN_DECIMALS[chainId] ?? 18;
    }

    // For non-native tokens, try to fetch from API
    const tokens = await fetchChainTokens(chainId);
    const tokenInfo = tokens[effectiveSymbol];

    if (tokenInfo?.decimals) {
        return tokenInfo.decimals;
    }

    // Fallback: check if it might be a native token by common symbols
    if (["SOL", "WSOL"].includes(effectiveSymbol) && chainId === 792703809) return 9;
    if (["BTC", "WBTC"].includes(effectiveSymbol) && chainId === 8253038) return 8;
    if (["TRX"].includes(effectiveSymbol) && chainId === 728126428) return 6;

    return 18; // Default to 18 decimals
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
            supportedChains: [
                ...SUPPORTED_CHAINS.map((chain) => ({
                    chainId: chain.id,
                    name: CHAIN_NAMES[chain.id] || chain.name,
                    nativeCurrency: chain.nativeCurrency,
                    tokenSupport: TOKEN_SUPPORT[chain.id] || "Unknown",
                })),
                // Add non-viem supported chains (like Solana)
                {
                    chainId: 792703809,
                    name: "Solana",
                    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
                    tokenSupport: "All"
                },
                {
                    chainId: 8253038,
                    name: "Bitcoin",
                    nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 8 },
                    tokenSupport: "Limited"
                },
                {
                    chainId: 728126428,
                    name: "Tron",
                    nativeCurrency: { name: "Tron", symbol: "TRX", decimals: 6 },
                    tokenSupport: "Limited"
                },
                {
                    chainId: 9286185,
                    name: "Eclipse",
                    nativeCurrency: { name: "Eclipse", symbol: "ETH", decimals: 18 },
                    tokenSupport: "Limited"
                }
            ],
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
Supports **EVM** (Ethereum, Base, Arbitrum, Optimism, Cronos, etc.) AND **Non-EVM** (Solana, Bitcoin, Tron) chains. Use Relay for ALL cross-chain swaps, including those involving SOL, BTC, or TRX.
Most major chains have tokenSupport: "All" - meaning any token with DEX liquidity works.

**SUPPORTS USD AMOUNTS**: You can specify amounts in USD like "$0.5", "0.5 USD", or "0.5$" and the tool will automatically convert to the token amount.

**IMPORTANT - NEVER ASK FOR RECIPIENT ADDRESS**:
For cross-chain swaps (especially to non-EVM chains like Solana, Bitcoin, Tron), DO NOT ask the user for their recipient address upfront.
Just call this tool directly - the swap modal UI will collect the recipient address from the user.
The UI handles recipient address collection for better UX.

**ASK FOR CLARIFICATION only when:**

1. **Missing source chain**: If user says "Swap ETH to USDC" without specifying source chain, ASK: "Which chain is your ETH on? (e.g., Ethereum, Optimism, Arbitrum, Base, Cronos)"

2. **Missing destination chain**: If user says "Swap 10 VVS to Optimism" without destination token, ASK: "What token would you like to receive on Optimism? (e.g., ETH, USDC, USDT)"

3. **Missing destination token**: If user says "Bridge from Base" without destination token, ASK: "What token do you want to bridge, and to which chain?"

4. **Same-chain swap**: If user says "Swap 1M VVS to CRO" and both are on Cronos, use this tool with fromChainId = toChainId = 25 (Cronos). Relay supports same-chain swaps too!

5. **Ambiguous chain reference**: If user says "swap to mainnet", ASK: "Which mainnet? Ethereum, Cronos, or another chain?"

**DO NOT call this tool until you have ALL of:**
- Source chain (fromChainId)
- Destination chain (toChainId) - can be same as source for same-chain swaps
- Source token (fromToken)
- Destination token (toToken)
- Amount (can be token amount or USD amount)

Examples of COMPLETE requests:
- "Swap $0.5 worth of ETH on Ethereum to USDC on Arbitrum"
- "Bridge $10 USDC from Polygon to Base"
- "Swap 0.001 ETH on Optimism to ETH on Arbitrum"
- "Swap 1 SOL on Solana to ETH on Ethereum"
- "Swap 100 CRO from Cronos to ETH on Optimism"`,
    parameters: z.object({
        fromChainId: z
            .number()
            .describe(
                "Source chain ID (e.g. 1=Eth, 10=Opt, 8453=Base, 792703809=Solana, 8253038=Bitcoin, 728126428=Tron)"
            ),
        toChainId: z
            .number()
            .describe(
                "Destination chain ID (e.g. 1=Eth, 792703809=Solana, 8253038=Bitcoin, 728126428=Tron)"
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
                "Amount to swap - MUST be a specific number (e.g., '0.1', '100'). Do NOT use 'max', 'all', or words. You MUST check the user's balance first and calculate the specific amount."
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
        fromChainId: rawFromChainId,
        toChainId: rawToChainId,
        fromToken,
        toToken,
        amount,
        userAddress,
        recipientAddress,
    }) => {
        // Normalize Chain IDs (e.g. 101 -> 792703809 for Solana)
        const fromChainId = normalizeChainId(rawFromChainId);
        const toChainId = normalizeChainId(rawToChainId);

        try {
            // Validate addresses based on source chain
            if (userAddress && !isValidAddressForChain(userAddress, fromChainId)) {
                return {
                    status: "error",
                    error: "Invalid wallet address",
                    details: `The provided address '${userAddress}' is not valid for chain ${fromChainId}.`,
                    suggestion: "Please provide a valid wallet address for the selected chain.",
                };
            }

            if (recipientAddress && !isValidAddressForChain(recipientAddress, toChainId)) {
                return {
                    status: "error",
                    error: "Invalid recipient address",
                    details: `The provided address '${recipientAddress}' is not valid for chain ${toChainId}.`,
                    suggestion: "Please provide a valid recipient address for the destination chain.",
                };
            }

            // Use a non-zero placeholder if no user address provided (zero address can't receive ERC20s)
            const effectiveUserAddress = userAddress || getPlaceholderAddress(fromChainId);

            // For recipient, ONLY use userAddress if it's valid for the destination chain
            // Otherwise use the chain-specific placeholder
            let effectiveRecipientAddress = recipientAddress;
            if (!effectiveRecipientAddress) {
                if (userAddress && isValidAddressForChain(userAddress, toChainId)) {
                    effectiveRecipientAddress = userAddress;
                } else {
                    effectiveRecipientAddress = getPlaceholderAddress(toChainId);
                }
            }

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
            } else {
                actualAmount = parsedAmount.value.toString();
            }

            // Get token decimals from Currencies API (cached)
            let decimals = await getTokenDecimals(fromToken, fromChainId);

            // Fallback for decimals if API returns null/undefined
            if (typeof decimals !== 'number' || isNaN(decimals)) {
                console.warn(`[Relay] Failed to get decimals for ${fromToken} on chain ${fromChainId}. Defaulting to 18.`);
                decimals = 18;
            }

            // Validate amount before conversion
            const parsedAmountNum = parseFloat(actualAmount);
            if (isNaN(parsedAmountNum)) {
                throw new Error(`Invalid amount provided: ${actualAmount}`);
            }

            // Use BigInt to ensure integer output (API requires pattern "^[0-9]+$")
            // Use safe multiplication to avoid floating point precision issues
            const amountInSmallestUnit = BigInt(
                Math.round(parsedAmountNum * Math.pow(10, decimals))
            ).toString();

            // Use direct API call instead of SDK (SDK v4.0.1 uses outdated /quote/v2 endpoint)
            const quoteParams = {
                originChainId: fromChainId,
                destinationChainId: toChainId,
                originCurrency: fromTokenAddress,
                destinationCurrency: toTokenAddress,
                amount: amountInSmallestUnit,
                user: effectiveUserAddress,
                recipient: effectiveRecipientAddress,
                tradeType: 'EXACT_INPUT',
            };

            console.log("[Relay] Fetching Quote (Generic):", JSON.stringify(quoteParams, null, 2));

            const quote = await fetchRelayQuoteDirectly(quoteParams);

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
                    recipient: effectiveRecipientAddress,
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
    description: `Get a quote for bridging native tokens (ETH, MATIC, CRO, etc.) between chains using Relay Protocol.
This is optimized for simple native token bridges (same token on both chains).

**SUPPORTS USD AMOUNTS**: You can specify amounts in USD like "$0.5", "0.5 USD", or "$0.5".

**IMPORTANT - ASK FOR CLARIFICATION when user request is incomplete:**

1. **Missing source chain**: If user says "Bridge ETH to Optimism" without source chain, ASK: "Which chain is your ETH on? (Ethereum, Arbitrum, Base?)"

2. **Missing destination chain**: If user says "Bridge 0.1 ETH from Ethereum" without destination, ASK: "Which chain do you want to bridge to?"

3. **Missing amount**: If user says "Bridge ETH from Ethereum to Optimism", ASK: "How much ETH would you like to bridge?"

**DO NOT call this tool until you have ALL of:**
- Source chain (fromChainId)
- Destination chain (toChainId)
- Amount (can be token amount or USD amount)

Examples of COMPLETE requests:
- "Bridge $5 worth of ETH from Ethereum to Optimism"
- "Bridge 0.5 ETH from Ethereum to Optimism"
- "Bridge $10 of native token from Arbitrum to Base"`,
    parameters: z.object({
        fromChainId: z.number().describe("Source chain ID"),
        toChainId: z.number().describe("Destination chain ID"),
        amount: z
            .string()
            .describe("Amount to bridge - can be token amount (e.g., '0.1') OR USD amount (e.g., '$0.5', '0.5 USD')"),
        userAddress: z.string().optional().describe("User wallet address"), // Made optional
    }),
    execute: async ({ fromChainId: rawFromChainId, toChainId: rawToChainId, amount, userAddress }) => {
        // Normalize Chain IDs (e.g. 101 -> 792703809 for Solana)
        const fromChainId = normalizeChainId(rawFromChainId);
        const toChainId = normalizeChainId(rawToChainId);

        try {
            // Validate address based on source chain
            if (userAddress && !isValidAddressForChain(userAddress, fromChainId)) {
                return {
                    status: "error",
                    error: "Invalid wallet address",
                    details: `The provided address '${userAddress}' is not valid for chain ${fromChainId}.`,
                    suggestion: "Please provide a valid wallet address for the selected chain.",
                };
            }

            // Use zero address if no user address provided
            // Use a non-zero placeholder if no user address provided (zero address can't receive ERC20s)

            // For user (sender), we need an address on FromChain
            const effectiveUserAddress = userAddress || getPlaceholderAddress(fromChainId);

            // For recipient (receiver), we need an address on ToChain
            // If user provided address, assume it's valid for ToChain (or they handle cross-chain addr match)
            // If not, ONLY use userAddress if it's valid for ToChain, otherwise use placeholder
            // For recipient (receiver), we need an address on ToChain
            // If user provided address, assume it's valid for ToChain (or they handle cross-chain addr match)
            // If not, ONLY use userAddress if it's valid for ToChain, otherwise use placeholder
            let effectiveRecipientAddress: string;

            if (userAddress && isValidAddressForChain(userAddress, toChainId)) {
                effectiveRecipientAddress = userAddress;
            } else {
                effectiveRecipientAddress = getPlaceholderAddress(toChainId);
            }

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
            } else {
                actualAmount = parsedAmount.value.toString();
            }

            // Use BigInt to ensure integer output (API requires pattern "^[0-9]+$")
            const amountWei = BigInt(Math.floor(parseFloat(actualAmount) * 1e18)).toString();

            // Use direct API call instead of SDK (SDK v4.0.1 uses outdated /quote/v2 endpoint)
            const quoteParams = {
                originChainId: fromChainId,
                destinationChainId: toChainId,
                originCurrency: getNativeTokenAddress(fromChainId),
                destinationCurrency: getNativeTokenAddress(toChainId),
                amount: amountWei,
                user: effectiveUserAddress,
                recipient: effectiveRecipientAddress,
                tradeType: 'EXACT_INPUT',
            };

            console.log("[Relay] Fetching Bridge Quote:", JSON.stringify(quoteParams, null, 2));

            const quote = await fetchRelayQuoteDirectly(quoteParams);

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
        fromChainId: z.number().describe("Source chain ID (e.g. 1=Eth, 792703809=Solana, 8253038=Bitcoin, 728126428=Tron)"),
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
            // Validate addresses based on source chain
            if (userAddress && !isValidAddressForChain(userAddress, fromChainId)) {
                return {
                    status: "error",
                    error: "Invalid wallet address",
                    details: `The provided address '${userAddress}' is not valid for chain ${fromChainId}.`,
                    suggestion: "Please provide a valid wallet address for the selected chain.",
                };
            }

            // Use zero address if no user address provided (for preview)
            // Use a non-zero placeholder if no user address provided (zero address can't receive ERC20s)
            const effectiveUserAddress = userAddress || getPlaceholderAddress(fromChainId);
            const effectiveRecipientAddress = recipientAddress || userAddress || getPlaceholderAddress(toChainId);

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
            } else {
                actualAmount = parsedAmount.value.toString();
            }

            // Get token decimals from Currencies API (cached)
            const decimals = await getTokenDecimals(fromToken, fromChainId);
            // Use BigInt to ensure integer output (API requires pattern "^[0-9]+$")
            const amountInSmallestUnit = BigInt(
                Math.floor(parseFloat(actualAmount) * Math.pow(10, decimals))
            ).toString();

            const quote = await client.actions.getQuote({
                chainId: fromChainId,
                toChainId: toChainId,
                currency: fromTokenAddress,
                toCurrency: toTokenAddress,
                tradeType: 'EXACT_INPUT',
                amount: amountInSmallestUnit,
                user: effectiveUserAddress,
                recipient: effectiveRecipientAddress,
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
    if (token.toLowerCase() === "native" || token.toLowerCase() === "eth" || token.toLowerCase() === "sol") {
        return getNativeTokenAddress(chainId);
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

    // If it is already a valid address for the chain, use it
    if (isValidAddressForChain(resolved, chainId)) {
        return resolved;
    }

    // If it returned unresolved (not an address), try dynamic lookup
    // Only fetch if it doesn't look like an address
    if (!resolved.startsWith("0x") && !isValidAddressForChain(resolved, chainId)) {
        const apiTokens = await fetchChainTokens(chainId);
        const upperSymbol = token.toUpperCase();
        if (apiTokens[upperSymbol]) {
            return apiTokens[upperSymbol].address;
        }
    }

    return resolved;
}

function isValidAddressForChain(address: string, chainId: number): boolean {
    // Solana (792703809)
    if (chainId === 792703809) {
        // Simple Base58 length check (32-44 chars)
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }
    // Bitcoin (8253038)
    if (chainId === 8253038) {
        // Simple BTC address check (starts with 1, 3, or bc1, 26-90 chars)
        return /^(1|3|bc1)[a-zA-Z0-9]{25,90}$/.test(address);
    }
    // Tron (728126428)
    if (chainId === 728126428) {
        // Tron addresses start with T and are 34 chars
        return /^T[a-zA-Z0-9]{33}$/.test(address);
    }

    // Default to EVM check for all other chains
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function getTokenSupport(chainId: number): "All" | "Limited" | "Unknown" {
    return TOKEN_SUPPORT[chainId] || "Unknown";
}

function hasLimitedTokenSupport(chainId: number): boolean {
    return TOKEN_SUPPORT[chainId] === "Limited";
}

function normalizeChainId(chainId: number): number {
    // Map common aliases to Relay-supported Chain IDs
    if (chainId === 101) return 792703809; // Wormhole Solana -> Relay Solana
    if (chainId === 102) return 792703809; // SPL token context
    if (chainId === 507) return 792703809; // Another Solana alias used by some AI models
    return chainId;
}

// Normalize wrapped token symbols to their native equivalents for display
function normalizeTokenDisplayName(symbol: string, chainId: number): string {
    const upper = symbol.toUpperCase();
    // Solana: WSOL -> SOL
    if (chainId === 792703809 && (upper === "WSOL" || upper === "WRAPPED SOL")) {
        return "SOL";
    }
    // Could add more normalizations here for other chains if needed
    return symbol;
}

function extractQuoteDetails(
    quote: any,
    fromChainId: number,
    toChainId: number
): Record<string, any> {
    try {
        const details = quote.details || {};
        const fees = quote.fees || {};

        const rawInputToken =
            details.currencyIn?.currency?.symbol ||
            details.currencyIn?.currency?.name ||
            "Unknown";
        const rawOutputToken =
            details.currencyOut?.currency?.symbol ||
            details.currencyOut?.currency?.name ||
            "Unknown";

        // Normalize display names (e.g., WSOL -> SOL)
        const inputToken = normalizeTokenDisplayName(rawInputToken, fromChainId);
        const outputToken = normalizeTokenDisplayName(rawOutputToken, toChainId);

        let formattedRate = details.rate || "N/A";
        if (details.rate) {
            const rateVal = parseFloat(details.rate);
            if (!isNaN(rateVal)) {
                formattedRate = `1 ${inputToken} ≈ ${rateVal.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                })} ${outputToken}`;
            }
        }

        return {
            inputAmount: details.currencyIn?.amountFormatted || "N/A",
            inputToken,
            outputAmount: details.currencyOut?.amountFormatted || "N/A",
            outputToken,
            rate: formattedRate,
            gasFee: fees.gas?.amountFormatted || "N/A",
            relayerFee: fees.relayer?.amountFormatted || "N/A",
            totalFee: fees.total?.amountFormatted || "N/A",
            estimatedTime: quote.timeEstimate || "~2-5 seconds",
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
