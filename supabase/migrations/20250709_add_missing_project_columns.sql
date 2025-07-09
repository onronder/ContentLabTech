-- =====================================================
-- Add Missing Project Columns Migration
-- Date: 2025-07-09
-- Purpose: Fix Projects API 500 error by adding missing columns
-- =====================================================

-- Add missing columns to projects table that the API expects
ALTER TABLE projects 
ADD COLUMN target_audience TEXT,
ADD COLUMN content_goals TEXT[] DEFAULT '{}',
ADD COLUMN competitors TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN projects.target_audience IS 'Target audience description for the project';
COMMENT ON COLUMN projects.content_goals IS 'Array of content goals for the project';
COMMENT ON COLUMN projects.competitors IS 'Array of competitor names/URLs for the project';