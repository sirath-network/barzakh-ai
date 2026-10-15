# Barzakh × Arc: Proof of Intelligence

> **Smart-contract update:** New briefings now require `BarzakhIntelligencePayments` and use v2 contract invoices. The payment contract is deployed at `0xb4e4807abf64ae60eee36267be653bf6f2b6f8ea` on both Arc Mainnet (Chain 5042) and Arc Testnet (Chain 5042002). Full deployment and integration details are documented in [contracts/README.md](../contracts/README.md). For local testing and development, switch between networks with `ARC_TESTNET=true` (testnet) or `ARC_TESTNET=false` (mainnet).

An AI agent buys a market briefing for **0.002 USDC** on **Arc mainnet**, then delivers a public receipt that anyone can check against the chain. The briefing examines the bull case, bear case, and risks using a fresh CoinGecko snapshot. These are three perspectives from one model, not three independent agents.

## Local setup

No deployment, production migration, or funded transaction is performed by installing this change.

1. Set these variables in `apps/frontend/.env`. Use a **local or development Postgres database** for local testing. Existing `POSTGRES_URL` values may point at a hosted database; check before running the migration.

   ```dotenv
   POSTGRES_URL=
   ARC_MAINNET_RPC_URL=
   ARC_INVOICE_SECRET=
   OPENROUTER_API_KEY=
   OPENROUTER_BASE_URL=
   ARC_ANALYSIS_MODEL=
   # Optional, for higher market-data request limits:
   COINGECKO_API_KEY=
   ```

   Generate the invoice secret with `openssl rand -hex 32`. Keep it private and stable across restarts so paid requests remain recoverable. Never put it in a `NEXT_PUBLIC_` variable. Existing frontend authentication/database environment settings remain required by the surrounding app.

2. From the repository root:

   ```sh
   pnpm arc:test
   pnpm arc:migrate
   pnpm arc:check
   pnpm run dev
   ```

   `arc:migrate` creates only `arc_intelligence_receipts`, with unique transaction-hash and invoice-ID constraints. It does not change the existing application tables. It uses the **actual `POSTGRES_URL`**; it does not create a database or silently choose a local database. Run it explicitly against each target environment.

3. Open **http://localhost:3000/arc**. The page can display live chain health before the merchant service is configured. Payment stays disabled until the database table, merchant wallet, signing secret, AI key, and mainnet RPC are ready.

   The root command starts all three apps together: frontend (including `/arc`) on **3000**, backend on **3001**, and Signal Agent on **3005**. Port **3010** was a temporary development preview, not a fourth app. To run only the frontend, use `pnpm dev:frontend`.

4. Use an injected EVM wallet such as MetaMask or Rabby, funded with a small amount of **real USDC on Arc mainnet**. The app displays the 0.002 USDC price, receiving address, and maximum estimated network fee before asking the wallet to sign. A local website still sends real mainnet transactions. The receiving wallet does not need gas to receive; the payer does.

5. Select BTC, ETH, SOL, NVDA, CRCL, or any custom crypto/stock/CA. Review the invoice, approve payment, then inspect the briefing, explorer transaction, and public receipt.

## AI research prompts

The **Generate with AI** / **Rewrite with AI** button and all four topic buttons call `/api/arc/prompt`. The server asks the configured LLM to write a new research question using the selected asset, existing draft, and selected focus. No template fallback is used. Errors leave the existing draft unchanged. This step does not initiate a wallet payment; it uses the operator's OpenRouter API credits.

Requires `OPENROUTER_API_KEY`. The optional `ARC_PROMPT_MODEL` overrides `ARC_ANALYSIS_MODEL` for drafting; otherwise the analysis model resolver is used (default `openai/gpt-4o-mini`). `OPENROUTER_BASE_URL` is shared with analysis. Rewrites request a different research angle; exact or heavily overlapping text is rejected and retried once with feedback. If both attempts repeat the draft, the UI reports an error and preserves your text. Both calls share a 35-second timeout. The endpoint has a shared 30-request/minute budget per server process (up to two provider calls per request). Multi-instance hosting needs a distributed limit at the gateway. No live market data is supplied to the drafting model, so drafts request research rather than claim current findings.

