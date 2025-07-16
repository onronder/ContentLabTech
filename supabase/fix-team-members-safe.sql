-- Safely fix team_members table primary key
-- Handle existing primary key properly
-- Date: 2025-07-16

-- =====================================================
-- STEP 1: Check current primary key
-- =====================================================
SELECT 
    'Current Primary Key:' as info,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as key_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'team_members'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.constraint_name;

-- =====================================================
-- STEP 2: Check if id column already exists
-- =====================================================
SELECT 
    'ID Column Check:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_members' 
            AND table_schema = 'public' 
            AND column_name = 'id'
        ) THEN 'ID column already exists'
        ELSE 'ID column missing'
    END as result;

-- =====================================================
-- STEP 3: Safe migration approach
-- =====================================================

-- First, check what we're working with
DO $$
DECLARE
    existing_pk_name TEXT;
    has_id_column BOOLEAN;
BEGIN
    -- Check if id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_members' 
        AND table_schema = 'public' 
        AND column_name = 'id'
    ) INTO has_id_column;
    
    -- Get existing primary key name
    SELECT tc.constraint_name INTO existing_pk_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'team_members'
    AND tc.table_schema = 'public'
    AND tc.constraint_type = 'PRIMARY KEY';
    
    RAISE NOTICE 'Has ID column: %', has_id_column;
    RAISE NOTICE 'Existing PK: %', COALESCE(existing_pk_name, 'NONE');
    
    -- If no id column, we need to add it
    IF NOT has_id_column THEN
        -- Drop existing primary key if it exists
        IF existing_pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.team_members DROP CONSTRAINT ' || existing_pk_name;
            RAISE NOTICE 'Dropped existing primary key: %', existing_pk_name;
        END IF;
        
        -- Add id column
        ALTER TABLE public.team_members 
        ADD COLUMN id UUID DEFAULT gen_random_uuid();
        
        -- Make it primary key
        ALTER TABLE public.team_members 
        ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);
        
        -- Add unique constraint on team_id + user_id
        ALTER TABLE public.team_members 
        ADD CONSTRAINT team_members_team_user_unique 
        UNIQUE (team_id, user_id);
        
        RAISE NOTICE 'Added id column as primary key and unique constraint on team_id, user_id';
    ELSE
        RAISE NOTICE 'ID column already exists - no migration needed';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- =====================================================
-- STEP 5: Verify the final structure
-- =====================================================
SELECT 
    'Final Structure:' as info,
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'team_members' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check final constraints
SELECT 
    'Final Constraints:' as info,
    tc.constraint_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'team_members'
AND tc.table_schema = 'public'
AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
GROUP BY tc.constraint_name, tc.constraint_type
ORDER BY tc.constraint_type;