/**
 * KeeperHub Integration Types
 * 
 * Type definitions for KeeperHub workflow automation platform integration.
 * Used by Barzakh AI to compose, execute, and audit deterministic onchain workflows.
 * 
 * @see https://docs.keeperhub.com
 */

// === Workflow Schema ===

export interface KeeperHubWorkflow {
  id?: string;
  name: string;
  description?: string;
  slug?: string;
  nodes: KeeperHubNode[];
  edges: KeeperHubEdge[];
  metadata?: {
    createdBy: string;
    createdAt?: string;
    source: 'barzakh-ai';
    version: string;
  };
}

export type KeeperHubNodeType = 
  | 'manual-trigger'
  | 'schedule-trigger'
  | 'webhook-trigger'
  | 'event-trigger'
  | 'block-trigger'
  | 'web3-read'
  | 'web3-write'
  | 'code'
  | 'math'
  | 'condition'
  | 'notification'
  | 'safe';

export interface KeeperHubNode {
  id: string;
  type: KeeperHubNodeType;
  label: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface KeeperHubEdge {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string; // e.g., 'true' / 'false' for condition nodes
}

// === Execution ===

export type KeeperHubExecutionStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'dry-run';

export interface KeeperHubExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: KeeperHubExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  nodeResults: KeeperHubNodeResult[];
  error?: string;
  transactionHashes?: string[];
  auditUrl?: string;
  gasUsed?: string;
  gasCost?: string;
}

export interface KeeperHubNodeResult {
  nodeId: string;
  nodeLabel: string;
  status: 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  transactionHash?: string;
  gasUsed?: string;
  duration?: number;
}

// === API Client Types ===

export interface KeeperHubClientConfig {
  mcpEndpoint: string;
  apiEndpoint: string;
  apiKey?: string;
  accessToken?: string;
}

export interface KeeperHubApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// === Workflow Composition ===

export type WorkflowIntent = 
  | 'cross-chain-swap'
  | 'token-transfer'
  | 'dreamdex-trade'
  | 'dreamdex-redeem'
  | 'dreamdex-auto-trade'
  | 'settlement-sweep'
  | 'defi-operation'
  | 'custom';

export interface WorkflowCompositionInput {
  intent: WorkflowIntent;
  params: Record<string, any>;
  userAddress: string;
  chainId?: number;
  dryRun?: boolean;
}

export interface WorkflowPreview {
  workflow: KeeperHubWorkflow;
  estimatedGas?: string;
  estimatedCost?: string;
  estimatedDuration?: string;
  risks?: string[];
  requiredApprovals?: string[];
}

// === MCP Tool Schemas ===

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'resource';
    text?: string;
    resource?: any;
  }>;
  isError?: boolean;
}

// === Audit Trail ===

export interface KeeperHubAuditEntry {
  id: string;
  executionId: string;
  timestamp: string;
  action: string;
  details: Record<string, any>;
  transactionHash?: string;
  chainId?: number;
  blockNumber?: number;
  status: 'success' | 'failed' | 'pending';
}

export interface KeeperHubAuditTrail {
  executionId: string;
  workflowName: string;
  entries: KeeperHubAuditEntry[];
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalGasUsed: string;
    totalGasCost: string;
    transactionHashes: string[];
  };
}

// === Supported Chains ===

export const KEEPERHUB_SUPPORTED_CHAINS: Record<number, string> = {
  1: 'Ethereum Mainnet',
  8453: 'Base',
  42161: 'Arbitrum One',
  10: 'Optimism',
  137: 'Polygon',
  56: 'BNB Chain',
  43114: 'Avalanche',
  100: 'Gnosis',
  50312: 'Somnia Shannon Testnet',
  11155111: 'Sepolia Testnet',
};

// === DreamDEX Workflow Templates ===

export interface DreamDexAutoTradeConfig {
  marketSymbol: string;
  convictionThreshold: number; // 0-100
  tradeAmount: string; // in tUSDC
  intervalMinutes: number; // 5, 15, 60, 240
  maxTradesPerDay: number;
  notifyDiscord?: string;
  notifyTelegram?: string;
}

export interface DreamDexSweepConfig {
  walletAddresses: string[];
  autoRedeem: boolean;
  notifyOnRedeem?: boolean;
  intervalMinutes: number;
}
