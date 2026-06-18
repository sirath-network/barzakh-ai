/**
 * Agent Automation Settings API (Multi-Chain)
 * 
 * GET  /api/settings/agent — Get agent automation status, wallets, spend, recent txs
 * POST /api/settings/agent — Create/delete wallets, enable/disable automation per chain
 */

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  hasDelegation,
  getUserAgentWalletAddress,
  getAllUserWallets,
  getRecentTransactions,
  get24hSpend,
  revokeDelegation,
} from "@/lib/agent/agent-wallet-store";
import type { WalletChain } from "@/lib/agent/agent-wallet-store";
import { isDelegatedAccessEnabled } from "@/lib/agent/dynamic-agent-wallet";
import { buildSuiVisionUrl } from "@/lib/agent/sui-agent-executor";
import * as allChains from "viem/chains";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch per-chain status
    const [evmEnabled, solanaEnabled, suiEnabled] = await Promise.all([
      hasDelegation(userId, "evm"),
      hasDelegation(userId, "solana"),
      hasDelegation(userId, "sui"),
    ]);
    const isEnabled = evmEnabled || solanaEnabled || suiEnabled;

    // Get all wallets for the user
    const wallets = await getAllUserWallets(userId);

    // Legacy: single walletAddress field (EVM) for backward compatibility
    const evmWallet = wallets.find(w => w.chain === "evm");
    const solanaWallet = wallets.find(w => w.chain === "solana");
    const suiWallet = wallets.find(w => w.chain === "sui");

    const recentTxs = await getRecentTransactions(userId, 10);
    const spent24h = await get24hSpend(userId);

    return NextResponse.json({
      agentEnabled: isEnabled,
      evmEnabled,
      solanaEnabled,
      suiEnabled,
      serverConfigured: isDelegatedAccessEnabled(),
      // Legacy single address (EVM first, then Solana)
      walletAddress: evmWallet?.walletAddress || solanaWallet?.walletAddress || suiWallet?.walletAddress || null,
      // Multi-chain wallet data
      wallets: wallets.map(w => ({
        walletAddress: w.walletAddress,
        chain: w.chain,
        createdAt: w.createdAt.toISOString(),
      })),
      evmWalletAddress: evmWallet?.walletAddress || null,
      solanaWalletAddress: solanaWallet?.walletAddress || null,
      suiWalletAddress: suiWallet?.walletAddress || null,

      spent24h,
      recentTransactions: recentTxs.map((tx) => {
        let explorerBase = "https://etherscan.io/tx";
        let chainName = "EVM";
        const chainId = (tx.metadata as any)?.chainId;
        const isSolana = (tx.metadata as any)?.chain === "solana";
        const isSui = (tx.metadata as any)?.chain === "sui";
        
        if (isSui) {
          const network = ((tx.metadata as any)?.network || "testnet") as "mainnet" | "testnet" | "devnet";
          chainName = `Sui ${String(network).charAt(0).toUpperCase()}${String(network).slice(1)}`;
        } else if (isSolana) {
          explorerBase = "https://solscan.io/tx";
          chainName = "Solana";
        } else if (chainId === 5042002) {
          explorerBase = "https://testnet.arcscan.app/tx"; // Arc Testnet
          chainName = "Arc Testnet";
        } else if (chainId) {
          const matchedChain = Object.values(allChains).find((c: any) => c.id === chainId) as any;
          if (matchedChain) {
            chainName = matchedChain.name;
            if (matchedChain.blockExplorers?.default?.url) {
              explorerBase = `${matchedChain.blockExplorers.default.url}/tx`;
            }
          }
        }
        
        return {
          id: tx.id,
          type: tx.operationType,
          amount: tx.amount,
          signature: tx.signature,
          metadata: tx.metadata,
          explorerUrl: isSui
            ? buildSuiVisionUrl({
                kind: "txblock",
                id: tx.signature,
                network: (((tx.metadata as any)?.network || "testnet") as "mainnet" | "testnet" | "devnet"),
              })
            : `${explorerBase}/${tx.signature}`,
          chainName,
          createdAt: tx.createdAt.toISOString(),
        };
      }),
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
    const chain: WalletChain = body.chain || "evm";

    // Validate chain parameter
    if (!["evm", "solana", "sui"].includes(chain)) {
      return NextResponse.json(
        { error: "Invalid chain. Must be 'evm', 'solana', or 'sui'." },
        { status: 400 }
      );
    }

    // Handle revoke delegation
    if (body.action === "revoke") {
      const revoked = await revokeDelegation(userId, chain);
      return NextResponse.json({
        success: revoked,
        message: revoked
          ? `Agent automation has been disabled for ${chain.toUpperCase()}`
          : "No active delegation found",
      });
    }

    // Handle enable agent automation
    if (body.action === "enable") {
      const walletAddress = await getUserAgentWalletAddress(userId, chain);
      if (!walletAddress) {
        return NextResponse.json({
          success: false,
          message: `Create a ${chain.toUpperCase()} agent wallet first`,
        }, { status: 400 });
      }
      const { enableAgentAutomation } = await import("@/lib/agent/agent-wallet-store");
      await enableAgentAutomation(userId, walletAddress, chain);
      return NextResponse.json({
        success: true,
        message: `Agent automation enabled for ${chain.toUpperCase()}`,
      });
    }



    // Handle create agent wallet (server-side generation)
    if (body.action === "create_agent_wallet") {
      const { createAgentWallet } = await import("@/lib/agent/agent-wallet-store");
      const existing = await getUserAgentWalletAddress(userId, chain);
      if (existing) {
        return NextResponse.json({
          success: true,
          walletAddress: existing,
          chain,
          message: `${chain.toUpperCase()} agent wallet already exists`,
        });
      }
      const walletAddress = await createAgentWallet(userId, chain);
      return NextResponse.json({
        success: true,
        walletAddress,
        chain,
        message: `${chain.toUpperCase()} agent wallet created`,
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
      await registerEmbeddedWallet(userId, walletAddress, chain);
      return NextResponse.json({
        success: true,
        walletAddress,
        chain,
        message: "Embedded wallet registered",
      });
    }

    // Handle delete wallet (revokes delegation + removes wallet)
    if (body.action === "delete_wallet") {
      const { deleteAgentWallet } = await import("@/lib/agent/agent-wallet-store");
      const existing = await getUserAgentWalletAddress(userId, chain);
      if (!existing) {
        return NextResponse.json({
          success: false,
          message: `No ${chain.toUpperCase()} agent wallet found to delete`,
        }, { status: 404 });
      }
      await deleteAgentWallet(userId, chain);
      return NextResponse.json({
        success: true,
        message: `${chain.toUpperCase()} agent wallet deleted successfully. Automation has been disabled.`,
      });
    }

    // Handle export wallet
    if (body.action === "export_wallet") {
      const { getAgentPrivateKey } = await import("@/lib/agent/agent-wallet-store");
      const privateKey = await getAgentPrivateKey(userId, chain);
      if (!privateKey) {
        return NextResponse.json({
          success: false,
          message: `${chain.toUpperCase()} agent wallet not found`,
        }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        privateKey,
        chain,
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
