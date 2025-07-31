/**
 * Comprehensive Security Headers
 * Production-grade security headers with CSP, COEP, COOP, and more
 */

import { NextResponse } from "next/server";
import { webcrypto } from "crypto";

export interface SecurityHeadersConfig {
  enableCSP: boolean;
  enableCOOP: boolean;
  enableCOEP: boolean;
  enableHSTS: boolean;
  reportingEndpoint?: string;
  allowedOrigins: string[];
  allowedFrameOrigins: string[];
  developmentMode: boolean;
}

export interface CSPDirectives {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  childSrc: string[];
  workerSrc: string[];
  manifestSrc: string[];
  formAction: string[];
  frameAncestors: string[];
  baseUri: string[];
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
}

export class SecurityHeaders {
  private config: SecurityHeadersConfig;
  private nonce?: string;

  constructor(config: Partial<SecurityHeadersConfig> = {}) {
    this.config = {
      enableCSP: true,
      enableCOOP: true,
      enableCOEP: true,
      enableHSTS: true,
      allowedOrigins: ["self"],
      allowedFrameOrigins: ["none"],
      developmentMode: process.env.NODE_ENV !== "production",
      ...config,
    };
  }

  /**
   * Generate cryptographically secure nonce for CSP
   */
  async generateNonce(): Promise<string> {
    try {
      const array = new Uint8Array(16);
      webcrypto.getRandomValues(array);
      this.nonce = Buffer.from(array).toString("base64");
      return this.nonce;
    } catch (error) {
      console.error("Nonce generation error:", error);
      // Fallback nonce
      this.nonce = Buffer.from(
        Date.now().toString() + Math.random().toString()
      ).toString("base64");
      return this.nonce;
    }
  }

  /**
   * Get current nonce
   */
  getNonce(): string | undefined {
    return this.nonce;
  }

  /**
   * Build Content Security Policy header
   */
  private buildCSP(): string {
    const nonce = this.nonce;

    const directives: CSPDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        ...(nonce ? [`'nonce-${nonce}'`] : []),
        "'strict-dynamic'",
        ...(this.config.developmentMode
          ? ["'unsafe-eval'", "'unsafe-inline'"]
          : []),
        "https://va.vercel-scripts.com",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
      ],
      styleSrc: [
        "'self'",
        ...(nonce ? [`'nonce-${nonce}'`] : []),
        "'unsafe-inline'", // Required for many CSS frameworks
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://*.supabase.co",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com",
      ],
      connectSrc: [
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://www.google-analytics.com",
        "https://api.openai.com",
        ...(this.config.developmentMode
          ? ["ws://localhost:*", "http://localhost:*"]
          : []),
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdn.jsdelivr.net",
        "data:",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameSrc: this.config.allowedFrameOrigins.includes("none")
        ? ["'none'"]
        : this.config.allowedFrameOrigins,
      childSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: this.config.allowedFrameOrigins.includes("none")
        ? ["'none'"]
        : this.config.allowedFrameOrigins,
      baseUri: ["'self'"],
      upgradeInsecureRequests: !this.config.developmentMode,
      blockAllMixedContent: !this.config.developmentMode,
    };

    const cspParts: string[] = [];

    // Add each directive
    Object.entries(directives).forEach(([directive, values]) => {
      if (typeof values === "boolean") {
        if (values) {
          cspParts.push(this.camelToKebab(directive));
        }
      } else if (Array.isArray(values) && values.length > 0) {
        cspParts.push(`${this.camelToKebab(directive)} ${values.join(" ")}`);
      }
    });

    // Add reporting if configured
    if (this.config.reportingEndpoint) {
      cspParts.push(`report-uri ${this.config.reportingEndpoint}/csp-report`);
      cspParts.push(`report-to csp-endpoint`);
    }

