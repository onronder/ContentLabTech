"use client";

/**
 * Onboarding Page
 * First-time user setup and team creation
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Users, Target, Rocket } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { CreateTeamDialog } from "@/components/team";
import { useUserProfile } from "@/hooks/auth/use-user-profile";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, isOnboardingCompleted } = useUserProfile();

  const [currentStep, setCurrentStep] = useState(1);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [teamCreated, setTeamCreated] = useState(false);

  const steps = [
    {
      id: 1,
      title: "Welcome to ContentLab Nexus",
      description: "Your all-in-one content marketing analytics platform",
      icon: <Rocket className="text-primary h-8 w-8" />,
    },
    {
      id: 2,
      title: "Create Your Team",
      description:
        "Set up your team to start collaborating on content projects",
      icon: <Users className="text-primary h-8 w-8" />,
    },
    {
      id: 3,
      title: "Ready to Go!",
      description: "You're all set to start optimizing your content strategy",
      icon: <Target className="text-primary h-8 w-8" />,
    },
  ];

  const handleCreateTeamSuccess = () => {
    setTeamCreated(true);
    setCreateTeamOpen(false);
    setCurrentStep(3);
  };

  const handleFinishOnboarding = async () => {
    await completeOnboarding();
    router.push("/dashboard");
  };

  const handleSkipOnboarding = async () => {
    await completeOnboarding();
    router.push("/dashboard");
  };

  // If user has already completed onboarding, redirect to dashboard
  if (isOnboardingCompleted) {
    router.push("/dashboard");
    return null;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm">{step.id}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`ml-2 h-px w-12 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              {steps[currentStep - 1]?.icon}
            </div>
            <CardTitle className="text-2xl">
              {steps[currentStep - 1]?.title}
            </CardTitle>
            <CardDescription className="text-lg">
              {steps[currentStep - 1]?.description}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-6">
                    ContentLab Nexus helps you analyze content performance,
                    track competitors, discover keyword opportunities, and
                    optimize your content marketing strategy.
                  </p>

                  <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="bg-primary/10 mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg">
                        <span className="text-2xl">📊</span>
                      </div>
                      <h3 className="mb-1 font-semibold">Analytics</h3>
                      <p className="text-muted-foreground text-sm">
                        Track content performance
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="bg-primary/10 mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg">
                        <span className="text-2xl">🔍</span>
                      </div>
                      <h3 className="mb-1 font-semibold">Research</h3>
                      <p className="text-muted-foreground text-sm">
                        Discover opportunities
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="bg-primary/10 mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <h3 className="mb-1 font-semibold">Optimization</h3>
                      <p className="text-muted-foreground text-sm">
                        Improve your strategy
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button onClick={() => setCurrentStep(2)}>Get Started</Button>
                  <Button variant="outline" onClick={handleSkipOnboarding}>
                    Skip Setup
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 text-center">
                <p className="text-muted-foreground">
                  Teams help you collaborate with colleagues and organize your
                  content projects. You can invite members, assign roles, and
                  manage permissions.
                </p>

                <div className="space-y-4">
                  <Button
                    onClick={() => setCreateTeamOpen(true)}
                    size="lg"
                    className="w-full"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Create Your Team
                  </Button>

                  <div className="flex justify-center space-x-4">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      Back
                    </Button>
                    <Button variant="outline" onClick={handleSkipOnboarding}>
                      Skip for Now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="mb-4 text-green-600">
                  <CheckCircle className="mx-auto h-16 w-16" />
                </div>

                <p className="text-muted-foreground">
                  {teamCreated
                    ? "Great! Your team has been created and you're ready to start building amazing content."
                    : "You're all set to start using ContentLab Nexus!"}
                </p>

                <div className="space-y-4">
                  <Button
                    onClick={handleFinishOnboarding}
                    size="lg"
                    className="w-full"
                  >
                    <Target className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <CreateTeamDialog
          open={createTeamOpen}
          onOpenChange={setCreateTeamOpen}
          onSuccess={handleCreateTeamSuccess}
        />
      </div>
    </AppLayout>
  );
}
