/**
 * Enhanced Security Headers
 * Comprehensive security headers to eliminate browser warnings
 */

import { NextResponse } from "next/server";

interface SecurityConfig {
  environment: "development" | "production";
  domain?: string;
  enableHSTS?: boolean;
  enableCSP?: boolean;
  enablePermissionsPolicy?: boolean;
}

const DEFAULT_CONFIG: SecurityConfig = {
  environment:
    process.env.NODE_ENV === "production" ? "production" : "development",
  enableHSTS: true,
  enableCSP: true,
  enablePermissionsPolicy: true,
};

export class EnhancedSecurityHeaders {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get Content Security Policy directive
   */
  private getCSPDirective(): string {
    const directives = [
      "default-src 'self'",

      // Scripts: Allow self, inline scripts for React, and Vercel analytics
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",

      // Styles: Allow self, inline styles, and Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Fonts: Allow self and Google Fonts
      "font-src 'self' https://fonts.gstatic.com data:",

      // Images: Allow self, data URLs, HTTPS, and blob for uploads
      "img-src 'self' data: https: blob:",

      // Connect: Allow self and Supabase endpoints
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.supabase.io",

      // Frames: Allow self for embedded content
      "frame-src 'self'",

      // Objects: Block all object/embed/applet
      "object-src 'none'",

      // Base URI: Restrict to self
      "base-uri 'self'",

      // Form actions: Allow self only
      "form-action 'self'",

      // Frame ancestors: Prevent clickjacking
      "frame-ancestors 'none'",

      // Worker source: Allow self and blob for service workers
      "worker-src 'self' blob:",

      // Media source: Allow self
      "media-src 'self'",
    ];

    if (this.config.environment === "production") {
      directives.push("upgrade-insecure-requests");
    }

    return directives.join("; ");
  }

  /**
   * Get Permissions Policy directive
   */
  private getPermissionsPolicyDirective(): string {
    const policies = [
      // Explicitly deny all sensitive permissions
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "battery=()",
      "camera=()",
      "cross-origin-isolated=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=()",
      "execution-while-not-rendered=()",
      "execution-while-out-of-viewport=()",
      "fullscreen=()",
      "geolocation=()",
      "gyroscope=()",
      "keyboard-map=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "navigation-override=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "web-share=()",
      "xr-spatial-tracking=()",

      // Disable interest-cohort for privacy
      "interest-cohort=()",
    ];

    return policies.join(", ");
  }

  /**
   * Get HSTS header value
   */
  private getHSTSDirective(): string {
    return "max-age=31536000; includeSubDomains; preload";
  }

  /**
   * Apply all security headers to a response
   */
  public applyHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    if (this.config.enableCSP) {
      response.headers.set("Content-Security-Policy", this.getCSPDirective());
    }

    // XSS Protection
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Content Type Options
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Frame Options
    response.headers.set("X-Frame-Options", "DENY");

    // Referrer Policy
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      response.headers.set(
        "Permissions-Policy",
        this.getPermissionsPolicyDirective()
      );
    }

    // HSTS (HTTPS only)
    if (this.config.environment === "production" && this.config.enableHSTS) {
      response.headers.set(
        "Strict-Transport-Security",
        this.getHSTSDirective()
      );
    }

    // Cross-Origin policies
    response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

    // Additional security headers
    response.headers.set("X-DNS-Prefetch-Control", "off");
    response.headers.set("X-Download-Options", "noopen");
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

    // Cache control for security-sensitive responses
    if (response.headers.get("Cache-Control") === null) {
      response.headers.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate"
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }

    return response;
  }

  /**
   * Create security headers for API responses
   */
  public getAPIHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (this.config.enablePermissionsPolicy) {
      headers["Permissions-Policy"] = this.getPermissionsPolicyDirective();
    }

    if (this.config.environment === "production" && this.config.enableHSTS) {
      headers["Strict-Transport-Security"] = this.getHSTSDirective();
    }

    return headers;
  }

  /**
   * Validate security headers on a response
   */
  public validateHeaders(response: Response): {
    isValid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    const requiredHeaders = [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "X-XSS-Protection",
      "Referrer-Policy",
    ];

    for (const header of requiredHeaders) {
      if (!response.headers.get(header)) {
        missing.push(header);
      }
    }

    // Check CSP
    if (
      this.config.enableCSP &&
      !response.headers.get("Content-Security-Policy")
    ) {
      missing.push("Content-Security-Policy");
    }

    // Check Permissions Policy
    if (
      this.config.enablePermissionsPolicy &&
      !response.headers.get("Permissions-Policy")
    ) {
      missing.push("Permissions-Policy");
    }

    // Check HSTS in production
    if (
      this.config.environment === "production" &&
      this.config.enableHSTS &&
      !response.headers.get("Strict-Transport-Security")
    ) {
      warnings.push("Strict-Transport-Security recommended for production");
    }

    return {
      isValid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Generate nonce for inline scripts/styles
   */
  public generateNonce(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";

    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);

      for (let i = 0; i < 16; i++) {
        nonce += chars[array[i]! % chars.length];
      }
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < 16; i++) {
        nonce += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    return nonce;
  }

  /**
   * Update CSP with nonce for specific response
   */
  public addNonceToCSP(response: NextResponse, nonce: string): NextResponse {
    if (!this.config.enableCSP) {
      return response;
    }

    const currentCSP = response.headers.get("Content-Security-Policy");
    if (!currentCSP) {
      return response;
    }

    // Add nonce to script-src and style-src
    const updatedCSP = currentCSP
      .replace("script-src", `script-src 'nonce-${nonce}'`)
      .replace("style-src", `style-src 'nonce-${nonce}'`);

    response.headers.set("Content-Security-Policy", updatedCSP);
    return response;
  }
}

// Export singleton instance
export const enhancedSecurity = new EnhancedSecurityHeaders();

// Convenience function for middleware
export function applySecurityHeaders(response: NextResponse): NextResponse {
  return enhancedSecurity.applyHeaders(response);
}

// Convenience function for API routes
export function getSecurityHeaders(): Record<string, string> {
  return enhancedSecurity.getAPIHeaders();
}
