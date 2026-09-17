import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  registerAutoBot,
  getActiveAutoBots,
  setAutoBotActive,
  executeDueAutoBots,
} from "@/lib/agent/dreamdex-bot-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "4683c6be-d220-401b-b471-9bc61eb2e215";
    const bots = await getActiveAutoBots(userId);
    return NextResponse.json({ success: true, bots });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch bots" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "4683c6be-d220-401b-b471-9bc61eb2e215";
    const body = await request.json();
    const { action, botId, isActive, marketSymbol, side, amount, intervalMinutes, convictionThreshold, txHash } = body;

    if (action === "toggle") {
      if (!botId) return NextResponse.json({ success: false, error: "Missing botId" }, { status: 400 });
      const success = await setAutoBotActive(botId, isActive);
      return NextResponse.json({ success });
    }

    if (action === "execute_due") {
      const execResult = await executeDueAutoBots();
      return NextResponse.json({ success: true, ...execResult });
    }

    // Default: register / update bot
    const bot = await registerAutoBot({
      userId,
      marketSymbol: marketSymbol || "BTC-UP-5m",
      side: side || "buy_up",
      amount: parseFloat(amount) || 10,
      intervalMinutes: intervalMinutes || 5,
      convictionThreshold: convictionThreshold || 75,
      txHash,
    });

    return NextResponse.json({ success: true, bot });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process bot action" },
      { status: 500 }
    );
  }
}
