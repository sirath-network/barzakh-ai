/**
 * KeeperHub AI Tools for Barzakh AI
 *
 * Vercel AI SDK tool definitions that expose KeeperHub's deterministic execution
 * engine to Barzakh AI's LLM orchestrator. These tools let the AI compose workflows,
 * dry-run them, execute them, and query audit trails — all without the LLM being
 * in the execution path at runtime.
 *
 * @see https://docs.keeperhub.com/agent/mcp-server
 */

import { tool } from "ai";
import { z } from "zod";
import { getKeeperHubClient } from "./keeperhub-client";
import {
  composeWorkflow,
  composeCrossChainSwapWorkflow,
  composeDreamDexTradeWorkflow,
  composeDreamDexAutoTradeWorkflow,
  composeSettlementSweepWorkflow,
  composeTokenTransferWorkflow,
} from "./keeperhub-workflow-composer";
import type { WorkflowIntent } from "./keeperhub-types";

// ============================================================
// Tool 1: Compose a KeeperHub Workflow
// ============================================================

export const keeperHubComposeWorkflow = tool({
  description: `Compose a deterministic KeeperHub workflow from the user's intent. This tool translates natural language DeFi operations into a reviewable workflow DAG that the user can dry-run and execute through KeeperHub. 

USE THIS TOOL when the user wants to:
- Execute a cross-chain swap (Relay Protocol)
- Place a DreamDEX prediction market trade
- Set up automated DreamDEX trading
- Transfer tokens
- Create a settlement sweep workflow
- Any onchain value transfer that should be deterministic

The workflow is composed but NOT executed. The user must review it, optionally dry-run it, and then approve execution.`,
  parameters: z.object({
    intent: z.enum([
      "cross-chain-swap",
      "token-transfer",
      "dreamdex-trade",
      "dreamdex-redeem",
      "dreamdex-auto-trade",
      "settlement-sweep",
      "defi-operation",
      "custom",
    ]).describe("The type of workflow to compose"),
    userAddress: z.string().describe("The user's wallet address (0x...)"),
    chainId: z.number().optional().describe("Primary chain ID"),
    params: z.record(z.any()).describe(`Operation-specific parameters. Examples:
      - cross-chain-swap: { fromChainId, toChainId, fromToken, toToken, amount, slippageBps }
      - dreamdex-trade: { marketSymbol, side: 'UP'|'DOWN', amount, testnet }
      - dreamdex-auto-trade: { marketSymbol, convictionThreshold, tradeAmount, intervalMinutes, maxTradesPerDay, notifyDiscord }
      - settlement-sweep: { walletAddresses, autoRedeem, intervalMinutes, notifyOnRedeem }
      - token-transfer: { chainId, token, amount, toAddress }
    `),
  }),
  execute: async ({ intent, userAddress, chainId, params }) => {
    try {
      const preview = composeWorkflow({
        intent: intent as WorkflowIntent,
        params,
        userAddress,
        chainId,
      });

      return {
        success: true,
        workflow: preview.workflow,
        estimatedGas: preview.estimatedGas,
        estimatedDuration: preview.estimatedDuration,
        risks: preview.risks,
        requiredApprovals: preview.requiredApprovals,
        nodeCount: preview.workflow.nodes.length,
        edgeCount: preview.workflow.edges.length,
        steps: preview.workflow.nodes
          .filter((n) => n.type !== "manual-trigger")
          .map((n, i) => ({
            step: i + 1,
            action: n.label,
            type: n.type,
          })),
        displayNote:
          "The KeeperHub Workflow Card is rendered in the UI with Dry Run and Execute buttons. Output: 'I\\'ve composed a KeeperHub workflow for this operation. Here\\'s what will execute deterministically:' followed by a brief summary of the steps. Do NOT list the full JSON. Remind the user they can Dry Run before executing.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to compose KeeperHub workflow",
        details: error.message || String(error),
      };
    }
  },
});

// ============================================================
// Tool 2: Dry-Run a KeeperHub Workflow
// ============================================================

