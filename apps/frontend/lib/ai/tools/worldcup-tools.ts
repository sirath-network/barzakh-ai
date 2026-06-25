import { tool } from "ai";
import { z } from "zod";
import { uploadToWalrus } from "@barzakh/shared/lib/ai/tools/sui/walrus-tools";
import { updateUserWalrusMemoryBlobId } from "../../db/queries";
import { fetchLiveMatches } from "../../worldcup/worldcup-api";

export const createSaveWorldCupMemoryTool = (userId: string) => tool({
  description: "Save or update the user's persistent World Cup predictions, opinions, on-chain/mock bets, contradictions, and roast to Walrus Memory.",
  parameters: z.object({
    predictions: z.array(z.object({
      id: z.string(),
      type: z.string().describe("Prediction type (e.g., 'winner', 'group_top', 'match')"),
      match: z.string().describe("The team/match/group context"),
      pick: z.string().describe("Stated pick outcome"),
      timestamp: z.string().describe("ISO timestamp"),
      status: z.enum(["pending", "correct", "incorrect"]).optional().describe("Validation status against real scores"),
    })).describe("List of stated World Cup predictions"),
    opinions: z.array(z.object({
      topic: z.string().describe("Topic of opinion, e.g. Spain, France, Cristiano Ronaldo"),
      opinion: z.string().describe("User's stated perspective/rant"),
      timestamp: z.string().describe("ISO timestamp"),
    })).describe("List of stated opinions/rants about teams/players"),
    bets: z.array(z.object({
      id: z.string(),
      txHash: z.string().describe("EVM/Sui transaction hash (mock or real)"),
      market: z.string().describe("The prediction market description"),
      outcome: z.string().describe("The chosen bet outcome"),
      amount: z.string().describe("USDC or token amount"),
      timestamp: z.string().describe("ISO timestamp"),
      isMock: z.boolean(),
    })).describe("List of on-chain or mock prediction market bets"),
    contradictions: z.array(z.object({
      prediction: z.string().describe("Stated opinion pick"),
      bet: z.string().describe("Actual on-chain bet outcome"),
      description: z.string().describe("Details of the conflict"),
      timestamp: z.string().describe("ISO timestamp"),
    })).describe("Identified conflicts between what they say and what they bet"),
    roast: z.string().describe("A highly creative, savage, and rude critique of the user's predictions, contradictions, or opinions. DO NOT use repetitive copy-paste phrases (like 'your fate is still undecided' or 'the jury is out') for pending matches. Instead, synthesize a single cohesive, biting, mockingly-rude paragraph (2-4 sentences max) that aggressively roasts their choices, overconfidence, or contradictions."),
  }),
  execute: async ({ predictions, opinions, bets, contradictions, roast }) => {
    try {
      const payload = {
        predictions,
        opinions,
        bets,
        contradictions,
        roast,
        lastUpdated: new Date().toISOString(),
      };

      const content = JSON.stringify(payload, null, 2);
      
      // Check user's Sui agent wallet status
      let walletAddress: string | null = null;
      let walletBalanceMist = 0n;
      let walletEnabled = false;
      
      try {
        const { getSuiAgentWalletSnapshot } = await import("../../agent/sui-agent-executor");
        const snapshot = await getSuiAgentWalletSnapshot(userId);
        if (snapshot.configured) {
          walletAddress = snapshot.address || null;
          walletBalanceMist = BigInt(snapshot.mistBalance || "0");
          walletEnabled = snapshot.enabled;
        }
      } catch (e) {
        console.warn("[saveWorldCupMemory] Failed to check agent wallet snapshot:", e);
      }

      // Check if wallet is created
      if (!walletAddress) {
        return {
          success: false,
          message: "Failed to save World Cup memory to Walrus. No Sui Agent Wallet exists yet. Please go to Settings -> Wallet Settings to create a Sui Agent Wallet.",
        };
      }

      // Check if delegation/automation is enabled
      if (!walletEnabled) {
        return {
          success: false,
          message: `Failed to save World Cup memory to Walrus. Your Sui Agent Wallet (${walletAddress}) is created but automation is disabled. Please go to Settings -> Wallet Settings and enable Automation for Sui.`,
        };
      }

      // Check for sufficient SUI balance (0.02 SUI is a safe minimum to cover tipping and gas)
      const MIN_SUI_REQUIRED_MIST = 20_000_000n; // 0.02 SUI
      if (walletBalanceMist < MIN_SUI_REQUIRED_MIST) {
        return {
          success: false,
          message: `Failed to save World Cup memory to Walrus. Your Sui Agent Wallet (${walletAddress}) has insufficient balance (${(Number(walletBalanceMist) / 1e9).toFixed(4)} SUI). Please deposit/fund your agent wallet with at least 0.05 SUI to execute on-chain Walrus writes.`,
        };
      }

      // Fetch user's Sui keypair for mainnet upload
      let keypair;
      try {
        const { getSuiKeypair } = await import("../../agent/sui-agent-executor");
        keypair = await getSuiKeypair(userId);
      } catch (e) {
        console.warn("[saveWorldCupMemory] Failed to get user keypair:", e);
      }

      // Upload to Walrus
      const result = await uploadToWalrus.execute({
        content,
        fileName: `worldcup-memory-${userId}.json`,
        epochs: 1, // 1 epoch is approx 14 days
        _keypair: keypair,
      } as any, {} as any);

      if (!result.success || !result.blobId) {
        throw new Error(result.message || "Failed to upload to Walrus");
      }

      // Update user db entry with the latest Walrus memory blob ID
      await updateUserWalrusMemoryBlobId(userId, result.blobId);

      return {
        success: true,
        message: "Successfully synchronized World Cup memory with Walrus Protocol.",
        blobId: result.blobId,
        explorerUrl: result.explorerUrl,
        publicUrl: result.publicUrl,
        lastUpdated: payload.lastUpdated,
      };
    } catch (error: any) {
      console.error("Error saving World Cup memory:", error);
      return {
        success: false,
        message: "Failed to save World Cup memory to Walrus.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const createSimulatePredictionMarketBetTool = (userId: string) => tool({
  description: "Simulate placing a bet on a prediction market (Polymarket mock) to test the contradiction tracker.",
  parameters: z.object({
    market: z.string().describe("The prediction market, e.g. 'FIFA World Cup 2026 Winner'"),
    outcome: z.string().describe("The outcome backed, e.g. 'Spain'"),
    amount: z.string().describe("Amount of USDC, e.g. '100 USDC'"),
  }),
  execute: async ({ market, outcome, amount }) => {
    const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    return {
      success: true,
      message: `Simulated Polymarket bet of ${amount} on ${outcome} placed successfully. Transaction hash: ${txHash.slice(0, 10)}...${txHash.slice(-8)}.`,
      bet: {
        id: Math.random().toString(36).substring(2, 11),
        txHash,
        market,
        outcome,
        amount,
        timestamp: new Date().toISOString(),
        isMock: true,
      }
    };
  },
});

export const createClearWorldCupMemoryTool = (userId: string) => tool({
  description: "Clear or reset the user's persistent World Cup predictions, opinions, on-chain bets, contradictions, and roast from Walrus. Use this when the user explicitly requests to reset, clear, delete, or wipe their memory/profile.",
  parameters: z.object({}),
  execute: async () => {
    try {
      await updateUserWalrusMemoryBlobId(userId, null as any);
      return {
        success: true,
        message: "Successfully reset persistent World Cup memory in the database. The user's memory profile has been cleared.",
      };
    } catch (error: any) {
      console.error("Error clearing World Cup memory:", error);
      return {
        success: false,
        message: "Failed to clear World Cup memory.",
        error: error.message || "Unknown error",
      };
    }
  },
});

const STADIUM_DETAILS: Record<string, { name: string; city: string; offset: string; timezone: string }> = {
  "1": { name: "Estadio Azteca", city: "Mexico City", offset: "-06:00", timezone: "CST (UTC-6)" },
  "2": { name: "Estadio Akron", city: "Guadalajara", offset: "-06:00", timezone: "CST (UTC-6)" },
  "3": { name: "Estadio BBVA", city: "Monterrey", offset: "-06:00", timezone: "CST (UTC-6)" },
  "4": { name: "AT&T Stadium", city: "Dallas", offset: "-05:00", timezone: "CDT (UTC-5)" },
  "5": { name: "NRG Stadium", city: "Houston", offset: "-05:00", timezone: "CDT (UTC-5)" },
  "6": { name: "GEHA Field at Arrowhead Stadium", city: "Kansas City", offset: "-05:00", timezone: "CDT (UTC-5)" },
  "7": { name: "Mercedes-Benz Stadium", city: "Atlanta", offset: "-04:00", timezone: "EDT (UTC-4)" },
  "8": { name: "Hard Rock Stadium", city: "Miami", offset: "-04:00", timezone: "EDT (UTC-4)" },
  "9": { name: "Gillette Stadium", city: "Boston", offset: "-04:00", timezone: "EDT (UTC-4)" },
  "10": { name: "Lincoln Financial Field", city: "Philadelphia", offset: "-04:00", timezone: "EDT (UTC-4)" },
  "11": { name: "MetLife Stadium", city: "New York/New Jersey", offset: "-04:00", timezone: "EDT (UTC-4)" },
  "12": { name: "BMO Field", city: "Toronto", offset: "-04:00", timezone: "EDT (UTC-4)" },
  "13": { name: "BC Place", city: "Vancouver", offset: "-07:00", timezone: "PDT (UTC-7)" },
  "14": { name: "Lumen Field", city: "Seattle", offset: "-07:00", timezone: "PDT (UTC-7)" },
  "15": { name: "Levi's Stadium", city: "San Francisco Bay Area", offset: "-07:00", timezone: "PDT (UTC-7)" },
  "16": { name: "SoFi Stadium", city: "Los Angeles", offset: "-07:00", timezone: "PDT (UTC-7)" },
};

function getMatchUtcISOString(localDateStr: string, stadiumId: string): string {
  if (!localDateStr) return new Date().toISOString();
  const match = localDateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/);
  if (match) {
    const [_, month, day, year, hour, minute] = match;
    const details = STADIUM_DETAILS[stadiumId];
    const offset = details ? details.offset : "-05:00";
    return `${year}-${month}-${day}T${hour}:${minute}:00${offset}`;
  }
  return new Date(localDateStr).toISOString();
}

export const createGetLiveWorldCupMatchesTool = () => tool({
  description: "Query the actual FIFA World Cup 2026 matches, schedules, scores, and status (e.g. check if a match is finished, check the scoreline). Returns enriched kickoff times with UTC and stadium timezone information.",
  parameters: z.object({
    teamName: z.string().optional().describe("Optional team name to filter matches for, e.g. 'Mexico', 'France'"),
    finished: z.boolean().optional().describe("Optional filter to return only finished matches (true) or upcoming/live matches (false)"),
  }),
  execute: async ({ teamName, finished }) => {
    try {
      let matches = await fetchLiveMatches();
      
      if (teamName) {
        const lowerName = teamName.toLowerCase();
        matches = matches.filter(m => 
          (m.home_team_name_en || "").toLowerCase().includes(lowerName) || 
          (m.away_team_name_en || "").toLowerCase().includes(lowerName)
        );
      }
      
      if (finished !== undefined) {
        const finishedStr = finished ? "TRUE" : "FALSE";
        matches = matches.filter(m => m.finished === finishedStr);
      }
      
      const enrichedMatches = matches.map(m => {
        const details = STADIUM_DETAILS[m.stadium_id];
        let kickoffUtc = "";
        try {
          kickoffUtc = new Date(getMatchUtcISOString(m.local_date, m.stadium_id)).toISOString();
        } catch {
          // fallback
          try {
            kickoffUtc = new Date(m.local_date).toISOString();
          } catch {
            kickoffUtc = "";
          }
        }
        return {
          ...m,
          kickoff_utc: kickoffUtc,
          stadium_name: details?.name || `Stadium #${m.stadium_id}`,
          city: details?.city || "Unknown City",
          timezone: details?.timezone || "Unknown Timezone",
        };
      });
      
      return {
        success: true,
        matches: enrichedMatches.slice(0, 15), // Limit to top 15 relevant matches
        total: matches.length,
      };
    } catch (error: any) {
      console.error("Error fetching live matches in tool:", error);
      return {
        success: false,
        message: "Failed to fetch live World Cup match data.",
        error: error.message || "Unknown error",
      };
    }
  },
});


