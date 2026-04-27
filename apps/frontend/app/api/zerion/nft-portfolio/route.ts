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
      console.error("Zerion API error:", response.status, errorData);
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Zerion NFT portfolio:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
