import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["@earendil-works/pi-agent-core", "@earendil-works/pi-ai"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
