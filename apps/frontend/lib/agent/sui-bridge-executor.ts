import { encodeFunctionData, parseEther, parseUnits, parseAbi, type Hex } from "viem";
import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { getDelegationCredentials, recordAgentTransaction } from "./agent-wallet-store";
import { signTransactionForUser } from "./dynamic-agent-wallet";

export type SuiBridgeDirection = "ethereum-to-sui" | "sui-to-ethereum";
export type SuiBridgeEthereumChain = "mainnet" | "sepolia";
export type SuiBridgeAsset = "ETH" | "USDC" | "USDT" | "WETH" | string;

const SUI_DESTINATION_CHAIN_ID = Number(process.env.SUI_BRIDGE_DESTINATION_CHAIN_ID || "0");

const SUI_BRIDGE_ABI = [
  {
    type: "function",
    name: "bridgeETH",
    stateMutability: "payable",
    inputs: [
      { name: "recipientAddress", type: "bytes" },
      { name: "destinationChainID", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "bridgeERC20",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenID", type: "uint8" },
      { name: "amount", type: "uint256" },
      { name: "recipientAddress", type: "bytes" },
      { name: "destinationChainID", type: "uint8" },
    ],
    outputs: [],
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const ERC20_READ_ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

const SUI_BRIDGE_READ_ABI = parseAbi([
  "function committee() view returns (address)",
]);

const BRIDGE_COMMITTEE_READ_ABI = parseAbi([
  "function config() view returns (address)",
]);

const BRIDGE_CONFIG_READ_ABI = parseAbi([
  "function tokenAddressOf(uint8 tokenID) view returns (address)",
  "function isTokenSupported(uint8 tokenID) view returns (bool)",
]);

const DEFAULT_TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  USDC: 6,
  USDT: 6,
};

function getBridgeContract(chain: SuiBridgeEthereumChain): Hex | undefined {
  const value = chain === "mainnet"
    ? process.env.SUI_BRIDGE_ETHEREUM_CONTRACT_MAINNET
    : process.env.SUI_BRIDGE_ETHEREUM_CONTRACT_SEPOLIA;
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value as Hex : undefined;
}

function getErc20Address(asset: string, chain: SuiBridgeEthereumChain): Hex | undefined {
  const key = `SUI_BRIDGE_${asset.toUpperCase()}_${chain.toUpperCase()}_TOKEN_ADDRESS`;
  const value = process.env[key];
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value as Hex : undefined;
}

function getTokenId(asset: string): number | undefined {
  const value = process.env[`SUI_BRIDGE_${asset.toUpperCase()}_TOKEN_ID`];
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255 ? parsed : undefined;
}

function getEthereumRpc(chain: SuiBridgeEthereumChain) {
  return chain === "mainnet"
    ? process.env.ETHEREUM_RPC_URL || process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL
    : process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
}

function normalizeSuiAddressBytes(address: string): Hex {
  if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
    throw new Error("suiRecipient must be a 0x-prefixed 32-byte Sui address");
  }
  return address.toLowerCase() as Hex;
}

async function getBridgeConfigTokenAddress(publicClient: any, bridgeContract: Hex, tokenId: number): Promise<Hex> {
  const committee = await publicClient.readContract({
    address: bridgeContract,
    abi: SUI_BRIDGE_READ_ABI,
    functionName: "committee",
  }) as Hex;
  const config = await publicClient.readContract({
    address: committee,
    abi: BRIDGE_COMMITTEE_READ_ABI,
    functionName: "config",
  }) as Hex;
  const supported = await publicClient.readContract({
    address: config,
    abi: BRIDGE_CONFIG_READ_ABI,
    functionName: "isTokenSupported",
    args: [tokenId],
  }) as boolean;
  if (!supported) throw new Error(`Sui Bridge token id ${tokenId} is not supported by the live bridge config.`);
  return await publicClient.readContract({
    address: config,
    abi: BRIDGE_CONFIG_READ_ABI,
    functionName: "tokenAddressOf",
    args: [tokenId],
  }) as Hex;
}

export function normalizeBridgeDirection(input: string): SuiBridgeDirection {
  const clean = input.toLowerCase().replace(/_/g, "-");
  if (["eth-to-sui", "ethereum-to-sui", "evm-to-sui"].includes(clean)) return "ethereum-to-sui";
  if (["sui-to-eth", "sui-to-ethereum", "sui-to-evm"].includes(clean)) return "sui-to-ethereum";
  throw new Error("Unsupported bridge direction. Use ethereum-to-sui or sui-to-ethereum.");
}

export function buildSuiBridgeEthPrep(params: {
  asset: SuiBridgeAsset;
  amount: string;
  suiRecipient: string;
  ethereumChain?: SuiBridgeEthereumChain;
}) {
  const chain = params.ethereumChain || "sepolia";
  const asset = params.asset.toUpperCase();
  const recipientBytes = normalizeSuiAddressBytes(params.suiRecipient);
  const bridge = getBridgeContract(chain);
  const destinationChainID = SUI_DESTINATION_CHAIN_ID;
  const blockers: string[] = [];
  const calldataPlan: string[] = [];

  if (!bridge) blockers.push(`Set official SuiBridge contract env SUI_BRIDGE_ETHEREUM_CONTRACT_${chain.toUpperCase()} before execution.`);
  if (!destinationChainID) blockers.push("Set SUI_BRIDGE_DESTINATION_CHAIN_ID from official bridge docs/config before execution.");

  if (asset === "ETH") {
    const value = parseEther(params.amount);
    const data = destinationChainID
      ? encodeFunctionData({ abi: SUI_BRIDGE_ABI, functionName: "bridgeETH", args: [recipientBytes, destinationChainID] })
      : undefined;
    calldataPlan.push("Call SuiBridge.bridgeETH(bytes recipientAddress, uint8 destinationChainID) with msg.value = amount.");
    return {
      direction: "ethereum-to-sui" as const,
      asset,
      amount: params.amount,
      ethereumChain: chain,
      suiRecipient: params.suiRecipient,
      bridgeContract: bridge || null,
      tokenAddress: null,
      tokenId: null,
      destinationChainID: destinationChainID || null,
      valueWei: value.toString(),
      data: data || null,
      calldataPlan,
      blockers,
      executionReady: blockers.length === 0,
    };
  }

  const tokenAddress = getErc20Address(asset, chain);
  const tokenId = getTokenId(asset);
  const decimals = Number(process.env[`SUI_BRIDGE_${asset}_DECIMALS`] || DEFAULT_TOKEN_DECIMALS[asset] || 18);
  const amountRaw = parseUnits(params.amount, decimals);
  if (!tokenAddress) blockers.push(`Set official ERC20 token address env SUI_BRIDGE_${asset}_${chain.toUpperCase()}_TOKEN_ADDRESS.`);
  if (tokenId === undefined) blockers.push(`Set official bridge token id env SUI_BRIDGE_${asset}_TOKEN_ID.`);
  calldataPlan.push("First approve SuiBridge to spend ERC20 amount.");
  calldataPlan.push("Then call SuiBridge.bridgeERC20(uint8 tokenID, uint256 amount, bytes recipientAddress, uint8 destinationChainID).");

  return {
    direction: "ethereum-to-sui" as const,
    asset,
    amount: params.amount,
    ethereumChain: chain,
    suiRecipient: params.suiRecipient,
    bridgeContract: bridge || null,
    tokenAddress: tokenAddress || null,
    tokenId: tokenId ?? null,
    tokenDecimals: decimals,
    destinationChainID: destinationChainID || null,
    amountRaw: amountRaw.toString(),
    approveData: bridge ? encodeFunctionData({ abi: ERC20_APPROVE_ABI, functionName: "approve", args: [bridge, amountRaw] }) : null,
    bridgeData: tokenId !== undefined && destinationChainID
      ? encodeFunctionData({ abi: SUI_BRIDGE_ABI, functionName: "bridgeERC20", args: [tokenId, amountRaw, recipientBytes, destinationChainID] })
      : null,
    calldataPlan,
    blockers,
    executionReady: blockers.length === 0,
  };
}

export async function executeSuiBridgeEthDeposit(params: {
  userId: string;
  asset: SuiBridgeAsset;
  amount: string;
  suiRecipient: string;
  ethereumChain?: SuiBridgeEthereumChain;
  dryRun?: boolean;
}) {
  const prep = buildSuiBridgeEthPrep(params);
  if (params.dryRun || !prep.executionReady) return { success: false, dryRun: true, prep };
  if (prep.ethereumChain === "mainnet" && process.env.SUI_BRIDGE_ENABLE_MAINNET_WRITES !== "true") {
    return { success: false, dryRun: true, prep, error: "Mainnet bridge writes disabled. Set SUI_BRIDGE_ENABLE_MAINNET_WRITES=true after risk controls are ready." };
  }

  const credentials = await getDelegationCredentials(params.userId, "evm");
  if (!credentials || credentials.revokedAt) throw new Error("EVM agent automation is not enabled for bridge execution.");

  const rpcUrl = getEthereumRpc(prep.ethereumChain);
  if (!rpcUrl) throw new Error(`Missing ${prep.ethereumChain} Ethereum RPC URL for bridge execution.`);

  const publicClient = createPublicClient({ chain: prep.ethereumChain === "mainnet" ? mainnet : sepolia, transport: http(rpcUrl) });
  const nonce = await publicClient.getTransactionCount({ address: credentials.walletAddress as Hex, blockTag: "pending" });

  if (prep.asset !== "ETH") {
    if (!prep.bridgeContract || !prep.tokenAddress || !prep.amountRaw || !prep.approveData || !prep.bridgeData) {
      return { success: false, dryRun: true, prep, error: "ERC20 bridge transaction is missing required calldata/token/contract after preparation." };
    }

    const liveTokenAddress = await getBridgeConfigTokenAddress(publicClient, prep.bridgeContract as Hex, prep.tokenId as number);
    const effectiveTokenAddress = liveTokenAddress.toLowerCase() as Hex;
    const configuredTokenAddress = (prep.tokenAddress as string).toLowerCase();
    const amountRaw = BigInt(prep.amountRaw);

    if (configuredTokenAddress !== effectiveTokenAddress) {
      console.warn(
        `[sui-bridge] SUI_BRIDGE_${prep.asset}_${prep.ethereumChain.toUpperCase()}_TOKEN_ADDRESS=${prep.tokenAddress} does not match live bridge tokenAddressOf(${prep.tokenId})=${liveTokenAddress}; using live bridge token for approval.`,
      );
    }

    const tokenBalance = await publicClient.readContract({
      address: effectiveTokenAddress,
      abi: ERC20_READ_ABI,
      functionName: "balanceOf",
      args: [credentials.walletAddress as Hex],
    }) as bigint;
    if (tokenBalance < amountRaw) {
      return {
        success: false,
        dryRun: true,
        prep: { ...prep, tokenAddress: effectiveTokenAddress },
        error: `Insufficient ${prep.asset} balance on ${prep.ethereumChain}. Need ${prep.amountRaw} raw units, wallet has ${tokenBalance.toString()} raw units for the Sui Bridge token ${effectiveTokenAddress}.`,
      };
    }

    const allowanceBefore = await publicClient.readContract({
      address: effectiveTokenAddress,
      abi: ERC20_READ_ABI,
      functionName: "allowance",
      args: [credentials.walletAddress as Hex, prep.bridgeContract as Hex],
    }) as bigint;

    let approveHash: Hex | null = null;
    let nextNonce = nonce;
    if (allowanceBefore < amountRaw) {
      const approveRequest = await (publicClient as any).prepareTransactionRequest({
        account: credentials.walletAddress as Hex,
        to: effectiveTokenAddress,
        data: prep.approveData as Hex,
        nonce: nextNonce,
      });
      const signedApprove = await signTransactionForUser(credentials, approveRequest as any);
      approveHash = await publicClient.sendRawTransaction({ serializedTransaction: signedApprove as Hex });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 });
      if (approveReceipt.status !== "success") {
        return {
          success: false,
          dryRun: true,
          prep: { ...prep, tokenAddress: effectiveTokenAddress },
          approveHash,
          approveExplorerUrl: prep.ethereumChain === "mainnet" ? `https://etherscan.io/tx/${approveHash}` : `https://sepolia.etherscan.io/tx/${approveHash}`,
          error: "ERC20 approval transaction failed; bridge transaction was not submitted.",
        };
      }
      nextNonce += 1;
    }

    const allowanceAfter = await publicClient.readContract({
      address: effectiveTokenAddress,
      abi: ERC20_READ_ABI,
      functionName: "allowance",
      args: [credentials.walletAddress as Hex, prep.bridgeContract as Hex],
    }) as bigint;
    if (allowanceAfter < amountRaw) {
      return {
        success: false,
        dryRun: true,
        prep: { ...prep, tokenAddress: effectiveTokenAddress },
        approveHash,
        approveExplorerUrl: approveHash ? (prep.ethereumChain === "mainnet" ? `https://etherscan.io/tx/${approveHash}` : `https://sepolia.etherscan.io/tx/${approveHash}`) : undefined,
        error: `ERC20 allowance is still insufficient after approval. Need ${amountRaw.toString()} raw units, allowance is ${allowanceAfter.toString()} raw units for bridge ${prep.bridgeContract}.`,
      };
    }

    const bridgeRequest = await (publicClient as any).prepareTransactionRequest({
      account: credentials.walletAddress as Hex,
      to: prep.bridgeContract as Hex,
      data: prep.bridgeData as Hex,
      nonce: nextNonce,
    });
    const signedBridge = await signTransactionForUser(credentials, bridgeRequest as any);
    const bridgeHash = await publicClient.sendRawTransaction({ serializedTransaction: signedBridge as Hex });

    await recordAgentTransaction({
      userId: params.userId,
      walletAddress: credentials.walletAddress,
      operationType: "sui_bridge_erc20_deposit",
      amount: params.amount,
      signature: bridgeHash,
      metadata: {
        chain: "evm",
        bridge: "sui-native-bridge",
        ethereumChain: prep.ethereumChain,
        asset: prep.asset,
        tokenAddress: effectiveTokenAddress,
        tokenId: prep.tokenId,
        suiRecipient: params.suiRecipient,
        approveHash,
      },
    });

    return {
      success: true,
      dryRun: false,
      transactionHash: bridgeHash,
      approveHash,
      prep: { ...prep, tokenAddress: effectiveTokenAddress },
      explorerUrl: prep.ethereumChain === "mainnet" ? `https://etherscan.io/tx/${bridgeHash}` : `https://sepolia.etherscan.io/tx/${bridgeHash}`,
      approveExplorerUrl: approveHash ? (prep.ethereumChain === "mainnet" ? `https://etherscan.io/tx/${approveHash}` : `https://sepolia.etherscan.io/tx/${approveHash}`) : null,
    };
  }

  if (!prep.valueWei || !prep.data || !prep.bridgeContract) {
    return { success: false, dryRun: true, prep, error: "Bridge ETH transaction is missing required calldata/value/contract after preparation." };
  }

  const request = await (publicClient as any).prepareTransactionRequest({
    account: credentials.walletAddress as Hex,
    to: prep.bridgeContract as Hex,
    value: BigInt(prep.valueWei as string),
    data: prep.data as Hex,
    nonce,
  });
  const signed = await signTransactionForUser(credentials, request as any);
  const hash = await publicClient.sendRawTransaction({ serializedTransaction: signed as Hex });

  await recordAgentTransaction({
    userId: params.userId,
    walletAddress: credentials.walletAddress,
    operationType: "sui_bridge_eth_deposit",
    amount: params.amount,
    signature: hash,
    metadata: {
      chain: "evm",
      bridge: "sui-native-bridge",
      ethereumChain: prep.ethereumChain,
      asset: prep.asset,
      suiRecipient: params.suiRecipient,
    },
  });

  return {
    success: true,
    dryRun: false,
    transactionHash: hash,
    prep,
    explorerUrl: prep.ethereumChain === "mainnet" ? `https://etherscan.io/tx/${hash}` : `https://sepolia.etherscan.io/tx/${hash}`,
  };
}