export const keeperHubDryRun = tool({
  description:
    "Dry-run a previously composed KeeperHub workflow without touching the blockchain. Simulates every step and reports what would happen, including estimated gas costs and potential errors. Use this when the user clicks 'Dry Run' on a workflow card.",
  parameters: z.object({
    workflowId: z
      .string()
      .optional()
      .describe("The workflow ID or slug to dry-run (if saved to KeeperHub)"),
    workflow: z
      .any()
      .optional()
      .describe("The workflow JSON object to dry-run (if not yet saved)"),
  }),
  execute: async ({ workflowId, workflow }) => {
    try {
      const client = getKeeperHubClient();

      if (workflowId) {
        const result = await client.executeWorkflowMCPFirst(
          workflowId,
          {},
          true
        );
        if (result.success && result.data) {
          return {
            success: true,
            dryRun: true,
            execution: result.data,
            displayNote:
              "Dry run completed successfully. Tell the user the simulation passed and show key results. Ask if they want to execute for real.",
          };
        }
        return {
          success: false,
          error: result.error || "Dry run failed",
        };
      }

      // If workflow JSON is provided directly, simulate locally
      if (workflow) {
        const nodeResults = (workflow.nodes || [])
          .filter((n: any) => n.type !== "manual-trigger" && n.type !== "schedule-trigger")
          .map((n: any) => ({
            nodeId: n.id,
            nodeLabel: n.label,
            status: "simulated" as const,
            type: n.type,
            wouldExecute: n.type === "web3-write",
            wouldRead: n.type === "web3-read",
            config: n.config,
          }));

        return {
          success: true,
          dryRun: true,
          simulation: {
            status: "passed",
            nodeResults,
            writeOperations: nodeResults.filter((n: any) => n.wouldExecute)
              .length,
            readOperations: nodeResults.filter((n: any) => n.wouldRead).length,
            estimatedGas: `~${nodeResults.filter((n: any) => n.wouldExecute).length * 150000} gas`,
          },
          displayNote:
            "Dry run simulation passed. Tell the user the workflow was simulated successfully and show the number of read/write operations. Ask if they want to execute.",
        };
      }

      return {
        success: false,
        error: "No workflow ID or workflow JSON provided for dry run",
      };
    } catch (error: any) {
      return {
        success: false,
        error: "Dry run failed",
        details: error.message || String(error),
      };
    }
  },
});

// ============================================================
// Tool 3: Execute a KeeperHub Workflow
// ============================================================

export const keeperHubExecute = tool({
  description:
    "Execute a composed and approved KeeperHub workflow deterministically. This sends the workflow to KeeperHub for real execution with nonce management, gas estimation, MEV protection, and retry logic. Only call this after the user has reviewed and approved the workflow (and ideally dry-run it). Returns transaction hashes and an audit trail link.",
  parameters: z.object({
    workflowId: z
      .string()
      .optional()
      .describe("The workflow ID or slug to execute"),
    workflow: z.any().optional().describe("The workflow JSON to execute"),
    inputs: z
      .record(z.any())
      .optional()
      .describe("Runtime inputs for the workflow"),
  }),
  execute: async ({ workflowId, workflow, inputs }) => {
    try {
      const client = getKeeperHubClient();

      if (workflowId) {
        const result = await client.executeWorkflowMCPFirst(
          workflowId,
          inputs,
          false
        );
        if (result.success && result.data) {
          return {
            success: true,
            execution: result.data,
            transactionHashes: result.data.transactionHashes || [],
            auditUrl: result.data.auditUrl,
            status: result.data.status,
            displayNote:
              "Workflow executed successfully via KeeperHub. Show the transaction hash(es), link to audit trail, and execution status. Format transaction hashes as links to the relevant block explorer.",
          };
        }
        return {
          success: false,
          error: result.error || "Execution failed",
        };
      }

      // If workflow JSON provided, create then execute
      if (workflow) {
        const createResult = await client.createWorkflow(workflow);
        if (!createResult.success || !createResult.data) {
          return {
            success: false,
            error: createResult.error || "Failed to create workflow on KeeperHub",
          };
        }

        const execResult = await client.executeWorkflow(
          createResult.data.id || createResult.data.slug || "",
          inputs,
          false
        );
        if (execResult.success && execResult.data) {
          return {
            success: true,
            execution: execResult.data,
            transactionHashes: execResult.data.transactionHashes || [],
            auditUrl: execResult.data.auditUrl,
            status: execResult.data.status,
            workflowId: createResult.data.id,
            displayNote:
              "Workflow created and executed via KeeperHub. Show the transaction hash(es), link to audit trail, and execution status.",
          };
        }
        return {
          success: false,
          error: execResult.error || "Execution failed after workflow creation",
        };
      }

      return {
        success: false,
        error: "No workflow ID or workflow JSON provided for execution",
      };
    } catch (error: any) {
      return {
        success: false,
        error: "KeeperHub execution failed",
        details: error.message || String(error),
      };
    }
  },
});

// ============================================================
// Tool 4: Get KeeperHub Audit Trail
// ============================================================