## Receipt cards

After a successful payment, click the receipt card to open a larger preview. Download a **1080 × 1350 PNG** for posting, download the complete **JSON proof**, or use **Share card**. Supported browsers open the device share sheet with the image; others share or copy the public receipt link. The card labels the receipt's actual mainnet/testnet chain and includes its transaction hash, settlement block, result digest, and verification URL.

Links copied while testing locally use your local origin and are only reachable from your machine. After deployment, open the receipt on the live site before sharing it publicly. No additional service or image storage is needed for card downloads; images are rendered in the browser.

## Network Mode Toggle (Arc Testnet vs. Arc Mainnet)

You can switch between **Arc Testnet** and **Arc Mainnet** with a single variable in `.env`:

```dotenv
# Set to "true" for Arc Testnet (Chain ID 5042002), or "false" for Arc Mainnet (Chain ID 5042)
ARC_TESTNET=true
```

| Network | Chain ID | RPC URL | Explorer URL |
| :--- | :--- | :--- | :--- |
| **Arc Mainnet** (`ARC_TESTNET=false`) | `5042` | `https://rpc.mainnet.arc.io` | `https://explorer.arc.io` |
| **Arc Testnet** (`ARC_TESTNET=true`) | `5042002` | `https://rpc.testnet.arc.network` | `https://explorer.testnet.arc.io` |

When toggled, the entire stack automatically updates:
- `/api/arc/status` reports the active chain name, chain ID, and current block number.
- Invoices are issued with the active `chain_id`.
- Payment verifications query the active network RPC.
- Frontend `/arc` UI prompts the connected wallet to switch to the active chain.

## What changed from testnet

- Shared mainnet configuration: chain **5042**, `https://rpc.mainnet.arc.io`, `https://explorer.arc.io`.
- Arc is available in the app's wallet network configuration and transaction history. Historical testnet transactions retain their correct testnet explorer links.
- `querySignalAgent` uses mainnet and the in-app service by default. It no longer fetches arbitrary image URLs or analyzes a substitute Bitcoin logo when another token is missing.
- The old `SIGNAL_AGENT_URL` is deliberately ignored for this flow. To run a separate service, deploy `apps/signal-agent`, set **`ARC_SIGNAL_AGENT_URL`** to its HTTPS `/api/sentiment` endpoint, and configure the **same database, merchant address, invoice secret, and provider** on both apps. The standalone route delegates to the exact same verifier. The frontend handles public receipt pages.
- Approval-mode chat users receive `/arc` for explicit wallet approval. Autopilot uses the existing delegated EVM wallet. It pays only a correctly bound invoice at the fixed price to the configured recipient.
- Legacy `x-402-receipt` header naming is retained for compatibility. This is a **custom HTTP 402 invoice/receipt protocol**, not a claim of interoperable x402 or Circle Nanopayments compliance.

## Payment and proof design

1. The service validates the request, storage, provider configuration, mainnet chain, merchant EOA, and available market data.
2. It issues a ten-minute invoice signed with HMAC-SHA256. The invoice binds a random ID, payer, recipient, chain, exact price, expiry, and the Keccak-256 hash of the normalized request.
3. The payer sends a native USDC transfer to the merchant EOA with the invoice commitment as its calldata. Arc's native view uses **18 decimals**; its ERC-20 interface uses **6**. They represent one balance. The code never adds the two views together. The native transfer allows a commitment without deploying a new custody contract or requesting a token approval.
4. The service fetches the transaction, successful receipt, and settlement block from mainnet. It checks the payer, recipient, exact value, calldata, matching block, and timestamp. A fabricated hash, plain unrelated transfer, or testnet payment cannot unlock analysis.
5. A Postgres transaction-level advisory lock and unique constraints prevent concurrent successful fulfillment of the same invoice. The result is persisted before being returned. Completed retries return the saved result. Provider failures roll back and allow retry with the same payment; a crash after upstream inference but before persistence can repeat inference, never payment.
6. A public receipt rechecks payment against Arc and checks stored hashes. JSON receipts can also be checked without the application database:

   ```sh
   pnpm arc:verify ./arc-receipt-0xYOUR_HASH.json
   ```

