/**
 * Production-Grade Cookie Debugging Endpoint
 * Comprehensive cookie transmission and reading analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  console.log("🍪 Cookie Debug: Starting comprehensive cookie analysis");

  const timestamp = new Date().toISOString();
  const debugResult = {
    status: "Cookie Debug Analysis Complete",
    timestamp,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      isProduction: process.env.NODE_ENV === "production",
    },
    request: {
      url: request.url,
      method: request.method,
      userAgent: request.headers.get("user-agent"),
      origin: request.headers.get("origin"),
      referer: request.headers.get("referer"),
      host: request.headers.get("host"),
    },
    headers: {
      all: Object.fromEntries(request.headers.entries()),
      cookieHeader: request.headers.get("cookie"),
      authorization: request.headers.get("authorization"),
    },
    cookies: {
      analysis: null as any,
      nextjsMethod: null as any,
      supabaseDetection: null as any,
      errors: [] as string[],
    },
  };

  try {
    // Method 1: Next.js cookies() API
    console.log("🍪 Testing Next.js cookies() API");
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    debugResult.cookies.nextjsMethod = {
      success: true,
      cookieCount: allCookies.length,
      cookies: allCookies.map(cookie => ({
        name: cookie.name,
        value:
          cookie.value.substring(0, 50) +
          (cookie.value.length > 50 ? "..." : ""),
        valueLength: cookie.value.length,
        hasValue: !!cookie.value,
      })),
      rawCookies: allCookies,
    };

    // Method 2: Direct header parsing
    console.log("🍪 Testing direct cookie header parsing");
    const cookieHeader = request.headers.get("cookie");
    const headerCookies = cookieHeader
      ? cookieHeader.split(";").map(cookie => {
          const [name, ...valueParts] = cookie.trim().split("=");
          const value = valueParts.join("=");
          return { name: name?.trim(), value: value?.trim() };
        })
      : [];

    debugResult.cookies.analysis = {
      headerPresent: !!cookieHeader,
      headerLength: cookieHeader?.length || 0,
      headerCookieCount: headerCookies.length,
      headerCookies: headerCookies.map(cookie => ({
        name: cookie.name,
        value:
          cookie.value?.substring(0, 50) +
          (cookie.value && cookie.value.length > 50 ? "..." : ""),
        valueLength: cookie.value?.length || 0,
        hasValue: !!cookie.value,
      })),
    };

    // Method 3: Supabase-specific cookie detection
    console.log("🍪 Testing Supabase cookie detection");
    const supabaseCookiePatterns = [
      "sb-",
      "supabase-auth-token",
      "supabase.auth.token",
      "auth-token",
      "access_token",
      "refresh_token",
    ];

    const supabaseCookies = allCookies.filter(cookie =>
      supabaseCookiePatterns.some(pattern => cookie.name.includes(pattern))
    );

    const headerSupabaseCookies = headerCookies.filter(cookie =>
      supabaseCookiePatterns.some(pattern => cookie.name?.includes(pattern))
    );

    debugResult.cookies.supabaseDetection = {
      nextjsSupabaseCookies: supabaseCookies.length,
      headerSupabaseCookies: headerSupabaseCookies.length,
      detectedCookies: {
        nextjs: supabaseCookies.map(c => ({
          name: c.name,
          valuePreview: c.value.substring(0, 100) + "...",
          valueLength: c.value.length,
        })),
        header: headerSupabaseCookies.map(c => ({
          name: c.name,
          valuePreview: c.value?.substring(0, 100) + "...",
          valueLength: c.value?.length || 0,
        })),
      },
    };

    // Cookie validation tests
    const cookieTests = {
      hasAnyCookies: allCookies.length > 0,
      hasSupabaseCookies: supabaseCookies.length > 0,
      cookieHeaderPresent: !!cookieHeader,
      nextjsCanReadCookies: allCookies.length > 0,
      headerParsingWorks: headerCookies.length > 0,
      cookieCountMatch: allCookies.length === headerCookies.length,
    };

    console.log("🍪 Cookie Debug Results:", {
      totalCookies: allCookies.length,
      supabaseCookies: supabaseCookies.length,
      headerCookieCount: headerCookies.length,
      tests: cookieTests,
    });

    // Test specific Supabase cookie reading
    const specificCookieTests = {
      sbAccess: cookieStore.get("sb-access-token"),
      sbRefresh: cookieStore.get("sb-refresh-token"),
      sbAuth: cookieStore.get("supabase-auth-token"),
      sbSession: cookieStore.get(
        "sb-" +
          process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]
      ),
    };

    return NextResponse.json({
      ...debugResult,
      cookieTests,
      specificCookieTests: Object.fromEntries(
        Object.entries(specificCookieTests).map(([key, cookie]) => [
          key,
          cookie
            ? {
                name: cookie.name,
                hasValue: !!cookie.value,
                valueLength: cookie.value.length,
                valuePreview: cookie.value.substring(0, 50) + "...",
              }
            : null,
        ])
      ),
      recommendations: generateRecommendations(cookieTests, supabaseCookies),
    });
  } catch (error) {
    console.error("❌ Cookie Debug Error:", error);
    debugResult.cookies.errors.push(
      error instanceof Error ? error.message : "Unknown cookie reading error"
    );

    return NextResponse.json(
      {
        ...debugResult,
        error: "Cookie debugging failed",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(tests: any, supabaseCookies: any[]): string[] {
  const recommendations: string[] = [];

  if (!tests.hasAnyCookies) {
    recommendations.push(
      "🚨 CRITICAL: No cookies received by server - check cookie transmission"
    );
  }

  if (!tests.hasSupabaseCookies) {
    recommendations.push(
      "🚨 CRITICAL: No Supabase cookies detected - authentication will fail"
    );
  }

  if (tests.hasAnyCookies && !tests.hasSupabaseCookies) {
    recommendations.push(
      "⚠️ Cookies present but no Supabase cookies - check cookie names/format"
    );
  }

  if (!tests.cookieCountMatch) {
    recommendations.push(
      "⚠️ Cookie count mismatch between methods - possible parsing issue"
    );
  }

  if (tests.hasSupabaseCookies) {
    recommendations.push(
      "✅ Supabase cookies detected - check session validation logic"
    );
  }

  if (tests.hasAnyCookies && tests.nextjsCanReadCookies) {
    recommendations.push(
      "✅ Cookie transmission working - focus on session parsing"
    );
  }

  return recommendations;
}

export async function POST(request: NextRequest) {
  console.log("🍪 Cookie Debug: Testing cookie writing and session creation");

  try {
    const body = await request.json();
    const testType = body.testType || "basic";

    // Test cookie setting
    const response = NextResponse.json({
      status: "Cookie Write Test Complete",
      timestamp: new Date().toISOString(),
      testType,
      message: "Test cookies set - check if they persist",
    });

    // Set test cookies with various configurations
    response.cookies.set("test-basic", "basic-value", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    response.cookies.set("test-supabase-format", "sb-test-value", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("❌ Cookie Write Test Error:", error);
    return NextResponse.json(
      {
        error: "Cookie write test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
