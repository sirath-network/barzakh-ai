# Barzakh AI

<p align="center">
  <img width="100%" alt="Barzakh AI Banner" src="https://github.com/user-attachments/assets/bdb03347-8615-4be3-8920-aca4a7fc54b5" />
</p>

<p align="center">
  <strong>🧠 AI-Powered Onchain Agent — Execute Trades, Bridges, Intelligence & DeFi via Natural Language</strong>
</p>

<p align="center">
  <a href="https://app.sirath.network"><img src="https://img.shields.io/badge/🚀_Live_-app.sirath.network-ede8e8?style=for-the-badge" alt="Live"></a>&nbsp;
  <a href="./docs/WHITEPAPER.md"><img src="https://img.shields.io/badge/📄_Whitepaper-Read_Now-ede8e8?style=for-the-badge" alt="Whitepaper"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Flare_Network-FTSOv2_&_Confidential_Compute-ede8e8?style=for-the-badge" alt="Flare Network">&nbsp;
  <img src="https://img.shields.io/badge/Relay_Protocol-Cross--Chain-ede8e8?style=for-the-badge" alt="Relay Protocol">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.6-ede8e8?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-16.2-ede8e8?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19.2-ede8e8?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18+-ede8e8?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Turborepo-2.8-ede8e8?logo=turborepo&logoColor=white" alt="Turborepo">
  <img src="https://img.shields.io/badge/Vercel-Deployed-ede8e8?logo=vercel" alt="Vercel">
  <img src="https://img.shields.io/badge/License-MIT-ede8e8" alt="MIT License">
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Flare Summer Signal Hackathon — Official Submission](#-flare-summer-signal-hackathon--official-submission)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AI Models & Orchestration](#ai-models--orchestration)
- [Blockchain Tools](#blockchain-tools)
  - [Flare Network (The Oracle Agent & Confidential Compute)](#flare-network--the-oracle-agent--confidential-compute)
  - [Arkham Intelligence](#%EF%B8%8F-arkham-intelligence--blockchain-investigation--whale-tracking)
  - [Mantle Network](#%EF%B8%8F-mantle-network--l2-blockchain-tools)
  - [Creditcoin](#-creditcoin--blockchain-data-tools)
  - [BNB Chain](#-bnb-chain-integration)
  - [Monad Ecosystem](#monad-ecosystem-deep-integration)
  - [Shelby Protocol](#-shelby-protocol--decentralized-storage--nft-minting)
  - [Renaiss Protocol](#-renaiss-protocol--collectibles-marketplace--zero-knowledge-gacha)
- [x402 Crypto Payment Protocol](#x402-crypto-payment-protocol)
- [Security](#security)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

Barzakh AI is a full-stack **AI-powered onchain agent** that combines real-time blockchain data with multi-model AI orchestration. Built as a **Turborepo monorepo** with pnpm workspaces, it enables users to execute cross-chain swaps, bridge assets, analyze wallets, and interact with DeFi protocols — all through natural language conversation.

### ✨ Key Capabilities

| Feature | Description |
|---------|-------------|
| **AI Onchain Agent** | Natural language → real onchain transactions (swaps, bridges, trades) |
| **Flare Oracle Agent** | Enshrined FTSOv2 price feeds (~1.8s block latency), FXRP supply tracking, and FDC state verification |
| **Flare Confidential Compute** | Hardware-enforced TEE enclave for private DCA/limit order execution and zero-knowledge portfolio health scoring |
| **Autonomous Token Launches** | 4-step end-to-end launch on Four.meme with automated logo resolution and tax config |
| **Scheduled Agent Workflows** | Background monitoring for subscriptions and automated task execution via `api/cron` |
| **Cross-Chain Execution** | 85+ chains via Relay Protocol (BSC, Base, Ethereum, Arbitrum, Solana, etc.) |
| **Arkham Intelligence** | 43 tools for whale tracking, entity investigation, fund flow analysis across 20+ chains |
| **Decentralized Storage** | Upload text, images, PDFs, videos to Shelby Protocol (Aptos Testnet) with optional NFT minting |
| **Azure Multi-Model AI** | GPT-4o/4.1/5.x, Grok, Kimi, DeepSeek, and BZKH model-router deployments with intelligent routing |
| **Smart Chain Inference** | Auto-detects which chain a token belongs to — no need to specify |
| **100+ Blockchain Tools** | Chain-specific analyzers for Flare, Monad, Cronos, Mantle, EVM, Aptos, Solana, Flow, SEI, Creditcoin |
| **Enterprise Security** | 2FA (TOTP), wallet signature auth, prompt injection defense, Cloudflare API Shield |
| **Crypto Payments** | x402 protocol with EIP-3009/EIP-712 USDC payments on Base |
| **Guest Access** | Anonymous trial with device fingerprinting — 5 free messages/day without sign-up |

---

## 🏆 Flare Summer Signal Hackathon — Official Submission

> **Tagline:** *The first onchain AI agent that sees across blockchains via FTSO & FDC, protects user alpha via Confidential Compute, and unlocks DeFi for FXRP.*

### 📋 Submission Summary

- **Project Name:** Barzakh AI × Flare: "The Oracle Agent"
- **Selected Bounties:**
  - 🥇 **Bounty 1: Interoperable Asset Products**
  - 🥇 **Bounty 2: Confidential Compute Apps**
- **Short Product Description:** A production-ready conversational AI agent providing real-time data intelligence and private execution on Flare Network — querying enshrined FTSOv2 price feeds (~1.8s latency), monitoring FAssets (FXRP dynamic supply & collateral), verifying cross-chain state via Flare Data Connector (FDC), and executing MEV-proof private strategies via Trusted Execution Environments (TEE).
- **Target User:** DeFi traders, XRP/FXRP liquidity providers, algorithmic strategists seeking front-running protection, and web3 users wanting natural language access to Flare's enshrined data protocols.
- **Working Demo App:** [app.sirath.network](https://app.sirath.network)
- **Technical Materials:** [Detailed Hackathon Technical Guide](docs/FLARE_INTEGRATION_SUBMISSION.md) | [Smart Contracts](contracts/flare/) | [TEE Enclave Code](tee/) | [Flare AI Tools Suite](packages/shared/src/lib/ai/tools/flare/)

---

### 🌐 Network Deployments & Live Smart Contracts

| Contract / Resource | Network | Address / Explorer | Deployment Transaction |
| :--- | :--- | :--- | :--- |
| **`FlarePriceConsumer.sol`** | Coston2 Testnet (114) | [`0x5c3742143057ad31adb50ec8149864d4e72cb6d6`](https://coston2-explorer.flare.network/address/0x5c3742143057ad31adb50ec8149864d4e72cb6d6) | [`0xcaba2ae4...`](https://coston2-explorer.flare.network/tx/0xcaba2ae4799e58365f298fddf4707f293dd1ea5d4c15c74720d71a6444b1e0fa) |
| **`FlareConfidentialStrategy.sol`** | Coston2 Testnet (114) | [`0x653fde50d3ee1f2d82b2bac5871b0d96d8ae87c7`](https://coston2-explorer.flare.network/address/0x653fde50d3ee1f2d82b2bac5871b0d96d8ae87c7) | [`0xa44b8bda...`](https://coston2-explorer.flare.network/tx/0xa44b8bdac1338f101831c3bb76325e98fd7b3773d3c56e608a2600a082e450ce) |
| **Flare Contract Registry** | Mainnet (14) & Coston2 (114) | `0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019` | Enshrined Protocol Registry |
| **Live RPC Feeds (Read)** | Flare Mainnet (14) | Direct on-chain zero-gas calls via Multi-RPC failover pool | Real-time FTSOv2 & FXRP |

- **Deployer / Initial TEE Signer Wallet:** `0xa36ab3DB5f908e66B1Bcc4f7b0dFb42237027aD7`

---

### 🧩 How Barzakh AI Uses Flare

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                            BARZAKH AI NATURAL LANGUAGE CONVERSATION              │
 └────────────────────────┬───────────────────────────────────┬─────────────────────┘
                          │                                   │
             ┌────────────▼────────────────┐       ┌────────────▼──────────────┐
             │ 🏆 BOUNTY 1: INTEROP ASSETS│        │ 🏆 BOUNTY 2: CONFIDENTIAL│
             └────────────┬────────────────┘       └────────────┬──────────────┘
                          │                                   │
         ┌────────────────┼────────────────┐                  │
         ▼                ▼                ▼                  ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐     ┌─────────────────────┐
   │  FTSO v2  │    │  FAssets  │    │    FDC    │     │ Flare TEE Enclave   │
   │  Oracle   │    │  (FXRP)   │    │   (Hub)   │     │ (Intel TDX / dstack)│
   └─────┬─────┘    └─────┬─────┘    └─────┬─────┘     └──────────┬──────────┘
         │                │                │                      │
         │  Block-latency │  $149M+ FXRP   │  Cross-Chain Proofs  │  Hardware Encrypted
         │  Feed Pricing  │  Collateral    │  (XRPL/BTC/Web2)     │  Strategy Execution
         │                │                │                      │
         └────────────────┴────────────────┴──────────────────────┘
                                  │
                                  ▼
   ┌────────────────────────────────────────────────────────────────────────────────┐
   │         FLARE MAINNET (Chain ID 14) & COSTON2 TESTNET (Chain ID 114)           │
   │   • Contract Registry: 0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019              │
   │   • FtsoV2 / TestFtsoV2 Contract Resolution & 3-Tier Multi-RPC Failover Pool   │
   └────────────────────────────────────────────────────────────────────────────────┘
```

1. **Enshrined FTSOv2 Oracle (Bounty 1):**
   - Direct smart contract queries to `FtsoV2` via dynamic `IFlareContractRegistry` resolution (`0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019`).
   - Consensus-verified prices for `FLR/USD`, `BTC/USD`, `ETH/USD`, `XRP/USD`, `SOL/USD`, `DOGE/USD` updated with block-latency (~1.8s).
   - Zero reliance on centralized third-party APIs (CoinGecko, CoinMarketCap).

2. **FAssets & FXRP Integration (Bounty 1):**
   - Dynamic resolution of `AssetManagerFXRP` and FXRP ERC-20 token (`0xAd552A648C74D49E10027AB8a618A3ad4901c5bE` on Mainnet).
   - Real-time monitoring of circulating FXRP supply (149.5M+ FXRP on Flare Mainnet) and dual-layer collateral health (FLR pool collateral + stablecoin vault collateral).

3. **Flare Data Connector (FDC) Attestation (Bounty 1):**
   - Resolves `FdcHub` (`0xc25c749DC27Efb1864Cb3DADa8845B7687eB2d44` on Mainnet) to inspect supported cross-chain attestation types (`Payment`, `AddressValidity`, `BalanceDecreasingTransaction`, `EVMTransaction`, `Web2Json`).

4. **Flare Confidential Compute & TEE Enclave (Bounty 2):**
   - Hardware-enforced isolation (Intel TDX / SGX container architecture) protecting user trading alpha against front-running and MEV.
   - **Private Strategy Execution:** Submits client-side encrypted envelopes (`0x...`) for automated DCAs and limit orders evaluated inside the enclave.
   - **Zero-Knowledge Portfolio Health Scoring:** Private portfolio diagnostics where balances and trading history enter the enclave, but only aggregated health scores (0-100) and anonymized recommendations exit.
   - **Onchain Settlement Contract:** [`FlareConfidentialStrategy.sol`](https://coston2-explorer.flare.network/address/0x653fde50d3ee1f2d82b2bac5871b0d96d8ae87c7) verifies TEE hardware-signed execution proofs and FTSOv2 price boundaries on Coston2 testnet.

5. **3-Tier Resilient RPC Pool:**
   - Automated failover across `flare-api.flare.network`, `flare.public-rpc.com` (~298ms latency), and `rpc.ankr.com` with 8s timeouts, eliminating RPC drops.

---

### 📊 Separation of Work: Existing vs. Hackathon Additions

To provide complete transparency for hackathon evaluation:

| Component / Feature | Status Before Program | Built / Ported / Improved During Program |
| :--- | :--- | :--- |
| **Core Monorepo & AI Router** | Pre-existing | Enhanced system prompts and intent patterns for Flare |
| **Flare Chain Configuration** | ❌ None | ✅ Added Flare Mainnet (14) & Coston2 (114) to Wagmi, Viem, Intent Classifier |
| **FTSOv2 Oracle AI Tools** | ❌ None | ✅ Built `getFlareFtsoPrice` & `getFlareFtsoMultiPrices` via on-chain contract queries |
| **FAssets / FXRP AI Tools** | ❌ None | ✅ Built `getFlareFxrpInfo` with dynamic `AssetManagerFXRP` & supply tracking |
| **FDC Data Connector Tools** | ❌ None | ✅ Built `getFlareFdcInfo` resolving `FdcHub` and attestation types |
| **Flare Native Portfolio Tracker** | ❌ None | ✅ Built `getFlarePortfolio` querying live balances, ERC-20s, and FTSOv2 USD values |
| **Flare Blockchain Utilities** | ❌ None | ✅ Built `getFlareBalance`, `getFlareBlockInfo`, `getFlareTransaction`, `getFlareGasPrice`, `getFlareNetworkStats` |
| **Confidential Compute (TEE) Layer** | ❌ None | ✅ Built `flare-confidential.ts`, TEE strategy container (`tee/`), Dockerfile |
| **Solidity Smart Contracts** | ❌ None | ✅ Built & deployed `FlarePriceConsumer.sol` and `FlareConfidentialStrategy.sol` on Coston2 |
| **Multi-RPC Failover Pool** | ❌ None | ✅ Implemented 3-tier fallback pool (`flare-api`, `public-rpc`, `ankr`) |

---

### 🔮 Roadmap & Next Steps

1. **Phala dstack Live Hardware Enclave:** Deploy the [`tee/Dockerfile`](tee/Dockerfile) container onto a bare-metal Phala Cloud instance with active remote hardware attestation (MRENCLAVE).
2. **Autonomous FAsset Natural Language Minting:** Enable users to trigger XRPL transactions and generate FDC payment attestations directly from chat (e.g. *"Mint 250 FXRP from my XRPL wallet"*).
3. **Institutional MEV-Proof Fund Rebalancer:** Commercialize confidential strategy execution for DAOs and treasury managers holding large FLR and FXRP positions.

---

## Architecture

> **Turborepo Monorepo** with pnpm workspaces for optimal DX and build performance

### High-Level System Design

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                    EDGE LAYER                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Cloudflare    │  │   API Shield    │  │  Rate Limiter   │  │    R2 Storage   │  │
│  │   WAF + DDoS    │  │ OpenAPI 3.0 Spec│  │  Token Bucket   │  │   Object Store  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │                    │
            └────────────────────┴────────────────────┴────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER (Vercel)                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Next.js 16.2 (App Router + RSC)                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │  │
│  │  │  React 19   │  │   Server    │  │  API Routes │  │    Middleware Chain     │ │  │
│  │  │     RSC     │  │  Components │  │   (Edge)    │  │  Auth → Rate → Validate │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   CORE SERVICES                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Chat Engine    │  │ AI Orchestrator │  │  Tool Executor  │  │ Stream Processor│ │
│  │  Vercel AI SDK  │  │  Multi-Model    │  │  100+ Tools     │  │   SSE/Chunks    │ │
│  │    v4.3.19      │  │  Intent Router  │  │   12+ Chains    │  │  Transfer-Enc   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼────────────────────┼────────────────────┼────────────────────┼──────────┘
            │                    │                    │                    │
            └────────────────────┴────────────────────┴────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   AI LAYER                                          │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                           LLM Provider Abstraction                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │  Azure   │  │ Model    │  │ OpenAI   │  │   xAI    │  │  Moonshot/Kimi   │  │
│  │  │ Foundry  │  │ Router   │  │ GPT-4/5  │  │  Grok    │  │  DeepSeek/Zhipu  │ │  │
│  │  │Endpoint  │  │ BZKH v1  │  │ GPT-Image│  │ 4.x/4.20 │  │ via Azure        │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Prompt Engineer │  │ Input Sanitizer │  │        Response Streamer            │  │
│  │ 100KB+ System   │  │ Injection Guard │  │    Token-by-Token SSE Output        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                              BLOCKCHAIN TOOLS LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Chain-Specific Tool Modules                             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │  Cronos  │  │   EVM    │  │  Aptos   │  │   Flow   │  │       SEI        │   │  │
│  │  │ VVS DEX  │  │ Ethereum │  │   Move   │  │ Cadence  │  │  Cosmos SDK      │   │  │
│  │  │ Explorer │  │ Polygon  │  │  Names   │  │  NFTs    │  │  IBC Protocol    │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │  Solana  │  │   Zeta   │  │  Monad   │  │   Base   │  │   Mantle L2      │   │  │
│  │  │   RPC    │  │  ZetaVM  │  │ Mainnet  │  │   RPC    │  │  MNT Balance     │   │  │
│  │  │  DeFi    │  │  Testnet │  │ nad.fun  │  │   DeFi   │  │  Portfolio       │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                       Intelligence & Utility Tool Modules                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │ Arkham   │  │DeFi Llama│  │Web Search│  │  News    │  │  X/Twitter       │   │  │
│  │  │ Intel    │  │   TVL    │  │  Tavily  │  │  Search  │  │  Search          │   │  │
│  │  │ 43 Tools │  │   API    │  │  Search  │  │   API    │  │   API            │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  │  ┌──────────┐  ┌──────────┐                                                     │  │
│  │  │Creditcoin│  │ Image Gen│                                                     │  │
│  │  │Blockscout│  │Azure GPT │                                                     │  │
│  │  │   API    │  │Image 2   │                                                     │  │
│  │  └──────────┘  └──────────┘                                                     │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                  DATA LAYER                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL    │  │  Cloudflare R2  │  │   Drizzle ORM   │  │   Connection    │  │
│  │   (Neon/Turso)  │  │  Object Storage │  │   Type-Safe     │  │    Pooling      │  │
│  │    v0.45.2      │  │   File Upload   │  │   Migrations    │  │   Prepared      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Client as 🖥️ Client
    participant CF as 🛡️ Cloudflare Edge
    participant MW as ⚙️ Middleware
    participant Auth as 🔐 NextAuth
    participant API as 📡 API Route
    participant Orchestrator as 🧠 AI Orchestrator
    participant LLM as 🤖 LLM Provider
    participant Tools as 🔧 Tool Executor
    participant RPC as ⛓️ Blockchain RPC
    participant DB as 💾 PostgreSQL

    Client->>CF: POST /api/chat (TLS 1.3)
    CF->>CF: WAF Rules + Bot Detection
    CF->>CF: API Shield Schema Validation
    CF->>CF: Rate Limit Check (Token Bucket)
    CF->>MW: Forward Request

    MW->>Auth: Validate Session Cookie
    Auth->>DB: Verify Session + Get User
    DB-->>Auth: User Context + Subscription Tier
    Auth-->>MW: Authenticated User

    Note over MW: x402 Subscription Expiry Check
    MW->>DB: Check x402PeriodEnd

    MW->>API: Process Chat Request
    API->>Orchestrator: Initialize Chat Stream

    Orchestrator->>Orchestrator: Build Context (History + System Prompt)
    Orchestrator->>Orchestrator: Sanitize Input (Injection Defense)
    Orchestrator->>LLM: Stream Completion Request

    loop Agentic Tool Loop
        LLM-->>Orchestrator: Tool Call Request
        Orchestrator->>Tools: Execute Tool
        Tools->>RPC: Query Blockchain
        RPC-->>Tools: On-Chain Data
        Tools-->>Orchestrator: Structured Result
        Orchestrator->>LLM: Continue with Tool Result
    end

    LLM-->>Orchestrator: Final Response Tokens
    Orchestrator-->>API: SSE Stream
    API-->>Client: Transfer-Encoding: chunked

    API->>DB: Persist Chat Message (async)
```

---

## Tech Stack

### Core Framework

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | Node.js | 18+ | Server runtime |
| **Package Manager** | pnpm | 10.11.0 | Fast, disk-efficient |
| **Monorepo** | Turborepo | 2.8.0 | Build orchestration |
| **Framework** | Next.js | 16.2.6 | Full-stack React framework |
| **UI Library** | React | 19.2.0 | UI components (RSC enabled) |
| **Language** | TypeScript | 5.6.3 | Type safety |

### Frontend Stack

| Category | Technologies |
|----------|-------------|
| **Styling** | TailwindCSS 3.4, CSS Variables, Tailwind Merge |
| **Components** | Radix UI primitives, Lucide React icons, Framer Motion |
| **State** | React hooks, useSWR, TanStack Query 5.90 |
| **Forms** | Zod 3.25 validation, React Hook Form patterns |
| **Editor** | Prosemirror, CodeMirror 6 |
| **Animations** | Framer Motion 11.3, Lottie React |

### Backend Stack

| Category | Technologies |
|----------|-------------|
| **API** | Next.js API Routes (Edge + Node), Vercel Functions |
| **AI SDK** | Vercel AI SDK 4.3.19 |
| **Database** | PostgreSQL 15, Drizzle ORM 0.45.2 |
| **Auth** | NextAuth.js 5.0.0-beta.30 |
| **Payments** | Stripe 18.5, x402 Protocol (EIP-3009) |
| **Email** | Nodemailer 6.10 |

### Web3 Stack

| Category | Technologies |
|----------|-------------|
| **Wallet** | Wagmi 2.19, Dynamic SDK 4.x |
| **Ethereum** | Viem 2.41, ethers.js v6 |
| **Chains** | Monad, Cronos, Mantle, Ethereum, Polygon, Aptos, Solana, Flow, SEI, Creditcoin + 85 via Relay |
| **Protocols** | EIP-3009 (TransferWithAuthorization), EIP-712, EIP-191 |

### Infrastructure

| Category | Technologies |
|----------|-------------|
| **Hosting** | Vercel (Frontend), Cloudflare (Edge) |
| **Database** | Neon PostgreSQL (Serverless) |
| **Storage** | Cloudflare R2 (S3-compatible) |
| **CDN** | Vercel Edge Network, Cloudflare |
| **Monitoring** | Sentry 9.11, Vercel Analytics |

---

## AI Models & Orchestration

### Supported Models

| Provider | Model IDs | Strength |
|----------|-----------|----------|
| **Azure Model Router** | `model-router` / **BZKH v1** | Auto-selects the best Azure-hosted model for the task |
| **OpenAI via Azure** | `gpt-4o-mini`, `gpt-4o`, `gpt-4.1`, `gpt-5.3-chat`, `gpt-5.3-codex`, `gpt-5.4*`, `gpt-5.5` | General chat, reasoning, coding, and premium intelligence |
| **xAI via Azure** | `grok-4-1-fast-*`, `grok-4-20-*`, `grok-4.3` | Fast and reasoning variants for real-time answers |
| **Moonshot via Azure** | `kimi-k2.5`, `kimi-k2.6` | Long-context knowledge-heavy workflows |
| **DeepSeek via Azure** | `deepseek-v3.2`, `deepseek-v4-flash` | High-throughput reasoning and responsive generation |

### Image Generation & Editing

The `imagine` route now uses **OpenRouter GPT-Image-2** directly through the OpenAI-compatible `/images/generations` and `/images/edits` endpoints. Legacy third-party image generation has been removed from the active image path.

| Model ID | Display Name | Provider | Description |
|----------|--------------|----------|-------------|
| `gpt-image-2` | **GPT-Image-2** | OpenRouter | High-fidelity PNG image generation, multi-image batches, and image editing |

| Capability | Implementation |
|------------|----------------|
| Prompt-to-image | `createImage` posts JSON to `${OPENROUTER_ENDPOINT}/images/generations` |
| Image editing | `input_images` are fetched/proxied, converted to multipart `image[]`, then sent to `/images/edits` |
| Persistence | Base64/data URLs from Azure are uploaded through `/api/persist-image` into Cloudflare R2 |
| Batch size | `numberOfImages` supports 1-10 images in a single Azure request |
| Resolution | `size` supports GPT-Image-2-valid `WIDTHxHEIGHT` multiples of 16, default `1024x1024` |
| Quality | `OPENROUTER_IMAGE_QUALITY=low|medium|high` (default `low`) |
| Streaming | Optional `OPENROUTER_IMAGE_STREAM=true` with `OPENROUTER_IMAGE_PARTIAL_IMAGES=0..3` |


### Intent Classification & Routing

```mermaid
flowchart LR
    subgraph Input["📥 User Input"]
        Query["User Query"]
        Context["Chat Context"]
        ChainMention["Chain Mentions"]
    end

    subgraph Classifier["🔀 Intent Classifier"]
        Pattern["Pattern Matching"]
        ChainContext["Chain Context Extraction"]
        LLMFallback["LLM Fallback"]
    end

    subgraph Routes["🎯 Route Categories"]
        Cronos["Cronos Tools"]
        EVM["EVM Generic"]
        Aptos["Aptos/Move"]
        Solana["Solana DeFi"]
        SEI["SEI Cosmos"]
        General["General Chat"]
    end

    Query --> Pattern
    Context --> ChainContext
    ChainMention --> ChainContext

    Pattern --> |"cronos, cro, vvs"| Cronos
    Pattern --> |"eth, erc, ens"| EVM
    Pattern --> |"apt, move"| Aptos
    Pattern --> |"sol, spl"| Solana
    Pattern --> |"sei, ibc"| SEI

    ChainContext --> |"Preserve context"| Routes
    LLMFallback --> |"Ambiguous"| General
```

---

## AI Agent Architecture

Barzakh AI features a dual-mode execution engine that allows users to choose between granular control and full autonomy.

### 🤖 Execution Modes: Manual vs. Autonomous

| Mode | Trigger | Signing Method | Best For |
|------|---------|----------------|----------|
| **Manual** | Default | User signs each transaction via Dynamic SDK / Extension Wallet | New users, large trades, high-stakes DeFi |
| **Autonomous** | Settings Enabled | Agent signs instantly using a backend-delegated MPC wallet | High-frequency trading, auto-launching, background tasks |

### 🔐 Agent Automation & Security
When **Agent Automation** is enabled in settings, the system sets up a dedicated embedded wallet powered by the **Dynamic SDK**.
- **Delegated Access**: The agent is granted permission to sign specific types of transactions within user-defined limits.
- **Backend Signing**: Transactions are prepared by the `agent-executor.ts` and signed using the `getAgentPrivateKey` utility, allowing for "Zero-Click" execution.
- **Instant Response**: Perfect for multi-step flows like Four.meme launches where multiple transactions (Logo Storage + Metadata + Launch) are executed in a single natural language session.

### ⏳ Background Automation (Cron)
Barzakh AI uses deferred background workers for non-blocking tasks, located in `api/cron`:
- **Protocol Monitoring**: Continuously checks for cross-chain bridge completions to update chat UI state.
- **Subscription Engine**: Automatically monitors and manages user tiers and billing cycles.

---

## Blockchain Tools

### Tool Inventory by Chain

| Chain | Tools | Key Capabilities |
|-------|-------|------------------|
| **Flare Network** | 13 | Enshrined FTSOv2 price feeds (~1.8s block latency), FAssets (FXRP dynamic supply & collateral), Flare Data Connector (FDC) cross-chain attestations, native portfolio tracker, TEE confidential compute strategy execution & zero-knowledge portfolio health scoring |
| **Arkham Intelligence** | 43 | Whale tracking, entity investigation, fund flow analysis, portfolio, transfers, DEX swaps, token data, market metrics, address labels — across 20+ chains (Ethereum, Bitcoin, Solana, BSC, Tron, TON, Dogecoin, etc.) |
| **Cronos EVM** | 12 | Balance, tokens, transactions, gas, market data, VVS swaps, pool info, internal tx, logs |
| **Cronos zkEVM** | 11 | zkCRO balance, tx history, token transfers, internal tx, contract ABI/source, token supply, block info |
| **Mantle Network** | 12 | MNT balance, blocks, transactions, tokens, gas, tx history, token transfers, token list, portfolio, contract ABI/source, L2 rollup info |
| **EVM (Generic)** | 6 | Etherscan, Zerion portfolio, ENS resolution, multi-chain wallet |
| **Aptos + Shelby** | 13 | Coin balance, resources, modules, ANS names, transactions, **Shelby blob upload, retrieval, pricing, NFT minting** |
| **Solana** | 4 | Token balances, portfolio, market data |
| **Flow** | 3 | Cadence scripts, NFT collections |
| **SEI** | 4 | Cosmos queries, IBC transfers |
| **Zeta** | 3 | ZetaVM testnet, cross-chain messaging |
| **Monad** | 10 | MON balance, tx details, gas, portfolio, DeFi positions, NFTs, token positions, stats, nad.fun search |
| **GOAT Network** | 14 | Bitcoin-secured L2, BTC balance/gas, GNS (.goat name service) resolver & availability, ERC-8004 agent card & reputation, portfolio tracker, BitVM2 bridge status, oracle feeds |
| **Creditcoin** | 2 | Blockchain data via Blockscout API, network statistics |
| **Renaiss Protocol** | 8 | Search collectible cards (listed & unlisted), card price history & Fair Market Value (FMV), PSA/CGC/BGS cert lookup, volume trends, target alert watchlists, zero-knowledge gacha packs & draws |
| **Utility** | 8 | Web search, news, X/Twitter, DeFi Llama, image generation |

---

### Flare Network — The Oracle Agent & Confidential Compute

Barzakh AI provides **13 dedicated Flare tools** integrating Flare's enshrined oracle (FTSOv2), FAssets (FXRP), Flare Data Connector (FDC), and hardware-isolated Confidential Compute (TEE):

#### 🛠️ Flare AI Tool Suite

| Tool | Category | Description |
| :--- | :--- | :--- |
| `getFlareFtsoPrice` | 🔮 Oracle (FTSOv2) | Consensus-verified price feed for FLR, BTC, ETH, XRP, SOL, DOGE directly from `FtsoV2` contract |
| `getFlareFtsoMultiPrices` | 🔮 Oracle (FTSOv2) | Batch queries comparing multi-asset market prices in a single conversational turn |
| `getFlareFxrpInfo` | 🪙 FAssets / FXRP | Dynamic `AssetManagerFXRP` resolution, circulating FXRP supply (149.5M+), and dual-collateral health |
| `getFlareFdcInfo` | 🌐 FDC Attestation | Flare Data Connector hub details and supported attestation types (`Payment`, `EVMTransaction`, `Web2Json`) |
| `getFlarePortfolio` | 💼 Wallet / Portfolio | Full on-chain portfolio: native FLR, ERC-20 token holdings, and live FTSOv2 USD valuation |
| `getFlareBalance` | ⛓️ Blockchain | Native FLR (Mainnet) or C2FLR (Coston2 Testnet) balance |
| `getFlareTokenBalance` | ⛓️ Blockchain | ERC-20 token balance (WFLR, FXRP, etc.) |
| `getFlareTransaction` | ⛓️ Blockchain | Transaction status, confirmations, and gas used |
| `getFlareBlockInfo` | ⛓️ Blockchain | Latest block number, timestamp, and gas stats |
| `getFlareGasPrice` | ⛓️ Blockchain | Current gas price with transfer and swap cost estimations |
| `getFlareNetworkStats` | ⛓️ Blockchain | Network overview, chain ID, and explorer links |
| `getFlareConfidentialStrategyInfo` | 🔒 Confidential Compute | Interactive educational breakdown of TEE trust models and hardware privacy |
| `submitConfidentialStrategy` | 🔒 Confidential Compute | Client-side encrypted DCA/limit order strategy submission to isolated TEE enclave |
| `getConfidentialPortfolioScore` | 🔒 Confidential Compute | Zero-knowledge portfolio risk, diversification, and yield scoring with attestation hash |

#### 🎯 Try It — Flare Natural Language Prompts

> **Live at [app.sirath.network](https://app.sirath.network)** — test these prompts in the chat:

```text
What is the live FTSO price of FLR, BTC, and XRP?
```
```text
Show FXRP circulating supply and collateral health on Flare
```
```text
Track portfolio 0xA485582EEd34126fbB5387b35757e1F71dfc4cE8 on Flare
```
```text
What attestation types does the Flare Data Connector support?
```
```text
Execute a private DCA strategy to buy FXRP whenever FTSO volatility is under 2%
```
```text
Privately score my portfolio health without exposing my token balances on-chain
```
```text
Check the latest block and gas price on Flare Mainnet
```

#### 🛡️ Resilient 3-Tier Multi-RPC Pool
All Flare queries automatically utilize an intelligent failover pool with 8-second request timeouts to guarantee zero downtime and eliminate timeout errors:
- **Primary:** `https://flare-api.flare.network/ext/C/rpc` (Official RPC)
- **Backup 1:** `https://flare.public-rpc.com` (High-speed community RPC ~298ms)
- **Backup 2:** `https://rpc.ankr.com/flare` (Ankr Global Infrastructure)

---

### Cronos zkEVM Direct Tools

Direct API access to Cronos zkEVM (Chain ID 388) block range for reliability:

```typescript
// Available zkEVM Tools
const zkevmTools = {
  getZkEVMBalance,           // Native zkCRO balance (with RPC fallback)
  getZkEVMTransactionHistory, // Transaction history
  getZkEVMTransaction,       // Transaction status by hash
  getZkEVMTokenBalance,      // ERC-20 token balance
  getZkEVMGasPrice,          // zkCRO price
  getZkEVMTokenTransfers,    // ERC-20 transfer history
  getZkEVMInternalTxList,    // Internal transactions
  getZkEVMContractABI,       // Contract ABI (verified)
  getZkEVMContractSource,    // Contract source code
  getZkEVMTokenSupply,       // Token total supply
  getZkEVMBlockInfo,         // Block information
};

// API: https://explorer-api.zkevm.cronos.org/api/v1
// Requires: ZKEVM_CRONOS_EXPLORER_API_KEY
```

### Multi-Chain Integration Matrix

| Chain | SDK | Network | RPC Provider | Capabilities |
|-------|-----|---------|--------------|--------------|
| **Arkham Intelligence** | REST API | All chains | `api.arkm.com` | Entity intel, whale tracking, fund flows, 20+ chains |
| **Cronos EVM** | `viem` + `ethers.js v6` | Mainnet + Testnet | Cronos RPC | EVM tx, CRC-20, Relay Swaps |
| **Cronos zkEVM** | Native fetch | Mainnet (388) | zkEVM Explorer API | zkCRO, ERC-20, internal tx |
| **Mantle** | `viem` + Etherscan V2 | Mainnet (5000) | Mantle RPC | MNT, portfolio, L2 rollup, contracts |
| **Ethereum** | `viem` + `ethers.js v6` | Mainnet | Infura/Alchemy | ENS, ERC-20/721/1155 |
| **Polygon** | `viem` | PoS Mainnet | QuickNode | Low-cost tx, NFTs |
| **Aptos** | `@aptos-labs/ts-sdk` | Mainnet | Aptos Fullnode | Move, ANS names |
| **Shelby (Aptos)** | `@shelby-protocol/sdk` | Testnet | Shelby RPC | Blob storage, NFT minting, pricing |
| **Flow** | `@onflow/fcl` | Mainnet | Flow Access Node | Cadence, NFTs |
| **SEI** | `@sei-js/core` | Pacific-1 | SEI RPC | Cosmos SDK, IBC |
| **Solana** | Native JSON-RPC | Mainnet | Helius/QuickNode | SPL tokens, DeFi |
| **Monad** | `viem` + Zerion API | Mainnet (143) | Monad RPC | MON, portfolio, DeFi, NFTs, nad.fun |
| **Creditcoin** | Blockscout API | Mainnet | Blockscout RPC | CTC balance, tx, stats |

### Relay Protocol Cross-Chain Swaps

Barzakh AI integrates **Relay Protocol** for seamless cross-chain token swaps with optimized routes:

```typescript
// Available Relay Tools
const relayTools = {
  getRelaySwapQuote,      // Get optimal swap quote across chains
  executeRelaySwap,       // Execute approved cross-chain swap
  getRelaySupportedTokens // List supported tokens per chain
};

// Example: Cross-Chain Swap to BNB Chain
{
  fromChainId: 8453,        // Base
  toChainId: 56,            // BNB Chain (BSC)
  fromToken: "USDC",        // Auto-resolved to contract address
  toToken: "native",        // BNB
  amount: "100",
  // Returns: quote, route, fees, estimated time
}
```

**Features:**
- **85+ Supported Chains**: BNB Chain (BSC), Ethereum, Monad, Base, Optimism, Arbitrum, Polygon, Solana, and more
- **BNB Chain Support**: Full BSC support (Chain ID 56) — swap, bridge, trade any BSC token
- **Swap Completion Tracking**: Prevents duplicate swaps with server-side persistence
- **Optimized Routing**: Best rates via Relay's solver network
- **MEV Protection**: Protected transactions via Relay infrastructure
- **Smart Token Decimals**: Automatic decimal resolution via API + hardcoded fallbacks for safety

---

### 🚀 Four.meme Autonomous Token Launchpad

Barzakh AI features a deep, technical integration with **Four.meme**, allowing for the fully autonomous creation and launch of meme tokens on the BNB Chain (BSC). This integration is designed for high reliability and "Zero-Click" execution.

#### 🛠️ Automated 4-Step Execution Flow
1. **DEX Authentication**: The agent autonomously generates a nonce and signs a login challenge using the agent's delegated wallet to obtain a secure JWT session from the Four.meme backend.
2. **Metadata & Logo Upload**: Multi-modal attachments (PNG, JPG, WEBP, GIF) are intercepted from the chat, proxied through Cloudflare R2 for optimization, and uploaded to the Four.meme secure storage.
3. **Smart Contract Preparation**: The agent constructs the `TokenCreate` transaction payload, auto-configuring complex bonding curve parameters and tax distributions.
4. **On-Chain Execution**: Transactions are signed and broadcast via the embedded agent wallet (Chain ID 56).

#### 🔍 Robust On-Chain Event Parsing
To provide the user with the instant contract address and project URL, the agent implements a multi-ABI fallback strategy for decoding logs:
- **Primary Method**: Standard ABI decoding of the `TokenCreate` event.
- **Secondary Method**: Topic0 Signature Matching. The agent specifically scans for the unique hash:
  `0x396d5e902b675b032348d3d2e9517ee8f0c4a926603fbc075d3d282ff00cad20`
- **Deductive Fallback**: In high-traffic periods, the agent cross-references log topics against the user's wallet address to isolate and extract the newly generated token address with 100% accuracy.

#### 📊 Advanced Tax Configuration
Supports professional-grade distribution models at launch:
- **Burn Rate**: Deflationary supply reduction.
- **Dividends**: Automated sharing with token holders.
- **Liquidity**: Auto-feeding the bonding curve liquidity.
- **Custom Recipients**: Specific dev/fund recipient wallets with automated percentage splits.

#### 🎯 Template Prompt (Copy & Paste)
> [User attaches image/gif] + prompt:

```text
Launch a token named 'Testing Tokens' with symbol 'TEST'
Description: 'ur description here'
Use the image I just uploaded and add:
- 5% Total Tax
- 10% Funds Recipient Wallet (0x15b263cdCf21bb9cba53D12275CD66b05FCE14B8)
- Burn 20%
- Divide To Holders 20% (min 5000000 balance)
- Add to Liquidity 50%
```

---

### 🔶 BNB Chain Integration

Barzakh AI provides **native BNB Chain (BSC) support**:

#### Supported BNB Chain Operations

| Operation | Example Prompt | What Happens |
|-----------|---------------|---------------|
| **Swap to BNB** | _"Trade 100 USDC on Base for BNB"_ | Cross-chain swap via Relay, tx on BSC |
| **Swap from BNB** | _"Swap 0.5 BNB to ETH on Ethereum"_ | Bridge + swap from BSC |
| **BSC Token Swaps** | _"Swap 50 USDT for BNB on BSC"_ | Same-chain swap on BSC |
| **Cross-chain Bridge** | _"Bridge 1 ETH from Ethereum to BNB Chain"_ | Native token bridge to BSC |
| **Portfolio Check** | _"Show my portfolio on BNB Chain"_ | Wallet analysis via Zerion |
| **USD Amounts** | _"Trade $50 worth of BNB to USDC"_ | Auto price conversion + swap |

#### 🎯 Try It — BNB Chain Use Cases

> **Live at [app.sirath.network](https://app.sirath.network)** — paste any prompt below to test.

```
Trade 100 USDC on Base for BNB
```
```
Swap 0.1 BNB to USDC on BSC
```
```
Launch a token on four.meme named 'Testing' with symbol 'TEST'. Burn 10%, add 90% to liquidity.
```
```
Bridge $20 of ETH from Ethereum to BNB Chain
```
```
What chains does Relay support?
```
```
Get a quote to swap 500 USDT on Arbitrum for BNB
```

#### How BNB Chain Transactions Work

```mermaid
flowchart LR
    A["User: Trade 100 USDC for BNB"] --> B["Intent Classifier"]
    B --> C["Smart Chain Inference\nBNB → Chain 56"]
    C --> D["Relay Protocol Quote\n(Best route, fees, time)"]
    D --> E["In-Chat Approval UI"]
    E --> F["Wallet Signs TX"]
    F --> G["Onchain Execution\nTX Hash on BSC"]
```

---

### Monad Ecosystem (Deep Integration)

Barzakh AI provides **10 dedicated Monad tools** for comprehensive interaction with the Monad blockchain (Chain ID 143), a high-performance parallelized EVM L1:

#### Monad On-Chain Tools

| Tool | Function |
|------|----------|
| `getMonadBalance` | Native MON balance for any wallet |
| `getMonadTransaction` | Transaction details by hash |
| `getMonadGasPrice` | Current gas price estimation |
| `getMonadTransactionHistory` | Full transaction history (Zerion API) |
| `getMonadPortfolio` | Complete portfolio: tokens, DeFi, NFTs |
| `getMonadDefiPositions` | DeFi positions (lending, staking, LP) |
| `getMonadNFTs` | NFT holdings and collections |
| `getMonadTokenPositions` | All token balances with USD values |
| `getMonadStats` | Blockchain statistics via MonadScan |
| `searchNadFunTokens` | Search nad.fun tokens by name/symbol/address |

#### nad.fun Token Launchpad Integration

Native integration with **nad.fun**, Monad's bonding curve token launchpad:

```mermaid
flowchart LR
    A["User: Buy Penguin"] --> B["searchNadFunTokens"]
    B --> C["Present Results\n(Name, Price, Address)"]
    C --> D["User Confirms Token"]
    D --> E["Relay Protocol\n(toChainId: 143)"]
    E --> F["In-Chat Approval UI"]
    F --> G["Sign & Execute"]
```

- **Search First**: The AI queries `api.nadapp.net` to find tokens matching the user's query
- **Smart Chain Routing**: All nad.fun tokens are automatically routed to Monad (Chain ID 143)
- **Relay Execution**: Trades execute via Relay Protocol with cross-chain support
- **Monad Meme Token Support**: MOLANDAK, EMO, MOXY, CHOG, MOYAKI, DAK, and more are pre-mapped for instant chain inference

---

### 🎯 Try It — Monad Use Cases

> **Live at [app.sirath.network](https://app.sirath.network)** — paste any prompt below to test.

#### 💰 Portfolio & Balances
```
What is the MON balance of 0x96973F7B83A3c785d94e0a6d8712174aBb81b748?
```
```
Show me the full portfolio for 0x96973F7B83A3c785d94e0a6d8712174aBb81b748 on Monad
```

#### 🔄 Token Swaps (Relay Protocol)
```
Swap 1000 MON to USDC on Monad
```
```
Swap 1 ETH from Ethereum to MON on Monad
```
```
Get a quote to swap MON to MOLANDAK
```

#### 🐸 nad.fun Token Trading
```
Search for Penguin tokens on nad.fun
```
```
Buy Nietzschean Penguin on nad.fun
```
```
What are the trending tokens on nad.fun?
```

#### 🌉 Cross-Chain
```
Bridge 1000 USDC from Base to Monad
```
```
What chains does Relay support?
```

#### 🔍 Exploration
```
Show me the latest transactions on Monad
```
```
What is the current gas price on Monad?
```
```
Tell me about the Monad ecosystem and upcoming events
```

---

### 🕵️ Arkham Intelligence — Blockchain Investigation & Whale Tracking

Barzakh AI integrates **[Arkham Intelligence](https://arkm.com)** with **43 dedicated tools** for deep blockchain investigation, whale tracking, and entity intelligence across **20+ chains** (Ethereum, Bitcoin, Solana, BSC, Tron, TON, Dogecoin, Polygon, Arbitrum, Base, and more).

#### Arkham Tool Categories

| Category | Tools | Key Functions |
|----------|-------|---------------|
| **Intelligence** | 10 | Search entities, address enrichment, batch lookup, entity info, predictions, entity types, balance changes, contract intel, token intel, intel updates |
| **Transfers & Transactions** | 3 | Whale transfer tracking (filter by USD, entity, chain, time), transfer histograms, transaction lookup |
| **Balances & Portfolio** | 4 | Multi-chain balances, Solana subaccounts, portfolio snapshots, portfolio time series |
| **Flow & Analytics** | 5 | USD flow history, top counterparties, volume analysis, activity history, DeFi loan positions |
| **Token Data** | 12 | Top/trending tokens, market data, holders, balances, addresses, price history, price changes, top flows, volume, exchange tokens |
| **DEX Swaps** | 1 | DEX trade history across Uniswap, Sushiswap, and more |
| **Networks & Infra** | 4 | Supported chains, network status, network history, cluster analysis |
| **Market Data** | 2 | Altcoin index, ARKM circulating supply |
| **Tags & Labels** | 2 | Tag info/summary, user custom labels |

#### Supported Arkham Chains

```
ethereum · bitcoin · solana · bsc · polygon · arbitrum · optimism · base
tron · ton · dogecoin · avalanche · fantom · blast · linea · manta
mantle · sonic · flare · zcash
```

#### 🎯 Try It — Arkham Intelligence Use Cases

> **Live at [app.sirath.network](https://app.sirath.network)** — paste any prompt below to test.

##### 🐳 Whale Tracking
```
Show me the largest transfers on Ethereum in the last 24 hours over $1M
```
```
Track fund flows for Binance in the last 7 days
```
```
Who are the top counterparties of Jump Trading?
```

##### 🔍 Entity Investigation
```
Search Arkham for Wintermute
```
```
Get intelligence on address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```
```
What entities are accumulating Bitcoin?
```

##### 📊 Token Analysis
```
Show me trending tokens on Arkham
```
```
Who are the top holders of Ethereum?
```
```
Get price history for Bitcoin from Arkham
```

##### 📈 Market & Portfolio
```
Show Binance's portfolio on Ethereum
```
```
Get the Arkham Altcoin Index
```
```
What are the DeFi loans for this address?
```

---

### 🏔️ Mantle Network — L2 Blockchain Tools

Barzakh AI provides **12 dedicated Mantle tools** for comprehensive interaction with Mantle Network (Chain ID 5000), a high-performance L2 on Ethereum with ultra-low gas fees.

#### Mantle On-Chain Tools

| Tool | Function |
|------|----------|
| `getMantleBalance` | Native MNT balance for any wallet |
| `getMantleBlockInfo` | Block details (number, hash, timestamp, gas) |
| `getMantleTransaction` | Transaction details by hash (with receipt) |
| `getMantleTokenBalance` | ERC-20 token balance on Mantle |
| `getMantleGasPrice` | Current gas price with fee estimates |
| `getMantleTransactionHistory` | Full tx history via Zerion API |
| `getMantleTokenTransfers` | ERC-20 transfer events |
| `getMantleTokenList` | All token holdings for a wallet |
| `getMantlePortfolio` | Complete portfolio: MNT + tokens + DeFi |
| `getMantleContractABI` | Verified contract ABI |
| `getMantleContractSource` | Contract source code |
| `getMantleRollupInfo` | L2 rollup & batch data |

#### 🎯 Try It — Mantle Use Cases

> **Live at [app.sirath.network](https://app.sirath.network)** — paste any prompt below to test.

```
What is the MNT balance of 0x1234...?
```
```
Show my portfolio on Mantle
```
```
What is the current gas price on Mantle?
```
```
Get transaction history for 0x1234... on Mantle
```

---

### 💳 Creditcoin — Blockchain Data Tools

Barzakh AI integrates **Creditcoin** via the Blockscout API for real-time blockchain data and network statistics.

| Tool | Function |
|------|----------|
| `getCreditcoinApiData` | AI-driven query routing to Blockscout API endpoints |
| `getCreditcoinStats` | Network statistics screenshot from Blockscout |

---

### 📦 Shelby Protocol — Decentralized Storage & NFT Minting

Barzakh AI integrates **[Shelby Protocol](https://shelby.xyz)** for decentralized blob storage on the Aptos Testnet blockchain. The AI autonomously uploads, retrieves, and anchors files as **Aptos Token V2 Digital Asset NFTs**.

#### How It Works

```mermaid
flowchart LR
    A["User: 'Store this on Shelby'"] --> B["AI Agent"]
    B --> C{"Text or File?"}
    C -->|Text| D["Buffer.from(text)"]
    C -->|Image/PDF/Video| E["fetchImageAsBase64\n(proxy pipeline)"]
    D --> F["ShelbyNodeClient.upload()"]
    E --> F
    F --> G["Blob on shelbynet"]
    G --> H{"mintAsNFT?"}
    H -->|Yes| I["Ensure Collection\n'Barzakh AI Storage'"]
    I --> J["mintDigitalAsset"]
    J --> K["NFT anchored on-chain"]
    H -->|No| L["Return Explorer URL"]
    K --> L
```

#### Available Shelby Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `uploadToShelby` | `content`, `fileUrl`, `fileName`, `mintAsNFT` | Upload text/files to Shelby; optionally mint as NFT |
| `getShelbyBlob` | `address`, `name` | Retrieve blob content by owner address + blob name |
| `getShelbyStoragePrice` | `sizeInBytes` | Estimate storage cost for a given data size |

#### Supported File Types

| Type | Extensions | Max Size | Notes |
|------|-----------|----------|-------|
| **Text** | `.txt`, `.json`, `.md`, `.csv` | 25 MB | Stored as raw bytes |
| **Images** | `.jpg`, `.png`, `.webp`, `.gif` | 25 MB | Fetched via R2 proxy pipeline |
| **Documents** | `.pdf`, `.doc`, `.docx` | 25 MB | Binary-safe upload |
| **Video** | `.mp4`, `.mov`, `.webm` | 25 MB | Binary-safe upload |
| **Audio** | `.mp3`, `.wav`, `.ogg` | 25 MB | Binary-safe upload |

#### NFT Minting Architecture

- **Collection**: All uploads mint into a unified **"Barzakh AI Storage"** collection
- **Auto-Provisioning**: Collection is created automatically on first mint; subsequent mints detect `ECOLLECTION_ALREADY_EXISTS` and proceed
- **Asset URI**: Each NFT's `uri` points to the Shelby `publicUrl`, making content directly accessible
- **Network**: Aptos Testnet
- **Signer**: Ed25519 key from `SHELBY_APTOS_PRIVATE_KEY` (server-side only)

#### 🎯 Try It — Shelby Use Cases

> **Live at [app.sirath.network](https://app.sirath.network)** — paste any prompt below to test.

```
Store "Hello World" on Shelby Protocol
```
```
Store this image on Shelby and mint it as an NFT
```
_(attach any image to the chat)_
```
Store this PDF on Shelby Protocol
```
_(attach any PDF to the chat)_
```
How much does it cost to store 1MB on Shelby?
```

---



### 💎 Renaiss Protocol — Collectibles Marketplace & Zero-Knowledge Gacha

Barzakh AI features deep integration with the **Renaiss Protocol** (on BNB Chain), allowing users to explore vaulted collectible cards (Pokémon and One Piece), trace certified slab valuations, manage watchlist drop alerts, and interact with zero-knowledge verifiable card gacha packs.

#### 🛠️ Available Renaiss Tools

| Tool | Parameters | Function |
|------|------------|----------|
| `searchRenaissCards` | `keyword`, `ip`, `minGrade`, `maxPrice`, `sortBy` | Search the Renaiss marketplace for collectible cards (listed & unlisted). Excludes index-only records to guarantee marketplace existence. |
| `getRenaissCardPrice` | `cardId` | Check current listing price, Fair Market Value (FMV), and discrepancy premium/discount indicators. |
| `getRenaissCardDetails` | `cardId` | Fetch verified PSA/CGC/BGS cert details, scan images, and historical sales chart metrics. |
| `getRenaissMarketTrends` | `ip` | Fetch 24h trading volume overview, top gainers, and trending marketplace listings. |
| `analyzeRenaissCollection` | `address` | Run a real-time `balanceOf` scan on the BNB Chain contract to evaluate a wallet's vault collection value. |
| `watchRenaissCard` | `cardId`, `targetPrice` | Setup drops alerts or buy-triggers for a specific card. |
| `getRenaissPacks` | None | List active card booster packs available for gacha draws. |
| `getRenaissPackDetails` | `packSlug` | Fetch expected value (EV), top card drop rates, recent pulls, and zero-knowledge fairness metrics. |

#### 🔑 Environment Configurations & API Key Rotation

To avoid getting hit by the anonymous `10 requests/day per IP` rate limit in production, configure partner-tier API credentials in your `.env` file. Barzakh AI supports **automatic API key rotation** across multiple key pairs:

```env
# Comma-separated API credentials for rotation (10k requests/day per key)
RENAISS_X_API_KEY=key_1, key_2, key_3
RENAISS_X_API_SECRET=secret_1, secret_2, secret_3
```

- **Failover & Rotation**: The AI agent automatically monitors responses. If a key hits a `429 Too Many Requests` or JSON `"rate_limited"` error, it rotates to the next key pair in the list and retries the request transparently.
- **Listed & Unlisted Separation**: Listed items display their current ask price, while unlisted/vaulted cards are clearly labeled as **"Unlisted"** or **"Vaulted (Unlisted)"** on the frontend, using their FMV index value for reference only.

#### 🎯 Try It — Renaiss Use Cases

> **Live at [app.sirath.network](https://app.sirath.network)** — paste any prompt below to test.

##### 🔍 Marketplace Search & Pricing
```
Search the Renaiss marketplace for Luffy cards with a minimum grade of 9
```
```
What is the price and FMV of the OP07 Boa Hancock card?
```
```
Show me Pokémon cards listed under $200
```

##### 📈 Market Trends & Whale Intelligence
```
What are the trending cards and market overview on Renaiss?
```
```
Explain the top gainers on the One Piece card market today
```

##### 🎲 Zero-Knowledge Booster Packs & Gacha
```
What gacha card packs are available on Renaiss?
```
```
Show details and expected value for the Eden pack
```

##### 📊 Wallet Collections
```
Analyze my collections for wallet 0x39ba5db37996cba53d12275cd66b05fce14b8765 on BNB Chain
```

---

## x402 Crypto Payment Protocol

### Gasless Payment Flow (EIP-3009)

The x402 implementation uses **EIP-3009 TransferWithAuthorization** for USDC payments on Base:

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Frontend as 🖥️ Frontend
    participant API as 📡 Backend API
    participant Wallet as 🔐 Wallet
    participant Facilitator as ⚡ x402 Facilitator
    participant Chain as ⛓️ Blockchain

    Note over User,Chain: Step 1: Wallet Verification
    User->>Frontend: Connect Wallet
    Frontend->>API: GET /api/billing/x402/verify-wallet?address=0x...
    API-->>Frontend: Nonce Message (EIP-191)

    Frontend->>Wallet: Sign Message Request
    User->>Wallet: Approve Signature
    Wallet-->>Frontend: Signature (65 bytes)

    Frontend->>API: POST /api/billing/x402/verify-wallet
    Note over API: ecrecover(hash, sig) == address
    API-->>Frontend: Wallet Verified ✓

    Note over User,Chain: Step 2: Payment Initialization
    Frontend->>API: POST /api/billing/x402/subscribe
    API-->>Frontend: 402 Payment Required<br/>{amount, recipient, paymentRequirements}

    Note over User,Chain: Step 3: EIP-712 Signature (Gasless)
    Frontend->>Frontend: Build EIP-712 TypedData<br/>(TransferWithAuthorization)
    Frontend->>Wallet: signTypedData_v4
    User->>Wallet: Approve Signature
    Wallet-->>Frontend: EIP-712 Signature

    Note over User,Chain: Step 4: Settlement
    Frontend->>API: POST /api/billing/x402/settle<br/>{paymentHeader, paymentRequirements}
    API->>Facilitator: Verify + Submit Transaction
    Facilitator->>Chain: transferWithAuthorization()
    Chain-->>Facilitator: TX Receipt
    Facilitator-->>API: {txHash, blockNumber}

    API->>API: Activate Subscription<br/>Set x402PeriodEnd
    API-->>Frontend: 200 OK - Subscription Active
```

### EIP-712 Domain & Types

```typescript
// EIP-712 Domain for USDC on Base
const domain = {
  name: "USD Coin",
  version: "2",
  chainId: 8453,
  verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

// EIP-3009 TransferWithAuthorization Types
const types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};
```

### Subscription Management

| Event | Action |
|-------|--------|
| **Payment Success** | Set `tier`, `x402PeriodEnd`, reset `dailyMessageRemaining` |
| **Real-time Check** | Chat route checks `x402PeriodEnd` on every request |
| **Cron Job** | Every 6 hours, downgrade expired subscriptions |
| **Cancel at Period End** | Set `x402CancelAtPeriodEnd = true`, keep benefits until expiry |
| **Cancel Immediately** | Downgrade to `free` tier instantly |

---

## Security

### Authentication Architecture

```mermaid
flowchart TB
    subgraph Entry["🌐 Entry Points"]
        Email["Email + Password"]
        Google["Google OAuth 2.0"]
        Wallet["Wallet Connect<br/>(EIP-4361 SIWE)"]
    end

    subgraph Verification["🔐 Multi-Factor Verification"]
        Password["Password<br/>(bcrypt, 12 rounds)"]
        TOTP["TOTP 2FA<br/>(RFC 6238, 30s window)"]
        EmailOTP["Email OTP<br/>(6-digit, 10min TTL)"]
        WalletSig["Wallet Signature<br/>(EIP-191)"]
    end

    subgraph Session["🎫 Session Management"]
        JWT["JWT Token<br/>(HS256, httpOnly)"]
        Cookie["Secure Cookie<br/>(SameSite=Lax)"]
        Refresh["Session Refresh<br/>(sliding window)"]
    end

    subgraph Protected["🛡️ Protected Operations"]
        Normal["Normal Ops<br/>(Session Only)"]
        Sensitive["Sensitive Ops<br/>(Re-auth Required)"]
    end

    subgraph SensitiveOps["Re-authentication Required"]
        Delete["Account Deletion"]
        WalletBind["Wallet Bind/Unbind"]
        EmailChange["Email Change"]
        PasswordChange["Password Change"]
    end

    Email --> Password --> TOTP
    Google --> JWT
    Wallet --> WalletSig --> JWT
    Password --> EmailOTP

    TOTP --> JWT
    EmailOTP --> JWT

    JWT --> Cookie --> Session
    Session --> Normal
    Session --> Sensitive --> SensitiveOps

    style Sensitive fill:#ff6b6b
    style SensitiveOps fill:#ff8787
```

### AI Security Defense Layers

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           AI SECURITY DEFENSE LAYERS                                 │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 1: INPUT SANITIZATION                                                 │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐    │    │
│  │  │ Homoglyph   │ │ Invisible   │ │ RTL/LTR     │ │ Unicode              │    │    │
│  │  │ Detection   │ │ Char Strip  │ │ Override    │ │ Normalization        │    │    │
│  │  │ (Lookalikes)│ │ (U+200B,etc)│ │ Removal     │ │ (NFC/NFKC)           │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                              │
│                                       ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 2: PROMPT INJECTION DEFENSE                                           │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐    │    │
│  │  │ Direct      │ │ Indirect    │ │ Jailbreak   │ │ Role/Context         │    │    │
│  │  │ Injection   │ │ Injection   │ │ Pattern     │ │ Manipulation         │    │    │
│  │  │ Detection   │ │ (via URLs)  │ │ Matching    │ │ Prevention           │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                              │
│                                       ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 3: MEDIA & FILE PROTECTION                                            │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐    │    │
│  │  │ Polyglot    │ │ EXIF/Meta   │ │Steganography│ │ File Type            │    │    │
│  │  │ File        │ │ Data Strip  │ │ Detection   │ │ Validation           │    │    │
│  │  │ Detection   │ │             │ │             │ │ (Magic Bytes)        │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                              │
│                                       ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 4: MODEL PROTECTION                                                   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐    │    │
│  │  │ Sponge      │ │ Model       │ │ Model       │ │ Output               │    │    │
│  │  │ Attack      │ │ Extraction  │ │ Inversion   │ │ Filtering            │    │    │
│  │  │ Prevention  │ │ Defense     │ │ Guard       │ │ (PII, Secrets)       │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                              │
│                                       ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 5: RUNTIME MONITORING                                                 │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐    │    │
│  │  │ Rate        │ │ Anomaly     │ │ x402 Expiry │ │ Audit                │    │    │
│  │  │ Limiting    │ │ Detection   │ │ Check       │ │ Logging              │    │    │
│  │  │ (Tier-based)│ │ (Pattern)   │ │ (Real-time) │ │ (Compliance)         │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Threat Protection Matrix

| Threat Category | Attack Vector | Defense Mechanism |
|-----------------|---------------|-------------------|
| **Prompt Injection** | Direct system prompt override | Pattern matching, input boundary enforcement |
| **Indirect Injection** | Malicious content via URLs/files | Content isolation, sandboxed parsing |
| **Jailbreak Attempts** | Role manipulation, DAN prompts | System prompt hardening, output monitoring |
| **Homoglyph Attacks** | Lookalike Unicode characters | Character normalization, visual similarity detection |
| **Invisible Characters** | Zero-width chars (U+200B, U+FEFF) | Whitespace stripping, control char removal |
| **Polyglot Files** | Images containing executable code | Magic byte validation, metadata stripping |
| **Sponge Attacks** | DoS via expensive computations | Token limits, complexity analysis, timeouts |
| **Data Exfiltration** | PII/secrets in AI outputs | Output filtering, regex-based redaction |
| **Unauthorized Access** | Direct object access | Private R2 buckets + Short-lived (15m) Signed URLs |

---

## Project Structure

```
barzakh-ai/
├── apps/
│   ├── frontend/                     # Next.js 16.2 Application
│   │   ├── app/
│   │   │   ├── (auth)/               # Auth pages (login, register, 2FA)
│   │   │   ├── (chat)/               # Chat interface + API routes
│   │   │   │   └── api/              # Protected API endpoints
│   │   │   │       └── chat/         # AI chat with tool execution
│   │   │   └── api/                  # Public API routes
│   │   │       ├── 2fa/              # TOTP setup & verification
│   │   │       ├── auth/             # NextAuth handlers
│   │   │       ├── billing/          # Stripe + x402 payments
│   │   │       │   └── x402/         # Crypto payment endpoints
│   │   │       │       ├── subscribe/   # Get payment requirements
│   │   │       │       ├── settle/      # Execute settlement
│   │   │       │       ├── verify/      # Verify transaction
│   │   │       │       └── verify-wallet/  # Wallet signature verification
│   │   │       ├── cron/             # Scheduled jobs
│   │   │       │   └── check-subscriptions/  # x402 expiry check (every 6h)
│   │   │       └── settings/         # User preferences
│   │   ├── components/
│   │   │   ├── message.tsx           # Chat message component
│   │   │   ├── settings/             # Settings UI
│   │   │   │   └── plans/
│   │   │   │       └── x402-payment-modal.tsx  # Crypto payment modal
│   │   │   └── ui/                   # Radix UI primitives
│   │   └── lib/
│   │       ├── db/                   # Drizzle ORM
│   │       │   ├── schema.ts         # Database schema
│   │       │   └── migrations/       # SQL migrations
│   │       ├── stripe.ts             # Stripe configuration
│   │       └── wagmi.ts              # Web3 configuration
│   │
│   └── backend/                      # Supplementary backend services
│
├── packages/
│   └── shared/                       # Shared utilities (@barzakh/shared)
│       └── src/lib/
│           ├── ai/
│           │   ├── models.ts         # Model configurations
│           │   ├── prompts.ts        # System prompts (100KB+)
│           │   ├── intent-classifier.ts  # Chain-aware routing
│           │   └── tools/            # 100+ blockchain tools
│           │       ├── onchain/      # Arkham Intelligence (43 tools)
│           │       ├── cronos/       # Cronos EVM + zkEVM + VVS DEX
│           │       │   ├── cronos-tools.ts        # Cronos EVM (12 tools)
│           │       │   ├── cronos-zkevm-tools.ts  # Cronos zkEVM (11 tools)
│           │       │   ├── vvs-swap.ts            # VVS Finance DEX
│           │       │   └── ai-agent-sdk.ts        # AI Agent SDK wrapper
│           │       ├── aptos/        # Aptos + Shelby Protocol
│           │       │   └── shelby-tools.ts  # Blob upload, retrieval, pricing, NFT minting
│           │       ├── solana/       # Solana-specific
│           │       ├── evm/          # EVM chains
│           │       ├── flow/         # Flow blockchain
│           │       ├── sei/          # SEI chain
│           │       ├── zeta/         # Zeta chain
│           │       ├── monad/        # Monad mainnet
│           │       ├── mantle/       # Mantle L2 (12 tools)
│           │       ├── creditcoin/   # Creditcoin (Blockscout)
│           │       └── relay/        # Relay Protocol cross-chain swaps
│           ├── payments/
│           │   └── x402-facilitator.ts  # x402 protocol implementation
│           ├── security/             # Input sanitization
│           └── utils/                # Shared utilities
│
├── docs/
│   ├── cloudflare-api-schema.yaml    # OpenAPI 3.0 spec (source)
│   └── cloudflare-api-schema.json    # OpenAPI 3.0 spec (generated)
│
├── turbo.json                        # Turborepo configuration
├── pnpm-workspace.yaml               # pnpm workspace config
└── package.json                      # Root package.json
```

---

## Development

### Prerequisites

| Requirement | Version | Install |
|-------------|---------|--------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| pnpm | 10+ | `npm install -g pnpm` |
| PostgreSQL | 15+ | [neon.tech](https://neon.tech) (free serverless) or local install |

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp apps/frontend/.env.example apps/frontend/.env.local
# Edit .env.local with your API keys (see below)

# Run database migrations
pnpm --filter frontend db:migrate

# Start development server
pnpm dev
```

### Environment Variables

Create `apps/frontend/.env.local`:

```env
# ── Database (Required) ──────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# ── Auth (Required) ──────────────────────────────────────────────────────
NEXTAUTH_SECRET=your-secret-key          # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...                     # Google OAuth (optional)
GOOGLE_CLIENT_SECRET=...

# ── AI Providers (Required) ───────────────────────────────────────────
OPENROUTER_ENDPOINT=https://...services.ai.azure.com/openai/v1
OPENROUTER_API_KEY=...               # OpenRouter API key or bearer token
OPENROUTER_CONNECT_ATTEMPT_TIMEOUT_MS=5000

# ── Azure GPT-Image-2 Imagine Tool ───────────────────────────────────
OPENROUTER_IMAGE_MODEL=gpt-image-2
OPENROUTER_IMAGE_QUALITY=low          # low | medium | high
OPENROUTER_IMAGE_SIZE=1024x1024       # any GPT-Image-2-valid WIDTHxHEIGHT
OPENROUTER_IMAGE_TIMEOUT_MS=600000
OPENROUTER_IMAGE_STREAM=false
OPENROUTER_IMAGE_PARTIAL_IMAGES=2

# ── Blockchain / Relay Protocol ──────────────────────────────────────────
# No API key needed for Relay Protocol — it's open and permissionless!

# ── External APIs (Optional) ─────────────────────────────────────────────
ZERION_API_KEY=...                       # Wallet portfolio analysis
TAVILY_API_KEY=...                       # Web search tool
ARKHAM_API_KEY=...                       # Arkham Intelligence (whale tracking, entity intel)
ETHERSCAN_API_KEY=...                    # Etherscan V2 (Mantle, multi-chain)

# ── Payments (Optional) ──────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Storage (Required for persistent generated/edited images) ───────────
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=https://...               # Public/custom R2 URL used in chat results

# ── Security ─────────────────────────────────────────────────────────────
CRON_SECRET=your-cron-secret
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm dev:frontend` | Run frontend only |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm --filter frontend db:generate` | Generate migration files |
| `pnpm --filter frontend db:migrate` | Run migrations |
| `pnpm --filter frontend db:studio` | Open Drizzle Studio |
| `pnpm --filter frontend db:push` | Push schema changes (dev) |

---

## API Documentation

Full OpenAPI 3.0 specification available in `/docs/cloudflare-api-schema.yaml`.

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/*` | * | NextAuth handlers |
| `/api/2fa/*` | POST | Two-factor authentication |
| `/api/billing/subscription` | GET | Subscription status |
| `/api/billing/x402/subscribe` | POST | Initiate x402 payment |
| `/api/billing/x402/verify-wallet` | GET/POST | Wallet signature verification |
| `/api/billing/x402/settle` | POST | Settle x402 payment |
| `/api/billing/x402/verify` | POST | Verify transaction |
| `/api/relay/swap-tracking` | GET/POST | Track swap completion status |
| `/api/zerion/positions` | GET | Token positions by chain |
| `/api/zerion/nft-collections` | GET | NFT collections (public) |
| `/api/zerion/nft-portfolio` | GET | NFT portfolio overview |
| `/api/wallet/verify-signature` | GET/POST | Unified wallet verification |
| `/api/settings` | GET/PATCH | User settings |
| `/api/settings/wallet/*` | * | Wallet binding/unbinding |
| `/api/cron/check-subscriptions` | GET | x402 expiry check (cron) |

### Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Chat API | Tier-based | Daily |
| Billing | 20 requests | 1 minute |
| Settings | 30 requests | 1 minute |

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### vercel.json Configuration

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm run build --filter=barzakh",
  "crons": [
    {
      "path": "/api/messagelimitcron",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/check-subscriptions",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Environment Configuration

| Environment | URL | Branch |
|-------------|-----|--------|
| Production | app.sirath.network | main |
| API | staging.sirath.network | main |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- TypeScript strict mode
- Biome for linting and formatting
- ESLint + Prettier integration
- Conventional Commits

---

## License

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  <strong>Built by <a href="https://www.sirath.network">Sirath Network</a></strong>
</p>

<p align="center">
  <sub>🚀 AI Agent that executes onchain | ⛓️ 85+ chains via Relay | 🕵️ 43 Arkham Intel tools | 🔒 Security First</sub>
</p>
