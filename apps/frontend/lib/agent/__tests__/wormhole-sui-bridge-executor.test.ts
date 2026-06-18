import assert from "node:assert/strict";

import {
  buildWormholeSuiBridgePlan,
  buildWormholeScanTxUrl,
  executeWormholeSuiBridgeTransfer,
  normalizeWormholeNetwork,
} from "../wormhole-sui-bridge-executor";

function testNormalizeNetwork() {
  assert.equal(normalizeWormholeNetwork("testnet"), "Testnet");
  assert.equal(normalizeWormholeNetwork("Mainnet"), "Mainnet");
}

function testEthToSuiUsesWttNotNativeBridge() {
  const plan = buildWormholeSuiBridgePlan({
    asset: "ETH",
    amount: "0.01",
    sourceChain: "Ethereum",
    destinationChain: "Sui",
    recipientAddress: "0x" + "1".repeat(64),
    network: "Testnet",
  });

  assert.equal(plan.route.kind, "wtt");
  assert.equal(plan.usesNativeSuiBridge, false);
  assert.equal(plan.manualClaimRequired, false);
  assert.match(plan.summary, /Wormhole/i);
  assert.ok(plan.warnings.some((warning) => /wrapped/i.test(warning)));
  assert.ok(plan.steps.some((step) => /Wormhole Connect/i.test(step) || /SDK/i.test(step)));
}

function testMainnetUsdcPrefersCctp() {
  const plan = buildWormholeSuiBridgePlan({
    asset: "USDC",
    amount: "5",
    sourceChain: "Ethereum",
    destinationChain: "Sui",
    recipientAddress: "0x" + "2".repeat(64),
    network: "Mainnet",
    routePreference: "auto",
  });

  assert.equal(plan.route.kind, "cctp");
  assert.match(plan.route.name, /CCTP/i);
  assert.equal(plan.destinationAsset, "Native USDC on Sui");
  assert.ok(plan.steps.some((step) => /burn/i.test(step) && /mint/i.test(step)));
}

function testTestnetUsdcPrefersCctpForSui() {
  const plan = buildWormholeSuiBridgePlan({
    asset: "USDC",
    amount: "1",
    sourceChain: "Ethereum",
    destinationChain: "Sui",
    recipientAddress: "0x" + "8".repeat(64),
    network: "Testnet",
    routePreference: "auto",
  });

  assert.equal(plan.route.kind, "cctp");
  assert.match(plan.route.name, /CCTP/i);
  assert.equal(plan.destinationAsset, "Native USDC on Sui");
  assert.doesNotMatch(plan.blockers.join("\n"), /CCTP.*mainnet-only/i);
  assert.ok(plan.warnings.some((warning) => /ManualCCTP|Circle testnet USDC/i.test(warning)));
}

function testRejectsRoutesWithoutSui() {
  assert.throws(
    () =>
      buildWormholeSuiBridgePlan({
        asset: "ETH",
        amount: "1",
        sourceChain: "Ethereum",
        destinationChain: "Base",
        recipientAddress: "0x" + "3".repeat(40),
      }),
    /must include Sui/i,
  );
}

function testWormholeScanUrl() {
  assert.equal(
    buildWormholeScanTxUrl({ txHash: "0xabc", network: "Testnet" }),
    "https://wormholescan.io/#/tx/0xabc?network=Testnet",
  );
}

async function testDryRunQuoteDoesNotRequireAutomationOrRecord() {
  let recorded = false;
  const result = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "USDC",
      amount: "5",
      sourceChain: "Ethereum",
      destinationChain: "Sui",
      recipientAddress: "0x" + "4".repeat(64),
      network: "Mainnet",
      execute: false,
    },
    {
      hasDelegation: async () => false,
      getWalletAddress: async () => null,
      recordTransaction: async () => {
        recorded = true;
      },
      submitTransfer: async () => {
        throw new Error("submitTransfer must not run during dry-run");
      },
      env: {},
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.quote?.routeKind, "cctp");
  assert.equal(result.executionReady, false);
  assert.equal(recorded, false);
}

