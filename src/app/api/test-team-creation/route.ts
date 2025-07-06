import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    // Get current user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          user: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      message: "User found successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Make a request to the fix-team-assignments API
    const response = await fetch(
      `${process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3000"}/api/fix-team-assignments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      }
    );

    const responseData = await response.json();

    return NextResponse.json({
      success: response.ok,
      apiResponse: responseData,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
