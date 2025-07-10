/**
 * CSRF Token API
 * Provides CSRF tokens for secure form submissions
 */

import { NextRequest, NextResponse } from "next/server";
import { csrfManager } from "@/lib/auth/csrf-manager";

// GET /api/csrf-token - Get or generate CSRF token
export async function GET(request: NextRequest) {
  console.log("🛡️ CSRF token request received");

  try {
    // Check if token already exists in cookie
    const existingToken = request.cookies.get("csrf-token")?.value;

    let token: string;

    if (existingToken && csrfManager.isValidTokenFormat(existingToken)) {
      console.log("✅ Using existing CSRF token");
      token = existingToken;
    } else {
      console.log("🔄 Generating new CSRF token");
      token = csrfManager.generateCSRFToken();
    }

    // Create response with token
    const response = NextResponse.json({
      success: true,
      token,
      message: "CSRF token generated successfully",
    });

    // Set the token in cookie if it's new or doesn't exist
    if (!existingToken || existingToken !== token) {
      csrfManager.setCSRFCookie(response, token);
    }

    // Add security headers
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("❌ Error generating CSRF token:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate CSRF token",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/csrf-token - Validate CSRF token
export async function POST(request: NextRequest) {
  console.log("🛡️ CSRF token validation request received");

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Token required",
          message: "CSRF token must be provided for validation",
        },
        { status: 400 }
      );
    }

    // Validate token format
    if (!csrfManager.isValidTokenFormat(token)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token format",
          message: "CSRF token format is invalid",
        },
        { status: 400 }
      );
    }

    // Validate against cookie
    const cookieToken = request.cookies.get("csrf-token")?.value;

    if (!cookieToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No cookie token",
          message: "CSRF token not found in cookie",
        },
        { status: 400 }
      );
    }

    if (token !== cookieToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Token mismatch",
          message: "CSRF token does not match cookie value",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "CSRF token is valid",
    });
  } catch (error) {
    console.error("❌ Error validating CSRF token:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Validation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
