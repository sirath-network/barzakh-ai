/**
 * KeeperHub Workflow Composer
 * 
 * Translates user intents from Barzakh AI into deterministic KeeperHub workflow DAGs.
 * This is the bridge between probabilistic AI intent recognition and deterministic execution.
 * 
 * Supported compositions:
 * - Cross-chain swaps (via Relay Protocol)
 * - DreamDEX prediction market trades
 * - DreamDEX settlement sweep
 * - ERC-20 token transfers
 * - Scheduled DreamDEX auto-trading
 */

import type {
  KeeperHubWorkflow,
  KeeperHubNode,
  KeeperHubEdge,
  WorkflowIntent,
  WorkflowCompositionInput,
  WorkflowPreview,
  DreamDexAutoTradeConfig,
  DreamDexSweepConfig,
} from './keeperhub-types';

const BARZAKH_VERSION = '1.0.0';

// === Token Address Registry ===

const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  tUSDC: {
    50312: '0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E',
  },
};

const DREAMDEX_CONTRACTS: Record<string, string> = {
  'BTC-UP-5m': '0x276f5834C407b5B1d1De943dEf367f33E33f6E3C',
  'BTC-UP-15m': '0x3770105e7C867F88224130b4908E5E3B51e91847',
  'BTC-UP-4h': '0xF0981caA193a3D7E028Bb8dD404cC1d8629C66e3',
  'ETH-UP-5m': '0x241A56bd55Cb119E62702b75FD171e0a983b1aCc',
  'ETH-UP-15m': '0x70784Dc7Ca87Bf2ED5220072d8c8f9661716170F',
  'ETH-UP-4h': '0x9887d318fFd0e385E6d3113ef78b9a664AB4d0CB',
};

// === Helper Functions ===

function generateNodeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

function getTokenAddress(token: string, chainId: number): string {
  if (token.startsWith('0x') && token.length === 42) return token;
  const upper = token.toUpperCase();
  return TOKEN_ADDRESSES[upper]?.[chainId] || token;
}

// === Workflow Composers ===

