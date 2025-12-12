# Barzakh AI

<p align="center">
  <img width="100%" alt="Barzakh AI Banner" src="https://github.com/user-attachments/assets/bdb03347-8615-4be3-8920-aca4a7fc54b5" />
</p>

<p align="center">
  <strong>🧠 AI-Powered Blockchain Intelligence Platform</strong>
</p>

<p align="center">
  <a href="https://chat.barzakh.tech">
    <img src="https://img.shields.io/badge/Live-chat.barzakh.tech-blue?style=for-the-badge" alt="Live Demo">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel" alt="Vercel">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
</p>

---

## Overview

Barzakh AI is a full-stack blockchain analytics platform combining real-time on-chain data with multi-model AI orchestration. Built as a monorepo with Turborepo, it provides intelligent wallet analysis, DeFi insights, and automated blockchain workflows.

### Key Capabilities

- **Multi-Model AI** — GPT-4o, Claude Opus, Grok 4.1, GLM 4.6
- **45+ Blockchain Tools** — Chain-specific analyzers for Cronos, EVM, Aptos, Solana, Flow, SEI
- **x402 Crypto Payments** — Native on-chain payment protocol
- **Enterprise Security** — 2FA, wallet auth, Cloudflare API Shield

## Architecture

> **Monorepo Architecture** built with Turborepo for optimal DX and build performance

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    EDGE LAYER                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Cloudflare    │  │   API Shield    │  │  Rate Limiter   │  │    R2 Storage   │ │
│  │   WAF + DDoS    │  │ OpenAPI 3.0 Spec│  │  Token Bucket   │  │   Object Store  │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────────────────┼────────┘
            │                     │                     │                     │
            ▼                     ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER (Vercel)                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │                         Next.js 15 (App Router)                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ ││
│  │  │   React 18  │  │   Server    │  │  API Routes │  │    Middleware Chain     │ ││
│  │  │     RSC     │  │  Components │  │   (Edge)    │  │  Auth → Rate → Validate │ ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
            │                     │                     │                     │
            ▼                     ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   CORE SERVICES                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Chat Engine    │  │ AI Orchestrator │  │  Tool Executor  │  │ Stream Processor│ │
│  │  Vercel AI SDK  │  │  Multi-Model    │  │   45+ Tools     │  │   SSE/Chunks    │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────────────────┼────────┘
            │                     │                     │                     │
            ▼                     ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   AI LAYER                                           │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                           LLM Provider Abstraction                             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │  │
│  │  │  OpenAI  │  │Anthropic │  │   xAI    │  │  Zhipu   │  │   CometAPI       │ │  │
│  │  │GPT-4o/4.1│  │  Claude  │  │  Grok    │  │  GLM 4.6 │  │  (Aggregator)    │ │  │
│  │  │  GPT-5   │  │Opus 4.5  │  │   4.1    │  │          │  │                  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Prompt Engineer │  │ Input Sanitizer │  │        Response Streamer            │  │
│  │  System Prompts │  │ Injection Guard │  │    Token-by-Token SSE Output        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
            │                     │                     │                     │
            ▼                     ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              BLOCKCHAIN TOOLS LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │                         Chain-Specific Tool Modules                              ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  ││
│  │  │  Cronos  │  │   EVM    │  │  Aptos   │  │   Flow   │  │       SEI        │  ││
│  │  │ zkEVM +  │  │ Ethereum │  │   Sui    │  │ Cadence  │  │  Cosmos SDK      │  ││
│  │  │  EVM     │  │ Polygon  │  │  Move    │  │  FCL     │  │  IBC Transfers   │  ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────────────┐│
│  │                            Utility Tool Modules                                  ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  ││
│  │  │DeFi Llama│  │Web Search│  │  News    │  │ X/Twitter│  │  Image Gen       │  ││
│  │  │   TVL    │  │  Tavily  │  │  Search  │  │  Search  │  │  Gemini 2.5      │  ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────┘
            │                     │                     │                     │
            ▼                     ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  DATA LAYER                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL    │  │  Cloudflare R2  │  │   Drizzle ORM   │  │   Connection    │ │
│  │   (Neon/Turso)  │  │  Object Storage │  │   Type-Safe     │  │    Pooling      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
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

### Authentication & Security Architecture

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

### Multi-Chain Integration Matrix

