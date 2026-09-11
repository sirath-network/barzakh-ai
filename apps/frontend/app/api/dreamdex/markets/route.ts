import { NextResponse } from "next/server";
import { dreamDexApi } from "@barzakh/shared/lib/ai/tools/dreamdex/api-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bypassCache = searchParams.get("refresh") === "true" || searchParams.has("_t");
    const markets = await dreamDexApi.getEventContractMarkets(bypassCache);
    return NextResponse.json({
      success: true,
      markets,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[MarketsRoute] Error fetching markets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
