/**
 * Competitive Intelligence API - Individual Competitor Management
 * RESTful API endpoints for managing individual competitor data
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  Competitor,
  CompetitorMetadata,
  CompetitiveIntelligenceResponse,
} from "@/lib/competitive/types";

const supabase = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_ROLE_KEY"]!
);

// Validation schemas
const updateCompetitorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z
    .string()
    .url()
    .transform(url => new URL(url).hostname)
    .optional(),
  category: z
    .enum(["direct", "indirect", "emerging", "aspirational"])
    .optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["active", "inactive", "monitoring", "archived"]).optional(),
  metadata: z
    .object({
      industry: z.string().optional(),
      size: z
        .enum(["startup", "small", "medium", "large", "enterprise"])
        .optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      customFields: z.record(z.unknown()).optional(),
    })
    .optional(),
});

/**
 * GET /api/competitive/competitors/[id]
 * Get a specific competitor by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const competitorId = resolvedParams.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(competitorId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid competitor ID format",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 400 }
      );
    }

    const { data: competitor, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("id", competitorId)
      .single();

    if (error || !competitor) {
      return NextResponse.json(
        {
          success: false,
          error: "Competitor not found",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 404 }
      );
    }

    // Transform to TypeScript interface format
    const transformedCompetitor: Competitor = {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain,
      category: competitor.category,
      priority: competitor.priority,
      status: competitor.status,
      addedAt: new Date(competitor.added_at),
      ...(competitor.last_analyzed && {
        lastAnalyzed: new Date(competitor.last_analyzed),
      }),
      metadata: competitor.metadata as CompetitorMetadata,
    };

    return NextResponse.json({
      success: true,
      data: transformedCompetitor,
      metadata: {
        timestamp: new Date(),
        version: "1.0.0",
        processingTime: 0,
      },
    } as CompetitiveIntelligenceResponse<Competitor>);
  } catch (error) {
    console.error("Error in competitor GET:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          timestamp: new Date(),
          version: "1.0.0",
          processingTime: 0,
        },
      } as CompetitiveIntelligenceResponse,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/competitive/competitors/[id]
 * Update a specific competitor
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const competitorId = resolvedParams.id;
    const body = await request.json();

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(competitorId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid competitor ID format",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 400 }
      );
    }

    const validatedData = updateCompetitorSchema.parse(body);

    // Check if competitor exists
    const { data: existingCompetitor } = await supabase
      .from("competitors")
      .select("id, domain")
      .eq("id", competitorId)
      .single();

    if (!existingCompetitor) {
      return NextResponse.json(
        {
          success: false,
          error: "Competitor not found",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 404 }
      );
    }

    // If domain is being updated, check for conflicts
    if (
      validatedData.domain &&
      validatedData.domain !== existingCompetitor.domain
    ) {
      const { data: domainConflict } = await supabase
        .from("competitors")
        .select("id")
        .eq("domain", validatedData.domain)
        .neq("id", competitorId)
        .single();

      if (domainConflict) {
        return NextResponse.json(
          {
            success: false,
            error: `Competitor with domain ${validatedData.domain} already exists`,
            metadata: {
              timestamp: new Date(),
              version: "1.0.0",
              processingTime: 0,
            },
          } as CompetitiveIntelligenceResponse,
          { status: 409 }
        );
      }
    }

    // Update the competitor
    const updateData: Record<string, unknown> = {};
    if (validatedData.name) updateData["name"] = validatedData.name;
    if (validatedData.domain) updateData["domain"] = validatedData.domain;
    if (validatedData.category) updateData["category"] = validatedData.category;
    if (validatedData.priority) updateData["priority"] = validatedData.priority;
    if (validatedData.status) updateData["status"] = validatedData.status;
    if (validatedData.metadata) updateData["metadata"] = validatedData.metadata;

    const { data: competitor, error } = await supabase
      .from("competitors")
      .update(updateData)
      .eq("id", competitorId)
      .select()
      .single();

    if (error) {
      console.error("Error updating competitor:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update competitor",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 500 }
      );
    }

    // Transform to TypeScript interface format
    const transformedCompetitor: Competitor = {
      id: competitor.id,
      name: competitor.name,
      domain: competitor.domain,
      category: competitor.category,
      priority: competitor.priority,
      status: competitor.status,
      addedAt: new Date(competitor.added_at),
      ...(competitor.last_analyzed && {
        lastAnalyzed: new Date(competitor.last_analyzed),
      }),
      metadata: competitor.metadata as CompetitorMetadata,
    };

    return NextResponse.json({
      success: true,
      data: transformedCompetitor,
      metadata: {
        timestamp: new Date(),
        version: "1.0.0",
        processingTime: 0,
      },
    } as CompetitiveIntelligenceResponse<Competitor>);
  } catch (error) {
    console.error("Error in competitor PUT:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          timestamp: new Date(),
          version: "1.0.0",
          processingTime: 0,
        },
      } as CompetitiveIntelligenceResponse,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/competitive/competitors/[id]
 * Delete a specific competitor
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const competitorId = resolvedParams.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(competitorId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid competitor ID format",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 400 }
      );
    }

    // Check if competitor exists
    const { data: existingCompetitor } = await supabase
      .from("competitors")
      .select("id")
      .eq("id", competitorId)
      .single();

    if (!existingCompetitor) {
      return NextResponse.json(
        {
          success: false,
          error: "Competitor not found",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 404 }
      );
    }

    // Delete the competitor (cascading deletes will handle related records)
    const { error } = await supabase
      .from("competitors")
      .delete()
      .eq("id", competitorId);

    if (error) {
      console.error("Error deleting competitor:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete competitor",
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true, id: competitorId },
      metadata: {
        timestamp: new Date(),
        version: "1.0.0",
        processingTime: 0,
      },
    } as CompetitiveIntelligenceResponse<{ deleted: boolean; id: string }>);
  } catch (error) {
    console.error("Error in competitor DELETE:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          timestamp: new Date(),
          version: "1.0.0",
          processingTime: 0,
        },
      } as CompetitiveIntelligenceResponse,
      { status: 500 }
    );
  }
}
