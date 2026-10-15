import {
	getAddress,
	isAddress,
	keccak256,
	parseUnits,
	stringToHex,
	zeroAddress,
	encodeFunctionData,
} from "viem";
import { z } from "zod";
import { arcPaymentAbi } from "./contract";
import {
	ARC_ANALYSIS_PRICE,
	ARC_CHAIN_ID,
	ARC_MAINNET_CHAIN_ID,
	ARC_TESTNET_CHAIN_ID,
	getArcChainId,
} from "./config";

const address = z
	.string()
	.refine(
		(value) => isAddress(value) && value.toLowerCase() !== zeroAddress,
		"Invalid wallet address",
	);
export const hashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
export const analysisRequestSchema = z
	.object({
		token_name: z
			.string()
			.trim()
			.transform((value) => value.replace(/^\$/, ""))
			.pipe(
				z
					.string()
					.min(1)
					.max(100)
					.regex(
						/^[A-Za-z0-9_\-\.:]{1,100}$/,
						"Invalid symbol, stock ticker, or contract address",
					),
			)
			.transform((value) => {
				if (value.startsWith("equity:") || value.startsWith("EQUITY:")) {
					return value.replace(/^equity:/i, "").toUpperCase();
				}
				if (value.startsWith("stock:") || value.startsWith("STOCK:")) {
					return value.replace(/^stock:/i, "").toUpperCase();
				}
				if (/^0x[0-9a-fA-F]{40}$/.test(value)) {
					return getAddress(value);
				}
				if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
					return value;
				}
				return value.toUpperCase();
			}),
		payer: address.transform((value) => getAddress(value)),
		prompt: z
			.string()
			.trim()
			.max(4000, "Research instruction must be 4,000 characters or fewer")
			.optional(),
	})
	.transform((obj) => {
		if (obj.prompt && obj.prompt.length > 0) {
			return {
				token_name: obj.token_name,
				payer: obj.payer,
				prompt: obj.prompt,
			};
		}
		return { token_name: obj.token_name, payer: obj.payer };
	});
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;

export const invoiceSchema = z
	.object({
		version: z.enum(["barzakh-arc-v1", "barzakh-arc-v2"]),
		payment_contract: address.optional(),
		id: z.string().uuid(),
		chain_id: z.union([
			z.literal(ARC_MAINNET_CHAIN_ID),
			z.literal(ARC_TESTNET_CHAIN_ID),
		]),
		currency: z.literal("USDC"),
		amount: z.literal(ARC_ANALYSIS_PRICE),
		destination_wallet: address,
		payer: address,
		request_hash: hashSchema,
		issued_at: z.number().int().positive(),
		expires_at: z.number().int().positive(),
	})
	.strict()
	.refine(
		(invoice) =>
			invoice.version === "barzakh-arc-v2"
				? !!invoice.payment_contract
				: !invoice.payment_contract,
		"Contract invoices require a payment contract; legacy invoices must not contain one",
	);
export type ArcInvoice = z.infer<typeof invoiceSchema>;

/** Stable across object key order; restricted to JSON values. */
export function canonicalJson(value: unknown): string {
	if (value === null || typeof value === "string" || typeof value === "boolean")
		return JSON.stringify(value);
	if (typeof value === "number") {
		if (!Number.isFinite(value))
			throw new Error("Cannot hash a non-finite JSON number");
		return JSON.stringify(value);
	}
	if (typeof value !== "object")
		throw new Error("Cannot hash a non-JSON value");
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	const object = value as Record<string, unknown>;
	return `{${Object.keys(object)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
		.join(",")}}`;
}

export const hashJson = (value: unknown) =>
	keccak256(stringToHex(canonicalJson(value)));
export const invoiceCommitment = (invoice: ArcInvoice) =>
	hashJson(invoiceSchema.parse(invoice));

