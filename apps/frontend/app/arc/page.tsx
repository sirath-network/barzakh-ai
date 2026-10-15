import type { Metadata } from "next";
import { Suspense } from "react";
import { ArcIntelligence } from "@/components/arc/arc-intelligence";

export const metadata: Metadata = {
	title: "Proof of Intelligence",
	description:
		"Buy an AI market briefing with USDC on Arc mainnet. Verify the payment, inspect the reasoning, and share the receipt.",
};

export default function ArcPage() {
	return (
		<Suspense fallback={null}>
			<ArcIntelligence />
		</Suspense>
	);
}

