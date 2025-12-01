import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

// Cache CRO price for 5 minutes to avoid excessive API calls
let cachedCroPrice: { price: number; timestamp: number } | null = null;
const CRO_PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCroUsdPrice(): Promise<number> {
  // Check cache first
  if (cachedCroPrice && Date.now() - cachedCroPrice.timestamp < CRO_PRICE_CACHE_TTL) {
    return cachedCroPrice.price;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=crypto-com-chain&vs_currencies=usd",
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );
    
    if (!response.ok) {
      console.error("Failed to fetch CRO price from CoinGecko");
      return cachedCroPrice?.price ?? 0.10; // Fallback to cached or default
    }

    const data = await response.json();
    const price = data["crypto-com-chain"]?.usd ?? 0.10;
    
    // Update cache
    cachedCroPrice = { price, timestamp: Date.now() };
    
    return price;
  } catch (error) {
    console.error("Error fetching CRO price:", error);
    return cachedCroPrice?.price ?? 0.10; // Fallback to cached or default $0.10
  }
}

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

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId, billingCycle } = await request.json();

  // Get USD price for the plan
  const usdPrice = PLAN_PRICES_USD[planId]?.[billingCycle] ?? 0;
  
  if (usdPrice === 0) {
    return NextResponse.json({ error: "Invalid plan or billing cycle" }, { status: 400 });
  }

  // Fetch current CRO/USD price
  const croUsdPrice = await getCroUsdPrice();
  
  // Calculate TCRO amount: USD price / CRO price
  const tcroAmount = usdPrice / croUsdPrice;
  
  // Round to 2 decimal places for cleaner display
  const tcroAmountRounded = Math.ceil(tcroAmount * 100) / 100;

  // Use a default test address if env var is not set
  const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535"; 

  return NextResponse.json(
    {
      error: "Payment Required",
      paymentDetails: {
        chainId: 338, // Cronos EVM Testnet
        chainName: "Cronos Testnet",
        receiver: receiverAddress,
        amount: tcroAmountRounded.toString(),
        currency: "TCRO",
        token: null, // Native token, no contract address
        isNativeToken: true,
        // Include USD info for display
        usdPrice: usdPrice,
        croUsdPrice: croUsdPrice,
      },
    },
    { status: 402 }
  );
}
