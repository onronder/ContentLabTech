/**
 * Next.js Middleware for Route Protection
 * Edge-compatible version without Node.js dependencies
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Skip middleware for static assets and health checks
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/api/health") ||
      pathname.includes(".") ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: "",
              ...options,
            });
          },
        },
      }
    );

    // Get session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Public routes that don't require authentication
    const publicRoutes = [
      "/",
      "/auth/signin",
      "/auth/signup",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/auth/callback",
      "/auth/email-confirmed",
      "/auth/verify-email",
      "/terms",
      "/privacy",
      "/api/auth/callback",
      "/api/csrf-token",
      "/invite",
    ];

    // Check if the current route is public
    const isPublicRoute = publicRoutes.some(route =>
      pathname.startsWith(route)
    );

    // Special handling for invite routes
    const isInviteRoute = pathname.startsWith("/invite/");

    // If user is not authenticated and trying to access a protected route
    if (!session && !isPublicRoute && !isInviteRoute) {
      const redirectUrl = new URL("/auth/signin", request.url);
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (
      session &&
      pathname.startsWith("/auth/") &&
      pathname !== "/auth/callback"
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // If user is authenticated and on root path, redirect to dashboard
    if (session && pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Add basic security headers
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    // Return next response to prevent blocking the app
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
