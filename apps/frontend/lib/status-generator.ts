import type { ToolInvocation, Message } from "ai";

/**
 * Tool name to user-friendly status message mapping
 */
const toolStatusMap: Record<string, (params?: any, userPrompt?: string) => string> = {
  // =========================================================
  // CORE & UTILS
  // =========================================================
  webSearch: (params, userPrompt) => {
    try {
      // Context detection via user prompt
      if (userPrompt) {
        const codingKeywords = [
          "code", "function", "api", "sdk", "library", "react", "nextjs",
          "bug", "error", "fix", "implement", "debug", "component", "hook"
        ];
        const isCoding = codingKeywords.some(w => userPrompt.toLowerCase().includes(w));
        if (isCoding) {
          return "Researching documentation & solutions";
        }
      }

      if (params) {
        if (params.queries && Array.isArray(params.queries) && params.queries.length > 0) {
          return `Searching ${params.queries.length} topics for context`;
        }
        if (params.query && typeof params.query === 'string' && params.query.length < 50) {
          return `Searching web for "${params.query}"`;
        }
      }
    } catch (e) {
      // ignore
    }
    return "Searching the web for information";
  },
  imageAnalyzer: () => "Analyzing image content",
  fileReader: () => "Reading file content",

  // =========================================================
  // CREATIVE
  // =========================================================
  createImage: (params) => {
    // Artist-like progression messages
    const steps = [
      "Rendering your masterpiece",
      "Mixing digital palette",
      "Applying artistic touches",
      "Sculpting light & shadow",
      "Dreaming in pixels",
      "Finalizing details"
    ];

    // Server-side fallback (stable)
    if (typeof window === 'undefined') return steps[0];

    // Client-side rotation (every 3s)
    // Use semi-random offset based on params to avoid global sync if possible, or just time
    const index = Math.floor(Date.now() / 3000) % steps.length;
    return steps[index];
  },

  // =========================================================
  // CROSS-CHAIN & BRIDGING (RELAY)
  // =========================================================
  getRelaySupportedChains: () => "Fetching supported cross-chain networks",
  getRelayQuote: (params) => {
    const token = params?.toToken || "tokens";
    return `Calculating bridge route for ${token}`;
  },
  getRelayBridgeQuote: () => "Analyzing bridge fees and liquidity",
  prepareRelayTransaction: () => "Preparing cross-chain transaction",

  // =========================================================
  // ON-CHAIN GENERAL (EVM)
  // =========================================================
  getEvmMultiChainWalletPortfolio: (params) => {
    const address = params?.address || params?.walletAddress;
    if (address) {
      const short = address.slice(0, 6);
      return `Analyzing portfolio for ${short}...`;
    }
    return "Scanning EVM assets and positions";
  },
  getEvmOnchainDataUsingZerion: () => "Retrieving on-chain data",
  getEvmOnchainDataUsingEtherscan: () => "Deep fetch on-chain data",
  searchEvmTokenMarketData: (params) => {
    const token = params?.token || params?.tokenName || params?.symbol;
    if (token) return `Checking market data for ${token}`;
    return "Retrieving token market metrics";
  },
  ensToAddress: (params) => {
    const name = params?.name || params?.ensName;
    return name ? `Resolving ENS name ${name}` : "Resolving ENS identity";
  },
  translateTransactions: () => "Decoding transaction data",

  // =========================================================
  // SOLANA
  // =========================================================
  getSolanaChainWalletPortfolio: (params) => {
    const address = params?.address || params?.walletAddress;
    const suffix = address ? `(${address.slice(0, 4)}..)` : "";
    return `Scanning Solana portfolio ${suffix}`;
  },
  getSolanaWalletTransactions: () => "Fetching Solana transaction history",
  searchSolanaTokenMarketData: (params) => {
    const token = params?.token || params?.symbol;
    return token ? `Checking Solana market for ${token}` : "Analyzing Solana token data";
  },

  // =========================================================
  // MANTLE
  // =========================================================
  getMantleBalance: () => "Checking Mantle balance",
  getMantlePortfolio: () => "Scanning Mantle assets",
  getMantleTransaction: () => "Verifying Mantle transaction",
  getMantleTransactionHistory: () => "Fetching Mantle history",
  getMantleTokenBalance: () => "Checking Mantle tokens",
  getMantleGasPrice: () => "Checking Mantle gas fees",
  getMantleTokenTransfers: () => "Tracking Mantle transfers",
  getMantleTokenList: () => "Fetching Mantle tokens",
  getMantleRollupInfo: () => "Checking Mantle L2 state",
  getMantleContractABI: () => "Fetching Mantle contract ABI",

  // =========================================================
  // CRONOS & CRONOS ZKEVM
  // =========================================================
  // Cronos EVM
  getCronosBalance: () => "Checking Cronos balance",
  getCronosTransaction: () => "Fetching Cronos transaction detail",
  getCronosTransactionHistory: () => "Retrieving Cronos history",
  getCronosTokenBalance: () => "Checking Cronos tokens",
  getCronosGasPrice: () => "Checking Cronos gas fees",
  getCronosMarketData: () => "Scanning Cronos markets",
  convertCrypto: () => "Calculating conversion rates",
  getCryptoPrice: () => "Fetching latest prices",
  // zkEVM
  getZkEVMBalance: () => "Checking zkEVM balance",
  getZkEVMPortfolio: () => "Scanning zkEVM portfolio",
  getZkEVMTransactionHistory: () => "Fetching zkEVM history",
  getZkEVMTokenList: () => "Fetching zkEVM tokens",
  getZkEVMGasPrice: () => "Estimating zkEVM gas",

  // x402
  initiateX402Payment: () => "Preparing payment transaction",
  getSubscriptionInfo: () => "Retrieving subscription details",
  getCurrentSubscriptionStatus: () => "Checking subscription status",

  // =========================================================
  // APTOS
  // =========================================================
  getAptosApiData: () => "Querying Aptos resources",
  getAptosStats: () => "Checking Aptos network status",
  getAptosScanApiData: () => "Scanning Aptos explorer",
  getAptosPortfolio: () => "Aggregating Aptos assets",
  getAptosGraphqlData: () => "Querying Aptos indexer",
  aptosNames: (params) => {
    const name = params?.name || params?.aptosName;
    return name ? `Resolving Aptos handle ${name}` : "Resolving Aptos identity";
  },

  // =========================================================
  // WORMHOLE
  // =========================================================
  getWormholeApiData: () => "Checking Wormhole status",

  // =========================================================
  // ZETA CHAIN
  // =========================================================
  getZetaApiData: () => "Querying ZetaChain status",
  getZetaStats: () => "Checking ZetaChain metrics",

  // =========================================================
  // FLOW
  // =========================================================
  getFlowApiData: () => "Querying Flow blockchain",
  getFlowStats: () => "Checking Flow status",

  // =========================================================
  // SEI
  // =========================================================
  getSeiApiData: () => "Querying Sei network",
  getSeiStats: () => "Checking Sei metrics",

  // =========================================================
  // VANA
  // =========================================================
  getVanaApiData: () => "Retrieving Vana data",
  getVanaStats: () => "Analyzing Vana stats",

  // =========================================================
  // CREDITCOIN
  // =========================================================
  getCreditcoinApiData: () => "Verifying Creditcoin history",
  getCreditcoinStats: () => "Auditing RWA ledger status",

  // =========================================================
  // MONAD (Dedicated tools using Zerion API)
  // =========================================================
  getMonadBalance: () => "Checking MON balance",
  getMonadTransaction: () => "Fetching Monad transaction",
  getMonadGasPrice: () => "Checking Monad gas",
  getMonadTransactionHistory: () => "Fetching Monad history",
  getMonadPortfolio: () => "Scanning Monad portfolio",
  getMonadDefiPositions: () => "Fetching Monad DeFi positions",
  getMonadNFTs: () => "Fetching Monad NFTs",
  getMonadTokenPositions: () => "Fetching Monad tokens",
  getMonadStats: () => "Checking Monad blockchain stats",

  // =========================================================
  // DEFI & MISC
  // =========================================================
  defiLlama: () => "Consulting DefiLlama protocol data",
  queryCryptoComAI: () => "Asking Crypto.com AI Agent",
  analyzeWalletWithAI: () => "Running AI wallet diagnostics",
  getSiteContent: () => "Reading website content",
};

