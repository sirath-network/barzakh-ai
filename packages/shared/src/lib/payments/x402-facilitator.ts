/**
 * Base x402 Facilitator Client
 * 
 * Implements the x402 payment protocol for USDC payments on Base Mainnet.
 * Uses EIP-3009 transferWithAuthorization for meta-transactions.
 * 
 * @see https://docs.x402.org
 */

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Facilitator API base URL
 * Uses Coinbase CDP x402 facilitator for Base Mainnet
 */
export const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://facilitator.xpay.sh";

/**
 * Network configurations for Base
 */
export const BASE_NETWORKS = {
    mainnet: {
        network: "eip155:8453",
        chainId: 8453,
        rpcUrl: "https://mainnet.base.org",
        usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        usdcDecimals: 6,
        usdcSymbol: "USDC",
    }
} as const;

/**
 * EIP-712 domain for USDC token (EIP-3009)
 */
export const getEIP712Domain = (network: "mainnet") => ({
    name: "USD Coin",
    version: "2",
    chainId: BASE_NETWORKS[network].chainId,
    verifyingContract: BASE_NETWORKS[network].usdcAddress,
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
    network: "eip155:8453";
    asset: string;
    amount: string;
    payTo: string;
    maxTimeoutSeconds: number;
    extra?: Record<string, unknown>;
}

export interface X402PaymentHeader {
    x402Version: 2;
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

/**
 * V2 PaymentPayload sent to the facilitator
 */
export interface PaymentPayloadV2 {
    x402Version: 2;
    accepted: PaymentRequirements;
    payload: Record<string, unknown>;
}

export interface VerifyRequest {
    x402Version: 2;
    paymentPayload: PaymentPayloadV2;
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
 * Convert USD amount to USDC smallest unit (6 decimals)
 * @param usdAmount - Amount in USD (e.g., 25.00)
 * @returns Amount in USDC smallest unit as string
 */
export function usdToUsdcUnits(usdAmount: number): string {
    return Math.floor(usdAmount * 1_000_000).toString();
}

/**
 * Convert USDC smallest unit to USD display
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
    network: "mainnet" = "mainnet",
    timeoutSeconds: number = 300,
): PaymentRequirements {
    const config = BASE_NETWORKS[network];
    return {
        scheme: "exact",
        network: config.network,
        payTo,
        asset: config.usdcAddress,
        amount: usdToUsdcUnits(usdAmount),
        maxTimeoutSeconds: timeoutSeconds,
        extra: {
            name: "USD Coin",
            version: "2",
        },
    };
}

/**
 * Create EIP-712 typed data for signing
 */
export function createTransferAuthorizationTypedData(
    from: string,
    to: string,
    value: string,
    network: "mainnet" = "mainnet",
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
    network: "mainnet" = "mainnet"
): string {
    const header: X402PaymentHeader = {
        x402Version: 2,
        scheme: "exact",
        network: BASE_NETWORKS[network].network,
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
    paymentPayload: PaymentPayloadV2,
    paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
    const requestBody = {
        x402Version: 2,
        paymentPayload,
        paymentRequirements,
    };

    console.log("[x402 debug] Sending to facilitator:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${X402_FACILITATOR_URL}/verify`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
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
    paymentPayload: PaymentPayloadV2,
    paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
    const response = await fetch(`${X402_FACILITATOR_URL}/settle`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            x402Version: 2,
            paymentPayload,
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
    console.log("[x402-facilitator] Raw response from /settle endpoint:", JSON.stringify(data, null, 2));
    
    return {
        success: true,
        txHash: data.txHash || data.hash || data.transactionHash || data.transaction,
        blockNumber: data.blockNumber,
        timestamp: data.timestamp,
    };
}

/**
 * Check facilitator health
 */
export async function checkFacilitatorHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${X402_FACILITATOR_URL}/healthcheck`);
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
    network?: "mainnet";
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
 *   network: "mainnet",
 *   signTypedData: walletClient.signTypedData,
 * });
 * ```
 */
export async function executePaymentFlow(
    params: PaymentFlowParams
): Promise<PaymentFlowResult> {
    const { payer, receiver, usdAmount, network = "mainnet", signTypedData } = params;

    try {
        // 1. Create payment requirements
        const paymentRequirements = createPaymentRequirements(receiver, usdAmount, network);

        // 2. Create typed data for signing
        const typedData = createTransferAuthorizationTypedData(
            payer,
            receiver,
            paymentRequirements.amount,
            network
        );

        // 3. Sign with wallet
        const signature = await signTypedData(typedData);

        // 4. Build V2 paymentPayload
        const paymentPayload: PaymentPayloadV2 = {
            x402Version: 2,
            accepted: paymentRequirements,
            payload: {
                ...typedData.message,
                signature,
                asset: BASE_NETWORKS[network].usdcAddress,
            },
        };

        // 5. Verify payment
        const verifyResult = await verifyPayment(paymentPayload, paymentRequirements);
        if (!verifyResult.isValid) {
            return {
                success: false,
                error: verifyResult.invalidReason || "Payment verification failed",
            };
        }

        // 6. Settle on-chain
        const settleResult = await settlePayment(paymentPayload, paymentRequirements);

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
