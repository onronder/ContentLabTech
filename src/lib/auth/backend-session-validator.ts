/**
 * Backend Session Validation - Surgical Fix
 * Focuses exclusively on backend session validation pipeline
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

// Service role client for backend session validation
const supabaseServiceRole = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Extract session token from request cookies
 * Handles all possible Supabase cookie formats
 */
function extractSessionFromRequest(request: NextRequest): string | null {
  console.log("🔍 Backend Session: Starting cookie extraction");

  // Get cookie header
  const cookieHeader = request.headers.get("cookie");
  console.log("🍪 Backend Session: Cookie header", {
    present: !!cookieHeader,
    length: cookieHeader?.length || 0,
    preview: cookieHeader?.substring(0, 100) + "..." || "none",
  });

  if (!cookieHeader) {
    console.log("❌ Backend Session: No cookie header found");
    return null;
  }

  // Parse cookies
  const cookies = cookieHeader.split(";").map(c => c.trim());
  console.log("🍪 Backend Session: Parsed cookies", {
    count: cookies.length,
    names: cookies.map(c => c.split("=")[0]).slice(0, 10), // First 10 cookie names
  });

  // Look for Supabase session cookies in all possible formats
  const sessionCookiePatterns = [
    "sb-",
    "supabase-auth-token",
    "supabase.auth.token",
    "auth-token",
    // Next.js/Supabase SSR cookies
    "sb-access-token",
    "sb-refresh-token",
  ];

  let sessionToken: string | null = null;

  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");

    // Check if this cookie matches any session pattern
    for (const pattern of sessionCookiePatterns) {
      if (name && name.includes(pattern) && value) {
        console.log("🔑 Backend Session: Found potential session cookie", {
          name,
          hasValue: !!value,
          valueLength: value?.length || 0,
          preview: value?.substring(0, 30) + "..." || "empty",
        });

        // For access tokens, this is likely our session token
        if (name.includes("access-token") || name.includes("auth-token")) {
          sessionToken = value;
          console.log("✅ Backend Session: Using session token from", name);
          break;
        }
      }
    }

    if (sessionToken) break;
  }

  if (!sessionToken) {
    console.log("❌ Backend Session: No session token found in cookies");
    console.log(
      "🔍 Backend Session: Available cookie names:",
      cookies.map(c => c.split("=")[0]).join(", ")
    );
  }

  return sessionToken;
}

/**
 * Validate session token with Supabase
 */
async function validateSessionWithSupabase(
  sessionToken: string
): Promise<User> {
  console.log("🔍 Backend Session: Validating with Supabase", {
    tokenLength: sessionToken.length,
    tokenPreview: sessionToken.substring(0, 20) + "...",
  });

  try {
    // Method 1: Try getUser with the token
    const {
      data: { user },
      error,
    } = await supabaseServiceRole.auth.getUser(sessionToken);

    console.log("🔍 Backend Session: Supabase validation result", {
      hasUser: !!user,
      hasError: !!error,
      errorMessage: error?.message,
      userId: user?.id,
      userEmail: user?.email,
    });

    if (error) {
      console.log(
        "❌ Backend Session: Supabase validation error:",
        error.message
      );
      throw new Error(`Session validation failed: ${error.message}`);
    }

    if (!user) {
      console.log("❌ Backend Session: No user found for session token");
      throw new Error("No user found for session token");
    }

    console.log("✅ Backend Session: Session validation successful", {
      userId: user.id,
      email: user.email,
      lastSignIn: user.last_sign_in_at,
    });

    return user;
  } catch (error) {
    console.log("💥 Backend Session: Validation exception:", error);
    throw error;
  }
}

/**
 * Alternative session validation using different approach
 */
async function validateSessionAlternative(
  request: NextRequest
): Promise<User | null> {
  console.log("🔄 Backend Session: Trying alternative validation approach");

  try {
    // Create a server client that reads from the request cookies directly
    const { createServerClient } = await import("@supabase/ssr");

    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]!,
      {
        cookies: {
          get(name: string) {
            const cookieValue = request.cookies.get(name)?.value;
            console.log(
              `🍪 Alternative: Getting cookie ${name}: ${cookieValue ? "found" : "missing"}`
            );
            return cookieValue;
          },
          set() {
            // Not needed for validation
          },
          remove() {
            // Not needed for validation
          },
        },
      }
    );

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    console.log("🔍 Backend Session: Alternative validation result", {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasError: !!error,
      errorMessage: error?.message,
    });

    if (error) {
      console.log(
        "❌ Backend Session: Alternative validation error:",
        error.message
      );
      return null;
    }

    if (!session?.user) {
      console.log(
        "❌ Backend Session: No session/user found in alternative method"
      );
      return null;
    }

    console.log("✅ Backend Session: Alternative validation successful", {
      userId: session.user.id,
      email: session.user.email,
    });

    return session.user;
  } catch (error) {
    console.log("💥 Backend Session: Alternative validation exception:", error);
    return null;
  }
}

/**
 * Main backend session validation function
 * Tries multiple approaches to validate the session
 */
export async function validateBackendSession(request: NextRequest): Promise<{
  success: boolean;
  user?: User;
  error?: string;
  method?: string;
}> {
  console.log("🔐 Backend Session: Starting comprehensive validation", {
    url: request.url,
    method: request.method,
    hasHeaders: !!request.headers,
    timestamp: new Date().toISOString(),
  });

  // Method 1: Extract token and validate with service role
  try {
    const sessionToken = extractSessionFromRequest(request);

    if (sessionToken) {
      const user = await validateSessionWithSupabase(sessionToken);
      return {
        success: true,
        user,
        method: "service-role-token",
      };
    }
  } catch (error) {
    console.log("⚠️ Backend Session: Method 1 (service role) failed:", error);
  }

  // Method 2: Alternative SSR approach
  try {
    const user = await validateSessionAlternative(request);

    if (user) {
      return {
        success: true,
        user,
        method: "ssr-session",
      };
    }
  } catch (error) {
    console.log("⚠️ Backend Session: Method 2 (SSR) failed:", error);
  }

  // All methods failed
  console.log("❌ Backend Session: All validation methods failed");
  return {
    success: false,
    error: "Session validation failed - no valid session found",
    method: "none",
  };
}
