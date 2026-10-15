import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, parseUnits } from "viem";
import { arcPaymentAbi } from "./contract";
import {
	invoiceSchema,
	invoiceTransaction,
	invoiceCommitment,
	assertInvoicePayment,
	hashJson,
	type ArcInvoice,
} from "./protocol";

const payer = "0x1111111111111111111111111111111111111111";
const merchant = "0x2222222222222222222222222222222222222222";
const contract = "0x3333333333333333333333333333333333333333";
const invoice: ArcInvoice = {
	version: "barzakh-arc-v2",
	payment_contract: contract,
	id: "00112233-4455-4677-8899-aabbccddeeff",
	chain_id: 5042002,
	currency: "USDC",
	amount: "0.002",
	destination_wallet: merchant,
	payer,
	request_hash: hashJson({ token_name: "BTC", payer }),
	issued_at: 1800000000,
	expires_at: 1800000600,
};
test("v2 invoice calls pay with commitment, deadline and native USDC value", () => {
	const transaction = invoiceTransaction(invoice);
	assert.equal(transaction.to, contract);
	assert.equal(transaction.value, parseUnits("0.002", 18));
	assert.deepEqual(
		decodeFunctionData({ abi: arcPaymentAbi, data: transaction.data }),
		{ functionName: "pay", args: [invoiceCommitment(invoice), 1800000600n] },
	);
});
test("invoice version cannot silently downgrade to a direct transfer", () => {
	assert.throws(() =>
		invoiceSchema.parse({ ...invoice, payment_contract: undefined }),
	);
	assert.throws(() =>
		invoiceSchema.parse({ ...invoice, version: "barzakh-arc-v1" }),
	);
});
test("contract payment evidence rejects direct transfer, wrong contract, changed deadline", () => {
	const transaction = invoiceTransaction(invoice);
	const evidence = {
		chainId: 5042002,
		transaction: {
			from: payer,
			to: contract,
			value: transaction.value,
			input: transaction.data,
			blockNumber: 1n,
			blockHash: "0xabc",
		},
		receipt: { status: "success", blockNumber: 1n, blockHash: "0xabc" },
		block: { timestamp: 1800000005n },
	};
	assert.doesNotThrow(() => assertInvoicePayment(invoice, evidence));
	assert.throws(() =>
		assertInvoicePayment(invoice, {
			...evidence,
			transaction: { ...evidence.transaction, to: merchant },
		}),
	);
	assert.throws(() =>
		assertInvoicePayment(invoice, {
			...evidence,
			transaction: {
				...evidence.transaction,
				input: invoiceCommitment(invoice),
			},
		}),
	);
	assert.throws(() =>
		assertInvoicePayment(invoice, {
			...evidence,
			transaction: {
				...evidence.transaction,
				input: invoiceTransaction({ ...invoice, expires_at: 1800000599 }).data,
			},
		}),
	);
});
