"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Maximize2, Share2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	cardPng,
	receiptCardSvg,
	type ReceiptCardData,
} from "./receipt-card-image";
import styles from "./receipt-card.module.css";

function saveBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	// Keep the object URL alive long enough for mobile browsers to start the download.
	setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function ReceiptCard({
	data,
	receipt,
}: { data: ReceiptCardData; receipt: unknown }) {
	const [origin, setOrigin] = useState("");
	const [png, setPng] = useState<{ svg: string; blob: Blob } | null>(null);
	const [message, setMessage] = useState("");
	const [sharing, setSharing] = useState(false);
	const [copied, setCopied] = useState(false);
	const receiptPath = `/arc/receipts/${data.transactionHash}`;
	const receiptUrl = `${origin}${receiptPath}`;
	const svg = useMemo(
		() => receiptCardSvg(data, receiptUrl),
		[data, receiptUrl],
	);
	const imageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	const readyPng = png?.svg === svg ? png.blob : null;
	const filename = `barzakh-arc-${data.chainId}-${data.transactionHash}`;

	useEffect(() => {
		setOrigin(window.location.origin);
	}, []);
	useEffect(() => {
		if (!origin) return;
		let active = true;
		cardPng(svg)
			.then((blob) => {
				if (active) setPng({ svg, blob });
			})
			.catch((error) => {
				if (active) setMessage(error.message);
			});
		return () => {
			active = false;
		};
	}, [svg, origin]);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2500);
		return () => clearTimeout(timer);
	}, [copied]);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(receiptUrl);
			setCopied(true);
			setMessage("Receipt link copied.");
		} catch {
			setMessage(
				"Open the card preview to select and copy the public receipt URL.",
			);
		}
	}

	async function share() {
		if (sharing) return;
		setMessage("");
		setSharing(true);
		try {
			const title = "Barzakh AI · Proof of Intelligence";
			const text = `${data.asset} research receipt · ${data.amount} USDC · ${data.chainId === 5042002 ? "Arc Testnet (test funds)" : data.chainId === 5042 ? "Arc Mainnet" : `Chain ${data.chainId}`}`;
			// PNG is prepared before this click to preserve the native share user gesture.
			const file = readyPng
				? new File([readyPng], `${filename}.png`, { type: "image/png" })
				: null;
			if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
				await navigator.share({ files: [file], title, text, url: receiptUrl });
			} else if (navigator.share) {
				await navigator.share({ title, text, url: receiptUrl });
			} else {
				await copyLink();
			}
		} catch (error) {
			if (!(error instanceof Error && error.name === "AbortError")) {
				setMessage(
					"Sharing is unavailable here. Download the PNG or copy the receipt link.",
				);
			}
		} finally {
			setSharing(false);
		}
	}

	const actions = (
		<div className={styles.actions}>
			<button
				type="button"
				disabled={!readyPng}
				onClick={() => {
					if (readyPng) saveBlob(readyPng, `${filename}.png`);
				}}
			>
				<Download size={16} />
				{readyPng ? "Download PNG" : "Preparing PNG…"}
			</button>
			<button
				type="button"
				disabled={!origin || sharing}
				onClick={() => void share()}
			>
				<Share2 size={16} />
				{sharing ? "Sharing…" : "Share card"}
			</button>
			<button type="button" disabled={!origin} onClick={() => void copyLink()}>
				{copied ? <Check size={16} /> : <Copy size={16} />}
				{copied ? "Copied" : "Copy link"}
			</button>
			<button
				type="button"
				onClick={() =>
					saveBlob(
						new Blob([JSON.stringify(receipt, null, 2)], {
							type: "application/json",
						}),
						`${filename}.json`,
					)
				}
			>
				<Download size={16} />
				Download JSON
			</button>
		</div>
	);

	return (
		<Dialog>
			<div className={styles.card}>
				<DialogTrigger asChild>
					<button
						type="button"
						className={styles.preview}
						aria-label="Preview receipt card"
					>
						<img
							src={imageSrc}
							width={1080}
							height={1350}
							alt={`${data.asset} receipt card: ${data.amount} USDC paid on chain ${data.chainId}`}
						/>
						<span>
							<Maximize2 size={16} /> Click to preview
						</span>
					</button>
				</DialogTrigger>
				{actions}
				{message && (
					<p role="status" className={styles.message}>
						{message}
					</p>
				)}
			</div>
			<DialogContent className={styles.dialog}>
				<DialogTitle>Receipt card</DialogTitle>
				<DialogDescription>
					Download an image or share this receipt with its verification link.
					The JSON includes the complete proof.
				</DialogDescription>
				<img
					className={styles.fullImage}
					src={imageSrc}
					width={1080}
					height={1350}
					alt="Full receipt card preview"
				/>
				{actions}
				<label className={styles.linkLabel}>
					Public receipt URL
					<input
						aria-label="Public receipt URL"
						value={receiptUrl}
						readOnly
						onFocus={(event) => event.currentTarget.select()}
					/>
				</label>
				<a className={styles.link} href={receiptPath}>
					Open public receipt ↗
				</a>
				{message && (
					<p role="status" className={styles.message}>
						{message}
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
