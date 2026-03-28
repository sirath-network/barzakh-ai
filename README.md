# Barzakh AI

<p align="center">
  <img width="100%" alt="Barzakh AI Banner" src="https://github.com/user-attachments/assets/bdb03347-8615-4be3-8920-aca4a7fc54b5" />
</p>

<p align="center">
  <strong>🧠 AI-Powered Onchain Agent — Execute Trades, Bridges & DeFi via Natural Language</strong>
</p>

<p align="center">
  <a href="https://chat.barzakh.tech"><img src="https://img.shields.io/badge/🚀_Live_-chat.barzakh.tech-ede8e8?style=for-the-badge" alt="Live"></a>&nbsp;
  <a href="./docs/WHITEPAPER.md"><img src="https://img.shields.io/badge/📄_Whitepaper-Read_Now-ede8e8?style=for-the-badge" alt="Whitepaper"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Relay_Protocol-Cross--Chain-ede8e8" alt="Relay Protocol">
  <img src="https://img.shields.io/badge/TypeScript-5.6-ede8e8?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-16.1-ede8e8?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19.2-ede8e8?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18+-ede8e8?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Turborepo-2.7-ede8e8?logo=turborepo&logoColor=white" alt="Turborepo">
  <img src="https://img.shields.io/badge/Vercel-Deployed-ede8e8?logo=vercel" alt="Vercel">
  <img src="https://img.shields.io/badge/License-MIT-ede8e8" alt="MIT License">
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [BNB Chain Integration](-#bnb-chain-integration)
- [Development](#development)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AI Models & Orchestration](#ai-models--orchestration)
- [Blockchain Tools](#blockchain-tools)
- [x402 Crypto Payment Protocol](#x402-crypto-payment-protocol)
- [Security](#security)
- [Project Structure](#project-structure)
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
| **Cross-Chain Execution** | 85+ chains via Relay Protocol (BSC, Base, Ethereum, Arbitrum, Solana, etc.) |
| **Decentralized Storage** | Upload text, images, PDFs, videos to Shelby Protocol (Aptos `shelbynet`) with optional NFT minting |
| **Multi-Model AI** | GPT-4o/4.1/5, Claude Opus 4.6, Grok 4.1, GLM 4.7 with intelligent routing |
| **Smart Chain Inference** | Auto-detects which chain a token belongs to — no need to specify |
| **65+ Blockchain Tools** | Chain-specific analyzers for Monad, Cronos, EVM (Including BNB Chain), Aptos, Solana, Flow, SEI |
| **Enterprise Security** | 2FA (TOTP), wallet signature auth, prompt injection defense, Cloudflare API Shield |
| **Crypto Payments** | x402 protocol with EIP-3009/EIP-712 USDC payments on Base |

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
│  │                         Next.js 16.1 (App Router + RSC)                         │  │
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
│  │  Vercel AI SDK  │  │  Multi-Model    │  │   85+ Tools     │  │   SSE/Chunks    │ │
│  │    v4.1.17      │  │  Intent Router  │  │   10+ Chains    │  │  Transfer-Enc   │ │
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
│  │  │  OpenAI  │  │Anthropic │  │   xAI    │  │  Zhipu   │  │   OpenRouter       │  │  
│  │  │ GPT-4o/5 │  │ Claude   │  │  Grok 2  │  │ GLM-4.7  │  │  (Aggregator)    │ │  │
│  │  │ o1/o3    │  │ Opus 4.6 │  │   4.1    │  │  Plus    │  │  Multi-Provider  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Prompt Engineer │  │ Input Sanitizer │  │        Response Streamer            │  │
│  │  58KB+ System   │  │ Injection Guard │  │    Token-by-Token SSE Output        │  │
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
│  │  │  Solana  │  │   Zeta   │  │  Monad   │  │ Wormhole │  │    Vana/CC       │   │  │
│  │  │   RPC    │  │  ZetaVM  │  │ Mainnet  │  │  Bridge  │  │  Data Networks   │   │  │
│  │  │  DeFi    │  │  Testnet │  │ nad.fun  │  │  X-Chain │  │    Protocol      │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                            Utility Tool Modules                                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │  │
│  │  │DeFi Llama│  │Web Search│  │  News    │  │ X/Twitter│  │  Image Gen       │   │  │
│  │  │   TVL    │  │  Tavily  │  │  Search  │  │  Search  │  │  Gemini 2.5      │   │  │
│  │  │   API    │  │  Search  │  │   API    │  │   API    │  │   Imagen 3       │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                  DATA LAYER                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   PostgreSQL    │  │  Cloudflare R2  │  │   Drizzle ORM   │  │   Connection    │  │
│  │   (Neon/Turso)  │  │  Object Storage │  │   Type-Safe     │  │    Pooling      │  │
│  │    v0.34.1      │  │   File Upload   │  │   Migrations    │  │   Prepared      │  │
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
| **Package Manager** | pnpm | 8.6.12 | Fast, disk-efficient |
| **Monorepo** | Turborepo | 2.7.2 | Build orchestration |
| **Framework** | Next.js | 16.1.0 | Full-stack React framework |
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
| **AI SDK** | Vercel AI SDK 4.1.17 |
| **Database** | PostgreSQL 15, Drizzle ORM 0.34.1 |
| **Auth** | NextAuth.js 5.0.0-beta.30 |
| **Payments** | Stripe 18.5, x402 Protocol (EIP-3009) |
| **Email** | Nodemailer 6.10 |

### Web3 Stack

| Category | Technologies |
|----------|-------------|
| **Wallet** | Wagmi 2.19, RainbowKit 2.2.9, OneChain (@onelabs/dapp-kit) |
| **Ethereum** | Viem 2.41, ethers.js v6 |
| **Chains** | Monad, Cronos, Ethereum, Polygon, Aptos, Solana, Flow, SEI + 50 via Relay |
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

| Model ID | Display Name | Provider | Backend Model | Use Case |
|----------|--------------|----------|---------------|----------|
| `openai-gpt-4o` | **GPT 4o** | OpenRouter | `openai/gpt-4o` | Fast, lightweight tasks |
| `openai-gpt-4.1` | **GPT 4.1** | OpenRouter | `openai/gpt-4.1` | Complex, multi-step tasks |
| `openai-gpt-5.1` | **GPT 5.1** | OpenRouter | `openai/gpt-5.1` | Experimental, next-gen |
| `openai-gpt-5.2` | **GPT 5.2** | OpenRouter | `openai/gpt-5.2` | Experimental, advanced |
| `zai-glm-4.7` | **GLM 4.7** | OpenRouter | `z-ai/glm-4.7` | Multilingual |
| `anthropic-haiku-4.5` | **Claude Haiku 4.5** | OpenRouter | `anthropic/claude-haiku-4.5` | Fast, lightweight Claude |
| `anthropic-opus-4.6` | **Claude Opus 4.6 Thinking** | OpenRouter | `anthropic/claude-opus-4.6` | Deep analysis, thinking mode |
| `google-gemini-3-flash` | **Gemini 3 Flash** | OpenRouter | `google/gemini-3-flash-preview` | Fast Gemini responses |
| `google-gemini-2.5-flash-preview` | **Gemini 2.5 Flash Preview** | OpenRouter | `google/gemini-2.5-flash` | Preview Gemini tasks |
| `xai-grok-4.1-fast` | **Grok 4.1 Fast** | OpenRouter | `x-ai/grok-4.1-fast` | Fast reasoning |

### Image Generation

| Model ID | Display Name | Provider | Description |
|----------|--------------|----------|-------------|
| `google/gemini-3.1-flash-image-preview` | **Gemini 3.1 Flash Image Preview** | OpenRouter | Fast, high-fidelity image generation |


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

## Blockchain Tools

### Tool Inventory by Chain

| Chain | Tools | Key Capabilities |
|-------|-------|------------------|
| **Cronos EVM** | 12 | Balance, tokens, transactions, gas, market data, VVS swaps, pool info, internal tx, logs |
| **Cronos zkEVM** | 11 | zkCRO balance, tx history, token transfers, internal tx, contract ABI/source, token supply, block info |
| **EVM (Generic)** | 6 | Etherscan, Zerion portfolio, ENS resolution, multi-chain wallet |
| **Aptos + Shelby** | 13 | Coin balance, resources, modules, ANS names, transactions, **Shelby blob upload, retrieval, pricing, NFT minting** |
| **Solana** | 4 | Token balances, portfolio, market data |
| **Flow** | 3 | Cadence scripts, NFT collections |
| **SEI** | 4 | Cosmos queries, IBC transfers |
| **Zeta** | 3 | ZetaVM testnet, cross-chain messaging |
| **Monad** | 10 | MON balance, tx details, gas, portfolio, DeFi positions, NFTs, token positions, stats, nad.fun search |
| **Wormhole** | 2 | Cross-chain bridge, guardian verification |
| **Utility** | 8 | Web search, news, X/Twitter, DeFi Llama, image generation |

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
| **Cronos EVM** | `viem` + `ethers.js v6` | Mainnet + Testnet | Cronos RPC | EVM tx, CRC-20, Relay Swaps |
| **Cronos zkEVM** | Native fetch | Mainnet (388) | zkEVM Explorer API | zkCRO, ERC-20, internal tx |
| **Ethereum** | `viem` + `ethers.js v6` | Mainnet | Infura/Alchemy | ENS, ERC-20/721/1155 |
| **Polygon** | `viem` | PoS Mainnet | QuickNode | Low-cost tx, NFTs |
| **Aptos** | `@aptos-labs/ts-sdk` | Mainnet | Aptos Fullnode | Move, ANS names |
| **Shelby (Aptos)** | `@shelby-protocol/sdk` | Shelbynet | Shelby RPC | Blob storage, NFT minting, pricing |
| **Flow** | `@onflow/fcl` | Mainnet | Flow Access Node | Cadence, NFTs |
| **SEI** | `@sei-js/core` | Pacific-1 | SEI RPC | Cosmos SDK, IBC |
| **Solana** | Native JSON-RPC | Mainnet | Helius/QuickNode | SPL tokens, DeFi |
| **Monad** | `viem` + Zerion API | Mainnet (143) | Monad RPC | MON, portfolio, DeFi, NFTs, nad.fun |

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

> **Live at [chat.barzakh.tech](https://chat.barzakh.tech)** — paste any prompt below to test.

```
Trade 100 USDC on Base for BNB
```
```
Swap 0.1 BNB to USDC on BSC
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

> **Live at [chat.barzakh.tech](https://chat.barzakh.tech)** — paste any prompt below to test.

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

### 📦 Shelby Protocol — Decentralized Storage & NFT Minting

Barzakh AI integrates **[Shelby Protocol](https://shelby.xyz)** for decentralized blob storage on the Aptos-based `shelbynet` blockchain. The AI autonomously uploads, retrieves, and anchors files as **Aptos Token V2 Digital Asset NFTs**.

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
- **Network**: `shelbynet` (experimental Aptos environment)
- **Signer**: Ed25519 key from `SHELBY_APTOS_PRIVATE_KEY` (server-side only)

#### 🎯 Try It — Shelby Use Cases

> **Live at [chat.barzakh.tech](https://chat.barzakh.tech)** — paste any prompt below to test.

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
│   ├── frontend/                     # Next.js 16.1 Application
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
│           │   ├── prompts.ts        # System prompts (58KB+)
│           │   ├── intent-classifier.ts  # Chain-aware routing
│           │   └── tools/            # 65+ blockchain tools
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
│           │       ├── monad/        # Monad (testnet)
│           │       ├── wormhole/     # Cross-chain bridge
│           │       └── onchain/      # Cross-chain utilities
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

# ── AI Providers (At least one required) ─────────────────────────────────
OPENAI_API_KEY=sk-...                    # OpenAI API key
OPENROUTER_API_KEY=...                   # OpenRouter (gives access to Claude, Grok, Gemini, etc.)
GOOGLE_GENERATIVE_AI_API_KEY=...         # Gemini image generation

# ── Blockchain / Relay Protocol ──────────────────────────────────────────
# No API key needed for Relay Protocol — it's open and permissionless!

# ── External APIs (Optional) ─────────────────────────────────────────────
ZERION_API_KEY=...                       # Wallet portfolio analysis
TAVILY_API_KEY=...                       # Web search tool

# ── Payments (Optional) ──────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ── Storage (Optional) ───────────────────────────────────────────────────
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

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
| Production | chat.barzakh.tech | main |
| API | staging.barzakh.tech | main |

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
  <strong>Built by <a href="https://www.barzakh.tech">Sirath Network</a></strong>
</p>

<p align="center">
  <sub>🚀 AI Agent that executes onchain | ⛓️ 85+ chains via Relay | 🔒 Security First</sub>
</p>
