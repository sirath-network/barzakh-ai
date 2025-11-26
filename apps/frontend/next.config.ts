import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@barzakh/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Allows all external image sources
      },
    ],
  },
  devIndicators: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
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
    ];
    return config;
  },
};

export default nextConfig;
