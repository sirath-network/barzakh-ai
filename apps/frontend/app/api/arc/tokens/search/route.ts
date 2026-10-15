export const runtime = "nodejs";

const CHAIN_NAMES: Record<string, string> = {
	ethereum: "Ethereum Mainnet",
	solana: "Solana",
	base: "Base",
	arbitrum: "Arbitrum",
	bsc: "BNB Chain",
	polygon: "Polygon",
	optimism: "Optimism",
	avalanche: "Avalanche C-Chain",
	sui: "Sui",
	tron: "Tron",
	monad: "Monad",
	arc: "Arc Mainnet",
	aptos: "Aptos",
	fantom: "Fantom",
	blast: "Blast",
	linea: "Linea",
	scroll: "Scroll",
	zksync: "zkSync",
	sei: "Sei",
	ton: "TON",
	near: "NEAR",
	cronos: "Cronos",
	celo: "Celo",
	gnosis: "Gnosis",
	moonbeam: "Moonbeam",
	kava: "Kava",
	mantle: "Mantle",
	starknet: "Starknet",
	nasdaq: "NASDAQ",
	nyse: "NYSE",
};

function formatNetworkName(chainId: string): string {
	const lower = (chainId || "").toLowerCase();
	return (
		CHAIN_NAMES[lower] ||
		(chainId ? chainId.charAt(0).toUpperCase() + chainId.slice(1) : "Unknown")
	);
}

type NativeAssetMeta = {
	name: string;
	symbol: string;
	coingeckoId: string;
	chainId: string;
	network: string;
	address: string;
	imageUrl: string;
	assetType: "crypto" | "stock" | "rwa";
};