export function validateInvoiceForPayment(
	input: unknown,
	request: AnalysisRequest,
	expectedRecipient: string,
	now = Math.floor(Date.now() / 1000),
	expectedContract?: string,
	expectedChainId?: number,
): ArcInvoice {
	const invoice = invoiceSchema.parse(input);
	if (
		expectedContract &&
		invoice.payment_contract?.toLowerCase() !== expectedContract.toLowerCase()
	) {
		throw new Error(
			"Invoice payment contract does not match the configured service",
		);
	}
	const activeChainId = expectedChainId ?? getArcChainId();
	if (invoice.chain_id !== activeChainId) {
		throw new Error(
			`Invoice chain ID ${invoice.chain_id} does not match active chain ${activeChainId}`,
		);
	}
	if (
		!isAddress(expectedRecipient) ||
		invoice.destination_wallet.toLowerCase() !== expectedRecipient.toLowerCase()
	) {
		throw new Error(
			"Invoice recipient does not match the configured Signal Agent",
		);
	}
	if (
		invoice.payer.toLowerCase() !== request.payer.toLowerCase() ||
		invoice.request_hash !== hashJson(request)
	) {
		throw new Error("Invoice is for a different payer or request");
	}
	if (
		invoice.issued_at > now + 30 ||
		invoice.expires_at <= now ||
		invoice.expires_at - invoice.issued_at !== 600
	) {
		throw new Error("Invoice has expired or has an invalid validity window");
	}
	return invoice;
}

export function invoiceTransaction(invoice: ArcInvoice) {
	return {
		to: getAddress(invoice.payment_contract || invoice.destination_wallet),
		// Arc's native USDC view uses 18 decimals. ERC-20 uses 6; never add the two balances.
		value: parseUnits(invoice.amount, 18),
		data: invoice.payment_contract
			? encodeFunctionData({
					abi: arcPaymentAbi,
					functionName: "pay",
					args: [invoiceCommitment(invoice), BigInt(invoice.expires_at)],
				})
			: invoiceCommitment(invoice),
		chainId: invoice.chain_id,
	};
}

export type PaymentEvidence = {
	chainId: number;
	transaction: {
		from: string;
		to: string | null;
		value: bigint;
		input: string;
		blockNumber: bigint | null;
		blockHash: string | null;
	};
	receipt: { status: string; blockNumber: bigint; blockHash: string };
	block: { timestamp: bigint };
};

/** Validate the actual native transfer, not an untrusted receipt header or token log. */
export function assertInvoicePayment(
	invoice: ArcInvoice,
	evidence: PaymentEvidence,
) {
	const { transaction: tx, receipt, block } = evidence;
	if (evidence.chainId !== invoice.chain_id)
		throw new Error("Payment chain ID does not match invoice");

	if (
		receipt.status !== "success" ||
		tx.blockNumber === null ||
		tx.blockNumber !== receipt.blockNumber ||
		tx.blockHash !== receipt.blockHash
	) {
		throw new Error("Payment is not successfully finalized");
	}
	if (
		tx.from.toLowerCase() !== invoice.payer.toLowerCase() ||
		tx.to?.toLowerCase() !==
			(invoice.payment_contract || invoice.destination_wallet).toLowerCase()
	) {
		throw new Error("Payment sender or recipient does not match the invoice");
	}
	if (tx.value !== parseUnits(invoice.amount, 18))
		throw new Error("Payment amount does not match the invoice");
	if (tx.input.toLowerCase() !== invoiceTransaction(invoice).data.toLowerCase())
		throw new Error("Payment is not bound to this invoice");
	if (
		block.timestamp < BigInt(invoice.issued_at - 30) ||
		block.timestamp > BigInt(invoice.expires_at)
	) {
		throw new Error("Payment was made outside the invoice validity window");
	}
}

export const analysisResultSchema = z.object({
	sentiment_score: z.number().min(0).max(100),
	trading_signal: z.enum([
		"BULLISH",
		"NEUTRAL",
		"BEARISH",
		"INSUFFICIENT_DATA",
	]),
	analysis: z.string().min(1).max(3000),
	bull_case: z.string().min(1).max(1500),
	bear_case: z.string().min(1).max(1500),
	risk_check: z.string().min(1).max(1500),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
