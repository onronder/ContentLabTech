"use client";

/**
 * AuthLoading Component
 * Loading state component for authentication processes
 */

import { Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface AuthLoadingProps {
  message?: string;
  className?: string;
}

export const AuthLoading = ({
  message = "Loading...",
  className = "",
}: AuthLoadingProps) => {
  return (
    <Card className={`mx-auto w-full max-w-md ${className}`}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <div className="text-center">
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
