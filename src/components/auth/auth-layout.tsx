"use client";

/**
 * Premium Authentication Layout
 * Beautiful, modern authentication layout with brand storytelling
 */

import { ReactNode } from "react";
import { Sparkles, TrendingUp, Users, Zap } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  testimonial?: {
    quote: string;
    author: string;
    role: string;
    company: string;
  };
}

const AuthLayout = ({
  children,
  title,
  subtitle,
  testimonial,
}: AuthLayoutProps) => {
  return (
    <div className="from-brand-blue-50 to-brand-emerald-50 dark:from-brand-blue-950 dark:via-background dark:to-brand-emerald-950 min-h-screen bg-gradient-to-br via-white">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-brand-blue-200 dark:bg-brand-blue-800 animate-float absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-70 mix-blend-multiply blur-xl filter" />
        <div
          className="bg-brand-emerald-200 dark:bg-brand-emerald-800 animate-float absolute -bottom-40 -left-40 h-80 w-80 rounded-full opacity-70 mix-blend-multiply blur-xl filter"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="bg-brand-amber-200 dark:bg-brand-amber-800 animate-float absolute top-40 left-40 h-80 w-80 rounded-full opacity-70 mix-blend-multiply blur-xl filter"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative flex min-h-screen">
        {/* Left side - Brand story and features */}
        <div className="hidden flex-col justify-center p-12 lg:flex lg:w-1/2 xl:w-3/5 xl:p-16">
          <div className="animate-fade-in-up max-w-lg">
            {/* Logo and brand */}
            <div className="mb-8 flex items-center space-x-3">
              <div className="bg-gradient-primary flex h-12 w-12 items-center justify-center rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-gradient-primary text-2xl font-bold">
                  ContentLab Nexus
                </h1>
                <p className="text-muted-foreground text-sm">
                  AI-Powered Content Intelligence
                </p>
              </div>
            </div>

            {/* Main value proposition */}
            <h2 className="text-foreground mb-6 text-4xl leading-tight font-bold xl:text-5xl">
              Transform Your Content Strategy with{" "}
              <span className="text-gradient-primary">AI Intelligence</span>
            </h2>

            <p className="text-muted-foreground mb-12 text-xl leading-relaxed">
              Join thousands of content creators and marketers who use
              ContentLab Nexus to analyze, optimize, and outperform their
              competition with cutting-edge AI insights.
            </p>

            {/* Key features */}
            <div className="mb-12 space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-brand-blue-100 dark:bg-brand-blue-900 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                  <TrendingUp className="text-brand-blue-600 dark:text-brand-blue-400 h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground mb-1 font-semibold">
                    AI-Powered Analytics
                  </h3>
                  <p className="text-muted-foreground">
                    Get deep insights into content performance with machine
                    learning predictions
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-brand-emerald-100 dark:bg-brand-emerald-900 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                  <Zap className="text-brand-emerald-600 dark:text-brand-emerald-400 h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground mb-1 font-semibold">
                    Competitive Intelligence
                  </h3>
                  <p className="text-muted-foreground">
                    Monitor competitors and discover content opportunities in
                    real-time
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-brand-amber-100 dark:bg-brand-amber-900 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                  <Users className="text-brand-amber-600 dark:text-brand-amber-400 h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-foreground mb-1 font-semibold">
                    Team Collaboration
                  </h3>
                  <p className="text-muted-foreground">
                    Work together seamlessly with real-time collaboration tools
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            {testimonial && (
              <div
                className="glass animate-scale-in rounded-2xl p-6"
                style={{ animationDelay: "0.3s" }}
              >
                <p className="text-foreground mb-4 italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-secondary flex h-10 w-10 items-center justify-center rounded-full">
                    <span className="text-sm font-semibold text-white">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {testimonial.author}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Authentication form */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12 lg:w-1/2 xl:w-2/5">
          <div
            className="animate-fade-in-up w-full max-w-md"
            style={{ animationDelay: "0.2s" }}
          >
            {/* Mobile logo */}
            <div className="mb-8 flex items-center justify-center space-x-3 lg:hidden">
              <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-gradient-primary text-xl font-bold">
                  ContentLab Nexus
                </h1>
              </div>
            </div>

            {/* Form header */}
            <div className="mb-8 text-center">
              <h2 className="text-foreground mb-2 text-3xl font-bold">
                {title}
              </h2>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>

            {/* Authentication form */}
            <div className="glass-dark rounded-2xl p-8 shadow-2xl">
              {children}
            </div>

            {/* Trust indicators */}
            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-4 text-xs">
                Trusted by 10,000+ content creators worldwide
              </p>
              <div className="flex items-center justify-center space-x-6 opacity-60">
                <div className="text-xs font-medium">256-bit SSL</div>
                <div className="bg-muted-foreground h-1 w-1 rounded-full" />
                <div className="text-xs font-medium">SOC 2 Compliant</div>
                <div className="bg-muted-foreground h-1 w-1 rounded-full" />
                <div className="text-xs font-medium">GDPR Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