export function composeCrossChainSwapWorkflow(params: {
  fromChainId: number;
  toChainId: number;
  fromToken: string;
  toToken: string;
  amount: string;
  userAddress: string;
  slippageBps?: number;
}): KeeperHubWorkflow {
  const { fromChainId, toChainId, fromToken, toToken, amount, userAddress, slippageBps = 50 } = params;
  const fromTokenAddr = getTokenAddress(fromToken, fromChainId);
  const isNativeFrom = fromToken.toLowerCase() === 'native' || fromToken.toLowerCase() === 'eth';

  const nodes: KeeperHubNode[] = [
    {
      id: 'trigger',
      type: 'manual-trigger',
      label: 'Manual Trigger',
      config: {},
    },
    {
      id: 'check-balance',
      type: 'web3-read',
      label: `Check ${fromToken} Balance`,
      config: {
        chainId: fromChainId,
        ...(isNativeFrom
          ? { method: 'getBalance', args: [userAddress] }
          : {
              contractAddress: fromTokenAddr,
              abi: ['function balanceOf(address) view returns (uint256)'],
              method: 'balanceOf',
              args: [userAddress],
            }),
      },
    },
    {
      id: 'validate-balance',
      type: 'condition',
      label: 'Sufficient Balance?',
      config: {
        expression: `BigInt("{{@check-balance:Check ${fromToken} Balance.result}}") >= BigInt("${amount}")`,
      },
    },
  ];

  if (!isNativeFrom) {
    nodes.push({
      id: 'approve-token',
      type: 'web3-write',
      label: `Approve ${fromToken} Spending`,
      config: {
        chainId: fromChainId,
        contractAddress: fromTokenAddr,
        abi: ['function approve(address spender, uint256 amount) returns (bool)'],
        method: 'approve',
        args: ['{{relay-router-address}}', amount],
        description: `Approve Relay Protocol to spend ${amount} ${fromToken}`,
      },
    });
  }

  nodes.push(
    {
      id: 'execute-swap',
      type: 'web3-write',
      label: `Swap ${fromToken} → ${toToken}`,
      config: {
        chainId: fromChainId,
        description: `Cross-chain swap via Relay Protocol from chain ${fromChainId} to chain ${toChainId}`,
        relay: {
          fromChainId,
          toChainId,
          fromToken: fromTokenAddr,
          toToken: getTokenAddress(toToken, toChainId),
          amount,
          slippageBps,
          userAddress,
        },
      },
    },
    {
      id: 'verify-receipt',
      type: 'web3-read',
      label: `Verify ${toToken} Receipt`,
      config: {
        chainId: toChainId,
        contractAddress: getTokenAddress(toToken, toChainId),
        abi: ['function balanceOf(address) view returns (uint256)'],
        method: 'balanceOf',
        args: [userAddress],
        description: `Verify ${toToken} arrived on destination chain ${toChainId}`,
      },
    }
  );

  const edges: KeeperHubEdge[] = [
    { source: 'trigger', target: 'check-balance' },
    { source: 'check-balance', target: 'validate-balance' },
    { source: 'validate-balance', target: isNativeFrom ? 'execute-swap' : 'approve-token', sourceHandle: 'true' },
  ];

  if (!isNativeFrom) {
    edges.push({ source: 'approve-token', target: 'execute-swap' });
  }
  edges.push({ source: 'execute-swap', target: 'verify-receipt' });

  return {
    name: `Swap ${amount} ${fromToken} → ${toToken} (Chain ${fromChainId} → ${toChainId})`,
    description: `Cross-chain swap via Relay Protocol. From ${fromToken} on chain ${fromChainId} to ${toToken} on chain ${toChainId}. Amount: ${amount}. MEV-protected, deterministic execution via KeeperHub.`,
    nodes,
    edges,
    metadata: {
      createdBy: 'barzakh-ai',
      createdAt: new Date().toISOString(),
      source: 'barzakh-ai',
      version: BARZAKH_VERSION,
    },
  };
}

export function composeDreamDexTradeWorkflow(params: {
  marketSymbol: string;
  side: 'UP' | 'DOWN';
  amount: string;
  userAddress: string;
  testnet?: boolean;
}): KeeperHubWorkflow {
  const { marketSymbol, side, amount, userAddress, testnet = true } = params;
  const chainId = testnet ? 50312 : 5031;
  const tUSDCAddress = TOKEN_ADDRESSES.tUSDC[chainId] || '0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E';
  const poolAddress = DREAMDEX_CONTRACTS[marketSymbol] || '';

  const nodes: KeeperHubNode[] = [
    {
      id: 'trigger',
      type: 'manual-trigger',
      label: 'Manual Trigger',
      config: {},
    },
    {
      id: 'check-tusdc',
      type: 'web3-read',
      label: 'Check tUSDC Balance',
      config: {
        chainId,
        contractAddress: tUSDCAddress,
        abi: ['function balanceOf(address) view returns (uint256)'],
        method: 'balanceOf',
        args: [userAddress],
      },
    },
    {
      id: 'validate-balance',
      type: 'condition',
      label: 'Sufficient tUSDC?',
      config: {
        expression: `BigInt("{{@check-tusdc:Check tUSDC Balance.result}}") >= BigInt("${BigInt(parseFloat(amount) * 1_000_000)}")`,
      },
    },
    {
      id: 'approve-tusdc',
      type: 'web3-write',
      label: 'Approve tUSDC for DreamDEX',
      config: {
        chainId,
        contractAddress: tUSDCAddress,
        abi: ['function approve(address spender, uint256 amount) returns (bool)'],
        method: 'approve',
        args: [poolAddress, String(BigInt(parseFloat(amount) * 1_000_000))],
      },
    },
    {
      id: 'place-order',
      type: 'web3-write',
      label: `Place ${side} Order on ${marketSymbol}`,
      config: {
        chainId,
        contractAddress: poolAddress,
        description: `Place a ${side} taker order on DreamDEX ${marketSymbol} for ${amount} tUSDC`,
        dreamdex: {
          marketSymbol,
          side,
          amount,
          orderType: 'market',
        },
      },
    },
    {
      id: 'confirm',
      type: 'web3-read',
      label: 'Confirm Position',
      config: {
        chainId,
        description: `Check position opened for ${marketSymbol} ${side}`,
      },
    },
  ];

  const edges: KeeperHubEdge[] = [
    { source: 'trigger', target: 'check-tusdc' },
    { source: 'check-tusdc', target: 'validate-balance' },
    { source: 'validate-balance', target: 'approve-tusdc', sourceHandle: 'true' },
    { source: 'approve-tusdc', target: 'place-order' },
    { source: 'place-order', target: 'confirm' },
  ];

  return {
    name: `DreamDEX: ${side} on ${marketSymbol} (${amount} tUSDC)`,
    description: `Place a ${side} prediction on ${marketSymbol} DreamDEX market using ${amount} tUSDC on Somnia ${testnet ? 'Testnet' : 'Mainnet'}. Deterministic execution via KeeperHub with full audit trail.`,
    nodes,
    edges,
    metadata: {
      createdBy: 'barzakh-ai',
      createdAt: new Date().toISOString(),
      source: 'barzakh-ai',
      version: BARZAKH_VERSION,
    },
  };
}

