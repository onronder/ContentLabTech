-- Fix team_members table primary key
-- Junction table needs proper primary key structure
-- Date: 2025-07-16

-- =====================================================
-- ANALYSIS: Junction table missing primary key
-- =====================================================
-- team_members is a junction table for team-user relationships
-- Frontend expects member.id for React keys and operations
-- Options:
-- 1. Add id column + composite unique constraint (RECOMMENDED)
-- 2. Composite primary key only (breaks frontend expectations)

-- =====================================================
-- SOLUTION: Add id column + ensure uniqueness
-- =====================================================

-- Step 1: Add id column as primary key
ALTER TABLE public.team_members 
ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Step 2: Add unique constraint on team_id + user_id
-- This prevents duplicate memberships
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_team_user_unique 
UNIQUE (team_id, user_id);

-- Step 3: Create performance indexes
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_role ON public.team_members(role);

-- Step 4: Add foreign key constraints for data integrity
ALTER TABLE public.team_members 
ADD CONSTRAINT fk_team_members_team_id 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Note: user_id references auth.users, which we can't add FK to
-- but we can add a comment for documentation
COMMENT ON COLUMN public.team_members.user_id IS 'References auth.users.id';

-- Step 5: Verify the fix
SELECT 
    'Verification:' as status,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check constraints were created
SELECT 
    'Constraints:' as status,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'team_members'
AND table_schema = 'public';

SELECT 'team_members table fixed - has id column and proper constraints' as result;