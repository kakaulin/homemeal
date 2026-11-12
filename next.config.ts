import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: "/homemeal",
  assetPrefix: "/homemeal/",
};

export default nextConfig;
