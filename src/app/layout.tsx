import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/client-providers";
import { ErrorBoundary } from "@/components/error-boundary";

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
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ClientProviders>{children}</ClientProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
