-- ================================================
-- Migration: Create Competitors Table (Fixed Version)
-- Version: 20240101000001
-- Description: Creates the competitors table with constraints, indexes, and RLS policies
-- ================================================

-- Drop existing objects to ensure clean setup
DROP TABLE IF EXISTS competitors CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create trigger function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create competitors table
CREATE TABLE competitors (
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
  
  -- Domain format validation
  CONSTRAINT competitors_domain_format CHECK (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$'),
  
  -- URL format validation
  CONSTRAINT competitors_url_format CHECK (website_url ~ '^https?://.*$')
);

-- Create indexes
CREATE INDEX idx_competitors_team_id ON competitors(team_id);
CREATE INDEX idx_competitors_created_by ON competitors(created_by);
CREATE INDEX idx_competitors_industry ON competitors(industry);
CREATE INDEX idx_competitors_domain ON competitors(domain);
CREATE INDEX idx_competitors_created_at ON competitors(created_at DESC);

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

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
    AND created_by = auth.uid()
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

-- Create update trigger
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON competitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
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

-- Grant permissions
GRANT ALL ON competitors TO authenticated;