import {
	ARC_ANALYSIS_PRICE,
	ARC_CHAIN_ID,
	ARC_EXPLORER_URL,
	arcChain,
	getArcChainId,
	getArcExplorerUrl,
} from "@barzakh/shared/lib/arc/config";
import {
	arcDatabase,
	createArcClient,
	paymentContractAddress,
	validatePaymentContract,
} from "@barzakh/shared/lib/arc/server";

export const runtime = "nodejs";
export async function GET() {
	try {
		const client = createArcClient();
		const [chainId, block] = await Promise.all([
			client.getChainId(),
			client.getBlock(),
		]);
		const expectedChainId = getArcChainId();
		if (chainId !== expectedChainId) throw new Error("Wrong chain");
		let recipient: string | null = null;
		let ready = false;
		let paymentContract: string | null = null;
		let readinessReason: string | null = "Payment contract is not configured for this network.";
		try {
			readinessReason = "Payment contract is not configured for this network.";
			paymentContract = paymentContractAddress();
			readinessReason = "Payment contract verification is unavailable or its configuration does not match.";
			recipient = await validatePaymentContract(
				client,
				paymentContract as `0x${string}`,
			);
			readinessReason = "Receipt storage is unavailable. Check the database connection and receipt migration.";
			await arcDatabase()`SELECT transaction_hash FROM arc_intelligence_receipts LIMIT 0`;
			readinessReason = !process.env.OPENROUTER_API_KEY ? "Analysis provider is not configured." : (process.env.ARC_INVOICE_SECRET?.length || 0) < 32 ? "Invoice signing is not configured." : null;
			ready =
				!!process.env.OPENROUTER_API_KEY &&
				(process.env.ARC_INVOICE_SECRET?.length || 0) >= 32;
		} catch {
			/* Network health remains visible before merchant configuration. */
		}
		return Response.json(
			{
				chainId,
				network: arcChain.name,
				blockNumber: block.number?.toString(),
				blockTimestamp: Number(block.timestamp),
				explorerUrl: getArcExplorerUrl(),
				price: ARC_ANALYSIS_PRICE,
				recipient,
				paymentContract,
				ready,
				readinessReason,
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch {
		return Response.json(
			{ error: "Arc RPC is unavailable", ready: false },
			{ status: 503 },
		);
	}
}
