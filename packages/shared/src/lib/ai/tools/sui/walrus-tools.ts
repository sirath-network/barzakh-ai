// Monkey patch fs to handle Next.js Turbopack virtual "/ROOT" paths for WebAssembly files
if (typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const patchPath = (p: any) => {
      if (typeof p === 'string' && p.startsWith('/ROOT/')) {
        const workspaceRoot = process.cwd().includes('/apps/frontend')
          ? process.cwd().replace('/apps/frontend', '')
          : process.cwd().includes('/packages/shared')
            ? process.cwd().replace('/packages/shared', '')
            : process.cwd();
        return p.replace('/ROOT', workspaceRoot);
      }
      return p;
    };

    if (fs && !fs.__patchedForTurbopack) {
      fs.__patchedForTurbopack = true;

      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = function (path: any, options: any) {
        return originalReadFileSync(patchPath(path), options);
      };

      const originalReadFile = fs.readFile;
      fs.readFile = function (path: any, options: any, callback: any) {
        if (typeof options === 'function') {
          return originalReadFile(patchPath(path), options);
        }
        return originalReadFile(patchPath(path), options, callback);
      };

      if (fs.promises) {
        const originalPromisesReadFile = fs.promises.readFile;
        fs.promises.readFile = function (path: any, options: any) {
          return originalPromisesReadFile(patchPath(path), options);
        };
      }
      console.log("[Turbopack FS Patch] Successfully patched fs read methods to resolve virtual /ROOT paths");
    }
  } catch (e) {
    console.error("[Turbopack FS Patch] Failed to patch fs:", e);
  }
}

// Force IPv4 first in Node.js to resolve IPv6 connection timeouts to Sui/Walrus nodes
if (typeof window === 'undefined') {
  import('dns').then((dns) => {
    if (dns.setDefaultResultOrder) {
      dns.setDefaultResultOrder('ipv4first');
    }
  }).catch(() => {});
}

import { tool } from "ai";
import { z } from "zod";
import { fetchImageAsBase64 } from "../../utils/fetch-image-as-base64";

/**
 * uploadToWalrus: Upload text, structured data, or a file URL to Walrus Protocol decentralized storage on Sui.
 */
