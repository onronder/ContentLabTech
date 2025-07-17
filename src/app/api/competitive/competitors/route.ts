/**
 * Competitive Intelligence API - Competitors Management
 * RESTful API endpoints for managing competitor data
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";
import { authenticatedApiHandler } from "@/lib/auth/api-handler";
import { competitiveCircuitBreaker } from "@/lib/competitive/circuit-breaker";

const supabase = getSupabaseAdmin();
import type {
  Competitor,
  CompetitorMetadata,
  CompetitorListResponse,
  CompetitiveIntelligenceResponse,
} from "@/lib/competitive/types";

// Validation schemas
const createCompetitorSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z
    .string()
    .url()
    .transform(url => new URL(url).hostname),
  category: z.enum(["direct", "indirect", "emerging", "aspirational"]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  status: z
    .enum(["active", "inactive", "monitoring", "archived"])
    .default("active"),
  metadata: z
    .object({
      industry: z.string().optional(),
      size: z
        .enum(["startup", "small", "medium", "large", "enterprise"])
        .optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).default([]),
      customFields: z.record(z.unknown()).default({}),
    })
    .default({}),
});

const _updateCompetitorSchema = createCompetitorSchema.partial();

const querySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform(val => (val ? Math.min(parseInt(val), 100) : 20)),
  category: z
    .enum(["direct", "indirect", "emerging", "aspirational"])
    .optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["active", "inactive", "monitoring", "archived"]).optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(["name", "domain", "category", "priority", "addedAt", "lastAnalyzed"])
    .default("addedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * GET /api/competitive/competitors
 * List competitors with filtering, pagination, and search
 */
export async function GET(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = querySchema.parse(Object.fromEntries(searchParams));

      // Build the query with team filtering
      let supabaseQuery = supabase
        .from("competitors")
        .select("*", { count: "exact" })
        .eq("team_id", team.id);

      // Apply filters
      if (query.category) {
        supabaseQuery = supabaseQuery.eq("category", query.category);
      }
      if (query.priority) {
        supabaseQuery = supabaseQuery.eq("priority", query.priority);
      }
      if (query.status) {
        supabaseQuery = supabaseQuery.eq("status", query.status);
      }
      if (query.search) {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${query.search}%,domain.ilike.%${query.search}%`
        );
      }

      // Apply sorting
      const sortColumn =
        query.sortBy === "addedAt"
          ? "added_at"
          : query.sortBy === "lastAnalyzed"
            ? "last_analyzed"
            : query.sortBy;
      supabaseQuery = supabaseQuery.order(sortColumn, {
        ascending: query.sortOrder === "asc",
      });

      // Apply pagination
      const offset = (query.page - 1) * query.pageSize;
      supabaseQuery = supabaseQuery.range(offset, offset + query.pageSize - 1);

      const { data: competitors, error, count } = await supabaseQuery;

      if (error) {
        console.error("Error fetching competitors:", error);
        // Return empty result for now if table doesn't exist
        const mockResponse: CompetitorListResponse = {
          competitors: [],
          pagination: {
            total: 0,
            page: query.page,
            pageSize: query.pageSize,
            hasNext: false,
          },
          filters: {
            applied: {
              category: query.category,
              priority: query.priority,
              status: query.status,
              search: query.search,
            },
            available: {
              categories: [],
              priorities: [],
              statuses: [],
            },
          },
        };

        return NextResponse.json({
          success: true,
          data: mockResponse,
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse<CompetitorListResponse>);
      }

      // Transform to TypeScript interface format
      const transformedCompetitors: Competitor[] = (competitors || []).map(
        comp => ({
          id: comp.id,
          name: comp.name,
          domain: comp.domain,
          category: comp.category,
          priority: comp.priority,
          status: comp.status,
          addedAt: new Date(comp.added_at),
          ...(comp.last_analyzed && {
            lastAnalyzed: new Date(comp.last_analyzed),
          }),
          metadata: comp.metadata as CompetitorMetadata,
        })
      );

      // Get available filter options for the response
      const { data: filterData } = await supabase
        .from("competitors")
        .select("category, priority, status");

      const availableFilters = {
        categories: [...new Set(filterData?.map(item => item.category) || [])],
        priorities: [...new Set(filterData?.map(item => item.priority) || [])],
        statuses: [...new Set(filterData?.map(item => item.status) || [])],
      };

      const response: CompetitorListResponse = {
        competitors: transformedCompetitors,
        pagination: {
          total: count || 0,
          page: query.page,
          pageSize: query.pageSize,
          hasNext: offset + query.pageSize < (count || 0),
        },
        filters: {
          applied: {
            category: query.category,
            priority: query.priority,
            status: query.status,
            search: query.search,
          },
          available: availableFilters,
        },
      };

      return NextResponse.json({
        success: true,
        data: response,
        metadata: {
          timestamp: new Date(),
          version: "1.0.0",
          processingTime: 0,
        },
      } as CompetitiveIntelligenceResponse<CompetitorListResponse>);
    } catch (error) {
      console.error("Error in competitors GET:", error);
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
  });
}

/**
 * POST /api/competitive/competitors
 * Create a new competitor
 */
export async function POST(request: NextRequest) {
  return authenticatedApiHandler(request, async (user, team) => {
    try {
      const body = await request.json();
      const validatedData = createCompetitorSchema.parse(body);

      // Check if competitor with this domain already exists for this team
      const { data: existingCompetitor } = await supabase
        .from("competitors")
        .select("id")
        .eq("domain", validatedData.domain)
        .eq("team_id", team.id)
        .single();

      if (existingCompetitor) {
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

      // Create the competitor
      const { data: competitor, error } = await supabase
        .from("competitors")
        .insert({
          name: validatedData.name,
          domain: validatedData.domain,
          category: validatedData.category,
          priority: validatedData.priority,
          status: validatedData.status,
          metadata: validatedData.metadata,
          team_id: team.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating competitor:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create competitor",
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

      return NextResponse.json(
        {
          success: true,
          data: transformedCompetitor,
          metadata: {
            timestamp: new Date(),
            version: "1.0.0",
            processingTime: 0,
          },
        } as CompetitiveIntelligenceResponse<Competitor>,
        { status: 201 }
      );
    } catch (error) {
      console.error("Error in competitors POST:", error);

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
  });
}
