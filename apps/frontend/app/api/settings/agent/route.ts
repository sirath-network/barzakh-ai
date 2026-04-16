/**
 * Agent Automation Settings API
 * 
 * GET  /api/settings/agent — Get agent automation status, spend limits, recent txs
 * POST /api/settings/agent — Update spend limits or revoke delegation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  hasDelegation,
  getUserAgentWalletAddress,
  getRecentTransactions,
  get24hSpend,
  revokeDelegation,
} from "@/lib/agent/agent-wallet-store";
import { isDelegatedAccessEnabled } from "@/lib/agent/dynamic-agent-wallet";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isEnabled = await hasDelegation(userId);
    const walletAddress = await getUserAgentWalletAddress(userId);

    const recentTxs = await getRecentTransactions(userId, 10);
    const spent24h = await get24hSpend(userId);

    return NextResponse.json({
      agentEnabled: isEnabled,
      serverConfigured: isDelegatedAccessEnabled(),
      walletAddress,

      spent24h,
      recentTransactions: recentTxs.map((tx) => ({
        id: tx.id,
        type: tx.operationType,
        amount: tx.amount,
        signature: tx.signature,
        metadata: tx.metadata,
        createdAt: tx.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[API] Agent settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Handle revoke delegation
    if (body.action === "revoke") {
      const revoked = await revokeDelegation(userId);
      return NextResponse.json({
        success: revoked,
        message: revoked
          ? "Agent automation has been disabled"
          : "No active delegation found",
      });
    }

    // Handle enable agent automation
    if (body.action === "enable") {
      const walletAddress = await getUserAgentWalletAddress(userId);
      if (!walletAddress) {
        return NextResponse.json({
          success: false,
          message: "Create an agent wallet first",
        }, { status: 400 });
      }
      const { enableAgentAutomation } = await import("@/lib/agent/agent-wallet-store");
      await enableAgentAutomation(userId, walletAddress);
      return NextResponse.json({
        success: true,
        message: "Agent automation enabled",
      });
    }



    // Handle create agent wallet (server-side generation)
    if (body.action === "create_agent_wallet") {
      const { createAgentWallet } = await import("@/lib/agent/agent-wallet-store");
      const existing = await getUserAgentWalletAddress(userId);
      if (existing) {
        return NextResponse.json({
          success: true,
          walletAddress: existing,
          message: "Agent wallet already exists",
        });
      }
      const walletAddress = await createAgentWallet(userId);
      return NextResponse.json({
        success: true,
        walletAddress,
        message: "Agent wallet created",
      });
    }

    // Handle register embedded wallet address (manual override)
    if (body.action === "register_embedded_wallet") {
      const { walletAddress } = body;
      if (!walletAddress || typeof walletAddress !== "string") {
        return NextResponse.json(
          { error: "walletAddress is required" },
          { status: 400 }
        );
      }
      const { registerEmbeddedWallet } = await import("@/lib/agent/agent-wallet-store");
      await registerEmbeddedWallet(userId, walletAddress);
      return NextResponse.json({
        success: true,
        walletAddress,
        message: "Embedded wallet registered",
      });
    }

    // Handle export wallet
    if (body.action === "export_wallet") {
      const { getAgentPrivateKey } = await import("@/lib/agent/agent-wallet-store");
      const privateKey = await getAgentPrivateKey(userId);
      if (!privateKey) {
        return NextResponse.json({
          success: false,
          message: "Agent wallet not found",
        }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        privateKey,
        message: "Wallet exported successfully",
      });
    }

    return NextResponse.json(
      { error: "Unknown action." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API] Agent settings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
