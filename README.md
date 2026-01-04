# Barzakh AI

<p align="center">
  <img width="100%" alt="Barzakh AI Banner" src="https://github.com/user-attachments/assets/bdb03347-8615-4be3-8920-aca4a7fc54b5" />
</p>

<p align="center">
  <strong>🧠 AI-Powered Blockchain Intelligence Platform</strong>
</p>

<p align="center">
  <a href="https://chat.barzakh.tech"><img src="https://img.shields.io/badge/Live-chat.barzakh.tech-blue?style=for-the-badge" alt="Live Demo"></a>&nbsp;
  <a href="./docs/WHITEPAPER.md"><img src="https://img.shields.io/badge/📄_Whitepaper-Read_Now-purple?style=for-the-badge" alt="Whitepaper"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/pnpm-8.6-F69220?logo=pnpm&logoColor=white" alt="pnpm">
  <img src="https://img.shields.io/badge/Turborepo-2.7-EF4444?logo=turborepo&logoColor=white" alt="Turborepo">
  <img src="https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel" alt="Vercel">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AI Models & Orchestration](#ai-models--orchestration)
- [Blockchain Tools](#blockchain-tools)
- [x402 Crypto Payment Protocol](#x402-crypto-payment-protocol)
- [Security](#security)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Barzakh AI is an enterprise-grade, full-stack blockchain analytics platform that combines real-time on-chain data with multi-model AI orchestration. Built as a **Turborepo monorepo** with pnpm workspaces, it provides intelligent wallet analysis, DeFi insights, automated blockchain workflows, and gasless crypto payments.

### ✨ Key Capabilities

| Feature | Description |
|---------|-------------|
| **Multi-Model AI** | GPT-4o/4.1/5, Claude Opus 4.5, Grok 4.1, GLM 4.7 with intelligent routing |
| **50+ Blockchain Tools** | Chain-specific analyzers for Cronos, EVM, Aptos, Solana, Flow, SEI, Zeta, Monad |
| **x402 Gasless Payments** | EIP-3009/EIP-712 gasless USDC payments on Cronos |
| **VVS DEX Integration** | Swap quotes, liquidity pools, and token lists from VVS Finance |
| **Enterprise Security** | 2FA (TOTP), wallet signature auth, Cloudflare API Shield |
| **Real-time Streaming** | Token-by-token SSE output with Vercel AI SDK |
| **Subscription Management** | Stripe + x402 crypto payments with automatic expiration handling |

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
│  │  Vercel AI SDK  │  │  Multi-Model    │  │   50+ Tools     │  │   SSE/Chunks    │ │
│  │    v4.1.17      │  │  Intent Router  │  │   12 Chains     │  │  Transfer-Enc   │ │
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
│  │  │  OpenAI  │  │Anthropic │  │   xAI    │  │  Zhipu   │  │   CometAPI       │ │  │
│  │  │ GPT-4o/5 │  │ Claude   │  │  Grok 2  │  │ GLM-4.7  │  │  (Aggregator)    │ │  │
│  │  │ o1/o3    │  │ Opus 4.5 │  │   4.1    │  │  Plus    │  │  Multi-Provider  │ │  │
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
│  │  │   RPC    │  │  ZetaVM  │  │   Next   │  │  Bridge  │  │  Data Networks   │   │  │
│  │  │  DeFi    │  │  Testnet │  │   Gen    │  │  X-Chain │  │    Protocol      │   │  │
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
| **Wallet** | Wagmi 2.19, RainbowKit 2.2.9 |
| **Ethereum** | Viem 2.41, ethers.js v6 |
| **Chains** | Cronos, Ethereum, Polygon, Aptos, Solana, Flow, SEI |
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
| `chat-model-small` | **GPT 4o** | OpenAI | `gpt-4o` | Fast, lightweight tasks |
| `chat-model-large` | **GPT 4.1** | OpenAI | `gpt-4.1-2025-04-14` | Complex, multi-step tasks |
| `chat-model-gigantic` | **GPT 5.1** ⭐ | CometAPI | `gpt-5.1` | Experimental, next-gen |
| `chat-model-colossal` | **GPT 5.2** | CometAPI | `gpt-5.2` | Experimental, advanced |
| `chat-model-glm` | **GLM 4.7** | CometAPI | `glm-4.7` | Multilingual |
| `chat-model-claude` | **Claude Opus 4.5 Thinking** | CometAPI | `claude-opus-4-5-20251101-thinking` | Deep analysis, thinking mode |

> ⭐ **Default Model:** GPT 5.1 (`chat-model-gigantic`)

### Image Generation

| Model ID | Display Name | Provider | Description |
|----------|--------------|----------|-------------|
| `gemini-2.5-flash-image` | **Gemini 2.5 Flash Image** | CometAPI | Fast, high-fidelity image generation |


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
| **Aptos** | 10 | Coin balance, resources, modules, ANS names, transactions |
| **Solana** | 4 | Token balances, portfolio, market data |
| **Flow** | 3 | Cadence scripts, NFT collections |
| **SEI** | 4 | Cosmos queries, IBC transfers |
| **Zeta** | 3 | ZetaVM testnet, cross-chain messaging |
| **Monad** | 3 | Next-gen EVM (testnet) |
| **Wormhole** | 2 | Cross-chain bridge, guardian verification |
| **Utility** | 8 | Web search, news, X/Twitter, DeFi Llama, image generation |

### Cronos zkEVM Direct Tools

Direct API access to Cronos zkEVM (Chain ID 388) with dynamic 10k block range for reliability:

```typescript
// Available zkEVM Tools
const zkevmTools = {
  getZkEVMBalance,           // Native zkCRO balance (with RPC fallback)
  getZkEVMTransactionHistory, // Transaction history (last 10k blocks)
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

### VVS Finance DEX Integration

```typescript
// Available VVS Tools
const vvsTools = {
  getVVSSwapQuote,    // Swap quotes between tokens
  getVVSTokenList,    // Available tokens
  getVVSPoolInfo,     // Liquidity pool info
};

// Example: Swap Quote
{
  inputToken: "CRO",
  outputToken: "USDC",
  inputAmount: 100,
  // Returns: expectedOutput, priceImpact, route
}
```

### Multi-Chain Integration Matrix

| Chain | SDK | Network | RPC Provider | Capabilities |
|-------|-----|---------|--------------|--------------|
| **Cronos EVM** | `viem` + `ethers.js v6` | Mainnet + Testnet | Cronos RPC | EVM tx, CRC-20, VVS DEX |
| **Cronos zkEVM** | Native fetch | Mainnet (388) | zkEVM Explorer API | zkCRO, ERC-20, internal tx |
| **Ethereum** | `viem` + `ethers.js v6` | Mainnet | Infura/Alchemy | ENS, ERC-20/721/1155 |
| **Polygon** | `viem` | PoS Mainnet | QuickNode | Low-cost tx, NFTs |
| **Aptos** | `@aptos-labs/ts-sdk` | Mainnet | Aptos Fullnode | Move, ANS names |
| **Flow** | `@onflow/fcl` | Mainnet | Flow Access Node | Cadence, NFTs |
| **SEI** | `@sei-js/core` | Pacific-1 | SEI RPC | Cosmos SDK, IBC |
| **Solana** | Native JSON-RPC | Mainnet | Helius/QuickNode | SPL tokens, DeFi |

---

## x402 Crypto Payment Protocol

### Gasless Payment Flow (EIP-3009)

The x402 implementation uses **EIP-3009 TransferWithAuthorization** for gasless USDC payments:

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Frontend as 🖥️ Frontend
    participant API as 📡 Backend API
    participant Wallet as 🔐 Wallet
    participant Facilitator as ⚡ Cronos Facilitator
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
// EIP-712 Domain for USDC.e on Cronos
const domain = {
  name: "Bridged USDC (Stargate)",
  version: "1",
  chainId: 338, // Cronos Testnet
  verifyingContract: "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
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
│           │       ├── aptos/        # Aptos-specific
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

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| pnpm | 8.6+ |
| PostgreSQL | 15+ |

### Quick Start

```bash
# Clone repository
git clone https://github.com/sirath-network/barzakh-ai.git
cd barzakh-ai

# Install dependencies
pnpm install

# Set up environment
cp apps/frontend/.env.example apps/frontend/.env.local

# Run database migrations
pnpm --filter frontend db:migrate

# Start development server
pnpm dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COMETAPI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# x402 Crypto Payments
CRONOS_RPC_URL=https://evm.cronos.org

# Cronos Explorer APIs
CRONOS_EXPLORER_API_KEY=...         # Cronos EVM Explorer
ZKEVM_CRONOS_EXPLORER_API_KEY=...   # Cronos zkEVM Explorer

# External APIs
ZERION_API_KEY=...
TAVILY_API_KEY=...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# Security
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
| `/api/settings` | GET/PATCH | User settings |
| `/api/settings/wallet/*` | * | Wallet binding |
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
  <strong>Built by <a href="https://github.com/sirath-network">Sirath Network</a></strong>
</p>

<p align="center">
  <sub>🚀 Powered by AI | ⛓️ Built on Blockchain | 🔒 Security First</sub>
</p>
