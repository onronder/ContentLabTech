/**
 * Enhanced CSRF Protection with Token Rotation
 * Production-grade CSRF protection with cryptographically secure tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { webcrypto } from "crypto";

export interface CSRFValidationResult {
  valid: boolean;
  newToken?: string;
  reason?: string;
}

export interface CSRFConfig {
  tokenLength: number;
  tokenLifetime: number;
  rotateOnUse: boolean;
  doubleSubmitCookie: boolean;
  sameSiteStrict: boolean;
  secureInProduction: boolean;
}

export class CSRFProtection {
  private static readonly DEFAULT_CONFIG: CSRFConfig = {
    tokenLength: 32,
    tokenLifetime: 24 * 60 * 60 * 1000, // 24 hours
    rotateOnUse: true,
    doubleSubmitCookie: true,
    sameSiteStrict: true,
    secureInProduction: true,
  };

  private config: CSRFConfig;

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...CSRFProtection.DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate cryptographically secure CSRF token
   */
  async generateToken(): Promise<string> {
    try {
      // Use Web Crypto API for cryptographically secure random values
      const array = new Uint8Array(this.config.tokenLength);
      webcrypto.getRandomValues(array);

      // Convert to base64url (URL-safe base64)
      return this.arrayBufferToBase64Url(array.buffer);
    } catch (error) {
      console.error("CSRF token generation error:", error);
      // Fallback to less secure but compatible method
      return this.generateFallbackToken();
    }
  }

  /**
   * Validate CSRF token from request
   */
  async validateToken(
    request: NextRequest,
    response?: NextResponse
  ): Promise<CSRFValidationResult> {
    const method = request.method.toUpperCase();
    const pathname = request.nextUrl.pathname;

    // Skip validation for safe methods
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return { valid: true };
    }

    // Skip validation for API auth callbacks
    if (
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/api/auth/")
    ) {
      return { valid: true };
    }

    // Skip validation for API routes that use other authentication
    if (pathname.startsWith("/api/") && this.isApiRouteWithAuth(pathname)) {
      return { valid: true };
    }

    // Get tokens from request
    const tokenFromHeader = this.extractTokenFromHeader(request);
    const tokenFromCookie = this.extractTokenFromCookie(request);

    // Validate double-submit cookie pattern
    if (this.config.doubleSubmitCookie) {
      if (!tokenFromHeader || !tokenFromCookie) {
        return {
          valid: false,
          reason: "Missing CSRF token in header or cookie",
        };
      }

      if (!this.constantTimeCompare(tokenFromHeader, tokenFromCookie)) {
        return {
          valid: false,
          reason: "CSRF token mismatch between header and cookie",
        };
      }
    }

    // Check if token exists and is valid format
    const token = tokenFromHeader || tokenFromCookie;
    if (!token) {
      return {
        valid: false,
        reason: "No CSRF token provided",
      };
    }

    if (!this.isValidTokenFormat(token)) {
      return {
        valid: false,
        reason: "Invalid CSRF token format",
      };
    }

    // Generate new token for rotation if enabled
    let newToken: string | undefined;
    if (this.config.rotateOnUse && response) {
      newToken = await this.generateToken();
      this.setTokenCookie(response, newToken);
    }

    return {
      valid: true,
      newToken,
    };
  }

  /**
   * Set CSRF token in response cookies
   */
  setTokenCookie(response: NextResponse, token: string): void {
    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set("csrf-token", token, {
      httpOnly: true,
      secure: this.config.secureInProduction && isProduction,
      sameSite: this.config.sameSiteStrict ? "strict" : "lax",
      maxAge: this.config.tokenLifetime / 1000,
      path: "/",
    });

    // Set additional header for client-side access if needed
    response.headers.set("X-CSRF-Token", token);
  }

  /**
   * Initialize CSRF protection for new sessions
   */
  async initializeProtection(response: NextResponse): Promise<string> {
    const token = await this.generateToken();
    this.setTokenCookie(response, token);
    return token;
  }

  /**
   * Extract token from various header formats
   */
  private extractTokenFromHeader(request: NextRequest): string | null {
    // Try different header names
    const headerNames = [
      "x-csrf-token",
      "x-xsrf-token",
      "csrf-token",
      "xsrf-token",
    ];

    for (const headerName of headerNames) {
      const token = request.headers.get(headerName);
      if (token) return token;
    }

    // Try Authorization header with Bearer prefix
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (this.isValidTokenFormat(token)) {
        return token;
      }
    }

    return null;
  }

  /**
   * Extract token from cookies
   */
  private extractTokenFromCookie(request: NextRequest): string | null {
    return request.cookies.get("csrf-token")?.value || null;
  }

  /**
   * Check if API route uses other authentication methods
   */
  private isApiRouteWithAuth(pathname: string): boolean {
    const authenticatedRoutes = [
      "/api/auth/",
      "/api/health",
      "/api/metrics",
      "/api/webhooks/",
    ];

    return authenticatedRoutes.some(route => pathname.startsWith(route));
  }

  /**
   * Validate token format
   */
  private isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== "string") return false;

    // Check length (base64url encoded tokens should be predictable length)
    const expectedLength = Math.ceil((this.config.tokenLength * 4) / 3);
    if (
      token.length < expectedLength - 2 ||
      token.length > expectedLength + 2
    ) {
      return false;
    }

    // Check for base64url characters only
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    return base64UrlPattern.test(token);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Convert ArrayBuffer to base64url string
   */
  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let i = 0; i < (bytes?.byteLength || 0); i++) {
      binary += String.fromCharCode(bytes[i]!);
    }

    // Convert to base64 and make URL-safe
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * Fallback token generation for environments without webcrypto
   */
  private generateFallbackToken(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let result = "";

    for (let i = 0; i < this.config.tokenLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Clear CSRF token (for logout scenarios)
   */
  clearToken(response: NextResponse): void {
    response.cookies.set("csrf-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });

    response.headers.delete("X-CSRF-Token");
  }

  /**
   * Get token for client-side use (if needed)
   */
  getTokenForClient(request: NextRequest): string | null {
    return this.extractTokenFromCookie(request);
  }

  /**
   * Validate token from form data
   */
  async validateFormToken(
    request: NextRequest,
    formData: FormData
  ): Promise<CSRFValidationResult> {
    const tokenFromForm = formData.get("csrf_token")?.toString();
    const tokenFromCookie = this.extractTokenFromCookie(request);

    if (!tokenFromForm || !tokenFromCookie) {
      return {
        valid: false,
        reason: "Missing CSRF token in form or cookie",
      };
    }

    if (!this.constantTimeCompare(tokenFromForm, tokenFromCookie)) {
      return {
        valid: false,
        reason: "CSRF token mismatch between form and cookie",
      };
    }

    return { valid: true };
  }

  /**
   * Check if request needs CSRF protection
   */
  needsProtection(request: NextRequest): boolean {
    const method = request.method.toUpperCase();
    const pathname = request.nextUrl.pathname;

    // Safe methods don't need protection
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return false;
    }

    // Skip for auth callbacks
    if (
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/api/auth/")
    ) {
      return false;
    }

    // Skip for API routes with other auth
    if (pathname.startsWith("/api/") && this.isApiRouteWithAuth(pathname)) {
      return false;
    }

    return true;
  }
}

// Export singleton instance with default configuration
export const csrfProtection = new CSRFProtection();

// Export factory function for custom configurations
export const createCSRFProtection = (config: Partial<CSRFConfig>) =>
  new CSRFProtection(config);
