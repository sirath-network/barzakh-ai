import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUserById, updateUserWalrusMemoryBlobId } from "@/lib/db/queries";
import { getWalrusBlob, uploadToWalrus } from "@barzakh/shared/lib/ai/tools/sui/walrus-tools";
import { fetchLiveMatches } from "@/lib/worldcup/worldcup-api";

/**
 * Auto-resolve pending predictions against finished match results.
 * Compares each pending prediction's pick against the actual scoreline
 * and sets status to "correct" or "incorrect".
 */
function resolvePendingPredictions(
  predictions: any[],
  finishedMatches: any[],
  allMatches: any[]
): { updated: boolean; predictions: any[] } {
  let updated = false;

  const resolvedPredictions = predictions.map((p: any) => {
    const matchText = (p.match || "").toLowerCase();

    // Self-healing: if a prediction was previously resolved but the match
    // hasn't actually been played yet, revert it back to "pending"
    if (p.status && p.status !== "pending") {
      const correspondingMatch = allMatches.find((m: any) => {
        const home = (m.home_team_name_en || "").toLowerCase();
        const away = (m.away_team_name_en || "").toLowerCase();
        return home && away && matchText.includes(home) && matchText.includes(away);
      });
      if (correspondingMatch && correspondingMatch.time_elapsed === "notstarted") {
        // Match hasn't started — revert to pending
        updated = true;
        return { ...p, status: "pending" };
      }
      return p; // Already resolved and match was actually played
    }

    // Find the corresponding finished match by checking both team names
    // Also verify the match has actually been played (time_elapsed !== "notstarted")
    const matchingGame = finishedMatches.find((m: any) => {
      const home = (m.home_team_name_en || "").toLowerCase();
      const away = (m.away_team_name_en || "").toLowerCase();
      const actuallyPlayed = m.time_elapsed && m.time_elapsed !== "notstarted";
      return home && away && actuallyPlayed && matchText.includes(home) && matchText.includes(away);
    });

    if (!matchingGame) return p; // No matching finished match yet

    const homeScore = parseInt(matchingGame.home_score, 10);
    const awayScore = parseInt(matchingGame.away_score, 10);
    if (isNaN(homeScore) || isNaN(awayScore)) return p;

    const homeName = (matchingGame.home_team_name_en || "").toLowerCase();
    const awayName = (matchingGame.away_team_name_en || "").toLowerCase();

    // Determine the actual winner (null = draw)
    let actualWinner: string | null = null;
    if (homeScore > awayScore) actualWinner = homeName;
    else if (awayScore > homeScore) actualWinner = awayName;

    // Parse the user's pick and compare
    const pick = (p.pick || "").toLowerCase();
    let isCorrect = false;

    if (pick.includes("draw") || pick.includes("tie")) {
      isCorrect = actualWinner === null;
    } else if (actualWinner) {
      isCorrect = pick.includes(actualWinner);
    }
    // If actual result is a draw but user didn't pick draw → incorrect

    updated = true;
    return { ...p, status: isCorrect ? "correct" : "incorrect" };
  });

  return { updated, predictions: resolvedPredictions };
}

