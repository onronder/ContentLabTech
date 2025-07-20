-- ================================================
-- Competitors Table Setup Function
-- ================================================
-- This function creates the competitors table with proper constraints,
-- indexes, and RLS policies for team-based access control

-- Create trigger function for updating timestamps (must be created before the main function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop function if exists to allow updates
DROP FUNCTION IF EXISTS create_competitors_table();

-- Create competitors table setup function
CREATE OR REPLACE FUNCTION create_competitors_table()
RETURNS void AS $$
BEGIN
  -- Create competitors table
  CREATE TABLE IF NOT EXISTS competitors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    website_url TEXT NOT NULL,
    industry VARCHAR(100) NOT NULL,
    description TEXT,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    monitoring_enabled BOOLEAN DEFAULT false,
    
    -- Unique constraint on domain per team
    CONSTRAINT competitors_unique_domain_per_team UNIQUE (team_id, domain),
    
    -- Constraints with fixed regex syntax
    CONSTRAINT competitors_domain_format CHECK (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$'),
    CONSTRAINT competitors_url_format CHECK (website_url ~ '^https?://.*$')
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_competitors_team_id ON competitors(team_id);
  CREATE INDEX IF NOT EXISTS idx_competitors_created_by ON competitors(created_by);
  CREATE INDEX IF NOT EXISTS idx_competitors_industry ON competitors(industry);
  CREATE INDEX IF NOT EXISTS idx_competitors_domain ON competitors(domain);
  CREATE INDEX IF NOT EXISTS idx_competitors_created_at ON competitors(created_at DESC);

  -- Enable RLS
  ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if any (to avoid conflicts)
  DROP POLICY IF EXISTS "Users can view competitors from their team" ON competitors;
  DROP POLICY IF EXISTS "Users can insert competitors for their team" ON competitors;
  DROP POLICY IF EXISTS "Users can update competitors from their team" ON competitors;
  DROP POLICY IF EXISTS "Users can delete competitors from their team" ON competitors;

  -- Create RLS policies
  CREATE POLICY "Users can view competitors from their team"
    ON competitors FOR SELECT
    USING (
      team_id IN (
        SELECT team_id 
        FROM team_members 
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert competitors for their team"
    ON competitors FOR INSERT
    WITH CHECK (
      team_id IN (
        SELECT team_id 
        FROM team_members 
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update competitors from their team"
    ON competitors FOR UPDATE
    USING (
      team_id IN (
        SELECT team_id 
        FROM team_members 
        WHERE user_id = auth.uid()
      )
    )
    WITH CHECK (
      team_id IN (
        SELECT team_id 
        FROM team_members 
        WHERE user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete competitors from their team"
    ON competitors FOR DELETE
    USING (
      team_id IN (
        SELECT team_id 
        FROM team_members 
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
      )
    );

  -- Check if trigger function exists, if not create it outside this function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE NOTICE 'Trigger function update_updated_at_column should be created separately';
  END IF;

  -- Create the trigger if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_competitors_updated_at ON competitors;
    CREATE TRIGGER update_competitors_updated_at
      BEFORE UPDATE ON competitors
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Log success
  RAISE NOTICE 'Competitors table created/updated successfully';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating competitors table: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Additional Helper Functions
-- ================================================

-- Function to check if competitors table exists
CREATE OR REPLACE FUNCTION check_competitors_table_exists()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'competitors'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get competitor stats for a team
DROP FUNCTION IF EXISTS get_competitor_stats(UUID);
CREATE OR REPLACE FUNCTION get_competitor_stats(p_team_id UUID)
RETURNS TABLE (
  total_competitors BIGINT,
  industries JSONB,
  latest_competitor JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_competitors,
    JSONB_AGG(DISTINCT industry ORDER BY industry) as industries,
    JSONB_BUILD_OBJECT(
      'id', id,
      'name', name,
      'created_at', created_at
    ) as latest_competitor
  FROM competitors
  WHERE team_id = p_team_id
  GROUP BY id, name, created_at
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- Migration Comments
-- ================================================
COMMENT ON TABLE competitors IS 'Stores competitor information for competitive intelligence tracking';
COMMENT ON COLUMN competitors.id IS 'Unique identifier for the competitor';
COMMENT ON COLUMN competitors.name IS 'Official name of the competitor company';
COMMENT ON COLUMN competitors.domain IS 'Primary domain of the competitor (e.g., apple.com)';
COMMENT ON COLUMN competitors.website_url IS 'Full website URL of the competitor';
COMMENT ON COLUMN competitors.industry IS 'Industry category of the competitor';
COMMENT ON COLUMN competitors.description IS 'Optional description or notes about the competitor';
COMMENT ON COLUMN competitors.team_id IS 'Reference to the team that owns this competitor record';
COMMENT ON COLUMN competitors.created_by IS 'User who created this competitor record';
COMMENT ON COLUMN competitors.monitoring_enabled IS 'Whether active monitoring is enabled for this competitor';

-- ================================================
-- Execute the setup
-- ================================================
-- Uncomment the line below to execute the function
-- SELECT create_competitors_table();