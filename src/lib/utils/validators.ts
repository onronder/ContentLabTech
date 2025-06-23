import { z } from "zod";

// Common validation schemas
export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const urlSchema = z.string().url("Invalid URL format");
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  );

// Utility validation functions
export const validateEmail = (email: string) => emailSchema.safeParse(email);
export const validatePassword = (password: string) =>
  passwordSchema.safeParse(password);
export const validateUrl = (url: string) => urlSchema.safeParse(url);
export const validateSlug = (slug: string) => slugSchema.safeParse(slug);
