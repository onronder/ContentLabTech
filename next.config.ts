import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove any custom asset prefix to use Next.js defaults
  // assetPrefix: undefined,

  // Image optimization
  images: {
    domains: ["app.contentlabtech.com"],
    unoptimized: false,
  },

  // Static file serving
  trailingSlash: false,

  // Headers for proper MIME types
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: false,
  },

  // External packages for server components
  serverExternalPackages: ["sharp"],

  // Webpack configuration to ensure proper asset bundling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
