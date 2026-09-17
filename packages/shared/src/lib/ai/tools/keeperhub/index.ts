// KeeperHub Integration — Deterministic Execution Layer for Barzakh AI
// Barrel export for the KeeperHub workflow automation tool module

// === AI Tools (for LLM orchestrator) ===
export {
  keeperHubComposeWorkflow,
  keeperHubDryRun,
  keeperHubExecute,
  keeperHubGetAuditTrail,
  keeperHubListWorkflows,
  keeperHubGetExecutionHistory,
} from "./keeperhub-tools";

// === Client ===
export {
  KeeperHubClient,
  getKeeperHubClient,
  createKeeperHubClient,
} from "./keeperhub-client";

// === Workflow Composers & Templates ===
export {
  composeWorkflow,
  composeCrossChainSwapWorkflow,
  composeDreamDexTradeWorkflow,
  composeDreamDexAutoTradeWorkflow,
  composeSettlementSweepWorkflow,
  composeTokenTransferWorkflow,
} from "./keeperhub-workflow-composer";

export {
  getAutoTradeWorkflowTemplate,
  getSettlementSweepWorkflowTemplate,
} from "./dreamdex-workflow-templates";

// === Types ===
export type {
  KeeperHubWorkflow,
  KeeperHubNode,
  KeeperHubEdge,
  KeeperHubNodeType,
  KeeperHubExecution,
  KeeperHubExecutionStatus,
  KeeperHubNodeResult,
  KeeperHubClientConfig,
  KeeperHubApiResponse,
  KeeperHubAuditEntry,
  KeeperHubAuditTrail,
  WorkflowIntent,
  WorkflowCompositionInput,
  WorkflowPreview,
  DreamDexAutoTradeConfig,
  DreamDexSweepConfig,
  MCPToolCall,
  MCPToolResult,
} from "./keeperhub-types";

export { KEEPERHUB_SUPPORTED_CHAINS } from "./keeperhub-types";
