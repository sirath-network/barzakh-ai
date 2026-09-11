import { dreamDexApi, matchesMarketInterval } from "@barzakh/shared/lib/ai/tools/dreamdex/api-client";
/**
 * DreamDEX Event Contracts Autonomous Agent Executor
 *
 * Executes binary prediction market trades (placeOrder, mintSet, cancel, redeem)
 * on Somnia Shannon testnet using the user's delegated embedded agent wallet.
 */

import {
  getAgentPrivateKey,
  getUserAgentWalletAddress,
  getUserDreamDexTransactions,
  hasDelegation,
  recordAgentTransaction,
} from "@/lib/agent/agent-wallet-store";
import {
  createPublicClient,
  createWalletClient,
  http,
  fallback,
  formatEther,
  formatUnits,
  parseEther,
  keccak256,
  maxUint256,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SOMNIA_TESTNET_CHAIN, SOMNIA_TESTNET_EXPLORER } from "@barzakh/shared/lib/ai/tools/dreamdex/sdk-client";

const TUSDC_TESTNET_ADDRESS = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E" as const;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
const SOMNIA_FAUCET_URL = "https://t.me/+XHq0F0JXMyhmMzM0";

const erc20Abi = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const binaryPoolAbi = [
  {
    name: "placeBinaryOrder",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "kind", type: "uint8" },
      { name: "price", type: "uint256" },
      { name: "quantity", type: "uint256" },
      { name: "expireTimestampNs", type: "uint64" },
      { name: "orderType", type: "uint8" },
      { name: "selfMatchingOption", type: "uint8" },
      { name: "builder", type: "address" },
      { name: "builderFeeBpsTimes1k", type: "uint96" },
      { name: "userData", type: "uint64" },
    ],
    outputs: [
      { name: "success", type: "bool" },
      { name: "id", type: "uint128" },
    ],
  },
  {
    name: "mintSet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "yesTo", type: "address" },
      { name: "noTo", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "burnSet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelOrder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint128" }],
    outputs: [],
  },
  {
    name: "finalized",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "marketNonce",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    name: "marketExpiryNs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    name: "getBookLevels",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "isBid", type: "bool" },
      { name: "numLevels", type: "uint64" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "price", type: "uint256" },
          { name: "quantity", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "SelfMatchCancelTaker",
    type: "error",
    inputs: [],
  },
  {
    name: "SelfMatchCancelMaker",
    type: "error",
    inputs: [],
  },
  {
    name: "PostOnlyWouldCross",
    type: "error",
    inputs: [],
  },
  {
    name: "OrderExpired",
    type: "error",
    inputs: [],
  },
  {
    name: "MarketFinalized",
    type: "error",
    inputs: [],
  },
  {
    name: "InsufficientBalance",
    type: "error",
    inputs: [],
  },
  {
    name: "OrderAlreadyExpired",
    type: "error",
    inputs: [],
  },
  {
    name: "InvalidSpender",
    type: "error",
    inputs: [],
  },
] as const;

export interface DreamDexTradeExecutionParams {
  pool: string;
  marketSymbol?: string;
  side?: "buy_up" | "buy_down" | "sell_up" | "sell_down";
  priceInMillionths?: number;
  displayPrice?: number;
  quantity?: number;
  amount?: number;
  orderType?: "limit" | "ioc";
  action?: "mint" | "place_order" | "cancel" | "cancel_all" | "redeem";
  orderId?: string;
  testnet?: boolean;
}

export interface DreamDexTradeExecutionResult {
  success: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  orderId?: string;
  action?: string;
  marketSymbol?: string;
  poolAddress?: string;
  isRedeemAll?: boolean;
  message?: string;
  alreadyRedeemed?: boolean;
  redeemedCount?: number;
  totalPayout?: string;
}

// Concurrency mutex to prevent duplicate on-chain redemptions for the same user
const activeRedemptions = new Map<string, Promise<DreamDexTradeExecutionResult>>();

/**
 * Testnet Counterparty Liquidity Engine
 *
 * On Somnia Shannon testnet, prediction markets have no external market makers quoting
 * on the order book. When users place orders, the Counterparty Engine provides the opposing
 * maker order on-chain so the user's order crosses immediately as a taker.
 *
 * This ensures:
 * 1. 100% instant fill rate
 * 2. User immediately receives genuine ERC-6909 outcome tokens on-chain
 * 3. Zero unfilled resting orders left on the book
 * 4. Zero refunds upon market expiry — positions settle cleanly to WON or LOST
 */
const TESTNET_COUNTERPARTY_KEY =
  (process.env.DREAMDEX_TESTNET_LP_KEY as Hex) ||
  "0xc481e561ae9968d76eb55da73e2d161853737f3de739ce59b5ce06495196bfc5"; // keccak256("barzakh-dreamdex-testnet-counterparty-v1")
const counterpartyAccount = privateKeyToAccount(TESTNET_COUNTERPARTY_KEY);
const COUNTERPARTY_ADDRESS = counterpartyAccount.address;

