import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, validateProjectAccess, createErrorResponse } from '@/lib/auth/session';

interface DashboardWidget {
  id: string;
  type: 'performance_chart' | 'prediction_graph' | 'competitor_comparison' | 
        'keyword_trends' | 'team_metrics' | 'content_pipeline' | 'roi_calculator' | 'custom_metric';
  title: string;
  config: {
    dataSource: string;
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'gauge';
    metrics?: string[];
    timeRange?: string;
    filters?: Record<string, any>;
    refreshInterval?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    colorScheme?: string;
  };
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
  };
  isVisible: boolean;
}

interface CreateDashboardRequest {
  projectId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: {
    gridSize: number;
    columns: number;
    gap: number;
  };
  settings: {
    isShared: boolean;
    isTemplate: boolean;
    refreshInterval: number;
    theme: 'light' | 'dark' | 'auto';
  };
}

interface DashboardFilters {
  projectId?: string;
  isShared?: boolean;
  isTemplate?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    // Parse request body
    const body: CreateDashboardRequest = await request.json();
    const { projectId, name, description, widgets = [], layout, settings } = body;

    if (!projectId || !name) {
      return createErrorResponse('Project ID and dashboard name are required', 400);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(projectId, 'member');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    const supabase = createClient();

    // Validate widget configurations
    const validatedWidgets = widgets.map(widget => {
      // Ensure required fields are present
      if (!widget.id || !widget.type || !widget.title) {
        throw new Error(`Invalid widget configuration: missing required fields`);
      }

      // Validate widget type
      const validTypes = [
        'performance_chart', 'prediction_graph', 'competitor_comparison',
        'keyword_trends', 'team_metrics', 'content_pipeline', 'roi_calculator', 'custom_metric'
      ];
      if (!validTypes.includes(widget.type)) {
        throw new Error(`Invalid widget type: ${widget.type}`);
      }

      // Validate position
      if (!widget.position || 
          typeof widget.position.x !== 'number' || 
          typeof widget.position.y !== 'number' ||
          typeof widget.position.width !== 'number' || 
          typeof widget.position.height !== 'number') {
        throw new Error(`Invalid widget position configuration`);
      }

      return widget;
    });

    // Create dashboard
    const dashboardData = {
      project_id: projectId,
      name,
      description,
      layout_config: layout,
      settings: settings,
      is_shared: settings.isShared || false,
      is_template: settings.isTemplate || false,
      created_by: user.id,
    };

    const { data: newDashboard, error: dashboardError } = await supabase
      .from('custom_dashboards')
      .insert(dashboardData)
      .select('*')
      .single();

    if (dashboardError) {
      console.error('Error creating dashboard:', dashboardError);
      return createErrorResponse('Failed to create dashboard', 500);
    }

    // Create dashboard widgets
    if (validatedWidgets.length > 0) {
      const widgetData = validatedWidgets.map(widget => ({
        dashboard_id: newDashboard.id,
        widget_id: widget.id,
        widget_type: widget.type,
        widget_title: widget.title,
        widget_config: widget.config,
        position_config: widget.position,
        is_visible: widget.isVisible !== false,
      }));

      const { error: widgetsError } = await supabase
        .from('dashboard_widgets')
        .insert(widgetData);

      if (widgetsError) {
        console.error('Error creating widgets:', widgetsError);
        // Clean up dashboard if widget creation fails
        await supabase
          .from('custom_dashboards')
          .delete()
          .eq('id', newDashboard.id);
        return createErrorResponse('Failed to create dashboard widgets', 500);
      }
    }

    // Get complete dashboard with widgets
    const { data: completeDashboard, error: fetchError } = await supabase
      .from('custom_dashboards')
      .select(`
        *,
        widgets:dashboard_widgets (*)
      `)
      .eq('id', newDashboard.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete dashboard:', fetchError);
      return createErrorResponse('Dashboard created but failed to fetch details', 500);
    }

    // Log dashboard creation
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'dashboard_created',
        event_data: {
          project_id: projectId,
          dashboard_id: newDashboard.id,
          dashboard_name: name,
          widget_count: validatedWidgets.length,
          is_shared: settings.isShared,
        },
      });

    return NextResponse.json({
      success: true,
      dashboard: completeDashboard,
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createErrorResponse(message, 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters: DashboardFilters = {
      projectId: searchParams.get('projectId') || undefined,
      isShared: searchParams.get('isShared') === 'true' ? true : undefined,
      isTemplate: searchParams.get('isTemplate') === 'true' ? true : undefined,
      search: searchParams.get('search') || undefined,
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 100),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const supabase = createClient();

    // Build query
    let query = supabase
      .from('custom_dashboards')
      .select(`
        *,
        project:projects (
          id,
          name,
          team_id
        ),
        creator:auth.users!created_by (
          email,
          raw_user_meta_data
        ),
        widgets:dashboard_widgets (
          id,
          widget_id,
          widget_type,
          widget_title,
          widget_config,
          position_config,
          is_visible
        )
      `);

    // Apply filters
    if (filters.projectId) {
      // Validate project access
      const hasAccess = await validateProjectAccess(filters.projectId, 'viewer');
      if (!hasAccess) {
        return createErrorResponse('Insufficient permissions', 403);
      }
      query = query.eq('project_id', filters.projectId);
    } else {
      // Get user's accessible projects
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (!teamMemberships?.length) {
        return NextResponse.json({
          dashboards: [],
          total: 0,
          filters,
        });
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .in('team_id', teamIds);

      if (!projects?.length) {
        return NextResponse.json({
          dashboards: [],
          total: 0,
          filters,
        });
      }

      const projectIds = projects.map(p => p.id);
      query = query.in('project_id', projectIds);
    }

    if (filters.isShared !== undefined) {
      query = query.eq('is_shared', filters.isShared);
    }

    if (filters.isTemplate !== undefined) {
      query = query.eq('is_template', filters.isTemplate);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Get total count
    const { count } = await query;

    // Apply pagination and ordering
    query = query
      .order('updated_at', { ascending: false })
      .range(filters.offset, filters.offset + filters.limit - 1);

    const { data: dashboards, error } = await query;

    if (error) {
      console.error('Error fetching dashboards:', error);
      return createErrorResponse('Failed to fetch dashboards', 500);
    }

    // Transform the data to match frontend expectations
    const transformedDashboards = (dashboards || []).map(dashboard => ({
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      widgets: (dashboard.widgets || []).map((widget: any) => ({
        id: widget.widget_id,
        type: widget.widget_type,
        title: widget.widget_title,
        config: widget.widget_config || {},
        position: widget.position_config || { x: 0, y: 0, width: 4, height: 3 },
        isVisible: widget.is_visible !== false,
      })),
      layout: dashboard.layout_config || {
        gridSize: 8,
        columns: 12,
        gap: 16,
      },
      settings: dashboard.settings || {
        isShared: dashboard.is_shared,
        isTemplate: dashboard.is_template,
        refreshInterval: 300,
        theme: 'auto',
      },
      permissions: {
        canEdit: dashboard.created_by === user.id,
        canShare: dashboard.created_by === user.id,
        canDelete: dashboard.created_by === user.id,
      },
      project: dashboard.project,
      creator: dashboard.creator,
      created_at: dashboard.created_at,
      updated_at: dashboard.updated_at,
    }));

    return NextResponse.json({
      dashboards: transformedDashboards,
      total: count || 0,
      filters,
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}