-- Manual Security Fix Script
-- Run this in Supabase SQL Editor if you prefer manual execution
-- Date: 2025-07-16

-- =====================================================
-- STEP 1: Fix SECURITY DEFINER view issue
-- =====================================================
-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.index_usage_stats CASCADE;

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

-- Grant permissions
GRANT SELECT ON public.index_usage_stats TO authenticated;
GRANT SELECT ON public.index_usage_stats TO service_role;

-- =====================================================
-- STEP 2: Enable RLS on audit_logs table
-- =====================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create RLS policies for audit_logs table
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
    USING (
        auth.uid() = user_id::uuid OR
        auth.uid() = performed_by::uuid
    );

-- System can insert audit logs
CREATE POLICY "System can create audit logs"
    ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id::uuid OR
        auth.uid() = performed_by::uuid
    );

-- =====================================================
-- STEP 4: Add performance indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
    ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by 
    ON public.audit_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON public.audit_logs(created_at);