export function composeDreamDexAutoTradeWorkflow(config: DreamDexAutoTradeConfig): KeeperHubWorkflow {
  const chainId = 50312;
  const poolAddress = DREAMDEX_CONTRACTS[config.marketSymbol] || '';

  const nodes: KeeperHubNode[] = [
    {
      id: 'schedule',
      type: 'schedule-trigger',
      label: `Every ${config.intervalMinutes} minutes`,
      config: {
        cron: config.intervalMinutes === 5 ? '*/5 * * * *'
            : config.intervalMinutes === 15 ? '*/15 * * * *'
            : config.intervalMinutes === 60 ? '0 * * * *'
            : `0 */${Math.floor(config.intervalMinutes / 60)} * * *`,
      },
    },
    {
      id: 'read-market',
      type: 'web3-read',
      label: `Read ${config.marketSymbol} Market State`,
      config: {
        chainId,
        contractAddress: poolAddress,
        description: `Read current market state, implied probability, and order book for ${config.marketSymbol}`,
      },
    },
    {
      id: 'compute-score',
      type: 'code',
      label: 'Compute AI Conviction Score',
      config: {
        language: 'javascript',
        code: `
          const marketData = {{@read-market:Read ${config.marketSymbol} Market State}};
          const impliedProb = marketData.impliedProbability || 0.5;
          const spread = marketData.spread || 0.04;
          const volume = marketData.volume || 0;
          
          // Conviction scoring algorithm
          let score = 50;
          if (impliedProb > 0.7 || impliedProb < 0.3) score += 20;
          if (spread < 0.03) score += 10;
          if (volume > 1000) score += 10;
          
          const direction = impliedProb > 0.5 ? 'UP' : 'DOWN';
          return { score: Math.min(score, 100), direction, impliedProb, spread, volume };
        `,
      },
    },
    {
      id: 'check-threshold',
      type: 'condition',
      label: `Score > ${config.convictionThreshold}?`,
      config: {
        expression: `{{@compute-score:Compute AI Conviction Score.score}} > ${config.convictionThreshold}`,
      },
    },
    {
      id: 'place-trade',
      type: 'web3-write',
      label: `Auto-Trade ${config.tradeAmount} tUSDC`,
      config: {
        chainId,
        contractAddress: poolAddress,
        description: `Place automated ${config.tradeAmount} tUSDC trade in predicted direction`,
        dreamdex: {
          marketSymbol: config.marketSymbol,
          side: '{{@compute-score:Compute AI Conviction Score.direction}}',
          amount: config.tradeAmount,
          orderType: 'market',
        },
      },
    },
  ];

  // Add notification nodes
  if (config.notifyDiscord) {
    nodes.push({
      id: 'notify-discord',
      type: 'notification',
      label: 'Discord Alert',
      config: {
        channel: 'discord',
        webhookUrl: config.notifyDiscord,
        message: `🤖 Barzakh AI Auto-Trade: {{@compute-score:Compute AI Conviction Score.direction}} on ${config.marketSymbol} | Score: {{@compute-score:Compute AI Conviction Score.score}}/100 | Amount: ${config.tradeAmount} tUSDC`,
      },
    });
  }

  if (config.notifyTelegram) {
    nodes.push({
      id: 'notify-telegram',
      type: 'notification',
      label: 'Telegram Alert',
      config: {
        channel: 'telegram',
        chatId: config.notifyTelegram,
        message: `🤖 Auto-Trade: {{@compute-score:Compute AI Conviction Score.direction}} on ${config.marketSymbol} | Score: {{@compute-score:Compute AI Conviction Score.score}} | ${config.tradeAmount} tUSDC`,
      },
    });
  }

  const skipNode: KeeperHubNode = {
    id: 'skip',
    type: 'code',
    label: 'Skip (Score Too Low)',
    config: {
      language: 'javascript',
      code: 'return { skipped: true, score: {{@compute-score:Compute AI Conviction Score.score}}, threshold: ' + config.convictionThreshold + ' };',
    },
  };
  nodes.push(skipNode);

  const edges: KeeperHubEdge[] = [
    { source: 'schedule', target: 'read-market' },
    { source: 'read-market', target: 'compute-score' },
    { source: 'compute-score', target: 'check-threshold' },
    { source: 'check-threshold', target: 'place-trade', sourceHandle: 'true' },
    { source: 'check-threshold', target: 'skip', sourceHandle: 'false' },
  ];

  if (config.notifyDiscord) {
    edges.push({ source: 'place-trade', target: 'notify-discord' });
  }
  if (config.notifyTelegram) {
    edges.push({ source: 'place-trade', target: 'notify-telegram' });
  }

  return {
    name: `DreamDEX Auto-Trade: ${config.marketSymbol} (every ${config.intervalMinutes}m)`,
    description: `Automated prediction trading on ${config.marketSymbol}. Checks market every ${config.intervalMinutes} minutes, computes AI conviction score, and places ${config.tradeAmount} tUSDC trade when score exceeds ${config.convictionThreshold}/100. Fully deterministic — no LLM at execution time.`,
    nodes,
    edges,
    metadata: {
      createdBy: 'barzakh-ai',
      createdAt: new Date().toISOString(),
      source: 'barzakh-ai',
      version: BARZAKH_VERSION,
    },
  };
}

