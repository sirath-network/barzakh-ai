import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  createPaymentRequirements,
  CRONOS_NETWORKS,
  usdToUsdcUnits,
} from "@barzakh/shared/lib/payments/x402-facilitator";

// USD prices for each plan and billing cycle
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
 * POST /api/billing/x402/subscribe
 * 
 * Returns HTTP 402 Payment Required with x402-compliant payment requirements.
 * Client should sign an EIP-3009 authorization and submit via /verify and /settle.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId, billingCycle, useMainnet = false } = await request.json();

  // Get USD price for the plan
  const usdPrice = PLAN_PRICES_USD[planId]?.[billingCycle] ?? 0;

  if (usdPrice === 0) {
    return NextResponse.json({ error: "Invalid plan or billing cycle" }, { status: 400 });
  }

  // Use mainnet or testnet based on request (default: testnet for hackathon)
  const network = useMainnet ? "mainnet" : "testnet";
  const config = CRONOS_NETWORKS[network];

  // Get receiver address from env or use default test address
  const receiverAddress =
    process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS ||
    "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535";

  // Create x402-compliant payment requirements with description
  const description = `Barzakh AI ${planId.toUpperCase()} Plan - ${billingCycle} subscription`;
  const paymentRequirements = createPaymentRequirements(
    receiverAddress,
    usdPrice,
    network,
    300, // 5 minutes timeout
    description,
    "application/json"
  );

  // Return 402 Payment Required with x402 format
  return NextResponse.json(
    {
      error: "Payment Required",
      x402Version: 1,
      paymentRequirements,
      // Additional display info for the UI
      displayInfo: {
        usdPrice,
        usdcAmount: (usdPrice).toFixed(2),
        usdcSymbol: config.usdcSymbol,
        chainName: network === "mainnet" ? "Cronos Mainnet" : "Cronos Testnet",
        chainId: config.chainId,
        receiver: receiverAddress,
        tokenAddress: config.usdcAddress,
        decimals: config.usdcDecimals,
        // Gasless info
        isGasless: true,
        note: "This payment is gasless - you don't need CRO for gas fees!",
      },
    },
    { status: 402 }
  );
}
