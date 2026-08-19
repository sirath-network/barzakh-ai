/**
 * GOAT Name Service (GNS) Lookup Utility
 * 
 * Resolves .goat domain names to EVM addresses on GOAT Network (Chain ID 2345).
 * Uses viem's createPublicClient for direct on-chain queries to the GNS Registry.
 * 
 * Mirrors the ENS lookup pattern (multichain-ens-lookup.ts).
 */

import { createPublicClient, http, namehash, keccak256, toHex, type Address } from "viem";
import { getCachedGns, setCachedGns } from "./gns-cache";

// GOAT Network Mainnet configuration
const GOAT_MAINNET_RPC = "https://rpc.goat.network";
const GOAT_CHAIN_ID = 2345;

// GNS Registry & Resolver ABI (subset for resolution)
const GNS_RESOLVER_ABI = [
  {
    name: "addr",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const GNS_REGISTRY_ABI = [
  {
    name: "resolver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const GNS_BASE_REGISTRAR_ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// Verified GNS contract addresses on GOAT Network Mainnet (Chain ID 2345)
const GNS_REGISTRY_ADDRESS = (process.env.GNS_REGISTRY_ADDRESS as Address) || "0xEce959d7669a81964b86c3704335fD0332087BAe" as Address;
const GNS_PUBLIC_RESOLVER_ADDRESS = (process.env.GNS_PUBLIC_RESOLVER_ADDRESS as Address) || "0xC624A087E2fEC3bcB63fdA984829Eb18E56be210" as Address;
const GNS_REVERSE_REGISTRAR_ADDRESS = (process.env.GNS_REVERSE_REGISTRAR_ADDRESS as Address) || "0xC7e6944fb92bc810C2784b6595ff8753A5364Ae4" as Address;
const GNS_BASE_REGISTRAR_ADDRESS = (process.env.GNS_BASE_REGISTRAR_ADDRESS as Address) || "0x8aB04C7c002C4B2c655aFec245296d8ef874933F" as Address;

// Create viem public client for GOAT Network
const goatClient = createPublicClient({
  chain: {
    id: GOAT_CHAIN_ID,
    name: "GOAT Network",
    nativeCurrency: { name: "Bitcoin", symbol: "BTC", decimals: 18 },
    rpcUrls: {
      default: { http: [GOAT_MAINNET_RPC] },
    },
  },
  transport: http(GOAT_MAINNET_RPC),
});

/**
 * Normalize a .goat name — ensure it ends with .goat
 */
function normalizeGnsName(name: string): string {
  if (!name || typeof name !== "string") return "";
  const lower = name.toLowerCase().trim();
  return lower.endsWith(".goat") ? lower : `${lower}.goat`;
}

/**
 * Resolve a .goat domain name to an EVM address.
 * Returns the resolved address, or "not found" / error message.
 */
export const gnsLookup = async (name: string): Promise<string> => {
  try {
    const normalizedName = normalizeGnsName(name);
    if (!normalizedName) return "not found";

    // Check cache first to avoid redundant RPC calls
    const cached = getCachedGns(normalizedName);
    if (cached) {
      return cached;
    }

    const node = namehash(normalizedName);

    // Step 1: Check resolver records
    try {
      let resolverAddress: Address;
      try {
        resolverAddress = await goatClient.readContract({
          address: GNS_REGISTRY_ADDRESS,
          abi: GNS_REGISTRY_ABI,
          functionName: "resolver",
          args: [node],
        });
      } catch {
        resolverAddress = GNS_PUBLIC_RESOLVER_ADDRESS;
      }

      if (resolverAddress && resolverAddress !== "0x0000000000000000000000000000000000000000") {
        const resolvedAddress = await goatClient.readContract({
          address: resolverAddress,
          abi: GNS_RESOLVER_ABI,
          functionName: "addr",
          args: [node],
        });

        if (resolvedAddress && resolvedAddress !== "0x0000000000000000000000000000000000000000") {
          setCachedGns(normalizedName, resolvedAddress);
          return resolvedAddress;
        }
      }
    } catch {
      // Continue to fallback
    }

    // Step 2: Fallback to Base Registrar ownerOf(tokenId)
    try {
      const label = normalizedName.split(".")[0];
      const labelHash = keccak256(toHex(label));
      const tokenId = BigInt(labelHash);

      const owner = await goatClient.readContract({
        address: GNS_BASE_REGISTRAR_ADDRESS,
        abi: GNS_BASE_REGISTRAR_ABI,
        functionName: "ownerOf",
        args: [tokenId],
      });

      if (owner && owner !== "0x0000000000000000000000000000000000000000") {
        setCachedGns(normalizedName, owner);
        return owner;
      }
    } catch {
      // Name not registered in base registrar
    }

    // Step 3: Fallback to Registry owner(node)
    try {
      const regOwner = await goatClient.readContract({
        address: GNS_REGISTRY_ADDRESS,
        abi: GNS_REGISTRY_ABI,
        functionName: "owner",
        args: [node],
      });

      if (regOwner && regOwner !== "0x0000000000000000000000000000000000000000" && regOwner.toLowerCase() !== GNS_BASE_REGISTRAR_ADDRESS.toLowerCase()) {
        setCachedGns(normalizedName, regOwner);
        return regOwner;
      }
    } catch {
      // Not found
    }

    return "not found";
  } catch (error) {
    console.error("Error resolving GNS name:", error);
    return "not found";
  }
};

/**
 * Reverse lookup: resolve an EVM address to its primary .goat name.
 * Returns the .goat name or "not found".
 */
export const gnsReverseLookup = async (address: string): Promise<string> => {
  try {
    // Build the reverse node: addr.reverse
    const reverseAddr = address.toLowerCase().slice(2); // remove 0x
    const reverseName = `${reverseAddr}.addr.reverse`;
    const node = namehash(reverseName);

    // Get resolver for reverse record
    let resolverAddress: Address;
    try {
      resolverAddress = await goatClient.readContract({
        address: GNS_REGISTRY_ADDRESS,
        abi: GNS_REGISTRY_ABI,
        functionName: "resolver",
        args: [node],
      });
    } catch {
      return "not found";
    }

    if (!resolverAddress || resolverAddress === "0x0000000000000000000000000000000000000000") {
      return "not found";
    }

    // Get the name from the resolver
    const name = await goatClient.readContract({
      address: resolverAddress,
      abi: GNS_RESOLVER_ABI,
      functionName: "name",
      args: [node],
    });

    return name || "not found";
  } catch (error) {
    console.error("Error performing GNS reverse lookup:", error);
    return "not found";
  }
};

/**
 * Check if a .goat domain name has an owner (i.e., is registered).
 * Returns true if the name is registered, false if available.
 */
export const gnsCheckOwner = async (name: string): Promise<{ registered: boolean; owner?: string }> => {
  try {
    const normalizedName = normalizeGnsName(name);
    const node = namehash(normalizedName);

    const owner = await goatClient.readContract({
      address: GNS_REGISTRY_ADDRESS,
      abi: GNS_REGISTRY_ABI,
      functionName: "owner",
      args: [node],
    });

    if (!owner || owner === "0x0000000000000000000000000000000000000000") {
      return { registered: false };
    }

    return { registered: true, owner };
  } catch {
    return { registered: false };
  }
};
