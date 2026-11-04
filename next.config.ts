import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
