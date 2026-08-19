/**
 * GOAT Name Service (GNS) AI Tools
 * 
 * AI-callable tools for resolving, checking, and exploring .goat domain names
 * on GOAT Network. Works like ENS but for the GOAT ecosystem.
 * 
 * Tools:
 * - gnsToAddress: Resolve .goat name → EVM address
 * - gnsCheckAvailability: Check if a .goat domain is available
 * - gnsReverseLookup: Resolve EVM address → .goat name
 * - gnsGetPrice: Get registration price for a .goat name (placeholder)
 */

import { gnsLookup, gnsReverseLookup as reverseLookup, gnsCheckOwner } from "../../../utils/gns-lookup";
import { tool } from "ai";
import { z } from "zod";

// GOAT Explorer for links
const GOAT_EXPLORER = "https://explorer.goat.network";

/**
 * Resolve a .goat domain name to its EVM address
 */
export const gnsToAddress = tool({
  description: "Resolve a .goat domain name (GOAT Name Service) to its EVM address on GOAT Network (Chain ID 2345). Works like ENS but for GOAT Network. Examples: 'rock.goat' → 0x1234..., '9999.goat' → 0xabcd... Use this whenever a user provides a .goat name instead of an address.",
  parameters: z.object({
    gnsName: z.string().optional().describe("The .goat domain name to resolve (e.g. 'rock.goat', 'glory.goat', '9999.goat')"),
    name: z.string().optional().describe("The .goat domain name to resolve (e.g. 'rock.goat', 'glory.goat', '9999.goat')"),
  }),
  execute: async ({ gnsName, name }) => {
    const domain = gnsName || name || "";
    try {
      const address = await gnsLookup(domain);
      console.log(`gns resolved: ${domain} → ${address}`);

      if (address === "not found") {
        return {
          status: "not_found",
          name: domain,
          message: `The GNS name "${domain}" could not be resolved. It may not be registered yet.`,
          network: "GOAT Network (Chain ID 2345)",
        };
      }

      if (address.startsWith("error")) {
        return {
          status: "error",
          name: domain,
          error: address,
          network: "GOAT Network (Chain ID 2345)",
        };
      }

      return {
        status: "success",
        name: domain,
        address,
        explorerUrl: `${GOAT_EXPLORER}/address/${address}`,
        network: "GOAT Network (Chain ID 2345)",
        note: "You can now use this address to check balances, portfolio, or transaction history on GOAT Network.",
      };
    } catch (error: any) {
      return {
        status: "error",
        name: domain,
        error: "Failed to resolve GNS name",
        details: error.message,
        network: "GOAT Network (Chain ID 2345)",
      };
    }
  },
});

/**
 * Check if a .goat domain name is available for registration
 */
export const gnsCheckAvailability = tool({
  description: "Check if a .goat domain name is available for registration or already taken on GOAT Network.",
  parameters: z.object({
    gnsName: z.string().optional().describe("The .goat domain name to check (e.g. 'satoshi.goat', 'myagent.goat')"),
    name: z.string().optional().describe("The .goat domain name to check (e.g. 'satoshi.goat', 'myagent.goat')"),
  }),
  execute: async ({ gnsName, name }) => {
    const domain = gnsName || name || "";
    try {
      const result = await gnsCheckOwner(domain);

      const formattedName = domain.endsWith(".goat") ? domain : `${domain}.goat`;

      if (result.registered) {
        return {
          status: "taken",
          name: formattedName,
          available: false,
          owner: result.owner,
          ownerExplorerUrl: `${GOAT_EXPLORER}/address/${result.owner}`,
          network: "GOAT Network (Chain ID 2345)",
          message: `The name "${formattedName}" is already registered.`,
        };
      }

      return {
        status: "available",
        name: formattedName,
        available: true,
        network: "GOAT Network (Chain ID 2345)",
        message: `The name "${formattedName}" is available for registration!`,
        note: "To register this name, the user can use the GOAT Network GNS registrar or the agentkit-gns CLI.",
      };
    } catch (error: any) {
      return {
        status: "error",
        name: domain,
        error: "Failed to check GNS availability",
        details: error.message,
      };
    }
  },
});

/**
 * Reverse lookup: resolve an EVM address to its primary .goat name
 */
export const gnsReverseLookupTool = tool({
  description: "Reverse lookup a GOAT Network EVM address to find its primary .goat domain name. Like reverse ENS but for GOAT Network. Useful for identifying whale wallets, agent identities, or named accounts.",
  parameters: z.object({
    address: z.string().describe("The EVM wallet address to reverse lookup (0x...)"),
  }),
  execute: async ({ address }) => {
    try {
      const name = await reverseLookup(address);

      if (name === "not found") {
        return {
          status: "no_name",
          address,
          message: `No .goat name is set for address ${address}.`,
          explorerUrl: `${GOAT_EXPLORER}/address/${address}`,
          network: "GOAT Network (Chain ID 2345)",
        };
      }

      return {
        status: "success",
        address,
        gnsName: name,
        explorerUrl: `${GOAT_EXPLORER}/address/${address}`,
        network: "GOAT Network (Chain ID 2345)",
        note: `This address resolves to "${name}" on GOAT Name Service.`,
      };
    } catch (error: any) {
      return {
        status: "error",
        address,
        error: "Failed to perform GNS reverse lookup",
        details: error.message,
      };
    }
  },
});
