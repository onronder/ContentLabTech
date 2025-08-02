-- Content Library Critical Security Fixes (Corrected)
-- Implements RLS policies and creates test data

-- ===================================================================
-- CRITICAL SECURITY: ENABLE ROW LEVEL SECURITY
-- ===================================================================

-- 1. Enable RLS on content_items table
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Users can only view content in projects they have access to
CREATE POLICY "Users can view content in accessible projects" ON content_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = content_items.project_id
      AND (p.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = p.team_id 
        AND tm.user_id = auth.uid()
      ))
    )
  );

-- Users can insert content only in their own projects or team projects
CREATE POLICY "Users can insert content in accessible projects" ON content_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = content_items.project_id
      AND (p.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = p.team_id 
        AND tm.user_id = auth.uid()
      ))
    )
  );

-- Users can update content in their own projects or team projects
CREATE POLICY "Users can update content in accessible projects" ON content_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = content_items.project_id
      AND (p.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = p.team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
      ))
    )
  );

-- Users can delete content in their own projects or team projects (if admin)
CREATE POLICY "Users can delete content in accessible projects" ON content_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = content_items.project_id
      AND (p.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = p.team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
      ))
    )
  );

-- ===================================================================
-- CONTENT ANALYTICS RLS
-- ===================================================================

-- Enable RLS on content_analytics table
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for accessible content" ON content_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      JOIN projects p ON ci.project_id = p.id
      WHERE ci.id = content_analytics.content_id
      AND (p.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = p.team_id 
        AND tm.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can manage analytics for accessible content" ON content_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_items ci
      JOIN projects p ON ci.project_id = p.id
      WHERE ci.id = content_analytics.content_id
      AND (p.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.team_id = p.team_id 
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin')
      ))
    )
  );

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Create index for better performance on content queries
CREATE INDEX IF NOT EXISTS idx_content_items_project_id ON content_items(project_id);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_content_type ON content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_analytics_content_id ON content_analytics(content_id);

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON POLICY "Users can view content in accessible projects" ON content_items IS 
'Ensures users can only see content in projects they own or are team members of';

COMMENT ON POLICY "Users can insert content in accessible projects" ON content_items IS 
'Restricts content creation to user''s own projects or team projects';