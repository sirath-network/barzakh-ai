import { getMemWalClient, getUserNamespace, recordActionMemory } from "../packages/shared/src/lib/memory/memwal-client";
import dotenv from "dotenv";
import path from "path";

// Load frontend env
dotenv.config({ path: path.resolve(__dirname, "../apps/frontend/.env") });

async function main() {
  console.log("=== Walrus Memory Mainnet Verification ===");
  console.log("Account ID:", process.env.MEMWAL_ACCOUNT_ID);
  console.log("Server URL:", process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz");

  const client = getMemWalClient();
  if (!client) {
    console.error("❌ MemWal client initialization failed. Check your environment variables.");
    process.exit(1);
  }

  // 1. Check health
  console.log("\n1. Checking Relayer Health...");
  try {
    const health = await client.health();
    console.log("✅ Health Status:", JSON.stringify(health, null, 2));
  } catch (err) {
    console.error("❌ Relayer health check failed:", err);
    process.exit(1);
  }

  // 2. Query existing memories
  const testUserId = "hackathon_test_user";
  const namespace = getUserNamespace(testUserId, 1);
  console.log(`\n2. Querying memories for test namespace: ${namespace}...`);

  try {
    const recallResult = await client.recall("What trading preferences are saved?", namespace, 10);
    console.log(`Recalled ${recallResult.memories?.length || 0} memories:`);
    recallResult.memories?.forEach((m: any, i: number) => {
      console.log(`  [${i + 1}] Blob: ${m.blob_id || "indexing"} | Relevance: ${m.relevance} | Text: ${m.text}`);
    });
  } catch (err) {
    console.warn("Notice during recall:", err);
  }

  // 3. Write sample test blobs if requested via CLI arg
  if (process.argv.includes("--seed-blobs")) {
    console.log("\n3. Seeding test trading memory blobs to Walrus Mainnet...");
    const sampleFacts = [
      "User prefers placing orders on Somnia DreamDEX 4h prediction pools.",
      "User standard position size is 5 tUSDC for crypto binary options.",
      "User primarily trades BTC-4h and ETH-4h prediction markets.",
      "User executed Relay cross-chain swap from Base to Somnia for 25 USDC.",
      "User preferred slippage tolerance is set to 0.5% max on all DEX routers.",
      "User trading profile: Risk-managed momentum trader focusing on Shannon testnet & mainnet assets.",
      "User primary EVM execution address is 0x71C880D62287b4B5c5B0a3e89C2e453A84A12B26.",
      "User redeemed 12 winning prediction contracts on DreamDEX settling at 1.00 USDC payout.",
      "User prefers Autopilot execution mode for high confidence signals under 10 USDC.",
      "User verified DeFi identity: Barzakh AI power user exploring decentralized multi-agent liquidity."
    ];

    for (let i = 0; i < sampleFacts.length; i++) {
      const fact = sampleFacts[i];
      try {
        console.log(`Commiting blob ${i + 1}/${sampleFacts.length}: "${fact}"`);
        const res = await client.remember(fact, namespace);
        console.log(`  -> Job Accepted! ID: ${res.job_id}`);
      } catch (e) {
        console.error(`  -> Failed to remember fact ${i + 1}:`, e);
      }
    }
    console.log("\n✅ All seed blobs submitted to MemWal relayer for Walrus Mainnet SEAL encryption!");
  } else {
    console.log("\n💡 Tip: Run `npx tsx scripts/walrus-test-blobs.ts --seed-blobs` to write 10 sample DeFi trading memory blobs to Mainnet.");
  }
}

main().catch(console.error);
