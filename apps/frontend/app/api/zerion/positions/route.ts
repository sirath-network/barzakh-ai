import { NextRequest, NextResponse } from "next/server";
import { getZerionApiKey } from "@barzakh/shared/lib/utils/utils";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const chain = searchParams.get("chain");
  const currency = searchParams.get("currency") || "usd";

  if (!address) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  if (!chain) {
    return NextResponse.json(
      { error: "Chain ID is required" },
      { status: 400 }
    );
  }

  try {
    const zerionApiKey = getZerionApiKey();

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${zerionApiKey}`,
      },
    };

    // Call Zerion API to get wallet positions filtered by chain
    const url = `https://api.zerion.io/v1/wallets/${address}/positions/?filter[chain_ids]=${chain}&currency=${currency}&sort=value`;
    
    console.log("Fetching positions from:", url);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zerion API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch positions from Zerion" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Zerion positions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

