import { NextRequest, NextResponse } from "next/server";
import { fetchLiveTeams, fetchLiveMatches, fetchLiveGroups } from "@/lib/worldcup/worldcup-api";

export async function GET(req: NextRequest) {
  try {
    const [teams, matches, groups] = await Promise.all([
      fetchLiveTeams(),
      fetchLiveMatches(),
      fetchLiveGroups()
    ]);

    return NextResponse.json({
      success: true,
      teams,
      matches,
      groups
    });
  } catch (error: any) {
    console.error("GET /api/worldcup/live error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to load live World Cup data"
    }, { status: 500 });
  }
}
