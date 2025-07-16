-- Correct Security Fix Based on Actual Database Schema
-- Date: 2025-07-16

-- =====================================================
-- FINDINGS FROM ANALYSIS:
-- =====================================================
-- audit_logs table columns:
-- - id (uuid, NOT NULL)
-- - table_name (varchar, NOT NULL)  
-- - record_id (uuid, NOT NULL)
-- - action (varchar, NOT NULL)
-- - old_values (jsonb, NULL)
-- - new_values (jsonb, NULL)
-- - user_id (uuid, NULL)  -- This is the key column for RLS
-- - timestamp (timestamptz, NULL)
-- 
-- NO "performed_by" column exists!
-- =====================================================

-- =====================================================
-- STEP 1: Enable RLS on audit_logs table
-- =====================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Create RLS policies for audit_logs table
-- =====================================================

-- Service role has full access
CREATE POLICY "Service role has full access to audit_logs"
    ON public.audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can only view their own audit logs
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert audit logs for themselves
CREATE POLICY "Users can create their own audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy - audit logs are immutable
-- No DELETE policy for regular users - only service role can delete

-- =====================================================
-- STEP 3: Add performance indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
    ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
    ON public.audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name 
    ON public.audit_logs(table_name);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON public.audit_logs(action);

-- =====================================================
-- STEP 4: Fix index_usage_stats view (remove SECURITY DEFINER)
-- =====================================================
-- The view already exists with the correct structure, 
-- but it might have SECURITY DEFINER. Let's recreate it safely.

DROP VIEW IF EXISTS public.index_usage_stats CASCADE;

CREATE VIEW public.index_usage_stats AS
SELECT 
    schemaname,
    relname AS tablename,
    indexrelname AS indexname,
    idx_scan AS times_used,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.index_usage_stats TO authenticated;
GRANT SELECT ON public.index_usage_stats TO service_role;

-- Add comment explaining the view
COMMENT ON VIEW public.index_usage_stats IS 
'Index usage statistics for performance monitoring. Recreated without SECURITY DEFINER for proper security.';

-- =====================================================
-- STEP 5: Verification
-- =====================================================
-- Check RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- Check policies were created
SELECT 
    policyname,
    tablename,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- Success message
SELECT 'Security fixes applied successfully based on actual database schema!' as status;