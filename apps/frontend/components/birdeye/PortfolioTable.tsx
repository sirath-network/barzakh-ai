"use client";

import {
  PortfolioData,
} from "@barzakh/shared/types/wallet-actions-response";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CreditCard,
  Landmark,
  Activity,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "@/lib/framer-motion";

interface PortfolioProps {
  result: PortfolioData | null;
}

// Get chain logo from Zerion's CDN or cached icons
const getChainLogo = (chain: string, iconUrl?: string): string => {
  if (iconUrl) return iconUrl;

  const zerionChainIcons: Record<string, string> = {
    abstract: "https://chain-icons.s3.us-east-1.amazonaws.com/abstract.png",
    ape: "https://chain-icons.s3.us-east-1.amazonaws.com/apechain.png",
    apechain: "https://chain-icons.s3.us-east-1.amazonaws.com/apechain.png",
    arbitrum: "https://chain-icons.s3.amazonaws.com/arbitrum.png",
    aurora: "https://chain-icons.s3.amazonaws.com/aurora.png",
    avalanche: "https://chain-icons.s3.amazonaws.com/avalanche.png",
    base: "https://chain-icons.s3.amazonaws.com/chainlist/8453",
    berachain: "https://chain-icons.s3.us-east-1.amazonaws.com/berra.png",
    "binance-smart-chain": "https://chain-icons.s3.amazonaws.com/bsc.png",
    bsc: "https://chain-icons.s3.amazonaws.com/bsc.png",
    blast: "https://chain-icons.s3.amazonaws.com/chainlist/81457",
    bob: "https://chain-icons.s3.amazonaws.com/bob.png",
    celo: "https://chain-icons.s3.amazonaws.com/chainlist/42220",
    cyber: "https://chain-icons.s3.amazonaws.com/cyber.png",
    degen: "https://chain-icons.s3.amazonaws.com/chainlist/666666666",
    ethereum: "https://chain-icons.s3.amazonaws.com/ethereum.png",
    fantom: "https://chain-icons.s3.amazonaws.com/fantom.png",
    fraxtal: "https://chain-icons.s3.amazonaws.com/fraxtal.png",
    "gravity-alpha": "https://chain-icons.s3.amazonaws.com/gravity.png",
    gravity: "https://chain-icons.s3.amazonaws.com/gravity.png",
    hyperevm: "https://chain-icons.s3.amazonaws.com/chainlist/999",
    ink: "https://chain-icons.s3.us-east-1.amazonaws.com/ink.png",
    katana: "https://chain-icons.s3.us-east-1.amazonaws.com/katana.png",
    lens: "https://chain-icons.s3.us-east-1.amazonaws.com/lens.png",
    linea: "https://chain-icons.s3.amazonaws.com/chainlist/59144",
    lisk: "https://chain-icons.s3.amazonaws.com/lisk.png",
    "manta-pacific": "https://chain-icons.s3.amazonaws.com/manta.png",
    manta: "https://chain-icons.s3.amazonaws.com/manta.png",
    mantle: "https://chain-icons.s3.amazonaws.com/mantle.png",
    "metis-andromeda": "https://chain-icons.s3.amazonaws.com/metis.png",
    metis: "https://chain-icons.s3.amazonaws.com/metis.png",
    mode: "https://chain-icons.s3.amazonaws.com/mode.png",
    okbchain: "https://chain-icons.s3.amazonaws.com/okx.png",
    opbnb: "https://chain-icons.s3.amazonaws.com/opBNB.png",
    optimism: "https://chain-icons.s3.amazonaws.com/optimism.png",
    plasma: "https://chain-icons.s3.amazonaws.com/plasma.png",
    polygon: "https://chain-icons.s3.amazonaws.com/polygon.png",
    "polygon-zkevm": "https://chain-icons.s3.amazonaws.com/chainlist/1101",
    rari: "https://chain-icons.s3.amazonaws.com/chainlist/1380012617",
    redstone: "https://chain-icons.s3.amazonaws.com/redstone.png",
    ronin: "https://chain-icons.s3.amazonaws.com/chainlist/2020",
    scroll: "https://chain-icons.s3.amazonaws.com/scroll.png",
    sei: "https://protocol-icons.s3.amazonaws.com/icons/sei.png",
    soneium: "https://chain-icons.s3.us-east-1.amazonaws.com/soneium.png",
    sonic: "https://chain-icons.s3.us-east-1.amazonaws.com/sonic_s.png",
    taiko: "https://chain-icons.s3.amazonaws.com/taiko.png",
    unichain: "https://chain-icons.s3.us-east-1.amazonaws.com/unichain.png",
    world: "https://cdn.zerion.io/f9ade5d0-8b60-489a-b4b8-8f7b41dc9292.png",
    xdai: "https://chain-icons.s3.amazonaws.com/xdai.png",
    "gnosis-chain": "https://chain-icons.s3.amazonaws.com/xdai.png",
    gnosis: "https://chain-icons.s3.amazonaws.com/xdai.png",
    zero: "https://chain-icons.s3.amazonaws.com/chainlist/543210",
    "zklink-nova": "https://chain-icons.s3.amazonaws.com/zklink.png",
    "zksync-era": "https://chain-icons.s3.amazonaws.com/chainlist/324",
    zksync: "https://chain-icons.s3.amazonaws.com/chainlist/324",
    zora: "https://chain-icons.s3.amazonaws.com/zora",
    solana: "https://chain-icons.s3.amazonaws.com/solana.png",
    sui: "https://chain-icons.s3.amazonaws.com/sui.png",
  };

  return zerionChainIcons[chain.toLowerCase()] || "https://chain-icons.s3.amazonaws.com/ethereum.png";
};

