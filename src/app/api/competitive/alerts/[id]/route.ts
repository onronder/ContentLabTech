import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, validateProjectAccess, createErrorResponse } from '@/lib/auth/session';

interface UpdateAlertRequest {
  is_active?: boolean;
  threshold?: number;
  frequency?: 'immediate' | 'daily' | 'weekly';
  alert_config?: Record<string, unknown>;
}

interface AlertData {
  id: string;
  alert_type: string;
  threshold?: number;
  keyword?: string;
  project_id: string;
}

interface TestAlertResult {
  success: boolean;
  wouldTrigger?: boolean;
  testData?: Record<string, unknown>;
  threshold?: number;
  alertType?: string;
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { id: alertId } = await params;
    if (!alertId) {
      return createErrorResponse('Alert ID is required', 400);
    }

    const supabase = createClient();

    // Get alert with related data
    const { data: alert, error } = await supabase
      .from('competitor_alerts')
      .select(`
        *,
        competitor:competitors (
          id,
          competitor_name,
          competitor_url
        ),
        project:projects (
          id,
          name,
          team_id
        )
      `)
      .eq('id', alertId)
      .single();

    if (error || !alert) {
      return createErrorResponse('Alert not found', 404);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(alert.project_id, 'viewer');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Get alert history (last 30 days)
    const { data: history } = await supabase
      .from('user_events')
      .select('*')
      .eq('event_type', 'alert_triggered')
      .contains('event_data', { alert_id: alertId })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    // Get recent monitoring data related to this alert
    let monitoringData = {};
    if (alert.competitor_id) {
      const { data: recentAnalytics } = await supabase
        .from('competitor_analytics')
        .select('*')
        .eq('project_id', alert.project_id)
        .eq('competitor_url', alert.competitor?.competitor_url)
        .gte('analysis_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('analysis_date', { ascending: false })
        .limit(10);

      monitoringData = {
        recentAnalytics: recentAnalytics || [],
        lastUpdated: recentAnalytics?.[0]?.analysis_date || null,
      };
    }

    return NextResponse.json({
      alert,
      history: history || [],
      monitoring: monitoringData,
      stats: {
        totalTriggers: history?.length || 0,
        lastTriggered: alert.last_triggered,
        isActive: alert.is_active,
        createdAt: alert.created_at,
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { id: alertId } = await params;
    if (!alertId) {
      return createErrorResponse('Alert ID is required', 400);
    }

    // Parse request body
    const body: UpdateAlertRequest = await request.json();

    const supabase = createClient();

    // Get existing alert to validate access
    const { data: existingAlert, error: fetchError } = await supabase
      .from('competitor_alerts')
      .select('project_id, alert_type')
      .eq('id', alertId)
      .single();

    if (fetchError || !existingAlert) {
      return createErrorResponse('Alert not found', 404);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(existingAlert.project_id, 'member');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Prepare update data
    const updateData: UpdateAlertRequest & { updated_at: string } = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    // Update alert
    const { data: updatedAlert, error: updateError } = await supabase
      .from('competitor_alerts')
      .update(updateData)
      .eq('id', alertId)
      .select(`
        *,
        competitor:competitors (
          id,
          competitor_name,
          competitor_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating alert:', updateError);
      return createErrorResponse('Failed to update alert', 500);
    }

    // If alert was activated/deactivated, update monitoring
    if (body.is_active !== undefined) {
      try {
        await supabase.functions.invoke('competitor-monitoring', {
          body: {
            action: body.is_active ? 'activate_alert' : 'deactivate_alert',
            alertId,
            projectId: existingAlert.project_id,
          },
        });
      } catch (error) {
        console.error('Error updating alert monitoring:', error);
      }
    }

    // Log alert update
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'alert_updated',
        event_data: {
          alert_id: alertId,
          project_id: existingAlert.project_id,
          changes: Object.keys(body),
          is_active: updatedAlert.is_active,
        },
      });

    return NextResponse.json({
      success: true,
      alert: updatedAlert,
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { id: alertId } = await params;
    if (!alertId) {
      return createErrorResponse('Alert ID is required', 400);
    }

    const supabase = createClient();

    // Get alert to validate access and get project info
    const { data: alert, error: fetchError } = await supabase
      .from('competitor_alerts')
      .select('project_id, alert_type, competitor_id')
      .eq('id', alertId)
      .single();

    if (fetchError || !alert) {
      return createErrorResponse('Alert not found', 404);
    }

    // Validate project access (requires admin role)
    const hasAccess = await validateProjectAccess(alert.project_id, 'admin');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions - admin role required', 403);
    }

    // Remove monitoring for this alert
    try {
      await supabase.functions.invoke('competitor-monitoring', {
        body: {
          action: 'remove_alert',
          alertId,
          projectId: alert.project_id,
        },
      });
    } catch (error) {
      console.error('Error removing alert monitoring:', error);
    }

    // Delete the alert
    const { error: deleteError } = await supabase
      .from('competitor_alerts')
      .delete()
      .eq('id', alertId);

    if (deleteError) {
      console.error('Error deleting alert:', deleteError);
      return createErrorResponse('Failed to delete alert', 500);
    }

    // Log alert deletion
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'alert_deleted',
        event_data: {
          alert_id: alertId,
          project_id: alert.project_id,
          alert_type: alert.alert_type,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully',
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // This endpoint handles alert actions like test, trigger, etc.
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { id: alertId } = await params;
    const { action } = await request.json();

    if (!alertId || !action) {
      return createErrorResponse('Alert ID and action are required', 400);
    }

    const supabase = createClient();

    // Get alert to validate access
    const { data: alert, error: fetchError } = await supabase
      .from('competitor_alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (fetchError || !alert) {
      return createErrorResponse('Alert not found', 404);
    }

    // Validate project access
    const hasAccess = await validateProjectAccess(alert.project_id, 'member');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    let result;

    switch (action) {
      case 'test': {
        // Test the alert configuration
        const testResult = await testAlert(supabase, alert);
        
        // Log test event
        await supabase
          .from('user_events')
          .insert({
            user_id: user.id,
            event_type: 'alert_tested',
            event_data: {
              alert_id: alertId,
              project_id: alert.project_id,
              test_result: testResult,
            },
          });

        result = {
          test: testResult,
          message: testResult.success 
            ? 'Alert test completed successfully' 
            : 'Alert test failed - check configuration',
        };
        break;
      }

      case 'force_check': {
        // Force an immediate check of the alert condition
        try {
          const checkResult = await supabase.functions.invoke('competitor-monitoring', {
            body: {
              action: 'check_alert',
              alertId,
              projectId: alert.project_id,
              forceCheck: true,
            },
          });

          result = {
            check: checkResult.data?.result || {},
            message: 'Alert check completed',
          };
        } catch (error) {
          console.error('Error forcing alert check:', error);
          result = {
            check: { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' },
            message: 'Alert check failed',
          };
        }
        break;
      }

      case 'reset': {
        // Reset alert trigger history and status
        const { error: resetError } = await supabase
          .from('competitor_alerts')
          .update({
            last_triggered: null,
            trigger_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', alertId);

        if (resetError) {
          return createErrorResponse('Failed to reset alert', 500);
        }

        result = {
          message: 'Alert reset successfully',
        };
        break;
      }

      default:
        return createErrorResponse('Invalid action specified', 400);
    }

    return NextResponse.json({
      success: true,
      action,
      alertId,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Helper function
async function testAlert(supabase: ReturnType<typeof createClient>, alert: AlertData): Promise<TestAlertResult> {
  try {
    // Generate test data based on alert type
    let testData: Record<string, unknown>;
    let shouldTrigger = false;

    switch (alert.alert_type) {
      case 'ranking_change':
        testData = {
          keyword: alert.keyword || 'test keyword',
          oldPosition: 15,
          newPosition: 8,
          change: -7,
        };
        shouldTrigger = Math.abs(testData.change) >= (alert.threshold || 5);
        break;

      case 'traffic_change':
        testData = {
          oldTraffic: 1000,
          newTraffic: 1300,
          change: 30,
          timeWindow: '7d',
        };
        shouldTrigger = Math.abs(testData.change) >= (alert.threshold || 20);
        break;

      case 'new_content':
        testData = {
          contentCount: 3,
          contentTypes: ['blog'],
          detectedAt: new Date().toISOString(),
        };
        shouldTrigger = testData.contentCount >= (alert.threshold || 1);
        break;

      default:
        testData = { message: 'No test data available for this alert type' };
        shouldTrigger = false;
    }

    return {
      success: true,
      wouldTrigger: shouldTrigger,
      testData,
      threshold: alert.threshold,
      alertType: alert.alert_type,
    };

  } catch (error) {
    console.error('Error testing alert:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}