"use client";

/**
 * Email Confirmation Success Page
 * Professional welcome experience after successful email verification
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ArrowRight,
  Sparkles,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

import { useSupabaseAuth } from "@/hooks/auth/use-supabase-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default function EmailConfirmedPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSupabaseAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const userName =
    user?.user_metadata?.["full_name"] || user?.email?.split("@")[0] || "there";

  const handleContinueToDashboard = useCallback(() => {
    setIsRedirecting(true);

    // Track dashboard navigation
    if (
      typeof window !== "undefined" &&
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    ) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        "event",
        "dashboard_navigation",
        {
          event_category: "user_flow",
          event_label: "from_email_confirmation",
        }
      );
    }

    // Determine redirect destination based on user status
    if (isAuthenticated && user) {
      // Check if onboarding is complete
      const onboardingComplete = user.user_metadata?.["onboarding_completed"];

      if (onboardingComplete) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } else {
      // Fallback to sign in if no user session
      router.push("/auth/signin?message=session_expired");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    // Track successful confirmation
    if (
      typeof window !== "undefined" &&
      (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
    ) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        "event",
        "email_confirmed_page_view",
        {
          event_category: "authentication",
          event_label: "success_page",
        }
      );
    }

    // Auto-redirect after 10 seconds
    const timer = setTimeout(() => {
      handleContinueToDashboard();
    }, 10000);

    return () => clearTimeout(timer);
  }, [handleContinueToDashboard]);

  const features = [
    {
      icon: <BarChart3 className="h-5 w-5 text-blue-500" />,
      title: "Analytics Dashboard",
      description: "Track your content performance with detailed analytics",
    },
    {
      icon: <Users className="h-5 w-5 text-green-500" />,
      title: "Team Collaboration",
      description: "Invite team members and collaborate on projects",
    },
    {
      icon: <Settings className="h-5 w-5 text-purple-500" />,
      title: "Advanced Settings",
      description: "Customize your workspace and preferences",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
      <Card className="mx-auto w-full max-w-2xl border-0 bg-white/80 shadow-xl backdrop-blur-sm">
        <CardHeader className="pb-6 text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="relative">
              <CheckCircle className="h-20 w-20 text-green-500" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 animate-pulse text-yellow-400" />
            </div>
          </div>

          <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
            Welcome to ContentLab Nexus!
          </CardTitle>

          <CardDescription className="mt-2 text-lg text-gray-600">
            Hello {userName}! Your email has been successfully verified.
          </CardDescription>

          <div className="mt-4 flex justify-center">
            <Badge
              variant="secondary"
              className="border-green-200 bg-green-100 text-green-800"
            >
              ✓ Account Activated
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Account Status */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <h3 className="mb-2 font-semibold text-green-800">
              🎉 Your account is now active!
            </h3>
            <p className="text-sm text-green-700">
              You can now access all features of ContentLab Nexus and start
              building amazing content experiences.
            </p>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="mb-4 text-center font-semibold text-gray-900">
              What&apos;s next? Here&apos;s what you can do:
            </h3>

            <div className="grid gap-4 md:grid-cols-1">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                >
                  <div className="mt-1 flex-shrink-0">{feature.icon}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {feature.title}
                    </h4>
                    <p className="mt-1 text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <Button
              onClick={handleContinueToDashboard}
              disabled={isRedirecting}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700"
            >
              {isRedirecting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Taking you to your dashboard...
                </>
              ) : (
                <>
                  Continue to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">
              You&apos;ll be automatically redirected in a few seconds
            </p>
          </div>

          {/* Getting Started Tips */}
          <div className="border-t border-gray-200 pt-6">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 flex items-center font-medium text-blue-900">
                <Sparkles className="mr-2 h-4 w-4 text-blue-500" />
                Pro Tip
              </h4>
              <p className="text-sm text-blue-800">
                Complete your onboarding to unlock personalized recommendations
                and get the most out of ContentLab Nexus.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
            <p>
              Need help getting started? Contact our support team at{" "}
              <a
                href={`mailto:${process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] || "info@contentlabtech.com"}`}
                className="text-blue-600 hover:underline"
              >
                {process.env["NEXT_PUBLIC_SUPPORT_EMAIL"] ||
                  "info@contentlabtech.com"}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
