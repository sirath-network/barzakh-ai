/**
 * Utility to parse and format blockchain, RPC, and viem execution errors
 * into human-readable titles, descriptions, and actionable advice.
 */

export const CHAIN_NATIVE_CURRENCY: Record<number, string> = {
  1: "ETH",
  10: "ETH",
  25: "CRO",
  56: "BNB",
  100: "xDAI",
  130: "ETH",
  137: "POL",
  143: "MON",
  146: "S",
  169: "ETH",
  324: "ETH",
  480: "ETH",
  999: "HYPER",
  1088: "METIS",
  1101: "ETH",
  1135: "ETH",
  5000: "MNT",
  8453: "ETH",
  42161: "ETH",
  42170: "ETH",
  43114: "AVAX",
  59144: "ETH",
  534352: "ETH",
  7777777: "ETH",
  792703809: "SOL",
  8253038: "BTC",
  728126428: "TRX",
  80094: "BERA",
};

export function getNativeCurrencyForChain(chainId?: number, chainName?: string): string {
  if (chainId && CHAIN_NATIVE_CURRENCY[chainId]) {
    return CHAIN_NATIVE_CURRENCY[chainId];
  }
  if (chainName) {
    const lower = chainName.toLowerCase();
    if (
      lower.includes("arbitrum") ||
      lower.includes("base") ||
      lower.includes("optimism") ||
      lower.includes("ethereum") ||
      lower.includes("zksync") ||
      lower.includes("scroll") ||
      lower.includes("linea")
    ) {
      return "ETH";
    }
    if (lower.includes("solana")) return "SOL";
    if (lower.includes("polygon") || lower.includes("matic")) return "POL";
    if (lower.includes("bnb") || lower.includes("binance") || lower.includes("bsc")) return "BNB";
    if (lower.includes("avalanche") || lower.includes("avax")) return "AVAX";
    if (lower.includes("monad")) return "MON";
    if (lower.includes("sonic")) return "S";
    if (lower.includes("berachain") || lower.includes("bera")) return "BERA";
    if (lower.includes("bitcoin") || lower.includes("btc")) return "BTC";
    if (lower.includes("tron") || lower.includes("trx")) return "TRX";
  }
  return "native tokens";
}

export interface ParsedSwapError {
  title: string;
  description: string;
  badge: string;
  suggestion?: string;
  technicalDetails: string;
  isGasError?: boolean;
}

export interface ErrorParseContext {
  chainId?: number;
  chainName?: string;
  agentWalletAddress?: string;
  fromToken?: string;
}

