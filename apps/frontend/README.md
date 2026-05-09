# Barzakh AI - Frontend

The main Next.js application powering the Barzakh AI platform - an enterprise-grade, multi-model AI blockchain intelligence platform.

## Overview

This is the frontend package of the Barzakh AI monorepo, built with:

- **Next.js 16.1.0** with App Router and Turbopack
- **React 19.2.0** with streaming SSR
- **TypeScript 5.6.3** for type safety
- **Vercel AI SDK 4.1.17** for multi-model AI orchestration
- **Drizzle ORM 0.34.1** for type-safe database access
- **Wagmi 2.19.5 + Viem 2.41.2** for Web3 wallet integration

## Features

- **Multi-Model AI**: GPT-5.x, Claude Opus 4.6, GLM 4.7, and 6+ models
- **50+ Blockchain Tools**: Cronos, Aptos, Solana, SEI, Flow, Zeta, Monad, and more
- **VVS DEX Integration**: Swap quotes, pool info, token lists
- **x402 Gasless Payments**: EIP-3009 USDC payments on Cronos
- **2FA + Wallet Auth**: TOTP, email OTP, and EIP-191 wallet signatures

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| pnpm | 8.6+ |
| PostgreSQL | 15+ |

## Installation

From the monorepo root:

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

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AI Providers
AZURE_FOUNDRY_ENDPOINT=https://...services.ai.azure.com/openai/v1
AZURE_FOUNDRY_API_KEY=...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# x402 Crypto Payments
CRONOS_RPC_URL=https://evm.cronos.org

# External APIs
ZERION_API_KEY=...
TAVILY_API_KEY=...
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Run migrations and build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Lint with ESLint and Biome |
| `pnpm db:generate` | Generate migration files |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema changes (dev) |
| `pnpm db:studio` | Open Drizzle Studio |

## Project Structure

```
apps/frontend/
├── app/
│   ├── (auth)/                 # Auth pages (login, register, 2FA)
│   ├── (chat)/                 # Chat interface + API routes
│   │   └── api/chat/           # AI chat with tool execution
│   └── api/
│       ├── 2fa/                # TOTP setup & verification
│       ├── billing/x402/       # Crypto payment endpoints
│       └── cron/               # Scheduled jobs
├── components/                 # React components
│   ├── ui/                     # Radix UI primitives
│   └── settings/               # Settings UI
├── lib/
│   ├── db/                     # Drizzle ORM + schema
│   ├── auth.ts                 # NextAuth configuration
│   ├── stripe.ts               # Stripe configuration
│   └── wagmi.ts                # Web3 configuration
└── public/                     # Static assets
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/*` | * | NextAuth handlers |
| `/api/2fa/*` | POST | Two-factor authentication |
| `/api/chat` | POST | AI chat with streaming |
| `/api/billing/subscription` | GET | Subscription status |
| `/api/billing/x402/*` | * | Crypto payments |
| `/api/settings` | GET/PATCH | User settings |

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Core** | Next.js 16.1.0, React 19.2.0, TypeScript 5.6.3 |
| **Styling** | TailwindCSS 3.4.1, Radix UI, Framer Motion 11.3.19 |
| **Database** | PostgreSQL, Drizzle ORM 0.34.1 |
| **Auth** | NextAuth.js 5.0.0-beta.30 |
| **Web3** | Wagmi 2.19.5, Viem 2.41.2, Dynamic SDK 4.x |
| **AI** | Vercel AI SDK 4.1.17 |
| **Payments** | Stripe 18.5.0, x402 Protocol |

## Related Packages

- `@barzakh/shared` - Shared utilities, AI tools, and prompts

## Documentation

- [Main README](../../README.md)
- [Whitepaper](../../docs/WHITEPAPER.md)
- [Cloudflare Protection](../../docs/cloudflare-api-protection.md)

## License

MIT License - see [LICENSE](../../LICENSE)