async function testExecuteRequiresExplicitEnvOptInAndAutomation() {
  const noEnv = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "ETH",
      amount: "0.01",
      sourceChain: "Ethereum",
      destinationChain: "Sui",
      recipientAddress: "0x" + "5".repeat(64),
      network: "Testnet",
      execute: true,
    },
    {
      hasDelegation: async () => true,
      getWalletAddress: async () => "0x" + "a".repeat(40),
      recordTransaction: async () => undefined,
      submitTransfer: async () => ({ txHash: "0xdeadbeef" }),
      env: {},
    },
  );
  assert.equal(noEnv.success, false);
  assert.equal(noEnv.dryRun, true);
  assert.ok(noEnv.blockers.some((blocker) => /WORMHOLE_SUI_BRIDGE_ENABLE_WRITES/i.test(blocker)));

  const noAutomation = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "ETH",
      amount: "0.01",
      sourceChain: "Ethereum",
      destinationChain: "Sui",
      recipientAddress: "0x" + "6".repeat(64),
      network: "Testnet",
      execute: true,
    },
    {
      hasDelegation: async () => false,
      getWalletAddress: async () => "0x" + "a".repeat(40),
      recordTransaction: async () => undefined,
      submitTransfer: async () => ({ txHash: "0xdeadbeef" }),
      env: { WORMHOLE_SUI_BRIDGE_ENABLE_WRITES: "true" },
    },
  );
  assert.equal(noAutomation.success, false);
  assert.equal(noAutomation.dryRun, true);
  assert.ok(noAutomation.blockers.some((blocker) => /automation/i.test(blocker)));
}

async function testExecuteRecordsRealTxHashAndWormholescanUrl() {
  const records: any[] = [];
  const result = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "ETH",
      amount: "0.01",
      sourceChain: "Ethereum",
      destinationChain: "Sui",
      recipientAddress: "0x" + "7".repeat(64),
      network: "Testnet",
      execute: true,
    },
    {
      hasDelegation: async (userId, chain) => userId === "user_1" && chain === "evm",
      getWalletAddress: async () => "0x" + "b".repeat(40),
      recordTransaction: async (input) => {
        records.push(input);
      },
      submitTransfer: async (request) => {
        assert.equal(request.plan.usesNativeSuiBridge, false);
        return { txHash: "0xfeedface", provider: "test-adapter" };
      },
      env: { WORMHOLE_SUI_BRIDGE_ENABLE_WRITES: "true" },
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.dryRun, false);
  assert.equal(result.transactionHash, "0xfeedface");
  assert.equal(result.explorerUrl, "https://sepolia.etherscan.io/tx/0xfeedface");
  assert.equal(records.length, 1);
  assert.equal(records[0].operationType, "wormhole_sui_bridge");
  assert.equal(records[0].signature, "0xfeedface");
  assert.doesNotMatch(JSON.stringify(result), /private|mnemonic|seed|secret|suiprivkey/i);
}

async function testExecuteTestnetUsdcUsesCctpWithoutAskingAgain() {
  const records: any[] = [];
  const result = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "USDC",
      amount: "5",
      sourceChain: "Sepolia",
      destinationChain: "Sui",
      recipientAddress: "0x" + "9".repeat(64),
      network: "Testnet",
      routePreference: "auto",
      execute: true,
    },
    {
      hasDelegation: async (userId, chain) => userId === "user_1" && chain === "evm",
      getWalletAddress: async () => "0x" + "c".repeat(40),
      recordTransaction: async (input) => {
        records.push(input);
      },
      submitTransfer: async (request) => {
        assert.equal(request.quote.routeKind, "cctp");
        assert.equal(request.plan.route.kind, "cctp");
        assert.doesNotMatch(request.plan.blockers.join("\n"), /CCTP.*mainnet-only/i);
        return { txHash: "0x1234567890abcdef", provider: "test-cctp-adapter" };
      },
      env: { WORMHOLE_SUI_BRIDGE_ENABLE_WRITES: "true" },
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.dryRun, false);
  assert.equal(result.quote?.routeKind, "cctp");
  assert.equal(result.transactionHash, "0x1234567890abcdef");
  assert.equal(records.length, 1);
}


async function testSepoliaUsdcWormholeMappingFailureFallsBackToNativeBridge() {
  let nativeFallbackCalled = false;
  const result = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "USDC",
      amount: "5",
      sourceChain: "Ethereum",
      destinationChain: "Sui",
      recipientAddress: "0x" + "a".repeat(64),
      network: "Testnet",
      routePreference: "auto",
      execute: true,
    },
    {
      hasDelegation: async (userId, chain) => userId === "user_1" && chain === "evm",
      getWalletAddress: async () => "0x" + "d".repeat(40),
      recordTransaction: async () => {
        throw new Error("Wormhole recordTransaction should not run when native fallback handles recording");
      },
      submitTransfer: async () => {
        throw new Error("No Wormhole destination token found for USDC Sepolia -> Sui.");
      },
      nativeBridgeFallback: async (input) => {
        nativeFallbackCalled = true;
        assert.equal(input.asset, "USDC");
        assert.equal(input.ethereumChain, "sepolia");
        assert.equal(input.dryRun, false);
        return {
          success: true,
          dryRun: false,
          transactionHash: "0xabcdef1234567890",
          explorerUrl: "https://sepolia.etherscan.io/tx/0xabcdef1234567890",
        };
      },
      env: { WORMHOLE_SUI_BRIDGE_ENABLE_WRITES: "true" },
    },
  );

  assert.equal(nativeFallbackCalled, true);
  assert.equal(result.success, true);
  assert.equal(result.dryRun, false);
  assert.equal(result.provider, "sui-native-bridge:testnet-usdc-fallback");
  assert.equal(result.transactionHash, "0xabcdef1234567890");
  assert.match(result.plan.summary, /Native Bridge testnet fallback/i);
}


