"use client";

/**
 * ProfileForm Component
 * User profile management form
 */

import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";

import { useUserProfile } from "@/hooks/auth/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ProfileForm = () => {
  const {
    profile,
    loading,
    error,
    updateProfile,
    uploadAvatar,
    displayName,
    hasAvatar,
    clearError,
  } = useUserProfile();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    const trimmedName = formData.full_name.trim();
    const { success, error: updateError } = await updateProfile({
      ...(trimmedName && { full_name: trimmedName }),
    });

    if (updateError) {
      // Error is handled by the hook
    } else if (success) {
      // Success - profile updated
    }

    setIsUpdating(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    clearError();

    const { avatarUrl, error: uploadError } = await uploadAvatar(file);

    if (uploadError) {
      // Error is handled by the hook
    } else if (avatarUrl) {
      // Success - avatar uploaded
    }

    setUploadingAvatar(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError();
  };

  const getUserInitials = () => {
    return displayName
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 animate-pulse rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Manage your personal information and profile picture
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {hasAvatar ? (
                  <AvatarImage src={profile?.avatar_url} alt={displayName} />
                ) : (
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                )}
              </Avatar>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute -right-2 -bottom-2 h-8 w-8 rounded-full p-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium">{displayName}</h3>
              <p className="text-muted-foreground text-sm">{profile?.email}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Click the camera icon to upload a new profile picture
              </p>
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={e => handleInputChange("full_name", e.target.value)}
                placeholder="Enter your full name"
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-muted-foreground text-xs">
                Email cannot be changed here. Contact support if you need to
                update your email.
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isUpdating || uploadingAvatar}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
