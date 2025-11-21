// Import viem transport, viem chain, and ENSjs
import { http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { createEnsPublicClient } from "@ensdomains/ensjs";

// Create the client with fallback transport for better reliability
const client = createEnsPublicClient({
  chain: mainnet,
  transport: fallback([
    http("https://cloudflare-eth.com"),
    http("https://eth.llamarpc.com"),
    http("https://eth.drpc.org"),
  ], {
    rank: true, // Automatically rank and use the best RPC
    retryCount: 3,
    retryDelay: 1000,
  }),
});

// Use the client
export const multichainEnsLookup = async (name: string) => {
  try {
    const lowerCaseEnsName = name.toLowerCase();
    console.log("ens name:, ", lowerCaseEnsName);
    const ethAddress = await client.getAddressRecord({ name: lowerCaseEnsName });
    if (!ethAddress) {
      return "not found";
    }
    return ethAddress.value;
  } catch (error) {
    console.error("Error resolving ENS name:", error);
    return "error resolving ens name";
  }
};
