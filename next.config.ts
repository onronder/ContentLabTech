import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure proper asset handling for Vercel
  trailingSlash: false,

  // Force Next.js asset paths (not Vite)
  assetPrefix: "",
  basePath: "",

  // Image optimization
  images: {
    domains: ["app.contentlabtech.com", "localhost"],
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
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
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
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/chunks/(.*)",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/media/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Fallback for any /assets/ requests to redirect to /_next/static/
      {
        source: "/assets/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex",
          },
        ],
      },
    ];
  },

  // Rewrites to handle potential asset path mismatches
  async rewrites() {
    return [
      // Redirect any /assets/ requests to /_next/static/
      {
        source: "/assets/:path*",
        destination: "/_next/static/:path*",
      },
    ];
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // External packages for server components
  serverExternalPackages: ["sharp"],

  // Enhanced webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Ensure proper asset resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "./src"),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Ensure proper public path for assets
    config.output = {
      ...config.output,
      publicPath: "/_next/",
    };

    return config;
  },

  // Use default Next.js behavior for output
  // output: undefined, // Removed to fix TypeScript strict mode
};

export default nextConfig;
