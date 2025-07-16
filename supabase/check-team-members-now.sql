-- Quick check of team_members table current state
-- Run this first to see what needs to be fixed

-- Check if table exists
SELECT 
    'Table exists?' as check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'team_members' 
            AND table_schema = 'public'
        ) THEN 'YES'
        ELSE 'NO'
    END as result;

-- Check current columns
SELECT 
    'Current columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;