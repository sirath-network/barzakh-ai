# BARZAKH × FLARE: "The Oracle Agent"
### AI-Powered Cross-Chain Intelligence & Confidential Strategy Execution on Flare Network

> **Tagline:** *The first onchain AI agent that sees across blockchains via FTSO & FDC, protects user alpha via Confidential Compute, and unlocks DeFi for FXRP.*

---

## 📌 Submission Overview

- **Project Name:** Barzakh AI × Flare: The Oracle Agent
- **Selected Bounties:**
  - 🏆 **Bounty 1 — Interoperable Asset Products**
  - 🏆 **Bounty 2 — Confidential Compute Apps**
- **Live Platform:** [app.sirath.network](https://app.sirath.network)
- **Target Network Deployments:** Flare Mainnet (Chain ID 14) & Coston2 Testnet (Chain ID 114)
- **GitHub Repository:** [Barzakh AI Monorepo](https://github.com/sirath-network/barzakh-ai)

---

## 💡 What is Barzakh AI × Flare?

Barzakh AI is a production-grade onchain AI agent platform operating across 85+ blockchains, powered by a multi-model routing engine (Open AI, Claude Haiku & Opus, Grok, DeepSeek, etc).

For the **Flare Summer Signal Hackathon**, we have transformed Barzakh AI into Flare's flagship **Oracle Agent** by natively integrating Flare's entire suite of enshrined protocols and hardware-attested confidential compute:

1. **FTSOv2 Block-Latency Price Intelligence:** Real-time, consensus-verified prices directly queried from Flare's enshrined oracle (FLR, BTC, ETH, XRP, SOL, DOGE) with 1.8s block speed without centralized oracle middleware.
2. **FAssets & FXRP Conversational Concierge:** Dynamic querying of Flare Contract Registry, FAsset managers (`AssetManagerFXRP`), and FXRP ERC-20 token data ($149M+ total supply on Flare Mainnet) enabling natural language onboarding and collateral tracking.
3. **Flare Data Connector (FDC) State Verification:** Attestation lookup and cross-chain verification tooling for external payments (XRPL, Bitcoin, EVM) and Web2 API data.
4. **TEE-Secured Confidential Strategy Engine (Bounty 2):** Hardware-enforced Trusted Execution Environments (Intel TDX/SGX enclaves) that evaluate private trading rules, execute MEV-proof DCAs/limit orders, and perform private portfolio scoring without ever exposing user strategies or balances on-chain.

---

## 🏆 Bounty 1 — Interoperable Asset Products Integration

### 1. FTSOv2 Real-Time Oracle Integration
- **Direct Enshrined Protocol Access:** Instead of querying third-party APIs (CoinGecko/CoinMarketCap), Barzakh AI queries Flare's `FtsoV2` and `TestFtsoV2` smart contracts via dynamic `IFlareContractRegistry` address resolution (`0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019`).
- **Enshrined Feed IDs:**
  - `FLR/USD`: `0x01464c522f55534400000000000000000000000000`
  - `XRP/USD`: `0x015852502f55534400000000000000000000000000`
  - `BTC/USD`: `0x014254432f55534400000000000000000000000000`
  - `ETH/USD`: `0x014554482f55534400000000000000000000000000`
- **Tools Implemented:**
  - `getFlareFtsoPrice`: Instant single-feed resolution with normalized decimal parsing and timestamp proof.
  - `getFlareFtsoMultiPrices`: Parallel batch queries comparing multi-asset market data in a single conversational turn.

### 2. FAssets / FXRP Liquidity & Ecosystem Tools
- **Asset Manager Resolution:** Queries `AssetManagerFXRP` dynamically to retrieve `fAsset()` token address (`0xAd552A648C74D49E10027AB8a618A3ad4901c5bE` on Mainnet) and real-time total supply.
- **Tools Implemented:**
  - `getFlareFxrpInfo`: Live FXRP supply, agent vault parameters, collateralization health, and minting instructions.
  - `getFlareTokenBalance`: Checks ERC-20 WFLR and FXRP holdings for connected wallets.

### 3. Flare Data Connector (FDC) Tools
- **Tools Implemented:**
  - `getFlareFdcInfo`: Retrieves FDC Hub address (`0xc25c749DC27Efb1864Cb3DADa8845B7687eB2d44` on Mainnet) and details supported attestation types: `Payment`, `AddressValidity`, `BalanceDecreasingTransaction`, `EVMTransaction`, `Web2Json`.

---

## 🏆 Bounty 2 — Confidential Compute Integration

### The Problem in Current AI Agent DeFi
When users configure automated trading bots or ask AI agents to analyze portfolios:
1. **Alpha Leakage:** Strategy parameters and wallet balances are sent in plain text over RPCs and AI backends.
2. **MEV Exploitation:** Front-running bots monitor mempools and copy/squeeze profitable automated strategies.

### Our Solution: Flare Confidential Compute (FCC / TEE Enclave)
```
   [User Natural Language Prompt]
                 │
                 ▼
   [Barzakh AI Chat Agent]
                 │ (Client-side Encrypted Payload)
                 ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 🔒 Flare TEE Enclave (Intel TDX / Phala dstack)          │
   │                                                          │
   │  • Decrypts private strategy rules in isolated memory    │
   │  • Ingests live FTSOv2 price feeds continuously          │
   │  • Evaluates trigger conditions (e.g. Volatility < 2.0%)  │
   │  • Signs settlement transaction inside enclave           │
   │  • Emits remote hardware quote (MRENCLAVE measurement)   │
   └──────────────────────────────────────────────────────────┘
                 │
                 ▼ (Signed Transaction + Attestation Proof)
   [Flare Smart Contract: FlareConfidentialStrategy.sol]
                 │
                 ▼
   [Trustless On-Chain Settlement on Coston2 / Flare]
```

### Confidential Compute Tools Implemented:
1. `getFlareConfidentialStrategyInfo`: Interactive educational breakdown of TEE trust models, hardware isolation, and privacy boundaries.
2. `submitConfidentialStrategy`: Submits encrypted DCA, limit order, or volatility-triggered strategies into the TEE enclave with client-side hashed envelopes.
3. `getConfidentialPortfolioScore`: Private portfolio analysis where full holdings enter the enclave, but only aggregated health scores and anonymized recommendations exit.

---

## 📊 Clearly Separated: Existing Work vs Hackathon Work

| Feature / Component | Existed Before Hackathon | Newly Built During Hackathon |
| :--- | :--- | :--- |
| **Platform Base** | Monorepo, Next.js 16 frontend, Vercel AI SDK pipeline | — |
| **Flare Chain Integration** | ❌ None | ✅ Added Flare Mainnet & Coston2 in Wagmi, Viem, and Intent Classifier |
| **FTSOv2 Price Oracle Tools** | ❌ None | ✅ `getFlareFtsoPrice`, `getFlareFtsoMultiPrices` querying smart contracts |
| **FAssets & FXRP Tools** | ❌ None | ✅ `getFlareFxrpInfo`, `getFlareTokenBalance` querying FXRP contracts |
| **FDC State Connector Tools** | ❌ None | ✅ `getFlareFdcInfo` resolving FdcHub contract |
| **Network & Wallet Tools** | ❌ None | ✅ `getFlareBalance`, `getFlareBlockInfo`, `getFlareGasPrice`, `getFlareNetworkStats`, `getFlareTransaction` |
| **Confidential Compute Layer** | ❌ None | ✅ `flare-confidential.ts`, TEE engine container (`tee/`), `Dockerfile` |
| **Solidity Smart Contracts** | Solana Anchor contracts only | ✅ `FlarePriceConsumer.sol`, `FlareConfidentialStrategy.sol` |
| **AI Intent Classification** | 14 chain groups | ✅ Dedicated `flare` group with 50+ regex patterns (priority 96) |

---

## 🚀 Live Test Execution Proof

Ran against **Flare Mainnet** (`https://flare-api.flare.network/ext/C/rpc`):

```bash
$ pnpm tsx src/lib/ai/tools/flare/test-live.ts

==================================================
🔥 TESTING BARZAKH × FLARE INTEGRATION LIVE
==================================================

1. Testing getFlareNetworkStats (Mainnet)...
✅ Mainnet Network Stats: Block #67211010 | Gas: 650 Gwei | Explorer: https://flare-explorer.flare.network

2. Testing getFlareFtsoPrice for FLR/USD (Mainnet)...
✅ FLR/USD Price: $0.006077 (Feed: 0x01464c52... | Source: Flare FTSO v2 Enshrined Oracle)

3. Testing getFlareFtsoPrice for XRP/USD (Mainnet)...
✅ XRP/USD Price: $1.0199 (Feed: 0x01585250... | Source: Flare FTSO v2 Enshrined Oracle)

4. Testing getFlareFtsoMultiPrices for [FLR/USD, BTC/USD, ETH/USD, XRP/USD]...
✅ Multi-Prices: BTC: $63,756.71 | ETH: $1,888.04 | XRP: $1.0198 | FLR: $0.006077

5. Testing getFlareFxrpInfo (Mainnet)...
✅ FXRP Info: AssetManager: 0x2a3Fe068... | FXRP Token: 0xAd552A64... | Total Supply: 149,518,585 FXRP

6. Testing getFlareFdcInfo (Mainnet)...
✅ FDC Info: FdcHub: 0xc25c749D... | Types: Payment, AddressValidity, BalanceDecreasing, EVMTransaction, Web2Json

7. Testing Bounty 2: submitConfidentialStrategy...
✅ Confidential Strategy Submitted: Envelope: 0x4ae10f... | TEE Endpoint: wss://tee-mainnet.flare.network

8. Testing Bounty 2: getConfidentialPortfolioScore...
✅ Confidential Portfolio Score: Health: 61/100 | Attestation: att_c19da4d4...
```

---

## 🛠️ Smart Contracts Deployed on Flare Coston2 Testnet (Chain ID 114)

| Contract | Address | Explorer Link | Deployment Tx |
| :--- | :--- | :--- | :--- |
| **`FlarePriceConsumer`** | `0x5c3742143057ad31adb50ec8149864d4e72cb6d6` | [View on Explorer](https://coston2-explorer.flare.network/address/0x5c3742143057ad31adb50ec8149864d4e72cb6d6) | [`0xcaba2ae4...`](https://coston2-explorer.flare.network/tx/0xcaba2ae4799e58365f298fddf4707f293dd1ea5d4c15c74720d71a6444b1e0fa) |
| **`FlareConfidentialStrategy`** | `0x653fde50d3ee1f2d82b2bac5871b0d96d8ae87c7` | [View on Explorer](https://coston2-explorer.flare.network/address/0x653fde50d3ee1f2d82b2bac5871b0d96d8ae87c7) | [`0xa44b8bda...`](https://coston2-explorer.flare.network/tx/0xa44b8bdac1338f101831c3bb76325e98fd7b3773d3c56e608a2600a082e450ce) |

- **Deployer Wallet:** `0xa36ab3DB5f908e66B1Bcc4f7b0dFb42237027aD7`
- **FTSOv2 Dynamic Resolution:** `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019`

---

## 🔮 Roadmap Beyond the Hackathon

1. **Mainnet TEE Node Deployment:** Deploy dedicated Intel TDX enclave instances on Phala Cloud connected to Flare Mainnet Protocol Managed Wallets (PMW).
2. **Autonomous FXRP Cross-Chain Minting:** Combine FDC XRPL Payment attestations with natural language prompts (e.g., *"Mint 500 FXRP from my Xumm wallet on XRPL"*).
3. **Confidential Institutional Portfolio Manager:** Enterprise-tier private fund rebalancing engine powered by Barzakh AI and Flare Confidential Compute.
