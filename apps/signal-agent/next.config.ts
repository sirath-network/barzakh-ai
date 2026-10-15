import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ARC_TESTNET: process.env.ARC_TESTNET || process.env.NEXT_PUBLIC_ARC_TESTNET || 'false',
  },
  transpilePackages: ['@barzakh/shared'],
};

export default nextConfig;
