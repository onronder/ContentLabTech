import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, validateProjectAccess, createErrorResponse } from '@/lib/auth/session';

interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  widgets?: Array<{
    id: string;
    type: string;
    title: string;
    config: Record<string, unknown>;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex?: number;
    };
    isVisible: boolean;
  }>;
  layout?: {
    gridSize: number;
    columns: number;
    gap: number;
  };
  settings?: {
    isShared: boolean;
    isTemplate: boolean;
    refreshInterval: number;
    theme: 'light' | 'dark' | 'auto';
  };
}

interface WidgetData {
  id: string;
  widget_id: string;
  widget_type: string;
  widget_title: string;
  widget_config: Record<string, unknown>;
  position_config: Record<string, unknown>;
  is_visible: boolean;
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

    const dashboardId = params.id;
    if (!dashboardId) {
      return createErrorResponse('Dashboard ID is required', 400);
    }

    const supabase = createClient();

    // Get dashboard with related data
    const { data: dashboard, error } = await supabase
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
          is_visible,
          created_at,
          updated_at
        )
      `)
      .eq('id', dashboardId)
      .single();

    if (error || !dashboard) {
      return createErrorResponse('Dashboard not found', 404);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(dashboard.project_id, 'viewer');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Check if user can edit
    const canEdit = dashboard.created_by === user.id || dashboard.is_shared;
    
    // Transform dashboard data
    const transformedDashboard = {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      widgets: (dashboard.widgets || []).map((widget: WidgetData) => ({
        id: widget.widget_id,
        type: widget.widget_type,
        title: widget.widget_title,
        config: widget.widget_config || {},
        position: widget.position_config || { x: 0, y: 0, width: 4, height: 3 },
        isVisible: widget.is_visible !== false,
        dbId: widget.id, // Keep database ID for updates
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
        canEdit,
        canShare: dashboard.created_by === user.id,
        canDelete: dashboard.created_by === user.id,
      },
      project: dashboard.project,
      creator: dashboard.creator,
      created_at: dashboard.created_at,
      updated_at: dashboard.updated_at,
    };

    // Get dashboard usage statistics
    const { data: usageStats } = await supabase
      .from('user_events')
      .select('created_at')
      .eq('event_type', 'dashboard_viewed')
      .contains('event_data', { dashboard_id: dashboardId })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return NextResponse.json({
      dashboard: transformedDashboard,
      stats: {
        widgetCount: dashboard.widgets?.length || 0,
        viewsLast30Days: usageStats?.length || 0,
        lastUpdated: dashboard.updated_at,
        isShared: dashboard.is_shared,
      },
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

    const dashboardId = params.id;
    if (!dashboardId) {
      return createErrorResponse('Dashboard ID is required', 400);
    }

    // Parse request body
    const body: UpdateDashboardRequest = await request.json();

    const supabase = createClient();

    // Get existing dashboard to verify access
    const { data: existingDashboard, error: fetchError } = await supabase
      .from('custom_dashboards')
      .select('project_id, created_by, is_shared')
      .eq('id', dashboardId)
      .single();

    if (fetchError || !existingDashboard) {
      return createErrorResponse('Dashboard not found', 404);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(existingDashboard.project_id, 'member');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Check if user can edit (owner or shared dashboard)
    const canEdit = existingDashboard.created_by === user.id || existingDashboard.is_shared;
    if (!canEdit) {
      return createErrorResponse('Insufficient permissions to edit dashboard', 403);
    }

    // Prepare dashboard update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.layout !== undefined) updateData.layout_config = body.layout;
    if (body.settings !== undefined) {
      updateData.settings = body.settings;
      updateData.is_shared = body.settings.isShared;
      updateData.is_template = body.settings.isTemplate;
    }

    // Update dashboard
    const { error: updateError } = await supabase
      .from('custom_dashboards')
      .update(updateData)
      .eq('id', dashboardId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating dashboard:', updateError);
      return createErrorResponse('Failed to update dashboard', 500);
    }

    // Update widgets if provided
    if (body.widgets) {
      // Delete existing widgets
      await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('dashboard_id', dashboardId);

      // Insert new widgets
      if (body.widgets.length > 0) {
        const widgetData = body.widgets.map(widget => ({
          dashboard_id: dashboardId,
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
          console.error('Error updating widgets:', widgetsError);
          return createErrorResponse('Failed to update dashboard widgets', 500);
        }
      }
    }

    // Log dashboard update
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'dashboard_updated',
        event_data: {
          dashboard_id: dashboardId,
          project_id: existingDashboard.project_id,
          changes: Object.keys(body),
          widget_count: body.widgets?.length,
        },
      });

    // Get updated dashboard with widgets
    const { data: completeDashboard, error: completeError } = await supabase
      .from('custom_dashboards')
      .select(`
        *,
        widgets:dashboard_widgets (
          id,
          widget_id,
          widget_type,
          widget_title,
          widget_config,
          position_config,
          is_visible
        )
      `)
      .eq('id', dashboardId)
      .single();

    if (completeError) {
      console.error('Error fetching updated dashboard:', completeError);
      return createErrorResponse('Dashboard updated but failed to fetch details', 500);
    }

    // Transform response
    const transformedDashboard = {
      id: completeDashboard.id,
      name: completeDashboard.name,
      description: completeDashboard.description,
      widgets: (completeDashboard.widgets || []).map((widget: WidgetData) => ({
        id: widget.widget_id,
        type: widget.widget_type,
        title: widget.widget_title,
        config: widget.widget_config || {},
        position: widget.position_config || { x: 0, y: 0, width: 4, height: 3 },
        isVisible: widget.is_visible !== false,
      })),
      layout: completeDashboard.layout_config || {
        gridSize: 8,
        columns: 12,
        gap: 16,
      },
      settings: completeDashboard.settings || {
        isShared: completeDashboard.is_shared,
        isTemplate: completeDashboard.is_template,
        refreshInterval: 300,
        theme: 'auto',
      },
      permissions: {
        canEdit: completeDashboard.created_by === user.id || completeDashboard.is_shared,
        canShare: completeDashboard.created_by === user.id,
        canDelete: completeDashboard.created_by === user.id,
      },
    };

    return NextResponse.json({
      success: true,
      dashboard: transformedDashboard,
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

    const dashboardId = params.id;
    if (!dashboardId) {
      return createErrorResponse('Dashboard ID is required', 400);
    }

    const supabase = createClient();

    // Get dashboard to verify access
    const { data: dashboard, error: fetchError } = await supabase
      .from('custom_dashboards')
      .select('project_id, created_by, name')
      .eq('id', dashboardId)
      .single();

    if (fetchError || !dashboard) {
      return createErrorResponse('Dashboard not found', 404);
    }

    // Validate project access and ownership
    const hasAccess = await validateProjectAccess(dashboard.project_id, 'member');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Only creator can delete dashboard
    if (dashboard.created_by !== user.id) {
      return createErrorResponse('Only dashboard creator can delete dashboard', 403);
    }

    // Delete widgets first (cascade should handle this, but be explicit)
    await supabase
      .from('dashboard_widgets')
      .delete()
      .eq('dashboard_id', dashboardId);

    // Delete the dashboard
    const { error: deleteError } = await supabase
      .from('custom_dashboards')
      .delete()
      .eq('id', dashboardId);

    if (deleteError) {
      console.error('Error deleting dashboard:', deleteError);
      return createErrorResponse('Failed to delete dashboard', 500);
    }

    // Log dashboard deletion
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'dashboard_deleted',
        event_data: {
          dashboard_id: dashboardId,
          project_id: dashboard.project_id,
          dashboard_name: dashboard.name,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Dashboard deleted successfully',
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle dashboard actions (duplicate, share, etc.)
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const dashboardId = params.id;
    const { action, projectId } = await request.json();

    if (!dashboardId || !action) {
      return createErrorResponse('Dashboard ID and action are required', 400);
    }

    const supabase = createClient();

    let result;

    switch (action) {
      case 'duplicate': {
        if (!projectId) {
          return createErrorResponse('Project ID is required for duplication', 400);
        }

        // Validate project access
        const hasAccess = await validateProjectAccess(projectId, 'member');
        if (!hasAccess) {
          return createErrorResponse('Insufficient permissions', 403);
        }

        // Get original dashboard
        const { data: originalDashboard, error: fetchError } = await supabase
          .from('custom_dashboards')
          .select(`
            *,
            widgets:dashboard_widgets (*)
          `)
          .eq('id', dashboardId)
          .single();

        if (fetchError || !originalDashboard) {
          return createErrorResponse('Dashboard not found', 404);
        }

        // Create duplicate dashboard
        const duplicateData = {
          project_id: projectId,
          name: `${originalDashboard.name} (Copy)`,
          description: originalDashboard.description,
          layout_config: originalDashboard.layout_config,
          settings: originalDashboard.settings,
          is_shared: false, // Duplicates are private by default
          is_template: false,
          created_by: user.id,
        };

        const { data: newDashboard, error: createError } = await supabase
          .from('custom_dashboards')
          .insert(duplicateData)
          .select('*')
          .single();

        if (createError) {
          console.error('Error duplicating dashboard:', createError);
          return createErrorResponse('Failed to duplicate dashboard', 500);
        }

        // Duplicate widgets
        if (originalDashboard.widgets?.length > 0) {
          const duplicateWidgets = originalDashboard.widgets.map((widget: WidgetData) => ({
            dashboard_id: newDashboard.id,
            widget_id: widget.widget_id,
            widget_type: widget.widget_type,
            widget_title: widget.widget_title,
            widget_config: widget.widget_config,
            position_config: widget.position_config,
            is_visible: widget.is_visible,
          }));

          await supabase
            .from('dashboard_widgets')
            .insert(duplicateWidgets);
        }

        result = {
          dashboardId: newDashboard.id,
          message: 'Dashboard duplicated successfully',
        };

        // Log duplication
        await supabase
          .from('user_events')
          .insert({
            user_id: user.id,
            event_type: 'dashboard_duplicated',
            event_data: {
              original_dashboard_id: dashboardId,
              new_dashboard_id: newDashboard.id,
              project_id: projectId,
            },
          });

        break;
      }

      case 'export': {
        // Export dashboard configuration
        const { data: dashboard, error: fetchError } = await supabase
          .from('custom_dashboards')
          .select(`
            *,
            widgets:dashboard_widgets (*)
          `)
          .eq('id', dashboardId)
          .single();

        if (fetchError || !dashboard) {
          return createErrorResponse('Dashboard not found', 404);
        }

        // Validate access
        const hasAccess = await validateProjectAccess(dashboard.project_id, 'viewer');
        if (!hasAccess) {
          return createErrorResponse('Insufficient permissions', 403);
        }

        // Create exportable configuration
        const exportConfig = {
          name: dashboard.name,
          description: dashboard.description,
          layout: dashboard.layout_config,
          settings: dashboard.settings,
          widgets: (dashboard.widgets || []).map((widget: WidgetData) => ({
            id: widget.widget_id,
            type: widget.widget_type,
            title: widget.widget_title,
            config: widget.widget_config,
            position: widget.position_config,
            isVisible: widget.is_visible,
          })),
          exportedAt: new Date().toISOString(),
          exportedBy: user.email,
        };

        result = {
          config: exportConfig,
          message: 'Dashboard exported successfully',
        };

        break;
      }

      default:
        return createErrorResponse('Invalid action specified', 400);
    }

    return NextResponse.json({
      success: true,
      action,
      dashboardId,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}