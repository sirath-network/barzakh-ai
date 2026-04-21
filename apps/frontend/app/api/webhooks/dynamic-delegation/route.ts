/**
 * Dynamic Webhook Receiver
 * 
 * POST /api/webhooks/dynamic-delegation
 * 
 * Endpoint URL for Dynamic Dashboard:
 *   Production: https://yourdomain.com/api/webhooks/dynamic-delegation
 *   Local dev:  https://your-ngrok.ngrok.io/api/webhooks/dynamic-delegation
 * 
 * Enable these webhook events in Dynamic Dashboard → Developers → Webhooks:
 *   - wallet.delegation.created  (receives delegation credentials)
 *   - wallet.delegation.revoked  (syncs revocation)
 *   - wallet.delegation.signature (audit trail)
 *   - wallet.created             (tracks embedded wallet creation)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  storeDelegationCredentials,
  revokeDelegation,
  recordAgentTransaction,
} from "@/lib/agent/agent-wallet-store";
import type { DelegationCredentials } from "@/lib/agent/dynamic-agent-wallet";

// ─── Signature Verification ─────────────────────────────────────────────────

function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const webhookSecret = process.env.DYNAMIC_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret) {
      const signature = request.headers.get("x-dynamic-signature");
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.warn("[Webhook] Invalid signature — rejecting request");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    }

    const body = JSON.parse(rawBody);
    const eventType = body.eventName || body.event || body.type;

    console.log(`[Webhook] Received Dynamic event: ${eventType}`);

    switch (eventType) {
      // ── wallet.delegation.created ─────────────────────────────────────
      // User approved agent delegation. Dynamic sends us signing credentials.
      case "wallet.delegation.created": {
        const data = body.data || body;
        const {
          walletId,
          walletApiKey,
          keyShare,
          userId,
          walletPublicKey,
          address,
          chain,
        } = data;

        if (!walletId || !walletApiKey || !keyShare) {
          console.error("[Webhook] Missing delegation credentials in payload");
          return NextResponse.json(
            { error: "Missing required delegation fields" },
            { status: 400 }
          );
        }

        const credentials: DelegationCredentials = {
          walletId,
          walletApiKey,
          keyShare,
          walletAddress: address || walletPublicKey || "",
          chain: chain === "SOL" || chain === "SVM" ? "svm" : "evm",
          userId: userId || data.user?.id || "",
          delegatedAt: new Date(),
        };

        await storeDelegationCredentials(credentials);

        console.log(
          `[Webhook] ✅ Delegation stored: user=${credentials.userId} wallet=${credentials.walletAddress?.slice(0, 10)}...`
        );

        return NextResponse.json({
          success: true,
          message: "Delegation credentials stored",
        });
      }

      // ── wallet.delegation.revoked ─────────────────────────────────────
      // User revoked delegation from Dynamic's side (or our UI).
      case "wallet.delegation.revoked": {
        const data = body.data || body;
        const userId = data.userId || data.user?.id;

        if (userId) {
          await revokeDelegation(userId);
          console.log(`[Webhook] ✅ Delegation revoked for user=${userId}`);
        }

        return NextResponse.json({
          success: true,
          message: "Delegation revoked",
        });
      }

      // ── wallet.delegation.signature ───────────────────────────────────
      // A delegated signature was performed. Log for audit.
      case "wallet.delegation.signature": {
        const data = body.data || body;
        console.log(
          `[Webhook] 📝 Delegated signature recorded: user=${data.userId || "unknown"} type=${data.signatureType || "unknown"}`
        );

        // Optional: record in our audit log if we want server-side tracking
        // beyond what agent-payment-executor already logs
        return NextResponse.json({ success: true });
      }

      // ── wallet.created ────────────────────────────────────────────────
      // User's embedded wallet was created. We can track this for display.
      case "wallet.created": {
        const data = body.data || body;
        console.log(
          `[Webhook] 🔑 Embedded wallet created: user=${data.userId || data.user?.id || "unknown"} address=${data.address || "unknown"} chain=${data.chain || "unknown"}`
        );

        return NextResponse.json({ success: true });
      }

      default: {
        // Acknowledge unknown events gracefully (Dynamic expects 200)
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
        return NextResponse.json({ success: true, message: "Event acknowledged" });
      }
    }
  } catch (error: any) {
    console.error("[Webhook] Error processing Dynamic webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
