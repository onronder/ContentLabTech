-- ================================================
-- Migration: Create Competitors Table
-- Version: 20240101000000
-- Description: Creates the competitors table with constraints, indexes, and RLS policies
-- ================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
  
  -- Unique constraint on domain per team (each team can track the same competitor)
  CONSTRAINT competitors_unique_domain_per_team UNIQUE (team_id, domain),
  
  -- Domain format validation (e.g., example.com)
  CONSTRAINT competitors_domain_format CHECK (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$'),
  
  -- URL format validation (must start with http:// or https://)
  CONSTRAINT competitors_url_format CHECK (website_url ~ '^https?://.*$')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_competitors_team_id ON competitors(team_id);
CREATE INDEX IF NOT EXISTS idx_competitors_created_by ON competitors(created_by);
CREATE INDEX IF NOT EXISTS idx_competitors_industry ON competitors(industry);
CREATE INDEX IF NOT EXISTS idx_competitors_domain ON competitors(domain);
CREATE INDEX IF NOT EXISTS idx_competitors_created_at ON competitors(created_at DESC);

-- Enable Row Level Security
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view competitors from their team" ON competitors;
DROP POLICY IF EXISTS "Users can insert competitors for their team" ON competitors;
DROP POLICY IF EXISTS "Users can update competitors from their team" ON competitors;
DROP POLICY IF EXISTS "Admins can delete competitors from their team" ON competitors;

-- RLS Policies
-- Users can view competitors from their team
CREATE POLICY "Users can view competitors from their team"
  ON competitors FOR SELECT
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert competitors for their team
CREATE POLICY "Users can insert competitors for their team"
  ON competitors FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update competitors from their team
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

-- Users can delete competitors from their team (only admins and owners)
CREATE POLICY "Admins can delete competitors from their team"
  ON competitors FOR DELETE
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_competitors_updated_at ON competitors;
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
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

-- Grant permissions to authenticated users
GRANT ALL ON competitors TO authenticated;

-- Create a function to get competitor stats
DROP FUNCTION IF EXISTS get_competitor_stats(UUID);
CREATE OR REPLACE FUNCTION get_competitor_stats(p_team_id UUID)
RETURNS TABLE (
  total_competitors BIGINT,
  industry_count BIGINT,
  latest_competitor_name TEXT,
  latest_competitor_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_competitors,
    COUNT(DISTINCT industry)::BIGINT as industry_count,
    (SELECT name FROM competitors WHERE team_id = p_team_id ORDER BY created_at DESC LIMIT 1) as latest_competitor_name,
    (SELECT created_at FROM competitors WHERE team_id = p_team_id ORDER BY created_at DESC LIMIT 1) as latest_competitor_date
  FROM competitors
  WHERE team_id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check for duplicate domains within a team
DROP FUNCTION IF EXISTS check_competitor_domain_unique(UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION check_competitor_domain_unique(p_team_id UUID, p_domain TEXT, p_exclude_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM competitors 
    WHERE team_id = p_team_id 
      AND LOWER(domain) = LOWER(p_domain)
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;