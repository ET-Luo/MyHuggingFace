import type { NextConfig } from "next";

/**
 * NOTE:
 * - For RAG (Tavily/LlamaIndex) we need a server runtime (Next API routes).
 * - Tauri build still needs static export ("out").
 *
 * Use TAURI_BUILD=1 to enable static export.
 */
const isTauriBuild = process.env.TAURI_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isTauriBuild ? { output: "export" } : {}),
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
