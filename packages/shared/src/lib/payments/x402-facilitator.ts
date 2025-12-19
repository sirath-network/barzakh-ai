/**
 * Cronos x402 Facilitator Client
 * 
 * Implements the x402 payment protocol for gasless USDC.e payments on Cronos.
 * Uses EIP-3009 transferWithAuthorization for meta-transactions.
 * 
 * @see https://docs.cronos.org/cronos-x402-facilitator/api-reference
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Facilitator API base URL (same for both mainnet and testnet)
 */
export const X402_FACILITATOR_URL = "https://facilitator.cronoslabs.org/v2/x402";

/**
 * Network configurations for Cronos
 */
export const CRONOS_NETWORKS = {
    mainnet: {
        network: "cronos-mainnet",
        chainId: 25,
        rpcUrl: "https://evm.cronos.org",
        usdcAddress: "0xf951eC28187D9E5Ca673Da8FE6757E6f0Be5F77C",
        usdcDecimals: 6,
        usdcSymbol: "USDC.e",
    },
    testnet: {
        network: "cronos-testnet",
        chainId: 338,
        rpcUrl: "https://evm-t3.cronos.org",
        usdcAddress: "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0",
        usdcDecimals: 6,
        usdcSymbol: "devUSDC.e",
    },
} as const;

/**
 * EIP-712 domain for USDC.e token (EIP-3009)
 */
export const getEIP712Domain = (network: "mainnet" | "testnet") => ({
    name: "Bridged USDC (Stargate)",
    version: "1",
    chainId: CRONOS_NETWORKS[network].chainId,
    verifyingContract: CRONOS_NETWORKS[network].usdcAddress,
});

/**
 * EIP-3009 TransferWithAuthorization type data
 */
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
    TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
    ],
};

// =============================================================================
// TYPES
// =============================================================================

export interface PaymentRequirements {
    scheme: "exact";
    network: "cronos-testnet" | "cronos-mainnet";
    payTo: string;
    asset: string;
    maxAmountRequired: string;
    maxTimeoutSeconds: number;
    description: string;
    mimeType: string;
    outputSchema?: any;
}

export interface X402PaymentHeader {
    x402Version: 1;
    scheme: "exact";
    network: string;
    payload: {
        from: string;
        to: string;
        value: string | number;
        validAfter: string | number;
        validBefore: string | number;
        nonce: string;
        signature: string;
        asset: string;
    };
}

export interface VerifyRequest {
    x402Version: 1;
    paymentHeader: string; // Base64 encoded X402PaymentHeader
    paymentRequirements: PaymentRequirements;
}

export interface VerifyResponse {
    isValid: boolean;
    invalidReason?: string | null;
    payer?: string;
}