/**
 * Extract entities from user prompt (addresses, token names, wallet identifiers)
 */
function extractEntitiesFromPrompt(prompt: string): {
  addresses?: string[];
  tokenNames?: string[];
  ensNames?: string[];
} {
  const addresses: string[] = [];
  const tokenNames: string[] = [];
  const ensNames: string[] = [];

  // Extract Ethereum addresses (0x followed by 40 hex characters)
  const ethAddressPattern = /0x[a-fA-F0-9]{40}/g;
  const ethMatches = prompt.match(ethAddressPattern);
  if (ethMatches) {
    addresses.push(...ethMatches);
  }

  // Extract ENS names (ends with .eth)
  const ensPattern = /[\w-]+\.eth/g;
  const ensMatches = prompt.match(ensPattern);
  if (ensMatches) {
    ensNames.push(...ensMatches);
  }

  // Extract potential token names (capitalized words, common crypto patterns)
  const tokenPattern = /\b[A-Z][A-Z0-9]{2,}\b/g;
  const tokenMatches = prompt.match(tokenPattern);
  if (tokenMatches) {
    tokenNames.push(...tokenMatches.filter(name => name.length <= 10));
  }

  return { addresses, tokenNames, ensNames };
}

/**
 * Generate status message for a tool invocation
 * @param toolInvocation - The tool invocation object
 * @param userPrompt - The original user prompt (optional, for context)
 * @returns A user-friendly status message
 */
