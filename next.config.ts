import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP']
  }
};

export default nextConfig;