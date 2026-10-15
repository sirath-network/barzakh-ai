import {
	arcDatabase,
	createArcClient,
	paymentContractAddress,
	validatePaymentContract,
} from "../packages/shared/src/lib/arc/server";
import {
	ARC_CHAIN_ID,
	ARC_USDC_ADDRESS,
	arcChain,
	getArcChainId,
} from "../packages/shared/src/lib/arc/config";

async function main() {
	const client = createArcClient();
	const [chainId, block, decimals] = await Promise.all([
		client.getChainId(),
		client.getBlock(),
		client.readContract({
			address: ARC_USDC_ADDRESS,
			abi: [
				{
					type: "function",
					name: "decimals",
					stateMutability: "view",
					inputs: [],
					outputs: [{ type: "uint8" }],
				},
			],
			functionName: "decimals",
		}),
	]);
	const expectedChainId = getArcChainId();
	if (chainId !== expectedChainId || decimals !== 6)
		throw new Error(`${arcChain.name} configuration mismatch (expected chainId ${expectedChainId}, got ${chainId})`);
	console.log(
		JSON.stringify({
			network: arcChain.name,
			chainId,
			block: block.number?.toString(),
			usdcErc20Decimals: decimals,
		}),
	);
	const contract = paymentContractAddress();
	await validatePaymentContract(client, contract);
	console.log(`Payment contract bytecode, merchant and price verified: ${contract}`);
	if (
		!process.env.ARC_INVOICE_SECRET ||
		process.env.ARC_INVOICE_SECRET.length < 32 ||
		!process.env.OPENROUTER_API_KEY
	)
		throw new Error("Missing invoice secret or AI provider configuration");
	const sql = arcDatabase();
	try {
		const [row] =
			await sql`SELECT to_regclass('public.arc_intelligence_receipts') IS NOT NULL AS ready`;
		if (!row.ready)
			throw new Error(
				"Receipt migration has not been applied. Run pnpm arc:migrate.",
			);
		console.log("Receipt storage ready. No payment was made.");
	} finally {
		await sql.end();
	}
}
main().catch((error) => {
	console.error(
		error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, "[RPC URL]") : "Arc check failed",
	);
	process.exitCode = 1;
});