export const uploadToWalrus = tool({
  description: "Upload text, structured data, or a file URL to Walrus Protocol decentralized storage on Sui.",
  parameters: z.object({
    content: z.string().optional().describe("The raw text content to upload (use this OR fileUrl)."),
    fileUrl: z.string().optional().describe("The URL of an image, video, document or file to download and upload to Walrus. ALWAYS use this if the user provides an image or file URL."),
    fileName: z.string().optional().describe("Optional name or identifier for the blob."),
    epochs: z.number().optional().default(1).describe("The duration of storage in epochs (1 epoch is approximately 14 days). Defaults to 1."),
  }),
  execute: async (args) => {
    const { content, fileUrl, fileName, epochs } = args;
    const _keypair = (args as any)._keypair;
    try {
      let publisherUrl = process.env.WALRUS_PUBLISHER_URL || "https://publisher.walrus-testnet.walrus.space";
      const aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || "https://aggregator.walrus-testnet.walrus.space";

      // Self-heal: if publisherUrl is configured as an upload-relay by mistake, redirect to the correct public publisher
      if (publisherUrl.includes("upload-relay")) {
        console.warn(`[Walrus] WALRUS_PUBLISHER_URL is set to upload-relay (${publisherUrl}). Redirecting HTTP fallback to public publisher endpoint...`);
        if (publisherUrl.includes("mainnet")) {
          publisherUrl = "https://publisher.walrus-mainnet.walrus.space";
        } else if (publisherUrl.includes("testnet")) {
          publisherUrl = "https://publisher.walrus-testnet.walrus.space";
        } else {
          publisherUrl = publisherUrl.replace("upload-relay", "publisher.walrus-");
        }
      }
      
      let data: Buffer;
      let mimeType = "text/plain";

      if (fileUrl) {
        console.log(`Downloading file from ${fileUrl}...`);
        const result = await fetchImageAsBase64(fileUrl);
        if (!result) {
          throw new Error(`Failed to fetch fileUrl: ${fileUrl}`);
        }
        data = Buffer.from(result.base64, "base64");
        mimeType = result.mimeType;
      } else if (content) {
        data = Buffer.from(content);
      } else {
        throw new Error("Must provide either 'content' or 'fileUrl' to upload to Walrus.");
      }

      const epochsVal = epochs || 1;

      // Direct write via SDK on Mainnet if keypair is provided
      if (_keypair) {
        try {
          console.log(`[Walrus] Found signer keypair. Uploading directly using Walrus TS SDK via Relay...`);
          const { SuiJsonRpcClient } = await import("@mysten/sui/jsonRpc");
          const { walrus } = await import("@mysten/walrus");

          const client = new SuiJsonRpcClient({
            network: "mainnet",
            url: "https://fullnode.mainnet.sui.io:443"
          });

          const walClient = client.$extend(walrus({
            uploadRelay: {
              host: "https://upload-relay.mainnet.walrus.space",
              sendTip: { max: 1_000_000_000 } // Max 1 SUI/WAL tip
            }
          }));

          const writeResult = await walClient.walrus.writeBlob({
            blob: new Uint8Array(data),
            deletable: false,
            epochs: epochsVal,
            signer: _keypair
          });

          console.log("[Walrus] SDK write response:", writeResult);

          const blobId = writeResult.blobId;
          const publicUrl = `${aggregatorUrl}/v1/blobs/${blobId}`;
          const explorerUrl = `https://walruscan.com/mainnet/blob/${blobId}`;

          return {
            success: true,
            message: "Successfully stored blob on Walrus Mainnet using user agent wallet.",
            blobId,
            suiCertifiedObjectId: writeResult.blobObject?.id || "",
            endEpoch: writeResult.blobObject?.storage?.end_epoch || 0,
            fileName: fileName || `walrus-blob-${Date.now()}`,
            sizeInBytes: data.length,
            mimeType,
            publicUrl,
            explorerUrl,
          };
        } catch (e: any) {
          console.warn(`[Walrus] SDK direct write failed (${e.message}). Falling back to HTTP publisher...`);
        }
      }

      console.log(`Uploading ${data.length} bytes to Walrus publisher at ${publisherUrl}...`);

      const response = await fetch(`${publisherUrl}/v1/blobs?epochs=${epochsVal}`, {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
        },
        body: new Uint8Array(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Walrus publisher upload failed with status ${response.status}: ${response.statusText}. ${errorText}`);
      }

      const resJson = await response.json();
      console.log("Walrus upload response:", resJson);

      let blobId = "";
      let endEpoch = 0;
      let suiCertifiedObjectId = "";
      let isNewlyCreated = false;

      if (resJson.newlyCreated) {
        isNewlyCreated = true;
        const nc = resJson.newlyCreated;
        blobId = nc.blobId || nc.blobObject?.blobId || "";
        endEpoch = nc.endEpoch || nc.blobObject?.storage?.endEpoch || 0;
        suiCertifiedObjectId = nc.suiCertifiedObjectId || nc.blobObject?.id || "";
      } else if (resJson.alreadyCertified) {
        const ac = resJson.alreadyCertified;
        blobId = ac.blobId || "";
        endEpoch = ac.endEpoch || 0;
        suiCertifiedObjectId = ac.suiCertifiedObjectId || ac.event?.txDigest || "";
      } else {
        throw new Error("Invalid or unrecognized response format from Walrus publisher.");
      }

      if (!blobId) {
        throw new Error("Failed to resolve blobId from publisher response.");
      }

      const publicUrl = `${aggregatorUrl}/v1/blobs/${blobId}`;
      const isTestnet = publisherUrl.includes("testnet") || aggregatorUrl.includes("testnet");
      const network = isTestnet ? "testnet" : "mainnet";
      const explorerUrl = `https://walruscan.com/${network}/blob/${blobId}`;

      return {
        success: true,
        message: isNewlyCreated 
          ? "Successfully stored new blob on Walrus decentralized storage." 
          : "Blob content already exists on Walrus and is certified.",
        blobId,
        suiCertifiedObjectId,
        endEpoch,
        fileName: fileName || `walrus-blob-${Date.now()}`,
        sizeInBytes: data.length,
        mimeType,
        publicUrl,
        explorerUrl,
      };
    } catch (error: any) {
      console.error("Error uploading to Walrus:", error);
      return {
        success: false,
        message: "Failed to upload data to Walrus Protocol.",
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * getWalrusBlob: Retrieve content from Walrus Protocol decentralized storage.
 */
export const getWalrusBlob = tool({
  description: "Retrieve blob data from Walrus Protocol decentralized storage using a blob ID.",
  parameters: z.object({
    blobId: z.string().describe("The unique Base64 URL-safe u256 Blob ID to retrieve."),
  }),
  execute: async ({ blobId }) => {
    try {
      const aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || "https://aggregator.walrus-testnet.walrus.space";
      const targetUrl = `${aggregatorUrl}/v1/blobs/${blobId.trim()}`;
      
      console.log(`Retrieving blob ${blobId} from Walrus aggregator at ${targetUrl}...`);
      const response = await fetch(targetUrl);

      if (!response.ok) {
        throw new Error(`Walrus aggregator fetch failed with status ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let content: any = text;
      try {
        content = JSON.parse(text);
      } catch (e) {
        // Content is not JSON, return as raw text
      }

      return {
        success: true,
        message: "Blob successfully retrieved from Walrus Protocol.",
        blobId,
        content,
      };
    } catch (error: any) {
      console.error("Error fetching from Walrus:", error);
      return {
        success: false,
        message: "Failed to retrieve blob from Walrus Protocol.",
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * getWalrusStoragePrice: Check the estimated cost for storing data on Walrus Protocol.
 */
export const getWalrusStoragePrice = tool({
  description: "Check the estimated cost for storing data on Walrus Protocol.",
  parameters: z.object({
    sizeInBytes: z.number().describe("The size of the data in bytes."),
    epochs: z.number().optional().default(1).describe("The duration of storage in epochs (1 epoch is approximately 14 days). Defaults to 1."),
  }),
  execute: async ({ sizeInBytes, epochs }) => {
    try {
      const epochsVal = epochs || 1;
      
      // Basic cost estimation: 1 epoch of 1 GiB costs approx 1 WAL
      const sizeInGiB = sizeInBytes / (1024 * 1024 * 1024);
      const estimatedWalTokens = Math.max(0.01, Number((sizeInGiB * epochsVal).toFixed(4)));

      return {
        success: true,
        sizeInBytes,
        epochs: epochsVal,
        estimatedWalCost: estimatedWalTokens,
        formattedCost: `${estimatedWalTokens} WAL`,
        pricingNotes: "WAL token pricing on Walrus is dynamic based on storage epoch size. 1 epoch is approximately 14 days.",
      };
    } catch (error: any) {
      console.error("Error getting Walrus storage price:", error);
      return {
        success: false,
        message: "Failed to estimate storage price from Walrus Protocol.",
        error: error.message || "Unknown error",
      };
    }
  },
});
