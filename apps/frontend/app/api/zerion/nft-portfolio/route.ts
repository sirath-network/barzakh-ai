import { NextRequest, NextResponse } from "next/server";
import { getZerionApiKey } from "@barzakh/shared/lib/utils/utils";

export async function GET(request: NextRequest) {
  // No auth required - this is public on-chain data
  // Allows guests to view portfolio data in shared chats

  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get("address");
  const currency = searchParams.get("currency") || "usd";

  if (!address) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  try {
    let zerionApiKey: string;
    try {
      zerionApiKey = getZerionApiKey();
    } catch {
      // If Zerion API key is missing or not configured, return empty data gracefully
      return NextResponse.json({ data: null });
    }

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${zerionApiKey}`,
      },
    };

    // Fetch NFT portfolio overview
    // Reference: https://developers.zerion.io/reference/getwalletnftportfolio
    const url = `https://api.zerion.io/v1/wallets/${address}/nft-portfolio/?currency=${currency}`;

    const response = await fetch(url, options);

    if (response.status === 202) {
      // 202 means data is being prepared
      return NextResponse.json(
        { message: "Data is being prepared", status: "processing" },
        { status: 202 }
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.errors?.[0]?.detail || "Failed to fetch NFT portfolio from Zerion";
      console.warn("Zerion NFT portfolio API returned status:", response.status, errorMessage);
      return NextResponse.json(
        { error: errorMessage, data: null },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching Zerion NFT portfolio:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error", data: null },
      { status: 500 }
    );
  }
}