async function ensureTestnetCounterpartyLiquidity({
  publicClient,
  userWalletClient,
  poolAddress,
  kind,
  priceInMillionths,
  quantityInUnits,
  marketExpiryNs,
}: {
  publicClient: any;
  userWalletClient: any;
  poolAddress: `0x${string}`;
  kind: number; // User's order kind: 0 = BUY_YES, 1 = SELL_YES, 2 = BUY_NO, 3 = SELL_NO
  priceInMillionths: bigint;
  quantityInUnits: bigint;
  marketExpiryNs: bigint;
}): Promise<void> {
  // If user buys NO (kind 2) or sells YES (kind 1), they cross BIDS (isBid = true)
  // If user buys YES (kind 0) or sells NO (kind 3), they cross ASKS (isBid = false)
  try {
    console.log(
      `[DreamDexExecutor] Ensuring counterparty maker liquidity for kind=${kind} via ${COUNTERPARTY_ADDRESS}...`
    );

    const cpTransport = fallback([
      http("https://dream-rpc.somnia.network", { timeout: 12000, retryCount: 2 }),
      http("https://api.infra.testnet.somnia.network", { timeout: 12000, retryCount: 2 }),
    ]);

    const cpWalletClient = createWalletClient({
      account: counterpartyAccount,
      chain: SOMNIA_TESTNET_CHAIN,
      transport: cpTransport,
    });

    // 1. Verify counterparty has gas (STT)
    const cpSttBalance = await publicClient
      .getBalance({ address: COUNTERPARTY_ADDRESS })
      .catch(() => 0n);
    if (cpSttBalance < parseEther("0.05")) {
      console.warn(`[DreamDexExecutor] Counterparty STT balance low: ${formatEther(cpSttBalance)}`);
    }

    // 2. Compute counterparty required collateral and opposing order kind
    // User kind 0 (BUY_YES) -> CP kind 2 (BUY_NO) at priceInMillionths
    // User kind 2 (BUY_NO)  -> CP kind 0 (BUY_YES) at priceInMillionths
    // User kind 1 (SELL_YES) -> CP kind 0 (BUY_YES) at priceInMillionths
    // User kind 3 (SELL_NO)  -> CP kind 2 (BUY_NO) at priceInMillionths
    const cpKind = kind === 0 ? 2 : kind === 2 ? 0 : kind === 1 ? 0 : 2;
    const cpRequiredCollateral =
      cpKind === 0
        ? (quantityInUnits * priceInMillionths) / 1_000_000n
        : (quantityInUnits * (1_000_000n - priceInMillionths)) / 1_000_000n;

    const cpUsdcBalance = await publicClient
      .readContract({
        address: TUSDC_TESTNET_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [COUNTERPARTY_ADDRESS],
      })
      .catch(() => 0n);

    if (cpUsdcBalance < cpRequiredCollateral) {
      console.warn(`[DreamDexExecutor] Counterparty tUSDC balance low: ${formatUnits(cpUsdcBalance, 6)} < ${formatUnits(cpRequiredCollateral, 6)}`);
    }

    // 3. Ensure counterparty has approved tUSDC on poolAddress
    const cpAllowance = await publicClient
      .readContract({
        address: TUSDC_TESTNET_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [COUNTERPARTY_ADDRESS, poolAddress],
      })
      .catch(() => 0n);

    if (cpAllowance < cpRequiredCollateral) {
      console.log(`[DreamDexExecutor] Approving tUSDC for counterparty on pool ${poolAddress}...`);
      const cpApproveNonce = await publicClient.getTransactionCount({
        address: COUNTERPARTY_ADDRESS,
        blockTag: "pending",
      });
      const approveTx = await cpWalletClient.writeContract({
        address: TUSDC_TESTNET_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [poolAddress, maxUint256],
        nonce: cpApproveNonce,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 15000, pollingInterval: 400 });
    }

    // 4. Counterparty places opposing maker order
    console.log(
      `[DreamDexExecutor] Counterparty placing maker order: kind=${cpKind}, price=${priceInMillionths}, qty=${quantityInUnits}`
    );
    const cpOrderNonce = await publicClient.getTransactionCount({
      address: COUNTERPARTY_ADDRESS,
      blockTag: "pending",
    });
    const cpOrderTx = await cpWalletClient.writeContract({
      address: poolAddress,
      abi: binaryPoolAbi,
      functionName: "placeBinaryOrder",
      args: [
        cpKind,
        priceInMillionths,
        quantityInUnits,
        marketExpiryNs,
        0, // Limit order (maker)
        1, // CancelMaker
        ZERO_ADDRESS,
        0n,
        0n,
      ],
      nonce: cpOrderNonce,
    });
    await publicClient.waitForTransactionReceipt({ hash: cpOrderTx, timeout: 15000, pollingInterval: 400 });
    console.log(`[DreamDexExecutor] Counterparty maker order confirmed on-chain: ${cpOrderTx}`);
  } catch (cpErr: any) {
    console.warn(`[DreamDexExecutor] Counterparty seeding notice:`, cpErr?.shortMessage || cpErr?.message || cpErr);
  }
}

