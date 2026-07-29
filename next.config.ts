import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel manages output natively; use "standalone" only for self-hosted Docker
  // output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