export function generateStatusFromTool(
  toolInvocation: ToolInvocation,
  userPrompt?: string
): string {
  // Only generate status for tools that are being called (not completed)
  // This function should only be called for pending tools, but add safety check
  if (toolInvocation.state === "result") {
    return "Processing"; // Should not happen, but fallback
  }

  const toolName = toolInvocation.toolName;
  const params = toolInvocation.args || {};

  // Check if we have a specific handler for this tool
  const statusHandler = toolStatusMap[toolName];
  if (statusHandler) {
    try {
      const status = statusHandler(params, userPrompt);
      // Increased limit to 120 to allow for longer dynamic messages (like image prompts)
      if (status && status.length <= 120) {
        return status;
      }
    } catch (error) {
      console.error(`Error generating status for ${toolName}:`, error);
    }
  }

  // Fallback: Generate generic status based on tool name patterns
  if (toolName.includes("Portfolio") || toolName.includes("portfolio")) {
    return "Aggregating comprehensive wallet portfolio data and asset holdings";
  }
  if (toolName.includes("Token") || toolName.includes("token")) {
    return "Retrieving detailed token market metrics and price information";
  }
  if (toolName.includes("Search") || toolName.includes("search")) {
    return "Conducting an extensive search to gather relevant context";
  }
  if (toolName.includes("Address") || toolName.includes("address")) {
    return "Resolving blockchain address identity and associated metadata";
  }
  if (toolName.includes("Image") || toolName.includes("image")) {
    return "Processing your request to generate high-quality visual content";
  }

  // Ultimate fallback
  return "Processing your request and analyzing data to provide the best response";
}

/**
 * Generate status message from pending tools in a message
 * @param message - The assistant message with tool invocations
 * @param userPrompt - The original user prompt (optional)
 * @returns A user-friendly status message, or null if no pending tools
 */
export function generateStatusFromMessage(
  message: Message,
  userPrompt?: string
): string | null {
  // Get the user prompt from the conversation if not provided
  if (!userPrompt && message.role === "assistant") {
    // We'll get it from context when called
  }

  const pendingTools = message.toolInvocations?.filter(
    (tool) => tool.state === "call" || tool.state === "partial-call"
  );

  if (!pendingTools || pendingTools.length === 0) {
    return null;
  }

  // Use the first pending tool for status
  const firstPendingTool = pendingTools[0];
  return generateStatusFromTool(firstPendingTool, userPrompt);
}

/**
 * Generate multi-step status for sequential tool execution
 * @param pendingTools - Array of pending tools
 * @param currentIndex - Current tool index
 * @param userPrompt - The original user prompt
 * @returns A user-friendly status message showing progression
 */
export function generateMultiStepStatus(
  pendingTools: ToolInvocation[],
  currentIndex: number,
  userPrompt?: string
): string {
  if (pendingTools.length === 0) {
    return "Thinking";
  }

  const total = pendingTools.length;
  const currentTool = pendingTools[currentIndex];

  if (total === 1) {
    return generateStatusFromTool(currentTool, userPrompt);
  }

  // For multi-step operations, show progression
  const baseStatus = generateStatusFromTool(currentTool, userPrompt);
  if (baseStatus === "Thinking" || baseStatus === "Processing") {
    return `${baseStatus} (${currentIndex + 1}/${total})`;
  }

  return baseStatus;
}

