# Zerion API Endpoint Fix

## 🐛 Problems

### Problem 1: Missing Endpoint in OpenAPI Spec
The Zerion OpenAPI spec file (`zerion-openapi.json`) is **missing the `/v1/wallets/{address}/positions/` endpoint** for getting individual token holdings. The AI was trying to use `getPathParametersAndBaseUrl` to look up this endpoint, causing errors:

```
❌ ERROR: Path '/v1/wallets/{address}/positions/' not found in the OpenAPI spec.
```

### Problem 2: Wrong Endpoint Usage
The AI was also incorrectly using the Zerion `/portfolio` endpoint with invalid parameters:

```
❌ WRONG: /v1/wallets/{address}/portfolio?filter[positions]=all
Error: API call failed with status 400
```

The `/portfolio` endpoint only provides **portfolio overview/summary** data and doesn't accept `filter[positions]` parameters.

## ✅ Solution

**Workaround Approach**: Since the `/v1/wallets/{address}/positions/` endpoint exists in the actual Zerion API but is missing from our OpenAPI spec, we instructed the AI to **build the URL directly** instead of using the `getPathParametersAndBaseUrl` tool.

Updated the AI system prompt to:

1. **Warn about missing endpoint** in OpenAPI spec
2. **Provide direct URL construction instructions** for `/positions/` endpoint
3. **Clear endpoint selection guide** based on user intent
4. **Proper parameter usage** for each endpoint
5. **Chain filtering** with correct chain IDs
6. **Error handling** with detailed error messages

### Key Instruction Added:
```
⚠️ IMPORTANT: The /v1/wallets/{address}/positions/ endpoint is NOT in the OpenAPI spec, 
but it EXISTS and WORKS. You must construct the URL directly without using getPathParametersAndBaseUrl.

Build URL directly:
const url = baseURL + "/v1/wallets/" + address + "/positions/?filter[chain_ids]=" + chain + "&currency=usd";
```

## 🎯 Endpoint Usage Guide

### 1. Portfolio Overview (Summary Only)
```
Endpoint: /v1/wallets/{address}/portfolio
Use When: "total balance", "portfolio value", "net worth"
Parameters: currency (optional)
```

**Example:**
```
https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio
```

### 2. Individual Token Holdings (CORRECT for ERC-20 queries)
```
Endpoint: /v1/wallets/{address}/positions/
Use When: "token holdings", "ERC-20 tokens", "what tokens", "token balances"

⚠️ BUILD URL DIRECTLY (NOT in OpenAPI spec)

Parameters: 
  - filter[chain_ids]: Chain filtering (e.g., "base", "arbitrum", "polygon")
  - filter[position_types]: wallet, deposited, borrowed, locked, staked
  - sort: -value (descending by value)
  - page[size]: results per page (max 100)
  - currency: usd (or other supported currencies)
```

**Example (Direct URL Construction):**
```
✅ CORRECT: https://api.zerion.io/v1/wallets/0x710e86fa6D521934864A10C2b1f5a03c3221Ac02/positions/?filter[chain_ids]=base&currency=usd

✅ CORRECT: https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?filter[chain_ids]=arbitrum

✅ CORRECT: https://api.zerion.io/v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?filter[chain_ids]=ethereum,polygon

❌ WRONG: Trying to use getPathParametersAndBaseUrl for /positions/ → NOT IN SPEC!
```

### 3. NFT Holdings
```
Endpoint: /v1/wallets/{address}/nft-positions/
Use When: "NFTs", "collectibles", "NFT holdings"
Parameters:
  - filter[chain_ids]: Chain filtering
  - sort: -floor_price, created_at
  - include: nfts, nft_collections
```

### 4. Transaction History
```
Endpoint: /v1/wallets/{address}/transactions/
Use When: "transactions", "transaction history", "recent activity"
Parameters:
  - filter[chain_ids]: Chain filtering
  - filter[operation_types]: trade, send, receive, etc.
  - page[size]: results per page
```

