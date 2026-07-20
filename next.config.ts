import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongodb", "playwright", "playwright-core"],
};

export default nextConfig;
