-- Fix SECURITY DEFINER View Issue
-- Run this separately after the RLS fix
-- Date: 2025-07-16

-- =====================================================
-- STEP 1: Check current view structure
-- =====================================================
-- First, let's see what the current view looks like
SELECT definition FROM pg_views 
WHERE schemaname = 'public' AND viewname = 'index_usage_stats';

-- =====================================================
-- STEP 2: Check pg_stat_user_indexes structure
-- =====================================================
-- Let's see what columns are actually available
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pg_stat_user_indexes' 
AND table_schema = 'pg_catalog'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 3: Drop and recreate the view safely
-- =====================================================
-- Drop the existing view
DROP VIEW IF EXISTS public.index_usage_stats CASCADE;

-- Create a simple, safe version first
CREATE VIEW public.index_usage_stats AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM
    pg_stat_user_indexes
ORDER BY
    schemaname,
    relname,
    indexrelname;

-- Grant permissions
GRANT SELECT ON public.index_usage_stats TO authenticated;
GRANT SELECT ON public.index_usage_stats TO service_role;

-- Add comment
COMMENT ON VIEW public.index_usage_stats IS 'Index usage statistics view without SECURITY DEFINER';

SELECT 'View recreated successfully without SECURITY DEFINER' as status;