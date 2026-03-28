import { tool } from "ai";
import { z } from "zod";
import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  AccountAddress,
  Ed25519PrivateKey
} from "@aptos-labs/ts-sdk";
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";

// Constants for Shelby Testnet/Shelbynet
const APTOS_NODE = "https://api.shelbynet.shelby.xyz/v1";
const SHELBY_ENDPOINT = "https://api.shelbynet.shelby.xyz/shelby";
const SHELBY_INDEXER = "https://api.shelbynet.aptoslabs.com/nocode/v1/public/cmforrguw0042s601fn71f9l2/v1/graphql";
const SHELBY_API_KEY = process.env.SHELBY_API_KEY;
const NETWORK = "shelbynet" as any;

const config = new AptosConfig({
  network: NETWORK,
  fullnode: APTOS_NODE,
  indexer: "https://api.shelbynet.shelby.xyz/v1/graphql",
  clientConfig: { API_KEY: SHELBY_API_KEY }
});
const aptos = new Aptos(config);

/**
 * Helper to get the Shelby account from environment variables
 */
function getShelbyAccount(): Account {
  const privateKeyStr = process.env.SHELBY_APTOS_PRIVATE_KEY;
  if (!privateKeyStr) {
    throw new Error("SHELBY_APTOS_PRIVATE_KEY not found in environment variables.");
  }

  const privateKey = new Ed25519PrivateKey(privateKeyStr);
  return Account.fromPrivateKey({ privateKey });
}

/**
 * uploadToShelby: Upload data to Shelby Protocol
 */
export const uploadToShelby = tool({
  description: "Upload text or data to Shelby Protocol decentralized storage on Aptos.",
  parameters: z.object({
    content: z.string().describe("The content to upload to Shelby storage."),
    fileName: z.string().optional().describe("Optional name for the blob. If not provided, a random name will be used."),
  }),
  execute: async ({ content, fileName }) => {
    try {
      const account = getShelbyAccount();
      const client = new ShelbyNodeClient({
        network: "shelbynet" as any,
        apiKey: SHELBY_API_KEY,
        deployer: AccountAddress.from("0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a"),
        aptos: {
          network: Network.CUSTOM,
          fullnode: APTOS_NODE,
          indexer: SHELBY_INDEXER,
          clientConfig: { API_KEY: SHELBY_API_KEY }
        },
        rpc: {
          baseUrl: SHELBY_ENDPOINT,
          apiKey: SHELBY_API_KEY,
        },
        indexer: {
          baseUrl: SHELBY_INDEXER,
          apiKey: SHELBY_API_KEY,
        }
      });

      const name = fileName || `barzakh-blob-${Date.now()}`;
      const data = Buffer.from(content);
      const expirationMicros = (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000; // 30 days from now in microseconds

      console.log(`Uploading ${data.length} bytes to Shelby as ${name}...`);

      await client.upload({
        signer: account,
        blobData: data,
        blobName: name,
        expirationMicros,
      });

      // Fetch metadata after upload to get the assigned blob address
      const metadata = await client.coordination.getBlobMetadata({
        account: account.accountAddress,
        name: name,
      });

      return {
        success: true,
        message: "File successfully uploaded to Shelby Protocol.",
        blobAddress: metadata?.owner?.toString(), // Or object address if available in metadata
        name: name,
        explorerUrl: `https://explorer.shelby.xyz/shelbynet/account/${account.accountAddress.toString()}/blobs?name=${name}`,
        publicUrl: `${SHELBY_ENDPOINT}/v1/blobs/${account.accountAddress.toString()}/${name}`,
      };
    } catch (error: any) {
      console.error("Error uploading to Shelby:", error);
      return {
        success: false,
        message: "Failed to upload to Shelby Protocol.",
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * getShelbyBlob: Retrieve blob content from Shelby
 */
export const getShelbyBlob = tool({
  description: "Retrieve content and metadata of a blob from Shelby Protocol.",
  parameters: z.object({
    address: z.string().describe("The Aptos account address that owns the blob."),
    name: z.string().describe("The name of the blob to retrieve."),
  }),
  execute: async ({ address, name }) => {
    try {
      // The API expects /v1/blobs/ for downloads
      const publicUrl = `${SHELBY_ENDPOINT}/v1/blobs/${address}/${name}`;

      console.log(`Downloading blob from ${publicUrl}...`);

      const response = await fetch(publicUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.statusText}`);
      }

      const content = await response.text();

      return {
        success: true,
        address,
        name,
        content: content.length > 5000 ? content.substring(0, 5000) + "... (truncated)" : content,
        publicUrl,
      };
    } catch (error: any) {
      console.error("Error getting Shelby blob:", error);
      return {
        success: false,
        message: "Failed to retrieve blob from Shelby Protocol.",
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * getShelbyStoragePrice: Estimate storage cost on Shelby
 */
export const getShelbyStoragePrice = tool({
  description: "Check the estimated cost for storing data on Shelby Protocol.",
  parameters: z.object({
    sizeInBytes: z.number().describe("The size of the data in bytes."),
  }),
  execute: async ({ sizeInBytes }) => {
    try {
      const client = new ShelbyNodeClient({
        network: "shelbynet" as any,
        apiKey: SHELBY_API_KEY,
        deployer: AccountAddress.from("0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a"),
        aptos: {
          network: Network.CUSTOM,
          fullnode: APTOS_NODE,
          indexer: SHELBY_INDEXER,
          clientConfig: { API_KEY: SHELBY_API_KEY }
        },
        rpc: {
          baseUrl: SHELBY_ENDPOINT,
          apiKey: SHELBY_API_KEY,
        },
        indexer: {
          baseUrl: SHELBY_INDEXER,
          apiKey: SHELBY_API_KEY,
        }
      });

      const priceInfo = await client.getStoragePrice(sizeInBytes);

      return {
        success: true,
        sizeInBytes,
        estimatedCostShelbyUSD: priceInfo.price,
        formattedCost: `${priceInfo.price} ShelbyUSD`,
      };
    } catch (error: any) {
      console.error("Error getting Shelby storage price:", error);
      return {
        success: false,
        message: "Failed to get storage price from Shelby Protocol.",
        error: error.message || "Unknown error",
      };
    }
  },
});