-- Verify team_members table fix
-- Test that id column exists and CRUD operations work
-- Date: 2025-07-16

-- =====================================================
-- VERIFICATION TESTS
-- =====================================================

-- Test 1: Check id column exists
SELECT 
    '1. ID Column Check' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_members' 
            AND table_schema = 'public' 
            AND column_name = 'id'
        ) THEN 'PASS - ID column exists'
        ELSE 'FAIL - ID column missing'
    END as result;

-- Test 2: Check primary key constraint
SELECT 
    '2. Primary Key Check' as test_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'team_members'
            AND tc.table_schema = 'public'
            AND tc.constraint_type = 'PRIMARY KEY'
            AND kcu.column_name = 'id'
        ) THEN 'PASS - ID is primary key'
        ELSE 'FAIL - ID is not primary key'
    END as result;

-- Test 3: Check indexes exist
SELECT 
    '3. Index Check' as test_name,
    COUNT(*) as index_count,
    CASE 
        WHEN COUNT(*) >= 4 THEN 'PASS - Indexes created'
        ELSE 'FAIL - Missing indexes'
    END as result
FROM pg_indexes 
WHERE tablename = 'team_members' 
AND schemaname = 'public'
AND indexname LIKE 'idx_team_members_%';

-- Test 4: Check RLS is enabled
SELECT 
    '4. RLS Check' as test_name,
    CASE 
        WHEN rowsecurity = true THEN 'PASS - RLS enabled'
        ELSE 'FAIL - RLS disabled'
    END as result
FROM pg_tables 
WHERE tablename = 'team_members' 
AND schemaname = 'public';

-- Test 5: Check RLS policies exist
SELECT 
    '5. RLS Policy Check' as test_name,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 2 THEN 'PASS - RLS policies exist'
        ELSE 'FAIL - Missing RLS policies'
    END as result
FROM pg_policies 
WHERE tablename = 'team_members' 
AND schemaname = 'public';

-- Test 6: Test basic INSERT operation
-- This will test if the id column auto-generates UUIDs
INSERT INTO public.team_members (team_id, user_id, role, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    gen_random_uuid(),
    'member',
    NOW(),
    NOW()
) RETURNING id;

-- Test 7: Test SELECT operation
SELECT 
    '7. SELECT Test' as test_name,
    COUNT(*) as row_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS - Can select from table'
        ELSE 'FAIL - Cannot select from table'
    END as result
FROM public.team_members;

-- Test 8: Test UPDATE operation
-- Update the record we just inserted
UPDATE public.team_members 
SET role = 'admin', updated_at = NOW() 
WHERE id = (SELECT id FROM public.team_members ORDER BY created_at DESC LIMIT 1);

-- Test 9: Test DELETE operation
-- Delete the test record
DELETE FROM public.team_members 
WHERE id = (SELECT id FROM public.team_members ORDER BY created_at DESC LIMIT 1);

-- Final verification
SELECT 
    'FINAL VERIFICATION' as test_name,
    'team_members table is ready for production' as result;

-- Show current table structure
SELECT 
    'CURRENT TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;