## 🔗 Supported Chain IDs

Use these exact values for `filter[chain_ids]`:

| Chain Name | Chain ID |
|------------|----------|
| Ethereum Mainnet | `ethereum` |
| Polygon | `polygon` |
| Arbitrum One | `arbitrum` |
| Optimism | `optimism` |
| Base | `base` |
| Avalanche C-Chain | `avalanche` |
| Binance Smart Chain | `binance-smart-chain` |
| zkSync Era | `zksync-era` |
| Linea | `linea` |
| Blast | `blast` |
| Scroll | `scroll` |
| Mantle | `mantle` |

## 📝 Key Changes

### 1. Enhanced System Prompt

Added comprehensive endpoint selection guide with:
- Clear use cases for each endpoint
- Example URLs showing correct and incorrect usage
- Chain ID reference table
- Step-by-step query processing instructions

### 2. Improved Error Handling

```typescript
if (!response.ok) {
  // Get detailed error from response body
  let errorDetails = "";
  try {
    const errorJson = await response.json();
    errorDetails = JSON.stringify(errorJson);
  } catch (e) {
    errorDetails = await response.text();
  }
  
  console.error(`❌ Zerion API Error ${response.status}:`, errorDetails);
  throw new Error(
    `API call failed with status ${response.status}. Details: ${errorDetails}`
  );
}
```

### 3. Better Logging

- ✅ Success indicators: `✅ Fetched API response successfully`
- ❌ Error indicators: `❌ Zerion API Error 400:`
- Detailed error messages with API response body

## 🧪 Testing

### Test Query 1: ERC-20 Holdings on Arbitrum
```
Query: "Show ERC-20 token holdings for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Arbitrum"

Expected Endpoint: /v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?filter[chain_ids]=arbitrum

Expected Result: List of tokens with balances and USD values on Arbitrum
```

### Test Query 2: All Token Holdings
```
Query: "What tokens does 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 hold?"

Expected Endpoint: /v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/

Expected Result: List of all tokens across all chains
```

### Test Query 3: Portfolio Summary
```
Query: "What's the total portfolio value of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?"

Expected Endpoint: /v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/portfolio

Expected Result: Total portfolio value with breakdown by chain and asset type
```

### Test Query 4: Multi-Chain Token Holdings
```
Query: "Show tokens for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum and Polygon"

Expected Endpoint: /v1/wallets/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/positions/?filter[chain_ids]=ethereum,polygon

Expected Result: Tokens from both Ethereum and Polygon chains
```

## ⚠️ Common Mistakes to Avoid

1. ❌ Using `filter[positions]` on `/portfolio` endpoint → **400 ERROR**
2. ❌ Using wrong chain IDs (use `binance-smart-chain` not `bsc`)
3. ❌ Forgetting the trailing `/` on `/positions/` endpoint
4. ❌ Not URL-encoding filter parameters properly

## 📊 Before vs After

### Before (Broken)
```
Query: "ERC-20 tokens on Arbitrum"
URL: /v1/wallets/{address}/portfolio?filter[positions]=all
Result: ❌ 400 Error
```

### After (Fixed)
```
Query: "ERC-20 tokens on Arbitrum"
URL: /v1/wallets/{address}/positions/?filter[chain_ids]=arbitrum
Result: ✅ List of tokens with balances and USD values
```

## 🔍 Files Changed

1. **`packages/shared/src/lib/ai/tools/onchain/get_evm_onchain_data_using_zerion.ts`**
   - Enhanced system prompt with endpoint selection guide
   - Improved error handling with detailed error messages
   - Better logging for debugging

## 📚 Related Documentation

- [Zerion API Documentation](https://developers.zerion.io/)
- [Zerion API Reference](https://developers.zerion.io/reference/)
- [Zerion LLMs.txt](https://developers.zerion.io/llms.txt)

---

**Last Updated:** October 28, 2025
**Status:** ✅ Fixed and Tested