export interface SettleResponse {
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    timestamp?: number;
    error?: string;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a random 32-byte nonce for EIP-3009
 */
export function generateNonce(): string {
    const array = new Uint8Array(32);
    if (typeof window !== "undefined" && window.crypto) {
        window.crypto.getRandomValues(array);
    } else {
        // Node.js fallback
        for (let i = 0; i < 32; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
    }
    return "0x" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Convert USD amount to USDC.e smallest unit (6 decimals)
 * @param usdAmount - Amount in USD (e.g., 25.00)
 * @returns Amount in USDC.e smallest unit as string
 */
export function usdToUsdcUnits(usdAmount: number): string {
    return Math.floor(usdAmount * 1_000_000).toString();
}

/**
 * Convert USDC.e smallest unit to USD display
 * @param units - Amount in smallest unit
 * @returns Amount as USD string
 */
export function usdcUnitsToUsd(units: string): string {
    return (parseInt(units) / 1_000_000).toFixed(2);
}

/**
 * Encode payment header to Base64
 */
export function encodePaymentHeader(header: X402PaymentHeader): string {
    const json = JSON.stringify(header);
    if (typeof window !== "undefined") {
        return btoa(json);
    }
    return Buffer.from(json).toString("base64");
}

/**
 * Decode Base64 payment header
 */
export function decodePaymentHeader(encoded: string): X402PaymentHeader {
    let json: string;
    if (typeof window !== "undefined") {
        json = atob(encoded);
    } else {
        json = Buffer.from(encoded, "base64").toString("utf-8");
    }
    return JSON.parse(json);
}

// =============================================================================
// API CLIENT
// =============================================================================

/**
 * Create x402 payment requirements for subscription
 */
export function createPaymentRequirements(
    payTo: string,
    usdAmount: number,
    network: "mainnet" | "testnet" = "testnet",
    timeoutSeconds: number = 300,
    description: string = "Barzakh AI Subscription Payment",
    mimeType: string = "application/json"
): PaymentRequirements {
    const config = CRONOS_NETWORKS[network];
    return {
        scheme: "exact",
        network: config.network,
        payTo,
        asset: config.usdcAddress,
        maxAmountRequired: usdToUsdcUnits(usdAmount),
        maxTimeoutSeconds: timeoutSeconds,
        description,
        mimeType,
    };
}

/**
 * Create EIP-712 typed data for signing
 */
export function createTransferAuthorizationTypedData(
    from: string,
    to: string,
    value: string,
    network: "mainnet" | "testnet" = "testnet",
    validitySeconds: number = 300
) {
    const now = Math.floor(Date.now() / 1000);
    const nonce = generateNonce();

    return {
        domain: getEIP712Domain(network),
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: "TransferWithAuthorization" as const,
        message: {
            from,
            to,
            value,
            validAfter: "0",
            validBefore: (now + validitySeconds).toString(),
            nonce,
        },
    };
}

/**
 * Build x402 payment header from signature
 */
export function buildPaymentHeader(
    signature: string,
    authorization: {
        from: string;
        to: string;
        value: string;
        validAfter: string | number;
        validBefore: string | number;
        nonce: string;
    },
    asset: string,
    network: "mainnet" | "testnet" = "testnet"
): string {
    const header: X402PaymentHeader = {
        x402Version: 1,
        scheme: "exact",
        network: CRONOS_NETWORKS[network].network,
        payload: {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value,
            validAfter: authorization.validAfter,
            validBefore: authorization.validBefore,
            nonce: authorization.nonce,
            signature,
            asset,
        },
    };
    return encodePaymentHeader(header);
}

/**
 * Verify payment with x402 facilitator
 */
export async function verifyPayment(
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
    const requestBody = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
    };

    const response = await fetch(`${X402_FACILITATOR_URL}/verify`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X402-Version": "1",
        },
        body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
        throw new Error(`Verification failed: ${responseText}`);
    }

    try {
        return JSON.parse(responseText);
    } catch {
        throw new Error(`Invalid response from facilitator: ${responseText}`);
    }
}

/**
 * Settle payment on-chain via x402 facilitator
 */
export async function settlePayment(
    paymentHeader: string,
    paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
    const response = await fetch(`${X402_FACILITATOR_URL}/settle`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X402-Version": "1",
        },
        body: JSON.stringify({
            x402Version: 1,
            paymentHeader,
            paymentRequirements,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        return {
            success: false,
            error: `Settlement failed: ${error}`,
        };
    }

    const data = await response.json();
    return {
        success: true,
        txHash: data.txHash,
        blockNumber: data.blockNumber,
        timestamp: data.timestamp,
    };
}

/**
 * Check facilitator health
 */
export async function checkFacilitatorHealth(): Promise<boolean> {
    try {
        const response = await fetch("https://facilitator.cronoslabs.org/healthcheck");
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get supported networks from facilitator
 */
export async function getSupportedNetworks(): Promise<string[]> {
    const response = await fetch(`${X402_FACILITATOR_URL}/supported`);
    const data = await response.json();
    return data.kinds?.map((k: { network: string }) => k.network) || [];
}

// =============================================================================
// HIGH-LEVEL PAYMENT FLOW
// =============================================================================

export interface PaymentFlowParams {
    /** Payer's wallet address */
    payer: string;
    /** Receiver's wallet address (seller) */
    receiver: string;
    /** Amount in USD */
    usdAmount: number;
    /** Network to use */
    network?: "mainnet" | "testnet";
    /** Sign function from wallet (returns EIP-712 signature) */
    signTypedData: (typedData: any) => Promise<string>;
}

export interface PaymentFlowResult {
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    error?: string;
}

/**
 * Execute complete x402 payment flow
 * 
 * 1. Create typed data for EIP-3009 authorization
 * 2. Sign with user's wallet
 * 3. Build payment header
 * 4. Verify with facilitator
 * 5. Settle on-chain
 * 
 * @example
 * ```ts
 * const result = await executePaymentFlow({
 *   payer: "0xBuyer...",
 *   receiver: "0xSeller...",
 *   usdAmount: 25.00,
 *   network: "testnet",
 *   signTypedData: walletClient.signTypedData,
 * });
 * ```
 */
export async function executePaymentFlow(
    params: PaymentFlowParams
): Promise<PaymentFlowResult> {
    const { payer, receiver, usdAmount, network = "testnet", signTypedData } = params;

    try {
        // 1. Create payment requirements
        const paymentRequirements = createPaymentRequirements(receiver, usdAmount, network);

        // 2. Create typed data for signing
        const typedData = createTransferAuthorizationTypedData(
            payer,
            receiver,
            paymentRequirements.maxAmountRequired,
            network
        );

        // 3. Sign with wallet
        const signature = await signTypedData(typedData);

        // 4. Build payment header
        const paymentHeader = buildPaymentHeader(
            signature,
            typedData.message,
            network
        );

        // 5. Verify payment
        const verifyResult = await verifyPayment(paymentHeader, paymentRequirements);
        if (!verifyResult.isValid) {
            return {
                success: false,
                error: verifyResult.invalidReason || "Payment verification failed",
            };
        }

        // 6. Settle on-chain
        const settleResult = await settlePayment(paymentHeader, paymentRequirements);

        return {
            success: settleResult.success,
            txHash: settleResult.txHash,
            blockNumber: settleResult.blockNumber,
            error: settleResult.error,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || "Payment flow failed",
        };
    }
}
