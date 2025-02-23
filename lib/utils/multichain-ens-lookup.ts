// Import viem transport, viem chain, and ENSjs
import { http } from "viem";
import { mainnet } from "viem/chains";
import { createEnsPublicClient } from "@ensdomains/ensjs";

// Create the client
const client = createEnsPublicClient({
  chain: mainnet,
  transport: http(),
});

// Use the client
export const multichainEnsLookup = async (name: string) => {
  const ethAddress = await client.getAddressRecord({ name });
  if (!ethAddress) {
    return "not found";
  }
  return ethAddress.value;
};
