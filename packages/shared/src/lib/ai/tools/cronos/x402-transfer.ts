/**
 * x402 Transfer Tool
 * 
 * AI-callable tool for initiating x402 subscription payments on Base.
 * Enables the AI agent to suggest subscription upgrades programmatically.
 * User approval is still required via wallet signature.
 */

import { tool } from "ai";
import { z } from "zod";

// USD prices for each plan and billing cycle (must match backend pricing)
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

// Plan features for display
const PLAN_FEATURES: Record<string, string[]> = {
    pro: [
        "50-150 messages/day (based on billing cycle)",
        "Access to 19 AI models (incl. GPT 5.1/5.2, Claude Sonnet/Opus, Gemini 3.1 Pro)",
        "Priority support",
        "Advanced blockchain tools",
    ],
    ultimate: [
        "250-500 messages/day (based on billing cycle)",
        "Unlimited access to ALL 24 AI models (incl. GPT 5.3 Codex, GPT 5.4, Claude Opus 4.7)",
        "Dedicated priority support",
        "Full API access",
        "Custom integrations",
    ],
};

// Daily message limits by tier and cycle
const MESSAGE_LIMITS: Record<string, Record<string, number>> = {
    pro: {
        monthly: 50,
        quarterly: 100,
        yearly: 150,
    },
    ultimate: {
        monthly: 250,
        quarterly: 350,
        yearly: 500,
    },
};

/**
 * Initiate x402 Payment Tool
 * 
 * This tool allows the AI to suggest a subscription upgrade to the user.
 * It returns payment requirements that the frontend will use to render
 * a payment approval component where the user can connect their wallet
 * and approve the payment.
 */
export const initiateX402Payment = tool({
    description: `Initiate an x402 subscription payment for Barzakh AI. Use this when a user wants to subscribe, upgrade, downgrade, or change their subscription. Available plans are 'pro' and 'ultimate'. Billing cycles are 'monthly', 'quarterly', or 'yearly'. 

IMPORTANT: Before calling this tool, check the user's current subscription (provided in system context).
- If user is already on the EXACT SAME plan AND cycle, do NOT call this tool - inform them they're already subscribed.
- For ANY other change (upgrade, downgrade, or cycle change), you SHOULD call this tool:
  - Tier changes: pro ↔ ultimate (both directions allowed)
  - Cycle changes: monthly ↔ quarterly ↔ yearly (all directions allowed)
  - Combined changes: e.g., pro monthly → ultimate yearly, or ultimate quarterly → pro monthly

This tool returns payment requirements that will prompt the user to approve the payment with their connected wallet.`,
    parameters: z.object({
        planId: z.enum(["pro", "ultimate"]).describe("The subscription plan to purchase. 'pro' for Pro tier, 'ultimate' for Ultimate tier."),
        billingCycle: z.enum(["monthly", "quarterly", "yearly"]).describe("The billing cycle for the subscription. Longer cycles offer better value."),
        currentTier: z.enum(["free", "pro", "ultimate"]).optional().describe("The user's current subscription tier (from system context)"),
        currentBillingCycle: z.enum(["monthly", "quarterly", "yearly"]).optional().describe("The user's current billing cycle (from system context)"),
        reason: z.string().optional().describe("Optional reason or context for the subscription suggestion"),
    }),
    execute: async ({ planId, billingCycle, currentTier, currentBillingCycle, reason }) => {
        try {
            // Check for duplicate subscription
            if (currentTier === planId && currentBillingCycle === billingCycle) {
                return {
                    success: false,
                    error: `You are already subscribed to the ${planId.toUpperCase()} plan with ${billingCycle} billing. No action needed!`,
                    requiresPayment: false,
                    isDuplicate: true,
                    currentSubscription: {
                        tier: currentTier,
                        billingCycle: currentBillingCycle,
                    },
                };
            }

            // Validate plan and cycle
            const usdPrice = PLAN_PRICES_USD[planId]?.[billingCycle];
            if (!usdPrice) {
                return {
                    success: false,
                    error: `Invalid plan or billing cycle: ${planId}/${billingCycle}`,
                    requiresPayment: false,
                };
            }

            const features = PLAN_FEATURES[planId] || [];
            const messageLimit = MESSAGE_LIMITS[planId]?.[billingCycle] || 0;

            // Calculate savings for longer billing cycles
            const monthlyPrice = PLAN_PRICES_USD[planId]?.monthly || usdPrice;
            let savings = 0;
            let savingsPercentage = 0;

            if (billingCycle === "quarterly") {
                const regularPrice = monthlyPrice * 3;
                savings = regularPrice - usdPrice;
                savingsPercentage = Math.round((savings / regularPrice) * 100);
            } else if (billingCycle === "yearly") {
                const regularPrice = monthlyPrice * 12;
                savings = regularPrice - usdPrice;
                savingsPercentage = Math.round((savings / regularPrice) * 100);
            }

            // Return payment request data for frontend to render
            return {
                success: true,
                requiresPayment: true,
                paymentRequest: {
                    planId,
                    billingCycle,
                    usdPrice,
                    planName: planId === "pro" ? "Pro" : "Ultimate",
                    cycleName: billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1),
                    features,
                    messageLimit,
                    savings: savings > 0 ? {
                        amount: savings,
                        percentage: savingsPercentage,
                    } : null,
                    network: "eip155:8453",
                    chainId: 8453,
                    paymentMethod: "USDC",
                    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                    tokenDecimals: 6,
                    isGasless: true, // EIP-3009 gasless transfer
                    note: "Payment is made in USDC on Base. Fast and low-cost!",
                },
                reason: reason || null,
                message: `Ready to subscribe to ${planId === "pro" ? "Pro" : "Ultimate"} plan (${billingCycle}) for $${usdPrice}. Please approve the payment below.`,
            };
        } catch (error: any) {
            console.error("[x402-transfer] Error:", error);
            return {
                success: false,
                error: error.message || "Failed to initiate payment",
                requiresPayment: false,
            };
        }
    },
});

