-- STEP 1: Check audit_logs table structure
-- Run this first to see what columns actually exist

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;