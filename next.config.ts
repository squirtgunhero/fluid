import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the whole app is one prerendered page, which is what the
  // iOS shell (Capacitor / WKWebView) loads from the `out/` directory.
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
