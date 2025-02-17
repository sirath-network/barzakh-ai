import {
  PortfolioData,
  PortfolioResponse,
} from "@/types/wallet-actions-response";
import Image from "next/image";
import React from "react";

interface PortfolioProps {
  result: PortfolioData | null;
}

const PortfolioTable: React.FC<PortfolioProps> = ({ result }) => {
  if (!result || !result.attributes)
    return <div className="text-white">No portfolio data available.</div>;

  const { attributes, currency } = result;
  // Extracting positions distribution by chain
  const chains = Object.entries(attributes.positions_distribution_by_chain);

  return (
    <div className="bg-black text-white px-4 py-4 rounded-lg w-full max-w-md border border-gray-700">
      {/* Portfolio Header */}
      <div className="flex flex-col border-b border-gray-700 pb-2">
        <div className="flex flex-row gap-1 justify-between">
          <h2 className="text-lg font-semibold">Portfolio</h2>
          <span className="text-xl font-bold">
            {attributes.total.positions.toFixed(2)} {currency?.toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-gray-400 float-right">
          24h Change: {attributes.changes.percent_1d.toFixed(2)}% &#x28;
          {attributes.changes.absolute_1d.toFixed(2)} {currency?.toUpperCase()}
          &#x29;
        </span>
      </div>

      {/* Portfolio Breakdown by Chain */}
      <div className="mt-3">
        {chains.length === 0 ? (
          <div className="text-gray-400">No holdings available.</div>
        ) : (
          chains.map(([chain, value]) => (
            <div
              key={chain}
              className="flex justify-between items-center py-2 border-b border-gray-700 last:border-none"
            >
              <div className="flex gap-2 items-center justify-center">
                <Image
                  src={`/images/chain-logo/${chain.toLowerCase()}.png`}
                  alt={chain}
                  className="w-6 h-6 mr-2"
                  height={50}
                  width={50}
                />
                <div className="capitalize">{chain}</div>
              </div>
              <div className="font-semibold">
                {value?.toFixed(2)} {currency?.toUpperCase()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PortfolioTable;