| Chain | SDK | Network | RPC Provider | Capabilities |
|-------|-----|---------|--------------|--------------|
| **Cronos** | `ethers.js v6` | Cronos Mainnet | Cronos RPC | EVM transactions, CRC-20 tokens, DeFi protocols |
| **Ethereum** | `ethers.js v6` | Mainnet | Infura/Alchemy | ENS resolution, ERC-20/721/1155, Uniswap |
| **Polygon** | `ethers.js v6` | PoS Mainnet | QuickNode | Low-cost transactions, NFT marketplaces |
| **Aptos** | `@aptos-labs/ts-sdk` | Mainnet | Aptos Fullnode | Move resources, coin balances, modules |
| **Flow** | `@onflow/fcl` | Mainnet | Flow Access Node | Cadence scripts, NFT collections |
| **SEI** | `@sei-js/core` | Pacific-1 | SEI RPC | Cosmos SDK queries, IBC transfers |
| **Wormhole** | Custom | Multi-chain | Guardian Network | Cross-chain message verification |

### AI Security & Threat Protection

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           AI SECURITY DEFENSE LAYERS                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 1: INPUT SANITIZATION                                                │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│    │
│  │  │ Homoglyph   │ │ Invisible   │ │ RTL/LTR     │ │ Unicode Normalization   ││    │
│  │  │ Detection   │ │ Char Strip  │ │ Override    │ │ (NFC/NFKC)             ││    │
│  │  │ (Lookalikes)│ │ (U+200B,etc)│ │ Removal     │ │                        ││    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                            │
│                                         ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 2: PROMPT INJECTION DEFENSE                                          │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│    │
│  │  │ Direct      │ │ Indirect    │ │ Jailbreak   │ │ Role/Context           ││    │
│  │  │ Injection   │ │ Injection   │ │ Pattern     │ │ Manipulation           ││    │
│  │  │ Detection   │ │ (via URLs)  │ │ Matching    │ │ Prevention             ││    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                            │
│                                         ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 3: MEDIA & FILE PROTECTION                                           │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│    │
│  │  │ Polyglot    │ │ EXIF/Meta   │ │ Steganography│ │ File Type             ││    │
│  │  │ Image       │ │ Data Strip  │ │ Detection    │ │ Validation            ││    │
│  │  │ Detection   │ │             │ │              │ │ (Magic Bytes)         ││    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                         │                                            │
│                                         ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 4: MODEL PROTECTION                                                   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│    │
│  │  │ Sponge      │ │ Model       │ │ Model       │ │ Output                 ││    │
│  │  │ Attack      │ │ Extraction  │ │ Inversion   │ │ Filtering              ││    │
│  │  │ Prevention  │ │ Defense     │ │ Guard       │ │ (PII, Secrets)         ││    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### Threat Protection Matrix

| Threat Category | Attack Vector | Defense Mechanism |
|-----------------|---------------|-------------------|
| **Prompt Injection** | Direct system prompt override | Pattern matching, input boundary enforcement |
| **Indirect Injection** | Malicious content via URLs/files | Content isolation, sandboxed parsing |
| **Jailbreak Attempts** | Role manipulation, DAN prompts | System prompt hardening, output monitoring |
| **Homoglyph Attacks** | Lookalike Unicode characters | Character normalization, visual similarity detection |
| **Invisible Characters** | Zero-width chars (U+200B, U+FEFF) | Whitespace stripping, control char removal |
| **RTL Override** | Bidirectional text manipulation | Unicode Bidi control removal |
| **Polyglot Files** | Images containing executable code | Magic byte validation, metadata stripping |
| **Steganography** | Hidden data in image pixels | Re-encoding, EXIF removal |
| **Sponge Attacks** | DoS via expensive computations | Token limits, complexity analysis, timeouts |
| **Model Extraction** | Query-based model stealing | Rate limiting, query pattern analysis |
| **Model Inversion** | Training data reconstruction | Output perturbation, access controls |
| **Data Exfiltration** | PII/secrets in AI outputs | Output filtering, regex-based redaction |

### AI Model Configuration

