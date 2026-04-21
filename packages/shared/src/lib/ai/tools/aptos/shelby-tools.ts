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

import { fetchImageAsBase64 } from "../../utils/fetch-image-as-base64";

// Shelby Testnet configuration
// NOTE: SDK v0.1.x only supports "shelbynet" as ShelbyNetwork type,
// so we use it but override all URLs to point at testnet infrastructure.
const APTOS_NODE = "https://api.testnet.aptoslabs.com/v1";
const SHELBY_ENDPOINT = "https://api.testnet.shelby.xyz/shelby";
const SHELBY_INDEXER = "https://api.testnet.aptoslabs.com/v1/graphql";
const SHELBY_API_KEY = process.env.SHELBY_API_KEY;
const SHELBY_DEPLOYER = AccountAddress.from("0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a");

const config = new AptosConfig({
  network: Network.TESTNET,
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
  description: "Upload text, structured data, or a multimedia file URL to Shelby Protocol decentralized storage on Aptos. Optionally mint the result as an NFT that users can see.",
  parameters: z.object({
    content: z.string().optional().describe("The raw text content to upload (use this OR fileUrl)."),
    fileUrl: z.string().optional().describe("The URL of an image, video, document or file to download and upload to Shelby. ALWAYS use this if the user provides an image or file URL."),
    fileName: z.string().optional().describe("Optional name for the blob. If not provided, a random name will be used."),
    mintAsNFT: z.boolean().optional().describe("Set to true if you are asked to mint this upload as an Aptos NFT in the 'Barzakh AI Storage' collection."),
  }),
  execute: async ({ content, fileUrl, fileName, mintAsNFT }) => {
    try {
      const account = getShelbyAccount();
      const client = new ShelbyNodeClient({
        network: "shelbynet" as any,
        apiKey: SHELBY_API_KEY,
        deployer: SHELBY_DEPLOYER,
        aptos: {
          network: Network.TESTNET,
          fullnode: APTOS_NODE,
          indexer: SHELBY_INDEXER,
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

      let data: Buffer;
      if (fileUrl) {
        console.log(`Downloading file from ${fileUrl}...`);
        const result = await fetchImageAsBase64(fileUrl);
        if (!result) {
          throw new Error(`Failed to fetch fileUrl: ${fileUrl}`);
        }
        data = Buffer.from(result.base64, "base64");
      } else if (content) {
        data = Buffer.from(content);
      } else {
        throw new Error("Must provide either 'content' or 'fileUrl' to upload to Shelby.");
      }

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

      const publicUrl = `${SHELBY_ENDPOINT}/v1/blobs/${account.accountAddress.toString()}/${encodeURIComponent(name)}`;
      const explorerUrl = `https://explorer.shelby.xyz/testnet/account/${account.accountAddress.toString()}/blobs?name=${encodeURIComponent(name)}`;

      let nftMintResponse = null;

      if (mintAsNFT) {
        console.log(`Minting NFT for blob ${name}...`);
        try {
          const collectionName = "Barzakh AI Storage";

          // Step 1: Ensure collection exists.
          // We always attempt creation and gracefully handle "already exists".
          try {
            console.log(`Ensuring collection "${collectionName}" exists...`);
            const createCollectionTxn = await aptos.digitalAsset.createCollectionTransaction({
              creator: account,
              description: "Automated Decentralized Storage Uploads from Barzakh AI using Shelby Protocol.",
              name: collectionName,
              uri: "https://barzakh.tech/logo.png",
            });
            const commitedTx = await aptos.signAndSubmitTransaction({ signer: account, transaction: createCollectionTxn });
            await aptos.waitForTransaction({ transactionHash: commitedTx.hash, options: { checkSuccess: true } });
            console.log("Collection created successfully.");
          } catch (collectionError: any) {
            const errMsg = collectionError?.message || String(collectionError);
            // If collection already exists, that's fine — proceed to mint
            if (errMsg.includes("ECOLLECTION_ALREADY_EXISTS") || errMsg.includes("already_exists") || errMsg.includes("0x80001")) {
              console.log("Collection already exists, proceeding to mint.");
            } else {
              throw new Error(`Failed to create NFT collection: ${errMsg}`);
            }
          }

          // Step 2: Mint the Digital Asset into the collection
          const mintTxn = await aptos.digitalAsset.mintDigitalAssetTransaction({
            creator: account,
            collection: collectionName,
            description: `Decentralized AI Upload via Barzakh. size: ${data.length} bytes.`,
            name: name,
            uri: publicUrl,
          });

          const commitedMintTx = await aptos.signAndSubmitTransaction({ signer: account, transaction: mintTxn });
          const executedTx = await aptos.waitForTransaction({ transactionHash: commitedMintTx.hash, options: { checkSuccess: true } });

          // Extract minted token address from transaction events
          let tokenAddress: string | null = null;
          try {
            const events = (executedTx as any).events || [];
            // Look for the object creation event which contains the minted token address
            const createEvent = events.find((e: any) =>
              e.type?.includes("0x1::object::CreateEvent")
            );
            if (createEvent?.data?.object) {
              tokenAddress = createEvent.data.object;
            }
            // Fallback: look for MintEvent from token module
            if (!tokenAddress) {
              const mintEvent = events.find((e: any) =>
                e.type?.includes("0x4::collection::MintEvent") || e.type?.includes("::collection::Mint")
              );
              if (mintEvent?.data?.token) {
                tokenAddress = mintEvent.data.token;
              }
            }
          } catch (e) {
            console.warn("Could not extract token address from events:", e);
          }

          nftMintResponse = {
            message: `Successfully minted as NFT! View it on Aptos Explorer and Shelby Explorer.`,
            transactionHash: executedTx.hash,
            transactionUrl: `https://explorer.aptoslabs.com/txn/${executedTx.hash}?network=testnet`,
            tokenAddress: tokenAddress,
            tokenUrl: tokenAddress ? `https://explorer.aptoslabs.com/token/${tokenAddress}/overview?network=testnet` : null,
            collectionUrl: `https://explorer.aptoslabs.com/account/${account.accountAddress.toString()}/tokens?network=testnet`,
          };
          console.log(`NFT minted successfully! Txn: ${executedTx.hash}, Token: ${tokenAddress}`);
        } catch (nftError: any) {
          console.error("Failed to mint NFT:", nftError);
          nftMintResponse = {
            error: "Uploaded to Shelby, but failed to mint NFT: " + (nftError.message || String(nftError))
          };
        }
      }

      return {
        success: true,
        message: "File successfully uploaded to Shelby Protocol.",
        blobAddress: metadata?.owner?.toString(), // Or object address if available in metadata
        name: name,
        explorerUrl,
        publicUrl,
        nft: nftMintResponse
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
        deployer: SHELBY_DEPLOYER,
        aptos: {
          network: Network.TESTNET,
          fullnode: APTOS_NODE,
          indexer: SHELBY_INDEXER,
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