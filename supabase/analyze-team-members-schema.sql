-- CRITICAL: Analyze team_members table structure
-- Check for missing id column causing 500 errors
-- Date: 2025-07-16

-- =====================================================
-- STEP 1: Check if team_members table exists
-- =====================================================
SELECT 
    'Table Existence Check' as check_type,
    table_name,
    table_type,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'team_members' 
AND table_schema = 'public';

-- =====================================================
-- STEP 2: Get current team_members table structure
-- =====================================================
SELECT 
    'Column Structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position,
    CASE 
        WHEN column_name = 'id' THEN 'ID COLUMN FOUND'
        ELSE 'REGULAR COLUMN'
    END as column_status
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 3: Check primary key constraints
-- =====================================================
SELECT 
    'Primary Key Check' as check_type,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    CASE 
        WHEN kcu.column_name = 'id' THEN 'ID IS PRIMARY KEY'
        ELSE 'OTHER PRIMARY KEY'
    END as pk_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'team_members'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'PRIMARY KEY';

-- =====================================================
-- STEP 4: Check current indexes
-- =====================================================
SELECT 
    'Index Check' as check_type,
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'team_members' 
AND schemaname = 'public';

-- =====================================================
-- STEP 5: Check for any existing data
-- =====================================================
SELECT 
    'Data Check' as check_type,
    COUNT(*) as row_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'HAS DATA - MIGRATION NEEDED'
        ELSE 'NO DATA - SAFE TO MODIFY'
    END as data_status
FROM public.team_members;

-- =====================================================
-- STEP 6: Check foreign key references
-- =====================================================
SELECT 
    'Foreign Key Check' as check_type,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'team_members'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY';

-- =====================================================
-- CRITICAL STATUS SUMMARY
-- =====================================================
SELECT 
    'CRITICAL STATUS' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_members' 
            AND table_schema = 'public' 
            AND column_name = 'id'
        ) THEN 'ID COLUMN EXISTS - NO MIGRATION NEEDED'
        ELSE 'ID COLUMN MISSING - MIGRATION REQUIRED'
    END as migration_needed;