```mermaid
flowchart LR
    subgraph Input["📥 Input Layer"]
        UserMsg["User Message"]
        History["Chat History<br/>(Context Window)"]
        SystemPrompt["System Prompt<br/>(58KB+ optimized)"]
    end

    subgraph Sanitization["🛡️ Security Layer"]
        Homoglyph["Homoglyph<br/>Detection"]
        RTL["RTL Override<br/>Removal"]
        Injection["Prompt Injection<br/>Pattern Matching"]
        Unicode["Unicode<br/>Normalization"]
    end

    subgraph Router["🔀 Model Router"]
        Selector{"Model<br/>Selector"}
    end

    subgraph Models["🤖 LLM Providers"]
        GPT4o["<b>GPT-4o</b><br/>Fast responses<br/>128K context"]
        GPT41["<b>GPT-4.1</b><br/>Complex reasoning<br/>1M context"]
        GPT5["<b>GPT-5</b><br/>Experimental<br/>Next-gen"]
        Claude["<b>Claude Opus 4.5</b><br/>Deep analysis<br/>Thinking mode"]
        Grok["<b>Grok 4.1</b><br/>Real-time data<br/>Non-reasoning"]
        GLM["<b>GLM 4.6</b><br/>Multilingual<br/>Chinese optimized"]
    end

    subgraph Output["📤 Output Layer"]
        Stream["SSE Stream<br/>(Token-by-token)"]
        ToolCall["Tool Invocation<br/>(Function calling)"]
    end

    UserMsg --> Homoglyph
    History --> Sanitization
    SystemPrompt --> Sanitization
    
    Homoglyph --> RTL --> Injection --> Unicode
    Unicode --> Selector
    
    Selector -->|"speed"| GPT4o
    Selector -->|"complex"| GPT41
    Selector -->|"experimental"| GPT5
    Selector -->|"analysis"| Claude
    Selector -->|"real-time"| Grok
    Selector -->|"multilingual"| GLM
    
    GPT4o & GPT41 & GPT5 & Claude & Grok & GLM --> Stream
    GPT4o & GPT41 & GPT5 & Claude & Grok & GLM --> ToolCall
```

### x402 Crypto Payment Protocol

```mermaid
sequenceDiagram
    autonumber
    participant User as 👤 User
    participant Frontend as 🖥️ Frontend
    participant API as 📡 Backend API
    participant Wallet as 🔐 Wallet
    participant Chain as ⛓️ Blockchain

    User->>Frontend: Select Crypto Payment
    Frontend->>API: GET /api/billing/x402/verify-wallet?address=0x...
    API-->>Frontend: Nonce Message (EIP-191)
    
    Frontend->>Wallet: Sign Message Request
    Wallet->>User: Approve Signature
    User->>Wallet: Confirm
    Wallet-->>Frontend: Signature (65 bytes)
    
    Frontend->>API: POST /api/billing/x402/verify-wallet
    Note over API: Verify signature = ecrecover(hash, sig)
    API-->>Frontend: Wallet Verified ✓
    
    Frontend->>API: POST /api/billing/x402/subscribe
    API-->>Frontend: 402 Payment Required<br/>{amount, recipient, chainId}
    
    Frontend->>Wallet: Send Transaction
    Wallet->>Chain: Submit TX
    Chain-->>Wallet: TX Hash
    Wallet-->>Frontend: TX Hash
    
    Frontend->>API: POST /api/billing/x402/verify {txHash}
    
    loop Poll for Confirmation
        API->>Chain: eth_getTransactionReceipt
        Chain-->>API: Receipt (or null)
    end
    
    API->>API: Validate: amount, recipient, block
    API->>API: Activate Subscription
    API-->>Frontend: 200 OK - Subscription Active
```

