# Barzakh Intelligence Payments

`src/BarzakhIntelligencePayments.sol` settles briefings through a deployed contract. `pay(bytes32 commitment, uint256 expiresAt)` accepts exactly **0.002 native USDC** (18 decimals), records the payer/commitment, forwards the fee to the constructor-configured merchant, and emits `InvoicePaid`. There is no admin, proxy, price setter, merchant setter, or custody/refund mechanism.

The contract checks the fee, deadline, zero commitments, and duplicate payments. A reentrancy guard protects recipient callbacks; a failed merchant transfer reverts the entire payment. Duplicate state is scoped to the sender, so an unrelated sender cannot front-run and consume somebody else's invoice. Raw transfers without calling `pay` revert.

The service still authenticates invoices with its HMAC before fulfilling a request. The contract accepts arbitrary commitments: paying a random commitment does **not** buy an authenticated service invoice. It does not prove AI delivery, accuracy, or commit the result digest onchain. Preserve the pending receipt and retry the same payment if inference fails.

## Arc Mainnet deployment

- Chain: **5042**
- Contract: `0xb4e4807abf64ae60eee36267be653bf6f2b6f8ea`
- Merchant: `0xf23480B0AFa902bb7646de92b2B538a6A769FdDA`
- [Contract explorer](https://explorer.arc.io/address/0xb4e4807abf64ae60eee36267be653bf6f2b6f8ea)
- [Deployment transaction](https://explorer.arc.io/tx/0xf893f0971a37ad3bf6f62a4704724babc0c63fb1720fcb593d57cf6eedfa03b5)

## Arc Testnet deployment

- Chain: **5042002**
- Contract: `0xb4e4807abf64ae60eee36267be653bf6f2b6f8ea`
- Merchant: `0xf23480B0AFa902bb7646de92b2B538a6A769FdDA`
- [Contract explorer](https://explorer.testnet.arc.io/address/0xb4e4807abf64ae60eee36267be653bf6f2b6f8ea)
- [Deployment transaction](https://explorer.testnet.arc.io/tx/0x28f35e42277a3790b91f3e883c063d3d1e5a032079ee94bca5ffceea676b5192)

Public deployment metadata is in `deployments/`.

## Verification & Health Commands

```sh
pnpm arc:test
pnpm arc:check
pnpm arc:migrate
```

Deployment reads `ARC_PRIVATE_KEY` and optionally `ARC_TESTNET_RPC_URL` from `apps/frontend/.env`. New deployments use the deploying account as the constructor's fee recipient; recovery uses the recorded constructor value. The application reads that recipient directly from the contract's `merchant()` getter—no separate wallet-address environment variable is needed. It refuses other chain IDs, caps deployment gas cost at 1 test USDC, saves the public transaction hash before broadcast, verifies runtime code/merchant/price, then configures `ARC_TESTNET=true` and `ARC_TESTNET_PAYMENT_CONTRACT`. Existing deployment records are recovered rather than automatically deploying again. If broadcast failed, investigate that recorded hash before any new deployment. Never put the private key in `NEXT_PUBLIC_*`, command arguments, source control, or hosting configuration; it is only needed by deployment/test scripts.

## Application integration

New invoices use `barzakh-arc-v2` and commit to `payment_contract`. Browser and agent payments call `pay` through shared `invoiceTransaction()`. Verification checks transaction input/value/sender/target, settlement time, successful receipt, exact runtime bytecode, configured merchant/price, and the matching `InvoicePaid` log. Legacy v1 transfer receipts remain verifiable, but new quotes require the deployed contract.

Restart `pnpm run dev` after environment changes. The deployment script also updates the testnet toggle and contract address in the standalone Signal Agent's `.env` when that file exists; it never copies the deployment private key. Separate hosted services need the same public configuration set manually. Both Arc Mainnet (`ARC_MAINNET_PAYMENT_CONTRACT`) and Arc Testnet (`ARC_TESTNET_PAYMENT_CONTRACT`) are deployed to `0xb4e4807abf64ae60eee36267be653bf6f2b6f8ea`. Switch environments using `ARC_TESTNET=true` (or `false` for mainnet). No database schema change is required beyond the existing receipt migration.

Reference: [Official Arc deployment guide](https://docs.arc.io/arc/tutorials/deploy-on-arc).
