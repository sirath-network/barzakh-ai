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

    // Use filter[positions]=only_complex to get ONLY DeFi positions
    // This excludes simple token balances and returns LPs, staking, lending, rewards
    // filter[trash]=only_non_trash excludes spam/scam tokens
    // Reference: https://zerion.io/blog/how-to-fetch-multichain-defi-positions-for-wallet-with-zerion-api/
    // Added page[size] to limit response size
    const url = `https://api.zerion.io/v1/wallets/${address}/positions/?filter[positions]=only_complex&filter[trash]=only_non_trash&currency=${currency}&sort=value&page[size]=100`;

    console.log(`Fetching protocol positions for ${address} from ${url}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Zerion API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch protocol positions from Zerion: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const totalFetched = data.data?.length || 0;
    console.log(`Fetched ${totalFetched} protocol positions`);

    // With filter[positions]=only_complex, the API already returns ONLY DeFi positions
    // Log them for debugging
    if (data.data && Array.isArray(data.data)) {
      // Count position types for debugging
      const positionTypes = new Map<string, number>();
      const protocolNames = new Set<string>();
      
      data.data.forEach((position: any) => {
        const attrs = position.attributes || {};
        const positionType = attrs.position_type || position.type || 'unknown';
        const appMetadata = attrs.application_metadata;
        const protocolName = appMetadata?.name || attrs.protocol || 'Unknown';
        const chain = position.relationships?.chain?.data?.id || 'unknown';
        
        positionTypes.set(positionType, (positionTypes.get(positionType) || 0) + 1);
        protocolNames.add(protocolName);
        
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching Zerion protocol positions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

