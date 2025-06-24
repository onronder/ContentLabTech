/**
 * Email Templates Export
 * Central exports for all React Email templates
 */

export { default as EmailLayout } from "./components/EmailLayout";
export { default as VerificationEmail } from "./VerificationEmail";
export { default as WelcomeEmail } from "./WelcomeEmail";
export { default as PasswordResetEmail } from "./PasswordResetEmail";

export type { EmailLayoutProps } from "./components/EmailLayout";
export type { VerificationEmailProps } from "./VerificationEmail";
export type { WelcomeEmailProps } from "./WelcomeEmail";
export type { PasswordResetEmailProps } from "./PasswordResetEmail";
