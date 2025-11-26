import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@barzakh/shared"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
