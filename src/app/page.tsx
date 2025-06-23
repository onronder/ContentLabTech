/**
 * Home Page
 * Landing page that redirects authenticated users to dashboard
 */

import Link from "next/link";
import { ArrowRight, BarChart3, Users, Target, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="from-background to-muted/50 min-h-screen bg-gradient-to-br">
      {/* Navigation */}
      <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <span className="text-primary-foreground text-sm font-bold">
                  CN
                </span>
              </div>
              <span className="text-xl font-semibold">ContentLab Nexus</span>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Optimize Your{" "}
              <span className="text-primary">Content Marketing</span> Strategy
            </h1>
            <p className="text-muted-foreground mx-auto max-w-3xl text-xl">
              Analyze content performance, track competitors, discover keyword
              opportunities, and optimize your content strategy with powerful
              analytics and insights.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 text-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8 text-lg">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <BarChart3 className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold">Content Analytics</h3>
            <p className="text-muted-foreground">
              Track performance metrics, engagement rates, and ROI across all
              your content.
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <Target className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold">Competitor Analysis</h3>
            <p className="text-muted-foreground">
              Monitor competitor strategies and identify opportunities in your
              market.
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <Zap className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold">SEO Optimization</h3>
            <p className="text-muted-foreground">
              Discover keyword opportunities and optimize content for search
              engines.
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl">
              <Users className="text-primary h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Work together with role-based access and real-time collaboration
              tools.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 space-y-8 text-center">
          <div className="bg-card rounded-2xl border p-12">
            <h2 className="mb-4 text-3xl font-bold">
              Ready to Transform Your Content Strategy?
            </h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-xl">
              Join thousands of marketers who use ContentLab Nexus to create
              data-driven content that drives results.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="px-8 text-lg">
                Get Started for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="mb-4 flex items-center space-x-2 md:mb-0">
              <div className="bg-primary flex h-6 w-6 items-center justify-center rounded">
                <span className="text-primary-foreground text-xs font-bold">
                  CN
                </span>
              </div>
              <span className="font-semibold">ContentLab Nexus</span>
            </div>

            <div className="text-muted-foreground flex space-x-6 text-sm">
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-foreground">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
