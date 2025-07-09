import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  createClient,
  validateProjectAccess,
  createErrorResponse,
} from "@/lib/auth/session";

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

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

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
      return createErrorResponse(
        "Project ID, title, and content are required",
        400
      );
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, "member");
    if (!hasAccess) {
      return createErrorResponse("Insufficient permissions", 403);
    }

    const supabase = await createClient();

    // Calculate initial SEO scores
    const seoScore = calculateSEOScore(
      title,
      content,
      meta_description,
      focus_keywords
    );
    const readabilityScore = calculateReadabilityScore(content);
    const wordCount = content
      .split(/\s+/)
      .filter(word => word.length > 0).length;

    // Create content item
    const { data: newContent, error: createError } = await supabase
      .from("content_items")
      .insert({
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
        created_by: user.id,
      })
      .select("*")
      .single();

    if (createError) {
      console.error("Error creating content:", createError);
      return createErrorResponse("Failed to create content", 500);
    }

    // Log content creation
    await supabase.from("user_events").insert({
      user_id: user.id,
      event_type: "content_created",
      event_data: {
        content_id: newContent.id,
        project_id: projectId,
        title,
        content_type,
      },
    });

    // Trigger initial content analysis
    try {
      await supabase.functions.invoke("content-analysis", {
        body: {
          contentId: newContent.id,
          analysisType: "full",
        },
      });
    } catch (error) {
      console.error("Error triggering content analysis:", error);
      // Don't fail the request if analysis fails
    }

    return NextResponse.json(
      {
        success: true,
        content: newContent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: ContentFilters = {
      limit: Math.min(parseInt(searchParams.get("limit") || "50"), 100),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const projectId = searchParams.get("projectId");
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const contentType = searchParams.get("content_type");
    const search = searchParams.get("search");

    if (projectId) filters.projectId = projectId;
    if (status) filters.status = status;
    if (contentType) filters.content_type = contentType;
    if (search) filters.search = search;

    const supabase = await createClient();

    // Build query
    let query = supabase.from("content_items").select(`
        id,
        title,
        content,
        url,
        meta_description,
        focus_keywords,
        target_audience,
        content_type,
        status,
        seo_score,
        readability_score,
        word_count,
        created_at,
        updated_at,
        created_by,
        project:projects (
          id,
          name,
          team_id
        )
      `);

    // Apply filters
    if (filters.projectId) {
      // Validate project access
      const hasAccess = await validateProjectAccess(
        filters.projectId,
        "viewer"
      );
      if (!hasAccess) {
        return createErrorResponse("Insufficient permissions", 403);
      }
      query = query.eq("project_id", filters.projectId);
    } else if (teamId) {
      // Filter by team - get projects for this team
      const { data: teamProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("team_id", teamId);

      if (!teamProjects?.length) {
        return NextResponse.json({
          content: [],
          total: 0,
          filters,
        });
      }

      const projectIds = teamProjects.map(p => p.id);
      query = query.in("project_id", projectIds);
    } else {
      // Get user's accessible projects
      const { data: teamMemberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

      if (!teamMemberships?.length) {
        return NextResponse.json({
          content: [],
          total: 0,
          filters,
        });
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .in("team_id", teamIds);

      if (!projects?.length) {
        return NextResponse.json({
          content: [],
          total: 0,
          filters,
        });
      }

      const projectIds = projects.map(p => p.id);
      query = query.in("project_id", projectIds);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.content_type) {
      query = query.eq("content_type", filters.content_type);
    }

    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
      );
    }

    // Get total count
    const { count } = await query;

    // Apply pagination and ordering
    query = query
      .order("updated_at", { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    const { data: content, error } = await query;

    if (error) {
      console.error("Error fetching content:", error);
      return createErrorResponse("Failed to fetch content", 500);
    }

    return NextResponse.json({
      content: content || [],
      total: count || 0,
      filters,
    });
  } catch (error) {
    console.error("API error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

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
