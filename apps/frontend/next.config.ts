import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@barzakh/shared", "@shelby-protocol/sdk"],
  allowedDevOrigins: ["dev.barzakh.tech"],
  // Dynamic Node SDK has native CJS/WASM binaries that can't be bundled by Turbopack
  serverExternalPackages: [
    "@dynamic-labs-wallet/node",
    "@dynamic-labs-wallet/node-evm",
    "@dynamic-labs-wallet/node-svm",
    "@evervault/wasm-attestation-bindings",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Allows all external image sources
      },
    ],
  },
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Turbopack configuration for Next.js 16
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  webpack: (config, { isServer }) => {
    // Handle WalletConnect / Dynamic SDK / wagmi dependencies
    // These packages have optional dependencies that aren't needed for web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      'lokijs': false,
      'encoding': false,
    };

    // Externalize problematic React Native dependencies on server
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        '@react-native-async-storage/async-storage',
      ];
    }

    // Suppress webpack warnings from third-party dependencies
    config.ignoreWarnings = [
      {
        module: /node_modules\/require-in-the-middle/,
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
      {
        module: /node_modules\/@opentelemetry/,
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
      {
        module: /node_modules\/keyv/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
      {
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      // Ignore MetaMask SDK and WalletConnect module resolution warnings
      {
        module: /node_modules\/@metamask\/sdk/,
      },
      {
        module: /node_modules\/@walletconnect/,
      },
      {
        module: /node_modules\/pino/,
      },
    ];
    return config;
  },
};

export default nextConfig;
