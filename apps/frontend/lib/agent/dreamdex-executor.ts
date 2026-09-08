import { dreamDexApi } from "@barzakh/shared/lib/ai/tools/dreamdex/api-client";
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
    });

    const walletClient = createWalletClient({
      account,
      chain: SOMNIA_TESTNET_CHAIN,
      transport,
    });

    // 4. Pre-flight Balance Checks
    const params: DreamDexTradeExecutionParams = rawParams?.parameters || rawParams || {};
    const action = rawParams?.action || params.action || "place_order";
    const marketSymbol = rawParams?.marketSymbol || params.marketSymbol || "ETH-5m";
    let poolAddress = (rawParams?.pool || params.pool || rawParams?.poolAddress || "") as `0x${string}`;

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
        // Match identical market + side + action within last 10 minutes
        if (
          action === "place_order" &&
          tx.operationType === "dreamdex_place_order" &&
          meta.pool?.toLowerCase() === poolAddress?.toLowerCase() &&
          String(meta.side || "").toLowerCase() === String(rawParams.side || params.side || "").toLowerCase() &&
          tx.createdAt &&
          Date.now() - new Date(tx.createdAt).getTime() < 10 * 60 * 1000
        ) {
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

    const sttBalanceRaw = await publicClient.getBalance({ address: agentAddress });
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

    // Check tUSDC balance
    const usdcBalanceRaw = await publicClient.readContract({
      address: TUSDC_TESTNET_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [agentAddress],
    });
    const usdcFormatted = formatUnits(usdcBalanceRaw, 6);

    if (usdcBalanceRaw < requiredCollateralUnits && (action === "place_order" || action === "mint")) {
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
        await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 30000 });
        console.log(`[DreamDexExecutor] tUSDC approved: ${approveHash}`);
      }

      // Execute mintSet
      const mintHash = await walletClient.writeContract({
        address: poolAddress,
        abi: binaryPoolAbi,
        functionName: "mintSet",
        args: [agentAddress, agentAddress, requiredCollateralUnits],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: mintHash, timeout: 30000 });
      if (receipt.status === "reverted") {
        throw new Error("mintSet transaction reverted on-chain.");
      }
      finalTxHash = mintHash;
      console.log(`[DreamDexExecutor] mintSet confirmed: ${finalTxHash}`);

    } else if (action === "place_order") {
      const side = params.side || "buy_up";
      // 0 = BUY_YES, 1 = SELL_YES, 2 = BUY_NO, 3 = SELL_NO
      const kind: number = side === "buy_up" ? 0 : side === "sell_up" ? 1 : side === "buy_down" ? 2 : 3;
      const isBuying = kind === 0 || kind === 2;

      // Price in millionths (e.g. 0.65 -> 650000)
      const priceInMillionths = BigInt(
        params.priceInMillionths || Math.round(displayPrice * 1_000_000)
      );
      const quantityInUnits = BigInt(Math.round(quantity * 1_000_000));
      // 0 = LIMIT, 2 = IOC
      const orderTypeNum = params.orderType === "ioc" ? 2 : 0;

      // Check on-chain pool status and expiry
      let [finalized, marketExpiryNs] = await Promise.all([
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
      if (finalized || nowNs >= marketExpiryNs) {
        console.log(`[DreamDexExecutor] Pool ${poolAddress} expired/finalized. Resolving live active rolling pool...`);
        try {
          const freshMarket = await dreamDexApi.getMarketBySymbol(marketSymbol);
          if (freshMarket?.poolAddress && freshMarket.poolAddress !== poolAddress) {
            poolAddress = freshMarket.poolAddress as `0x${string}`;
            marketExpiryNs = await publicClient.readContract({
              address: poolAddress,
              abi: binaryPoolAbi,
              functionName: "marketExpiryNs",
            });
            finalized = await publicClient.readContract({
              address: poolAddress,
              abi: binaryPoolAbi,
              functionName: "finalized",
            });
          }
        } catch (e) {
          console.warn("[DreamDexExecutor] Fresh market lookup failed:", e);
        }
      }

      if (finalized || nowNs >= marketExpiryNs) {
        throw new Error(
          `This prediction market window has ended. Please refresh live markets to trade in the new rolling window.`
        );
      }

      // DreamDEX constraint: 0 < expireTimestampNs <= marketExpiryNs()
      const expireTimestampNs = marketExpiryNs;

      if (isBuying) {
        // Buy orders require collateral approval
        const currentAllowance = await publicClient.readContract({
          address: TUSDC_TESTNET_ADDRESS,
          abi: erc20Abi,
          functionName: "allowance",
          args: [agentAddress, poolAddress],
        });

        if (currentAllowance < requiredCollateralUnits) {
          console.log(`[DreamDexExecutor] Approving tUSDC for pool before order placement...`);
          const approveHash = await walletClient.writeContract({
            address: TUSDC_TESTNET_ADDRESS,
            abi: erc20Abi,
            functionName: "approve",
            args: [poolAddress, maxUint256],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 30000 });
        }
      }

      console.log(`[DreamDexExecutor] Calling placeBinaryOrder: kind=${kind}, price=${priceInMillionths}, qty=${quantityInUnits}, expireNs=${expireTimestampNs}`);

      const orderTxHash = await walletClient.writeContract({
        address: poolAddress,
        abi: binaryPoolAbi,
        functionName: "placeBinaryOrder",
        args: [
          kind,
          priceInMillionths,
          quantityInUnits,
          expireTimestampNs,
          orderTypeNum,
          0, // selfMatchingOption
          ZERO_ADDRESS, // builder
          0n, // builderFeeBpsTimes1k
          0n, // userData
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: orderTxHash, timeout: 30000 });
      if (receipt.status === "reverted") {
        throw new Error("Order transaction reverted on-chain. The order could not be placed.");
      }
      finalTxHash = orderTxHash;
      console.log(`[DreamDexExecutor] Order confirmed on-chain: ${finalTxHash}`);

    } else if (action === "cancel" && params.orderId) {
      const cancelTxHash = await walletClient.writeContract({
        address: poolAddress,
        abi: binaryPoolAbi,
        functionName: "cancelOrder",
        args: [BigInt(params.orderId)],
      });
      await publicClient.waitForTransactionReceipt({ hash: cancelTxHash, timeout: 30000 });
      finalTxHash = cancelTxHash;
    } else if (action === "redeem") {
      console.log(`[DreamDexExecutor] Executing redeem for market ${marketSymbol} on pool ${poolAddress}`);

      const OUTCOME_TOKEN_SINGLETON = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9" as const;
      const BINARY_SETTLEMENT = "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23" as const;

      const erc6909Abi = [
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

      const settlementAbi = [
        {
          name: "isFinalized",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "outcomeId", type: "uint256" }],
          outputs: [{ name: "", type: "bool" }],
        },
        {
          name: "getSettlement",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "marketKey", type: "uint256" }],
          outputs: [
            {
              name: "",
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
        await publicClient.waitForTransactionReceipt({ hash: opTx, timeout: 30000 });
        console.log(`[DreamDexExecutor] BinarySettlement operator approved: ${opTx}`);
      }

      const computeOutcomeId = (pool: string, nonce: bigint, outcomeIdx: number): bigint => {
        return (BigInt(pool) << 72n) | ((nonce & 0xffffffffffffffffn) << 8n) | BigInt(outcomeIdx);
      };
      const computeMarketKey = (outId: bigint): bigint => outId >> 8n;

      let targetOutcomeId: bigint | null = null;
      let targetAmount = 0n;

      if ((params as any).outcomeId) {
        targetOutcomeId = BigInt((params as any).outcomeId);
        targetAmount = BigInt(Math.round((params.amount || 20) * 1_000_000));
      } else {
        const candidatePools: `0x${string}`[] = [];
        const addCandidate = (addr?: string) => {
          if (addr && addr !== ZERO_ADDRESS && !candidatePools.some((cp) => cp.toLowerCase() === addr.toLowerCase())) {
            candidatePools.push(addr as `0x${string}`);
          }
        };

        if (poolAddress && poolAddress !== ZERO_ADDRESS) {
          addCandidate(poolAddress);
        }

        // Add pools dynamically from user's trade history
        let userTxs: any[] = [];
        try {
          userTxs = await getUserDreamDexTransactions(userId, agentAddress);
          for (const tx of userTxs) {
            const p = (tx.metadata as any)?.pool;
            if (p) addCandidate(p);
          }
        } catch (err) {
          console.warn("[DreamDexExecutor] Error loading user tx pools for redeem:", err);
        }

        // Add pools dynamically from registered and discovered pools
        for (const rp of dreamDexApi.getRegisteredPools()) {
          addCandidate(rp.address);
        }
        for (const dp of dreamDexApi.getDiscoveredPools()) {
          addCandidate(dp.address);
        }

        // Add pools from live event contract markets
        try {
          const liveMarkets = await dreamDexApi.getEventContractMarkets();
          for (const lm of liveMarkets) {
            if (lm.poolAddress) addCandidate(lm.poolAddress);
          }
        } catch (err) {
          console.warn("[DreamDexExecutor] Error loading live markets for redeem:", err);
        }

        for (const pool of candidatePools) {
          try {
            const currentNonce = await publicClient.readContract({
              address: pool,
              abi: binaryPoolAbi,
              functionName: "marketNonce",
            });

            // Fast concurrent check of current nonce and previous 2 windows
            const noncesToCheck: bigint[] = [];
            for (let offset = 0n; offset <= 2n; offset++) {
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
                const isFin = await publicClient
                  .readContract({
                    address: BINARY_SETTLEMENT,
                    abi: settlementAbi,
                    functionName: "isFinalized",
                    args: [q.id],
                  })
                  .catch(() => false);

                if (isFin) {
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
                    targetOutcomeId = q.id;
                    targetAmount = bal;
                    console.log(
                      `[DreamDexExecutor] Found winning token to redeem: pool=${pool}, nonce=${q.nonce}, outcome=${q.outcomeIdx === 0 ? "YES" : "NO"}, balance=${bal}`
                    );
                    break;
                  }
                }
              }
            }
          } catch (e: any) {
            // ignore and try next pool
          }
          if (targetOutcomeId !== null) break;
        }
      }

      if (!targetOutcomeId || targetAmount === 0n) {
        // Check if user already has a recorded redemption transaction in DB
        let userTxs: any[] = [];
        try {
          userTxs = await getUserDreamDexTransactions(userId, agentAddress);
        } catch {}

        const priorRedeemTx = userTxs.find((tx) =>
          tx.operationType === "dreamdex_redeem" &&
          (!poolAddress || (tx.metadata as any)?.pool?.toLowerCase() === poolAddress.toLowerCase())
        );

        if (priorRedeemTx?.signature) {
          console.log(`[DreamDexExecutor] User already redeemed this market. Prior on-chain tx: ${priorRedeemTx.signature}`);
          finalTxHash = priorRedeemTx.signature as `0x${string}`;
        } else {
          throw new Error(
            "No unredeemed winning contracts found in your agent wallet on Somnia Shannon testnet. Your winnings may have already been redeemed into your tUSDC collateral balance."
          );
        }
      } else {
        console.log(`[DreamDexExecutor] Executing BinarySettlement.redeem on-chain: outcomeId=${targetOutcomeId.toString()}, amount=${targetAmount}`);
        const redeemHash = await walletClient.writeContract({
          address: BINARY_SETTLEMENT,
          abi: settlementAbi,
          functionName: "redeem",
          args: [targetOutcomeId, targetAmount, agentAddress],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: redeemHash, timeout: 60000 });
        if (receipt.status === "reverted") {
          throw new Error("Settlement redeem transaction reverted on Somnia Shannon testnet.");
        }
        finalTxHash = receipt.transactionHash;
        console.log(`[DreamDexExecutor] Redemption confirmed on-chain: ${finalTxHash}`);
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
