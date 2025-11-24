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
  const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0xd4100f16dbc770f5247dc3251d61b4a48c34f630"; 
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

  return NextResponse.json(
    {
      error: "Payment Required",
      paymentDetails: {
        chainId: 84532, // Base Sepolia
        chainName: "Base Sepolia",
        receiver: receiverAddress,
        amount: amount,
        currency: "USDC",
        token: usdcAddress,
      },
    },
    { status: 402 }
  );
}
