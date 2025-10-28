# Etherscan API V2 Migration

## Overview
As of **August 15th, 2025**, Etherscan deprecated their V1 API endpoints. All applications must migrate to the new V2 API which uses a unified multichain experience across 60+ supported networks.

## What Changed

### Base URL
- **Old (V1)**: `https://api.etherscan.io/api`
- **New (V2)**: `https://api.etherscan.io/v2/api`

### Required Parameter
All V2 API calls **MUST** include a `chainid` parameter:

```bash
# Old V1 format (deprecated)
https://api.etherscan.io/api?module=account&action=balance&address=0x...&apikey=YOUR_KEY

# New V2 format (required)
https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=0x...&apikey=YOUR_KEY
```

### Supported Chain IDs

According to the [Etherscan chainlist](https://api.etherscan.io/v2/chainlist), **67+ chains** are supported. Here are the main ones:

| Chain | Chain ID | Example |
|-------|----------|---------|
| Ethereum Mainnet | 1 | `chainid=1` |
| Polygon | 137 | `chainid=137` |
| BSC | 56 | `chainid=56` |
| Base | 8453 | `chainid=8453` |
| Arbitrum One | 42161 | `chainid=42161` |
| Optimism | 10 | `chainid=10` |
| Avalanche C-Chain | 43114 | `chainid=43114` |
| Linea | 59144 | `chainid=59144` |
| zkSync | 324 | `chainid=324` |
| Scroll | 534352 | `chainid=534352` |
| Blast | 81457 | `chainid=81457` |
| Mantle | 5000 | `chainid=5000` |
| Sonic | 146 | `chainid=146` |
| Berachain | 80094 | `chainid=80094` |
| Unichain | 130 | `chainid=130` |

**Plus 50+ more including:**
- Arbitrum Nova, Celo, Cronos, Fraxtal, Gnosis, Moonbeam, opBNB, Taiko, World Chain, ApeChain, Sophon, Swellchain, Monad, Abstract, HyperEVM, Katana, Sei, XDC, and many testnets

[View full list of 67+ supported chains](https://api.etherscan.io/v2/chainlist)

## Implementation in BarzakhAI

### Files Modified

1. **`packages/shared/src/lib/ai/tools/onchain/constant.ts`**
   - Updated base URL to V2
   - Added default chain ID constant

2. **`packages/shared/src/lib/ai/tools/onchain/get_evm_onchain_data_using_etherscan.ts`**
   - Added `chainId` parameter support
   - Auto-inject chainid if missing
   - Enhanced error handling for V2 migration errors

### Key Features

✅ **Smart Chain Detection**: Automatically detects chain from query text ("on Polygon" → chainid=137)  
✅ **Dynamic Chain Discovery**: Automatically fetches all 67+ supported chains from Etherscan API  
✅ **Automatic V1→V2 Correction**: Auto-fixes deprecated V1 URLs to V2 format  
✅ **Automatic Chain ID Injection**: If chainid is missing from the URL, it's automatically added  
✅ **Configurable Chain ID**: Can specify chain ID per request or use default (Ethereum Mainnet)  
✅ **AI-Aware**: The AI agent knows about all supported chains and can respond accordingly  
✅ **Error Detection**: Detects and logs V2 migration errors  
✅ **Fallback Support**: Falls back to common chains if API fetch fails    

### Usage Example

The AI agent now automatically handles Etherscan API V2 calls:

```typescript
// Query example
const result = await getEvmOnchainDataUsingEtherscan({
  userQuery: "Get transaction history for address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  chainId: 1 // Optional, defaults to 1 (Ethereum)
});
```

Generated API call:
```
https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&startblock=0&endblock=99999999&sort=desc&apikey=YOUR_KEY
```

## Multi-Chain Support

The V2 API uses a single Etherscan API key for all chains. No need for separate API keys for:
- BaseScan
- BscScan  
- PolygonScan
- ArbScan
- etc.

Just use your Etherscan API key with the appropriate `chainid` parameter!

## Troubleshooting

### Error: "You are using a deprecated V1 endpoint"
**Solution**: Our system now automatically corrects V1 URLs to V2 format. If you still see this error, check logs for "⚠️ Corrected V1 URL to V2 format"

**Manual Fix**: Ensure your base URL is `https://api.etherscan.io/v2/api` (with `/v2/`) and includes `chainid` parameter

### Error: "Missing chainid parameter"
**Solution**: System automatically adds chainid if missing. Check logs for "Added missing chainid parameter"

### Using Wrong Chain ID
**Solution**: 
- Mention the chain name in your query: "on Polygon", "on Base", etc.
- System will auto-detect and use the correct chain ID
- Check logs for "🔍 Detected chain from query: ..."
- See [chainlist](https://api.etherscan.io/v2/chainlist) for all chain IDs

## References

- [Etherscan V2 Migration Guide](https://docs.etherscan.io/v2-migration)
- [Supported Chain List](https://api.etherscan.io/v2/chainlist)
- Etherscan API Documentation

## Migration Status

✅ **Completed**: Etherscan API integration fully migrated to V2  
✅ **Tested**: Chain ID injection working correctly  
✅ **Multi-chain**: Supports all 67+ networks dynamically  
✅ **Smart**: AI agent aware of all available chains  
✅ **Resilient**: Fallback mechanism for API failures  

---

**Last Updated**: January 2025