    return cspParts.join("; ");
  }

  /**
   * Apply all security headers to response
   */
  async applyHeaders(
    response: NextResponse,
    requestId?: string
  ): Promise<NextResponse> {
    // Generate nonce for this request
    await this.generateNonce();

    // Basic security headers
    this.setBasicSecurityHeaders(response);

    // Content Security Policy
    if (this.config.enableCSP) {
      response.headers.set("Content-Security-Policy", this.buildCSP());
    }

    // Cross-Origin Policies
    if (this.config.enableCOOP) {
      response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    }

    if (this.config.enableCOEP) {
      response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }

    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

    // HSTS (HTTP Strict Transport Security)
    if (this.config.enableHSTS && !this.config.developmentMode) {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }

    // Additional security headers
    this.setAdditionalSecurityHeaders(response);

    // Request tracking
    if (requestId) {
      response.headers.set("X-Request-ID", requestId);
    }

    // Reporting configuration
    if (this.config.reportingEndpoint) {
      this.setReportingHeaders(response);
    }

    return response;
  }

  /**
   * Set basic security headers
   */
  private setBasicSecurityHeaders(response: NextResponse): void {
    // XSS Protection
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Content Type Options
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Frame Options
    const framePolicy = this.config.allowedFrameOrigins.includes("none")
      ? "DENY"
      : "SAMEORIGIN";
    response.headers.set("X-Frame-Options", framePolicy);

    // Referrer Policy
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // DNS Prefetch Control
    response.headers.set("X-DNS-Prefetch-Control", "off");

    // Permitted Cross Domain Policies
    response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

    // Remove server information
    response.headers.set("Server", "");
    response.headers.delete("X-Powered-By");
  }

  /**
   * Set additional modern security headers
   */
  private setAdditionalSecurityHeaders(response: NextResponse): void {
    // Origin Agent Cluster
    response.headers.set("Origin-Agent-Cluster", "?1");

    // Expect-CT (Certificate Transparency)
    if (!this.config.developmentMode && this.config.reportingEndpoint) {
      response.headers.set(
        "Expect-CT",
        `max-age=86400, enforce, report-uri="${this.config.reportingEndpoint}/ct-report"`
      );
    }

    // Permissions Policy (formerly Feature Policy)
    const permissionsPolicy = [
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
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "keyboard-map=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "navigation-override=()",
      "payment=()",
      "picture-in-picture=(self)",
      "publickey-credentials-get=()",
      "screen-wake-lock=(self)",
      "sync-xhr=()",
      "usb=()",
      "web-share=(self)",
      "xr-spatial-tracking=()",
      "interest-cohort=()",
    ].join(", ");

    response.headers.set("Permissions-Policy", permissionsPolicy);

    // Clear-Site-Data (for logout scenarios - can be set conditionally)
    // response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');
  }

  /**
   * Set reporting headers
   */
  private setReportingHeaders(response: NextResponse): void {
    if (!this.config.reportingEndpoint) return;

    const reportingEndpoints = {
      group: "csp-endpoint",
      max_age: 86400,
      endpoints: [{ url: `${this.config.reportingEndpoint}/csp-report` }],
    };

    response.headers.set("Report-To", JSON.stringify(reportingEndpoints));

    // Network Error Logging
    const nel = {
      report_to: "csp-endpoint",
      max_age: 86400,
      include_subdomains: true,
    };

    response.headers.set("NEL", JSON.stringify(nel));
  }

  /**
   * Convert camelCase to kebab-case
   */
  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    try {
      const array = new Uint8Array(8);
      webcrypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join(
        ""
      );
    } catch {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Clear site data (for logout)
   */
  clearSiteData(response: NextResponse): void {
    response.headers.set(
      "Clear-Site-Data",
      '"cache", "cookies", "storage", "executionContexts"'
    );
  }

  /**
   * Set security headers for API responses
   */
  setAPISecurityHeaders(response: NextResponse): void {
    // Minimal security headers for API responses
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    // Remove server info
    response.headers.set("Server", "");
    response.headers.delete("X-Powered-By");
  }

  /**
   * Update CSP for specific page requirements
   */
  updateCSPForPage(additionalDirectives: Partial<CSPDirectives>): void {
    // This would be called from page components that need specific CSP rules
    // Implementation would merge with existing directives
  }
}

// Export singleton with default configuration
export const securityHeaders = new SecurityHeaders();

// Export factory for custom configurations
export const createSecurityHeaders = (config: Partial<SecurityHeadersConfig>) =>
  new SecurityHeaders(config);
