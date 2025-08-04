/**
 * Enterprise-Grade Server-side Supabase Client for Authentication
 * Enhanced with connection pooling, caching, and comprehensive error handling
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type Database } from "@/types/database";
import { enterpriseLogger } from "@/lib/monitoring/enterprise-logger";
import { validateInput } from "@/lib/security/validation";

// Connection pool and caching for optimized performance
const clientPool = new Map<
  string,
  { client: any; createdAt: number; lastUsed: number }
>();
const POOL_MAX_SIZE = 10;
const POOL_TTL = 5 * 60 * 1000; // 5 minutes
const CLIENT_REUSE_TTL = 2 * 60 * 1000; // 2 minutes

// Environment validation cache
let envValidationCache: { isValid: boolean; timestamp: number } | null = null;
const ENV_VALIDATION_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired clients from the pool
 */
function cleanupClientPool() {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [key, pooledClient] of clientPool.entries()) {
    if (
      now - pooledClient.createdAt > POOL_TTL ||
      now - pooledClient.lastUsed > CLIENT_REUSE_TTL
    ) {
      toDelete.push(key);
    }
  }

  for (const key of toDelete) {
    clientPool.delete(key);
  }

  if (toDelete.length > 0) {
    enterpriseLogger.debug("Cleaned up expired Supabase clients", {
      removedCount: toDelete.length,
      remainingCount: clientPool.size,
    });
  }
}

/**
 * Validate environment variables with caching
 */
function validateEnvironment(): { isValid: boolean; error?: string } {
  const now = Date.now();

  // Use cached result if still valid
  if (
    envValidationCache &&
    now - envValidationCache.timestamp < ENV_VALIDATION_TTL
  ) {
    return { isValid: envValidationCache.isValid };
  }

  const requiredEnvVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key);

  const isValid = missingVars.length === 0;
  envValidationCache = { isValid, timestamp: now };

  if (!isValid) {
    const error = `Missing required environment variables: ${missingVars.join(", ")}`;
    enterpriseLogger.error("Environment validation failed", {
      missingVars,
      error,
    });
    return { isValid: false, error };
  }

  return { isValid: true };
}

export async function createClient(requestId?: string) {
  const startTime = Date.now();

  try {
    // Validate environment first
    const envValidation = validateEnvironment();
    if (!envValidation.isValid) {
      throw new Error(envValidation.error || "Environment validation failed");
    }

    // Clean up expired clients
    cleanupClientPool();

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      c =>
        c.name.includes("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token")
    );

    // Create a cache key based on relevant cookies
    const cookieHash = supabaseCookies
      .map(c => `${c.name}:${c.value.substring(0, 10)}`)
      .sort()
      .join("|");
    const cacheKey = `client:${cookieHash}`;

    // Check if we have a pooled client
    const pooledClient = clientPool.get(cacheKey);
    if (pooledClient && Date.now() - pooledClient.lastUsed < CLIENT_REUSE_TTL) {
      pooledClient.lastUsed = Date.now();
      enterpriseLogger.debug("Reusing pooled Supabase client", {
        requestId,
        cacheKey: cacheKey.substring(0, 20) + "...",
        poolSize: clientPool.size,
      });
      return pooledClient.client;
    }

    enterpriseLogger.debug("Creating new Supabase client", {
      requestId,
      totalCookies: allCookies.length,
      supabaseCookies: supabaseCookies.length,
      poolSize: clientPool.size,
    });

    const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const client = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serverKey,
      {
        cookies: {
          get(name: string) {
            try {
              const cookie = cookieStore.get(name);
              return cookie?.value;
            } catch (error) {
              enterpriseLogger.warn("Error getting cookie", {
                requestId,
                cookieName: name,
                error: error instanceof Error ? error.message : String(error),
              });
              return undefined;
            }
          },
          set(name: string, value: string, options: any) {
            try {
              // Validate cookie values
              if (
                !validateInput(name, "alphanumeric_extended") ||
                value.length > 4096
              ) {
                enterpriseLogger.warn("Invalid cookie data", {
                  requestId,
                  cookieName: name,
                  valueLength: value.length,
                });
                return;
              }

              const cookieOptions = {
                ...options,
                httpOnly: options.httpOnly ?? true,
                secure: options.secure ?? process.env.NODE_ENV === "production",
                sameSite: options.sameSite ?? "lax",
                path: options.path ?? "/",
                maxAge: options.maxAge ?? 60 * 60 * 24 * 7, // 7 days default
              };

              cookieStore.set({ name, value, ...cookieOptions });
            } catch (error) {
              enterpriseLogger.warn("Cookie set error", {
                requestId,
                cookieName: name,
                error: error instanceof Error ? error.message : String(error),
                context: "This may be expected in some server contexts",
              });
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({
                name,
                value: "",
                ...options,
                expires: new Date(0),
                maxAge: 0,
              });
            } catch (error) {
              enterpriseLogger.warn("Cookie remove error", {
                requestId,
                cookieName: name,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          },
        },
      }
    );

    // Pool the client for reuse if pool isn't full
    if (clientPool.size < POOL_MAX_SIZE) {
      const now = Date.now();
      clientPool.set(cacheKey, {
        client,
        createdAt: now,
        lastUsed: now,
      });

      enterpriseLogger.debug("Cached new Supabase client", {
        requestId,
        cacheKey: cacheKey.substring(0, 20) + "...",
        poolSize: clientPool.size,
      });
    }

    const duration = Date.now() - startTime;
    enterpriseLogger.info("Supabase client created successfully", {
      requestId,
      duration,
      poolSize: clientPool.size,
      isPooled: clientPool.size < POOL_MAX_SIZE,
    });

    return client;
  } catch (error) {
    const duration = Date.now() - startTime;
    enterpriseLogger.error("Critical error creating Supabase client", {
      requestId,
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
