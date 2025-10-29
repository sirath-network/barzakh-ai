"use client";

import { getPercentChangeColor } from "@barzakh/shared/lib/utils/utils";
import {
  PortfolioData,
  PortfolioResponse,
} from "@barzakh/shared/types/wallet-actions-response";
import Image from "next/image";
import React, { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface PortfolioProps {
  result: PortfolioData | null;
}

// Get chain logo from Zerion's CDN or cached icons
// Reference: https://developers.zerion.io/reference/listchains
const getChainLogo = (chain: string, iconUrl?: string): string => {
  // If we have the icon URL from API, use it
  if (iconUrl) return iconUrl;
  
  // Zerion's chain icon URLs - Official URLs from Zerion API
  // Source: https://developers.zerion.io/reference/listchains
  const zerionChainIcons: Record<string, string> = {
    // EVM Chains (from Zerion API)
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
    
    // Non-EVM Chains
    solana: "https://chain-icons.s3.amazonaws.com/solana.png",
    sui: "https://chain-icons.s3.amazonaws.com/sui.png",
  };

  return zerionChainIcons[chain.toLowerCase()] || "https://chain-icons.s3.amazonaws.com/ethereum.png";
};

// Format large numbers with commas
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
}

// Interface for protocol/DeFi positions
interface ProtocolPosition {
  protocol: string;
  protocolIcon?: string;
  type: string; // 'deposit', 'loan', 'locked', 'staked', 'reward', 'investment'
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

const PortfolioTable: React.FC<PortfolioProps> = ({ result }) => {
  const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>({});
  const [chainTokens, setChainTokens] = useState<Record<string, ChainTokenDetail[]>>({});
  const [loadingChains, setLoadingChains] = useState<Record<string, boolean>>({});
  const [chainIcons, setChainIcons] = useState<Record<string, string>>({});
  const [showProtocols, setShowProtocols] = useState(false);
  const [protocolPositions, setProtocolPositions] = useState<ProtocolPosition[]>([]);
  const [loadingProtocols, setLoadingProtocols] = useState(false);

  if (!result || !result.attributes)
    return (
      <div className="text-black dark:text-white">
        No portfolio data available.
      </div>
    );
  const { attributes, currency } = result;
  const totalPositions = attributes.total?.positions;
  const percentChange = attributes.changes?.percent_1d;
  const absoluteChange = attributes.changes?.absolute_1d;
  const chains = attributes.positions_distribution_by_chain
    ? Object.entries(attributes.positions_distribution_by_chain).sort((a, b) => (b[1] || 0) - (a[1] || 0))
    : [];

  const isPositiveChange = percentChange && percentChange >= 0;

  // Fetch protocol positions
  const fetchProtocolPositions = async () => {
    setLoadingProtocols(true);
    try {
      const walletAddress = result.id;
      
      const response = await fetch(
        `/api/zerion/protocols?address=${walletAddress}&currency=${currency}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Protocol API error:', response.status, response.statusText, errorData);
        throw new Error(`Failed to fetch protocol positions: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse and group positions by protocol
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
        
        // Add tokens from this position
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
      
      const finalPositions = Array.from(protocolMap.values()).sort((a, b) => b.totalValue - a.totalValue);
      setProtocolPositions(finalPositions);
    } catch (error) {
      console.error('Error fetching protocol positions:', error);
      setProtocolPositions([]);
    } finally {
      setLoadingProtocols(false);
    }
  };

  // Toggle protocol display
  const toggleProtocols = () => {
    if (!showProtocols && protocolPositions.length === 0) {
      fetchProtocolPositions();
    }
    setShowProtocols(!showProtocols);
  };

  // Toggle chain expansion and fetch tokens if needed
  const toggleChainExpansion = async (chain: string) => {
    const isExpanding = !expandedChains[chain];
    
    setExpandedChains(prev => ({
      ...prev,
      [chain]: isExpanding
    }));

    // If expanding and we don't have token data yet, fetch it
    if (isExpanding && !chainTokens[chain]) {
      setLoadingChains(prev => ({ ...prev, [chain]: true }));
      
      try {
        const walletAddress = result.id;
        
        // Call Zerion API to get fungible positions for this specific chain
        const response = await fetch(
          `/api/zerion/positions?address=${walletAddress}&chain=${chain}&currency=${currency}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch token positions');
        }

        const data = await response.json();
        
        // Extract chain icon from the first position (if available)
        if (data.data && data.data.length > 0 && data.data[0].relationships?.chain?.data) {
          const chainData = data.data[0].relationships.chain.data;
          if (chainData.attributes?.icon_url) {
            setChainIcons(prev => ({
              ...prev,
              [chain]: chainData.attributes.icon_url
            }));
          }
        }
        
        // Parse Zerion response and extract token details
        const tokens: ChainTokenDetail[] = data.data?.map((position: any) => ({
          symbol: position.attributes?.fungible_info?.symbol || 'Unknown',
          name: position.attributes?.fungible_info?.name || 'Unknown Token',
          balance: position.attributes?.quantity?.float || 0,
          value: position.attributes?.value || 0,
          price: position.attributes?.price || 0,
          icon: position.attributes?.fungible_info?.icon?.url || undefined
        })) || [];
        
        setChainTokens(prev => ({
          ...prev,
          [chain]: tokens
        }));
      } catch (error) {
        console.error(`Error fetching tokens for ${chain}:`, error);
        setChainTokens(prev => ({
          ...prev,
          [chain]: []
        }));
      } finally {
        setLoadingChains(prev => ({ ...prev, [chain]: false }));
      }
    }
  };

  return (
    <div className={`relative bg-white dark:bg-black/80 rounded-xl border overflow-hidden backdrop-blur-sm shadow-lg dark:shadow-2xl w-full ${
      isPositiveChange
        ? 'border-gray-200 dark:border-green-900/50'
        : 'border-gray-200 dark:border-red-900/50'
    }`}>
      {/* Decorative gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent ${
        isPositiveChange 
          ? 'to-green-500/5 dark:to-green-500/10' 
          : 'to-red-500/5 dark:to-red-500/10'
      } pointer-events-none`} />
      
      <div className="relative">
      {/* Portfolio Header */}
        <div className={`flex flex-col p-4 md:p-5 border-b ${
          isPositiveChange 
            ? 'border-gray-200 dark:border-green-900/30' 
            : 'border-gray-200 dark:border-red-900/30'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm border ${
                isPositiveChange
                  ? 'bg-gray-100 dark:bg-green-800/50 border-gray-200 dark:border-green-700/50'
                  : 'bg-gray-100 dark:bg-red-800/50 border-gray-200 dark:border-red-700/50'
              }`}>
                <Wallet className={`w-5 h-5 ${
                  isPositiveChange
                    ? 'text-gray-600 dark:text-green-300'
                    : 'text-gray-600 dark:text-red-300'
                }`} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Portfolio
              </h2>
            </div>
      </div>

          <div className="flex items-end justify-between">
            {totalPositions && totalPositions > 0 && (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(totalPositions)}
                </span>
                {currency !== "units" && (
                  <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                    {currency?.toUpperCase() ?? ""}
                  </span>
                )}
              </div>
            )}
            
            {percentChange !== undefined && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                isPositiveChange 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
              }`}>
                {isPositiveChange ? (
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
                <div className="flex flex-col items-end">
                  <span className={`text-xs font-bold ${
                    isPositiveChange 
                      ? 'text-green-700 dark:text-green-400' 
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    {isPositiveChange ? '+' : ''}{percentChange.toFixed(2)}%
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">24h</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DeFi Protocols Button */}
        <div className="px-4 md:px-5 pt-2 pb-3 border-b border-gray-200 dark:border-gray-700/50">
          <button
            onClick={toggleProtocols}
            className={`group w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
              showProtocols
                ? 'bg-gradient-to-br from-gray-50 to-grey-50 dark:from-gray-900/20 dark:to-grey-900/20 border-2 border-gray-300 dark:border-gray-700/50 shadow-sm'
                : 'bg-white dark:bg-gray-800/40 border-2 border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${
                showProtocols
                  ? 'bg-gradient-to-br from-gray-500 to-grey-600'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 group-hover:from-gray-500 group-hover:to-grey-600'
              }`}>
                <span className={`text-xl transition-all duration-200 ${
                  showProtocols ? '' : 'group-hover:scale-110'
                }`}>
                  🏦
                </span>
              </div>
              <div className="text-left">
                <div className={`text-sm font-bold transition-colors duration-200 ${
                  showProtocols 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-400'
                }`}>
                  DeFi Protocols
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                  Lending, Staking, Liquidity & more
                </div>
              </div>
            </div>
            <div className={`transition-all duration-200 ${
              showProtocols ? 'rotate-0' : 'group-hover:translate-x-0.5'
            }`}>
              {showProtocols ? (
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
              )}
            </div>
          </button>
        </div>

        {/* DeFi Protocol Positions */}
        {showProtocols && (
          <div className="px-4 md:px-5 pb-4 pt-3">
            {loadingProtocols ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-gray-400" />
                <span className="ml-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                  Loading DeFi positions...
                </span>
              </div>
            ) : protocolPositions.length > 0 ? (
              <div className="space-y-3">
                {protocolPositions.map((position, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-white dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* Subtle gradient overlay based on position type */}
                    <div className={`absolute inset-0 opacity-5 ${
                      position.type === 'deposit' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                      position.type === 'loan' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      position.type === 'staked' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                      position.type === 'locked' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                      position.type === 'reward' ? 'bg-gradient-to-br from-pink-500 to-pink-600' :
                      'bg-gradient-to-br from-gray-500 to-gray-600'
                    } pointer-events-none`} />
                    
                    <div className="relative p-4">
                      {/* Protocol Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Protocol Icon */}
                          <div className="relative">
                            {position.protocolIcon ? (
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 shadow-sm">
                                <Image
                                  src={position.protocolIcon}
                                  alt={position.protocol}
                                  width={24}
                                  height={24}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-grey-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                {position.protocol.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          
                          {/* Protocol Info */}
                          <div className="flex flex-col">
                            <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              {position.protocol}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 capitalize flex items-center gap-1.5 mt-0.5">
                              <span>{position.chain.replace(/-/g, ' ')}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Value and Badge */}
                        <div className="text-right flex flex-col items-end gap-1.5">
                          <div className="text-base font-bold text-gray-900 dark:text-white">
                            ${formatNumber(position.totalValue)}
                          </div>
                          <div className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold shadow-sm border ${
                            position.type === 'deposit' 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' 
                              : position.type === 'loan' 
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50' 
                              : position.type === 'staked' 
                              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50' 
                              : position.type === 'locked' 
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50' 
                              : position.type === 'reward' 
                              ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800/50' 
                              : 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800/50'
                          }`}>
                            {position.type}
                          </div>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-3" />

                      {/* Tokens in this position */}
                      <div className="space-y-2">
                        {position.tokens.map((token, tokenIdx) => (
                          <div
                            key={tokenIdx}
                            className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800/70 hover:border-gray-300 dark:hover:border-gray-600/50 transition-all duration-150"
                          >
                            <div className="flex items-center gap-2.5">
                              {token.icon ? (
                                <Image
                                  src={token.icon}
                                  alt={token.symbol}
                                  width={20}
                                  height={20}
                                  className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-[8px] font-bold text-white">
                                  {token.symbol.charAt(0)}
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                  {token.symbol}
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {token.amount >= 0.01 
                                    ? token.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })
                                    : token.amount.toExponential(2)
                                  }
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-gray-900 dark:text-white">
                                ${formatNumber(token.value)}
                              </div>
                              {token.value > 0 && token.amount > 0 && (
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                  ${(token.value / token.amount) >= 0.01 
                                    ? (token.value / token.amount).toLocaleString('en-US', { maximumFractionDigits: 2 })
                                    : (token.value / token.amount).toExponential(2)
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-2xl">🏦</span>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  No DeFi Positions Found
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This wallet doesn't have any active DeFi protocol positions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Breakdown by Chain */}
        <div className="max-h-80 overflow-y-auto custom-scrollbar p-4 md:p-5">
          {chains.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No holdings available.
            </div>
          ) : (
            <div className="space-y-2.5">
              {chains.map(([chain, value]) => {
                const percentage = totalPositions && totalPositions > 0 
                  ? ((value || 0) / totalPositions) * 100 
                  : 0;
                
                const isExpanded = expandedChains[chain];
                const tokens = chainTokens[chain];
                const isLoading = loadingChains[chain];

                return (
                  <div
                    key={chain}
                    className={`group relative rounded-lg border transition-all duration-200 ${
                      isPositiveChange
                        ? 'bg-gray-50 dark:bg-green-950/10 border-gray-200 dark:border-green-900/30'
                        : 'bg-gray-50 dark:bg-red-950/10 border-gray-200 dark:border-red-900/30'
                    }`}
                  >
                    {/* Chain Header - Clickable */}
                    <button
                      onClick={() => toggleChainExpansion(chain)}
                      className={`w-full p-3 transition-all duration-200 hover:shadow-sm ${
                        isPositiveChange
                          ? 'hover:bg-gray-100 dark:hover:bg-green-950/20 hover:border-gray-300 dark:hover:border-green-800/50'
                          : 'hover:bg-gray-100 dark:hover:bg-red-950/20 hover:border-gray-300 dark:hover:border-red-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-2.5 items-center">
                          <div className="flex items-center gap-2">
                            {/* Expand/Collapse Icon */}
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            )}
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900/50 p-1.5 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                              <Image
                                src={getChainLogo(chain, chainIcons[chain])}
                                alt={chain}
                                width={24}
                                height={24}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col text-left">
                            <div className="font-semibold text-sm text-gray-900 dark:text-white capitalize">
                              {chain.replace(/-/g, ' ')}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-gray-900 dark:text-white">
                            {value ? formatNumber(value) : "0.00"}
                          </div>
                          {currency !== "units" && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 uppercase">
                              {currency ?? ""}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className={`h-1 rounded-full overflow-hidden ${
                        isPositiveChange
                          ? 'bg-gray-200 dark:bg-green-950/30'
                          : 'bg-gray-200 dark:bg-red-950/30'
                      }`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            isPositiveChange
                              ? 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700'
                              : 'bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </button>

                    {/* Expanded Token Details */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-gray-200 dark:border-gray-700/50">
                        {isLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              Loading tokens...
                            </span>
                          </div>
                        ) : tokens && tokens.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {tokens.map((token, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700/30 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  {token.icon && (
                                    <Image
                                      src={token.icon}
                                      alt={token.symbol}
                                      width={24}
                                      height={24}
                                      className="w-6 h-6 rounded-full"
                                    />
                                  )}
                                  <div className="flex flex-col">
                                    <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                      {token.symbol}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                      {token.balance >= 0.01 
                                        ? token.balance.toLocaleString('en-US', { maximumFractionDigits: 4 })
                                        : token.balance.toExponential(2)
                                      } {token.symbol}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                                    ${formatNumber(token.value)}
                                  </div>
                                  {token.price > 0 && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                      ${token.price >= 0.01 
                                        ? token.price.toLocaleString('en-US', { maximumFractionDigits: 2 })
                                        : token.price.toExponential(2)
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
                            No tokens found on this chain
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioTable;
