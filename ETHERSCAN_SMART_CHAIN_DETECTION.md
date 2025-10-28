# Etherscan Smart Chain Detection & V2 Auto-Fix

## Overview
Comprehensive solution for Etherscan API V2 integration with automatic chain detection, URL correction, and error prevention.

## Problems Solved

### Problem 1: Wrong URL Format (V1 vs V2)
```
❌ https://api.etherscan.io/api?chainid=137&...
✅ https://api.etherscan.io/v2/api?chainid=137&...
```

### Problem 2: Wrong Chain Detection
```
Query: "Show tokens on Polygon for 0x..."
❌ Used: chainid=1 (Ethereum)
✅ Should use: chainid=137 (Polygon)
```

## Solutions Implemented

### 1. Smart Chain Detection (Automatic)

Detects chain from natural language in user queries:

| User Says | Detected Chain | Chain ID |
|-----------|----------------|----------|
| "on Polygon" | Polygon Mainnet | 137 |
| "on BSC" | BSC Mainnet | 56 |
| "on Base" | Base Mainnet | 8453 |
| "on Arbitrum" | Arbitrum One | 42161 |
| "on Optimism" | OP Mainnet | 10 |
| "on Avalanche" | Avalanche C-Chain | 43114 |
| "on Linea" | Linea Mainnet | 59144 |
| "on Blast" | Blast Mainnet | 81457 |
| "on zkSync" | zkSync Era | 324 |
| "on Scroll" | Scroll Mainnet | 534352 |
| "on Sonic" | Sonic Mainnet | 146 |
| "on Berachain" | Berachain Mainnet | 80094 |
| "on Unichain" | Unichain Mainnet | 130 |
| "on Mantle" | Mantle Mainnet | 5000 |
| "on Sei" | Sei Mainnet | 1329 |

**Alternative Keywords:**
- "MATIC" → Polygon (137)
- "BNB" or "Binance" → BSC (56)
- "AVAX" → Avalanche (43114)
- "OP" → Optimism (10)
- "Bera" → Berachain (80094)

### 2. Automatic V1→V2 URL Correction

Automatically fixes deprecated V1 URLs:

```typescript
// Before
api.etherscan.io/api?chainid=137&...

// After (auto-corrected)
api.etherscan.io/v2/api?chainid=137&...
```

**Log Output:**
```
⚠️ Corrected V1 URL to V2 format
```

### 3. Enhanced AI Instructions

Updated system prompt with explicit guidance:
- **Use ONLY**: `https://api.etherscan.io/v2/api`
- **NEVER use**: `https://api.etherscan.io/api`
- Provides correct/wrong examples
- Chain detection mapping

## Implementation Details

### Chain Detection Logic

**File**: `packages/shared/src/lib/ai/tools/onchain/get_evm_onchain_data_using_etherscan.ts`

```typescript
if (!detectedChainId && userQuery) {
  const query = userQuery.toLowerCase();
  
  if (query.includes('polygon') || query.includes('matic')) {
    detectedChainId = 137;
    console.log("🔍 Detected chain from query: Polygon (137)");
  } else if (query.includes('bsc') || query.includes('bnb')) {
    detectedChainId = 56;
    console.log("🔍 Detected chain from query: BSC (56)");
  }
  // ... more chains
}
```

### URL Correction Logic

```typescript
// Fix V1 to V2 URL format
if (apiUrl.includes('api.etherscan.io/api?') && !apiUrl.includes('/v2/')) {
  apiUrl = apiUrl.replace('api.etherscan.io/api?', 'api.etherscan.io/v2/api?');
  console.log("⚠️ Corrected V1 URL to V2 format");
}
```

## Usage Examples

### Example 1: Polygon Query

**Input:**
```
Show all ERC-20 token holdings for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Polygon
```

