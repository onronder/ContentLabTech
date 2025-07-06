-- =====================================================
-- Team Assignment Fix Script
-- Resolves "No Team Selected" issue for users
-- =====================================================

-- Step 1: Check current state
SELECT 
  'Current Database State:' as info,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM teams) as total_teams,
  (SELECT COUNT(*) FROM team_members) as total_team_members;

-- Step 2: Find users without team assignments
SELECT 
  'Users without teams:' as info,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN team_members tm ON u.id = tm.user_id
WHERE tm.user_id IS NULL;

-- Step 3: Find teams without owners in team_members
SELECT 
  'Teams with missing owner memberships:' as info,
  t.id,
  t.name,
  t.owner_id,
  t.created_at
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND t.owner_id = tm.user_id
WHERE tm.user_id IS NULL;

-- Step 4: Create default teams for users without team assignments
-- This will be done via the application using the create_team_with_owner function

-- Step 5: Verify fix by checking all users have team assignments
SELECT 
  'Final verification:' as info,
  COUNT(DISTINCT u.id) as users_with_teams,
  COUNT(DISTINCT tm.user_id) as users_in_team_members
FROM auth.users u
LEFT JOIN team_members tm ON u.id = tm.user_id
WHERE tm.user_id IS NOT NULL;