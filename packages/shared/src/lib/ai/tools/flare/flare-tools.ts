import { tool } from "ai";
import { z } from "zod";
import { encodeFunctionData, decodeFunctionResult, parseAbi, formatUnits } from "viem";

const FLARE_MAINNET_RPCS = [
  'https://flare-api.flare.network/ext/C/rpc',
  'https://flare.public-rpc.com',
  'https://rpc.ankr.com/flare',
];
const FLARE_TESTNET_RPCS = [
  'https://coston2-api.flare.network/ext/C/rpc',
  'https://coston2.public-rpc.com',
];

const FLARE_MAINNET_RPC = FLARE_MAINNET_RPCS[0];
const FLARE_TESTNET_RPC = FLARE_TESTNET_RPCS[0];
const FLARE_CHAIN_ID = 14;
const FLARE_TESTNET_CHAIN_ID = 114;
const FLARE_EXPLORER = 'https://flare-explorer.flare.network';
const FLARE_TESTNET_EXPLORER = 'https://coston2-explorer.flare.network';
const FLARE_CONTRACT_REGISTRY = '0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019' as `0x${string}`;

// FTSO v2 Feed IDs
const FTSO_FEED_IDS: Record<string, `0x${string}`> = {
  'FLR/USD': '0x01464c522f55534400000000000000000000000000',
  'BTC/USD': '0x014254432f55534400000000000000000000000000',
  'ETH/USD': '0x014554482f55534400000000000000000000000000',
  'XRP/USD': '0x015852502f55534400000000000000000000000000',
  'DOGE/USD': '0x01444f47452f555344000000000000000000000000',
  'ADA/USD': '0x014144412f55534400000000000000000000000000',
  'AVAX/USD': '0x01415641582f555344000000000000000000000000',
  'BNB/USD': '0x01424e422f55534400000000000000000000000000',
  'MATIC/USD': '0x014d415449432f5553440000000000000000000000',
  'SOL/USD': '0x01534f4c2f55534400000000000000000000000000',
  'USDC/USD': '0x01555344432f555344000000000000000000000000',
  'USDT/USD': '0x01555344542f555344000000000000000000000000',
  'SGB/USD': '0x015347422f55534400000000000000000000000000',
};

const REGISTRY_ABI = parseAbi([
  "function getContractAddressByName(string _name) external view returns (address)"
]);

const FTSO_V2_ABI = parseAbi([
  "function getFeedById(bytes21 _feedId) external view returns (uint256 _value, int8 _decimals, uint64 _timestamp)",
  "function getFeedsByIdInWei(bytes21[] calldata _feedIds) external view returns (uint256[] memory _values, uint64 _timestamp)"
]);

const FASSET_ABI = parseAbi([
  "function fAsset() external view returns (address)"
]);

async function rpcCall(urlOrUrls: string | string[], method: string, params: any[] = []): Promise<any> {
  const urls = Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls];
  let lastError: any = null;

  for (const url of urls) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`RPC call failed with status ${response.status}`);
      }
      
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'RPC Error');
      }
      
      return data.result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
    }
  }

  throw lastError || new Error("All RPC endpoints failed");
}

function hexToDecimal(hex: string): string {
  if (!hex || hex === '0x') return '0';
  return BigInt(hex).toString();
}

function formatAmount(wei: string | bigint, decimals: number = 18): string {
  try {
    return formatUnits(BigInt(wei), decimals);
  } catch {
    return wei.toString();
  }
}