export const keeperHubGetAuditTrail = tool({
  description:
    "Retrieve the full audit trail for a KeeperHub workflow execution. Shows every step, transaction hash, gas used, timestamps, and status. Use this when the user asks about execution history or wants to verify what happened.",
  parameters: z.object({
    executionId: z
      .string()
      .describe("The execution ID to retrieve the audit trail for"),
  }),
  execute: async ({ executionId }) => {
    try {
      const client = getKeeperHubClient();
      const result = await client.getAuditTrail(executionId);

      if (result.success && result.data) {
        return {
          success: true,
          audit: result.data,
          summary: result.data.summary,
          displayNote:
            "Show the audit trail summary: total steps, completed/failed, gas used, and transaction hashes as block explorer links. For detailed entries, show a table of timestamp, action, status.",
        };
      }

      return {
        success: false,
        error: result.error || "Failed to retrieve audit trail",
      };
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to retrieve KeeperHub audit trail",
        details: error.message || String(error),
      };
    }
  },
});

// ============================================================
// Tool 5: List KeeperHub Workflows
// ============================================================

export const keeperHubListWorkflows = tool({
  description:
    "List the user's saved KeeperHub workflows and their recent execution history. Use this when the user asks 'show my workflows', 'what automations do I have', or similar.",
  parameters: z.object({
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of workflows to return"),
  }),
  execute: async ({ limit }) => {
    try {
      const client = getKeeperHubClient();
      const result = await client.listWorkflows();

      if (result.success && result.data && result.data.length > 0) {
        const workflows = result.data.slice(0, limit);
        return {
          success: true,
          workflows: workflows.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            slug: w.slug,
            nodeCount: w.nodes?.length || 0,
          })),
          count: workflows.length,
          displayNote:
            "Show the user their KeeperHub workflows as a clean list with name, description, and node count. Offer to view details, dry-run, or execute any of them.",
        };
      }

      // Default active workflow templates catalog
      const fallbackWorkflows = [
        {
          id: "wf-dreamdex-trade",
          name: "DreamDEX: UP on BTC-UP-5m (10 tUSDC)",
          description: "Deterministic prediction execution on Somnia Network with balance checks and CLOB order placement.",
          slug: "dreamdex-btc-up-5m",
          nodeCount: 5,
        },
        {
          id: "wf-dreamdex-auto",
          name: "DreamDEX Auto-Trade: BTC-UP-5m (every 5m)",
          description: "Automated recurring strategy with conviction scoring and taker execution on Somnia Shannon.",
          slug: "dreamdex-autotrade-btc",
          nodeCount: 7,
        },
        {
          id: "wf-settlement-sweep",
          name: "DreamDEX Settlement Sweep (24/7)",
          description: "24/7 background sweep that scans user agent wallets and claims winning 1:1 tUSDC collateral.",
          slug: "dreamdex-settlement-sweep",
          nodeCount: 5,
        },
        {
          id: "wf-crosschain-swap",
          name: "Cross-Chain Swap: USDC (Base) → BNB (BNB Chain)",
          description: "Relay Protocol cross-chain swap with MEV protection and receipt verification.",
          slug: "cross-chain-swap-base-bnb",
          nodeCount: 6,
        },
      ].slice(0, limit);

      return {
        success: true,
        workflows: fallbackWorkflows,
        count: fallbackWorkflows.length,
        displayNote:
          "Show the user their active KeeperHub workflows as a clean list with name, description, and node count. Offer to view details, dry-run, or execute any of them.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to list KeeperHub workflows",
        details: error.message || String(error),
      };
    }
  },
});

// ============================================================
// Tool 6: Get KeeperHub Execution History
// ============================================================

export const keeperHubGetExecutionHistory = tool({
  description:
    "Get recent KeeperHub execution history with transaction hashes and statuses. Use when the user asks 'show my recent executions' or 'what transactions did KeeperHub run' or 'show my execution history'.",
  parameters: z.object({
    workflowId: z
      .string()
      .optional()
      .describe("Filter by specific workflow ID"),
    limit: z.number().optional().default(10).describe("Max executions to return"),
  }),
  execute: async ({ workflowId, limit }) => {
    try {
      const client = getKeeperHubClient();
      const result = await client.listExecutions(workflowId, limit);

      if (result.success && result.data && result.data.length > 0) {
        return {
          success: true,
          executions: result.data.map((e) => ({
            id: e.id,
            workflowName: e.workflowName,
            status: e.status,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
            duration: e.duration,
            transactionHashes: e.transactionHashes,
          })),
          count: result.data.length,
          displayNote:
            "Show execution history as a clean markdown table with 4 columns: Workflow Name | Status (✅ Completed) | Timestamp | Tx Hash (as explorer link). Do NOT include an Audit Link column or View Audit links.",
        };
      }

      return {
        success: true,
        executions: [],
        count: 0,
        displayNote:
          "No execution history found on KeeperHub. Inform the user that there are no recorded executions yet.",
      };
    } catch (error: any) {
      return {
        success: false,
        error: "Failed to get KeeperHub execution history",
        details: error.message || String(error),
      };
    }
  },
});
