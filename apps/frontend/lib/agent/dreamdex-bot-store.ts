import fs from "fs";
import path from "path";
import { executeAgenticDreamDexTrade } from "./dreamdex-executor";
import { dreamDexApi } from "@barzakh/shared/lib/ai/tools/dreamdex/api-client";

export interface ActiveAutoBot {
  id: string;
  userId: string;
  marketSymbol: string;
  asset: string;
  timeframe: string;
  side: "buy_up" | "buy_down";
  amount: number;
  intervalMinutes: number;
  convictionThreshold: number;
  lastExecutedAt: number;
  nextExecutionAt: number;
  executionCount: number;
  lastTxHash?: string;
  isActive: boolean;
  createdAt: number;
}

const DATA_FILE = path.join(process.cwd(), "data", "dreamdex_bots.json");

function readBotsFromFile(): ActiveAutoBot[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content) || [];
  } catch (e) {
    console.warn("[DreamDexBotStore] Error reading bots data file:", e);
    return [];
  }
}

function writeBotsToFile(bots: ActiveAutoBot[]): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(bots, null, 2), "utf-8");
  } catch (e) {
    console.error("[DreamDexBotStore] Error writing bots data file:", e);
  }
}

/**
 * Register or update an active auto bot
 */
export async function registerAutoBot(botConfig: {
  userId: string;
  marketSymbol: string;
  side: "buy_up" | "buy_down";
  amount: number;
  intervalMinutes?: number;
  convictionThreshold?: number;
  txHash?: string;
}): Promise<ActiveAutoBot> {
  const bots = readBotsFromFile();
  const intervalMinutes = botConfig.intervalMinutes || 5;
  const convictionThreshold = botConfig.convictionThreshold || 75;

  const assetMatch = botConfig.marketSymbol.match(/^(BTC|ETH)/i);
  const asset = assetMatch ? assetMatch[0].toUpperCase() : "BTC";
  const tfMatch = botConfig.marketSymbol.match(/-(5m|15m|1h|4h)/i);
  const timeframe = tfMatch ? tfMatch[1].toLowerCase() : "5m";

  // Check if existing bot for this user, asset, and timeframe exists
  const existingIdx = bots.findIndex(
    (b) => b.userId === botConfig.userId && b.asset === asset && b.timeframe === timeframe
  );

  const now = Date.now();
  const nextRun = now + intervalMinutes * 60 * 1000;

  if (existingIdx >= 0) {
    const existing = bots[existingIdx];
    const updated: ActiveAutoBot = {
      ...existing,
      marketSymbol: botConfig.marketSymbol,
      side: botConfig.side,
      amount: botConfig.amount,
      intervalMinutes,
      convictionThreshold,
      lastExecutedAt: now,
      nextExecutionAt: nextRun,
      executionCount: existing.executionCount + 1,
      lastTxHash: botConfig.txHash || existing.lastTxHash,
      isActive: true,
    };
    bots[existingIdx] = updated;
    writeBotsToFile(bots);
    console.log(`[DreamDexBotStore] Updated active bot ${updated.id} for user ${botConfig.userId}: next run in ${intervalMinutes}m`);
    return updated;
  }

  const newBot: ActiveAutoBot = {
    id: `bot_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    userId: botConfig.userId,
    marketSymbol: botConfig.marketSymbol,
    asset,
    timeframe,
    side: botConfig.side,
    amount: botConfig.amount,
    intervalMinutes,
    convictionThreshold,
    lastExecutedAt: now,
    nextExecutionAt: nextRun,
    executionCount: 1,
    lastTxHash: botConfig.txHash,
    isActive: true,
    createdAt: now,
  };

  bots.push(newBot);
  writeBotsToFile(bots);
  console.log(`[DreamDexBotStore] Registered new active bot ${newBot.id} for user ${botConfig.userId}: next run in ${intervalMinutes}m`);
  return newBot;
}

/**
 * Get all active bots
 */
export async function getActiveAutoBots(userId?: string): Promise<ActiveAutoBot[]> {
  const bots = readBotsFromFile();
  if (userId) {
    return bots.filter((b) => b.userId === userId);
  }
  return bots.filter((b) => b.isActive);
}

/**
 * Pause or toggle an auto bot
 */
export async function setAutoBotActive(botId: string, isActive: boolean): Promise<boolean> {
  const bots = readBotsFromFile();
  const bot = bots.find((b) => b.id === botId);
  if (!bot) return false;

  bot.isActive = isActive;
  if (isActive) {
    bot.nextExecutionAt = Date.now() + bot.intervalMinutes * 60 * 1000;
  }
  writeBotsToFile(bots);
  return true;
}

/**
 * Execute due auto bot rounds onchain (called periodically by cron or client triggers)
 */
export async function executeDueAutoBots(): Promise<{
  executedCount: number;
  results: Array<{ botId: string; txHash?: string; error?: string }>;
}> {
  const bots = readBotsFromFile();
  const now = Date.now();
  const dueBots = bots.filter((b) => b.isActive && b.nextExecutionAt <= now);

  if (dueBots.length === 0) {
    return { executedCount: 0, results: [] };
  }

  console.log(`[DreamDexBotStore] Found ${dueBots.length} due auto bot(s) to execute on Somnia...`);

  // Fetch live unexpired markets
  let liveMarkets: any[] = [];
  try {
    liveMarkets = await dreamDexApi.getEventContractMarkets(true);
  } catch (e) {
    console.warn("[DreamDexBotStore] Error fetching live markets for auto bots:", e);
  }

  const results: Array<{ botId: string; txHash?: string; error?: string }> = [];

  for (const bot of dueBots) {
    try {
      // Find the best active unexpired rolling pool for this bot's asset and timeframe
      const nowSec = Math.floor(now / 1000);
      const matchingPool = liveMarkets.find(
        (m: any) =>
          (m.asset === bot.asset || m.symbol?.startsWith(bot.asset)) &&
          (m.timeframe === bot.timeframe || m.symbol?.toLowerCase().includes(`-${bot.timeframe}`)) &&
          (!m.expiryTimestamp || m.expiryTimestamp > nowSec)
      ) || liveMarkets.find(
        (m: any) =>
          (m.asset === bot.asset || m.symbol?.startsWith(bot.asset)) &&
          (!m.expiryTimestamp || m.expiryTimestamp > nowSec)
      );

      const targetSymbol = matchingPool?.symbol || bot.marketSymbol;
      const targetPool = matchingPool?.poolAddress || undefined;

      console.log(`[DreamDexBotStore] Executing due bot ${bot.id} on ${targetSymbol} (${bot.amount} tUSDC, ${bot.side})...`);

      const tradeResult = await executeAgenticDreamDexTrade(bot.userId, {
        marketSymbol: targetSymbol,
        side: bot.side,
        amount: bot.amount,
        pool: targetPool,
        action: "place_order",
      });

      if (tradeResult.success && tradeResult.transactionHash) {
        bot.lastExecutedAt = Date.now();
        bot.nextExecutionAt = Date.now() + bot.intervalMinutes * 60 * 1000;
        bot.executionCount += 1;
        bot.lastTxHash = tradeResult.transactionHash;
        bot.marketSymbol = targetSymbol;
        results.push({ botId: bot.id, txHash: tradeResult.transactionHash });
        console.log(`[DreamDexBotStore] Bot ${bot.id} round succeeded: tx ${tradeResult.transactionHash}`);
      } else {
        bot.nextExecutionAt = Date.now() + 60 * 1000; // Retry in 1 minute if failed
        results.push({ botId: bot.id, error: tradeResult.error || "Trade failed" });
        console.warn(`[DreamDexBotStore] Bot ${bot.id} round failed: ${tradeResult.error}`);
      }
    } catch (botErr: any) {
      bot.nextExecutionAt = Date.now() + 60 * 1000;
      results.push({ botId: bot.id, error: botErr.message || "Execution exception" });
      console.error(`[DreamDexBotStore] Exception executing bot ${bot.id}:`, botErr);
    }
  }

  writeBotsToFile(bots);
  return {
    executedCount: results.filter((r) => r.txHash).length,
    results,
  };
}
