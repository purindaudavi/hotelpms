import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev && process.env.NEXT_PUBLIC_SOURCE_INSPECTOR === "1") {
      const { xrayPlugin } = require("@stinsky/xray/plugin");
      config.plugins.push(xrayPlugin({ bundler: "webpack", editor: "code" }));
    }
    return config;
  }
};

export default nextConfig;
