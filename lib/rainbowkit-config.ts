import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";

export const rainbowKitConfig = getDefaultConfig({
  appName: "Javin.ai",
  projectId: "f0717ea9e05da079438c1c012689be51",
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: true, // If your dApp uses server side rendering (SSR)
});
