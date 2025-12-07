import { NextRequest, NextResponse } from "next/server";
import { getZerionApiKey } from "@barzakh/shared/lib/utils/utils";
import { auth } from "@/app/(auth)/auth";

export async function GET(request: NextRequest) {
  // SECURITY: Require authentication to prevent API key abuse
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const zerionApiKey = getZerionApiKey();

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${zerionApiKey}`,
      },
    };

    // Fetch NFT positions
    // Reference: https://developers.zerion.io/reference/listwalletnftpositions
    const url = `https://api.zerion.io/v1/wallets/${address}/nft-positions/?currency=${currency}`;

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zerion API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch NFT positions from Zerion" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Zerion NFT positions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
