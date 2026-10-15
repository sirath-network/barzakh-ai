import { Suspense } from "react";
import { ArcIntelligence } from "@/components/arc/arc-intelligence";

export default async function ReceiptPage({
	params,
}: { params: Promise<{ hash: string }> }) {
	const { hash } = await params;
	return (
		<Suspense fallback={null}>
			<ArcIntelligence receiptHash={hash} />
		</Suspense>
	);
}