export const getFlareBalance = tool({
  description: "Get FLR or C2FLR balance for a wallet address on Flare Network",
  parameters: z.object({
    address: z.string().describe("The wallet address to check"),
    testnet: z.boolean().optional().describe("Set to true to check Coston2 testnet, false for Flare mainnet"),
  }),
  execute: async ({ address, testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      const explorerUrl = testnet ? FLARE_TESTNET_EXPLORER : FLARE_EXPLORER;
      
      const balanceHex = await rpcCall(rpcUrl, 'eth_getBalance', [address, 'latest']);
      const balanceWei = hexToDecimal(balanceHex);
      
      return {
        address,
        network,
        chainId: testnet ? FLARE_TESTNET_CHAIN_ID : FLARE_CHAIN_ID,
        balance: {
          wei: balanceWei,
          flr: formatAmount(balanceWei),
          formatted: `${formatAmount(balanceWei)} ${testnet ? 'C2FLR' : 'FLR'}`
        },
        explorerUrl: `${explorerUrl}/address/${address}`,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("Error in getFlareBalance:", error);
      return { error: "Failed to get balance", details: error.message };
    }
  },
});

export const getFlareBlockInfo = tool({
  description: "Get block info (latest or specific) on Flare Network",
  parameters: z.object({
    blockNumber: z.string().optional().describe("Block number in hex or decimal, or 'latest'. Defaults to 'latest'"),
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet"),
  }),
  execute: async ({ blockNumber = 'latest', testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      const explorerUrl = testnet ? FLARE_TESTNET_EXPLORER : FLARE_EXPLORER;
      
      let blockParam = blockNumber;
      if (blockNumber !== 'latest' && !blockNumber.startsWith('0x')) {
        blockParam = '0x' + BigInt(blockNumber).toString(16);
      }
      
      const block = await rpcCall(rpcUrl, 'eth_getBlockByNumber', [blockParam, false]);
      
      if (!block) {
        return { error: "Block not found" };
      }
      
      const decimalBlockNumber = hexToDecimal(block.number);
      
      return {
        network,
        blockNumber: decimalBlockNumber,
        blockHash: block.hash,
        timestamp: parseInt(block.timestamp, 16),
        gasUsed: hexToDecimal(block.gasUsed),
        gasLimit: hexToDecimal(block.gasLimit),
        transactionCount: block.transactions?.length || 0,
        explorerUrl: `${explorerUrl}/block/${decimalBlockNumber}`
      };
    } catch (error: any) {
      console.error("Error in getFlareBlockInfo:", error);
      return { error: "Failed to get block info", details: error.message };
    }
  },
});

export const getFlareTransaction = tool({
  description: "Get transaction information by hash on Flare Network",
  parameters: z.object({
    txHash: z.string().describe("Transaction hash"),
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet"),
  }),
  execute: async ({ txHash, testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      const explorerUrl = testnet ? FLARE_TESTNET_EXPLORER : FLARE_EXPLORER;
      
      const [tx, receipt] = await Promise.all([
        rpcCall(rpcUrl, 'eth_getTransactionByHash', [txHash]),
        rpcCall(rpcUrl, 'eth_getTransactionReceipt', [txHash])
      ]);
      
      if (!tx) {
        return { error: "Transaction not found" };
      }
      
      const valueWei = hexToDecimal(tx.value);
      const gasPriceWei = tx.gasPrice ? hexToDecimal(tx.gasPrice) : "0";
      const gasUsedWei = receipt ? hexToDecimal(receipt.gasUsed) : "0";
      const txFeeWei = (BigInt(gasUsedWei) * BigInt(gasPriceWei)).toString();
      
      return {
        network,
        hash: tx.hash,
        status: receipt ? (receipt.status === '0x1' ? 'success' : 'failed') : 'pending',
        blockNumber: tx.blockNumber ? hexToDecimal(tx.blockNumber) : null,
        from: tx.from,
        to: tx.to,
        value: {
          wei: valueWei,
          flr: formatAmount(valueWei),
          formatted: `${formatAmount(valueWei)} ${testnet ? 'C2FLR' : 'FLR'}`
        },
        gasPrice: {
          wei: gasPriceWei,
          gwei: formatAmount(gasPriceWei, 9)
        },
        gasUsed: gasUsedWei,
        txFee: {
          wei: txFeeWei,
          flr: formatAmount(txFeeWei)
        },
        explorerUrl: `${explorerUrl}/tx/${txHash}`
      };
    } catch (error: any) {
      console.error("Error in getFlareTransaction:", error);
      return { error: "Failed to get transaction", details: error.message };
    }
  },
});

export const getFlareTokenBalance = tool({
  description: "Get ERC-20 token balance for a wallet on Flare Network",
  parameters: z.object({
    walletAddress: z.string().describe("Wallet address"),
    tokenAddress: z.string().describe("ERC-20 token contract address"),
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet"),
  }),
  execute: async ({ walletAddress, tokenAddress, testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      const explorerUrl = testnet ? FLARE_TESTNET_EXPLORER : FLARE_EXPLORER;
      
      // ABI encoded balanceOf(address)
      const paddedAddress = walletAddress.toLowerCase().replace('0x', '').padStart(64, '0');
      const data = '0x70a08231' + paddedAddress;
      
      const balanceHex = await rpcCall(rpcUrl, 'eth_call', [{
        to: tokenAddress,
        data: data
      }, 'latest']);
      
      const balanceRaw = hexToDecimal(balanceHex);
      
      // Try to get decimals to format, fallback to 18
      let decimals = 18;
      try {
        const decimalsHex = await rpcCall(rpcUrl, 'eth_call', [{
          to: tokenAddress,
          data: '0x313ce567' // decimals()
        }, 'latest']);
        if (decimalsHex && decimalsHex !== '0x') {
          decimals = parseInt(decimalsHex, 16);
        }
      } catch (e) {
        // Fallback to 18
      }
      
      return {
        network,
        wallet: walletAddress,
        token: tokenAddress,
        balance: {
          raw: balanceRaw,
          decimals: decimals,
          formatted: formatAmount(balanceRaw, decimals)
        },
        explorerUrl: `${explorerUrl}/token/${tokenAddress}?a=${walletAddress}`
      };
    } catch (error: any) {
      console.error("Error in getFlareTokenBalance:", error);
      return { error: "Failed to get token balance", details: error.message };
    }
  },
});

export const getFlareGasPrice = tool({
  description: "Get current gas price and estimated costs on Flare Network",
  parameters: z.object({
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet"),
  }),
  execute: async ({ testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      
      const gasPriceHex = await rpcCall(rpcUrl, 'eth_gasPrice', []);
      const gasPriceWei = BigInt(gasPriceHex || '0');
      
      const simpleTransferGas = 21000n;
      const tokenTransferGas = 65000n;
      const swapGas = 150000n;
      
      return {
        network,
        gasPrice: {
          wei: gasPriceWei.toString(),
          gwei: formatAmount(gasPriceWei.toString(), 9),
          formatted: `${formatAmount(gasPriceWei.toString(), 9)} Gwei`
        },
        estimatedCosts: {
          simpleTransfer: {
            gasLimit: simpleTransferGas.toString(),
            costFLR: formatAmount((gasPriceWei * simpleTransferGas).toString())
          },
          tokenTransfer: {
            gasLimit: tokenTransferGas.toString(),
            costFLR: formatAmount((gasPriceWei * tokenTransferGas).toString())
          },
          swap: {
            gasLimit: swapGas.toString(),
            costFLR: formatAmount((gasPriceWei * swapGas).toString())
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("Error in getFlareGasPrice:", error);
      return { error: "Failed to get gas price", details: error.message };
    }
  },
});

export const getFlareNetworkStats = tool({
  description: "Get network overview for Flare or Coston2",
  parameters: z.object({
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet"),
  }),
  execute: async ({ testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      
      const [block, gasPriceHex] = await Promise.all([
        rpcCall(rpcUrl, 'eth_getBlockByNumber', ['latest', false]),
        rpcCall(rpcUrl, 'eth_gasPrice', [])
      ]);
      
      return {
        network,
        chainId: testnet ? FLARE_TESTNET_CHAIN_ID : FLARE_CHAIN_ID,
        latestBlock: hexToDecimal(block.number),
        blockTimestamp: new Date(parseInt(block.timestamp, 16) * 1000).toISOString(),
        gasPrice: formatAmount(hexToDecimal(gasPriceHex), 9) + ' Gwei',
        rpcUrl,
        explorerUrl: testnet ? FLARE_TESTNET_EXPLORER : FLARE_EXPLORER
      };
    } catch (error: any) {
      console.error("Error in getFlareNetworkStats:", error);
      return { error: "Failed to get network stats", details: error.message };
    }
  },
});

async function resolveContractName(rpcUrl: string | string[], name: string): Promise<`0x${string}`> {
  const data = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: 'getContractAddressByName',
    args: [name]
  });
  
  const result = await rpcCall(rpcUrl, 'eth_call', [{
    to: FLARE_CONTRACT_REGISTRY,
    data: data
  }, 'latest']);
  
  if (!result || result === '0x') {
    throw new Error(`Contract ${name} not found in registry`);
  }
  
  const address = decodeFunctionResult({
    abi: REGISTRY_ABI,
    functionName: 'getContractAddressByName',
    data: result as `0x${string}`
  }) as `0x${string}`;
  
  return address;
}

export const getFlareFtsoPrice = tool({
  description: "Query FTSO v2 price feed on Flare Network (enshrined, consensus-verified oracle). Provide accurate external asset prices trustlessly.",
  parameters: z.object({
    feedName: z.string().describe("Price feed name (e.g. 'FLR/USD', 'BTC/USD', 'ETH/USD', 'XRP/USD')"),
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet, false for Flare Mainnet (default false)"),
  }),
  execute: async ({ feedName, testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      
      let feedId = FTSO_FEED_IDS[feedName.toUpperCase()];
      
      if (!feedId) {
        if (feedName.length > 20) throw new Error("Feed name too long");
        const hexName = Buffer.from(feedName).toString('hex');
        feedId = `0x01${hexName.padEnd(40, '0')}` as `0x${string}`;
      }
      
      const contractName = testnet ? 'TestFtsoV2' : 'FtsoV2';
      let ftsoAddress = await resolveContractName(rpcUrl, contractName).catch(async () => {
        return resolveContractName(FLARE_MAINNET_RPC, 'FtsoV2');
      });
      
      const data = encodeFunctionData({
        abi: FTSO_V2_ABI,
        functionName: 'getFeedById',
        args: [feedId as `0x${string}`]
      });
      
      let result = await rpcCall(rpcUrl, 'eth_call', [{
        to: ftsoAddress,
        data: data
      }, 'latest']).catch(() => null);
      
      if (!result || result === '0x') {
        // Fallback to Mainnet if testnet returned empty
        const mainnetFtso = await resolveContractName(FLARE_MAINNET_RPC, 'FtsoV2');
        result = await rpcCall(FLARE_MAINNET_RPC, 'eth_call', [{
          to: mainnetFtso,
          data: data
        }, 'latest']);
      }
      
      if (!result || result === '0x') {
        throw new Error(`Feed ${feedName} is not currently active on FTSO`);
      }
      
      const [value, decimals, timestamp] = decodeFunctionResult({
        abi: FTSO_V2_ABI,
        functionName: 'getFeedById',
        data: result as `0x${string}`
      }) as [bigint, number, bigint];
      
      const formattedPrice = Number(formatUnits(value, Number(decimals))).toFixed(Math.max(2, Number(decimals) - 2));
      
      return {
        feedName: feedName.toUpperCase(),
        feedId,
        price: {
          rawValue: value.toString(),
          decimals: Number(decimals),
          formatted: `$${formattedPrice}`
        },
        lastUpdated: new Date(Number(timestamp) * 1000).toISOString(),
        source: 'Flare FTSO v2 Enshrined Oracle',
        network
      };
    } catch (error: any) {
      console.error("Error in getFlareFtsoPrice:", error);
      return { error: "Failed to get FTSO price", details: error.message };
    }
  },
});

export const getFlareFtsoMultiPrices = tool({
  description: "Query multiple FTSO v2 feeds at once on Flare Network (e.g. FLR, BTC, ETH, XRP)",
  parameters: z.object({
    feedNames: z.array(z.string()).describe("Array of feed names (e.g. ['FLR/USD', 'BTC/USD', 'ETH/USD', 'XRP/USD'])"),
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet, false for Flare Mainnet (default false)"),
  }),
  execute: async ({ feedNames, testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      
      const feedIds = feedNames.map(name => {
        const id = FTSO_FEED_IDS[name.toUpperCase()];
        if (id) return id;
        const hexName = Buffer.from(name).toString('hex');
        return `0x01${hexName.padEnd(40, '0')}` as `0x${string}`;
      });
      
      const contractName = testnet ? 'TestFtsoV2' : 'FtsoV2';
      let ftsoAddress = await resolveContractName(rpcUrl, contractName).catch(async () => {
        return resolveContractName(FLARE_MAINNET_RPC, 'FtsoV2');
      });
      
      const results = [];
      for (let i = 0; i < feedIds.length; i++) {
        try {
          const data = encodeFunctionData({
            abi: FTSO_V2_ABI,
            functionName: 'getFeedById',
            args: [feedIds[i]]
          });
          
          let result = await rpcCall(rpcUrl, 'eth_call', [{
            to: ftsoAddress,
            data: data
          }, 'latest']).catch(() => null);
          
          if (!result || result === '0x') {
            const mainnetFtso = await resolveContractName(FLARE_MAINNET_RPC, 'FtsoV2');
            result = await rpcCall(FLARE_MAINNET_RPC, 'eth_call', [{
              to: mainnetFtso,
              data: data
            }, 'latest']).catch(() => null);
          }
          
          if (result && result !== '0x') {
            const [value, decimals, timestamp] = decodeFunctionResult({
              abi: FTSO_V2_ABI,
              functionName: 'getFeedById',
              data: result as `0x${string}`
            }) as [bigint, number, bigint];
            
            const formattedPrice = Number(formatUnits(value, Number(decimals))).toFixed(Math.max(2, Number(decimals) - 2));
            
            results.push({
              feedName: feedNames[i].toUpperCase(),
              formatted: `$${formattedPrice}`,
              lastUpdated: new Date(Number(timestamp) * 1000).toISOString()
            });
          }
        } catch (feedErr: any) {
          console.warn(`Could not resolve feed ${feedNames[i]}:`, feedErr.message);
        }
      }
      
      return {
        prices: results,
        source: 'Flare FTSO v2 Enshrined Oracle',
        network: 'Flare',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("Error in getFlareFtsoMultiPrices:", error);
      return { error: "Failed to get multi FTSO prices", details: error.message };
    }
  },
});

export const getFlareFxrpInfo = tool({
  description: "Get information about FXRP (Flare-wrapped XRP) and the FAssets system",
  parameters: z.object({
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet"),
  }),
  execute: async ({ testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      
      let assetManagerAddress = "Unknown";
      let fxrpTokenAddress = "Unknown";
      let totalSupply = "Unknown";
      
      try {
        assetManagerAddress = await resolveContractName(rpcUrl, 'AssetManagerFXRP');
        
        const data = encodeFunctionData({
          abi: FASSET_ABI,
          functionName: 'fAsset',
          args: []
        });
        
        const result = await rpcCall(rpcUrl, 'eth_call', [{
          to: assetManagerAddress as `0x${string}`,
          data: data
        }, 'latest']);
        
        if (result && result !== '0x') {
          fxrpTokenAddress = decodeFunctionResult({
            abi: FASSET_ABI,
            functionName: 'fAsset',
            data: result as `0x${string}`
          }) as string;
          
          // Get total supply
          const tsData = '0x18160ddd'; 
          const tsResult = await rpcCall(rpcUrl, 'eth_call', [{
            to: fxrpTokenAddress as `0x${string}`,
            data: tsData
          }, 'latest']);
          
          if (tsResult && tsResult !== '0x') {
            totalSupply = formatAmount(hexToDecimal(tsResult), 6);
          }
        }
      } catch (e) {
        console.log("Could not fully resolve FXRP data", e);
      }
      
      return {
        network,
        assetManagerAddress,
        fxrpTokenAddress,
        totalSupply,
        description: "FAssets allow non-smart contract tokens (like XRP, BTC, DOGE) to be used trustlessly on Flare.",
        collateralizationInfo: "FAssets are over-collateralized by a combination of underlying assets and FLR/stablecoins provided by agents and the community.",
        moreInfo: "https://flare.network/fassets/"
      };
    } catch (error: any) {
      console.error("Error in getFlareFxrpInfo:", error);
      return { error: "Failed to get FXRP info", details: error.message };
    }
  },
});

export const getFlareFdcInfo = tool({
  description: "Information about the Flare Data Connector (FDC)",
  parameters: z.object({
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet"),
  }),
  execute: async ({ testnet = false }) => {
    try {
      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? 'Coston2' : 'Flare';
      
      let fdcHubAddress = "Unknown";
      try {
        fdcHubAddress = await resolveContractName(rpcUrl, 'FdcHub');
      } catch (e) {
        console.log("Could not resolve FdcHub", e);
      }
      
      return {
        network,
        fdcHubAddress,
        description: "Flare Data Connector (FDC) allows state from any external chain or Web2 API to be brought into Flare smart contracts securely via decentralized consensus.",
        supportedAttestationTypes: [
          "Payment (verify a transaction occurred on Bitcoin/XRP/Doge)",
          "AddressValidity (verify an address format is correct on another chain)",
          "BalanceDecreasingTransaction (verify someone spent tokens)",
          "EVMTransaction (verify an EVM tx happened)",
          "Web2Json (verify arbitrary Web2 API data)"
        ],
        howToUse: "Developers submit attestation requests to FdcHub, which data providers verify. Once consensus is reached, the Merkle root of all valid attestations is published to the state connector.",
        moreInfo: "https://docs.flare.network/tech/flare-data-connector/"
      };
    } catch (error: any) {
      console.error("Error in getFlareFdcInfo:", error);
      return { error: "Failed to get FDC info", details: error.message };
    }
  },
});

export const getFlarePortfolio = tool({
  description: "Get complete on-chain portfolio and token holdings for a wallet address on Flare Network (or Coston2 testnet). Calculates total USD value using live Flare FTSOv2 oracle prices.",
  parameters: z.object({
    address: z.string().describe("Wallet address (0x...)"),
    testnet: z.boolean().optional().describe("Set to true for Coston2 testnet, false for Flare Mainnet (default false)"),
  }),
  execute: async ({ address, testnet = false }) => {
    try {
      if (!address.startsWith("0x") || address.length !== 42) {
        return {
          error: "Invalid address format",
          details: "Address must be a valid Ethereum-style address (0x + 40 hex characters)",
        };
      }

      const rpcUrl = testnet ? FLARE_TESTNET_RPCS : FLARE_MAINNET_RPCS;
      const network = testnet ? "Coston2" : "Flare";
      const explorerUrl = testnet ? FLARE_TESTNET_EXPLORER : FLARE_EXPLORER;

      // 1. Fetch native FLR balance via RPC
      const balanceHex = await rpcCall(rpcUrl, "eth_getBalance", [address, "latest"]);
      const balanceWei = BigInt(balanceHex || "0x0");
      const flrAmount = Number(formatUnits(balanceWei, 18));

      // 2. Fetch live FLR/USD price from FTSOv2 to value native holdings
      let flrPriceUsd = 0.006;
      try {
        const ftsoAddress = await resolveContractName(FLARE_MAINNET_RPC, "FtsoV2");
        const feedData = encodeFunctionData({
          abi: FTSO_V2_ABI,
          functionName: "getFeedById",
          args: [FTSO_FEED_IDS["FLR/USD"]]
        });
        const feedResult = await rpcCall(FLARE_MAINNET_RPC, "eth_call", [{
          to: ftsoAddress,
          data: feedData
        }, "latest"]);

        if (feedResult && feedResult !== "0x") {
          const [v, dec] = decodeFunctionResult({
            abi: FTSO_V2_ABI,
            functionName: "getFeedById",
            data: feedResult as `0x${string}`
          }) as [bigint, number, bigint];
          flrPriceUsd = Number(formatUnits(v, Number(dec)));
        }
      } catch (e) {
        console.warn("Could not fetch FTSO price for portfolio valuation:", e);
      }

      const nativeUsdValue = flrAmount * flrPriceUsd;
      let totalPortfolioUsd = nativeUsdValue;

      // 3. Discover ERC-20 token holdings via Flare Explorer API
      const tokenItems: Array<{
        symbol: string;
        name: string;
        contractAddress: string;
        balance: string;
        decimals: number;
        priceUsd: string;
        valueUsd: string;
        explorerUrl: string;
      }> = [];

      try {
        const v2Res = await fetch(`${explorerUrl}/api/v2/addresses/${address}/tokens?type=ERC-20`);
        if (v2Res.ok) {
          const v2Data = await v2Res.json();
          if (v2Data.items && Array.isArray(v2Data.items)) {
            for (const item of v2Data.items) {
              const t = item.token;
              const rawVal = BigInt(item.value || "0");
              const decimals = parseInt(t.decimals || "18", 10);
              const formattedAmount = Number(formatUnits(rawVal, decimals));
              let tokenPriceUsd = 0;
              if (t.exchange_rate) {
                tokenPriceUsd = parseFloat(t.exchange_rate);
              } else if (t.symbol === "WFLR") {
                tokenPriceUsd = flrPriceUsd;
              }

              const tokenUsdVal = formattedAmount * tokenPriceUsd;
              if (tokenPriceUsd > 0) {
                totalPortfolioUsd += tokenUsdVal;
              }

              tokenItems.push({
                symbol: t.symbol || "UNKNOWN",
                name: t.name || "Unknown Token",
                contractAddress: t.address_hash,
                balance: formattedAmount.toFixed(4),
                decimals,
                priceUsd: tokenPriceUsd > 0 ? `$${tokenPriceUsd.toFixed(4)}` : "N/A",
                valueUsd: tokenPriceUsd > 0 ? `$${tokenUsdVal.toFixed(2)}` : "N/A",
                explorerUrl: `${explorerUrl}/token/${t.address_hash}?a=${address}`
              });
            }
          }
        }
      } catch (tokenErr: any) {
        console.warn("Explorer token list fetch error:", tokenErr.message);
      }

      return {
        address,
        network,
        totalUsdValue: `$${totalPortfolioUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        nativeAsset: {
          symbol: testnet ? "C2FLR" : "FLR",
          balance: flrAmount.toLocaleString("en-US", { maximumFractionDigits: 4 }),
          priceUsd: `$${flrPriceUsd.toFixed(6)}`,
          valueUsd: `$${nativeUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          priceSource: "Flare FTSO v2 Enshrined Oracle",
          explorerUrl: `${explorerUrl}/address/${address}`
        },
        tokens: tokenItems,
        tokenCount: tokenItems.length,
        explorerUrl: `${explorerUrl}/address/${address}`,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("Error in getFlarePortfolio:", error);
      return { error: "Failed to get Flare portfolio", details: error.message };
    }
  },
});

