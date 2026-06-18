import assert from "node:assert/strict";

async function main() {
  process.env.POSTGRES_URL ||= "postgres://user:pass@127.0.0.1:5432/test";

  const bridge = await import("../sui-bridge-executor");

  assert.equal(bridge.normalizeBridgeDirection("eth-to-sui"), "ethereum-to-sui");
  assert.equal(bridge.normalizeBridgeDirection("sui-to-eth"), "sui-to-ethereum");

  const prep = bridge.buildSuiBridgeEthPrep({
    asset: "ETH",
    amount: "0.01",
    suiRecipient: `0x${"1".repeat(64)}`,
    ethereumChain: "sepolia",
  });
  assert.equal(prep.executionReady, false);
  assert.equal(prep.asset, "ETH");
  assert.equal(prep.direction, "ethereum-to-sui");
  assert.ok(prep.blockers.some((b: string) => b.includes("official SuiBridge contract")));
  assert.ok(prep.calldataPlan.some((step: string) => step.includes("bridgeETH")));

  console.log("sui bridge executor tests passed");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