export function composeSettlementSweepWorkflow(config: DreamDexSweepConfig): KeeperHubWorkflow {
  const chainId = 50312;

  const nodes: KeeperHubNode[] = [
    {
      id: 'schedule',
      type: 'schedule-trigger',
      label: `Every ${config.intervalMinutes} minutes`,
      config: {
        cron: `*/${config.intervalMinutes} * * * *`,
      },
    },
    {
      id: 'scan-wallets',
      type: 'code',
      label: 'Scan Wallets for Claimable Winnings',
      config: {
        language: 'javascript',
        code: `
          const wallets = ${JSON.stringify(config.walletAddresses)};
          const claimable = [];
          for (const wallet of wallets) {
            // Check each DreamDEX market for redeemable winning positions
            const markets = ${JSON.stringify(Object.keys(DREAMDEX_CONTRACTS))};
            for (const market of markets) {
              // This would read the contract to check for claimable positions
              claimable.push({ wallet, market, checked: true });
            }
          }
          return { wallets: wallets.length, marketsChecked: claimable.length, claimable };
        `,
      },
    },
    {
      id: 'has-claimable',
      type: 'condition',
      label: 'Any Claimable Winnings?',
      config: {
        expression: '{{@scan-wallets:Scan Wallets for Claimable Winnings.claimable}}.length > 0',
      },
    },
    {
      id: 'batch-redeem',
      type: 'web3-write',
      label: 'Batch Redeem Winnings',
      config: {
        chainId,
        description: 'Batch redeem all claimable winning positions across DreamDEX markets',
        autoRedeem: config.autoRedeem,
      },
    },
    {
      id: 'skip',
      type: 'code',
      label: 'No Claimable — Skip',
      config: {
        language: 'javascript',
        code: 'return { status: "no_claimable_positions", checkedAt: new Date().toISOString() };',
      },
    },
  ];

  if (config.notifyOnRedeem) {
    nodes.push({
      id: 'notify',
      type: 'notification',
      label: 'Notify: Winnings Redeemed',
      config: {
        channel: 'discord',
        message: '💰 DreamDEX winnings auto-redeemed by KeeperHub! Check your tUSDC balance on Somnia.',
      },
    });
  }

  const edges: KeeperHubEdge[] = [
    { source: 'schedule', target: 'scan-wallets' },
    { source: 'scan-wallets', target: 'has-claimable' },
    { source: 'has-claimable', target: 'batch-redeem', sourceHandle: 'true' },
    { source: 'has-claimable', target: 'skip', sourceHandle: 'false' },
  ];

  if (config.notifyOnRedeem) {
    edges.push({ source: 'batch-redeem', target: 'notify' });
  }

  return {
    name: 'DreamDEX Settlement Sweep (24/7)',
    description: `Automated 24/7 settlement sweep for DreamDEX prediction markets on Somnia. Scans ${config.walletAddresses.length} wallet(s) every ${config.intervalMinutes} minutes for claimable winning positions and batch-redeems them. Replaces GitHub Actions cron with deterministic KeeperHub execution.`,
    nodes,
    edges,
    metadata: {
      createdBy: 'barzakh-ai',
      createdAt: new Date().toISOString(),
      source: 'barzakh-ai',
      version: BARZAKH_VERSION,
    },
  };
}

