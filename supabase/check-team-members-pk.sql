-- Check primary key structure of team_members table
-- Understand the actual table design

-- Check what the current primary key is
SELECT 
    'Current Primary Key:' as info,
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ') as key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'team_members'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.constraint_name, tc.constraint_type;

-- Check all constraints on the table
SELECT 
    'All Constraints:' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'team_members'
AND table_schema = 'public';

-- Check if this is a junction table (many-to-many relationship)
SELECT 
    'Table Design Analysis:' as info,
    CASE 
        WHEN COUNT(*) = 2 AND 
             SUM(CASE WHEN column_name IN ('team_id', 'user_id') THEN 1 ELSE 0 END) = 2
        THEN 'This appears to be a junction table for team-user relationships'
        ELSE 'This is a regular table'
    END as table_type
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
AND column_name IN ('team_id', 'user_id');

-- Check unique constraints
SELECT 
    'Unique Constraints:' as info,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ') as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'team_members'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name;