### Infrastructure Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE EDGE                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  WAF │ DDoS Protection │ API Shield │ Rate Limiting │ Bot Management  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Cloudflare R2                                  │ │
│  │              (Object Storage - Images, Files, Attachments)             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VERCEL PLATFORM                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   Edge Functions    │  │  Serverless Fns     │  │    Static Assets    │ │
│  │   (Middleware)      │  │  (API Routes)       │  │    (CDN Cached)     │ │
│  │   < 1ms cold start  │  │  Node.js Runtime    │  │    Global Edge      │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
┌─────────────────────────────┐      ┌─────────────────────────────┐
│      POSTGRESQL (Neon)      │      │     EXTERNAL SERVICES       │
│  ┌───────────────────────┐  │      │  ┌───────────────────────┐  │
│  │   Connection Pooling  │  │      │  │   Zerion Portfolio    │  │
│  │   Drizzle ORM         │  │      │  │   DeFi Llama TVL      │  │
│  │   Prepared Statements │  │      │  │   CometAPI (LLM)      │  │
│  │   Automatic Backups   │  │      │  │   OpenAI / Anthropic  │  │
│  └───────────────────────┘  │      │  └───────────────────────┘  │
└─────────────────────────────┘      └─────────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 15, React 18, TypeScript, TailwindCSS, Radix UI |
| **Backend** | Next.js API Routes, Vercel AI SDK, PostgreSQL (Drizzle ORM) |
| **AI** | OpenAI, Anthropic Claude, xAI Grok, Zhipu GLM |
| **Auth** | NextAuth.js, TOTP 2FA, Wallet Connect, OAuth |
| **Payments** | Stripe, x402 Protocol (on-chain) |
| **Infra** | Vercel, Cloudflare, Turso/PlanetScale |

---

## Project Structure

```
barzakh-ai/
├── apps/
│   ├── frontend/                 # Next.js 15 application
│   │   ├── app/
│   │   │   ├── (auth)/           # Auth pages (login, register, 2FA)
│   │   │   ├── (chat)/           # Chat interface
│   │   │   └── api/              # API routes
│   │   │       ├── 2fa/          # Two-factor auth
│   │   │       ├── auth/         # NextAuth handlers
│   │   │       ├── billing/      # Stripe + x402
│   │   │       ├── settings/     # User preferences
│   │   │       └── webhooks/     # External integrations
│   │   ├── components/           # React components
│   │   │   ├── Input/            # Chat input system
│   │   │   ├── settings/         # Settings UI
│   │   │   └── ui/               # Radix UI primitives
│   │   └── lib/
│   │       └── db/               # Drizzle ORM schema
│   │
│   └── backend/                  # Supplementary backend services
│
├── packages/
│   └── shared/                   # Shared utilities
│       └── src/lib/
│           ├── ai/
│           │   ├── models.ts     # Model configurations
│           │   ├── prompts.ts    # System prompts
│           │   └── tools/        # 45+ blockchain tools
│           │       ├── aptos/    # Aptos-specific
│           │       ├── solana/   # Solana-specific
│           │       ├── evm/      # EVM chains
│           │       ├── flow/     # Flow blockchain
│           │       ├── sei/      # SEI chain
│           │       └── onchain/  # Cross-chain utils
│           └── security/         # Input sanitization
│
├── docs/
│   ├── cloudflare-api-schema.yaml  # OpenAPI spec
│   └── cloudflare-api-schema.json
│
├── turbo.json                    # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

---

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 15+

### Quick Start

```bash
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
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# AI Providers
OPENAI_API_KEY=...
COMETAPI_API_KEY=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# External APIs
ZERION_API_KEY=...
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm --filter frontend dev` | Run frontend only |
| `pnpm --filter frontend db:push` | Push schema changes |
| `pnpm --filter frontend db:studio` | Open Drizzle Studio |

---

## API Documentation

Full OpenAPI 3.0 specification available in `/docs/`:

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/*` | * | NextAuth handlers |
| `/api/2fa/*` | POST | Two-factor authentication |
| `/api/billing/subscription` | GET | Subscription status |
| `/api/billing/x402/*` | * | Crypto payments |
| `/api/settings` | GET/PATCH | User settings |
| `/api/settings/wallet/*` | * | Wallet binding |

---

## Security

### Authentication Layers
- Session-based auth (NextAuth.js)
- OAuth providers (Google)
- Wallet signature verification
- TOTP-based 2FA

### API Protection
- Cloudflare API Shield with OpenAPI schema validation
- Rate limiting per endpoint category
- Input sanitization (prompt injection defense)

### Sensitive Operations
- Re-authentication required for:
  - Account deletion
  - Wallet binding/unbinding
  - Email change

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Configuration

| Environment | URL | Branch |
|-------------|-----|--------|
| Production | chat.barzakh.tech | main |
| API Production | staging.barzakh.tech | main |

---

## License

MIT License - see [LICENSE](LICENSE)

---

<p align="center">
  <strong>Built by <a href="https://github.com/sirath-network">Sirath Network</a></strong>
</p>
