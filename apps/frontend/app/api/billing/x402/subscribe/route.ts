import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId, billingCycle } = await request.json();

  // Calculate amount based on plan and billing cycle
  let amount = "0";
  
  if (planId === "pro") {
    if (billingCycle === "monthly") amount = "25";
    else if (billingCycle === "quarterly") amount = "66";
    else if (billingCycle === "yearly") amount = "240";
  } else if (planId === "ultimate") {
    if (billingCycle === "monthly") amount = "250";
    else if (billingCycle === "quarterly") amount = "660";
    else if (billingCycle === "yearly") amount = "2400";
  }

  // Use a default test address if env var is not set
  const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535"; 
  const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC

  return NextResponse.json(
    {
      error: "Payment Required",
      paymentDetails: {
        chainId: 8453, // Base Mainnet
        chainName: "Base",
        receiver: receiverAddress,
        amount: amount,
        currency: "USDC",
        token: usdcAddress,
      },
    },
    { status: 402 }
  );
}
