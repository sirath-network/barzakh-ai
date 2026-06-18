import { NextRequest, NextResponse } from "next/server";

import { submitWormholeSuiSdkTransfer } from "@/lib/agent/wormhole-sui-sdk-adapter";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized Wormhole adapter request." }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.WORMHOLE_SUI_BRIDGE_EXECUTOR_ADAPTER_TOKEN;
  if (!expectedToken) {
    return NextResponse.json(
      { success: false, error: "Wormhole adapter token is not configured server-side." },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (token !== expectedToken) return unauthorized();

  if (process.env.WORMHOLE_SUI_BRIDGE_ENABLE_WRITES !== "true") {
    return NextResponse.json(
      { success: false, error: "WORMHOLE_SUI_BRIDGE_ENABLE_WRITES is not enabled." },
      { status: 403 },
    );
  }

  const body = await req.json();
  if (body?.plan?.network === "Mainnet" && process.env.WORMHOLE_SUI_BRIDGE_ENABLE_MAINNET_WRITES !== "true") {
    return NextResponse.json(
      { success: false, error: "WORMHOLE_SUI_BRIDGE_ENABLE_MAINNET_WRITES is not enabled." },
      { status: 403 },
    );
  }

  try {
    const result = await submitWormholeSuiSdkTransfer(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Wormhole SDK adapter failed." },
      { status: 400 },
    );
  }
}
