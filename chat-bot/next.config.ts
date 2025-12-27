import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Required for Tauri (Static Export)
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
