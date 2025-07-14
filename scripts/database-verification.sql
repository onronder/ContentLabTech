-- =====================================================
-- PRODUCTION DATABASE VERIFICATION SCRIPT
-- =====================================================
-- This script verifies the production database state
-- and ensures all migrations have been applied correctly

-- STEP 1: Verify all required tables exist
SELECT 
  'TABLE_VERIFICATION' as check_type,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN 'EXISTS'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'teams',
  'team_members', 
  'team_invitations',
  'user_preferences',
  'notification_preferences',
  'user_sessions',
  'login_history',
  'projects',
  'content_items',
  'analytics_events',
  'processing_jobs'
)
ORDER BY table_name;

-- STEP 2: Verify Row Level Security (RLS) policies
SELECT 
  'RLS_VERIFICATION' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- STEP 3: Check foreign key constraints
SELECT 
  'FK_VERIFICATION' as check_type,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- STEP 4: Verify indexes for performance
SELECT 
  'INDEX_VERIFICATION' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_invitations',
    'user_preferences', 'notification_preferences',
    'user_sessions', 'login_history'
  )
ORDER BY tablename, indexname;

-- STEP 5: Check table row counts (basic health check)
SELECT 
  'ROW_COUNT_VERIFICATION' as check_type,
  'teams' as table_name,
  COUNT(*) as row_count
FROM teams
UNION ALL
SELECT 
  'ROW_COUNT_VERIFICATION' as check_type,
  'team_members' as table_name,
  COUNT(*) as row_count
FROM team_members
UNION ALL
SELECT 
  'ROW_COUNT_VERIFICATION' as check_type,
  'user_preferences' as table_name,
  COUNT(*) as row_count
FROM user_preferences
UNION ALL
SELECT 
  'ROW_COUNT_VERIFICATION' as check_type,
  'notification_preferences' as table_name,
  COUNT(*) as row_count
FROM notification_preferences;

-- STEP 6: Test RLS policy enforcement (requires authenticated user)
-- Note: This should be run in the context of an authenticated session
SELECT 
  'RLS_TEST' as check_type,
  'Current user can access own data' as test_description,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'AUTHENTICATED'
    ELSE 'ANONYMOUS'
  END as auth_status;

-- STEP 7: Verify migration history
SELECT 
  'MIGRATION_VERIFICATION' as check_type,
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 20;

-- STEP 8: Check database connections and locks
SELECT 
  'CONNECTION_VERIFICATION' as check_type,
  COUNT(*) as active_connections,
  COUNT(CASE WHEN state = 'active' THEN 1 END) as active_queries,
  COUNT(CASE WHEN state = 'idle' THEN 1 END) as idle_connections
FROM pg_stat_activity
WHERE datname = current_database();

-- STEP 9: Performance verification - check for slow queries
SELECT 
  'PERFORMANCE_VERIFICATION' as check_type,
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- STEP 10: Storage verification
SELECT 
  'STORAGE_VERIFICATION' as check_type,
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_invitations',
    'user_preferences', 'notification_preferences',
    'projects', 'content_items', 'analytics_events'
  )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;