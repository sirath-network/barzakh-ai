export interface ReceiptCardData {
	chainId: number;
	asset: string;
	signal: string;
	score: number;
	analysis: string;
	amount: string;
	gasUsdc: string;
	payer: string;
	recipient: string;
	transactionHash: string;
	blockNumber: string;
	settledAt: string;
	resultHash: string;
}

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

function escapeXml(value: string) {
	return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(
		/[&<>"']/g,
		(char) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&apos;",
			})[char]!,
	);
}

function wrap(value: string, width: number, limit: number) {
	const words =
		value
			.replace(/\s+/g, " ")
			.trim()
			.match(new RegExp(`\\S{1,${width}}`, "g")) || [];
	const lines: string[] = [];
	let line = "";
	for (const word of words) {
		if (line && `${line} ${word}`.length > width) {
			lines.push(line);
			line = word;
		} else line = line ? `${line} ${word}` : word;
	}
	if (line) lines.push(line);
	return lines
		.slice(0, limit)
		.map((text, index) =>
			index === limit - 1 && lines.length > limit
				? `${text.slice(0, -1)}…`
				: text,
		);
}

/** Self-contained SVG: no external images, fonts, or HTML needed for PNG export. */
export function receiptCardSvg(data: ReceiptCardData, receiptUrl: string) {
	const network =
		data.chainId === 5042
			? "ARC MAINNET"
			: data.chainId === 5042002
				? "ARC TESTNET · TEST FUNDS"
				: `CHAIN ${data.chainId}`;
	const text = (
		value: string,
		x: number,
		y: number,
		size = 20,
		fill = "#272e24",
		extra = "",
	) =>
		`<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" fill="${fill}" ${extra}>${escapeXml(value)}</text>`;
	const mono = (
		value: string,
		x: number,
		y: number,
		size = 17,
		fill = "#69715d",
	) =>
		`<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" fill="${fill}">${escapeXml(value)}</text>`;
	const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;
	const date = new Date(data.settledAt);
	const settledAt = Number.isFinite(date.getTime())
		? date
				.toISOString()
				.replace("T", " ")
				.replace(/\.\d+Z$/, " UTC")
		: "Timestamp unavailable";
	const rule = (y: number) =>
		`<path d="M64 ${y}H1016" stroke="#c5c9b8" stroke-dasharray="7 7"/>`;
	const rows = [
		["SERVICE PAYMENT", `${data.amount} USDC`],
		["NETWORK FEE", `${data.gasUsdc} USDC`],
		["SETTLEMENT BLOCK", `#${data.blockNumber} · Chain ${data.chainId}`],
		["PAYER → RECIPIENT", `${short(data.payer)} → ${short(data.recipient)}`],
	];
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
    <rect width="1080" height="1350" rx="24" fill="#111510"/>
    ${text("BARZAKH AI", 64, 76, 25, "#f1f1e6", 'font-weight="700" letter-spacing="3"')}
    ${text("PROOF OF INTELLIGENCE", 1016, 76, 17, "#a9b39b", 'text-anchor="end" letter-spacing="2"')}
    <rect x="32" y="112" width="1016" height="1116" rx="8" fill="#e9eadf"/>
    <rect x="64" y="144" width="952" height="48" rx="4" fill="#dce0cf"/>
    ${mono(network, 84, 175, 18, "#34472a")}
    ${text("PAYMENT CONFIRMED", 996, 175, 15, "#34472a", 'text-anchor="end" font-weight="700"')}
    ${text("Intelligence, receipted.", 64, 266, 58, "#272e24", 'font-weight="700" letter-spacing="-2"')}
    ${wrap(data.asset, 32, 2)
			.map((line, i) => text(line, 64, 332 + i * 42, 36, "#58664a"))
			.join("")}
    <rect x="64" y="400" width="952" height="124" rx="6" fill="#242d20"/>
    ${mono("RESEARCH OUTLOOK", 90, 438, 15, "#abb99d")}
    ${text(data.signal.replace(/_/g, " "), 90, 489, 35, "#ff906b", 'font-weight="700"')}
    ${text(`${data.score}/100`, 990, 468, 40, "#eef2e4", 'text-anchor="end"')}
    ${text("SENTIMENT", 990, 498, 14, "#abb99d", 'text-anchor="end" letter-spacing="2"')}
    ${wrap(data.analysis, 68, 3)
			.map((line, i) => text(line, 64, 567 + i * 33, 24, "#4b5541"))
			.join("")}
    ${rule(670)}
    ${rows.map(([label, value], i) => `${mono(label, 64, 710 + i * 56, 16)}${text(value, 1016, 710 + i * 56, 21, "#272e24", 'text-anchor="end"')}`).join("")}
    ${rule(906)}
    ${mono("TRANSACTION HASH", 64, 945, 15)}
    ${mono(data.transactionHash, 64, 978, 19, "#272e24")}
    ${mono("RESULT DIGEST · PROVIDER RECORD", 64, 1020, 15)}
    ${mono(data.resultHash, 64, 1053, 19, "#272e24")}
    ${mono(settledAt, 64, 1100, 17)}
    ${text("Arc verifies payment and the invoice commitment.", 64, 1150, 20, "#59634e")}
    ${text("The result digest is offchain. Research opinions are not guaranteed outcomes.", 64, 1182, 18, "#59634e")}
    ${mono("OPEN THE PUBLIC RECEIPT TO VERIFY", 64, 1270, 16, "#b7c1aa")}
    ${text(receiptUrl, 64, 1304, 15, "#ff906b")}
  </svg>`;
}

export function cardPng(svg: string): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = CARD_WIDTH;
			canvas.height = CARD_HEIGHT;
			const context = canvas.getContext("2d");
			if (!context) {
				reject(new Error("Your browser could not create the image."));
				return;
			}
			context.drawImage(image, 0, 0);
			canvas.toBlob(
				(blob) =>
					blob
						? resolve(blob)
						: reject(new Error("Unable to export this card.")),
				"image/png",
			);
		};
		image.onerror = () => reject(new Error("Unable to render this card."));
		image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
	});
}