async function testSepoliaUsdcFallbackReportsOnlyNativeBridgeBlocker() {
  const result = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "USDC",
      amount: "5",
      sourceChain: "Sepolia",
      destinationChain: "Sui",
      recipientAddress: "0x" + "e".repeat(64),
      network: "Testnet",
      routePreference: "auto",
      execute: true,
    },
    {
      hasDelegation: async () => true,
      getWalletAddress: async () => "0x" + "e".repeat(40),
      recordTransaction: async () => undefined,
      submitTransfer: async () => {
        throw new Error("No Wormhole destination token found for USDC Sepolia -> Sui.");
      },
      nativeBridgeFallback: async () => ({
        success: false,
        dryRun: true,
        error: "Missing sepolia Ethereum RPC URL for bridge execution.",
      }),
      env: { WORMHOLE_SUI_BRIDGE_ENABLE_WRITES: "true" },
    },
  );

  assert.equal(result.success, false);
  assert.deepEqual(result.blockers, ["Missing sepolia Ethereum RPC URL for bridge execution."]);
  assert.doesNotMatch(result.blockers.join("\n"), /No Wormhole destination token found/i);
  assert.match(result.quote?.routeName || "", /Native Bridge testnet USDC fallback/i);
}


async function testSuiToEthereumSepoliaAliasExecutesAsSepolia() {
  const records: any[] = [];
  const result = await executeWormholeSuiBridgeTransfer(
    {
      userId: "user_1",
      asset: "USDC",
      amount: "5",
      sourceChain: "Sui",
      destinationChain: "Ethereum Sepolia",
      recipientAddress: "0x" + "f".repeat(40),
      network: "Testnet",
      routePreference: "auto",
      execute: true,
    },
    {
      hasDelegation: async (userId, chain) => userId === "user_1" && chain === "sui",
      getWalletAddress: async () => "0x" + "a".repeat(64),
      recordTransaction: async (input) => {
        records.push(input);
      },
      submitTransfer: async (request) => {
        assert.equal(request.quote.routeKind, "cctp");
        assert.equal(request.plan.sourceChain, "Sui");
        assert.equal(request.plan.destinationChain, "Sepolia");
        assert.notEqual(request.plan.destinationChain, "EthereumSepolia");
        assert.equal(request.quote.sourceWalletChain, "sui");
        return {
          txHash: "4Nd1mCgRzvwU5n2JVt7xyiR9Th1wFv4K41b6GE4cM3rx",
          sourceTxHash: "4Nd1mCgRzvwU5n2JVt7xyiR9Th1wFv4K41b6GE4cM3rx",
          provider: "test-cctp-adapter",
          requiresCompletion: true,
          autonomousCompletionScheduled: true,
        };
      },
      env: { WORMHOLE_SUI_BRIDGE_ENABLE_WRITES: "true" },
    },
  );

  assert.equal(result.success, true);
  assert.equal(result.dryRun, false);
  assert.equal(result.plan.destinationChain, "Sepolia");
  assert.equal(result.quote?.sourceWalletChain, "sui");
  assert.equal(result.requiresCompletion, true);
  assert.equal(result.autonomousCompletionScheduled, true);
  assert.equal(records.length, 1);
}


async function run() {
  testNormalizeNetwork();
  testEthToSuiUsesWttNotNativeBridge();
  testMainnetUsdcPrefersCctp();
  testTestnetUsdcPrefersCctpForSui();
  testRejectsRoutesWithoutSui();
  testWormholeScanUrl();
  await testDryRunQuoteDoesNotRequireAutomationOrRecord();
  await testExecuteRequiresExplicitEnvOptInAndAutomation();
  await testExecuteRecordsRealTxHashAndWormholescanUrl();
  await testExecuteTestnetUsdcUsesCctpWithoutAskingAgain();
  await testSepoliaUsdcWormholeMappingFailureFallsBackToNativeBridge();
  await testSepoliaUsdcFallbackReportsOnlyNativeBridgeBlocker();
  await testSuiToEthereumSepoliaAliasExecutesAsSepolia();
  console.log("wormhole sui bridge executor tests passed");
}

run().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