**Proof boundary:** the chain proves settlement and the invoice/request commitment. The result hash is an offchain provider record. It detects an unchanged document's result digest; it is not a signed provider attestation, an onchain result commitment, or proof that an AI opinion is correct. A party that edits both the result and its hash can produce a different internally consistent file. An immutable output attestation is a possible later extension, not a shipped claim.

## Recovery

After broadcast the browser immediately saves the request, signed invoice, and transaction hash in local storage. If confirmation or inference times out, choose **Resume without paying again**. The same invoice is valid for redemption after expiry if its payment settled inside the validity window.

Download recovery details before clearing browser storage. They can be submitted to the API directly:

```sh
curl http://localhost:3000/api/arc/analyze \
  -H 'Content-Type: application/json' \
  -H 'x-402-receipt: 0xYOUR_EXISTING_TRANSACTION_HASH' \
  -H 'x-arc-invoice: YOUR_SAVED_INVOICE_TOKEN' \
  --data '{"token_name":"BTC","payer":"0xYOUR_PAYER_ADDRESS"}'
```

Chat pending results include `receipt_id` and `invoice_token`; pass those as `receiptTxHash` and `invoiceToken` to the tool to resume. Arc's transaction executor does not automatically re-sign or resend after a broadcast timeout; it retains the deterministic signed-transaction hash when the RPC response is ambiguous.

The prototype has no automatic refunds. If a provider fails after settlement, preserve the recovery details and retry. The service checks market-data availability before issuing invoices, but upstream availability can change between quote and fulfillment.

## Deployment by the owner

1. Run the tests and TypeScript checks. Apply `scripts/arc-receipts.sql` to the intended deployment database.
2. Set the environment variables above in the hosting environment. Keep secrets out of the repo. A single frontend deployment serves the demo, payment endpoint, and receipt verifier; a separate Signal Agent is optional.
3. Deploy using the project's normal hosting process. `/api/arc/analyze` requests up to 90 seconds to allow provider execution; make sure the hosting plan permits it.
4. Open `/api/arc/status`; confirm chain 5042 and `ready: true`.
5. Complete one real funded wallet payment on `/arc`. Open its explorer transaction and `/arc/receipts/<hash>` from a logged-out browser. Download and independently verify the JSON receipt.
6. Submit only after the deployed URL and receipt work. Mainnet configuration or a passing unit test alone is not evidence of a completed mainnet payment.

## Submission draft

**Project:** Barzakh AI — Proof of Intelligence

**Live URL after deployment:** https://app.sirath.network/arc

**Public repo:** https://github.com/sirath-network/barzakh-ai

**Description:** Barzakh makes agent commerce inspectable. A user or authorized agent buys a market briefing for 0.002 USDC on Arc mainnet. The payment commits to a signed invoice and its request; a public receipt lets anyone verify settlement and inspect the delivered analysis. Arc's native USDC lets the same asset pay for both the service and gas, without token approvals or a new escrow contract. The prototype includes request-bound payments, duplicate-fulfillment protection, payment recovery, and a public verifier.

**Attach after testing:** one real mainnet transaction and its public receipt URL. Use the builder's own public GitHub/X/Farcaster profile.

The supplied deadline, October 14, 2026 at 23:59 Eastern, corresponds to **October 15 at 10:59 WIB**. Verify the program's current submission page before filing.

## Official references

- [Network configuration](https://docs.arc.io/arc/references/connect-to-arc)
- [USDC contract and decimal interfaces](https://docs.arc.io/arc/references/contract-addresses)
- [EVM and native transfer differences](https://docs.arc.io/arc/references/evm-differences)
