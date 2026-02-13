import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        // Cloudflare R2 presigned URLs
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        // R2 dev/custom domains
        protocol: "https",
        hostname: "*.r2.dev",
      },
    ],
  },
};

export default nextConfig;
