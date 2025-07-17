import { NextRequest, NextResponse } from "next/server";

// Mock WebSocket test endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  // Simulate WebSocket connection test
  return NextResponse.json({
    success: true,
    message: "WebSocket connection test successful",
    projectId,
    timestamp: new Date().toISOString(),
    mockData: {
      connectionState: "connected",
      supportedEvents: [
        "competitive-update",
        "competitor-alert",
        "analysis-complete",
        "metrics-update",
      ],
      testUpdate: {
        type: "competitive-update",
        data: {
          competitorId: "test-competitor",
          competitorName: "Test Competitor",
          message: "Mock competitive intelligence update",
          metrics: {
            ranking: 3,
            traffic: 125000,
            keywords: 1250,
          },
        },
      },
    },
  });
}

// Mock WebSocket event simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, eventType, data } = body;

    if (!projectId || !eventType) {
      return NextResponse.json(
        {
          error: "Project ID and event type required",
        },
        { status: 400 }
      );
    }

    // Simulate different event types
    const mockEvents = {
      "competitive-update": {
        competitorId: "comp-123",
        competitorName: "Example Competitor",
        message: "Rankings updated",
        changes: {
          ranking: { from: 5, to: 3 },
          traffic: { from: 100000, to: 125000 },
        },
      },
      "competitor-alert": {
        alertId: "alert-456",
        competitorId: "comp-123",
        alertType: "ranking_change",
        message: "Competitor moved up 2 positions",
        severity: "medium",
        threshold: 10,
      },
      "analysis-complete": {
        analysisId: "analysis-789",
        competitorId: "comp-123",
        analysisType: "seo",
        status: "completed",
        results: {
          score: 85,
          recommendations: ["Improve meta descriptions", "Add more backlinks"],
        },
      },
      "metrics-update": {
        competitorId: "comp-123",
        competitorName: "Example Competitor",
        metrics: {
          organic_traffic: 125000,
          keyword_count: 1250,
          backlink_count: 850,
          domain_authority: 65,
        },
      },
    };

    const mockEvent = mockEvents[eventType as keyof typeof mockEvents] || data;

    return NextResponse.json({
      success: true,
      message: `Mock ${eventType} event created`,
      projectId,
      eventType,
      data: mockEvent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create mock event",
      },
      { status: 500 }
    );
  }
}
