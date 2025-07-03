import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";
import { ErrorBoundary } from "@/components/error-boundary";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ContentLab Nexus - Content Marketing Analytics Platform",
  description:
    "Analyze content performance, track competitors, and optimize your content marketing strategy with ContentLab Nexus.",
  keywords: [
    "content marketing",
    "analytics",
    "SEO",
    "competitor analysis",
    "content optimization",
  ],
  authors: [{ name: "ContentLab Nexus Team" }],
  openGraph: {
    title: "ContentLab Nexus - Content Marketing Analytics Platform",
    description:
      "Analyze content performance, track competitors, and optimize your content marketing strategy.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContentLab Nexus",
    description: "Content Marketing Analytics Platform",
  },
  robots: "index, follow",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Asset path fix script */}
        <Script
          id="asset-path-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Fix asset paths that might be incorrectly transformed by extensions
                const observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                      if (node.nodeType === 1) { // Element node
                        // Fix CSS links
                        if (node.tagName === 'LINK' && node.href && node.href.includes('/assets/')) {
                          node.href = node.href.replace('/assets/', '/_next/static/');
                        }
                        // Fix script sources
                        if (node.tagName === 'SCRIPT' && node.src && node.src.includes('/assets/')) {
                          node.src = node.src.replace('/assets/', '/_next/static/');
                        }
                        // Fix nested elements
                        const links = node.querySelectorAll && node.querySelectorAll('link[href*="/assets/"]');
                        if (links) {
                          links.forEach(function(link) {
                            link.href = link.href.replace('/assets/', '/_next/static/');
                          });
                        }
                        const scripts = node.querySelectorAll && node.querySelectorAll('script[src*="/assets/"]');
                        if (scripts) {
                          scripts.forEach(function(script) {
                            script.src = script.src.replace('/assets/', '/_next/static/');
                          });
                        }
                      }
                    });
                  });
                });
                
                // Start observing
                if (typeof document !== 'undefined') {
                  observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                  });
                  
                  // Fix existing elements on load
                  document.addEventListener('DOMContentLoaded', function() {
                    const links = document.querySelectorAll('link[href*="/assets/"]');
                    links.forEach(function(link) {
                      link.href = link.href.replace('/assets/', '/_next/static/');
                    });
                    const scripts = document.querySelectorAll('script[src*="/assets/"]');
                    scripts.forEach(function(script) {
                      script.src = script.src.replace('/assets/', '/_next/static/');
                    });
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ClientProviders>{children}</ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
