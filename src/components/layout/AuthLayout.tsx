/**
 * Professional Split-Screen Authentication Layout
 * Modern design with marketing content and brand storytelling
 */

import { ReactNode } from "react";
import { Logo } from "@/components/common/Logo";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Column - Auth Form */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {/* Logo - Large size with no spacing */}
          <div className="mb-8 text-center">
            <Logo size="4xl" variant="default" />
          </div>

          {/* Auth Form Content - Professional card design */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
            {/* Subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20" />

            {/* Content */}
            <div className="relative z-10">{children}</div>
          </div>

          {/* Footer links */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Trusted by 10,000+ content marketers worldwide
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Marketing Content */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-1"
        style={{
          background:
            "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 30%, #6366f1 60%, #8b5cf6 100%)",
        }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 h-32 w-32 animate-pulse rounded-full bg-white blur-3xl" />
          <div
            className="absolute right-20 bottom-20 h-48 w-48 animate-pulse rounded-full bg-white blur-3xl"
            style={{ animationDelay: "1s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 transform animate-pulse rounded-full bg-white blur-3xl"
            style={{ animationDelay: "2s" }}
          />
        </div>

        {/* Marketing Content */}
        <div className="relative z-10 flex w-full flex-col justify-center p-8 text-white xl:p-12">
          <div className="mx-auto max-w-lg">
            <h1 className="mb-6 text-3xl leading-tight font-bold xl:text-4xl">
              Transform Your Content Strategy with AI-Powered Analytics
            </h1>

            <p className="mb-8 text-lg leading-relaxed text-blue-100 xl:text-xl">
              Join thousands of content marketers who use ContentLab to discover
              high-impact opportunities and outperform competitors.
            </p>

            {/* Key Features */}
            <div className="mb-8 space-y-4">
              <div className="group flex items-center space-x-3">
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-200 transition-transform group-hover:scale-125" />
                <span className="text-blue-100 transition-colors group-hover:text-white">
                  Content Gap Analysis & Competitor Intelligence
                </span>
              </div>
              <div className="group flex items-center space-x-3">
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-200 transition-transform group-hover:scale-125" />
                <span className="text-blue-100 transition-colors group-hover:text-white">
                  AI-Powered SEO Optimization Tools
                </span>
              </div>
              <div className="group flex items-center space-x-3">
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-200 transition-transform group-hover:scale-125" />
                <span className="text-blue-100 transition-colors group-hover:text-white">
                  Strategic Content Planning & Performance Tracking
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              <div className="group cursor-default">
                <div className="text-2xl font-bold transition-transform group-hover:scale-105 xl:text-3xl">
                  10,000+
                </div>
                <div className="text-sm text-blue-200 xl:text-base">
                  Active Users
                </div>
              </div>
              <div className="group cursor-default">
                <div className="text-2xl font-bold transition-transform group-hover:scale-105 xl:text-3xl">
                  500M+
                </div>
                <div className="text-sm text-blue-200 xl:text-base">
                  Keywords Analyzed
                </div>
              </div>
            </div>

            {/* Customer testimonial */}
            <div className="mt-8 rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-2 text-sm text-blue-100 italic">
                &ldquo;ContentLab Nexus helped us increase our organic traffic
                by 300% in just 3 months. The AI insights are
                game-changing.&rdquo;
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-300 text-xs font-bold text-blue-800">
                  S
                </div>
                <span className="text-xs text-blue-200">
                  Sarah Chen, Head of Marketing at TechFlow
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
