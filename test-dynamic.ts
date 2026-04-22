import { createDelegatedEvmWalletClient, delegatedSignTransaction } from "@dynamic-labs-wallet/node-evm";

async function main() {
  const client = createDelegatedEvmWalletClient({
    environmentId: process.env.DYNAMIC_ENVIRONMENT_ID || "123",
    apiToken: process.env.DYNAMIC_API_KEY || "123",
  });
  
  console.log("Mock client created");
  // We can't actually sign without a real environmentId/apiToken and walletId, but we can see if it throws immediately.
}
main();
