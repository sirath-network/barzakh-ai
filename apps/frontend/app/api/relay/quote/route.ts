import { NextResponse } from "next/server";
import { createClient } from "@relayprotocol/relay-sdk";

const RELAY_API_KEY = process.env.RELAY_API_KEY || "";

let relayClient: any = null;

function getRelayClient() {
  if (!relayClient) {
    relayClient = createClient({
      baseApiUrl: "https://api.relay.link",
      source: "barzakh-ai",
      ...(RELAY_API_KEY ? { apiKey: RELAY_API_KEY } : {}),
    });
  }
  return relayClient;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      chainId,
      toChainId,
      currency,
      toCurrency,
      amount,
      user,
      recipient,
      tradeType = "EXACT_INPUT",
    } = body;

    if (!chainId || !toChainId || !currency || !toCurrency || !amount || !user) {
      return NextResponse.json(
        { error: "Missing required quote parameters." },
        { status: 400 }
      );
    }

    const client = getRelayClient();
    const txQuote = await client.actions.getQuote({
      chainId,
      toChainId,
      currency,
      toCurrency,
      amount: String(amount),
      tradeType,
      user,
      recipient: recipient || user,
    });

    return NextResponse.json(txQuote);
  } catch (error: any) {
    console.error("[RelayQuote API] Failed to fetch quote:", error);
    const errorMessage =
      error.rawError?.message ||
      error.message ||
      "Failed to fetch executable quote from Relay.";
    return NextResponse.json(
      { error: errorMessage },
      { status: error.statusCode || 500 }
    );
  }
}
