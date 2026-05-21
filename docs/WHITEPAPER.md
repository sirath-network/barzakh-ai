# Barzakh AI: Technical Whitepaper

<p align="center">
  <strong>The Future of AI-Powered Blockchain Intelligence</strong>
</p>

<p align="center">
  <em>Version 1.0 | December 2025</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Document-Whitepaper-ede8e8?style=for-the-badge" alt="Whitepaper">
  <img src="https://img.shields.io/badge/Status-Production-ede8e8?style=for-the-badge" alt="Production">
  <img src="https://img.shields.io/badge/License-MIT-ede8e8?style=for-the-badge" alt="MIT License">
</p>

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Technical Implementation](#technical-implementation)
5. [AI Orchestration Layer](#ai-orchestration-layer)
6. [Blockchain Integration Framework](#blockchain-integration-framework)
7. [x402 Crypto Payment Protocol](#x402-crypto-payment-protocol)
8. [Security Architecture](#security-architecture)
9. [Data Architecture](#data-architecture)
10. [Business Model](#business-model)
11. [Competitive Analysis](#competitive-analysis)
12. [Roadmap](#roadmap)
13. [Conclusion](#conclusion)

---

## Executive Summary

**Barzakh AI** is an enterprise-grade, multi-model AI platform that revolutionizes blockchain analytics and DeFi interaction through intelligent orchestration. Built as a production-ready Turborepo monorepo with Next.js 16.1 and React 19, the platform uniquely combines:

- **Multi-Model AI Fusion**: Orchestrates GPT-5.x, Claude Opus 4.5, GLM 4.7, and 6+ frontier models with intelligent intent-based routing
- **50+ Blockchain Tools**: Native integrations across 14+ blockchain ecosystems (Monad, Cronos, Mantle, Ethereum, Aptos, Solana, Flow, SEI, Zeta) with 50+ chains via Relay Protocol
- **Monad Deep Integration**: 10 dedicated Monad tools including nad.fun token launchpad search & trade, portfolio tracking, DeFi positions, NFTs, and smart chain inference for Monad meme tokens
- **x402 Crypto Payments**: Revolutionary EIP-3009 implementation enabling USDC cryptocurrency subscriptions on Base
- **VVS DEX Integration**: Real-time swap quotes, liquidity pool analysis, and DeFi intelligence from VVS Finance
- **Enterprise Security**: 5-layer defense architecture with prompt injection defense, 2FA, and wallet authentication

The platform processes blockchain queries through a sophisticated intent classification pipeline, automatically routing requests to optimal AI models and chain-specific tool clusters while maintaining conversational context across multi-turn interactions.

### Key Metrics

| Metric | Value |
|--------|-------|
| Blockchain Chains Supported | 14+ (50+ via Relay) |
| AI Models Integrated | 25+ |
| Blockchain Tools | 50+ |
| System Prompt Size | 69KB+ |
| Intent Pattern Rules | 400+ |
| Database Migrations | 26 |

---

## Problem Statement

### The Fragmentation Crisis in Web3

The blockchain ecosystem has grown exponentially, creating unprecedented fragmentation:

1. **Chain Proliferation**: Users must navigate 100+ distinct blockchain networks, each with unique addresses, transaction formats, and tooling requirements.

2. **Tool Overload**: Analyzing a single wallet requires 5-7 different tools (explorers, portfolio trackers, DeFi dashboards), creating cognitive overhead and missed opportunities.

3. **AI Limitations**: Existing AI assistants lack real-time blockchain context, returning stale or fabricated data when queried about on-chain activity.

4. **Payment Friction**: Crypto-native users face ironic barriers when subscribing to Web3 services—forced to use credit cards while holding substantial cryptocurrency.

5. **Security Gaps**: The intersection of AI and blockchain creates novel attack vectors (prompt injection, wallet signature exploitation) that existing solutions fail to address.

### Market Pain Points

| Pain Point | User Quote | Impact |
|------------|------------|--------|
| **Multi-Chain Complexity** | "I have assets on 5 chains but can't see them in one place" | Missed opportunities, poor portfolio management |
| **AI Accuracy** | "ChatGPT gives me outdated/wrong blockchain data every time" | Lost trust, incorrect decisions |
| **Payment Barriers** | "I have $10K in crypto but need a credit card to subscribe" | User friction, lost conversions |
| **Security Concerns** | "I don't trust connecting my wallet to AI platforms" | Low adoption, trust deficit |
| **DeFi Analysis** | "Understanding impermanent loss and pool dynamics takes hours" | Time waste, missed yields |

---

## Solution Architecture

### High-Level System Design

Barzakh AI implements a **6-layer architecture** designed for scalability, security, and extensibility:

```mermaid
flowchart TB
    subgraph Layer1["Layer 1: Edge Security"]
        CF["Cloudflare WAF + DDoS"]
        API["API Shield OpenAPI 3.0"]
        RL["Rate Limiter Token Bucket"]
        R2["R2 Object Storage"]
    end
    
    subgraph Layer2["Layer 2: Application (Vercel)"]
        Next["Next.js 16.1 App Router + RSC"]
        React["React 19 RSC"]
        Server["Server Components"]
        Routes["API Routes Edge"]
        MW["Middleware Chain"]
    end
    
    subgraph Layer3["Layer 3: Core Services"]
        Chat["Chat Engine Vercel AI SDK v4.1.17"]
        Orch["AI Orchestrator Multi-Model Router"]
        Tools["Tool Executor 50+ Tools, 14+ Chains"]
        Stream["Stream Processor SSE/Chunks"]
    end
    
    subgraph Layer4["Layer 4: AI Abstraction"]
        OpenAI["OpenAI GPT-4o/5.4"]
        Anthropic["Anthropic Claude Opus 4.7"]
        xAI["xAI Grok 4.2"]
        Zhipu["GLM-5.1 / Kimi / Qwen"]
        Azure["Azure AI Foundry"]
    end
    
    subgraph Layer5["Layer 5: Blockchain Tools"]
        Cronos["Cronos VVS DEX"]
        Mantle["Mantle L2"]
        EVM["EVM Ethereum/Polygon"]
        Aptos["Aptos Move"]
        SEI["SEI Cosmos SDK"]
        Solana["Solana RPC"]
        Zeta["Zeta ZetaVM"]
        Monad["Monad Mainnet"]
    end
    
    subgraph Layer6["Layer 6: Data Persistence"]
        PG["PostgreSQL Neon/Turso"]
        R2S["Cloudflare R2 Object Storage"]
        Drizzle["Drizzle ORM Type-Safe"]
        Pool["Connection Pooling"]
    end
    
    Layer1 --> Layer2
    Layer2 --> Layer3
    Layer3 --> Layer4
    Layer4 --> Layer5
    Layer5 --> Layer6
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Runtime** | Node.js | 18+ | Server runtime |
| **Package Manager** | pnpm | 8.6.12 | Fast, disk-efficient |
| **Monorepo** | Turborepo | 2.7.2 | Build orchestration |
| **Framework** | Next.js | 16.1.0 | Full-stack React framework |
| **UI Library** | React | 19.2.0 | UI components (RSC enabled) |
| **Language** | TypeScript | 5.6.3 | Type safety |
| **AI SDK** | Vercel AI | 4.1.17 | Streaming + Tool execution |
| **Database** | PostgreSQL | 15+ | Primary data store |
| **ORM** | Drizzle | 0.34.1 | Type-safe queries |
| **Web3** | Wagmi + Viem | 2.19.5 / 2.41.2 | Wallet integration |
| **Auth** | NextAuth.js | 5.0.0-beta.30 | Multi-provider auth |

---

## Technical Implementation

### Monorepo Architecture

Barzakh AI uses a **Turborepo monorepo** with pnpm workspaces for optimal developer experience and build performance:

| Directory | Purpose |
|-----------|---------|
| `apps/frontend/` | Next.js 16.1 Application |
| `apps/frontend/app/(auth)/` | Auth pages (login, register, 2FA) |
| `apps/frontend/app/(chat)/` | Chat interface + API routes |
| `apps/frontend/app/api/billing/x402/` | Crypto payment endpoints |
| `apps/frontend/lib/db/` | Drizzle ORM + schema |
| `packages/shared/` | Shared utilities (@barzakh/shared) |
| `packages/shared/src/lib/ai/` | AI models, prompts, tools |
| `packages/shared/src/lib/ai/tools/` | 50+ blockchain tools (12+ chains) |
| `docs/` | OpenAPI specs + documentation |

### Request Lifecycle

Every user interaction follows a carefully orchestrated pipeline:

```mermaid
sequenceDiagram
    autonumber
    participant Client as Client
    participant CF as Cloudflare Edge
    participant MW as Middleware
    participant Auth as NextAuth
    participant API as API Route
    participant Classifier as Intent Classifier
    participant Orchestrator as AI Orchestrator
    participant LLM as LLM Provider
    participant Tools as Tool Executor
    participant RPC as Blockchain RPC
    participant DB as PostgreSQL

    Client->>CF: POST /api/chat (TLS 1.3)
    CF->>CF: WAF Rules + Bot Detection
    CF->>CF: API Shield Schema Validation
    CF->>CF: Rate Limit Check
    CF->>MW: Forward Request
    
    MW->>Auth: Validate Session Cookie
    Auth->>DB: Verify Session + Get User
    DB-->>Auth: User Context + Tier
    Auth-->>MW: Authenticated User
    
    Note over MW: x402 Subscription Check
    MW->>DB: Check x402PeriodEnd
    
    MW->>API: Process Chat Request
    API->>Classifier: Classify Intent
    Classifier-->>API: IntentType + Confidence + Tools
    
    API->>Orchestrator: Initialize with Classified Tools
    Orchestrator->>Orchestrator: Build Context (69KB System Prompt)
    Orchestrator->>Orchestrator: Sanitize Input
    Orchestrator->>LLM: Stream Completion Request
    
    loop Agentic Tool Loop (max 5)
        LLM-->>Orchestrator: Tool Call Request
        Orchestrator->>Tools: Execute Tool
        Tools->>RPC: Query Blockchain
        RPC-->>Tools: On-Chain Data
        Tools-->>Orchestrator: Structured Result
        Orchestrator->>LLM: Continue with Result
    end
    
    LLM-->>Orchestrator: Final Response Tokens
    Orchestrator-->>API: SSE Stream
    API-->>Client: Transfer-Encoding: chunked
    
    API->>DB: Persist Chat Message (async)
```

---

## AI Orchestration Layer

### Multi-Model Provider Architecture

Barzakh AI implements a **custom provider abstraction** supporting 6+ frontier AI models:

```typescript
// Model Configuration (models.ts)
import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

const azureFoundry = createOpenAI({
  baseURL: process.env.AZURE_FOUNDRY_ENDPOINT,
  apiKey: process.env.AZURE_FOUNDRY_API_KEY,
});

export const myProvider: any = customProvider({
  languageModels: {
    "gpt-5.5": azureFoundry("gpt-5.5"),
    "gpt-4o": azureFoundry("gpt-4o"),
    "gpt-4o-mini": azureFoundry("gpt-4o-mini"),
    "grok-4-20-reasoning": azureFoundry("grok-4-20-reasoning"),
    "grok-4-20-non-reasoning": azureFoundry("grok-4-20-non-reasoning"),
    "model-router": azureFoundry("model-router"),
    "kimi-k2.6": azureFoundry("Kimi-K2.6"),
  },
  imageModels: {},
});
```

### Model Capabilities Matrix

| Model ID | Display Name | Provider | Strength | Use Case |
|----------|--------------|----------|----------|----------|
| `gpt-5.5` | **GPT 5.5** | Azure AI Foundry | Flagship Intelligence | Ultra-complex reasoning |
| `gpt-4o` | **GPT 4o** | Azure AI Foundry | Versatility | General purpose reasoning |
| `gpt-4o-mini` | **GPT 4o Mini** | Azure AI Foundry | Efficiency | Lightweight tasks |
| `grok-4-20-reasoning` | **Grok 4.20 Reasoning** | Azure AI Foundry | Deep Reasoning | Extended thinking |
| `grok-4-20-non-reasoning` | **Grok 4.20 Fast** | Azure AI Foundry | Speed | Real-time responses |
| `model-router` | **Model Router** | Azure AI Foundry | Auto-Selection | Optimal model routing |
| `kimi-k2.6` | **Kimi K2.6** | Azure AI Foundry | Long Context | Complex multi-turn workflows |


### Intent Classification System

The platform implements a **hybrid intent classification** system (698 lines) that routes queries to optimal tool clusters:

```mermaid
flowchart LR
    subgraph Input["User Input"]
        Query["User Query"]
    end
    
    subgraph Classification["Intent Classification"]
        Pattern["Pattern Matching"]
        Context["Context Check"]
        LLM["LLM Fallback"]
    end
    
    subgraph Scoring["Confidence Scoring"]
        Regex["+0.4 per regex match"]
        Keyword["+0.3 per keyword"]
        Priority["+0.0-0.2 priority bonus"]
        Threshold["Threshold: 0.6"]
    end
    
    subgraph Intents["Intent Types"]
        Imagine["imagine (100)"]
        Aptos["aptos (95)"]
        Cronos["cronos (95)"]
        SEI["sei (95)"]
        Solana["solana (95)"]
        OnChain["on_chain (90)"]
        Coding["coding (80)"]
        Search["search (10)"]
    end
    
    Query --> Pattern
    Pattern -->|"High Confidence"| Intents
    Pattern -->|"Low Confidence"| Context
    Context -->|"Chain Context?"| Intents
    Context -->|"No Context"| LLM
    LLM --> Intents
    
    Scoring --> Pattern
```

### Chain-Specific Pattern Examples

```typescript
// Cronos Detection Patterns (intent-classifier.ts)
{
    intent: "cronos",
    patterns: [
        /\bcronos\b/i,
        /\bcro\s+(token|coin|balance|wallet|portfolio)\b/i,
        /\bcrypto\.com\s+(chain|defi)\b/i,
        /\bvvs\s+(finance|swap|dex)\b/i,
        /\b(on|at|for)\s+cronos\b/i,
    ],
    keywords: [
        "cronos", "cro token", "crypto.com chain",
        "vvs finance", "cronos wallet", "on cronos",
    ],
    priority: 95,
}
```

### Model Forcing Rules

Certain intents require specific models for optimal results:

```typescript
export const FORCED_MODEL_BY_GROUP = {
    imagine: "gpt-4o",    // GPT-4o for image prompts
    multimodal: "gpt-4o", // GPT-4o for vision tasks
    // Chain tools use user-selected model
};
```

---

## Blockchain Integration Framework

### Multi-Chain Tool Architecture

The platform provides **50+ specialized tools** across 14+ blockchain ecosystems:

#### Cronos Ecosystem Tools

| Tool | Function |
|------|----------|
| `getCronosBalance` | Native CRO balance |
| `getCronosTokenBalances` | CRC-20 token list |
| `getCronosTransactions` | Transaction history |
| `getCronosGasOracle` | Gas price estimates |
| `getCronosMarketData` | Price & volume data |
| `getCronosTokenHolders` | Token holder analysis |
| `getCronosContractABI` | Contract ABI retrieval |
| `getCronosContractSource` | Verified source code |
| `initiateX402Payment` | Crypto subscriptions |

#### Aptos Ecosystem Tools

| Tool | Function |
|------|----------|
| `getAptosStats` | Network statistics |
| `getAptosScanApiData` | Explorer API data |
| `aptosNames` | ANS name resolution |
| `getAptosPortfolio` | GraphQL portfolio |
| `getAptosResources` | Account resources |
| `getAptosModules` | Move module info |

#### Utility Tools

| Tool | Function |
|------|----------|
| `webSearch` | Tavily web search |
| `defiLlama` | TVL & yield data |
| `newsSearch` | Crypto news API |
| `xSearch` | X/Twitter search |
| `createImage` | Azure GPT-Image-2 generation/editing |
| `translateTransactions` | Human-readable TX |

#### Mantle Network Ecosystem Tools

Native L2 support for **Mantle Network** (Chain ID: 5000) with comprehensive portfolio tracking and transaction analysis:

| Tool | Function |
|------|----------|
| `getMantleBalance` | Native MNT balance |
| `getMantlePortfolio` | Complete portfolio with tokens |
| `getMantleTokenList` | ERC-20 token holdings |
| `getMantleTokenBalance` | Specific token balance |
| `getMantleTransactionHistory` | Transaction history with token details |
| `getMantleTokenTransfers` | Token transfer events |
| `getMantleBlockInfo` | Block data |
| `getMantleGasPrice` | Current gas oracle |
| `getMantleContractABI` | Contract ABI retrieval |
| `getMantleContractSource` | Verified source code |
| `getMantleRollupInfo` | L2 rollup status |

### Relay Protocol Cross-Chain Swaps

Native integration with **Relay Protocol** enables cross-chain token swaps across 50+ networks:

| Tool | Function |
|------|----------|
| `getRelaySwapQuote` | Get optimal cross-chain swap quotes |
| `executeRelaySwap` | Execute approved cross-chain swap |
| `getRelaySupportedTokens` | List supported tokens per chain |

```typescript
// Relay Swap Quote Tool (relay/index.ts)
export const getRelaySwapQuote = tool({
    description: "Get a cross-chain swap quote from Relay Protocol.",
    parameters: z.object({
        fromChainId: z.number().describe("Source chain ID"),
        toChainId: z.number().describe("Destination chain ID"),
        fromToken: z.string().describe("Source token address"),
        toToken: z.string().describe("Destination token address"),
        amount: z.string().describe("Amount to swap"),
    }),
    execute: async ({ fromChainId, toChainId, fromToken, toToken, amount }) => {
        // Returns: { quote, route, fees, estimatedTime }
    },
});
```

**Supported Chains**: Ethereum, **Monad**, Base, Optimism, Arbitrum, Polygon, Avalanche, BNB Chain, Scroll, zkSync, Linea, Blast, Mode, Zora, **Mantle**, Solana, and 35+ more.

**Features**:
- **Swap Completion Tracking**: Server-side persistence prevents duplicate swaps
- **MEV Protection**: Transactions protected via Relay solver network
- **Dynamic Decimals**: Automatic token decimal fetching from Relay Currencies API
- **Smart Chain Inference**: Automatic chain detection for chain-specific tokens (MON → 143, SOL → Solana, etc.)

### Monad Ecosystem (Deep Integration)

Barzakh AI provides **10 dedicated tools** for comprehensive Monad blockchain interaction (Chain ID 143), making it one of the platform's most deeply integrated chains:

#### Monad On-Chain Tools

| Tool | Data Source | Function |
|------|-------------|----------|
| `getMonadBalance` | Monad RPC | Native MON balance for any wallet |
| `getMonadTransaction` | Monad RPC | Transaction details by hash |
| `getMonadGasPrice` | Monad RPC | Current gas price estimation |
| `getMonadTransactionHistory` | Zerion API | Full transaction history with token details |
| `getMonadPortfolio` | Zerion API | Complete portfolio: tokens, DeFi, NFTs |
| `getMonadDefiPositions` | Zerion API | DeFi protocol positions (lending, staking, LP) |
| `getMonadNFTs` | Zerion API | NFT holdings and collections |
| `getMonadTokenPositions` | Zerion API | All token balances with USD values |
| `getMonadStats` | MonadScan | Blockchain statistics screenshot |
| `searchNadFunTokens` | nad.fun API | Search bonding curve tokens by name/symbol/address |

#### nad.fun Token Launchpad Integration

Native integration with **nad.fun**, Monad's bonding curve token launchpad, enables a conversational search-and-trade workflow:

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant AI as Barzakh AI Agent
    participant NadFun as nad.fun API
    participant Relay as Relay Protocol
    participant Wallet as User Wallet
    participant Monad as Monad Chain

    User->>AI: "Buy Penguin on nad.fun"
    AI->>NadFun: searchNadFunTokens("Penguin")
    NadFun-->>AI: Token results (name, symbol, address, price, image)
    AI-->>User: Present matched tokens with details
    User->>AI: Confirm token selection
    AI->>Relay: prepareRelayTransaction(toChainId: 143, tokenAddress)
    Relay-->>AI: Transaction data + approval UI
    AI-->>User: In-chat swap approval card
    User->>Wallet: Sign transaction
    Wallet->>Monad: Execute on-chain
    Monad-->>User: TX confirmed (MonadScan link)
```

**Key Design Decisions:**
- **Search-First Strategy**: AI always searches nad.fun API before executing trades to prevent buying the wrong token
- **Automatic Chain ID**: All nad.fun tokens are hardcoded to Monad (Chain ID 143) — the AI never asks the user for chain
- **Monad Meme Token Inference**: Tokens like MOLANDAK, EMO, MOXY, CHOG, MOYAKI, DAK, MCAT, NINJA, SMON are pre-mapped for instant chain routing
- **Relay Protocol Execution**: Trades execute via Relay's solver network with MEV protection and dynamic decimal handling

### Tool Grouping by Intent

Tools are dynamically selected based on classified intent:

```typescript
const groupTools = {
    cronos: [
        "webSearch",
        "getCronosBalance",
        "getCronosTokenBalances",
        "getCronosTransactions",
        "getCronosGasOracle",
        "getCronosMarketData",
        "getCronosTokenHolders",
        "getCronosContractABI",
        "getCronosContractSource",
        "initiateX402Payment",
        "getSubscriptionInfo",
    ],
    aptos: [
        "webSearch",
        "getAptosStats",
        "getAptosScanApiData",
        "aptosNames",
        "getAptosPortfolio",
        "defiLlama",
    ],
    mantle: [
        "webSearch",
        "getMantleBalance",
        "getMantlePortfolio",
        "getMantleTokenList",
        "getMantleTransactionHistory",
        "getMantleTokenTransfers",
        "getMantleGasPrice",
        "getMantleBlockInfo",
        "getMantleContractABI",
        "getRelayQuote",
    ],
    monad: [
        "webSearch",
        "getMonadBalance",
        "getMonadTransaction",
        "getMonadGasPrice",
        "getEvmOnchainDataUsingZerion",
        "searchNadFunTokens",
        "getRelayQuote",
        "prepareRelayTransaction",
        "defiLlama",
        "translateTransactions",
        "getMonadStats",
    ],
    // ... 10+ more chain groups
};
```

---

## x402 Crypto Payment Protocol

### Overview

The **x402 Protocol** implements cryptocurrency payments using EIP-3009 (TransferWithAuthorization), enabling users to subscribe with USDC on Base.

> **Important**: x402 is the industry's first AI-native crypto subscription system, allowing the AI agent to programmatically suggest subscription upgrades with user approval via wallet signature.

### Protocol Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as User
    participant Frontend as Frontend
    participant API as Backend API
    participant Wallet as Wallet
    participant Facilitator as x402 Facilitator
    participant Chain as Blockchain

    Note over User,Chain: Phase 1: Wallet Verification
    User->>Frontend: Connect Wallet
    Frontend->>API: GET /api/billing/x402/verify-wallet
    API-->>Frontend: Nonce Message (EIP-191)
    
    Frontend->>Wallet: Sign Message Request
    User->>Wallet: Approve Signature
    Wallet-->>Frontend: Signature (65 bytes)
    
    Frontend->>API: POST /api/billing/x402/verify-wallet
    Note over API: ecrecover(hash, sig) == address
    API-->>Frontend: Wallet Verified

    Note over User,Chain: Phase 2: Payment Initialization
    Frontend->>API: POST /api/billing/x402/subscribe
    API-->>Frontend: 402 Payment Required
    Note right of API: amount, recipient, paymentRequirements

    Note over User,Chain: Phase 3: EIP-712 Signature (Gasless)
    Frontend->>Frontend: Build EIP-712 TypedData
    Frontend->>Wallet: signTypedData_v4
    User->>Wallet: Approve Signature
    Wallet-->>Frontend: EIP-712 Signature

    Note over User,Chain: Phase 4: Settlement
    Frontend->>API: POST /api/billing/x402/settle
    API->>Facilitator: Verify + Submit Transaction
    Facilitator->>Chain: transferWithAuthorization()
    Chain-->>Facilitator: TX Receipt
    Facilitator-->>API: txHash, blockNumber
    
    API->>API: Activate Subscription
    API-->>Frontend: 200 OK - Active
```

### EIP-3009 TransferWithAuthorization

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

### AI-Initiated Payment Tool

The AI agent can suggest subscription upgrades through a dedicated tool:

```typescript
// x402-transfer.ts
export const initiateX402Payment = tool({
    description: `Initiate a subscription payment on Base using x402 protocol.
    Supports tier changes (pro <-> ultimate) and cycle changes (monthly/quarterly/yearly).`,
    parameters: z.object({
        planId: z.enum(["pro", "ultimate"]),
        billingCycle: z.enum(["monthly", "quarterly", "yearly"]),
        currentTier: z.string().optional(),
        currentBillingCycle: z.string().optional(),
        reason: z.string().optional(),
    }),
    execute: async ({ planId, billingCycle, reason }) => {
        // Validate eligibility, check against duplicate subscriptions
        // Return payment requirements for frontend rendering
    },
});
```

### Subscription Pricing

| Plan | Monthly | Quarterly | Yearly |
|------|---------|-----------|--------|
| **Pro** | $25 USDC | $66 USDC | $240 USDC |
| **Ultimate** | $250 USDC | $660 USDC | $2400 USDC |

### Message Limits by Tier

| Tier | Monthly | Quarterly | Yearly |
|------|---------|-----------|--------|
| **Free** | 10/day | 10/day | 10/day |
| **Pro** | 50/day | 100/day | 150/day |
| **Ultimate** | 250/day | 350/day | 500/day |

---

## Security Architecture

### 5-Layer Defense Model

```mermaid
flowchart TB
    subgraph L1["Layer 1: Input Sanitization"]
        Homoglyph["Homoglyph Detection"]
        Invisible["Invisible Char Strip"]
        RTL["RTL/LTR Override Removal"]
        Unicode["Unicode Normalization"]
    end
    
    subgraph L2["Layer 2: Prompt Injection Defense"]
        Direct["Direct Injection Detection"]
        Indirect["Indirect Injection via URLs"]
        Jailbreak["Jailbreak Pattern Matching"]
        Role["Role/Context Manipulation"]
    end
    
    subgraph L3["Layer 3: Media & File Protection"]
        Polyglot["Polyglot File Detection"]
        EXIF["EXIF/Meta Data Strip"]
        Stegano["Steganography Detection"]
        FileType["File Type Validation"]
    end
    
    subgraph L4["Layer 4: Model Protection"]
        Sponge["Sponge Attack Prevention"]
        Extraction["Model Extraction Defense"]
        Inversion["Model Inversion Guard"]
        Output["Output Filtering PII/Secrets"]
    end
    
    subgraph L5["Layer 5: Runtime Monitoring"]
        Rate["Rate Limiting Tier-based"]
        Anomaly["Anomaly Detection"]
        Expiry["x402 Expiry Check"]
        Audit["Audit Logging"]
    end
    
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
```

### Authentication Architecture

```mermaid
flowchart TB
    subgraph Entry["Entry Points"]
        Email["Email + Password"]
        Google["Google OAuth 2.0"]
        Wallet["Wallet Connect EIP-4361 SIWE"]
    end

    subgraph Verification["Multi-Factor Verification"]
        Password["Password bcrypt, 12 rounds"]
        TOTP["TOTP 2FA RFC 6238, 30s"]
        EmailOTP["Email OTP 6-digit, 10min"]
        WalletSig["Wallet Signature EIP-191"]
    end

    subgraph Session["Session Management"]
        JWT["JWT Token HS256, httpOnly"]
        Cookie["Secure Cookie SameSite=Lax"]
        Refresh["Session Refresh"]
    end

    subgraph Protected["Protected Operations"]
        Normal["Normal Ops"]
        Sensitive["Re-auth Required"]
    end

    Email --> Password --> TOTP
    Google --> JWT
    Wallet --> WalletSig --> JWT
    Password --> EmailOTP
    
    TOTP --> JWT
    EmailOTP --> JWT
    JWT --> Cookie --> Session
    Session --> Normal
    Session --> Sensitive
```

### Threat Protection Matrix

| Threat Category | Attack Vector | Defense Mechanism |
|-----------------|---------------|-------------------|
| **Prompt Injection** | System prompt override | Pattern matching, input boundaries |
| **Indirect Injection** | Malicious URLs/files | Content isolation, sandboxed parsing |
| **Jailbreak** | DAN prompts, role manipulation | System prompt hardening |
| **Homoglyph** | Lookalike Unicode | Character normalization |
| **Invisible Chars** | Zero-width (U+200B) | Whitespace stripping |
| **Polyglot Files** | Images with code | Magic byte validation |
| **Sponge Attacks** | DoS via complexity | Token limits, timeouts |
| **Data Exfiltration** | PII in outputs | Regex-based redaction |
| **Unauthorized Access** | Direct object access | Private R2 buckets + Short-lived (15m) Signed URLs |

---

## Data Architecture

### Database Schema

The platform uses PostgreSQL with Drizzle ORM for type-safe data access:

```typescript
// Core Entities (schema.ts)

export const user = pgTable("User", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 64 }).unique(),
    walletAddress: varchar("walletAddress", { length: 64 }),
    password: varchar("password", { length: 255 }),  // bcrypt hash
    
    // Profile
    name: text("name"),
    username: text("username").unique(),
    image: text("image"),
    
    // Subscription
    tier: varchar("tier").default("free"),
    billingCycle: varchar("billingCycle").default("monthly"),
    messageCount: integer("messageCount").default(0),
    dailyMessageRemaining: integer("dailyMessageRemaining").default(10),
    
    // 2FA (AES-256-GCM encrypted)
    twoFactorSecret: text("twoFactorSecret"),
    twoFactorEnabled: boolean("twoFactorEnabled").default(false),
    backupCodes: text("backupCodes"),  // bcrypt hashed
    
    // x402
    x402CancelAtPeriodEnd: boolean("x402CancelAtPeriodEnd").default(false),
    x402PeriodEnd: timestamp("x402PeriodEnd"),
});

export const x402_transactions = pgTable("X402Transaction", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId").references(() => user.id),
    transactionHash: varchar("transactionHash", { length: 66 }).unique(),
    chainId: integer("chainId"),
    amount: varchar("amount", { length: 64 }),
    tokenAddress: varchar("tokenAddress", { length: 42 }),
    senderAddress: varchar("senderAddress", { length: 42 }),
    planId: varchar("planId"),
    billingCycle: varchar("billingCycle"),
    status: varchar("status").default("pending"),
    createdAt: timestamp("createdAt").defaultNow(),
});

export const chat = pgTable("Chat", {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt").defaultNow(),
    title: text("title"),
    userId: uuid("userId").references(() => user.id),
    visibility: varchar("visibility").default("private"),
    isArchived: boolean("isArchived").default(false),
});

export const message = pgTable("Message", {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chatId").references(() => chat.id),
    role: varchar("role"),
    content: json("content"),
    createdAt: timestamp("createdAt"),
}, (table) => ({
    chatIdIdx: index("idx_message_chat_id").on(table.chatId),
    chatIdCreatedAtIdx: index("idx_message_chat_id_created_at")
        .on(table.chatId, table.createdAt),
}));
```

### Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Chat : "owns"
    User ||--o| Customer : "has"
    User ||--o{ X402Transaction : "makes"
    User ||--o{ Document : "creates"
    
    Customer ||--o| Subscription : "has"
    Customer ||--o| BillingAddress : "has"
    
    Chat ||--o{ Message : "contains"
    Chat ||--o{ Vote : "has"
    
    Message ||--o| Vote : "receives"
    
    Document ||--o{ Suggestion : "has"

    User {
        uuid id PK
        varchar email UK
        varchar walletAddress
        varchar tier
        timestamp x402PeriodEnd
        boolean twoFactorEnabled
    }
    
    Chat {
        uuid id PK
        uuid userId FK
        text title
        varchar visibility
        boolean isArchived
    }
    
    Message {
        uuid id PK
        uuid chatId FK
        varchar role
        json content
    }
    
    X402Transaction {
        uuid id PK
        uuid userId FK
        varchar transactionHash UK
        integer chainId
        varchar amount
        varchar status
    }
```

---

## Business Model

### Revenue Streams

#### Subscription Tiers

| Tier | Price Range | Features |
|------|-------------|----------|
| **Free** | $0 | 10 messages/day, basic blockchain queries, limited tools |
| **Pro** | $20-$240 | 50-150 messages, all blockchain tools, priority support, VVS DEX |
| **Ultimate** | $250-$2400 | 250-500 messages, GPT-5.x & Claude, all frontier models, API access |

#### Payment Methods

| Method | Technology | Features |
|--------|------------|----------|
| **Stripe** | Credit/Debit Cards | Recurring billing, invoices |
| **x402 Protocol** | USDC on Base | Gasless EIP-3009, crypto-native |

### Value Proposition by Stakeholder

| Stakeholder | Pain Point | Barzakh Solution |
|-------------|------------|------------------|
| **Retail Traders** | Multi-chain complexity | Unified AI assistant across 12+ chains |
| **DeFi Users** | Impermanent loss confusion | VVS pool analysis + AI explanations |
| **Developers** | Smart contract research | Instant ABI/source code retrieval |
| **Crypto Natives** | Fiat payment friction | x402 gasless USDC subscriptions |
| **Enterprise** | Security concerns | 5-layer defense + audit logging |

---

## Competitive Analysis

### Market Positioning

```mermaid
quadrantChart
    title Market Positioning: AI + Blockchain Intelligence
    x-axis Single Model --> Multi Model
    y-axis Traditional Analytics --> Blockchain Intelligence
    quadrant-1 "Leaders"
    quadrant-2 "AI-Only"
    quadrant-3 "Gap"
    quadrant-4 "Chain-Only"
    "Barzakh AI": [0.9, 0.95]
    "ChatGPT": [0.4, 0.2]
    "Claude": [0.5, 0.2]
    "DeBank": [0.1, 0.7]
    "Zerion": [0.1, 0.75]
```

### Feature Comparison

| Feature | Barzakh AI | ChatGPT | Claude | DeBank | Zerion |
|---------|------------|---------|--------|--------|--------|
| Multi-Model AI | ✅ 6+ models | ❌ Single | ❌ Single | ❌ None | ❌ None |
| Live Blockchain Data | ✅ Real-time | ❌ Stale | ❌ Stale | ✅ Live | ✅ Live |
| Multi-Chain Support | ✅ 12+ chains | ❌ None | ❌ None | ✅ EVM | ✅ EVM |
| DEX Integration | ✅ VVS | ❌ None | ❌ None | ⚠️ View | ⚠️ View |
| Crypto Payments | ✅ x402 | ❌ None | ❌ None | ❌ None | ❌ None |
| Intent Classification | ✅ Hybrid | ❌ None | ❌ None | N/A | N/A |
| 2FA/Wallet Auth | ✅ Both | ❌ Email | ❌ Email | ✅ Wallet | ✅ Wallet |

---

## Roadmap

### Phase 1: Foundation (Completed ✅)

- [x] Multi-model AI orchestration (GPT-4o to GPT-5.2)
- [x] 50+ blockchain tools across 14+ chains
- [x] x402 gasless payment protocol
- [x] VVS Finance DEX integration
- [x] Intent classification system
- [x] 5-layer security architecture
- [x] 2FA + wallet authentication

### Phase 1.5: Monad Integration (Completed ✅)

- [x] 10 Monad-specific tools (RPC + Zerion + MonadScan)
- [x] nad.fun token launchpad search & trade via Relay
- [x] Smart chain inference for Monad meme tokens
- [x] Monad-aware system prompt with MON context
- [x] In-chat swap approval UI with Dynamic SDK wallet

### Phase 2: Expansion (Q1 2026)

- [ ] Additional DEX integrations (Uniswap, Jupiter)
- [ ] Cross-chain swap execution (Wormhole)
- [ ] API access for Ultimate tier
- [ ] Mobile-optimized PWA
- [ ] Advanced analytics dashboard

### Phase 3: Enterprise (Q2 2026)

- [ ] Self-hosted deployment options
- [ ] Custom model fine-tuning
- [ ] Dedicated infrastructure
- [ ] SLA-backed support
- [ ] Compliance certifications

### Phase 4: Ecosystem (Q3-Q4 2026)

- [ ] Plugin marketplace
- [ ] Community tool contributions
- [ ] DAO governance integration
- [ ] Token-gated features
- [ ] Cross-platform SDK

---

## Appendix A: API Reference

See [cloudflare-api-schema.yaml](./cloudflare-api-schema.yaml) for the complete OpenAPI 3.0 specification.

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **x402** | Barzakh's gasless payment protocol using EIP-3009 |
| **EIP-3009** | Ethereum standard for TransferWithAuthorization |
| **EIP-712** | Typed structured data hashing and signing |
| **VVS** | VVS Finance, the leading DEX on Cronos |
| **Monad** | High-performance parallelized EVM L1 (Chain ID 143) |
| **nad.fun** | Monad's bonding curve token launchpad |
| **Relay Protocol** | Cross-chain swap and bridge aggregator (50+ chains) |
| **Intent Classification** | Automatic routing of queries to appropriate tools |
| **SSE** | Server-Sent Events for real-time streaming |
| **RSC** | React Server Components for optimal performance |

## Appendix C: References

1. EIP-3009: Transfer With Authorization - https://eips.ethereum.org/EIPS/eip-3009
2. EIP-712: Typed Structured Data Hashing - https://eips.ethereum.org/EIPS/eip-712
3. Vercel AI SDK Documentation - https://sdk.vercel.ai/docs
4. VVS Finance Developer Docs - https://docs.vvs.finance
5. Cronos Developer Documentation - https://docs.cronos.org
6. Monad Documentation - https://docs.monad.xyz
7. nad.fun API - https://api.nadapp.net
8. Relay Protocol Documentation - https://docs.relay.link


## Conclusion

**Barzakh AI** represents a paradigm shift in blockchain intelligence platforms. By combining multi-model AI orchestration with native multi-chain integration — particularly deep **Monad ecosystem support** including nad.fun token trading — and innovative gasless payment protocols, we deliver an experience that is simultaneously:

- **More Intelligent**: 6+ frontier models with intent-based routing
- **More Connected**: 50+ tools across 14+ blockchain ecosystems (Monad, Cronos, Ethereum, and more)
- **More Secure**: 5-layer defense architecture
- **More Accessible**: x402 gasless crypto subscriptions

The platform stands at the intersection of AI advancement and blockchain innovation, creating a new category of **AI-Native Blockchain Intelligence** that serves retail traders, DeFi power users, and enterprise clients alike.

> **Experience Barzakh AI live at [chat.barzakh.tech](https://chat.barzakh.tech)**

---

<p align="center">
  <strong>Built by <a href="https://www.barzakh.tech">Sirath Network</a></strong>
</p>

<p align="center">
  <sub>AI-Powered | Multi-Chain | Security First | Crypto-Native</sub>
</p>
