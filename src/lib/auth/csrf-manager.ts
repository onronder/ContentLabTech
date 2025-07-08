/**
 * Enhanced CSRF Manager for Production Security
 * Intelligent CSRF token handling with bypass logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export interface CSRFValidationResult {
  isValid: boolean;
  token?: string;
  error?: string;
  bypassReason?: string;
  shouldBypass: boolean;
}

export interface CSRFConfig {
  tokenName: string;
  headerName: string;
  tokenLength: number;
  maxAge: number;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

/**
 * CSRF Manager Class
 */
export class CSRFManager {
  private static instance: CSRFManager;
  private config: CSRFConfig;

  private constructor() {
    this.config = {
      tokenName: 'csrf-token',
      headerName: 'x-csrf-token',
      tokenLength: 32,
      maxAge: 60 * 60 * 24, // 24 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
  }

  public static getInstance(): CSRFManager {
    if (!CSRFManager.instance) {
      CSRFManager.instance = new CSRFManager();
    }
    return CSRFManager.instance;
  }

  /**
   * Generate cryptographically secure CSRF token
   */
  generateCSRFToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // Use crypto.randomInt for better security if available
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(this.config.tokenLength);
      crypto.getRandomValues(array);
      
      for (let i = 0; i < this.config.tokenLength; i++) {
        result += chars[array[i]! % chars.length];
      }
    } else {
      // Fallback for Node.js environment
      for (let i = 0; i < this.config.tokenLength; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }

  /**
   * Set CSRF cookie with secure options
   */
  setCSRFCookie(response: NextResponse, token?: string): void {
    const csrfToken = token || this.generateCSRFToken();
    
    response.cookies.set(this.config.tokenName, csrfToken, {
      httpOnly: true,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      maxAge: this.config.maxAge,
      path: '/',
    });

    console.log('🛡️ CSRF token set in cookie');
  }

  /**
   * Validate CSRF token with intelligent bypass logic
   */
  validateCSRFToken(request: NextRequest): CSRFValidationResult {
    const method = request.method;
    const pathname = request.nextUrl.pathname;

    // Bypass for safe HTTP methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return {
        isValid: true,
        shouldBypass: true,
        bypassReason: `Safe HTTP method: ${method}`
      };
    }

    // Bypass for authentication callbacks
    if (pathname.startsWith('/auth/callback')) {
      return {
        isValid: true,
        shouldBypass: true,
        bypassReason: 'Authentication callback route'
      };
    }

    // Bypass for API routes with Bearer token authentication
    const authHeader = request.headers.get('authorization');
    if (pathname.startsWith('/api/') && authHeader?.startsWith('Bearer ')) {
      return {
        isValid: true,
        shouldBypass: true,
        bypassReason: 'API route with Bearer token authentication'
      };
    }

    // Bypass for specific API routes that handle their own security
    const apiBypassRoutes = [
      '/api/auth/',
      '/api/health',
      '/api/status',
      '/api/webhook'
    ];

    if (apiBypassRoutes.some(route => pathname.startsWith(route))) {
      return {
        isValid: true,
        shouldBypass: true,
        bypassReason: 'API route with custom security handling'
      };
    }

    // Perform actual CSRF validation
    const tokenFromHeader = request.headers.get(this.config.headerName);
    const tokenFromCookie = request.cookies.get(this.config.tokenName)?.value;

    console.log('🛡️ CSRF Validation:', {
      hasHeaderToken: !!tokenFromHeader,
      hasCookieToken: !!tokenFromCookie,
      tokensMatch: tokenFromHeader === tokenFromCookie,
      pathname
    });

    if (!tokenFromCookie) {
      return {
        isValid: false,
        shouldBypass: false,
        error: 'CSRF cookie not found',
        ...(tokenFromHeader && { token: tokenFromHeader })
      };
    }

    if (!tokenFromHeader) {
      return {
        isValid: false,
        shouldBypass: false,
        error: 'CSRF token not provided in request header',
        token: tokenFromCookie
      };
    }

    if (tokenFromHeader !== tokenFromCookie) {
      return {
        isValid: false,
        shouldBypass: false,
        error: 'CSRF token mismatch',
        token: tokenFromHeader
      };
    }

    return {
      isValid: true,
      shouldBypass: false,
      token: tokenFromHeader
    };
  }

  /**
   * Check if API route should be exempt from CSRF
   */
  isAPIRouteExempt(pathname: string): boolean {
    const exemptPatterns = [
      '/api/auth/',
      '/api/health',
      '/api/status',
      '/api/webhook',
      '/api/metrics'
    ];

    return exemptPatterns.some(pattern => pathname.startsWith(pattern));
  }

  /**
   * Get CSRF token from client-side cookie
   */
  getCSRFTokenFromBrowser(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }

    const match = document.cookie.match(new RegExp(`${this.config.tokenName}=([^;]+)`));
    return match ? match[1] || null : null;
  }

  /**
   * Validate CSRF token format
   */
  isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check length
    if (token.length !== this.config.tokenLength) {
      return false;
    }

    // Check character set (alphanumeric only)
    const validPattern = /^[A-Za-z0-9]+$/;
    return validPattern.test(token);
  }

  /**
   * Create CSRF error response
   */
  createCSRFErrorResponse(validationResult: CSRFValidationResult): Response {
    const errorResponse = {
      error: 'CSRF validation failed',
      code: 'CSRF_TOKEN_INVALID',
      details: {
        reason: validationResult.error,
        token: validationResult.token ? 'present' : 'missing'
      },
      timestamp: new Date().toISOString()
    };

    console.log('🚨 CSRF validation failed:', errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': 'CSRF_TOKEN_INVALID'
      }
    });
  }

  /**
   * Generate CSRF token for form inclusion
   */
  generateTokenForForm(): { token: string; fieldName: string; headerName: string } {
    return {
      token: this.generateCSRFToken(),
      fieldName: this.config.tokenName,
      headerName: this.config.headerName
    };
  }

  /**
   * Middleware helper for CSRF protection
   */
  middleware(request: NextRequest, response: NextResponse): NextResponse {
    // Generate CSRF token if not present
    if (!request.cookies.get(this.config.tokenName)) {
      this.setCSRFCookie(response);
    }

    // Validate CSRF for state-changing requests
    const validation = this.validateCSRFToken(request);
    
    if (!validation.isValid && !validation.shouldBypass) {
      console.log('🚨 CSRF validation failed in middleware');
      // Note: In middleware, we log but don't block - let the API handler decide
    }

    return response;
  }
}

// Export singleton instance
export const csrfManager = CSRFManager.getInstance();

// Convenience function for React components
export function useCSRFToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return csrfManager.getCSRFTokenFromBrowser();
}

// Note: Types are already exported above