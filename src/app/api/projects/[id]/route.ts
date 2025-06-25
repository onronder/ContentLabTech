import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, validateProjectAccess, createErrorResponse } from '@/lib/auth/session';

interface UpdateProjectRequest {
  name?: string;
  description?: string;
  website_url?: string;
  target_keywords?: string[];
  target_audience?: string;
  content_goals?: string[];
  competitors?: string[];
  status?: 'active' | 'inactive' | 'archived';
  settings?: Record<string, unknown>;
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

    const projectId = params.id;
    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, 'viewer');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    const supabase = createClient();

    // Get project details
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        team:teams (
          id,
          name,
          description,
          owner_id
        )
      `)
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return createErrorResponse('Project not found', 404);
    }

    // Get project statistics
    const [
      { count: contentCount },
      { count: competitorCount },
      { data: recentContent },
      { data: competitors },
      { data: recentAnalytics }
    ] = await Promise.all([
      // Content count
      supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId),

      // Competitor count
      supabase
        .from('competitors')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('is_active', true),

      // Recent content
      supabase
        .from('content_items')
        .select('id, title, status, created_at, seo_score')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5),

      // Active competitors
      supabase
        .from('competitors')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),

      // Recent analytics
      supabase
        .from('content_analytics')
        .select(`
          *,
          content:content_items (title, url)
        `)
        .in('content_id', (await supabase
          .from('content_items')
          .select('id')
          .eq('project_id', projectId)
        ).data?.map(c => c.id) || [])
        .order('date', { ascending: false })
        .limit(10)
    ]);

    // Calculate project performance metrics
    const totalPageviews = recentAnalytics?.reduce((sum, a) => sum + (a.pageviews || 0), 0) || 0;
    const avgSeoScore = recentContent?.length > 0 
      ? recentContent.reduce((sum, c) => sum + (c.seo_score || 0), 0) / recentContent.length 
      : 0;

    // Get team member role for current user
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', project.team_id)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      project: {
        ...project,
        userRole: membership?.role || 'viewer',
      },
      stats: {
        contentCount: contentCount || 0,
        competitorCount: competitorCount || 0,
        totalPageviews,
        avgSeoScore: Math.round(avgSeoScore),
        lastActivity: recentContent?.[0]?.created_at || project.updated_at,
      },
      recentContent: recentContent || [],
      competitors: competitors || [],
      recentAnalytics: recentAnalytics || [],
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

    const projectId = params.id;
    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    // Validate project access (requires admin role)
    const hasAccess = await validateProjectAccess(projectId, 'admin');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Parse request body
    const body: UpdateProjectRequest = await request.json();

    const supabase = createClient();

    // Prepare update data
    const updateData: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select(`
        *,
        team:teams (
          id,
          name,
          description
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      return createErrorResponse('Failed to update project', 500);
    }

    // Update competitors if provided
    if (body.competitors) {
      // First, deactivate existing competitors
      await supabase
        .from('competitors')
        .update({ is_active: false })
        .eq('project_id', projectId);

      // Add new competitors
      if (body.competitors.length > 0) {
        const competitorData = body.competitors.map(url => ({
          project_id: projectId,
          competitor_url: url,
          competitor_name: extractDomainName(url),
          is_active: true,
          added_by: user.id,
        }));

        await supabase
          .from('competitors')
          .upsert(competitorData, {
            onConflict: 'project_id,competitor_url',
            ignoreDuplicates: false,
          });
      }
    }

    // Log project update
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'project_updated',
        event_data: {
          project_id: projectId,
          changes: Object.keys(body),
        },
      });

    return NextResponse.json({
      success: true,
      project: updatedProject,
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

    const projectId = params.id;
    if (!projectId) {
      return createErrorResponse('Project ID is required', 400);
    }

    // Validate project access (requires owner role)
    const hasAccess = await validateProjectAccess(projectId, 'owner');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions - only team owners can delete projects', 403);
    }

    const supabase = createClient();

    // Get project details for logging
    const { data: project } = await supabase
      .from('projects')
      .select('name, team_id')
      .eq('id', projectId)
      .single();

    // Delete related data (in proper order due to foreign key constraints)
    await Promise.all([
      // Delete content analytics
      supabase.rpc('delete_project_analytics', { project_id: projectId }),
      
      // Delete content recommendations
      supabase.rpc('delete_project_recommendations', { project_id: projectId }),
      
      // Delete analysis results
      supabase.rpc('delete_project_analysis_results', { project_id: projectId }),
      
      // Delete optimization sessions
      supabase.rpc('delete_project_optimization_sessions', { project_id: projectId }),
    ]);

    // Delete content items
    await supabase
      .from('content_items')
      .delete()
      .eq('project_id', projectId);

    // Delete competitors
    await supabase
      .from('competitors')
      .delete()
      .eq('project_id', projectId);

    // Delete keyword opportunities
    await supabase
      .from('keyword_opportunities')
      .delete()
      .eq('project_id', projectId);

    // Finally, delete the project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return createErrorResponse('Failed to delete project', 500);
    }

    // Log project deletion
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'project_deleted',
        event_data: {
          project_id: projectId,
          project_name: project?.name,
          team_id: project?.team_id,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Helper function to extract domain name from URL
function extractDomainName(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    // If URL parsing fails, return the original string cleaned up
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}