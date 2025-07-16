-- Check the current primary key structure
SELECT 
    'Current Primary Key:' as info,
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'team_members'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.constraint_name, tc.constraint_type;

-- Check all indexes on the table
SELECT 
    'Current Indexes:' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'team_members' 
AND schemaname = 'public';