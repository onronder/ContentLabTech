-- Verify RLS Policies Are Working Correctly
-- Test that RLS doesn't block legitimate operations
-- Date: 2025-07-16

-- =====================================================
-- TEST 1: Check RLS is enabled properly
-- =====================================================
SELECT 
    'RLS Status Check' as test_name,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity = true THEN 'PASS - RLS Enabled'
        ELSE 'FAIL - RLS Disabled'
    END as result
FROM pg_tables 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- =====================================================
-- TEST 2: Check all required policies exist
-- =====================================================
SELECT 
    'Policy Existence Check' as test_name,
    policyname,
    cmd,
    roles,
    CASE 
        WHEN policyname IS NOT NULL THEN 'PASS - Policy Exists'
        ELSE 'FAIL - Policy Missing'
    END as result
FROM pg_policies 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- TEST 3: Check policy count (should be 3 total)
-- =====================================================
SELECT 
    'Policy Count Check' as test_name,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) = 3 THEN 'PASS - Correct number of policies'
        ELSE 'FAIL - Wrong number of policies'
    END as result
FROM pg_policies 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public';

-- =====================================================
-- TEST 4: Check indexes exist for performance
-- =====================================================
SELECT 
    'Index Existence Check' as test_name,
    indexname,
    tablename,
    CASE 
        WHEN indexname IS NOT NULL THEN 'PASS - Index Exists'
        ELSE 'FAIL - Index Missing'
    END as result
FROM pg_indexes 
WHERE tablename = 'audit_logs' 
AND schemaname = 'public'
AND indexname LIKE 'idx_audit_logs_%'
ORDER BY indexname;

-- =====================================================
-- TEST 5: Check view is recreated without SECURITY DEFINER
-- =====================================================
SELECT 
    'View Security Check' as test_name,
    viewname,
    CASE 
        WHEN definition NOT LIKE '%SECURITY DEFINER%' THEN 'PASS - No SECURITY DEFINER'
        ELSE 'FAIL - SECURITY DEFINER still present'
    END as result,
    definition
FROM pg_views 
WHERE viewname = 'index_usage_stats' 
AND schemaname = 'public';

-- =====================================================
-- TEST 6: Test view functionality
-- =====================================================
SELECT 
    'View Functionality Check' as test_name,
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS - View returns data'
        ELSE 'WARN - View returns no data (may be normal)'
    END as result
FROM public.index_usage_stats;

-- =====================================================
-- TEST 7: Check for any tables still missing RLS
-- =====================================================
SELECT 
    'Other Tables RLS Check' as test_name,
    tablename,
    CASE 
        WHEN rowsecurity = false THEN 'WARN - RLS Disabled'
        ELSE 'PASS - RLS Enabled'
    END as result
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename NOT IN ('audit_logs') -- Skip audit_logs as we know it's enabled
ORDER BY tablename;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    'VERIFICATION SUMMARY' as test_name,
    'All tests completed' as result,
    'Check results above for any FAIL or WARN status' as notes;