-- STEP 2: Check index_usage_stats view
-- Run this to see the current view definition

SELECT 
    viewname,
    definition
FROM pg_views 
WHERE viewname = 'index_usage_stats' 
AND schemaname = 'public';