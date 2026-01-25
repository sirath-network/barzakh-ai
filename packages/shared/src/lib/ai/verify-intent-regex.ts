
// Simple script to verify regex patterns from intent-classifier.ts
// We copy the patterns here to avoid complex import issues during verification

const CROSS_CHAIN_PATTERNS = [
    // Cross-chain swap patterns with chain names on both sides
    /\b(swap|bridge|transfer|send)\b.*\b(from|on)\s*(cronos|optimism|arbitrum|base|polygon|ethereum|mainnet|linea|scroll|zksync|blast|manta|mode|avalanche|bsc|bnb|solana|sol|eclipse|bitcoin|btc|tron|trx)\b.*\b(to|on)\s*(cronos|optimism|arbitrum|base|polygon|ethereum|mainnet|linea|scroll|zksync|blast|manta|mode|avalanche|bsc|bnb|solana|sol|eclipse|bitcoin|btc|tron|trx)\b/i,
    // Inverted pattern: chain to chain with swap/bridge in middle
    /\b(cronos|optimism|arbitrum|base|polygon|ethereum|linea|scroll|zksync|blast|solana|sol|eclipse|bitcoin|btc|tron|trx)\b.*\b(to|into)\b.*\b(cronos|optimism|arbitrum|base|polygon|ethereum|linea|scroll|zksync|blast|solana|sol|eclipse|bitcoin|btc|tron|trx)\b/i,
    // Token with amount + from chain + to chain pattern
    /\b\d+(\.\d+)?\s*(cro|eth|usdc|usdt|matic|avax|bnb|sol|btc|trx)\b.*\b(from|on)\s*(cronos|optimism|arbitrum|base|polygon|ethereum|solana|bitcoin|tron)\b.*\b(to|on)\s*(cronos|optimism|arbitrum|base|polygon|ethereum|solana|bitcoin|tron)\b/i,
];

const queries = [
    "Swap 100 USDC from Optimism to Solana",
    "Bridge ETH to SOL",
    "Transfer BTC from Bitcoin to Ethereum",
    "Swap 50 TRX to ETH",
    "Eclipse to Solana bridge",
    "swap 100 usdc from optimism to solana", // lowercase check
];

console.log("Verifying Cross-Chain Patterns...");
let allPassed = true;

queries.forEach(query => {
    const matched = CROSS_CHAIN_PATTERNS.some(pattern => pattern.test(query));
    console.log(`Query: "${query}" - Matched: ${matched}`);
    if (!matched) allPassed = false;
});

if (allPassed) {
    console.log("\nSUCCESS: All queries matched the cross-chain patterns.");
} else {
    console.log("\nFAILURE: Some queries failed to match.");
    process.exit(1);
}
