import { TokenSearchData } from "@/types/token-search-response";
import Image from "next/image";
import React from "react";

const TokenInfoTable: React.FC<{
  result: TokenSearchData[] | string | null;
}> = ({ result }) => {
  // console.log("token data", result);

  if (!result || result.length === 0 || typeof result == "string")
    return <div className="text-white">No token data available.</div>;

  return (
    <div className="bg-black text-white px-4 rounded-lg w-full max-w-4xl border overflow-x-auto">
      {result.map((token, index) => (
        <div key={index} className="border-b border-gray-700 py-4">
          {/* Token Header */}
          <div className="flex flex-row justify-between border-b p-2 border-gray-700">
            <h2 className="text-sm font-semibold">
              {token.attributes.name} ({token.attributes.symbol})
            </h2>
          </div>

          {/* Token Icon */}
          <div className="flex justify-center mt-4">
            {token.attributes.icon?.url && (
              <Image
                src={token.attributes.icon.url}
                alt={token.attributes.symbol || "Token"}
                className="w-10 h-10"
                height={50}
                width={50}
                onError={(e) =>
                  (e.currentTarget.src = "/images/token-placeholder.png")
                }
              />
            )}
          </div>

          {/* Token Data Table */}
          <table className="w-full text-sm mt-4">
            <tbody>
              {[
                ["Name", token.attributes.name],
                ["Symbol", token.attributes.symbol],
                [
                  "Price",
                  token.attributes.market_data.price
                    ? `$${token.attributes.market_data.price.toFixed(8)}`
                    : "-",
                ],
                [
                  "24h Change (%)",
                  token.attributes.market_data.changes.percent_1d
                    ? `${token.attributes.market_data.changes.percent_1d.toFixed(
                        2
                      )}%`
                    : "-",
                ],
                [
                  "Market Cap",
                  token.attributes.market_data.market_cap
                    ? `$${token.attributes.market_data.market_cap.toLocaleString()}`
                    : "-",
                ],
                [
                  "Fully Diluted Valuation",
                  token.attributes.market_data.fully_diluted_valuation
                    ? `$${token.attributes.market_data.fully_diluted_valuation.toLocaleString()}`
                    : "-",
                ],
                [
                  "Circulating Supply",
                  token.attributes.market_data.circulating_supply
                    ? token.attributes.market_data.circulating_supply.toLocaleString()
                    : "-",
                ],
                [
                  "Total Supply",
                  token.attributes.market_data.total_supply
                    ? token.attributes.market_data.total_supply.toLocaleString()
                    : "-",
                ],
              ].map(([label, value], idx) => (
                <tr key={idx} className="border-b border-gray-700">
                  <td className="p-2 font-semibold">{label}</td>
                  <td className="p-2">{value || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Blockchain Implementations */}
          {token.attributes.implementations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold border-b border-gray-700 p-2">
                Blockchain Implementations
              </h3>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="p-2">Chain</th>
                    <th className="p-2">Contract Address</th>
                  </tr>
                </thead>
                <tbody>
                  {token.attributes.implementations.map((impl, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="p-2">{impl.chain_id}</td>
                      <td className="p-2 break-all">{impl.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* External Links */}
          {token.attributes.external_links.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold border-b border-gray-700 p-2">
                External Links
              </h3>
              <ul className="text-sm text-blue-400">
                {token.attributes.external_links.map((link, index) => (
                  <li key={index} className="p-2">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TokenInfoTable;