export async function executeAgenticDreamDexTrade(
  userId: string,
  rawParams: any
): Promise<DreamDexTradeExecutionResult> {
  try {
    // 1. Fetch user's EVM agent private key
    const rawKey = await getAgentPrivateKey(userId, "evm");
    if (!rawKey) {
      const isDelegated = await hasDelegation(userId, "evm");
      if (!isDelegated) {
        return {
          success: false,
          error: "EVM Agent Automation is not enabled. Please enable Agent Automation in Settings → Wallet Settings.",
        };
      }
      return {
        success: false,
        error: "No EVM agent wallet found. Please create an agent wallet in Settings.",
      };
    }

    const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as Hex;
    const account = privateKeyToAccount(privateKey);
    const agentAddress = account.address;

    console.log(`[DreamDexExecutor] Executing trade for user ${userId} via agent wallet ${agentAddress}`);

    // 3. Setup Viem clients for Somnia Shannon Testnet
    const transport = fallback([
      http("https://dream-rpc.somnia.network", { timeout: 15000, retryCount: 2 }),
      http("https://api.infra.testnet.somnia.network", { timeout: 15000, retryCount: 2 }),
    ]);

    const publicClient = createPublicClient({
      chain: SOMNIA_TESTNET_CHAIN,
      transport,
      pollingInterval: 400,
    });

    const walletClient = createWalletClient({
      account,
      chain: SOMNIA_TESTNET_CHAIN,
      transport,
    });

    // 4. Pre-flight Balance Checks
    const params: DreamDexTradeExecutionParams = rawParams?.parameters || rawParams || {};
    const action = rawParams?.action || params.action || "place_order";
    let marketSymbol = rawParams?.marketSymbol || params.marketSymbol || "ETH-5m";
    let poolAddress = (rawParams?.pool || params.pool || rawParams?.poolAddress || "") as `0x${string}`;
    let executedMarketNonce: bigint | undefined;
    const requestedInterval = ["15m", "5m", "1m", "4h", "1h"].find((interval) => matchesMarketInterval(marketSymbol, interval));
    // Only validate pool against current rolling markets when PLACING a new order.
    // When closing an existing position or redeeming, the user holds tokens in that specific pool and it must never be wiped out!
    if (action === "place_order" && poolAddress && requestedInterval) {
      const exactMarket = await dreamDexApi.getEventContractMarkets().then((markets) => markets.find(
        (market) => market.poolAddress.toLowerCase() === poolAddress.toLowerCase() && matchesMarketInterval(market.symbol, requestedInterval)
      ));
      if (!exactMarket) poolAddress = "" as `0x${string}`;
    }

    if (!poolAddress) {
      try {
        const liveMarket = await dreamDexApi.getMarketBySymbol(marketSymbol);
        if (liveMarket?.poolAddress) {
          poolAddress = liveMarket.poolAddress as `0x${string}`;
        }
      } catch (err) {
        console.warn("[DreamDexExecutor] Failed to resolve live pool:", err);
      }
    }
    if (!poolAddress) {
      try {
        const liveMarkets = await dreamDexApi.getEventContractMarkets();
        const found = liveMarkets.find(
          (m) =>
            m.symbol?.toLowerCase() === marketSymbol.toLowerCase() ||
            m.shortSymbol?.toLowerCase() === marketSymbol.toLowerCase()
        );
        if (found?.poolAddress) {
          poolAddress = found.poolAddress as `0x${string}`;
        }
      } catch (err) {
        console.warn("[DreamDexExecutor] Failed to find pool from event markets:", err);
      }
    }
    // Fallback for close_position: resolve pool address from user transactions or active positions
    if (!poolAddress && action === "close_position") {
      try {
        const userTxs = await getUserDreamDexTransactions(userId, agentAddress);
        const matchingTrade = userTxs.find((tx) => {
          const meta = (tx.metadata || {}) as any;
          if (!meta?.pool) return false;
          const mSym = (meta.marketSymbol || "").toLowerCase();
          const target = marketSymbol.toLowerCase();
          return mSym === target || mSym.includes(target) || target.includes(mSym);
        });
        if (matchingTrade?.metadata) {
          poolAddress = (matchingTrade.metadata as any).pool as `0x${string}`;
        }
      } catch (txErr) {
        console.warn("[DreamDexExecutor] Failed to resolve pool for close_position from transactions:", txErr);
      }

      if (!poolAddress) {
        try {
          const posResult = await dreamDexApi.getPositions(agentAddress);
          const activePositions = posResult?.positions || [];
          const matchingPos = activePositions.find((pos: any) => {
            const mSym = (pos.marketSymbol || pos.symbol || "").toLowerCase();
            const target = marketSymbol.toLowerCase();
            return (mSym === target || mSym.includes(target) || target.includes(mSym)) && (pos.userPositionContracts > 0 || pos.userTotalUnits > 0);
          });
          if (matchingPos?.poolAddress) {
            poolAddress = matchingPos.poolAddress as `0x${string}`;
          }
        } catch (posErr) {
          console.warn("[DreamDexExecutor] Failed to resolve pool for close_position from positions:", posErr);
        }
      }
    }
    if (!poolAddress && action !== "redeem") {
      throw new Error(`Unable to resolve pool address for market "${marketSymbol}". Please verify the market symbol is active.`);
    }

    // 4a. Idempotency Protection: Check if this exact order was already executed
    const orderFingerprint = rawParams?.orderFingerprint || rawParams?.toolCallId;
    try {
      const priorTxs = await getUserDreamDexTransactions(userId, agentAddress);
      const existingMatch = priorTxs.find((tx) => {
        const meta = (tx.metadata || {}) as any;
        if (orderFingerprint && (meta.orderFingerprint === orderFingerprint || meta.toolCallId === orderFingerprint)) {
          return true;
        }
        return false;
      });

      if (existingMatch && existingMatch.signature) {
        console.log(`[DreamDexExecutor] Idempotency: Order ${marketSymbol} already executed on-chain (${existingMatch.signature})`);
        return {
          success: true,
          transactionHash: existingMatch.signature,
          explorerUrl: `${SOMNIA_TESTNET_EXPLORER}/tx/${existingMatch.signature}`,
          orderId: (existingMatch.metadata as any)?.orderId,
          action,
          marketSymbol,
        };
      }
    } catch (idempotencyErr) {
      console.warn("[DreamDexExecutor] Error in idempotency verification:", idempotencyErr);
    }

    const [sttBalanceRaw, usdcBalanceRaw] = await Promise.all([
      publicClient.getBalance({ address: agentAddress }),
      publicClient.readContract({
        address: TUSDC_TESTNET_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [agentAddress],
      }),
    ]);
    const sttFormatted = formatEther(sttBalanceRaw);
    if (Number(sttFormatted) <= 0) {
      return {
        success: false,
        error: `Agent wallet has 0 STT gas on Somnia Shannon testnet. Please claim free STT from the faucet: ${SOMNIA_FAUCET_URL}`,
      };
    }

    // Calculate required collateral
    const quantity = params.quantity || 10;
    const displayPrice = params.displayPrice || 0.65;
    const totalCollateral = params.amount || (quantity * displayPrice);
    const requiredCollateralUnits = BigInt(Math.round(totalCollateral * 1_000_000));

    const usdcFormatted = formatUnits(usdcBalanceRaw, 6);

    if (usdcBalanceRaw < requiredCollateralUnits && (action === "mint" || (action === "place_order" && (params.side === "buy_up" || params.side === "buy_down" || !params.side)))) {
      return {
        success: false,
        error: `Insufficient tUSDC collateral! Your agent wallet (${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}) has ${Number(usdcFormatted).toFixed(2)} tUSDC, but ${totalCollateral.toFixed(2)} tUSDC is required. Please claim testnet tUSDC: ${SOMNIA_FAUCET_URL}`,
      };
    }

    let finalTxHash = "";
    let returnedOrderId: string | undefined = undefined;

    // 5. Execution Paths
    if (action === "mint") {
      console.log(`[DreamDexExecutor] Minting complete set: ${totalCollateral} tUSDC on pool ${poolAddress}`);

      // Ensure allowance for pool
      const currentAllowance = await publicClient.readContract({
        address: TUSDC_TESTNET_ADDRESS,
        abi: erc20Abi,
        functionName: "allowance",
        args: [agentAddress, poolAddress],
      });

      if (currentAllowance < requiredCollateralUnits) {
        console.log(`[DreamDexExecutor] Approving tUSDC collateral for pool ${poolAddress}...`);
        const approveHash = await walletClient.writeContract({
          address: TUSDC_TESTNET_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [poolAddress, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 30000, pollingInterval: 400 });
        console.log(`[DreamDexExecutor] tUSDC approved: ${approveHash}`);
      }

      // Execute mintSet
      const mintHash = await walletClient.writeContract({
        address: poolAddress,
        abi: binaryPoolAbi,
        functionName: "mintSet",
        args: [agentAddress, agentAddress, requiredCollateralUnits],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: mintHash, timeout: 30000, pollingInterval: 400 });
      if (receipt.status === "reverted") {
        throw new Error("mintSet transaction reverted on-chain.");
      }
      finalTxHash = mintHash;
      console.log(`[DreamDexExecutor] mintSet confirmed: ${finalTxHash}`);

    } else if (action === "place_order" || action === "close_position") {
      const OUTCOME_TOKEN_SINGLETON = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9" as const;
      const computeOutcomeId = (pool: string, nonce: bigint, outcomeIdx: number): bigint => {
        return (BigInt(pool) << 72n) | ((nonce & 0xffffffffffffffffn) << 8n) | BigInt(outcomeIdx);
      };

      let kind: number;
      let quantityInUnits: bigint;

      if (action === "close_position") {
        const [currentNonce, isFinalized, marketExpiry] = await Promise.all([
          publicClient.readContract({
            address: poolAddress,
            abi: binaryPoolAbi,
            functionName: "marketNonce",
          }),
          publicClient.readContract({
            address: poolAddress,
            abi: binaryPoolAbi,
            functionName: "finalized",
          }),
          publicClient.readContract({
            address: poolAddress,
            abi: binaryPoolAbi,
            functionName: "marketExpiryNs",
          }),
        ]);

        const nowNs = BigInt(Date.now()) * 1_000_000n;
        if (isFinalized || nowNs >= marketExpiry - 5_000_000_000n) {
          throw new Error(`This prediction market window has ended or is finalizing. You cannot exit early; please redeem your winning contracts once settled.`);
        }

        const erc6909BalAbi = [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [
              { name: "owner", type: "address" },
              { name: "id", type: "uint256" },
            ],
            outputs: [{ name: "", type: "uint256" }],
          },
        ] as const;

        // Check current nonce and previous nonces
        let yesBal = 0n;
        let noBal = 0n;

        for (let offset = 0n; offset <= 2n; offset++) {
          if (currentNonce >= offset && currentNonce - offset >= 1n) {
            const checkNonce = currentNonce - offset;
            const yId = computeOutcomeId(poolAddress, checkNonce, 0);
            const nId = computeOutcomeId(poolAddress, checkNonce, 1);
            const [y, n] = await Promise.all([
              publicClient.readContract({ address: OUTCOME_TOKEN_SINGLETON, abi: erc6909BalAbi, functionName: "balanceOf", args: [agentAddress, yId] }).catch(() => 0n),
              publicClient.readContract({ address: OUTCOME_TOKEN_SINGLETON, abi: erc6909BalAbi, functionName: "balanceOf", args: [agentAddress, nId] }).catch(() => 0n),
            ]);
            if (y > 0n || n > 0n) {
              yesBal = y;
              noBal = n;
              break;
            }
          }
        }

        // If balance was 0 on this pool, search recent user transactions for any alternate pool for this market symbol
        if (yesBal === 0n && noBal === 0n) {
          try {
            const userTxs = await getUserDreamDexTransactions(userId, agentAddress);
            const matchingTrade = userTxs.find((tx) => {
              const meta = (tx.metadata || {}) as any;
              return meta?.pool && meta?.pool.toLowerCase() !== poolAddress.toLowerCase() &&
                (meta?.marketSymbol?.toLowerCase() === marketSymbol.toLowerCase() ||
                 meta?.marketSymbol?.toLowerCase().includes(marketSymbol.toLowerCase()) ||
                 marketSymbol.toLowerCase().includes(meta?.marketSymbol?.toLowerCase()));
            });
            if (matchingTrade?.metadata) {
              const altPool = (matchingTrade.metadata as any).pool as `0x${string}`;
              const altNonce = await publicClient.readContract({
                address: altPool,
                abi: binaryPoolAbi,
                functionName: "marketNonce",
              }).catch(() => 0n);
              if (altNonce > 0n) {
                for (let offset = 0n; offset <= 2n; offset++) {
                  if (altNonce >= offset && altNonce - offset >= 1n) {
                    const checkNonce = altNonce - offset;
                    const yId = computeOutcomeId(altPool, checkNonce, 0);
                    const nId = computeOutcomeId(altPool, checkNonce, 1);
                    const [y, n] = await Promise.all([
                      publicClient.readContract({ address: OUTCOME_TOKEN_SINGLETON, abi: erc6909BalAbi, functionName: "balanceOf", args: [agentAddress, yId] }).catch(() => 0n),
                      publicClient.readContract({ address: OUTCOME_TOKEN_SINGLETON, abi: erc6909BalAbi, functionName: "balanceOf", args: [agentAddress, nId] }).catch(() => 0n),
                    ]);
                    if (y > 0n || n > 0n) {
                      poolAddress = altPool;
                      yesBal = y;
                      noBal = n;
                      break;
                    }
                  }
                }
              }
            }
          } catch (altErr) {
            console.warn("[DreamDexExecutor] Alternate pool search notice:", altErr);
          }
        }

        console.log(`[DreamDexExecutor] Close position token balances on pool ${poolAddress}: YES=${yesBal}, NO=${noBal}`);

        if (yesBal === 0n && noBal === 0n) {
          throw new Error(`No active contracts found in your agent wallet for ${marketSymbol}. The market window may have already expired, settled, or been closed.`);
        }

        const passedSide = String(params.side || "").toLowerCase();
        if (passedSide.includes("down") || (noBal > 0n && yesBal === 0n)) {
          kind = 3; // SELL_NO
          if (noBal <= 0n) {
            throw new Error(`No DOWN contracts found in your agent wallet to close for ${marketSymbol}.`);
          }
          const requestedUnits = params.quantity ? BigInt(Math.round(params.quantity * 1_000_000)) : noBal;
          quantityInUnits = requestedUnits <= noBal && requestedUnits > 0n ? requestedUnits : noBal;
        } else {
          kind = 1; // SELL_YES
          if (yesBal <= 0n) {
            throw new Error(`No UP contracts found in your agent wallet to close for ${marketSymbol}.`);
          }
          const requestedUnits = params.quantity ? BigInt(Math.round(params.quantity * 1_000_000)) : yesBal;
          quantityInUnits = requestedUnits <= yesBal && requestedUnits > 0n ? requestedUnits : yesBal;
        }

        if (quantityInUnits <= 0n) {
          throw new Error(`No open contracts available to close for ${marketSymbol}.`);
        }
      } else {
        const side = params.side || "buy_up";
        // 0 = BUY_YES, 1 = SELL_YES, 2 = BUY_NO, 3 = SELL_NO
        kind = side === "buy_up" ? 0 : side === "sell_up" ? 1 : side === "buy_down" ? 2 : 3;
        quantityInUnits = BigInt(Math.round(quantity * 1_000_000));
      }

      const isBuying = kind === 0 || kind === 2;
      const orderTypeNum = action === "place_order" ? 2 : (params.orderType === "ioc" ? 2 : 0);

      const MAX_ORDER_RETRIES = 2;
      let lastOrderError: any = null;

      for (let attempt = 1; attempt <= MAX_ORDER_RETRIES; attempt++) {
        try {
          // 1. Re-verify active rolling pool and expiry
          const nowNs = BigInt(Date.now()) * 1_000_000n;
          let [finalized, marketExpiryNs, marketNonce] = await Promise.all([
            publicClient.readContract({
              address: poolAddress,
              abi: binaryPoolAbi,
              functionName: "finalized",
            }),
            publicClient.readContract({
              address: poolAddress,
              abi: binaryPoolAbi,
              functionName: "marketExpiryNs",
            }),
            publicClient.readContract({
              address: poolAddress,
              abi: binaryPoolAbi,
              functionName: "marketNonce",
            }),
          ]);

          // Somnia testnet matching engine / solver matches taker orders fast (<1s).
          // If a market window has < 15 seconds remaining, roll forward to the next active window.
          // Automatically roll forward to the newest active window with >= 15s remaining (ONLY for new buy orders, NEVER for closing active positions!)
          const MIN_FILL_WINDOW_NS = 15_000_000_000n; // 15 seconds minimum fill window
          if (action === "place_order" && (finalized || nowNs >= marketExpiryNs - MIN_FILL_WINDOW_NS)) {
            const timeRem = Number((marketExpiryNs - nowNs) / 1_000_000_000n);
            console.log(
              `[DreamDexExecutor] Pool ${poolAddress} is finalized or expiring soon (${timeRem}s remaining < 15s). Rolling over to newest active window to prevent unfilled order refund...`
            );
            try {
              const freshMarket = await dreamDexApi.getMarketBySymbol(marketSymbol);
              if (requestedInterval && freshMarket?.poolAddress && freshMarket.poolAddress !== poolAddress && matchesMarketInterval(freshMarket.symbol, requestedInterval)) {
                poolAddress = freshMarket.poolAddress as `0x${string}`;
                marketSymbol = freshMarket.symbol;
                [finalized, marketExpiryNs, marketNonce] = await Promise.all([
                  publicClient.readContract({
                    address: poolAddress,
                    abi: binaryPoolAbi,
                    functionName: "finalized",
                  }),
                  publicClient.readContract({
                    address: poolAddress,
                    abi: binaryPoolAbi,
                    functionName: "marketExpiryNs",
                  }),
                  publicClient.readContract({
                    address: poolAddress,
                    abi: binaryPoolAbi,
                    functionName: "marketNonce",
                  }),
                ]);
                console.log(
                  `[DreamDexExecutor] Rolled over to fresh pool ${poolAddress} (${marketSymbol}, expiry in ${Number((marketExpiryNs - nowNs) / 1_000_000_000n)}s)`
                );
              }
            } catch (freshErr) {
              console.warn("[DreamDexExecutor] Fresh pool resolution error:", freshErr);
            }
            if (finalized || nowNs >= marketExpiryNs - MIN_FILL_WINDOW_NS) {
              throw new Error(`${marketSymbol} is too close to expiry. Refresh live markets and choose the next ${requestedInterval || "market"} window.`);
            }
          }

          if (finalized || nowNs >= marketExpiryNs) {
            throw new Error(
              `Prediction market window ended. Refreshing to newest active rolling window...`
            );
          }

          // 2. Query live order book levels on-chain to determine true market prices and guarantee 100% instant taker fill
          const [bids, asks] = await Promise.all([
            publicClient.readContract({
              address: poolAddress,
              abi: binaryPoolAbi,
              functionName: "getBookLevels",
              args: [true, 3n],
            }).catch(() => []),
            publicClient.readContract({
              address: poolAddress,
              abi: binaryPoolAbi,
              functionName: "getBookLevels",
              args: [false, 3n],
            }).catch(() => []),
          ]);

          const hasBookLiquidity = (bids && bids.length > 0 && bids[0].price > 0n) || (asks && asks.length > 0 && asks[0].price > 0n);
          const SLIPPAGE_BUFFER = 50_000n; // 5% slippage safety buffer to guarantee instant taker match
          let onChainPrice = 500000n;

          if (isBuying) {
            if (kind === 0) {
              // BUY_YES / UP: Crosses the ASKS on YES
              if (asks && asks.length > 0 && asks[0].price > 0n) {
                const bestAsk = asks[0].price;
                onChainPrice = bestAsk + SLIPPAGE_BUFFER > 990_000n ? 990_000n : bestAsk + SLIPPAGE_BUFFER;
                if (params.amount && params.amount > 0) {
                  const askPriceNum = Number(bestAsk) / 1e6;
                  if (askPriceNum > 0) {
                    quantityInUnits = BigInt(Math.floor((params.amount / askPriceNum) * 1e6));
                  }
                }
              } else {
                onChainPrice = BigInt(params.priceInMillionths || Math.round(displayPrice * 1_000_000)) || 500000n;
              }
            } else if (kind === 2) {
              // BUY_NO / DOWN: Crosses the BIDS on YES
              if (bids && bids.length > 0 && bids[0].price > 0n) {
                const bestBid = bids[0].price;
                onChainPrice = bestBid >= SLIPPAGE_BUFFER ? bestBid - SLIPPAGE_BUFFER : bestBid;
                if (params.amount && params.amount > 0) {
                  const noCostNum = (1_000_000 - Number(bestBid)) / 1e6;
                  if (noCostNum > 0) {
                    quantityInUnits = BigInt(Math.floor((params.amount / noCostNum) * 1e6));
                  }
                }
              } else {
                onChainPrice = BigInt(params.priceInMillionths || Math.round(displayPrice * 1_000_000)) || 500000n;
              }
            }
          } else {
            // Early exit / selling
            if (kind === 1) {
              // SELL_YES: Crosses BIDS
              if (bids && bids.length > 0 && bids[0].price > 0n) {
                const bestBid = bids[0].price;
                onChainPrice = bestBid >= SLIPPAGE_BUFFER ? bestBid - SLIPPAGE_BUFFER : bestBid;
              } else {
                onChainPrice = BigInt(params.priceInMillionths || Math.round(displayPrice * 1_000_000)) || 500000n;
              }
            } else if (kind === 3) {
              // SELL_NO: Crosses ASKS
              if (asks && asks.length > 0 && asks[0].price > 0n) {
                const bestAsk = asks[0].price;
                onChainPrice = bestAsk + SLIPPAGE_BUFFER > 990_000n ? 990_000n : bestAsk + SLIPPAGE_BUFFER;
              } else {
                onChainPrice = BigInt(params.priceInMillionths || Math.round(displayPrice * 1_000_000)) || 500000n;
              }
            }
          }

          if (onChainPrice <= 0n || onChainPrice >= 1_000_000n) {
            onChainPrice = 500000n;
          }
          // DreamDEX contract requires lot size granularity of 1000 units (3 decimal places)
          quantityInUnits = (quantityInUnits / 1000n) * 1000n;
          if (quantityInUnits < 1000n) {
            quantityInUnits = 1000n;
          }

          // 3. User collateral & approval verification
          const ensureUserApproval = async () => {
            if (isBuying) {
            const orderRequiredCollateral =
              kind === 0
                ? (quantityInUnits * onChainPrice) / 1_000_000n
                : (quantityInUnits * (1_000_000n - onChainPrice)) / 1_000_000n;

            const currentAllowance = await publicClient.readContract({
              address: TUSDC_TESTNET_ADDRESS,
              abi: erc20Abi,
              functionName: "allowance",
              args: [agentAddress, poolAddress],
            });

            if (currentAllowance < orderRequiredCollateral) {
              console.log(`[DreamDexExecutor] Approving tUSDC for pool ${poolAddress}...`);
              const approveNonce = await publicClient.getTransactionCount({
                address: agentAddress,
                blockTag: "pending",
              });
              const approveHash = await walletClient.writeContract({
                address: TUSDC_TESTNET_ADDRESS,
                abi: erc20Abi,
                functionName: "approve",
                args: [poolAddress, maxUint256],
                nonce: approveNonce,
              });
              await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 15000, pollingInterval: 400 });
            }
            } else {
            // Selling UP or DOWN contracts: approve pool as operator on ERC-6909 singleton
            const OUTCOME_TOKEN_SINGLETON = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9" as const;
            const erc6909OpAbi = [
              {
                name: "isOperator",
                type: "function",
                stateMutability: "view",
                inputs: [
                  { name: "owner", type: "address" },
                  { name: "spender", type: "address" },
                ],
                outputs: [{ name: "", type: "bool" }],
              },
              {
                name: "setOperator",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [
                  { name: "spender", type: "address" },
                  { name: "approved", type: "bool" },
                ],
                outputs: [{ name: "", type: "bool" }],
              },
            ] as const;

            const isOp = await publicClient.readContract({
              address: OUTCOME_TOKEN_SINGLETON,
              abi: erc6909OpAbi,
              functionName: "isOperator",
              args: [agentAddress, poolAddress],
            }).catch(() => false);

            if (!isOp) {
              console.log(`[DreamDexExecutor] Approving pool ${poolAddress} as operator on ERC-6909 singleton for early exit...`);
              const opNonce = await publicClient.getTransactionCount({
                address: agentAddress,
                blockTag: "pending",
              });
              const opTx = await walletClient.writeContract({
                address: OUTCOME_TOKEN_SINGLETON,
                abi: erc6909OpAbi,
                functionName: "setOperator",
                args: [poolAddress, true],
                nonce: opNonce,
              });
              await publicClient.waitForTransactionReceipt({ hash: opTx, timeout: 15000, pollingInterval: 400 });
              console.log(`[DreamDexExecutor] Pool approved as ERC-6909 operator: ${opTx}`);
            }
            }
          };

          // If the book has live market maker orders, fill directly against the book.
          // Only seed counterparty maker liquidity if the book is completely empty.
          if (!hasBookLiquidity) {
            console.log(`[DreamDexExecutor] Empty order book detected on ${poolAddress}; seeding testnet counterparty liquidity...`);
            await ensureTestnetCounterpartyLiquidity({
              publicClient,
              userWalletClient: walletClient,
              poolAddress,
              kind,
              priceInMillionths: onChainPrice,
              quantityInUnits,
              marketExpiryNs,
            });
          }
          await ensureUserApproval();

          // 5. Query pending nonce to prevent nonce reuse or lag
          const pendingNonce = await publicClient.getTransactionCount({
            address: agentAddress,
            blockTag: "pending",
          });
          const outcomeId = computeOutcomeId(poolAddress, marketNonce, kind === 2 ? 1 : 0);
          const balanceBefore = isBuying
            ? await publicClient.readContract({
                address: OUTCOME_TOKEN_SINGLETON,
                abi: [{
                  name: "balanceOf",
                  type: "function",
                  stateMutability: "view",
                  inputs: [{ name: "owner", type: "address" }, { name: "id", type: "uint256" }],
                  outputs: [{ name: "", type: "uint256" }],
                }] as const,
                functionName: "balanceOf",
                args: [agentAddress, outcomeId],
              })
            : 0n;

          console.log(
            `[DreamDexExecutor] (Attempt ${attempt}/${MAX_ORDER_RETRIES}) Calling placeBinaryOrder: kind=${kind}, price=${onChainPrice}, qty=${quantityInUnits}, expireNs=${marketExpiryNs}, nonce=${pendingNonce}`
          );

          const orderTxHash = await walletClient.writeContract({
            address: poolAddress,
            abi: binaryPoolAbi,
            functionName: "placeBinaryOrder",
            args: [
              kind,
              onChainPrice,
              quantityInUnits,
              marketExpiryNs,
              orderTypeNum,
              1, // selfMatchingOption: 1 = CancelMaker (cancels resting maker order and executes taker cleanly, eliminating 0x6ffc9258 SelfMatchCancelTaker)
              ZERO_ADDRESS, // builder
              0n, // builderFeeBpsTimes1k
              0n, // userData
            ],
            nonce: pendingNonce,
          });

          const receipt = await publicClient.waitForTransactionReceipt({ hash: orderTxHash, timeout: 15000, pollingInterval: 400 });
          if (receipt.status === "reverted") {
            throw new Error(`Order transaction reverted on Somnia testnet (tx: ${orderTxHash})`);
          }

          finalTxHash = orderTxHash;
          executedMarketNonce = marketNonce;
          console.log(`[DreamDexExecutor] Order confirmed on-chain on attempt ${attempt}: ${finalTxHash}`);

          // Check if order filled immediately as taker
          const filledEvent = receipt.logs.find(
            (l) => l.topics[0]?.toLowerCase() === "0xc87f4223e9e7c4e4f39f9b34fc9d64d78cdb95d9035b3748cbde59521261a399"
          );
          if (filledEvent) {
            console.log(`[DreamDexExecutor] Order confirmed FILLED as taker on-chain!`);
          }
          if (isBuying && !filledEvent) {
            const balanceAfter = await publicClient.readContract({
              address: OUTCOME_TOKEN_SINGLETON,
              abi: [{
                name: "balanceOf",
                type: "function",
                stateMutability: "view",
                inputs: [{ name: "owner", type: "address" }, { name: "id", type: "uint256" }],
                outputs: [{ name: "", type: "uint256" }],
              }] as const,
              functionName: "balanceOf",
              args: [agentAddress, outcomeId],
            });
            if (balanceAfter <= balanceBefore) throw new Error("DreamDEX IOC order was not filled; no collateral was spent.");
          }

          // Successfully executed!
          break;
        } catch (err: any) {
          lastOrderError = err;
          console.warn(`[DreamDexExecutor] Order attempt ${attempt}/${MAX_ORDER_RETRIES} failed:`, err?.shortMessage || err?.message || err);
          const errStr = String(err?.shortMessage || err?.message || err);
          if (errStr.includes("0xf4d678b8") || errStr.includes("InsufficientBalance")) {
            throw new Error(`Insufficient contract balance in your wallet to close this position.`);
          }
          if (errStr.includes("0x3154078e") || errStr.includes("OrderAlreadyExpired") || errStr.includes("OrderExpired")) {
            throw new Error(`This market window has expired. The position will be automatically settled and redeemed once finalized.`);
          }
          if (attempt < MAX_ORDER_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
            continue;
          }
          throw lastOrderError;
        }
      }

    } else if (action === "cancel" && params.orderId) {
      const cancelTxHash = await walletClient.writeContract({
        address: poolAddress,
        abi: binaryPoolAbi,
        functionName: "cancelOrder",
        args: [BigInt(params.orderId)],
      });
      await publicClient.waitForTransactionReceipt({ hash: cancelTxHash, timeout: 30000, pollingInterval: 400 });
      finalTxHash = cancelTxHash;
    } else if (action === "redeem") {
      const activeLockKey = `${userId}`;
      if (activeRedemptions.has(activeLockKey)) {
        console.log(`[DreamDexExecutor] Concurrency lock: waiting for active redemption for user ${userId}...`);
        try {
          const res = await activeRedemptions.get(activeLockKey)!;
          return res;
        } catch {}
      }

      const redeemPromise = (async (): Promise<DreamDexTradeExecutionResult> => {
        console.log(`[DreamDexExecutor] Executing redeem for market ${marketSymbol} on pool ${poolAddress}`);

        const OUTCOME_TOKEN_SINGLETON = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9" as const;
        const BINARY_SETTLEMENT = "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23" as const;

        const erc6909Abi = [
          {
            name: "balanceOf",
            type: "function",
            stateMutability: "view",
            inputs: [
              { name: "owner", type: "address" },
              { name: "id", type: "uint256" },
            ],
            outputs: [{ name: "balance", type: "uint256" }],
          },
          {
            name: "isOperator",
            type: "function",
            stateMutability: "view",
            inputs: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
            ],
            outputs: [{ name: "approved", type: "bool" }],
          },
          {
            name: "setOperator",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "approved", type: "bool" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ] as const;

        const settlementAbi = [
          {
            name: "isFinalized",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "marketKey", type: "uint256" }],
            outputs: [{ name: "finalized", type: "bool" }],
          },
          {
            name: "getSettlement",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "marketKey", type: "uint256" }],
            outputs: [
              {
                name: "settlement",
                type: "tuple",
                components: [
                  { name: "collateralToken", type: "address" },
                  { name: "backing", type: "uint128" },
                  { name: "finalized", type: "bool" },
                  { name: "voided", type: "bool" },
                  { name: "settlementFeeBpsTimes1k", type: "uint256" },
                  { name: "feeRecipient", type: "address" },
                  { name: "pool", type: "address" },
                  { name: "nonce", type: "uint64" },
                  { name: "payoutNumerators", type: "uint256[]" },
                ],
              },
            ],
          },
          {
            name: "redeem",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "outcomeId", type: "uint256" },
              { name: "amount", type: "uint256" },
              { name: "to", type: "address" },
            ],
            outputs: [{ name: "collateralOut", type: "uint256" }],
          },
        ] as const;

        // Ensure settlement contract is approved as operator on ERC-6909 singleton
        const isOp = await publicClient.readContract({
          address: OUTCOME_TOKEN_SINGLETON,
          abi: erc6909Abi,
          functionName: "isOperator",
          args: [agentAddress, BINARY_SETTLEMENT],
        });

        if (!isOp) {
          console.log(`[DreamDexExecutor] Approving BinarySettlement as operator on ERC-6909 singleton...`);
          const opTx = await walletClient.writeContract({
            address: OUTCOME_TOKEN_SINGLETON,
            abi: erc6909Abi,
            functionName: "setOperator",
            args: [BINARY_SETTLEMENT, true],
          });
          await publicClient.waitForTransactionReceipt({ hash: opTx, timeout: 30000, pollingInterval: 400 });
          console.log(`[DreamDexExecutor] BinarySettlement operator approved: ${opTx}`);
        }

        const computeOutcomeId = (pool: string, nonce: bigint, outcomeIdx: number): bigint => {
          return (BigInt(pool) << 72n) | ((nonce & 0xffffffffffffffffn) << 8n) | BigInt(outcomeIdx);
        };
        const computeMarketKey = (outId: bigint): bigint => outId >> 8n;

        interface TokenToRedeem {
          pool: string;
          outcomeId: bigint;
          amount: bigint;
          marketSymbol?: string;
          nonce?: bigint;
          outcomeIdx?: number;
        }
        const tokensToRedeem: TokenToRedeem[] = [];

        // 1. Check explicit claimablePositions if provided
        const explicitClaimables = (rawParams as any)?.claimablePositions || (params as any)?.claimablePositions;
        if (Array.isArray(explicitClaimables) && explicitClaimables.length > 0) {
          for (const pos of explicitClaimables) {
            if (pos.outcomeId) {
              const oId = BigInt(pos.outcomeId);
              const bal = await publicClient.readContract({
                address: OUTCOME_TOKEN_SINGLETON,
                abi: erc6909Abi,
                functionName: "balanceOf",
                args: [agentAddress, oId],
              }).catch(() => 0n);
              if (bal > 0n) {
                tokensToRedeem.push({
                  pool: pos.pool || poolAddress,
                  outcomeId: oId,
                  amount: bal,
                  marketSymbol: pos.marketSymbol,
                });
              }
            }
          }
        }

        // 2. Check explicit outcomeId if provided and not yet added
        if (tokensToRedeem.length === 0 && (params as any).outcomeId) {
          const oId = BigInt((params as any).outcomeId);
          const bal = await publicClient.readContract({
            address: OUTCOME_TOKEN_SINGLETON,
            abi: erc6909Abi,
            functionName: "balanceOf",
            args: [agentAddress, oId],
          }).catch(() => 0n);
          if (bal > 0n) {
            tokensToRedeem.push({
              pool: poolAddress,
              outcomeId: oId,
              amount: bal,
              marketSymbol,
            });
          }
        }

        // 3. If no tokens identified yet, discover all winning tokens across candidate pools
        if (tokensToRedeem.length === 0) {
          const poolSymbolMap = new Map<string, string>();
          const candidatePools: `0x${string}`[] = [];
          const seenPools = new Set<string>();
          const addCandidate = (addr?: string, sym?: string) => {
            if (!addr || addr === ZERO_ADDRESS) return;
            const norm = addr.toLowerCase() as `0x${string}`;
            if (!seenPools.has(norm)) {
              seenPools.add(norm);
              candidatePools.push(norm);
            }
            if (sym && !poolSymbolMap.has(norm)) {
              poolSymbolMap.set(norm, sym);
            }
          };

          if (poolAddress && poolAddress !== ZERO_ADDRESS) {
            addCandidate(poolAddress, marketSymbol);
          } else {
            // Add pools dynamically from user's trade history ONLY if no specific pool was requested
            let userTxs: any[] = [];
            try {
              userTxs = await getUserDreamDexTransactions(userId, agentAddress);
              for (const tx of userTxs) {
                const p = (tx.metadata as any)?.pool;
                const sym = (tx.metadata as any)?.marketSymbol;
                if (p) addCandidate(p, sym);
              }
            } catch (err) {
              console.warn("[DreamDexExecutor] Error loading user tx pools for redeem:", err);
            }

            // If no specific pool or user trades found, fallback to registered pools
            if (candidatePools.length === 0) {
              for (const rp of dreamDexApi.getRegisteredPools()) {
                addCandidate(rp.address, rp.symbol);
              }
            }
          }

          // Concurrent check across candidate pools
          await Promise.all(
            candidatePools.map(async (pool) => {
              try {
                const currentNonce = await publicClient.readContract({
                  address: pool,
                  abi: binaryPoolAbi,
                  functionName: "marketNonce",
                });

                // Fast concurrent check of current nonce and previous 3 windows
                const noncesToCheck: bigint[] = [];
                for (let offset = 0n; offset <= 3n; offset++) {
                  if (currentNonce >= offset && currentNonce - offset >= 1n) {
                    noncesToCheck.push(currentNonce - offset);
                  }
                }

                const queries = noncesToCheck.flatMap((n) => [
                  { pool, nonce: n, outcomeIdx: 0, id: computeOutcomeId(pool, n, 0) },
                  { pool, nonce: n, outcomeIdx: 1, id: computeOutcomeId(pool, n, 1) },
                ]);

                const balances = await Promise.all(
                  queries.map((q) =>
                    publicClient
                      .readContract({
                        address: OUTCOME_TOKEN_SINGLETON,
                        abi: erc6909Abi,
                        functionName: "balanceOf",
                        args: [agentAddress, q.id],
                      })
                      .catch(() => 0n)
                  )
                );

                for (let i = 0; i < queries.length; i++) {
                  const bal = balances[i];
                  if (bal > 0n) {
                    const q = queries[i];
                    const key = computeMarketKey(q.id);
                    const s = await publicClient
                      .readContract({
                        address: BINARY_SETTLEMENT,
                        abi: settlementAbi,
                        functionName: "getSettlement",
                        args: [key],
                      })
                      .catch(() => null);

                    if (s && s.finalized && s.payoutNumerators[q.outcomeIdx] > 0n) {
                      console.log(
                        `[DreamDexExecutor] Found winning token to redeem: pool=${pool}, nonce=${q.nonce}, outcome=${q.outcomeIdx === 0 ? "YES" : "NO"}, balance=${bal}`
                      );
                      const resolvedSym = poolSymbolMap.get(pool.toLowerCase()) || marketSymbol;
                      tokensToRedeem.push({
                        pool,
                        outcomeId: q.id,
                        amount: bal,
                        nonce: q.nonce,
                        outcomeIdx: q.outcomeIdx,
                        marketSymbol: resolvedSym,
                      });
                    }
                  }
                }
              } catch (e: any) {
                // ignore and continue
              }
            })
          );
        }

        if (tokensToRedeem.length === 0) {
          // Check if user already has a recorded redemption transaction in DB specifically for this pool
          let userTxs: any[] = [];
          try {
            userTxs = await getUserDreamDexTransactions(userId, agentAddress);
          } catch {}

          const priorRedeemTx = userTxs.find((tx) =>
            tx.operationType === "dreamdex_redeem" &&
            poolAddress && poolAddress !== ZERO_ADDRESS &&
            (tx.metadata as any)?.pool?.toLowerCase() === poolAddress.toLowerCase()
          );

          if (priorRedeemTx?.signature) {
            console.log(`[DreamDexExecutor] User already redeemed this market. Prior on-chain tx: ${priorRedeemTx.signature}`);
            dreamDexApi.clearPositionsCache(agentAddress);
            return {
              success: true,
              transactionHash: priorRedeemTx.signature,
              explorerUrl: `${SOMNIA_TESTNET_EXPLORER}/tx/${priorRedeemTx.signature}`,
              action: "redeem",
              marketSymbol,
              message: "Your winning contracts have already been redeemed on Somnia Shannon testnet into your tUSDC balance.",
              alreadyRedeemed: true,
            };
          } else {
            return {
              success: false,
              error: "No unredeemed winning contracts found in your agent wallet on Somnia Shannon testnet. Your winnings may have already been redeemed into your tUSDC collateral balance.",
              action: "redeem",
              marketSymbol,
            };
          }
        }

        // 4. Execute on-chain redemptions sequentially
        const redeemedHashes: string[] = [];
        let totalRedeemedUSDC = 0;

        for (const t of tokensToRedeem) {
          try {
            // Re-verify balance right before sending writeContract
            const liveBal = await publicClient.readContract({
              address: OUTCOME_TOKEN_SINGLETON,
              abi: erc6909Abi,
              functionName: "balanceOf",
              args: [agentAddress, t.outcomeId],
            }).catch(() => 0n);

            if (liveBal === 0n) {
              console.log(`[DreamDexExecutor] Token ${t.outcomeId} balance is 0 (already claimed/redeemed). Skipping.`);
              continue;
            }

            const redeemAmount = liveBal < t.amount ? liveBal : t.amount;
            console.log(`[DreamDexExecutor] Executing BinarySettlement.redeem on-chain: outcomeId=${t.outcomeId.toString()}, amount=${redeemAmount}`);

            const redeemHash = await walletClient.writeContract({
              address: BINARY_SETTLEMENT,
              abi: settlementAbi,
              functionName: "redeem",
              args: [t.outcomeId, redeemAmount, agentAddress],
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash: redeemHash, timeout: 60000, pollingInterval: 400 });
            if (receipt.status === "reverted") {
              throw new Error("Settlement redeem transaction reverted on Somnia Shannon testnet.");
            }

            console.log(`[DreamDexExecutor] Redemption confirmed on-chain: ${receipt.transactionHash}`);
            redeemedHashes.push(receipt.transactionHash);
            const payoutNum = Number(redeemAmount) / 1_000_000;
            totalRedeemedUSDC += payoutNum;

            await recordAgentTransaction({
              userId,
              walletAddress: agentAddress,
              operationType: "dreamdex_redeem",
              amount: String(payoutNum),
              signature: receipt.transactionHash,
              metadata: {
                marketSymbol: t.marketSymbol || marketSymbol,
                pool: t.pool,
                outcomeId: t.outcomeId.toString(),
                chain: "somnia",
                chainId: 50312,
              },
            });
          } catch (redeemErr: any) {
            const errStr = String(redeemErr?.shortMessage || redeemErr?.message || redeemErr);
            if (errStr.includes("0xf4d678b8") || errStr.includes("InsufficientBalance")) {
              console.log(`[DreamDexExecutor] Token ${t.outcomeId} reverted with InsufficientBalance (already claimed).`);
            } else {
              console.warn(`[DreamDexExecutor] Error redeeming token ${t.outcomeId}:`, redeemErr?.shortMessage || redeemErr?.message || redeemErr);
            }
          }
        }

        dreamDexApi.clearPositionsCache(agentAddress);

        if (redeemedHashes.length > 0) {
          const lastHash = redeemedHashes[redeemedHashes.length - 1];
          const primaryMarketSymbol = tokensToRedeem[0]?.marketSymbol || marketSymbol;
          const primaryPool = tokensToRedeem[0]?.pool || poolAddress;
          return {
            success: true,
            transactionHash: lastHash,
            explorerUrl: `${SOMNIA_TESTNET_EXPLORER}/tx/${lastHash}`,
            action: "redeem",
            marketSymbol: primaryMarketSymbol,
            poolAddress: primaryPool,
            isRedeemAll: true,
            redeemedCount: redeemedHashes.length,
            totalPayout: `$${totalRedeemedUSDC.toFixed(2)} tUSDC`,
            message: `Successfully redeemed ${redeemedHashes.length} winning position${redeemedHashes.length > 1 ? "s" : ""} totaling $${totalRedeemedUSDC.toFixed(2)} tUSDC on Somnia Network!`,
          };
        } else {
          // All candidate tokens were already redeemed
          let userTxs: any[] = [];
          try {
            userTxs = await getUserDreamDexTransactions(userId, agentAddress);
          } catch {}
          const priorRedeemTx = userTxs.find((tx) =>
            tx.operationType === "dreamdex_redeem" &&
            poolAddress && poolAddress !== ZERO_ADDRESS &&
            (tx.metadata as any)?.pool?.toLowerCase() === poolAddress.toLowerCase()
          );
          if (priorRedeemTx?.signature) {
            return {
              success: true,
              transactionHash: priorRedeemTx.signature,
              explorerUrl: `${SOMNIA_TESTNET_EXPLORER}/tx/${priorRedeemTx.signature}`,
              action: "redeem",
              marketSymbol,
              message: "Your winning contracts have already been redeemed on Somnia Shannon testnet into your tUSDC balance.",
              alreadyRedeemed: true,
            };
          } else {
            return {
              success: false,
              error: "Winning contracts have already been claimed or no unredeemed balance was found.",
              action: "redeem",
              marketSymbol,
            };
          }
        }
      })();

      activeRedemptions.set(activeLockKey, redeemPromise);
      try {
        return await redeemPromise;
      } finally {
        activeRedemptions.delete(activeLockKey);
      }
    }

    // 6. Record agent transaction for audit & visibility
    await recordAgentTransaction({
      userId,
      walletAddress: agentAddress,
      operationType: `dreamdex_${action}`,
      amount: String(totalCollateral),
      signature: finalTxHash,
      metadata: {
        marketSymbol,
        pool: poolAddress,
        side: params.side,
        price: displayPrice,
        quantity,
        marketNonce: executedMarketNonce?.toString(),
        chain: "somnia",
        chainId: 50312,
        orderFingerprint: rawParams?.orderFingerprint || rawParams?.toolCallId,
        toolCallId: rawParams?.toolCallId,
      },
    });

    // Register pool in runtime memory for portfolio discovery
    if (poolAddress) {
      dreamDexApi.registerTradedPool(poolAddress, marketSymbol);
    }
    dreamDexApi.clearPositionsCache(agentAddress);

    const explorerUrl = `${SOMNIA_TESTNET_EXPLORER}/tx/${finalTxHash}`;

    return {
      success: true,
      transactionHash: finalTxHash,
      explorerUrl,
      orderId: returnedOrderId,
      action,
      marketSymbol,
    };
  } catch (error: any) {
    console.error("[DreamDexExecutor] Execution error:", error);
    const msg = error.shortMessage || error.message || String(error);
    return {
      success: false,
      error: msg,
    };
  }
}
