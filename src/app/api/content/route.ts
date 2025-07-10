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
      const { data: newContent, error: createError } = await context.supabase
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
          created_by: context.user.id,
        })
        .select("*")
        .single();

      if (createError) {
        console.error("Error creating content:", createError);
        return new Response(
          JSON.stringify({
            error: "Failed to create content",
            code: "CREATE_CONTENT_ERROR",
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Log content creation
      await context.supabase.from("user_events").insert({
        user_id: context.user.id,
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
        await context.supabase.functions.invoke("content-analysis", {
          body: {
            contentId: newContent.id,
            analysisType: "full",
          },
        });
      } catch (error) {
        console.error("Error triggering content analysis:", error);
        // Don't fail the request if analysis fails
      }

      return createSuccessResponse(
        {
          content: newContent,
        },
        201
      );
    } catch (error) {
      console.error("API error:", error);
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

export const GET = withApiAuth(
  async (request: NextRequest, context: AuthContext) => {
    try {
      console.log("🚀 Content API GET - Starting request handling");
      console.log("👤 Authenticated user:", {
        id: context.user.id,
        email: context.user.email,
      });

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

      // Build query
      let query = context.supabase.from("content_items").select(`
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
        // Get project to validate team access
        const { data: project, error: projectError } = await context.supabase
          .from("projects")
          .select("team_id")
          .eq("id", filters.projectId)
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
                teamAccess.error || "Insufficient permissions to view content",
              code: "INSUFFICIENT_PERMISSIONS",
              status: 403,
            }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }

        query = query.eq("project_id", filters.projectId);
      } else if (teamId) {
        // Filter by team - get projects for this team
        const { data: teamProjects } = await context.supabase
          .from("projects")
          .select("id")
          .eq("team_id", teamId);

        if (!teamProjects?.length) {
          return createSuccessResponse({
            content: [],
            total: 0,
            filters,
          });
        }

        const projectIds = teamProjects.map(p => p.id);
        query = query.in("project_id", projectIds);
      } else {
        // Get user's accessible projects
        const { data: teamMemberships } = await context.supabase
          .from("team_members")
          .select("team_id")
          .eq("user_id", context.user.id);

        if (!teamMemberships?.length) {
          return createSuccessResponse({
            content: [],
            total: 0,
            filters,
          });
        }

        const teamIds = teamMemberships.map(tm => tm.team_id);
        const { data: projects } = await context.supabase
          .from("projects")
          .select("id")
          .in("team_id", teamIds);

        if (!projects?.length) {
          return createSuccessResponse({
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
        return new Response(
          JSON.stringify({
            error: "Failed to fetch content",
            code: "FETCH_CONTENT_ERROR",
            status: 500,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // If no content found and fallback is requested, return mock data
      if (
        (!content || content.length === 0) &&
        searchParams.get("fallback") === "team"
      ) {
        console.log("📄 No content found, returning mock data for fallback");

        const mockContent = generateMockContentData(
          teamId || "mock-team",
          projectId || "mock-project"
        );

        return createSuccessResponse({
          content: mockContent,
          total: mockContent.length,
          filters,
          fallback: true,
        });
      }

      return createSuccessResponse({
        content: content || [],
        total: count || 0,
        filters,
      });
    } catch (error) {
      console.error("API error:", error);
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

/**
 * Generate mock content data for testing and fallback
 */
function generateMockContentData(teamId: string, projectId: string) {
  const mockContent = [
    {
      id: "mock-content-1",
      project_id: projectId,
      title: "Getting Started with SEO Best Practices",
      content:
        "Search engine optimization is crucial for driving organic traffic to your website. This comprehensive guide covers the fundamentals of SEO, including keyword research, on-page optimization, and technical SEO considerations.",
      url: "https://example.com/seo-guide",
      content_type: "article",
      status: "published",
      seo_score: 85,
      readability_score: 78,
      word_count: 1250,
      meta_title: "Complete SEO Guide for Beginners | Best Practices",
      meta_description:
        "Learn essential SEO techniques to improve your website's search rankings and drive more organic traffic.",
      focus_keywords: ["SEO", "search engine optimization", "organic traffic"],
      published_at: new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: "mock-user-1",
      project: {
        id: projectId,
        name: "Marketing Website",
        description: "Main marketing website project",
      },
      stats: {
        views: 1542,
        engagement: 3.8,
        conversions: 12,
        lastAnalyzed: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    },
    {
      id: "mock-content-2",
      project_id: projectId,
      title: "10 Content Marketing Strategies That Work",
      content:
        "Content marketing is more than just creating blog posts. It's about creating valuable, relevant content that resonates with your audience and drives meaningful engagement.",
      url: "https://example.com/content-marketing",
      content_type: "blog_post",
      status: "published",
      seo_score: 92,
      readability_score: 85,
      word_count: 1800,
      meta_title: "10 Proven Content Marketing Strategies | Ultimate Guide",
      meta_description:
        "Discover 10 effective content marketing strategies that will help you engage your audience and grow your business.",
      focus_keywords: [
        "content marketing",
        "marketing strategies",
        "audience engagement",
      ],
      published_at: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: "mock-user-2",
      project: {
        id: projectId,
        name: "Marketing Website",
        description: "Main marketing website project",
      },
      stats: {
        views: 2341,
        engagement: 4.2,
        conversions: 18,
        lastAnalyzed: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    },
    {
      id: "mock-content-3",
      project_id: projectId,
      title: "How to Improve Your Website's Core Web Vitals",
      content:
        "Core Web Vitals are essential metrics that measure the user experience of your website. Learn how to optimize LCP, FID, and CLS for better performance.",
      url: "https://example.com/core-web-vitals",
      content_type: "article",
      status: "draft",
      seo_score: 78,
      readability_score: 82,
      word_count: 950,
      meta_title: "Core Web Vitals Optimization Guide | Performance Tips",
      meta_description:
        "Learn how to improve your website's Core Web Vitals and boost your search rankings with our comprehensive guide.",
      focus_keywords: ["core web vitals", "website performance", "page speed"],
      published_at: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      created_by: "mock-user-1",
      project: {
        id: projectId,
        name: "Marketing Website",
        description: "Main marketing website project",
      },
      stats: {
        views: 0,
        engagement: 0,
        conversions: 0,
        lastAnalyzed: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    },
  ];

  return mockContent;
}
