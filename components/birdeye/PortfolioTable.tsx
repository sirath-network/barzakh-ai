import { getPercentChangeColor } from "@/lib/utils";
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
  // console.log("portfolio resoult", result);
  if (!result || !result.attributes)
    return <div className="text-white">No portfolio data available.</div>;
  const { attributes, currency } = result;
  const totalPositions = attributes.total?.positions;
  const percentChange = attributes.changes?.percent_1d;
  const absoluteChange = attributes.changes?.absolute_1d;
  const chains = attributes.positions_distribution_by_chain
    ? Object.entries(attributes.positions_distribution_by_chain)
    : [];

  return (
    <div className="bg-neutral-900 text-white px-4 py-4 rounded-lg w-full max-w-md border border-neutral-700 mt-2 md:mt-0">
      {/* Portfolio Header */}
      <div className="flex flex-col pb-2 border-b border-neutral-700">
        <div className="flex flex-row gap-1 justify-between">
          <h2 className="text-lg font-semibold">Portfolio</h2>
          {totalPositions > 0 && (
            <div className="">
              <span className="text-xl font-bold">
                {totalPositions.toFixed(2)}{" "}
              </span>
              <span className="text-sm ">{currency?.toUpperCase() ?? ""}</span>
            </div>
          )}
        </div>
        <span className="text-sm text-gray-400 float-right">
          24h Change:{" "}
          <span className={getPercentChangeColor(percentChange)}>
            {percentChange.toFixed(2)}% &#x28;
            {absoluteChange.toFixed(2)} {currency?.toUpperCase() ?? ""}
            &#x29;
          </span>
        </span>
      </div>

      {/* Portfolio Breakdown by Chain */}
      <div className="max-h-64 overflow-y-auto pr-2">
        {chains.length === 0 ? (
          <div className="text-gray-400">No holdings available.</div>
        ) : (
          chains.map(([chain, value]) => (
            <div
              key={chain}
              className="flex justify-between items-center py-2 border-b border-neutral-700 last:border-none"
            >
              <div className="flex gap-2 items-center justify-center">
                {/* <Image
                  src={`/images/chain-logo/${chain.toLowerCase()}.png`}
                  alt={chain}
                  className="w-6 h-6 mr-2"
                  height={50}
                  width={50}
                  onError={(e) =>
                    (e.currentTarget.src = "/images/chain-logo/default.png")
                  }
                /> */}
                <div className="capitalize">{chain}</div>
              </div>
              <div className="">
                <span className="font-semibold">
                  {value ? value.toFixed(2) : "0.00"}{" "}
                </span>
                <span className="text-xs ">
                  {currency?.toUpperCase() ?? ""}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PortfolioTable;