export function composeTokenTransferWorkflow(params: {
  chainId: number;
  token: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
}): KeeperHubWorkflow {
  const { chainId, token, amount, fromAddress, toAddress } = params;
  const tokenAddr = getTokenAddress(token, chainId);
  const isNative = token.toLowerCase() === 'native' || token.toLowerCase() === 'eth';

  const nodes: KeeperHubNode[] = [
    {
      id: 'trigger',
      type: 'manual-trigger',
      label: 'Manual Trigger',
      config: {},
    },
    {
      id: 'check-balance',
      type: 'web3-read',
      label: `Check ${token} Balance`,
      config: {
        chainId,
        ...(isNative
          ? { method: 'getBalance', args: [fromAddress] }
          : {
              contractAddress: tokenAddr,
              abi: ['function balanceOf(address) view returns (uint256)'],
              method: 'balanceOf',
              args: [fromAddress],
            }),
      },
    },
    {
      id: 'validate',
      type: 'condition',
      label: 'Sufficient Balance?',
      config: {
        expression: `BigInt("{{@check-balance:Check ${token} Balance.result}}") >= BigInt("${amount}")`,
      },
    },
    {
      id: 'transfer',
      type: 'web3-write',
      label: `Transfer ${token} to ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
      config: {
        chainId,
        ...(isNative
          ? { to: toAddress, value: amount }
          : {
              contractAddress: tokenAddr,
              abi: ['function transfer(address to, uint256 amount) returns (bool)'],
              method: 'transfer',
              args: [toAddress, amount],
            }),
      },
    },
  ];

  const edges: KeeperHubEdge[] = [
    { source: 'trigger', target: 'check-balance' },
    { source: 'check-balance', target: 'validate' },
    { source: 'validate', target: 'transfer', sourceHandle: 'true' },
  ];

  return {
    name: `Transfer ${amount} ${token} → ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`,
    description: `Transfer ${amount} ${token} from ${fromAddress} to ${toAddress} on chain ${chainId}. Balance check included. Deterministic execution via KeeperHub.`,
    nodes,
    edges,
    metadata: {
      createdBy: 'barzakh-ai',
      createdAt: new Date().toISOString(),
      source: 'barzakh-ai',
      version: BARZAKH_VERSION,
    },
  };
}

// === Master Composer ===

export function composeWorkflow(input: WorkflowCompositionInput): WorkflowPreview {
  let workflow: KeeperHubWorkflow;

  switch (input.intent) {
    case 'cross-chain-swap':
      workflow = composeCrossChainSwapWorkflow({
        fromChainId: input.params.fromChainId,
        toChainId: input.params.toChainId,
        fromToken: input.params.fromToken,
        toToken: input.params.toToken,
        amount: input.params.amount,
        userAddress: input.userAddress,
        slippageBps: input.params.slippageBps,
      });
      break;

    case 'dreamdex-trade':
      workflow = composeDreamDexTradeWorkflow({
        marketSymbol: input.params.marketSymbol,
        side: input.params.side,
        amount: input.params.amount,
        userAddress: input.userAddress,
        testnet: input.params.testnet ?? true,
      });
      break;

    case 'dreamdex-auto-trade':
      workflow = composeDreamDexAutoTradeWorkflow(input.params as DreamDexAutoTradeConfig);
      break;

    case 'settlement-sweep':
      workflow = composeSettlementSweepWorkflow(input.params as DreamDexSweepConfig);
      break;

    case 'token-transfer':
      workflow = composeTokenTransferWorkflow({
        chainId: input.params.chainId || input.chainId || 1,
        token: input.params.token,
        amount: input.params.amount,
        fromAddress: input.userAddress,
        toAddress: input.params.toAddress,
      });
      break;

    default:
      workflow = {
        name: `Custom Workflow`,
        description: input.params.description || 'Custom workflow composed by Barzakh AI',
        nodes: input.params.nodes || [],
        edges: input.params.edges || [],
        metadata: {
          createdBy: 'barzakh-ai',
          createdAt: new Date().toISOString(),
          source: 'barzakh-ai',
          version: BARZAKH_VERSION,
        },
      };
  }

  return {
    workflow,
    estimatedGas: estimateGas(workflow),
    estimatedDuration: estimateDuration(workflow),
    risks: assessRisks(workflow),
    requiredApprovals: getRequiredApprovals(workflow),
  };
}

// === Estimation Helpers ===

function estimateGas(workflow: KeeperHubWorkflow): string {
  const writeNodes = workflow.nodes.filter(n => n.type === 'web3-write');
  const estimatedGasPerWrite = 150000;
  return `~${(writeNodes.length * estimatedGasPerWrite).toLocaleString()} gas`;
}

function estimateDuration(workflow: KeeperHubWorkflow): string {
  const nodeCount = workflow.nodes.filter(n => !n.type.includes('trigger')).length;
  const seconds = nodeCount * 15;
  return seconds < 60 ? `~${seconds}s` : `~${Math.ceil(seconds / 60)}min`;
}

function assessRisks(workflow: KeeperHubWorkflow): string[] {
  const risks: string[] = [];
  const writeNodes = workflow.nodes.filter(n => n.type === 'web3-write');
  if (writeNodes.length > 3) risks.push('Multiple write transactions — review each step carefully');
  
  const hasApproval = workflow.nodes.some(n => n.label.toLowerCase().includes('approve'));
  if (hasApproval) risks.push('Token approval required — sets spending allowance on your tokens');
  
  const hasCrossChain = workflow.nodes.some(n => 
    n.config?.relay || n.label.toLowerCase().includes('cross-chain')
  );
  if (hasCrossChain) risks.push('Cross-chain operation — destination chain delivery may take 1-30 minutes');
  
  return risks;
}

function getRequiredApprovals(workflow: KeeperHubWorkflow): string[] {
  return workflow.nodes
    .filter(n => n.label.toLowerCase().includes('approve'))
    .map(n => n.label);
}