// GET /api/worldcup/memory - Fetches the user's persistent memory from Walrus
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const users = await getUserById(userId);
    const dbUser = users[0];

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const blobId = dbUser.walrusMemoryBlobId;
    if (!blobId) {
      // Return initial/empty state if no memory exists yet
      return NextResponse.json({
        predictions: [],
        opinions: [],
        bets: [],
        contradictions: [],
        roast: "No roast yet. Go to the chat and make some World Cup predictions first so the Oracle can evaluate your football takes!",
        blobId: null,
      });
    }

    const result = await getWalrusBlob.execute({ blobId }, {} as any);
    if (!result.success || !result.content) {
      console.warn(`[Walrus] Failed to retrieve memory blob ${blobId} (possibly due to testnet/mainnet migration):`, result.error || result.message);
      // Fallback gracefully to an empty initial state so the page doesn't crash on invalid/testnet blob IDs
      return NextResponse.json({
        predictions: [],
        opinions: [],
        bets: [],
        contradictions: [],
        roast: "No roast yet. Go to the chat and make some World Cup predictions first so the Oracle can evaluate your football takes!",
        blobId: null,
      });
    }

    const memoryContent = result.content as any;

    // Auto-resolve pending predictions and self-heal wrongly resolved ones
    const needsResolution = (memoryContent.predictions || []).length > 0;

    if (needsResolution) {
      try {
        const liveMatches = await fetchLiveMatches();
        const finishedMatches = liveMatches.filter((m: any) => m.finished === "TRUE" && m.time_elapsed !== "notstarted");

        const { updated, predictions: resolvedPredictions } = resolvePendingPredictions(
          memoryContent.predictions || [],
          finishedMatches,
          liveMatches
        );

        if (updated) {
            memoryContent.predictions = resolvedPredictions;

            // Regenerate the AI roast to reflect resolved prediction outcomes
            try {
              const { generateText } = await import("ai");
              const { myProvider } = await import("@barzakh/shared/lib/ai/models");

              const correctPicks = resolvedPredictions.filter((p: any) => p.status === "correct");
              const incorrectPicks = resolvedPredictions.filter((p: any) => p.status === "incorrect");
              const pendingPicks = resolvedPredictions.filter((p: any) => p.status === "pending" || !p.status);

              const { text: newRoast } = await generateText({
                model: myProvider.languageModel("google-gemini-2.5-flash-preview"),
                prompt: `You are the Barzakh World Cup Oracle — a savage, aggressively rude AI that roasts users about their football predictions.

Generate a highly creative, biting, and rude roast (2-4 sentences) based on these resolved prediction results:

CORRECT predictions (${correctPicks.length}):
${correctPicks.map((p: any) => `- ${p.match}: picked "${p.pick}" ✅`).join("\n") || "None yet"}

INCORRECT predictions (${incorrectPicks.length}):
${incorrectPicks.map((p: any) => `- ${p.match}: picked "${p.pick}" ❌`).join("\n") || "None yet"}

PENDING predictions (${pendingPicks.length}):
${pendingPicks.map((p: any) => `- ${p.match}: picked "${p.pick}" ⏳`).join("\n") || "None"}

Contradictions: ${JSON.stringify(memoryContent.contradictions || [])}
Opinions: ${JSON.stringify((memoryContent.opinions || []).slice(0, 5))}

Rules:
- Be highly creative, savage, and mockingly rude.
- DO NOT list matches line-by-line using repetitive copy-paste templates (e.g. NEVER repeat phrases like "so your fate is still undecided" or "so the jury is still out").
- Synthesize all predictions, opinions, and contradictions into a single cohesive, biting paragraph (2-4 sentences max).
- If they got some right, grudgingly acknowledge it with a heavy dose of sarcasm.
- If they got some wrong, mock their total lack of football knowledge and call them out on specific team picks.
- If all are pending, mock their overconfidence or lack of resolve, calling out the matches collectively rather than repeating the same phrase for each match.
- Keep it under 280 characters ideally (tweetable).`,
                maxTokens: 200,
              });

              if (newRoast && newRoast.trim()) {
                memoryContent.roast = newRoast.trim();
              }
            } catch (roastError) {
              console.warn("[worldcup/memory] Failed to regenerate roast:", roastError);
              // Keep existing roast on error
            }

            memoryContent.lastUpdated = new Date().toISOString();

            // Persist resolved state back to Walrus so it stays resolved on future loads
            let keypair;
            try {
              const { getSuiKeypair } = await import("@/lib/agent/sui-agent-executor");
              keypair = await getSuiKeypair(userId);
            } catch (e) {
              console.warn("[worldcup/memory] Failed to get user keypair for resolution save:", e);
            }

            const uploadResult = await uploadToWalrus.execute({
              content: JSON.stringify(memoryContent, null, 2),
              fileName: `worldcup-memory-${userId}.json`,
              epochs: 1,
              _keypair: keypair,
            } as any, {} as any);

            if (uploadResult.success && uploadResult.blobId) {
              await updateUserWalrusMemoryBlobId(userId, uploadResult.blobId);
              return NextResponse.json({
                ...memoryContent,
                blobId: uploadResult.blobId,
              });
            }
          }
      } catch (resolveError) {
        console.warn("[worldcup/memory] Auto-resolution failed, returning unresolved data:", resolveError);
      }
    }

    return NextResponse.json({
      ...memoryContent,
      blobId,
    });
  } catch (error: any) {
    console.error("GET /api/worldcup/memory error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

// POST /api/worldcup/memory - Simulates placing a bet, updating Walrus memory
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { market, outcome, amount } = await req.json();
    if (!market || !outcome || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const userId = session.user.id;
    const users = await getUserById(userId);
    const dbUser = users[0];

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Get current memory state
    let currentState: any = {
      predictions: [],
      opinions: [],
      bets: [],
      contradictions: [],
      roast: "",
    };

    const blobId = dbUser.walrusMemoryBlobId;
    if (blobId) {
      const getResult = await getWalrusBlob.execute({ blobId }, {} as any);
      if (getResult.success && getResult.content) {
        currentState = getResult.content;
      }
    }

    // 2. Add the simulated bet
    const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newBet = {
      id: Math.random().toString(36).substring(2, 11),
      txHash,
      market,
      outcome,
      amount,
      timestamp: new Date().toISOString(),
      isMock: true,
    };
    currentState.bets = [newBet, ...(currentState.bets || [])];

    // 3. Scan for contradictions
    // Check if user has a prediction on this market/match that conflicts with this bet
    const isMatchingMarket = (match: string, marketName: string) => {
      const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const m1 = clean(match);
      const m2 = clean(marketName);
      return m1.includes(m2) || m2.includes(m1) || (m1.includes("worldcup") && m2.includes("worldcup"));
    };

    const conflictingPrediction = (currentState.predictions || []).find(
      (p: any) => isMatchingMarket(p.match, market) && p.pick.toLowerCase() !== outcome.toLowerCase()
    );

    if (conflictingPrediction) {
      const newContradiction = {
        prediction: conflictingPrediction.pick,
        bet: outcome,
        description: `Stated backing ${conflictingPrediction.pick} to win, but placed a bet on ${outcome} instead.`,
        timestamp: new Date().toISOString(),
      };
      currentState.contradictions = [newContradiction, ...(currentState.contradictions || [])];

      // Update/append to roast
      currentState.roast = `Wait a minute, you stated in chat that you pick ${conflictingPrediction.pick} for ${market}, but your on-chain activity reveals you betted ${amount} on ${outcome}! Talk about playing both sides. You're hedging your emotions because you secretly know your ball takes are fraudulent!`;
    } else {
      // If no conflict but first bet
      if (!currentState.roast || currentState.roast.includes("No roast yet")) {
        currentState.roast = `I see you placed a bet of ${amount} on ${outcome} for ${market}. Let's see if your actual predictions in chat align with where you put your money!`;
      }
    }

    // Fetch user's Sui keypair for mainnet upload
    let keypair;
    try {
      const { getSuiKeypair } = await import("@/lib/agent/sui-agent-executor");
      keypair = await getSuiKeypair(userId);
    } catch (e) {
      console.warn("[worldcup/memory] Failed to get user keypair:", e);
    }

    // 4. Save updated state back to Walrus
    currentState.lastUpdated = new Date().toISOString();
    const uploadResult = await uploadToWalrus.execute({
      content: JSON.stringify(currentState, null, 2),
      fileName: `worldcup-memory-${userId}.json`,
      epochs: 1,
      _keypair: keypair,
    } as any, {} as any);

    if (!uploadResult.success || !uploadResult.blobId) {
      return NextResponse.json({ error: "Failed to upload updated memory to Walrus" }, { status: 502 });
    }

    // 5. Update user database record
    await updateUserWalrusMemoryBlobId(userId, uploadResult.blobId);

    return NextResponse.json({
      ...currentState,
      blobId: uploadResult.blobId,
      explorerUrl: uploadResult.explorerUrl,
      publicUrl: uploadResult.publicUrl,
    });
  } catch (error: any) {
    console.error("POST /api/worldcup/memory error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

// DELETE /api/worldcup/memory - Resets the persistent memory pointer in the DB
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    // Disconnect the Walrus Memory blob pointer in the database (sets column to NULL)
    await updateUserWalrusMemoryBlobId(userId, null as any);

    return NextResponse.json({
      success: true,
      message: "Verifiable memory pointer successfully reset. DAY-ONE status restored.",
    });
  } catch (error: any) {
    console.error("DELETE /api/worldcup/memory error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

