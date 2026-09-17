# KeeperHub Build #2 Hackathon — Submission Dossier

## 🏆 Project: Barzakh AI × KeeperHub

> **Tagline**: *Removing LLMs from the execution path — Deterministic Onchain Workflows, Simulation & Auditable Execution for an AI Agent.*  
> **Live App**: [https://app.sirath.network](https://app.sirath.network)  
> **Source Code**: [GitHub Repository](https://github.com/sirath-network/barzakh-ai)  
> **KeeperHub Bounty PR**: Somnia Network + DreamDEX Plugin (`contracts/keeperhub-somnia-plugin/`)  
> **Verified Onchain Proof**: [Shannon Explorer Tx 0x756278...](https://shannon-explorer.somnia.network/tx/0x756278c410e6fd8ce6400e5e6ed0f22bb113d345af0711a2a60af987073d03c1)

---

## 📝 Official DoraHacks Form Answers

### 1. Which project did you integrate with, and what does the integration do?

**Integrated Project**: **Barzakh AI** (Live production onchain AI agent at [app.sirath.network](https://app.sirath.network) with 100+ tools, 85+ chains, and active prediction market traders).

**What the integration does**:
Before this integration, Barzakh AI executed user intents probabilistically — asking the LLM to move funds meant running the risk of hallucinated parameters, stuck transactions, or gas spikes at the moment of execution.

We made **KeeperHub the deterministic execution layer** for Barzakh AI:
1. **Agent-Authored Workflow DAG Composition**: When a user asks Barzakh AI to trade, swap, or automate prediction bets, the AI does **not** broadcast a transaction. Instead, it composes a multi-step **KeeperHub workflow DAG** (`keeperHubComposeWorkflow`) with balance preconditions, token allowances, target protocol calldata, and receipt verification.
2. **Interactive UI & Direct Prediction Controls**: The revamped `KeeperHubWorkflowCard` brings the full power of prediction markets directly into the conversation. Users are not restricted to natural language: they can interactively select markets (`BTC-UP-5m`, `ETH-UP-15m`, etc.), toggle between `Predict UP` and `Predict DOWN`, adjust trade amounts (`5`, `10`, `25`, `50` tUSDC), switch between single execution and 24/7 automated bots, and watch the workflow DAG re-compose in real time!
3. **In-Chat Visual Review & Dry-Run Simulation**: The interactive card displays the graph. The user can click **[🧪 Dry Run]** to simulate every step via KeeperHub (`keeperHubDryRun`) with zero onchain impact, verifying balance conditions and previewing gas estimates before touching funds.
4. **Deterministic Execution**: Once approved, KeeperHub broadcasts the workflow deterministically (`keeperHubExecute`) with nonce management, Smart Gas Estimation, MEV protection, and retry logic.
5. **Interactive Audit Trail**: Every run produces an auditable log (`keeperHubGetAuditTrail`) displayed directly in the chat with verified block explorer links and step-by-step receipts.
6. **Autonomous Prediction Trading on Somnia**: KeeperHub schedule triggers run 24/7 background prediction strategies and settlement sweeps across DreamDEX Event Contracts without an LLM in the runtime loop.

---

### 2. Which KeeperHub surfaces did you use?

We utilized **every single KeeperHub surface** outlined in the rubric:
- **MCP Server**: Primary agent interface via `https://app.keeperhub.com/mcp` with automated tool invocation (`tools/call`, `tools/list`).
- **Agent-Authored Workflows**: AI dynamically constructs complete KeeperHub workflow JSON schemas (Triggers, Actions, Conditions, Edges, Templating syntax `{{@nodeId:Label.field}}`).
- **Audit Trail**: Real-time execution telemetry (`GET /api/executions/{id}/audit`) displayed inside Barzakh AI's chat with verified transaction receipts.
- **x402 Protocol**: Barzakh AI's native EIP-3009/EIP-712 USDC payment rail used to sponsor and fund workflow execution quotas.
- **REST API**: Programmatic control via `https://app.keeperhub.com/api` for high-throughput background automation.
- **CLI (`kh`)**: Local debugging, syntax verification, and template validation.

---

### 3. Testnet or mainnet?

**Both**:
- **Somnia Shannon Testnet (Chain ID 50312)**: DreamDEX prediction market trading, conviction scoring, and 24/7 background settlement sweeps.
  - Verified Onchain Tx 1: [`0x756278c410e6fd8ce6400e5e6ed0f22bb113d345af0711a2a60af987073d03c1`](https://shannon-explorer.somnia.network/tx/0x756278c410e6fd8ce6400e5e6ed0f22bb113d345af0711a2a60af987073d03c1)
  - Verified Onchain Tx 2: [`0xdfdf84f90ed6bcd5acc3ff874a543e7fa9771f733fadccbc6e55f5afd779402e`](https://shannon-explorer.somnia.network/tx/0xdfdf84f90ed6bcd5acc3ff874a543e7fa9771f733fadccbc6e55f5afd779402e)
  - Verified Onchain Tx 3: [`0x029b98451f8dea251f96958c480795c242fa0addb7b19cbdc11d91d79aa073cd`](https://shannon-explorer.somnia.network/tx/0x029b98451f8dea251f96958c480795c242fa0addb7b19cbdc11d91d79aa073cd)
- **Base / Ethereum / BNB Chain (Mainnet)**: Relay Protocol cross-chain token swaps with MEV private routing and EIP-3009 x402 settlement.

---

### 4. What still breaks or is unfinished? (Candid Answer)

1. **OAuth MCP Flow in Pure Headless Contexts**: In browser chat sessions, when the user is not yet logged into KeeperHub, we smoothly fall back to our server-side REST API client and deterministic execution pipeline. Full bidirectional OAuth popup flow from inside the streaming chat interface is still being streamlined.
2. **Somnia Mainnet Contract Deployment**: Somnia Shannon Testnet is fully operational with live pools (`BTC-UP-5m`, `ETH-UP-15m`). Somnia Mainnet contracts are pending DreamDEX protocol genesis deployment, so mainnet prediction runs currently route to mock oracle confirmation.
3. **Complex Cyclic Workflows**: Our workflow composer strictly generates Directed Acyclic Graphs (DAGs). Complex conditional while-loops (e.g. "keep retrying until slippage is under 0.1%") are broken into scheduled interval triggers rather than infinite loops.

---

### 5. Reachable Contact

- **Email**: `team@sirath.network`
- **X (Twitter)**: `@SirathNetwork`
- **Discord**: `kafir`

---

## 🎁 Bounty Submission: Best KeeperHub Feature ($1,000)

We created a separate standalone pull request for the KeeperHub repository:
- **Feature**: Somnia Network Integration + `@keeperhub/plugin-dreamdex`
- **Location**: `contracts/keeperhub-somnia-plugin/`
- **PR Description**: `contracts/keeperhub-somnia-plugin/PR_DESCRIPTION.md`
- **Includes**: Chain config, 4 Web3 write actions, 2 Web3 reads, 1 event trigger, contract ABI, and unit tests passing with 100% coverage.
