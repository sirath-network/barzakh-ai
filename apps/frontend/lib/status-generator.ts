import type { ToolInvocation, Message } from "ai";

/**
 * Tool name to user-friendly status message mapping
 */
const toolStatusMap: Record<string, (params?: any, userPrompt?: string) => string> = {
  // Portfolio tools
  getEvmMultiChainWalletPortfolio: (params) => {
    const address = params?.address || params?.walletAddress;
    if (address) {
      const shortAddress = address.length > 12 
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address;
      return `Fetching portfolio for ${shortAddress}`;
    }
    return "Fetching wallet portfolio";
  },
  getSolanaChainWalletPortfolio: (params) => {
    const address = params?.address || params?.walletAddress;
    if (address) {
      const shortAddress = address.length > 12 
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address;
      return `Fetching Solana portfolio for ${shortAddress}`;
    }
    return "Fetching Solana wallet portfolio";
  },
  getTokenBalances: (params) => {
    const address = params?.address || params?.walletAddress;
    if (address) {
      return "Fetching token balances";
    }
    return "Analyzing token balances";
  },

  // Token market data tools
  searchEvmTokenMarketData: (params, userPrompt) => {
    const tokenName = params?.token || params?.tokenName || params?.symbol;
    if (tokenName) {
      return `Fetching ${tokenName} market data`;
    }
    return "Retrieving token market data";
  },
  searchSolanaTokenMarketData: (params, userPrompt) => {
    const tokenName = params?.token || params?.tokenName || params?.symbol;
    if (tokenName) {
      return `Fetching ${tokenName} market data`;
    }
    return "Retrieving Solana token data";
  },

  // Web search
  webSearch: (params, userPrompt) => {
    const query = params?.query || params?.searchQuery;
    if (query && query.length < 30) {
      return `Searching for ${query}`;
    }
    return "Searching the web";
  },

  // Blockchain data tools
  getEvmOnchainDataUsingZerion: (params) => {
    return "Analyzing on-chain data";
  },
  getEvmOnchainDataUsingEtherscan: (params) => {
    return "Scanning blockchain transactions";
  },
  translateTransactions: (params) => {
    return "Translating transactions";
  },

  // Address resolution
  ensToAddress: (params) => {
    const name = params?.name || params?.ensName;
    if (name) {
      return `Resolving ${name}`;
    }
    return "Resolving ENS name";
  },
  aptosNames: (params) => {
    const name = params?.name || params?.aptosName;
    if (name) {
      return `Resolving ${name}`;
    }
    return "Resolving Aptos name";
  },

  // API data tools
  getCreditcoinApiData: () => "Fetching Creditcoin data",
  getVanaApiData: () => "Fetching Vana data",

  // Image generation
  createImage: (params) => {
    const prompt = params?.prompt || params?.description;
    if (prompt && prompt.length < 25) {
      return `Generating ${prompt}`;
    }
    return "Generating image";
  },
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
      if (status && status.length <= 50) {
        return status;
      }
    } catch (error) {
      console.error(`Error generating status for ${toolName}:`, error);
    }
  }

  // Fallback: Generate generic status based on tool name patterns
  if (toolName.includes("Portfolio") || toolName.includes("portfolio")) {
    return "Fetching portfolio data";
  }
  if (toolName.includes("Token") || toolName.includes("token")) {
    return "Retrieving token information";
  }
  if (toolName.includes("Search") || toolName.includes("search")) {
    return "Searching";
  }
  if (toolName.includes("Address") || toolName.includes("address")) {
    return "Resolving address";
  }
  if (toolName.includes("Image") || toolName.includes("image")) {
    return "Generating image";
  }

  // Ultimate fallback
  return "Processing";
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