const TOP_NATIVE_ASSETS: Record<string, NativeAssetMeta> = {
	ETH: {
		name: "Ethereum",
		symbol: "ETH",
		coingeckoId: "ethereum",
		chainId: "ethereum",
		network: "Ethereum Mainnet",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
		assetType: "crypto",
	},
	ETHEREUM: {
		name: "Ethereum",
		symbol: "ETH",
		coingeckoId: "ethereum",
		chainId: "ethereum",
		network: "Ethereum Mainnet",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
		assetType: "crypto",
	},
	BTC: {
		name: "Bitcoin",
		symbol: "BTC",
		coingeckoId: "bitcoin",
		chainId: "bitcoin",
		network: "Bitcoin",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
		assetType: "crypto",
	},
	BITCOIN: {
		name: "Bitcoin",
		symbol: "BTC",
		coingeckoId: "bitcoin",
		chainId: "bitcoin",
		network: "Bitcoin",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
		assetType: "crypto",
	},
	SOL: {
		name: "Solana",
		symbol: "SOL",
		coingeckoId: "solana",
		chainId: "solana",
		network: "Solana",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
		assetType: "crypto",
	},
	SOLANA: {
		name: "Solana",
		symbol: "SOL",
		coingeckoId: "solana",
		chainId: "solana",
		network: "Solana",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
		assetType: "crypto",
	},
	DOGE: {
		name: "Dogecoin",
		symbol: "DOGE",
		coingeckoId: "dogecoin",
		chainId: "dogecoin",
		network: "Dogecoin",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png",
		assetType: "crypto",
	},
	XRP: {
		name: "XRP",
		symbol: "XRP",
		coingeckoId: "ripple",
		chainId: "xrp",
		network: "XRP Ledger",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
		assetType: "crypto",
	},
	SUI: {
		name: "Sui",
		symbol: "SUI",
		coingeckoId: "sui",
		chainId: "sui",
		network: "Sui",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/26375/large/sui-ocean-square.png",
		assetType: "crypto",
	},
	PEPE: {
		name: "Pepe",
		symbol: "PEPE",
		coingeckoId: "pepe",
		chainId: "ethereum",
		network: "Ethereum Mainnet",
		address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
		imageUrl: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.png",
		assetType: "crypto",
	},
	LINK: {
		name: "Chainlink",
		symbol: "LINK",
		coingeckoId: "chainlink",
		chainId: "ethereum",
		network: "Ethereum Mainnet",
		address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
		imageUrl: "https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
		assetType: "crypto",
	},
	AVAX: {
		name: "Avalanche",
		symbol: "AVAX",
		coingeckoId: "avalanche-2",
		chainId: "avalanche",
		network: "Avalanche C-Chain",
		address: "native",
		imageUrl: "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
		assetType: "crypto",
	},
	USDC: {
		name: "USD Coin",
		symbol: "USDC",
		coingeckoId: "usd-coin",
		chainId: "ethereum",
		network: "Ethereum Mainnet",
		address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
		imageUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
		assetType: "crypto",
	},
	// Top Equities / Stocks / RWAs
	NVDA: {
		name: "NVIDIA Corporation",
		symbol: "NVDA",
		coingeckoId: "stock:NVDA",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:NVDA",
		imageUrl: "https://financialmodelingprep.com/image-stock/NVDA.png",
		assetType: "stock",
	},
	NVIDIA: {
		name: "NVIDIA Corporation",
		symbol: "NVDA",
		coingeckoId: "stock:NVDA",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:NVDA",
		imageUrl: "https://financialmodelingprep.com/image-stock/NVDA.png",
		assetType: "stock",
	},
	CRCL: {
		name: "Circle Internet Group",
		symbol: "CRCL",
		coingeckoId: "stock:CRCL",
		chainId: "nyse",
		network: "NYSE (Stock / RWA)",
		address: "equity:CRCL",
		imageUrl: "https://financialmodelingprep.com/image-stock/CRCL.png",
		assetType: "stock",
	},
	CIRCLE: {
		name: "Circle Internet Group",
		symbol: "CRCL",
		coingeckoId: "stock:CRCL",
		chainId: "nyse",
		network: "NYSE (Stock / RWA)",
		address: "equity:CRCL",
		imageUrl: "https://financialmodelingprep.com/image-stock/CRCL.png",
		assetType: "stock",
	},
	TSLA: {
		name: "Tesla, Inc.",
		symbol: "TSLA",
		coingeckoId: "stock:TSLA",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:TSLA",
		imageUrl: "https://financialmodelingprep.com/image-stock/TSLA.png",
		assetType: "stock",
	},
	TESLA: {
		name: "Tesla, Inc.",
		symbol: "TSLA",
		coingeckoId: "stock:TSLA",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:TSLA",
		imageUrl: "https://financialmodelingprep.com/image-stock/TSLA.png",
		assetType: "stock",
	},
	AAPL: {
		name: "Apple Inc.",
		symbol: "AAPL",
		coingeckoId: "stock:AAPL",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:AAPL",
		imageUrl: "https://financialmodelingprep.com/image-stock/AAPL.png",
		assetType: "stock",
	},
	APPLE: {
		name: "Apple Inc.",
		symbol: "AAPL",
		coingeckoId: "stock:AAPL",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:AAPL",
		imageUrl: "https://financialmodelingprep.com/image-stock/AAPL.png",
		assetType: "stock",
	},
	MSTR: {
		name: "MicroStrategy Incorporated",
		symbol: "MSTR",
		coingeckoId: "stock:MSTR",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:MSTR",
		imageUrl: "https://financialmodelingprep.com/image-stock/MSTR.png",
		assetType: "stock",
	},
	COIN: {
		name: "Coinbase Global, Inc.",
		symbol: "COIN",
		coingeckoId: "stock:COIN",
		chainId: "nasdaq",
		network: "NASDAQ (Stock / RWA)",
		address: "equity:COIN",
		imageUrl: "https://financialmodelingprep.com/image-stock/COIN.png",
		assetType: "stock",
	},
};

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const query = searchParams.get("q")?.trim();

	if (!query || query.length < 2) {
		return Response.json({ results: [] });
	}

	const isEVM = /^0x[0-9a-fA-F]{40}$/.test(query);
	const isSolana = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);
	const isCA = isEVM || isSolana;

	// Case 1: Exact Contract Address lookup
	if (isCA) {
		try {
			const res = await fetch(
				`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(query)}`,
				{ signal: AbortSignal.timeout(8000) },
			);
			if (res.ok) {
				const data = await res.json();
				const pairs = (data.pairs || []).sort(
					(a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
				);
				if (pairs.length > 0) {
					const p = pairs[0];
					const price = parseFloat(p.priceUsd || "0");
					const addr = p.baseToken?.address || query;
					return Response.json({
						results: [
							{
								name: p.baseToken?.name || p.baseToken?.symbol || "Unknown Token",
								symbol: (p.baseToken?.symbol || "UNKNOWN").toUpperCase(),
								chainId: p.chainId,
								network: formatNetworkName(p.chainId),
								address: addr,
								priceUsd: price,
								liquidityUsd: p.liquidity?.usd || 0,
								volume24hUsd: p.volume?.h24 || 0,
								change24h: p.priceChange?.h24 ?? null,
								imageUrl:
									p.info?.imageUrl ||
									`https://cdn.dexscreener.com/tokens/${p.chainId}/${addr}.png`,
								pairUrl: p.url,
								verified: false,
								assetType: "rwa",
							},
						],
					});
				}
			}
		} catch {
			/* fallback */
		}
		return Response.json({ results: [] });
	}

	// Case 2: Text / Symbol / Ticker search
	const upper = query.toUpperCase();
	const results: any[] = [];
	const seen = new Set<string>();

	let canonicalPrice: number | null = null;

	// 2a. Priority check for top canonical/native assets (both Crypto and Stock/RWA)
	const nativeMeta = TOP_NATIVE_ASSETS[upper];
	if (nativeMeta) {
		try {
			if (nativeMeta.assetType === "stock") {
				const cRes = await fetch(
					`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(nativeMeta.symbol)}?interval=1d&range=5d`,
					{
						headers: {
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
						},
						signal: AbortSignal.timeout(4000),
					},
				);
				if (cRes.ok) {
					const cData = await cRes.json();
					const meta = cData.chart?.result?.[0]?.meta;
					const price = meta?.regularMarketPrice;
					if (typeof price === "number" && price > 0) {
						canonicalPrice = price;
						const key = `${nativeMeta.chainId}:${nativeMeta.address}`.toLowerCase();
						seen.add(key);
						results.push({
							name: nativeMeta.name,
							symbol: nativeMeta.symbol,
							chainId: nativeMeta.chainId,
							network: nativeMeta.network,
							address: nativeMeta.address,
							priceUsd: price,
							liquidityUsd: 0,
							volume24hUsd: meta.regularMarketVolume
								? meta.regularMarketVolume * price
								: 0,
							change24h: meta.regularMarketChangePercent ?? null,
							imageUrl: nativeMeta.imageUrl,
							verified: true,
							assetType: "stock",
						});
					}
				}
			} else {
				const pRes = await fetch(
					`https://api.coingecko.com/api/v3/simple/price?ids=${nativeMeta.coingeckoId}&vs_currencies=usd&include_24hr_change=true`,
					{ signal: AbortSignal.timeout(4000) },
				);
				if (pRes.ok) {
					const pData = await pRes.json();
					const price = pData[nativeMeta.coingeckoId]?.usd;
					const change = pData[nativeMeta.coingeckoId]?.usd_24h_change;
					if (typeof price === "number" && price > 0) {
						canonicalPrice = price;
						const key = `${nativeMeta.chainId}:${nativeMeta.address}`.toLowerCase();
						seen.add(key);
						results.push({
							name: nativeMeta.name,
							symbol: nativeMeta.symbol,
							chainId: nativeMeta.chainId,
							network: nativeMeta.network,
							address: nativeMeta.address,
							priceUsd: price,
							liquidityUsd: 0,
							volume24hUsd: 0,
							change24h: change != null ? Number(change) : null,
							imageUrl: nativeMeta.imageUrl,
							verified: true,
							assetType: "crypto",
						});
					}
				}
			}
		} catch {
			/* continue */
		}
	}

	// 2b. Parallel fetch: DexScreener search + CoinGecko search + Yahoo Finance search
	try {
		const [dexRes, cgRes, yfRes] = await Promise.allSettled([
			fetch(
				`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
				{ signal: AbortSignal.timeout(6000) },
			),
			fetch(
				`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
				{ signal: AbortSignal.timeout(6000) },
			),
			fetch(
				`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`,
				{
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
					},
					signal: AbortSignal.timeout(6000),
				},
			),
		]);

		// Process Yahoo Finance stock / RWA results
		if (yfRes.status === "fulfilled" && yfRes.value.ok) {
			try {
				const yfData = await yfRes.value.json();
				const equities = (yfData.quotes || [])
					.filter(
						(q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF",
					)
					.slice(0, 3);

				for (const eq of equities) {
					const sym = eq.symbol;
					if (!sym || seen.has(`equity:${sym}`.toLowerCase())) continue;
					try {
						const cRes = await fetch(
							`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
							{
								headers: {
									"User-Agent":
										"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
								},
								signal: AbortSignal.timeout(3500),
							},
						);
						if (cRes.ok) {
							const cData = await cRes.json();
							const meta = cData.chart?.result?.[0]?.meta;
							const price = meta?.regularMarketPrice;
							if (typeof price === "number" && price > 0) {
								seen.add(`equity:${sym}`.toLowerCase());
								results.push({
									name:
										meta.longName || meta.shortName || eq.shortname || sym,
									symbol: sym,
									chainId: (meta.exchangeName || "nasdaq").toLowerCase(),
									network: `${meta.fullExchangeName || meta.exchangeName || "US"} (Stock / RWA)`,
									address: `equity:${sym}`,
									priceUsd: price,
									liquidityUsd: 0,
									volume24hUsd: meta.regularMarketVolume
										? meta.regularMarketVolume * price
										: 0,
									change24h: meta.regularMarketChangePercent ?? null,
									imageUrl: `https://financialmodelingprep.com/image-stock/${sym}.png`,
									verified: true,
									assetType: "stock",
								});
							}
						}
					} catch {
						/* continue */
					}
				}
			} catch {
				/* continue */
			}
		}

		// Process CoinGecko verified crypto results
		if (cgRes.status === "fulfilled" && cgRes.value.ok) {
			try {
				const cgData = await cgRes.value.json();
				const coins = (cgData.coins || [])
					.filter(
						(c: any) =>
							c.market_cap_rank &&
							c.market_cap_rank <= 2500 &&
							(c.symbol.toUpperCase() === upper ||
								c.name.toLowerCase() === query.toLowerCase()),
					)
					.slice(0, 2);

				if (coins.length > 0) {
					const ids = coins
						.map((c: any) => c.id)
						.filter((id: string) => id !== nativeMeta?.coingeckoId);

					if (ids.length > 0) {
						const priceRes = await fetch(
							`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`,
							{ signal: AbortSignal.timeout(3500) },
						);
						if (priceRes.ok) {
							const priceData = await priceRes.json();
							for (const c of coins) {
								const pInfo = priceData[c.id];
								if (pInfo?.usd && !seen.has(`coingecko:${c.id}`)) {
									seen.add(`coingecko:${c.id}`);
									results.push({
										name: c.name,
										symbol: c.symbol.toUpperCase(),
										chainId: "ethereum",
										network: "Verified Asset",
										address: "native",
										priceUsd: pInfo.usd,
										liquidityUsd: 0,
										volume24hUsd: 0,
										change24h: pInfo.usd_24h_change ?? null,
										imageUrl: c.large || c.thumb || null,
										verified: true,
										assetType: "crypto",
									});
								}
							}
						}
					}
				}
			} catch {
				/* continue */
			}
		}

		// Process DexScreener DEX pairs
		if (dexRes.status === "fulfilled" && dexRes.value.ok) {
			const dexData = await dexRes.value.json();
			const pairs = dexData.pairs || [];

			// Filter out spoofed / fake liquidity pools:
			const filteredPairs = pairs.filter((p: any) => {
				const liq = p.liquidity?.usd || 0;
				const vol = p.volume?.h24 || 0;
				const price = parseFloat(p.priceUsd || "0");
				if (!Number.isFinite(price) || price <= 0) return false;

				if (liq > 1_000_000 && vol < 5_000) return false;
				if (liq > 50_000 && vol < 50) return false;
				if (liq > 500_000 && liq / (vol + 1) > 500) return false;

				if (
					canonicalPrice !== null &&
					p.baseToken?.symbol?.toUpperCase() === upper
				) {
					const ratio = price / canonicalPrice;
					if (ratio < 0.85 || ratio > 1.15) return false;
				}

				return true;
			});

			// Sort by actual 24h trading volume and liquidity
			const sortedPairs = filteredPairs.sort(
				(a: any, b: any) =>
					(b.volume?.h24 || 0) * 1.5 +
					(b.liquidity?.usd || 0) * 0.5 -
					((a.volume?.h24 || 0) * 1.5 + (a.liquidity?.usd || 0) * 0.5),
			);

			for (const p of sortedPairs) {
				const addr = p.baseToken?.address;
				if (!addr) continue;
				const key = `${p.chainId}:${addr}`.toLowerCase();
				if (seen.has(key)) continue;
				seen.add(key);

				const price = parseFloat(p.priceUsd || "0");
				const imageUrl =
					p.info?.imageUrl ||
					`https://cdn.dexscreener.com/tokens/${p.chainId}/${addr}.png`;

				results.push({
					name: p.baseToken.name || p.baseToken.symbol,
					symbol: (p.baseToken.symbol || "UNKNOWN").toUpperCase(),
					chainId: p.chainId,
					network: formatNetworkName(p.chainId),
					address: addr,
					priceUsd: price,
					liquidityUsd: p.liquidity?.usd || 0,
					volume24hUsd: p.volume?.h24 || 0,
					change24h: p.priceChange?.h24 ?? null,
					imageUrl,
					pairUrl: p.url,
					verified: false,
					assetType: "crypto",
				});

				if (results.length >= 8) break;
			}
		}
	} catch {
		/* fallback */
	}

	return Response.json(
		{ results },
		{
			headers: {
				"Cache-Control": "public, max-age=30, stale-while-revalidate=60",
			},
		},
	);
}
