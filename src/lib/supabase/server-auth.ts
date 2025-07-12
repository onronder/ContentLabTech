/**
 * Server-side Supabase Client for Authentication
 * Uses cookies for session management in API routes
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type Database } from "@/types/database";

export async function createClient() {
  console.log("🔧 Creating server-side Supabase auth client");

  try {
    const cookieStore = await cookies();

    // Enhanced cookie debugging for server auth client
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      c =>
        c.name.includes("sb-") ||
        c.name.includes("supabase") ||
        c.name.includes("auth-token")
    );

    console.log("🔧 Server Auth Client: Cookie inventory", {
      totalCookies: allCookies.length,
      supabaseCookies: supabaseCookies.length,
      cookieNames: allCookies.map(c => c.name),
      supabaseDetails: supabaseCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value.length,
        valuePreview: c.value.substring(0, 20) + "...",
      })),
    });

    // Check environment variables
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasJwtSecret: !!process.env.SUPABASE_JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    };

    console.log("🔧 Server Auth Client: Environment check", envCheck);

    // CRITICAL FIX: Use service role key for server-side operations
    // Server operations need elevated permissions that anon key doesn't provide
    const serverKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log("🔧 Server Auth Client: Key selection", {
      usingServiceRole,
      keyType: usingServiceRole ? "service_role" : "anon",
      keyLength: serverKey?.length || 0,
      keyPrefix: serverKey?.substring(0, 20) + "...",
    });

    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serverKey!,
      {
        cookies: {
          get(name: string) {
            try {
              const cookie = cookieStore.get(name);
              const found = !!cookie?.value;

              // Enhanced logging for Supabase cookies
              if (name.includes("sb-") || name.includes("supabase")) {
                console.log(`🍪 Server Auth: Getting Supabase cookie ${name}`, {
                  found,
                  hasValue: !!cookie?.value,
                  valueLength: cookie?.value?.length || 0,
                  valueStart: cookie?.value?.substring(0, 30) + "...",
                });
              }

              return cookie?.value;
            } catch (error) {
              console.error(
                `❌ Server Auth: Error getting cookie ${name}:`,
                error
              );
              return undefined;
            }
          },
          set(name: string, value: string, options: any) {
            try {
              // Enhanced cookie setting with production-grade attributes
              const cookieOptions = {
                ...options,
                httpOnly: options.httpOnly ?? true,
                secure: options.secure ?? process.env.NODE_ENV === "production",
                sameSite: options.sameSite ?? "lax",
                path: options.path ?? "/",
                maxAge: options.maxAge ?? 60 * 60 * 24 * 7, // 7 days default
              };

              if (name.includes("sb-") || name.includes("supabase")) {
                console.log(`🍪 Server Auth: Setting Supabase cookie ${name}`, {
                  valueLength: value.length,
                  options: cookieOptions,
                  environment: process.env.NODE_ENV,
                });
              }

              cookieStore.set({ name, value, ...cookieOptions });
            } catch (error) {
              // Enhanced error handling for cookie setting
              console.error(`❌ Server Auth: Cookie set error for ${name}:`, {
                error: error instanceof Error ? error.message : error,
                context: "This may be expected in some server contexts",
                cookieName: name,
                valueLength: value.length,
              });
            }
          },
          remove(name: string, options: any) {
            try {
              if (name.includes("sb-") || name.includes("supabase")) {
                console.log(`🍪 Server Auth: Removing Supabase cookie ${name}`);
              }

              cookieStore.set({
                name,
                value: "",
                ...options,
                expires: new Date(0),
                maxAge: 0,
              });
            } catch (error) {
              console.error(
                `❌ Server Auth: Cookie remove error for ${name}:`,
                {
                  error: error instanceof Error ? error.message : error,
                  context: "This may be expected in some server contexts",
                }
              );
            }
          },
        },
      }
    );
  } catch (error) {
    console.error("❌ Server Auth Client: Critical error creating client", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
