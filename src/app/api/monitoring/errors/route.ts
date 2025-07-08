/**
 * Error Tracking API Endpoint
 * Handles error data collection and storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

interface ErrorPayload {
  errors: Array<{
    id: string;
    message: string;
    stack?: string;
    type: 'javascript' | 'network' | 'validation' | 'authentication' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    count: number;
    firstOccurrence: number;
    lastOccurrence: number;
    context: {
      userId?: string;
      sessionId: string;
      userAgent: string;
      url: string;
      timestamp: number;
      buildVersion?: string;
      component?: string;
      action?: string;
      formData?: Record<string, unknown>;
      previousErrors?: string[];
      performanceMetrics?: {
        memoryUsage?: number;
        renderTime?: number;
        networkLatency?: number;
      };
    };
    resolved: boolean;
    recoveryAttempts: number;
  }>;
  sessionId: string;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const payload: ErrorPayload = await request.json();
    
    // Validate payload
    if (!payload.errors || !Array.isArray(payload.errors)) {
      return NextResponse.json(
        { error: 'Invalid payload: errors array required' },
        { status: 400 }
      );
    }

    // Process and store errors
    const processedErrors = payload.errors.map(error => ({
      id: error.id,
      message: error.message,
      stack: error.stack,
      error_type: error.type,
      severity: error.severity,
      count: error.count,
      first_occurrence: new Date(error.firstOccurrence).toISOString(),
      last_occurrence: new Date(error.lastOccurrence).toISOString(),
      session_id: error.context.sessionId,
      user_id: error.context.userId,
      user_agent: error.context.userAgent,
      url: error.context.url,
      build_version: error.context.buildVersion,
      component: error.context.component,
      action: error.context.action,
      form_data: error.context.formData,
      previous_errors: error.context.previousErrors,
      performance_metrics: error.context.performanceMetrics,
      resolved: error.resolved,
      recovery_attempts: error.recoveryAttempts,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Upsert errors to database
    const { data, error: dbError } = await supabase
      .from('error_tracking')
      .upsert(processedErrors, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (dbError) {
      console.error('Database error storing errors:', dbError);
      return NextResponse.json(
        { error: 'Failed to store errors' },
        { status: 500 }
      );
    }

    // Check for critical errors that need immediate attention
    const criticalErrors = payload.errors.filter(error => error.severity === 'critical');
    
    if (criticalErrors.length > 0) {
      // Trigger alerting system (email, Slack, etc.)
      await triggerCriticalErrorAlert(criticalErrors);
    }

    // Update error aggregations
    await updateErrorAggregations(payload.sessionId, payload.errors);

    return NextResponse.json({
      success: true,
      processed: processedErrors.length,
      criticalAlerts: criticalErrors.length,
    });

  } catch (error) {
    console.error('Error processing error tracking request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('error_tracking')
      .select('*')
      .order('last_occurrence', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (type) {
      query = query.eq('error_type', type);
    }
    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true');
    }

    const { data: errors, error: dbError } = await query;

    if (dbError) {
      console.error('Database error fetching errors:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch errors' },
        { status: 500 }
      );
    }

    // Get aggregation data
    const { data: aggregations } = await supabase
      .from('error_aggregations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      errors: errors || [],
      aggregation: aggregations || null,
      total: errors?.length || 0,
    });

  } catch (error) {
    console.error('Error fetching error tracking data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Mark error as resolved
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('id');
    
    if (!errorId) {
      return NextResponse.json(
        { error: 'Error ID required' },
        { status: 400 }
      );
    }

    const { data, error: dbError } = await supabase
      .from('error_tracking')
      .update({ 
        resolved: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', errorId);

    if (dbError) {
      console.error('Database error updating error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating error status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

async function triggerCriticalErrorAlert(criticalErrors: any[]) {
  try {
    // Implementation would depend on your alerting preferences
    // Examples: email, Slack webhook, PagerDuty, etc.
    
    console.error('CRITICAL ERRORS DETECTED:', {
      count: criticalErrors.length,
      errors: criticalErrors.map(e => ({
        id: e.id,
        message: e.message,
        component: e.context.component,
        url: e.context.url,
      })),
    });

    // Example Slack webhook (if configured)
    const slackWebhookUrl = process.env['SLACK_WEBHOOK_URL'];
    if (slackWebhookUrl) {
      await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Error Alert`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${criticalErrors.length} critical error(s) detected*`,
              },
            },
            ...criticalErrors.slice(0, 3).map(error => ({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `• *${error.message}*\n  Component: ${error.context.component || 'Unknown'}\n  URL: ${error.context.url}`,
              },
            })),
          ],
        }),
      });
    }

  } catch (error) {
    console.error('Failed to send critical error alert:', error);
  }
}

async function updateErrorAggregations(sessionId: string, errors: any[]) {
  try {
    const aggregation = {
      session_id: sessionId,
      errors_by_type: errors.reduce((acc: Record<string, number>, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {}),
      errors_by_severity: errors.reduce((acc: Record<string, number>, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      }, {}),
      errors_by_component: errors.reduce((acc: Record<string, number>, error) => {
        const component = error.context.component || 'unknown';
        acc[component] = (acc[component] || 0) + 1;
        return acc;
      }, {}),
      total_errors: errors.reduce((sum, error) => sum + error.count, 0),
      unique_errors: errors.length,
      resolved_errors: errors.filter(error => error.resolved).length,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('error_aggregations')
      .upsert(aggregation, {
        onConflict: 'session_id',
        ignoreDuplicates: false,
      });

  } catch (error) {
    console.error('Failed to update error aggregations:', error);
  }
}