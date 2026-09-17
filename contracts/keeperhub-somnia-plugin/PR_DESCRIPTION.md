# PR: Add Somnia Network Integration & DreamDEX Prediction Market Plugin

## Summary

This PR adds native support for **Somnia Network** (Shannon Testnet Chain ID `50312` and Somnia Mainnet `5031`) and introduces the **`@keeperhub/plugin-dreamdex`** plugin to KeeperHub.

Somnia is an ultra-high-throughput EVM Layer 1 blockchain achieving **400,000+ TPS** with sub-second finality. DreamDEX is the premier decentralized prediction market protocol operating on Somnia, utilizing a Central Limit Order Book (CLOB) and binary outcome sets (UP / DOWN) backed by testnet USDC (`tUSDC`) collateral.

---

## What's Included

### 1. Chain Registry Addition (`chains/somnia-shannon.ts`)
- **Somnia Shannon Testnet**:
  - Chain ID: `50312`
  - RPC URL: `https://dream-rpc.somnia.network`
  - Explorer: `https://shannon-explorer.somnia.network`
  - Native Gas Token: `STT` (18 decimals)
  - Multicall3 Contract: `0xcA11bde05977b3631167028862bE2a173976CA11`
- **Somnia Mainnet**:
  - Chain ID: `5031`
  - RPC URL: `https://api.infra.mainnet.somnia.network`
  - Explorer: `https://somnia-explorer.io`

### 2. New Plugin: `@keeperhub/plugin-dreamdex` (`plugins/dreamdex/`)
Provides first-class deterministic nodes for automated prediction market workflows:

#### **Actions (Web3 Write)**:
- **`placeOrder`**: Place taker or limit orders on the DreamDEX CLOB order book (UP or DOWN contracts) with configurable slippage protection.
- **`redeemWinningTokens`**: Autonomous 1:1 redemption of winning contracts for tUSDC collateral on resolved markets.
- **`closePosition`**: Liquidate active prediction contracts early before market expiry at current mark price.
- **`mintTokens`**: Deposit tUSDC collateral to mint equal UP + DOWN token sets via ERC-6909 standard.

#### **Reads (Web3 Read)**:
- **`getImpliedProbability`**: Real-time implied odds (UP vs DOWN) in millionths.
- **`getMarketStatus`**: Resolution state (Trading, Locked, Resolved), strike price, and countdown.

#### **Triggers**:
- **`onMarketResolved`**: Triggers workflow execution upon on-chain `MarketResolved` event emission.

---

## Value to the Platform

1. **New High-Growth Ecosystem**: Opens KeeperHub to the Somnia community and developers building high-frequency automated strategies.
2. **First Prediction Market Automation**: Gives AI agents and DeFi protocols the ability to run automated market-making, arbitrage, conviction-based hedging, and 24/7 background settlement sweeps.
3. **Turnkey & Gas Integration**: Seamlessly works with KeeperHub's Turnkey non-custodial wallet infrastructure, MEV routing, and Smart Gas estimation.

---

## Testing & Verification

Unit tests pass covering all actions, reads, triggers, and input formatting:
```bash
cd plugins/dreamdex
pnpm test
```

Tested against live Somnia Shannon contracts:
- BTC-UP-5m Pool: `0x276f5834C407b5B1d1De943dEf367f33E33f6E3C`
- tUSDC Token: `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`
- Live Verified Onchain Transaction: [`0xdfdf84f90ed6bcd5acc3ff874a543e7fa9771f733fadccbc6e55f5afd779402e`](https://shannon-explorer.somnia.network/tx/0xdfdf84f90ed6bcd5acc3ff874a543e7fa9771f733fadccbc6e55f5afd779402e)

---

## Checklist
- [x] TypeScript strict mode
- [x] Unit tests with 100% coverage on action handlers
- [x] Verified contract ABIs included
- [x] Zero breaking changes to core execution engine
