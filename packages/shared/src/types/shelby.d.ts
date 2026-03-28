declare module '@shelby-protocol/sdk/node' {
  export interface ShelbyRPCConfig {
    baseUrl?: string;
    apiKey?: string;
  }
  export interface ShelbyIndexerConfig {
    baseUrl?: string;
    apiKey?: string;
  }
  export interface ShelbyClientConfig {
    network: any;
    apiKey?: string;
    aptos?: any;
    deployer?: any;
    rpc?: ShelbyRPCConfig;
    indexer?: ShelbyIndexerConfig;
    faucet?: { baseUrl?: string; authToken?: string };
  }
  export class ShelbyNodeClient {
    constructor(config: ShelbyClientConfig);
    upload(params: {
      blobData: Uint8Array | Buffer;
      signer: any;
      blobName: string;
      expirationMicros: number;
      options?: any;
    }): Promise<void>;
    getStoragePrice(size: number): Promise<{ price: number }>;
    coordination: {
      getBlobMetadata(params: { account: any; name: string }): Promise<any>;
    };
  }
}