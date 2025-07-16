-- Analyze Supabase Database Structure
-- Run this first to understand the actual database schema
-- Date: 2025-07-16

-- =====================================================
-- STEP 1: Check if audit_logs table exists
-- =====================================================
SELECT 
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'audit_logs' 
AND table_schema = 'public';

-- =====================================================
-- STEP 2: Get audit_logs table structure
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 3: Check current RLS status
-- =====================================================
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- =====================================================
-- STEP 4: Check existing policies
-- =====================================================
SELECT 
    policyname,
    tablename,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- =====================================================
-- STEP 5: Check index_usage_stats view
-- =====================================================
SELECT 
    viewname,
    definition,
    viewowner
FROM pg_views 
WHERE viewname = 'index_usage_stats' 
AND schemaname = 'public';

-- =====================================================
-- STEP 6: Check pg_stat_user_indexes structure
-- =====================================================
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'pg_stat_user_indexes' 
AND table_schema = 'pg_catalog'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 7: List all tables in public schema
-- =====================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- STEP 8: Check for any tables with RLS disabled
-- =====================================================
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = false
ORDER BY tablename;