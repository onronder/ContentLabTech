-- Simple Security Fix - RLS Only
-- Run this first to fix the critical RLS issue
-- Date: 2025-07-16

-- =====================================================
-- STEP 1: Enable RLS on audit_logs table (CRITICAL)
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
-- STEP 3: Add performance indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
    ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by 
    ON public.audit_logs(performed_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON public.audit_logs(created_at);

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'RLS is now enabled on audit_logs table' as status;