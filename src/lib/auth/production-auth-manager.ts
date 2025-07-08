/**
 * Production-Grade Authentication Manager
 * Comprehensive authentication handling with multi-layer security
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from './session';

// Enhanced authentication interfaces
export interface AuthRequest {
  request: NextRequest;
  requireCSRF?: boolean;
  allowedMethods?: string[];
  rateLimitKey?: string;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: string | null;
  method: 'bearer' | 'session' | 'none';
  isValid: boolean;
  canRetry: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  created_at: string;
}

export interface CSRFResult {
  isValid: boolean;
  token?: string;
  error?: string;
  bypassReason?: string;
}

export interface AuthRecovery {
  canRetry: boolean;
  retryAfter?: number;
  action: 'refresh' | 'redirect' | 'manual';
  message: string;
}

// Service role client for token validation
const supabaseServiceRole = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Production Authentication Manager Class
 */
export class ProductionAuthManager {
  private static instance: ProductionAuthManager;
  
  private constructor() {}
  
  public static getInstance(): ProductionAuthManager {
    if (!ProductionAuthManager.instance) {
      ProductionAuthManager.instance = new ProductionAuthManager();
    }
    return ProductionAuthManager.instance;
  }

  /**
   * Multi-layer authentication with comprehensive fallback chain
   */
  async authenticateRequest(authRequest: AuthRequest): Promise<AuthResult> {
    const { request } = authRequest;
    
    console.log('🔐 Production Auth Manager: Starting authentication');

    try {
      // Method 1: Bearer Token Authentication (Primary)
      const bearerResult = await this.authenticateWithBearer(request);
      if (bearerResult.isValid) {
        console.log('✅ Bearer authentication successful');
        return bearerResult;
      }

      // Method 2: Session Authentication (Fallback)
      const sessionResult = await this.authenticateWithSession(request);
      if (sessionResult.isValid) {
        console.log('✅ Session authentication successful');
        return sessionResult;
      }

      // Authentication failed
      console.log('❌ All authentication methods failed');
      return {
        user: null,
        error: 'Authentication required',
        method: 'none',
        isValid: false,
        canRetry: true
      };

    } catch (error) {
      console.error('💥 Authentication error:', error);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Authentication failed',
        method: 'none',
        isValid: false,
        canRetry: false
      };
    }
  }

  /**
   * Bearer token authentication
   */
  private async authenticateWithBearer(request: NextRequest): Promise<AuthResult> {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        user: null,
        error: 'No bearer token provided',
        method: 'bearer',
        isValid: false,
        canRetry: true
      };
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🎫 Validating Bearer token...');

    try {
      const { data: { user }, error } = await supabaseServiceRole.auth.getUser(token);

      if (!error && user) {
        return {
          user: user as AuthenticatedUser,
          error: null,
          method: 'bearer',
          isValid: true,
          canRetry: false
        };
      } else {
        console.log(`❌ Bearer token invalid: ${error?.message || 'Unknown error'}`);
        return {
          user: null,
          error: error?.message || 'Invalid bearer token',
          method: 'bearer',
          isValid: false,
          canRetry: true
        };
      }
    } catch (error) {
      console.log(`💥 Bearer token error: ${error}`);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Bearer token validation failed',
        method: 'bearer',
        isValid: false,
        canRetry: true
      };
    }
  }

  /**
   * Session-based authentication
   */
  private async authenticateWithSession(request: NextRequest): Promise<AuthResult> {
    console.log('🍪 Trying session authentication...');
    
    try {
      const user = await getCurrentUser();
      
      if (user) {
        return {
          user: user as AuthenticatedUser,
          error: null,
          method: 'session',
          isValid: true,
          canRetry: false
        };
      } else {
        return {
          user: null,
          error: 'No valid session found',
          method: 'session',
          isValid: false,
          canRetry: true
        };
      }
    } catch (error) {
      console.log(`💥 Session auth error: ${error}`);
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Session authentication failed',
        method: 'session',
        isValid: false,
        canRetry: false
      };
    }
  }

  /**
   * Intelligent CSRF handling with bypass logic
   */
  async handleCSRFValidation(request: NextRequest): Promise<CSRFResult> {
    const method = request.method;
    const pathname = request.nextUrl.pathname;

    // Skip CSRF for safe methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return {
        isValid: true,
        bypassReason: 'Safe HTTP method'
      };
    }

    // Skip CSRF for auth callbacks
    if (pathname.startsWith('/auth/callback')) {
      return {
        isValid: true,
        bypassReason: 'Auth callback route'
      };
    }

    // Skip CSRF for API routes with Bearer authentication
    if (pathname.startsWith('/api/') && request.headers.get('authorization')?.startsWith('Bearer ')) {
      return {
        isValid: true,
        bypassReason: 'API route with Bearer token'
      };
    }

    // Validate CSRF token for other routes
    const tokenFromHeader = request.headers.get('x-csrf-token');
    const tokenFromCookie = request.cookies.get('csrf-token')?.value;

    if (tokenFromHeader && tokenFromCookie && tokenFromHeader === tokenFromCookie) {
      return {
        isValid: true,
        token: tokenFromHeader
      };
    }

    return {
      isValid: false,
      error: 'CSRF token validation failed',
      ...(tokenFromHeader && { token: tokenFromHeader })
    };
  }

  /**
   * Session refresh with recovery strategy
   */
  async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Attempting session refresh...');
      
      // Use the existing Supabase client to refresh session
      const { data: { session }, error } = await supabaseServiceRole.auth.refreshSession();
      
      if (error) {
        console.error('❌ Session refresh failed:', error.message);
        return {
          success: false,
          error: error.message
        };
      }

      if (session) {
        console.log('✅ Session refreshed successfully');
        return {
          success: true
        };
      }

      return {
        success: false,
        error: 'No session returned from refresh'
      };
    } catch (error) {
      console.error('💥 Session refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown refresh error'
      };
    }
  }

  /**
   * Error recovery strategies
   */
  async handleAuthError(error: unknown): Promise<AuthRecovery> {
    console.log('🔧 Handling authentication error:', error);

    if (error instanceof Error) {
      // Session expired - can refresh
      if (error.message.includes('expired') || error.message.includes('invalid_token')) {
        const refreshResult = await this.refreshSession();
        
        if (refreshResult.success) {
          return {
            canRetry: true,
            action: 'refresh',
            message: 'Session refreshed successfully. Please try again.'
          };
        } else {
          return {
            canRetry: false,
            action: 'redirect',
            message: 'Session expired. Please log in again.'
          };
        }
      }

      // Network error - can retry
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return {
          canRetry: true,
          retryAfter: 2000,
          action: 'refresh',
          message: 'Network error. Retrying automatically...'
        };
      }

      // Permission error - manual intervention needed
      if (error.message.includes('permission') || error.message.includes('forbidden')) {
        return {
          canRetry: false,
          action: 'manual',
          message: 'Insufficient permissions. Please contact your administrator.'
        };
      }
    }

    // Default recovery
    return {
      canRetry: true,
      retryAfter: 3000,
      action: 'refresh',
      message: 'Authentication error. Please try again.'
    };
  }

  /**
   * Validate current session status
   */
  async validateSession(): Promise<{ isValid: boolean; user?: AuthenticatedUser; error?: string }> {
    try {
      const user = await getCurrentUser();
      
      if (user) {
        return {
          isValid: true,
          user: user as AuthenticatedUser
        };
      } else {
        return {
          isValid: false,
          error: 'No valid session found'
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Session validation failed'
      };
    }
  }
}

// Export singleton instance
export const productionAuthManager = ProductionAuthManager.getInstance();

// Note: Types are already exported above