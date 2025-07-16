-- CRITICAL FIX: Add missing id column to team_members table
-- This fixes 500 errors caused by missing primary key
-- Date: 2025-07-16

-- =====================================================
-- SAFETY CHECKS
-- =====================================================
-- Check if migration is needed
DO $$
BEGIN
    -- Check if id column already exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' 
        AND table_schema = 'public' 
        AND column_name = 'id'
    ) THEN
        RAISE NOTICE 'ID column already exists in team_members table - skipping migration';
        RETURN;
    END IF;
    
    RAISE NOTICE 'ID column missing - proceeding with migration';
END $$;

-- =====================================================
-- STEP 1: Add id column as UUID primary key
-- =====================================================
-- Add the id column with UUID default
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() NOT NULL;

-- =====================================================
-- STEP 2: Create primary key constraint
-- =====================================================
-- Drop existing primary key if it exists
DO $$
BEGIN
    -- Check if there's an existing primary key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'team_members' 
        AND table_schema = 'public' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        -- Get the constraint name
        DECLARE
            constraint_name_var TEXT;
        BEGIN
            SELECT constraint_name INTO constraint_name_var
            FROM information_schema.table_constraints 
            WHERE table_name = 'team_members' 
            AND table_schema = 'public' 
            AND constraint_type = 'PRIMARY KEY';
            
            EXECUTE 'ALTER TABLE public.team_members DROP CONSTRAINT ' || constraint_name_var;
            RAISE NOTICE 'Dropped existing primary key constraint: %', constraint_name_var;
        END;
    END IF;
END $$;

-- Add new primary key constraint on id
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);

-- =====================================================
-- STEP 3: Create indexes for performance
-- =====================================================
-- Index on user_id for user-based queries
CREATE INDEX IF NOT EXISTS idx_team_members_user_id 
ON public.team_members(user_id);

-- Index on team_id for team-based queries
CREATE INDEX IF NOT EXISTS idx_team_members_team_id 
ON public.team_members(team_id);

-- Composite index for team-user queries
CREATE INDEX IF NOT EXISTS idx_team_members_team_user 
ON public.team_members(team_id, user_id);

-- Index on role for role-based filtering
CREATE INDEX IF NOT EXISTS idx_team_members_role 
ON public.team_members(role);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_team_members_created_at 
ON public.team_members(created_at);

-- =====================================================
-- STEP 4: Add comments for documentation
-- =====================================================
COMMENT ON COLUMN public.team_members.id IS 'Primary key UUID for team_members table - added to fix 500 errors';
COMMENT ON TABLE public.team_members IS 'Team members table with proper id primary key - fixed for production stability';

-- =====================================================
-- STEP 5: Enable RLS if not already enabled
-- =====================================================
-- Enable RLS for security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for team members
-- Service role has full access
DO $$
BEGIN
    -- Check if policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_members' 
        AND policyname = 'Service role has full access to team_members'
    ) THEN
        CREATE POLICY "Service role has full access to team_members"
            ON public.team_members
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- Users can view team members for teams they belong to
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'team_members' 
        AND policyname = 'Users can view team members for their teams'
    ) THEN
        CREATE POLICY "Users can view team members for their teams"
            ON public.team_members
            FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.team_members tm 
                    WHERE tm.team_id = team_members.team_id 
                    AND tm.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- =====================================================
-- STEP 6: Verification queries
-- =====================================================
-- Verify the migration worked
DO $$
BEGIN
    -- Check id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' 
        AND table_schema = 'public' 
        AND column_name = 'id'
    ) THEN
        RAISE EXCEPTION 'MIGRATION FAILED: id column was not created';
    END IF;
    
    -- Check primary key exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'team_members' 
        AND table_schema = 'public' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
        RAISE EXCEPTION 'MIGRATION FAILED: primary key was not created';
    END IF;
    
    RAISE NOTICE 'MIGRATION SUCCESS: team_members table now has id primary key';
END $$;

-- Final verification
SELECT 
    'MIGRATION VERIFICATION' as status,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
AND column_name = 'id';

-- Show updated table structure
SELECT 
    'UPDATED TABLE STRUCTURE' as status,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;