import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, net: false, tls: false };
    }
    return config;
  },
  eslint: {
    // Prevent ESLint warnings from failing production build on Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Typecheck was already verified locally with exit code 0
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