export function parseSwapError(
  rawError: any,
  context?: ErrorParseContext
): ParsedSwapError {
  let errorText = "";

  if (typeof rawError === "string") {
    errorText = rawError;
  } else if (rawError && typeof rawError === "object") {
    errorText =
      rawError.shortMessage ||
      rawError.message ||
      rawError.error ||
      JSON.stringify(rawError);
  } else {
    errorText = String(rawError || "Transaction failed");
  }

  // Try parsing JSON error strings if applicable
  if (errorText.startsWith("{") && errorText.endsWith("}")) {
    try {
      const parsedJson = JSON.parse(errorText);
      if (parsedJson.error || parsedJson.message) {
        errorText = parsedJson.error || parsedJson.message;
      }
    } catch {
      // Keep errorText as is
    }
  }

  const lower = errorText.toLowerCase();
  const networkName = context?.chainName || "this network";
  const nativeToken = getNativeCurrencyForChain(context?.chainId, context?.chainName);

  // 1. Insufficient Gas / Balance
  if (
    lower.includes("exceeds the balance of the account") ||
    lower.includes("insufficient funds for gas") ||
    lower.includes("insufficient funds for intrinsic transaction cost") ||
    lower.includes("gas * gas fee + value") ||
    lower.includes("gas required exceeds allowance") ||
    lower.includes("out of gas") ||
    lower.includes("insufficient balance to pay for gas")
  ) {
    return {
      title: "Insufficient Balance for Gas",
      description: `Your agent wallet does not have enough native ${nativeToken} on ${networkName} to pay for the network gas fee.`,
      badge: "Insufficient Gas",
      suggestion: `Deposit a small amount of native ${nativeToken} on ${networkName} to your agent wallet, then retry.`,
      technicalDetails: errorText,
      isGasError: true,
    };
  }

  // 2. Insufficient Token Balance
  if (
    lower.includes("transfer amount exceeds balance") ||
    lower.includes("erc20: transfer amount exceeds balance") ||
    lower.includes("insufficient balance") ||
    lower.includes("insufficient funds for transfer")
  ) {
    const tokenSymbol = context?.fromToken || "the required token";
    return {
      title: "Insufficient Token Balance",
      description: `Your wallet does not have enough ${tokenSymbol} to execute this swap.`,
      badge: "Low Balance",
      suggestion: "Verify your wallet balance or try swapping a smaller amount.",
      technicalDetails: errorText,
    };
  }

  // 3. DEX Execution Reverted / Slippage
  if (
    lower.includes("execution reverted") ||
    lower.includes("reverted with reason") ||
    lower.includes("slippage") ||
    lower.includes("transfer_failed") ||
    lower.includes("stf") ||
    lower.includes("return amount is less than expected") ||
    lower.includes("too little received") ||
    lower.includes("uniswapv2: k") ||
    lower.includes("expired") ||
    lower.includes("deadline") ||
    lower.includes("reverted on-chain")
  ) {
    return {
      title: "Transaction Simulation Reverted",
      description: "The swap contract reverted this transaction. Market liquidity shifted or price slippage tolerance was exceeded.",
      badge: "DEX Reverted",
      suggestion: "Requesting a fresh quote or slightly increasing slippage will usually resolve this.",
      technicalDetails: errorText,
    };
  }

  // 4. Nonce / Transaction Conflict
  if (
    lower.includes("nonce too low") ||
    lower.includes("already known") ||
    lower.includes("replacement transaction underpriced") ||
    lower.includes("transaction underpriced") ||
    lower.includes("higher priority") ||
    lower.includes("known transaction")
  ) {
    return {
      title: "Transaction Conflict",
      badge: "Pending Tx",
      description: "A prior transaction from this wallet is still pending or was recently submitted to the network.",
      suggestion: "Wait 15-30 seconds for the pending transaction to confirm on-chain, then retry.",
      technicalDetails: errorText,
    };
  }

  // 5. User / Wallet Rejection
  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected by user") ||
    lower.includes("action cancelled") ||
    lower.includes("request rejected")
  ) {
    return {
      title: "Transaction Cancelled",
      description: "The transaction or signature request was cancelled.",
      badge: "Cancelled",
      technicalDetails: errorText,
    };
  }

  // 6. Network / RPC / Timeout
  if (
    lower.includes("timeout") ||
    lower.includes("etimedout") ||
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("network request failed") ||
    lower.includes("rpc error") ||
    lower.includes("504") ||
    lower.includes("502") ||
    lower.includes("connection reset")
  ) {
    return {
      title: "Network Connection Timeout",
      description: `The network RPC provider for ${networkName} took too long to respond.`,
      badge: "RPC Timeout",
      suggestion: "The network might be temporarily congested. Please wait a moment and retry.",
      technicalDetails: errorText,
    };
  }

  // 7. Token Allowance / Approval
  if (
    lower.includes("allowance") ||
    lower.includes("erc20: insufficient allowance") ||
    lower.includes("approval required")
  ) {
    return {
      title: "Token Approval Required",
      description: "The protocol does not have sufficient token allowance to complete this swap.",
      badge: "Approval",
      suggestion: "Authorize the token approval before executing the swap.",
      technicalDetails: errorText,
    };
  }

  // 8. Relay API Key / Service Error
  if (
    lower.includes("please provide an api key") ||
    lower.includes("api key") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return {
      title: "API Service Unavailable",
      description: "The swap routing service is temporarily unable to fulfill this request.",
      badge: "API Error",
      suggestion: "Please wait a moment and try requesting a new quote.",
      technicalDetails: errorText,
    };
  }

  // 9. Fallback / Clean General Error
  // Extract first sentence before \n or "Details:" or "Request Arguments:" or "Version:"
  let cleanMessage = errorText
    .split(/Details:|Request Arguments:|Contract Call:|Version:|viem@/i)[0]
    .replace(/0x[a-fA-F0-9]{40,}/g, "") // Remove long hex addresses/hashes
    .replace(/\s+/g, " ")
    .trim();

  // Strip trailing punctuation like colons
  cleanMessage = cleanMessage.replace(/:\s*$/, "").trim();

  if (cleanMessage.length > 160) {
    cleanMessage = cleanMessage.slice(0, 157) + "...";
  }

  return {
    title: "Execution Failed",
    description: cleanMessage || "An unexpected error occurred during execution.",
    badge: "Execution Error",
    suggestion: "Check the technical error details below or try requesting a new quote.",
    technicalDetails: errorText,
  };
}
