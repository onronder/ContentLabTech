import { NextRequest } from "next/server";
import {
  withApiAuth,
  createSuccessResponse,
  validateTeamAccess,
  type AuthContext,
} from "@/lib/auth/withApiAuth-definitive";

interface CreateContentRequest {
  projectId: string;
  title: string;
  content: string;
  url?: string;
  meta_description?: string;
  focus_keywords?: string[];
  target_audience?: string;
  content_type?: string;
  status?: "draft" | "published" | "archived";
}

interface ContentFilters {
  projectId?: string;
  status?: string;
  content_type?: string;
  search?: string;
  limit: number;
  offset: number;
}

export const POST = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      console.log("🚀 Content API POST - Starting request handling");
      console.log("👤 Authenticated user:", {
        id: context.user.id,
        email: context.user.email,
      });

      // Parse request body
      const body: CreateContentRequest = await request.json();
      const {
        projectId,
        title,
        content,
        url,
        meta_description,
        focus_keywords = [],
        target_audience,
        content_type = "article",
        status = "draft",
      } = body;

      if (!projectId || !title || !content) {
        return new Response(
          JSON.stringify({
            error: "Project ID, title, and content are required",
            code: "INVALID_REQUEST",
            status: 400,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get project to determine team ownership
      const { data: project, error: projectError } = await context.supabase
        .from("projects")
        .select("team_id")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        return new Response(
          JSON.stringify({
            error: "Project not found",
            code: "PROJECT_NOT_FOUND",
            status: 404,
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate team access (requires member or higher)
      const teamAccess = await validateTeamAccess(
        context.supabase,
        context.user.id,
        project.team_id,
        "member"
      );
      if (!teamAccess.hasAccess) {
        return new Response(
          JSON.stringify({
            error:
              teamAccess.error || "Insufficient permissions to create content",
            code: "INSUFFICIENT_PERMISSIONS",
            status: 403,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Calculate SEO and readability scores
      const seoScore = calculateSEOScore(
        title,
        content,
        meta_description,
        focus_keywords
      );
      const readabilityScore = calculateReadabilityScore(content);
      const wordCount = content.split(/\s+/).length;

      // Create content record
      const { data: newContent, error: createError } = await context.supabase
        .from("content")
        .insert([
          {
            project_id: projectId,
            title,
            content,
            url,
            meta_description,
            focus_keywords,
            target_audience,
            content_type,
            status,
            seo_score: seoScore,
            readability_score: readabilityScore,
            word_count: wordCount,
            created_by: context.user.id,
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("❌ Content API: Failed to create content", {
          error: createError.message,
          code: createError.code,
        });
        return new Response(
          JSON.stringify({
            error: "Failed to create content",
            code: "CREATE_FAILED",
            details: createError.message,
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Content API: Content created successfully", {
        contentId: newContent.id,
        title: newContent.title,
        userId: context.user.id,
      });

      return createSuccessResponse(
        {
          content: newContent,
          scores: {
            seo: seoScore,
            readability: readabilityScore,
            wordCount,
          },
        },
        201
      );
    } catch (error) {
      console.error("❌ Content API: Unexpected error", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

// Enhanced GET endpoint with comprehensive authentication handling
export const GET = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      console.log("🚀 Content API GET - Starting request handling");
      console.log("👤 Authenticated user:", {
        id: context.user.id,
        email: context.user.email,
      });

      // Get query parameters
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get("projectId");
      const status = searchParams.get("status");
      const contentType = searchParams.get("content_type");
      const search = searchParams.get("search");
      const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
      const offset = parseInt(searchParams.get("offset") || "0");

      console.log("📋 Query parameters:", {
        projectId,
        status,
        contentType,
        search,
        limit,
        offset,
      });

      // Build query
      let query = context.supabase
        .from("content")
        .select(
          `
          *,
          project:projects(
            id,
            name,
            team_id,
            team:teams(id, name)
          )
        `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (projectId) {
        query = query.eq("project_id", projectId);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (contentType) {
        query = query.eq("content_type", contentType);
      }
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,content.ilike.%${search}%,meta_description.ilike.%${search}%`
        );
      }

      // Execute query
      const { data: content, error } = await query;

      if (error) {
        console.error("❌ Content API: Database query failed", {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        return new Response(
          JSON.stringify({
            error: "Failed to fetch content",
            code: "DATABASE_ERROR",
            details: error.message,
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Filter content based on team access
      const filteredContent = [];
      for (const item of content || []) {
        if (item.project?.team_id) {
          const teamAccess = await validateTeamAccess(
            context.supabase,
            context.user.id,
            item.project.team_id,
            "member"
          );
          if (teamAccess.hasAccess) {
            filteredContent.push(item);
          }
        }
      }

      console.log("✅ Content API: Successfully retrieved content", {
        totalItems: content?.length || 0,
        accessibleItems: filteredContent.length,
        userId: context.user.id,
      });

      return createSuccessResponse({
        content: filteredContent,
        pagination: {
          limit,
          offset,
          total: filteredContent.length,
        },
      });
    } catch (error) {
      console.error("❌ Content API: Unexpected error", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId: context.user.id,
      });

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          status: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
);

// Helper functions
function calculateSEOScore(
  title: string,
  content: string,
  metaDescription?: string,
  focusKeywords: string[] = []
): number {
  let score = 0;

  // Title optimization (0-25 points)
  if (title.length >= 30 && title.length <= 60) score += 10;
  if (title.length > 0) score += 5;
  if (
    focusKeywords.some(keyword =>
      title.toLowerCase().includes(keyword.toLowerCase())
    )
  )
    score += 10;

  // Meta description (0-15 points)
  if (metaDescription) {
    if (metaDescription.length >= 150 && metaDescription.length <= 160)
      score += 10;
    if (
      focusKeywords.some(keyword =>
        metaDescription.toLowerCase().includes(keyword.toLowerCase())
      )
    )
      score += 5;
  }

  // Content optimization (0-35 points)
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 300) score += 10;
  if (wordCount >= 1000) score += 5;

  // Keyword density
  focusKeywords.forEach(keyword => {
    const keywordCount = (
      content.toLowerCase().match(new RegExp(keyword.toLowerCase(), "g")) || []
    ).length;
    const density = (keywordCount / wordCount) * 100;
    if (density >= 0.5 && density <= 2.5) score += 5;
  });

  // Headings check
  const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
  if (headings.length >= 2) score += 10;

  // Internal/external links (0-15 points)
  const links = content.match(/<a[^>]*href=[^>]*>.*?<\/a>/gi) || [];
  if (links.length >= 2) score += 10;

  // Images (0-10 points)
  const images = content.match(/<img[^>]*>/gi) || [];
  if (images.length >= 1) score += 5;
  if (images.some(img => img.includes("alt="))) score += 5;

  return Math.min(score, 100);
}

function calculateReadabilityScore(content: string): number {
  // Simple Flesch Reading Ease approximation
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(word: string): number {
  const vowels = "aeiouy";
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]?.toLowerCase() || "");
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for silent 'e'
  if (word.endsWith("e") && count > 1) {
    count--;
  }

  return Math.max(1, count);
}
