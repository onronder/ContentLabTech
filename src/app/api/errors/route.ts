/**
 * Error Reporting API Endpoint
 * Receives and processes client-side error reports
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Error report schema
const errorReportSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  componentStack: z.string().optional(),
  timestamp: z.string(),
  userAgent: z.string(),
  url: z.string(),
  context: z.record(z.unknown()).optional(),
});

type ErrorReport = z.infer<typeof errorReportSchema>;

// In-memory storage for demo (use proper database in production)
const errorStore: ErrorReport[] = [];
const MAX_STORED_ERRORS = 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const errorReport = errorReportSchema.parse(body);

    // Add to error store (in production, save to database)
    errorStore.push(errorReport);

    // Keep only recent errors
    if (errorStore.length > MAX_STORED_ERRORS) {
      errorStore.splice(0, errorStore.length - MAX_STORED_ERRORS);
    }

    // Log error (in production, send to error tracking service)
    console.error("Client Error Reported:", {
      message: errorReport.message,
      timestamp: errorReport.timestamp,
      url: errorReport.url,
      context: errorReport.context,
    });

    // In production, you would:
    // 1. Save to database
    // 2. Send to error tracking service (Sentry, DataDog, etc.)
    // 3. Send alerts for critical errors
    // 4. Update error metrics

    return NextResponse.json({ 
      success: true, 
      message: "Error report received" 
    });

  } catch (error) {
    console.error("Failed to process error report:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to process error report" 
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Simple endpoint to view recent errors (for debugging)
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  const recentErrors = errorStore
    .slice(-limit)
    .map(error => ({
      message: error.message,
      timestamp: error.timestamp,
      url: error.url,
      context: error.context,
    }));

  return NextResponse.json({
    errors: recentErrors,
    total: errorStore.length,
  });
}