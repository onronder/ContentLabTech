import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper asset handling for Vercel
  trailingSlash: false,

  // Image optimization
  images: {
    domains: ["app.contentlabtech.com"],
    unoptimized: false,
  },

  // Headers for proper MIME types and caching
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
      {
        source: "/_next/static/css/(.*)",
        headers: [
          {
            key: "Content-Type",
            value: "text/css; charset=utf-8",
          },
        ],
      },
      {
        source: "/_next/static/js/(.*)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // External packages for server components
  serverExternalPackages: ["sharp"],

  // Webpack configuration for proper bundling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // Use default Next.js behavior for output
  // output: undefined, // Removed to fix TypeScript strict mode
};

export default nextConfig;
