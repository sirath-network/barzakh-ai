import { NextResponse } from "next/server";
import { createPublicClient, formatUnits, http } from "viem";
import { auth } from "@/app/(auth)/auth";
import { getUserAgentWalletAddress } from "@/lib/agent/agent-wallet-store";
import { SOMNIA_TESTNET_CHAIN } from "@barzakh/shared/lib/ai/tools/dreamdex/sdk-client";

const TUSDC = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E" as const;
const balanceOfAbi = [{
  name: "balanceOf",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "balance", type: "uint256" }],
}] as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const address = await getUserAgentWalletAddress(session.user.id, "evm");
  if (!address) return NextResponse.json({ error: "Agent wallet not found" }, { status: 404 });

  const client = createPublicClient({ chain: SOMNIA_TESTNET_CHAIN, transport: http("https://dream-rpc.somnia.network") });
  const balance = await client.readContract({
    address: TUSDC,
    abi: balanceOfAbi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  });

  return NextResponse.json({ balance: formatUnits(balance, 6) });
}
