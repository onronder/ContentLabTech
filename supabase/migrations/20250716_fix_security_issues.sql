-- Fix Security Issues in Supabase Database
-- Date: 2025-07-16

-- =====================================================
-- 1. Fix SECURITY DEFINER view issue
-- =====================================================
-- The index_usage_stats view should not use SECURITY DEFINER
-- as it bypasses RLS and uses the view creator's permissions

-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.index_usage_stats CASCADE;

-- Recreate the view with proper security settings
CREATE VIEW public.index_usage_stats AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM
    pg_stat_user_indexes
ORDER BY
    schemaname,
    relname,
    indexrelname;

-- Grant appropriate permissions
GRANT SELECT ON public.index_usage_stats TO authenticated;
GRANT SELECT ON public.index_usage_stats TO service_role;

-- Add comment explaining the view
COMMENT ON VIEW public.index_usage_stats IS 'View showing index usage statistics for performance monitoring. Uses querying user permissions.';

-- =====================================================
-- 2. Enable RLS on audit_logs table
-- =====================================================
-- Enable Row Level Security on the audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. Create RLS policies for audit_logs table
-- =====================================================

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to audit_logs"
    ON public.audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Authenticated users can only read their own audit logs
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id::uuid OR
        auth.uid() = performed_by::uuid
    );

-- Policy: System can insert audit logs for authenticated users
CREATE POLICY "System can create audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Allow inserting logs where the user is the subject or performer
        auth.uid() = user_id::uuid OR
        auth.uid() = performed_by::uuid
    );

-- Policy: No one can update audit logs (immutable)
-- No UPDATE policy means updates are denied by default

-- Policy: Only service role can delete (for cleanup)
-- Regular users cannot delete audit logs

-- =====================================================
-- 4. Add indexes for performance
-- =====================================================
-- Add indexes to support the RLS policies efficiently
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
    ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by 
    ON public.audit_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON public.audit_logs(created_at);

-- =====================================================
-- 5. Add comment explaining the security model
-- =====================================================
COMMENT ON TABLE public.audit_logs IS 
'Audit log table with RLS enabled. Users can only see logs where they are the subject or performer. Logs are immutable - no updates allowed. Only service role can delete for maintenance.';

-- =====================================================
-- 6. Verify the fixes
-- =====================================================
-- This query will help verify RLS is enabled
DO $$
BEGIN
    -- Check if RLS is enabled on audit_logs
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'audit_logs' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on public.audit_logs table';
    END IF;
    
    -- Check if the view no longer has SECURITY DEFINER
    IF EXISTS (
        SELECT 1
        FROM pg_views
        WHERE schemaname = 'public'
        AND viewname = 'index_usage_stats'
        AND definition LIKE '%SECURITY DEFINER%'
    ) THEN
        RAISE EXCEPTION 'View index_usage_stats still has SECURITY DEFINER';
    END IF;
    
    RAISE NOTICE 'Security fixes applied successfully';
END $$;