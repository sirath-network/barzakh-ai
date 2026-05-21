# Barzakh AI - Backend API

Supplementary backend services for the Barzakh AI platform, providing OpenAI-compatible chat endpoints backed by the shared Azure AI Foundry provider configuration.

## Overview

This package contains supplementary backend services that complement the main frontend application. Built with:

- **Next.js 16.2.6** with App Router
- **React 19.2.0**
- **Vercel AI SDK 4.3.19**
- **TypeScript 5.x**

## Architecture

The Barzakh AI platform uses a hybrid architecture:

| Component | Location | Port | Purpose |
|-----------|----------|------|---------|
| **Main App** | `apps/frontend/` | 3000 | Primary web app + API routes |
| **Backend API** | `apps/backend/` | 3001 | OpenAI-compatible API |
| **Shared Logic** | `packages/shared/` | - | AI tools, prompts, utilities |

## Getting Started

From the monorepo root:

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Start backend only
pnpm dev:api
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 3001 |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/completions` | POST | OpenAI-compatible chat completions |
| `/api/completions` | POST | Legacy completions endpoint |

## Technology Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 18+ |
| **Framework** | Next.js 16.2.6 |
| **Language** | TypeScript 5.x |
| **AI** | Vercel AI SDK 4.3.19 |
| **Database** | Drizzle ORM 0.45.2 |
| **Web3** | Wagmi 2.14.11, Viem 2.23.4 (API compatibility package) |

## Related Packages

- [`apps/frontend`](../frontend/README.md) - Main Next.js application
- [`packages/shared`](../../packages/shared/) - Shared utilities

## Documentation

- [Main README](../../README.md)
- [Whitepaper](../../docs/WHITEPAPER.md)

## License

MIT License - see [LICENSE](../../LICENSE)
