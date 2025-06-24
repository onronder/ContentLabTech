import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, validateProjectAccess, createErrorResponse } from '@/lib/auth/session';

interface UpdateContentRequest {
  title?: string;
  content?: string;
  url?: string;
  meta_description?: string;
  focus_keywords?: string[];
  target_audience?: string;
  content_type?: string;
  status?: 'draft' | 'published' | 'archived';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const contentId = params.id;
    if (!contentId) {
      return createErrorResponse('Content ID is required', 400);
    }

    const supabase = createClient();

    // Get content with project information
    const { data: content, error } = await supabase
      .from('content_items')
      .select(`
        *,
        project:projects (
          id,
          name,
          team_id,
          target_keywords,
          description
        )
      `)
      .eq('id', contentId)
      .single();

    if (error || !content) {
      return createErrorResponse('Content not found', 404);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(content.project_id, 'viewer');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Get recent analytics data
    const { data: analytics } = await supabase
      .from('content_analytics')
      .select('*')
      .eq('content_id', contentId)
      .order('date', { ascending: false })
      .limit(30);

    // Get recent analysis results
    const { data: analysisResults } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('content_id', contentId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recommendations
    const { data: recommendations } = await supabase
      .from('content_recommendations')
      .select('*')
      .eq('content_id', contentId)
      .eq('status', 'pending')
      .order('impact_score', { ascending: false });

    return NextResponse.json({
      content,
      analytics: analytics || [],
      analysisResults: analysisResults || [],
      recommendations: recommendations || [],
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const contentId = params.id;
    if (!contentId) {
      return createErrorResponse('Content ID is required', 400);
    }

    // Parse request body
    const body: UpdateContentRequest = await request.json();

    const supabase = createClient();

    // Get existing content to verify access
    const { data: existingContent, error: fetchError } = await supabase
      .from('content_items')
      .select('project_id')
      .eq('id', contentId)
      .single();

    if (fetchError || !existingContent) {
      return createErrorResponse('Content not found', 404);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(existingContent.project_id, 'member');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Recalculate scores if content changed
    if (body.content || body.title || body.meta_description || body.focus_keywords) {
      const { data: fullContent } = await supabase
        .from('content_items')
        .select('*')
        .eq('id', contentId)
        .single();

      if (fullContent) {
        const title = body.title || fullContent.title;
        const content = body.content || fullContent.content;
        const metaDescription = body.meta_description || fullContent.meta_description;
        const focusKeywords = body.focus_keywords || fullContent.focus_keywords || [];

        updateData.seo_score = calculateSEOScore(title, content, metaDescription, focusKeywords);
        updateData.readability_score = calculateReadabilityScore(content);
        updateData.word_count = content.split(/\s+/).filter((word: string) => word.length > 0).length;
      }
    }

    // Update content
    const { data: updatedContent, error: updateError } = await supabase
      .from('content_items')
      .update(updateData)
      .eq('id', contentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating content:', updateError);
      return createErrorResponse('Failed to update content', 500);
    }

    // Log content update
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'content_updated',
        event_data: {
          content_id: contentId,
          project_id: existingContent.project_id,
          changes: Object.keys(body),
        },
      });

    // Trigger re-analysis if significant changes
    if (body.content || body.title || body.focus_keywords) {
      try {
        await supabase.functions.invoke('content-analysis', {
          body: {
            contentId,
            analysisType: 'full',
          },
        });
      } catch (error) {
        console.error('Error triggering content re-analysis:', error);
      }
    }

    return NextResponse.json({
      success: true,
      content: updatedContent,
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const contentId = params.id;
    if (!contentId) {
      return createErrorResponse('Content ID is required', 400);
    }

    const supabase = createClient();

    // Get content to verify access
    const { data: content, error: fetchError } = await supabase
      .from('content_items')
      .select('project_id, title')
      .eq('id', contentId)
      .single();

    if (fetchError || !content) {
      return createErrorResponse('Content not found', 404);
    }

    // Validate project access (requires admin or owner role)
    const hasAccess = await validateProjectAccess(content.project_id, 'admin');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Delete related data first (cascade will handle most, but be explicit)
    await Promise.all([
      supabase.from('content_analytics').delete().eq('content_id', contentId),
      supabase.from('analysis_results').delete().eq('content_id', contentId),
      supabase.from('content_recommendations').delete().eq('content_id', contentId),
      supabase.from('optimization_sessions').delete().eq('content_id', contentId),
    ]);

    // Delete the content item
    const { error: deleteError } = await supabase
      .from('content_items')
      .delete()
      .eq('id', contentId);

    if (deleteError) {
      console.error('Error deleting content:', deleteError);
      return createErrorResponse('Failed to delete content', 500);
    }

    // Log content deletion
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'content_deleted',
        event_data: {
          content_id: contentId,
          project_id: content.project_id,
          title: content.title,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Helper functions (same as in route.ts)
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
  if (focusKeywords.some(keyword => title.toLowerCase().includes(keyword.toLowerCase()))) score += 10;
  
  // Meta description (0-15 points)
  if (metaDescription) {
    if (metaDescription.length >= 150 && metaDescription.length <= 160) score += 10;
    if (focusKeywords.some(keyword => metaDescription.toLowerCase().includes(keyword.toLowerCase()))) score += 5;
  }
  
  // Content optimization (0-35 points)
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 300) score += 10;
  if (wordCount >= 1000) score += 5;
  
  // Keyword density
  focusKeywords.forEach(keyword => {
    const keywordCount = (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
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
  if (images.some(img => img.includes('alt='))) score += 5;
  
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
  
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function countSyllables(word: string): number {
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i].toLowerCase());
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  // Adjust for silent 'e'
  if (word.endsWith('e') && count > 1) {
    count--;
  }
  
  return Math.max(1, count);
}