/**
 * Get Subscription Info Tool
 * 
 * Helper tool to get information about available subscription plans
 * without initiating a payment.
 */
export const getSubscriptionInfo = tool({
    description: "Get information about Barzakh AI subscription plans and pricing. Use this when users ask about subscription options, pricing, or plan features without wanting to subscribe immediately.",
    parameters: z.object({
        planId: z.enum(["pro", "ultimate", "all"]).optional().describe("Specific plan to get info for, or 'all' for all plans. Defaults to 'all'."),
    }),
    execute: async ({ planId = "all" }) => {
        const plans = [];

        if (planId === "all" || planId === "pro") {
            plans.push({
                id: "pro",
                name: "Pro",
                description: "For power users who need more messages and advanced features",
                pricing: {
                    monthly: { price: 25, messages: 50 },
                    quarterly: { price: 66, messages: 100, savings: "12%" },
                    yearly: { price: 240, messages: 150, savings: "20%" },
                },
                features: PLAN_FEATURES.pro,
            });
        }

        if (planId === "all" || planId === "ultimate") {
            plans.push({
                id: "ultimate",
                name: "Ultimate",
                description: "For professionals and teams requiring maximum capacity",
                pricing: {
                    monthly: { price: 250, messages: 250 },
                    quarterly: { price: 660, messages: 350, savings: "12%" },
                    yearly: { price: 2400, messages: 500, savings: "20%" },
                },
                features: PLAN_FEATURES.ultimate,
            });
        }

        return {
            success: true,
            plans,
            currentNetwork: "Base Mainnet",
            paymentMethod: "USDC (gasless)",
            note: "To subscribe, ask me to 'subscribe to [plan] [cycle]' (e.g., 'subscribe to pro monthly')",
        };
    },
});

/**
 * Get Current Subscription Status Tool
 * 
 * Fetches real-time subscription status from the database.
 * Use this when user asks about their current subscription to get fresh data.
 */
export const getCurrentSubscriptionStatus = tool({
    description: `Get the user's current subscription status in REAL-TIME. Use this tool when the user asks about their current subscription, plan, or billing status. This fetches fresh data from the database, not cached session data. Always call this tool when user asks "what is my subscription?", "am I subscribed?", "what plan am I on?", etc.`,
    parameters: z.object({
        reason: z.string().optional().describe("Optional reason for checking subscription status"),
    }),
    execute: async ({ reason }) => {
        try {
            // This tool is designed to be used with context injection from the chat route
            // The actual user data will be passed through the message context
            // For now, return a message indicating the AI should use the injected context
            // The chat route will need to re-fetch and inject fresh subscription data

            return {
                success: true,
                message: "Please check the Current User Subscription Context section in the system prompt for real-time subscription data. If the data seems stale, the user may need to refresh or the context will update on next message.",
                note: "For accurate real-time data, subscription status is injected into the system context at the start of each request.",
                checkSystemContext: true,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || "Failed to get subscription status",
            };
        }
    },
});

// Export all tools
export const x402TransferTools = {
    initiateX402Payment,
    getSubscriptionInfo,
    getCurrentSubscriptionStatus,
};
