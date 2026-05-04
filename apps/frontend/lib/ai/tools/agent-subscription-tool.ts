import { tool } from "ai";
import { z } from "zod";
import { isDelegatedAccessEnabled } from "@/lib/agent/dynamic-agent-wallet";
import { getDelegationCredentials } from "@/lib/agent/agent-wallet-store";
import { executeX402Payment } from "@/lib/agent/agent-payment-executor";
import { db } from "@/lib/db/db";
import { user, x402_transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createPaymentRequirements,
  BASE_NETWORKS,
  settlePayment,
  PaymentRequirements,
  PaymentPayloadV2,
} from "@barzakh/shared/lib/payments/x402-facilitator";
import crypto from "crypto";

const USDC_MAINNET_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const PLAN_PRICES_USD: Record<string, Record<string, number>> = {
  pro: {
    monthly: 25,
    quarterly: 66,
    yearly: 240,
  },
  ultimate: {
    monthly: 250,
    quarterly: 660,
    yearly: 2400,
  },
};

/**
 * Autonomous tool for AI Agent to upgrade, downgrade, or cancel subscriptions.
 * Works entirely server-side using the user's embedded wallet.
 */
export const createAutonomousSubscriptionTool = (userId: string) =>
  tool({
    description: "REQUIRED: Use this tool to autonomously subscribe, upgrade, downgrade, or cancel the user's Barzakh AI subscription plan. ONLY use this when the user has Agent Automation enabled. This will use their embedded EVM wallet to pay for the subscription via an x402 payment without requiring manual UI confirmation.",
    parameters: z.object({
      action: z.enum(["subscribe", "cancel"]).describe("Whether to subscribe (which covers upgrade/downgrade) or cancel."),
      planId: z.enum(["pro", "ultimate"]).optional().describe("The plan to subscribe to (required if action=subscribe)."),
      billingCycle: z.enum(["monthly", "quarterly", "yearly"]).optional().describe("The billing cycle (required if action=subscribe)."),
    }),
    execute: async ({ action, planId, billingCycle }) => {
      try {
        if (!isDelegatedAccessEnabled()) {
          return { error: "Agent automation is not available on this server." };
        }

        const credentials = await getDelegationCredentials(userId, "evm");
        if (!credentials) {
          return { error: "Agent automation is not enabled for EVM. Instruct the user to enable it in Settings -> Wallet Settings." };
        }

        // 1. Handle Cancellation
        if (action === "cancel") {
          const [dbUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
          if (dbUser && (dbUser.tier === "pro" || dbUser.tier === "ultimate")) {
            // Cancel at period end
            await db
              .update(user)
              .set({ x402CancelAtPeriodEnd: true })
              .where(eq(user.id, userId));
            return { success: true, message: "Subscription successfully canceled at the end of the current billing period." };
          }
          return { error: "No active subscription found to cancel." };
        }

        // 2. Handle Subscription / Upgrade / Downgrade
        if (action === "subscribe") {
          if (!planId || !billingCycle) {
            return { error: "planId and billingCycle are required to subscribe." };
          }

          const usdPrice = PLAN_PRICES_USD[planId]?.[billingCycle];
          if (usdPrice === undefined) {
            return { error: "Invalid planId or billingCycle." };
          }

          // Generate x402 requirements
          const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535";
          const paymentRequirements = createPaymentRequirements(receiverAddress, usdPrice, "mainnet", 300);

          // Generate EIP-3009 typed data
          const nonceArray = new Uint8Array(32);
          crypto.randomFillSync(nonceArray);
          const nonce = "0x" + Array.from(nonceArray).map(b => b.toString(16).padStart(2, "0")).join("");
          const now = Math.floor(Date.now() / 1000);
          const validBefore = (now + 300).toString(); // 5 minutes
          const value = (usdPrice * 1_000_000).toString(); // Convert to 6 decimals (USDC)

          const domain = {
            name: "USD Coin",
            version: "2",
            chainId: 8453, // Base Mainnet
            verifyingContract: USDC_MAINNET_ADDRESS as `0x${string}`,
          };

          const types = {
            TransferWithAuthorization: [
              { name: "from", type: "address" },
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
              { name: "validAfter", type: "uint256" },
              { name: "validBefore", type: "uint256" },
              { name: "nonce", type: "bytes32" },
            ],
          };

          const message = {
            from: credentials.walletAddress,
            to: paymentRequirements.payTo,
            value,
            validAfter: "0",
            validBefore,
            nonce,
          };

          // Ask the agent executor to sign and record the tx
          console.log(`[AgentSubscription] Autonomous subscription signing for ${planId} ${billingCycle}...`);
          const paymentResult = await executeX402Payment({
            userId,
            amount: usdPrice.toString(),
            planId,
            domain,
            types,
            message
          });

          if (!paymentResult.success || !paymentResult.transactionHash) {
            return { error: `Payment signing failed: ${paymentResult.error}` };
          }

          const signature = paymentResult.transactionHash;

          // Build V2 PaymentPayload object
          const paymentPayload: PaymentPayloadV2 = {
            x402Version: 2,
            accepted: paymentRequirements,
            payload: {
              authorization: {
                from: credentials.walletAddress,
                to: paymentRequirements.payTo,
                value: value,
                validAfter: 0,
                validBefore: parseInt(validBefore),
                nonce,
              },
              signature,
              asset: paymentRequirements.asset,
            },
          };

          // Settle the payment via the facilitator
          console.log(`[AgentSubscription] Settling payment on-chain...`);
          const settleResult = await settlePayment(paymentPayload, paymentRequirements);

          if (!settleResult.success) {
            console.error("[AgentSubscription] Settlement failed:", settleResult.error);
            const errorStr = String(settleResult.error).toLowerCase();
            
            if (errorStr.includes("exceeds balance") || errorStr.includes("insufficient funds") || errorStr.includes("transfer amount exceeds")) {
              return { error: `Insufficient USDC balance in your embedded wallet. You need at least $${usdPrice} USDC on Base network to proceed.` };
            }
            
            return { error: `Payment settlement failed on-chain: ${settleResult.error}` };
          }

          if (!settleResult.txHash || !/^0x[a-f0-9]{64}$/i.test(settleResult.txHash)) {
            return { error: "Invalid transaction hash received from facilitator." };
          }

          // Record successful transaction in DB
          await db.insert(x402_transactions).values({
            userId: userId,
            transactionHash: settleResult.txHash,
            chainId: 8453,
            amount: paymentRequirements.amount,
            tokenAddress: paymentRequirements.asset,
            senderAddress: credentials.walletAddress,
            planId: planId,
            billingCycle: billingCycle,
            status: "confirmed",
          });

          // Update user tier and limits
          const getDailyMessageLimit = (tier: string, cycle: string): number => {
            const cycleKey = cycle.toUpperCase();
            if (tier === "pro") {
              if (cycleKey === "YEARLY") return Number(process.env.PRO_YEARLY_USER_MESSAGE_LIMIT) || 150;
              if (cycleKey === "QUARTERLY") return Number(process.env.PRO_QUARTERLY_USER_MESSAGE_LIMIT) || 100;
              return Number(process.env.PRO_MONTHLY_USER_MESSAGE_LIMIT) || 50;
            } else if (tier === "ultimate") {
              if (cycleKey === "YEARLY") return Number(process.env.ULTIMATE_YEARLY_USER_MESSAGE_LIMIT) || 500;
              if (cycleKey === "QUARTERLY") return Number(process.env.ULTIMATE_QUARTERLY_USER_MESSAGE_LIMIT) || 350;
              return Number(process.env.ULTIMATE_MONTHLY_USER_MESSAGE_LIMIT) || 250;
            }
            return Number(process.env.FREE_USER_MESSAGE_LIMIT) || 10;
          };

          const newDailyLimit = getDailyMessageLimit(planId, billingCycle);

          const calculatePeriodEnd = (cycle: string): Date => {
            const now = new Date();
            switch (cycle.toLowerCase()) {
              case "yearly": return new Date(now.setFullYear(now.getFullYear() + 1));
              case "quarterly": return new Date(now.setMonth(now.getMonth() + 3));
              case "monthly":
              default: return new Date(now.setMonth(now.getMonth() + 1));
            }
          };

          const periodEnd = calculatePeriodEnd(billingCycle);

          await db
            .update(user)
            .set({
              tier: planId,
              billingCycle: billingCycle,
              dailyMessageRemaining: newDailyLimit,
              x402CancelAtPeriodEnd: false,
              x402PeriodEnd: periodEnd,
            })
            .where(eq(user.id, userId));

          return {
            success: true,
            message: `Autonomous subscription execution completed successfully WITHOUT manual UI!`,
            txHash: settleResult.txHash,
            explorerUrl: `https://basescan.org/tx/${settleResult.txHash}`,
            isAgentExecution: true,
            planId,
            billingCycle,
            _instructionToAI: "CRITICAL: A rich UI card is ALREADY safely rendering to the user! DO NOT PRINT ANY transaction hashes, block explorer URLs, or data tables! Keep your text output to an absolute maximum of 1 short sentence, e.g. 'Successfully upgraded your subscription using your agent wallet.'"
          };
        }

        return { error: "Unknown action." };
      } catch (error: any) {
        console.error("[AgentSubscription] Error:", error);
        return { error: error.message || "Failed to execute subscription change." };
      }
    },
  });
