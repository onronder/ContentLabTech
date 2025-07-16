-- Simple Database Analysis
-- Check the actual structure before creating fixes
-- Date: 2025-07-16

-- =====================================================
-- STEP 1: Check if audit_logs table exists and its structure
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 2: Check RLS status for audit_logs
-- =====================================================
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- =====================================================
-- STEP 3: Check existing policies on audit_logs
-- =====================================================
SELECT 
    policyname,
    tablename,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- =====================================================
-- STEP 4: Check index_usage_stats view
-- =====================================================
SELECT 
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'index_usage_stats' 
AND schemaname = 'public';

-- =====================================================
-- STEP 5: List all public tables
-- =====================================================
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;