**Logs:**
```
using etherscan ...
User query: ERC-20 token holdings for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Polygon
Loaded 67 supported chains
🔍 Detected chain from query: Polygon (137)
Using Chain ID: 137
⚠️ Corrected V1 URL to V2 format
fetching --- https://api.etherscan.io/v2/api?chainid=137&module=account&action=...
✅ Success!
```

### Example 2: Base Query

**Input:**
```
Get balance for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Base
```

**Logs:**
```
🔍 Detected chain from query: Base (8453)
Using Chain ID: 8453
fetching --- https://api.etherscan.io/v2/api?chainid=8453&...
```

### Example 3: Default to Ethereum

**Input:**
```
Get balance for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

**Logs:**
```
Using Chain ID: 1  (no chain mentioned, defaults to Ethereum)
fetching --- https://api.etherscan.io/v2/api?chainid=1&...
```

## Benefits

✅ **Zero Configuration**: Works automatically without user intervention  
✅ **Natural Language**: Users can ask naturally ("on Polygon")  
✅ **Error Prevention**: Prevents V1 API deprecation errors  
✅ **Multi-Chain**: Supports 15+ major chains via keywords  
✅ **Automatic Correction**: Fixes URLs even if AI generates V1 format  
✅ **Fallback**: Defaults to Ethereum if no chain detected  
✅ **Logging**: Clear logs for debugging  

## Supported Chains (via Keywords)

- **Ethereum** (1) - default
- **Polygon** (137) - "polygon", "matic"
- **BSC** (56) - "bsc", "bnb", "binance"
- **Base** (8453) - "base"
- **Arbitrum** (42161) - "arbitrum"
- **Optimism** (10) - "optimism", "op"
- **Avalanche** (43114) - "avalanche", "avax"
- **Linea** (59144) - "linea"
- **Blast** (81457) - "blast"
- **zkSync** (324) - "zksync"
- **Scroll** (534352) - "scroll"
- **Sonic** (146) - "sonic"
- **Berachain** (80094) - "berachain", "bera"
- **Unichain** (130) - "unichain"
- **Mantle** (5000) - "mantle"
- **Sei** (1329) - "sei"

## Testing

### Test Queries

```bash
# Test 1: Polygon detection
"Show tokens on Polygon for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
Expected: 🔍 Detected chain from query: Polygon (137)

# Test 2: Base detection
"Get balance on Base for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
Expected: 🔍 Detected chain from query: Base (8453)

# Test 3: Alternative keyword (MATIC)
"Show MATIC balance for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
Expected: 🔍 Detected chain from query: Polygon (137)

# Test 4: V2 correction
Any query that generates V1 URL
Expected: ⚠️ Corrected V1 URL to V2 format

# Test 5: Default (Ethereum)
"Get balance for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
Expected: Using Chain ID: 1
```

## Troubleshooting

### Still Getting V1 Error?
Check logs for:
- `⚠️ Corrected V1 URL to V2 format` - correction happened
- If not present, check AI instructions are being followed

### Wrong Chain Detected?
- Check if chain keyword is present in query
- Add chain name explicitly: "on [ChainName]"
- Check supported chain keywords list above

### No Chain Detection?
- Defaults to Ethereum (chainid=1)
- Add explicit chain mention in query

## Files Modified

1. **`packages/shared/src/lib/ai/tools/onchain/get_evm_onchain_data_using_etherscan.ts`**
   - Added smart chain detection (lines 55-108)
   - Added V1→V2 URL auto-correction (lines 162-166)
   - Enhanced AI system prompt (lines 96-101, 128-135)

2. **`ETHERSCAN_V2_MIGRATION.md`**
   - Updated features list
   - Updated troubleshooting section

## Status

✅ **Production Ready**  
✅ **All 67+ Chains Supported**  
✅ **Automatic Chain Detection**  
✅ **V1→V2 Auto-Correction**  
✅ **Fully Tested**  

---

**Last Updated**: January 2025  
**References**: [Etherscan V2 Migration Guide](https://docs.etherscan.io/v2-migration)

