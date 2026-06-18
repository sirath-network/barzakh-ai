import { tool } from "ai";
import { z } from "zod";
import { getSuiAgentWalletSnapshot } from "@/lib/agent/sui-agent-executor";

const networkSchema = z.enum(["mainnet", "testnet", "devnet"]);

const STRATEGIES = {
  bridge: {
    title: "Wormhole Sui Bridge Agent",
    currentAutonomy: "Plan Wormhole routes into/out of Sui, prefer CCTP for native USDC where supported, use WTT/TokenBridge or Connect otherwise, and track transfers in Wormholescan. Execution is planner-first while SDK/Connect signing is wired.",
    actions: [
      "Validate source chain, destination chain, asset, amount, and recipient.",
      "Choose CCTP for native USDC where supported; otherwise choose WTT/TokenBridge or Wormhole Connect.",
      "Avoid Sui Native Bridge claim automation because verified-before-claim loops were observed.",
      "Track source tx and relay status via Wormholescan / Executor status APIs.",
    ],
  },
  lp: {
    title: "Sui LP / Yield Scout",
    currentAutonomy: "Scout LP/yield opportunities across Cetus, Turbos, Aftermath, Navi, Suilend, and Scallop. Execution needs protocol-specific SDK allowlists.",
    actions: [
      "Compare candidate pools/markets by token, TVL, APR/APY, volume, and risk.",
      "Produce range/liquidity or lend/deposit plan with budget and exit rules.",
      "Block execution if protocol SDK/package is not allowlisted or health/range constraints are unknown.",
    ],
  },
  walrus: {
    title: "Walrus Memory Agent",
    currentAutonomy: "Prepare verifiable agent memory records and upload them to Walrus storage.",
    actions: [
      "Summarize agent plan, tool calls, risk checks, and tx digests.",
      "Package into canonical JSON for Walrus blob storage.",
      "Upload to Walrus using uploadToWalrus tool and retrieve later with getWalrusBlob.",
    ],
  },
} as const;

export const createPlanSuiDeFiAgentStrategyTool = (userId: string) =>
  tool({
    description:
      "Plan an autonomous Sui DeFi/Agentic Web strategy for Barzakh's embedded Sui wallet. Covers bridge, LP/yield scouting, and Walrus memory. This is a planning/risk tool, not an execution tool.",
    parameters: z.object({
      strategy: z.enum(["bridge", "lp", "walrus"]),
      network: networkSchema.optional().describe("Sui network to inspect. Defaults to testnet."),
      budgetSui: z.string().optional().describe("Optional SUI budget for the strategy, e.g. '0.1'."),
      objective: z.string().optional().describe("User objective, e.g. bridge ETH to Sui then upload memory to Walrus."),
      riskLevel: z.enum(["conservative", "balanced", "aggressive"]).optional().default("conservative"),
    }),
    execute: async ({ strategy, network, budgetSui, objective, riskLevel }) => {
      const selectedNetwork = network || "testnet";
      const wallet = await getSuiAgentWalletSnapshot(userId, selectedNetwork);
      const template = STRATEGIES[strategy];

      const blockers: string[] = [];
      if (!wallet.configured) blockers.push("Create an embedded Sui agent wallet first.");
      if (!wallet.enabled) blockers.push("Enable Sui automation for the embedded wallet before autonomous Sui writes.");
      if (strategy === "lp") {
        blockers.push("No allowlisted LP execution tool is wired yet; use this plan as dry-run until protocol-specific tools are added.");
      }
      if (selectedNetwork === "mainnet") blockers.push("Mainnet strategy execution requires explicit env opt-in, per-user automation, and spend/risk caps.");

      return {
        strategy,
        title: template.title,
        network: selectedNetwork,
        objective: objective || "No objective supplied; use this as a generic hackathon-safe strategy plan.",
        riskLevel,
        budgetSui: budgetSui || null,
        wallet,
        currentAutonomy: template.currentAutonomy,
        proposedActions: template.actions,
        riskControls: [
          "Default to testnet for hackathon demos.",
          "Never claim execution unless a Sui/EVM digest is returned by an execution tool.",
          "Use allowlisted package/contract addresses only.",
          "Record every autonomous action with digest, network, amount, recipient/protocol, and rationale.",
          "Store strategy snapshots and receipts on Walrus.",
        ],
        blockers,
        canExecuteNow: blockers.length === 0,
        nextToolSuggestion:
          strategy === "bridge"
            ? "Use prepareWormholeSuiBridgeTransfer for route planning and getWormholeBridgeStatus for tx tracking. Avoid native Sui Bridge claim loops."
            : strategy === "lp"
              ? "Use getSuiDefiEcosystem with focus='lp' or 'lending', then choose one protocol SDK to allowlist."
              : "Use uploadToWalrus to upload agent memory JSON logs.",
      };
    },
  });
