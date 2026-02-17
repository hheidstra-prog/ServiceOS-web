import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable transpilation of shared packages
  transpilePackages: ["@serviceos/database", "@serviceos/ui"],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // Experimental features
  experimental: {
    // Enable PPR for faster page loads
    // ppr: true,
  },
};

export default nextConfig;