// Check if address is a Solana address (Base58 format, 32-44 chars, not starting with 0x)
const isSolanaAddress = (address: string): boolean => {
  if (!address || address.startsWith('0x')) return false;
  // Solana addresses are Base58 encoded, typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
};

// Format large numbers with commas
const formatNumber = (num: number, decimals = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

const formatCrypto = (num: number): string => {
  if (num === 0) return "0.00";
  if (num < 0.01) return num.toExponential(2);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(num);
};

// Interface for chain token details
interface ChainTokenDetail {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  price: number;
  icon?: string;
  change24h?: number; // Added for potential future use
}

// Interface for protocol/DeFi positions
interface ProtocolPosition {
  protocol: string;
  protocolIcon?: string;
  type: string;
  tokens: {
    symbol: string;
    name: string;
    amount: number;
    value: number;
    icon?: string;
  }[];
  totalValue: number;
  chain: string;
}

// Interface for NFT Collections
interface NftCollection {
  name: string;
  imageUrl?: string;
  amount: number;
  floorPrice?: number;
  estimatedValue?: number;
  chain: string;
}

const PortfolioTable: React.FC<PortfolioProps> = ({ result }) => {
  // Force re-render to clear stale state
  const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>({});
  const [chainTokens, setChainTokens] = useState<Record<string, ChainTokenDetail[]>>({});
  const [loadingChains, setLoadingChains] = useState<Record<string, boolean>>({});
  const [chainIcons, setChainIcons] = useState<Record<string, string>>({});
  const [showProtocols, setShowProtocols] = useState(false);
  const [protocolPositions, setProtocolPositions] = useState<ProtocolPosition[]>([]);
  const [loadingProtocols, setLoadingProtocols] = useState(false);
  const [hasFetchedProtocols, setHasFetchedProtocols] = useState(false);

  // NFT State
  const [showNfts, setShowNfts] = useState(false);
  const [nftCollections, setNftCollections] = useState<NftCollection[]>([]);
  const [totalNftCollections, setTotalNftCollections] = useState<number>(0);
  const [loadingNfts, setLoadingNfts] = useState(false);
  const [hasFetchedNfts, setHasFetchedNfts] = useState(false);
  const [nftPortfolioValue, setNftPortfolioValue] = useState<number>(0);

  const WalletAny = Wallet as any;
  const ArrowUpRightAny = ArrowUpRight as any;
  const ArrowDownRightAny = ArrowDownRight as any;
  const LandmarkAny = Landmark as any;
  const ChevronDownAny = ChevronDown as any;
  const Loader2Any = Loader2 as any;
  const ChevronRightAny = ChevronRight as any;
  const LayersAny = Layers as any;
  const ImageAny = Image as any;
  const ExternalLinkAny = ExternalLink as any;

  if (!result || !result.attributes)
    return (
      <div className="p-6 text-center text-zinc-500 dark:text-zinc-400 font-mono text-sm">
        No portfolio data available.
      </div>
    );

  const { attributes, currency } = result;
  const totalPositions = attributes.total?.positions;
  const percentChange = attributes.changes?.percent_1d;
  const chains = attributes.positions_distribution_by_chain
    ? Object.entries(attributes.positions_distribution_by_chain).sort((a, b) => (b[1] || 0) - (a[1] || 0))
    : [];

  const isPositiveChange = percentChange && percentChange >= 0;

  // Calculate total DeFi value and Net Worth
  const totalDeFiValue = protocolPositions.reduce((acc, pos) => acc + pos.totalValue, 0);
  // Use fetched NFT portfolio value if available, otherwise fallback to sum of collections
  const totalNftValue = nftPortfolioValue > 0
    ? nftPortfolioValue
    : nftCollections.reduce((acc, collection) => acc + (collection.estimatedValue || 0), 0);

  const netWorth = (totalPositions || 0) + totalDeFiValue + totalNftValue;

  // Fetch protocol positions
  const fetchProtocolPositions = async () => {
    setLoadingProtocols(true);
    try {
      const walletAddress = result.id;
      const response = await fetch(
        `/api/zerion/protocols?address=${walletAddress}&currency=${currency}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Protocol Positions Fetch Error:", response.status, errorData);
        throw new Error(`Failed to fetch protocol positions: ${response.status} ${errorData.error || ''}`);
      }

      const data = await response.json();
      const protocolMap = new Map<string, ProtocolPosition>();

      if (!data.data || data.data.length === 0) {
        setProtocolPositions([]);
        return;
      }

      data.data?.forEach((position: any) => {
        const attrs = position.attributes;
        if (!attrs.application_metadata?.name) return;

        const protocol = attrs.application_metadata.name;
        const chain = position.relationships?.chain?.data?.id || 'unknown';
        const positionType = attrs.position_type || 'deposited';
        const key = `${protocol}-${chain}-${positionType}`;

        if (!protocolMap.has(key)) {
          protocolMap.set(key, {
            protocol,
            protocolIcon: attrs.application_metadata.icon?.url,
            type: positionType,
            tokens: [],
            totalValue: 0,
            chain,
          });
        }

        const protocolPos = protocolMap.get(key)!;
        if (attrs.fungible_info) {
          protocolPos.tokens.push({
            symbol: attrs.fungible_info.symbol || 'Unknown',
            name: attrs.fungible_info.name || 'Unknown',
            amount: attrs.quantity?.float || 0,
            value: attrs.value || 0,
            icon: attrs.fungible_info.icon?.url,
          });
          protocolPos.totalValue += attrs.value || 0;
        }
      });

      setProtocolPositions(Array.from(protocolMap.values()).sort((a, b) => b.totalValue - a.totalValue));
    } catch (error) {
      console.error('Error fetching protocol positions:', error);
      setProtocolPositions([]);
    } finally {
      setLoadingProtocols(false);
      setHasFetchedProtocols(true);
    }
  };

  // Fetch NFT portfolio overview
  const fetchNftPortfolio = async () => {
    try {
      const walletAddress = result.id;
      const response = await fetch(
        `/api/zerion/nft-portfolio?address=${walletAddress}&currency=${currency}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) return;

      const data = await response.json();
      // Assuming the response structure has data.attributes.total_value or similar
      // Adjust based on actual API response
      if (data.data?.attributes?.total_value) {
        setNftPortfolioValue(data.data.attributes.total_value);
      }
    } catch (error) {
      console.error('Error fetching NFT portfolio:', error);
    }
  };

  // Fetch NFT Collections
  const fetchNftCollections = async () => {
    setLoadingNfts(true);
    try {
      const walletAddress = result.id;
      const response = await fetch(
        `/api/zerion/nft-collections?address=${walletAddress}&currency=${currency}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("NFT Collections Fetch Error:", response.status, errorData);
        throw new Error(`Failed to fetch NFT collections: ${response.status} ${errorData.error || ''}`);
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        setNftCollections([]);
        return;
      }

      const collections: NftCollection[] = data.data.map((item: any) => {
        const attrs = item.attributes;
        const collectionInfo = attrs.collection_info;
        const amount = Number(attrs.nfts_count) || 0;
        const totalFloorPrice = attrs.total_floor_price || 0;

        return {
          name: collectionInfo?.name || 'Unknown Collection',
          imageUrl: collectionInfo?.content?.icon?.url || collectionInfo?.content?.banner?.url,
          amount: amount,
          floorPrice: amount > 0 ? totalFloorPrice / amount : 0,
          estimatedValue: totalFloorPrice,
          chain: item.relationships?.chain?.data?.id || 'unknown',
        };
      });

      // Store total count but limit displayed collections to 12 for best UX
      setTotalNftCollections(collections.length);
      setNftCollections(collections.slice(0, 12));
    } catch (error) {
      console.error('Error fetching NFT collections:', error);
      setNftCollections([]);
    } finally {
      setLoadingNfts(false);
      setHasFetchedNfts(true);
    }
  };

  useEffect(() => {
    // Skip DeFi/NFT fetches for Solana addresses (not supported by Zerion yet)
    const isSolana = isSolanaAddress(result.id);

    if (result.id && !hasFetchedProtocols) {
      if (totalPositions === 0 || isSolana) {
        setHasFetchedProtocols(true);
      } else {
        fetchProtocolPositions();
      }
    }

    if (result.id && !hasFetchedNfts) {
      if (isSolana) {
        setHasFetchedNfts(true);
      } else {
        fetchNftCollections();
        fetchNftPortfolio();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.id, currency, totalPositions]);

  // Auto-expand chain breakdown when there's only a few chains (better UX)
  // Works for all chains including Solana now that it uses the same expandable view
  useEffect(() => {
    // Auto-expand if there are 1-3 chains to show token details immediately
    if (chains.length > 0 && chains.length <= 3) {
      const chainsToExpand = chains.slice(0, Math.min(chains.length, 2)); // Expand up to 2 chains
      chainsToExpand.forEach(([chain]) => {
        if (!expandedChains[chain] && !chainTokens[chain]) {
          // Trigger expansion for each chain
          toggleChainExpansion(chain);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chains.length, result.id]);

  const toggleProtocols = () => {
    // Don't allow expand for Solana (not supported)
    if (isSolanaAddress(result.id)) return;
    if (!showProtocols && protocolPositions.length === 0) fetchProtocolPositions();
    setShowProtocols(!showProtocols);
  };

  const toggleNfts = () => {
    // Don't allow expand for Solana (not supported)
    if (isSolanaAddress(result.id)) return;
    if (!showNfts && nftCollections.length === 0) fetchNftCollections();
    setShowNfts(!showNfts);
  };

  const toggleChainExpansion = async (chain: string) => {
    const isExpanding = !expandedChains[chain];
    setExpandedChains(prev => ({ ...prev, [chain]: isExpanding }));

    if (isExpanding && !chainTokens[chain]) {
      setLoadingChains(prev => ({ ...prev, [chain]: true }));
      try {
        const walletAddress = result.id;
        const response = await fetch(
          `/api/zerion/positions?address=${walletAddress}&chain=${chain}&currency=${currency}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) throw new Error('Failed to fetch token positions');

        const data = await response.json();
        if (data.data?.[0]?.relationships?.chain?.data?.attributes?.icon_url) {
          setChainIcons(prev => ({ ...prev, [chain]: data.data[0].relationships.chain.data.attributes.icon_url }));
        }

        const tokens: ChainTokenDetail[] = data.data?.map((position: any) => ({
          symbol: position.attributes?.fungible_info?.symbol || 'Unknown',
          name: position.attributes?.fungible_info?.name || 'Unknown Token',
          balance: position.attributes?.quantity?.float || 0,
          value: position.attributes?.value || 0,
          price: position.attributes?.price || 0,
          icon: position.attributes?.fungible_info?.icon?.url || undefined,
          change24h: position.attributes?.changes?.percent_1d // Attempt to get 24h change if available
        })) || [];

        setChainTokens(prev => ({ ...prev, [chain]: tokens }));
      } catch (error) {
        console.error(`Error fetching tokens for ${chain}:`, error);
        setChainTokens(prev => ({ ...prev, [chain]: [] }));
      } finally {
        setLoadingChains(prev => ({ ...prev, [chain]: false }));
      }
    }
  };

  // Check if this is a Solana wallet
  const isSolanaWallet = isSolanaAddress(result.id);

  return (
    <div className="w-full max-w-full space-y-4 font-sans">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Hero Card: Total Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-zinc-100/50 dark:to-zinc-900/50 pointer-events-none" />

          {/* Mini Sparkline Background Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
              <path
                d={isPositiveChange ? "M0 20 L0 15 Q20 18 40 10 T100 5 L100 20 Z" : "M0 20 L0 5 Q20 10 40 15 T100 18 L100 20 Z"}
                fill={isPositiveChange ? "currentColor" : "currentColor"}
                className={isPositiveChange ? "text-emerald-500" : "text-rose-500"}
              />
            </svg>
          </div>

          <div className="relative p-6 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                <WalletAny className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Balance</span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums break-all">
                  ${formatNumber(netWorth)}
                </span>
                {currency !== "units" && (
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    {currency?.toUpperCase()}
                  </span>
                )}
              </div>

              {percentChange !== undefined && (
                <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-sm font-medium ${isPositiveChange
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                  {isPositiveChange ? <ArrowUpRightAny className="w-4 h-4" /> : <ArrowDownRightAny className="w-4 h-4" />}
                  <span className="tabular-nums">{Math.abs(percentChange).toFixed(2)}%</span>
                  <span className="text-xs opacity-70 ml-1">24h</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* DeFi Protocols Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={isSolanaWallet ? {} : { scale: 1.01 }}
          transition={{ delay: 0.1 }}
          className={`md:col-span-1 relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm transition-colors ${isSolanaWallet ? 'cursor-default opacity-75' : 'hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer group'}`}
          onClick={toggleProtocols}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                <LandmarkAny className="w-5 h-5" />
              </div>
              {!isSolanaWallet && (
                <div className={`transition-transform duration-300 ${showProtocols ? 'rotate-180' : ''}`}>
                  <ChevronDownAny className="w-5 h-5 text-zinc-400" />
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">DeFi Protocols</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Lending, Staking, Liquidity
            </p>

            <div className="mt-auto pt-4">
              <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Status</div>
              <div className="flex items-center gap-2 mt-1">
                {isSolanaWallet ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Coming soon
                    </span>
                  </>
                ) : (
                  <>
                    <div className={`w-2 h-2 rounded-full ${protocolPositions.length > 0 ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {loadingProtocols || (!hasFetchedProtocols && (totalPositions || 0) > 0) ? 'Loading...' :
                        protocolPositions.length > 0 ? `${protocolPositions.length} Active Positions` :
                          'No Active Positions'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* DeFi Protocols Detail View (Collapsible) */}
        <AnimatePresence>
          {showProtocols && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="col-span-1 md:col-span-3 overflow-hidden"
            >
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 space-y-3">
                {loadingProtocols ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2Any className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : protocolPositions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {protocolPositions.map((position, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {position.protocolIcon ? (
                              <ImageAny
                                src={position.protocolIcon}
                                alt={position.protocol}
                                width={32}
                                height={32}
                                className="rounded-lg flex-shrink-0"
                                unoptimized
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {position.protocol.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{position.protocol}</div>
                              <div className="text-xs text-zinc-500 capitalize truncate">{position.chain}</div>
                            </div>
                          </div>
                          <div className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${position.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            position.type === 'loan' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                              'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            }`}>
                            {position.type}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {position.tokens.map((token, tIdx) => (
                            <div key={tIdx} className="flex justify-between items-start">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                                {token.icon ? (
                                  <ImageAny
                                    src={token.icon}
                                    alt={token.symbol}
                                    width={20}
                                    height={20}
                                    className="rounded-full flex-shrink-0"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    {token.symbol.charAt(0)}
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate leading-none mb-1">
                                    {token.symbol}
                                  </span>
                                  <span className="text-xs text-zinc-500 dark:text-zinc-500 truncate leading-none font-mono">
                                    {token.amount < 0.01 ? '< 0.01' : formatNumber(token.amount, 2)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-medium text-zinc-900 dark:text-white tabular-nums leading-none mb-1">
                                  ${formatNumber(token.value)}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center">
                            <span className="text-xs font-medium text-zinc-500">Total Value</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">${formatNumber(position.totalValue)}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">No active DeFi positions found.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Asset Lists - Use expandable chain view for all chains including Solana */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white px-1">
            Assets by Chain
          </h3>

          {/* Expandable chain list for all chains */}
          {chains.map(([chain, value], index) => {
            const percentage = totalPositions && totalPositions > 0 ? ((value || 0) / totalPositions) * 100 : 0;
            const isExpanded = expandedChains[chain];
            const tokens = chainTokens[chain];
            const isLoading = loadingChains[chain];

            return (
              <motion.div
                key={chain}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: isExpanded ? 1 : 1.005 }}
                transition={{ delay: index * 0.05 }}
                className="group overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
              >
                <button
                  onClick={() => toggleChainExpansion(chain)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors gap-2"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 overflow-hidden">
                    <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1.5 sm:p-2 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                      <ImageAny
                        src={getChainLogo(chain, chainIcons[chain])}
                        alt={chain}
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="text-left min-w-0 truncate">
                      <div className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white capitalize truncate">{chain.replace(/-/g, ' ')}</div>
                      <div className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">{percentage.toFixed(1)}% of portfolio</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0 ml-2">
                    <div className="text-right">
                      <div className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white tabular-nums">${value ? formatNumber(value) : "0.00"}</div>
                    </div>
                    <ChevronRightAny className={`w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10"
                    >
                      {isLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2Any className="w-5 h-5 animate-spin text-zinc-400" />
                        </div>
                      ) : tokens && tokens.length > 0 ? (
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-900 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                          {/* Table Header */}
                          <div className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            <div className="col-span-6 sm:col-span-5">Asset</div>
                            <div className="col-span-3 text-right hidden sm:block">Price</div>
                            <div className="col-span-6 sm:col-span-4 text-right">Value</div>
                          </div>

                          {tokens.map((token, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.02 }}
                              className="grid grid-cols-12 gap-2 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors items-center group/row cursor-default"
                            >
                              <div className="col-span-6 sm:col-span-5 flex items-center gap-2 sm:gap-3">
                                {token.icon ? (
                                  <ImageAny
                                    src={token.icon}
                                    alt={token.symbol}
                                    width={24}
                                    height={24}
                                    className="rounded-full"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                                    {token.symbol.charAt(0)}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm text-zinc-900 dark:text-white">{token.symbol}</span>
                                  <span className="text-xs text-zinc-500">{formatCrypto(token.balance)}</span>
                                </div>
                              </div>

                              <div className="col-span-3 text-right hidden sm:block">
                                <div className="text-sm text-zinc-900 dark:text-white tabular-nums">${formatCrypto(token.price)}</div>
                                {/* Mini Sparkline Placeholder - Visual only since we lack history data */}
                                <div className="h-1 w-12 ml-auto mt-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div className={`h-full w-2/3 rounded-full ${Math.random() > 0.5 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                </div>
                              </div>

                              <div className="col-span-6 sm:col-span-4 text-right">
                                <div className="font-bold text-sm text-zinc-900 dark:text-white tabular-nums">${formatNumber(token.value)}</div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-zinc-500">No tokens found on this chain.</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* NFT Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={isSolanaWallet ? {} : { scale: 1.01 }}
          transition={{ delay: 0.2 }}
          className={`md:col-span-1 relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm transition-colors ${isSolanaWallet ? 'cursor-default opacity-75' : 'hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer group'}`}
          onClick={toggleNfts}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                <LayersAny className="w-5 h-5" />
              </div>
              {!isSolanaWallet && (
                <div className={`transition-transform duration-300 ${showNfts ? 'rotate-180' : ''}`}>
                  <ChevronDownAny className="w-5 h-5 text-zinc-400" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">NFTs</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Digital Collectibles
            </p>

            <div className="mt-auto pt-4">
              <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Status</div>
              <div className="flex items-center gap-2 mt-1">
                {isSolanaWallet ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Coming soon
                    </span>
                  </>
                ) : (
                  <>
                    <div className={`w-2 h-2 rounded-full ${nftCollections.length > 0 ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {loadingNfts || (!hasFetchedNfts && (totalPositions || 0) > 0) ? 'Loading...' :
                        totalNftCollections > 0
                          ? totalNftCollections > 12
                            ? `12 of ${totalNftCollections} Collections`
                            : `${totalNftCollections} Collections`
                          : 'No NFTs Found'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* NFT Detail View (Collapsible) */}
        <AnimatePresence>
          {showNfts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="col-span-1 md:col-span-3 overflow-hidden"
            >
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 space-y-3">
                {loadingNfts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2Any className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : nftCollections.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {nftCollections.map((collection, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200"
                      >
                        <div className="aspect-square relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 mb-3">
                          {collection.imageUrl ? (
                            <ImageAny
                              src={collection.imageUrl}
                              alt={collection.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                              <LayersAny className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-[10px] font-medium text-white uppercase tracking-wide border border-white/10">
                            {collection.chain}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="font-semibold text-sm text-zinc-900 dark:text-white truncate" title={collection.name}>{collection.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{collection.amount} Items</div>

                          <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                            <span className="text-xs text-zinc-400">Floor</span>
                            <span className="text-xs font-medium text-zinc-900 dark:text-white">
                              {collection.floorPrice
                                ? `${currency === 'usd' ? '$' : ''}${formatNumber(collection.floorPrice)}${currency !== 'usd' ? ` ${currency?.toUpperCase() || ''}` : ''}`
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">No NFTs found.</div>
                )}

                {/* View full portfolio on Zerion link */}
                {nftCollections.length > 0 && (
                  <div className="text-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <a
                      href={`https://app.zerion.io/${result.id}/nfts`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>View full NFT portfolio on Zerion</span>
                      <ExternalLinkAny className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div >
    </div >
  );
};

export default PortfolioTable;
