-- =====================================================
-- ContentLab Nexus Row Level Security (RLS) Policies
-- Comprehensive security policies for team-based access
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_recommendations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Function to check if user is team owner
CREATE OR REPLACE FUNCTION is_team_owner(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM teams 
        WHERE id = team_uuid AND owner_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is team member with specific role
CREATE OR REPLACE FUNCTION is_team_member_with_role(team_uuid UUID, user_uuid UUID, required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = team_uuid 
        AND user_id = user_uuid
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has team access (any role)
CREATE OR REPLACE FUNCTION has_team_access(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.id = team_uuid 
        AND (t.owner_id = user_uuid OR tm.user_id = user_uuid)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can modify team resources
CREATE OR REPLACE FUNCTION can_modify_team_resource(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        WHERE t.id = team_uuid 
        AND (
            t.owner_id = user_uuid 
            OR (tm.user_id = user_uuid AND tm.role IN ('admin', 'owner'))
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's team ID from project
CREATE OR REPLACE FUNCTION get_team_from_project(project_uuid UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT team_id FROM projects WHERE id = project_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TEAMS TABLE POLICIES
-- =====================================================

-- Teams: Users can see teams they own or are members of
CREATE POLICY "teams_select_policy" ON teams
    FOR SELECT
    USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_id = teams.id AND user_id = auth.uid()
        )
    );

-- Teams: Only authenticated users can create teams
CREATE POLICY "teams_insert_policy" ON teams
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND owner_id = auth.uid()
    );

-- Teams: Only team owners can update teams
CREATE POLICY "teams_update_policy" ON teams
    FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Teams: Only team owners can delete teams
CREATE POLICY "teams_delete_policy" ON teams
    FOR DELETE
    USING (owner_id = auth.uid());

-- =====================================================
-- TEAM_MEMBERS TABLE POLICIES
-- =====================================================

-- Team Members: Users can see members of teams they belong to
CREATE POLICY "team_members_select_policy" ON team_members
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR has_team_access(team_id, auth.uid())
    );

-- Team Members: Only team owners and admins can add members
CREATE POLICY "team_members_insert_policy" ON team_members
    FOR INSERT
    WITH CHECK (
        can_modify_team_resource(team_id, auth.uid())
    );

-- Team Members: Only team owners and admins can update member roles
CREATE POLICY "team_members_update_policy" ON team_members
    FOR UPDATE
    USING (
        can_modify_team_resource(team_id, auth.uid())
        -- Team owners cannot be demoted by others
        AND NOT (
            is_team_owner(team_id, user_id) 
            AND auth.uid() != user_id
        )
    )
    WITH CHECK (
        can_modify_team_resource(team_id, auth.uid())
        -- Ensure team always has an owner
        AND NOT (
            is_team_owner(team_id, user_id) 
            AND role != 'owner'
            AND auth.uid() != user_id
        )
    );

-- Team Members: Only team owners and admins can remove members
CREATE POLICY "team_members_delete_policy" ON team_members
    FOR DELETE
    USING (
        -- Users can remove themselves
        user_id = auth.uid()
        -- Or team owners/admins can remove others (except other owners)
        OR (
            can_modify_team_resource(team_id, auth.uid())
            AND NOT is_team_owner(team_id, user_id)
        )
    );

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- Projects: Users can see projects from teams they belong to
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT
    USING (has_team_access(team_id, auth.uid()));

-- Projects: Team members with admin+ roles can create projects
CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT
    WITH CHECK (
        can_modify_team_resource(team_id, auth.uid())
        AND created_by = auth.uid()
    );

-- Projects: Team members with admin+ roles can update projects
CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE
    USING (can_modify_team_resource(team_id, auth.uid()))
    WITH CHECK (can_modify_team_resource(team_id, auth.uid()));

-- Projects: Only team owners can delete projects
CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE
    USING (is_team_owner(team_id, auth.uid()));

-- =====================================================
-- CONTENT_ITEMS TABLE POLICIES
-- =====================================================

-- Content Items: Team members can see content from their projects
CREATE POLICY "content_items_select_policy" ON content_items
    FOR SELECT
    USING (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Content Items: Team members can create content
CREATE POLICY "content_items_insert_policy" ON content_items
    FOR INSERT
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Content Items: Team members can update content
CREATE POLICY "content_items_update_policy" ON content_items
    FOR UPDATE
    USING (has_team_access(get_team_from_project(project_id), auth.uid()))
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Content Items: Team admins+ can delete content
CREATE POLICY "content_items_delete_policy" ON content_items
    FOR DELETE
    USING (can_modify_team_resource(get_team_from_project(project_id), auth.uid()));

-- =====================================================
-- COMPETITORS TABLE POLICIES
-- =====================================================

-- Competitors: Team members can see competitors from their projects
CREATE POLICY "competitors_select_policy" ON competitors
    FOR SELECT
    USING (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Competitors: Team members can add competitors
CREATE POLICY "competitors_insert_policy" ON competitors
    FOR INSERT
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Competitors: Team members can update competitors
CREATE POLICY "competitors_update_policy" ON competitors
    FOR UPDATE
    USING (has_team_access(get_team_from_project(project_id), auth.uid()))
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Competitors: Team admins+ can delete competitors
CREATE POLICY "competitors_delete_policy" ON competitors
    FOR DELETE
    USING (can_modify_team_resource(get_team_from_project(project_id), auth.uid()));

-- =====================================================
-- KEYWORD_OPPORTUNITIES TABLE POLICIES
-- =====================================================

-- Keyword Opportunities: Team members can see keywords from their projects
CREATE POLICY "keyword_opportunities_select_policy" ON keyword_opportunities
    FOR SELECT
    USING (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Keyword Opportunities: Team members can add keywords
CREATE POLICY "keyword_opportunities_insert_policy" ON keyword_opportunities
    FOR INSERT
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Keyword Opportunities: Team members can update keywords
CREATE POLICY "keyword_opportunities_update_policy" ON keyword_opportunities
    FOR UPDATE
    USING (has_team_access(get_team_from_project(project_id), auth.uid()))
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Keyword Opportunities: Team admins+ can delete keywords
CREATE POLICY "keyword_opportunities_delete_policy" ON keyword_opportunities
    FOR DELETE
    USING (can_modify_team_resource(get_team_from_project(project_id), auth.uid()));

-- =====================================================
-- ANALYSIS_RESULTS TABLE POLICIES
-- =====================================================

-- Analysis Results: Team members can see analysis from their projects
CREATE POLICY "analysis_results_select_policy" ON analysis_results
    FOR SELECT
    USING (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Analysis Results: Team members can create analysis results
CREATE POLICY "analysis_results_insert_policy" ON analysis_results
    FOR INSERT
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Analysis Results: Team members can update analysis results
CREATE POLICY "analysis_results_update_policy" ON analysis_results
    FOR UPDATE
    USING (has_team_access(get_team_from_project(project_id), auth.uid()))
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Analysis Results: Team admins+ can delete analysis results
CREATE POLICY "analysis_results_delete_policy" ON analysis_results
    FOR DELETE
    USING (can_modify_team_resource(get_team_from_project(project_id), auth.uid()));

-- =====================================================
-- CONTENT_ANALYTICS TABLE POLICIES
-- =====================================================

-- Content Analytics: Team members can see analytics for their content
CREATE POLICY "content_analytics_select_policy" ON content_analytics
    FOR SELECT
    USING (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM content_items WHERE id = content_analytics.content_id)
            ), 
            auth.uid()
        )
    );

-- Content Analytics: Team members can create analytics data
CREATE POLICY "content_analytics_insert_policy" ON content_analytics
    FOR INSERT
    WITH CHECK (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM content_items WHERE id = content_analytics.content_id)
            ), 
            auth.uid()
        )
    );

-- Content Analytics: Team members can update analytics data
CREATE POLICY "content_analytics_update_policy" ON content_analytics
    FOR UPDATE
    USING (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM content_items WHERE id = content_analytics.content_id)
            ), 
            auth.uid()
        )
    )
    WITH CHECK (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM content_items WHERE id = content_analytics.content_id)
            ), 
            auth.uid()
        )
    );

-- Content Analytics: Team admins+ can delete analytics data
CREATE POLICY "content_analytics_delete_policy" ON content_analytics
    FOR DELETE
    USING (
        can_modify_team_resource(
            get_team_from_project(
                (SELECT project_id FROM content_items WHERE id = content_analytics.content_id)
            ), 
            auth.uid()
        )
    );

-- =====================================================
-- COMPETITOR_ANALYTICS TABLE POLICIES
-- =====================================================

-- Competitor Analytics: Team members can see competitor analytics
CREATE POLICY "competitor_analytics_select_policy" ON competitor_analytics
    FOR SELECT
    USING (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM competitors WHERE id = competitor_analytics.competitor_id)
            ), 
            auth.uid()
        )
    );

-- Competitor Analytics: Team members can create competitor analytics
CREATE POLICY "competitor_analytics_insert_policy" ON competitor_analytics
    FOR INSERT
    WITH CHECK (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM competitors WHERE id = competitor_analytics.competitor_id)
            ), 
            auth.uid()
        )
    );

-- Competitor Analytics: Team members can update competitor analytics
CREATE POLICY "competitor_analytics_update_policy" ON competitor_analytics
    FOR UPDATE
    USING (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM competitors WHERE id = competitor_analytics.competitor_id)
            ), 
            auth.uid()
        )
    )
    WITH CHECK (
        has_team_access(
            get_team_from_project(
                (SELECT project_id FROM competitors WHERE id = competitor_analytics.competitor_id)
            ), 
            auth.uid()
        )
    );

-- Competitor Analytics: Team admins+ can delete competitor analytics
CREATE POLICY "competitor_analytics_delete_policy" ON competitor_analytics
    FOR DELETE
    USING (
        can_modify_team_resource(
            get_team_from_project(
                (SELECT project_id FROM competitors WHERE id = competitor_analytics.competitor_id)
            ), 
            auth.uid()
        )
    );

-- =====================================================
-- CONTENT_RECOMMENDATIONS TABLE POLICIES
-- =====================================================

-- Content Recommendations: Team members can see recommendations for their projects
CREATE POLICY "content_recommendations_select_policy" ON content_recommendations
    FOR SELECT
    USING (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Content Recommendations: System can create recommendations (service role)
CREATE POLICY "content_recommendations_insert_policy" ON content_recommendations
    FOR INSERT
    WITH CHECK (
        has_team_access(get_team_from_project(project_id), auth.uid())
        OR current_setting('role') = 'service_role'
    );

-- Content Recommendations: Team members can update recommendations (mark as implemented/dismissed)
CREATE POLICY "content_recommendations_update_policy" ON content_recommendations
    FOR UPDATE
    USING (has_team_access(get_team_from_project(project_id), auth.uid()))
    WITH CHECK (has_team_access(get_team_from_project(project_id), auth.uid()));

-- Content Recommendations: Team admins+ can delete recommendations
CREATE POLICY "content_recommendations_delete_policy" ON content_recommendations
    FOR DELETE
    USING (can_modify_team_resource(get_team_from_project(project_id), auth.uid()));

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on custom types to authenticated users
GRANT USAGE ON TYPE user_role TO authenticated;
GRANT USAGE ON TYPE project_status TO authenticated;
GRANT USAGE ON TYPE content_type TO authenticated;
GRANT USAGE ON TYPE content_status TO authenticated;
GRANT USAGE ON TYPE analysis_type TO authenticated;
GRANT USAGE ON TYPE competition_level TO authenticated;

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION is_team_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_member_with_role(UUID, UUID, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION has_team_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_modify_team_resource(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_from_project(UUID) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION is_team_owner(UUID, UUID) IS 'Check if user is the owner of a specific team';
COMMENT ON FUNCTION is_team_member_with_role(UUID, UUID, user_role) IS 'Check if user has a specific role in a team';
COMMENT ON FUNCTION has_team_access(UUID, UUID) IS 'Check if user has any access to a team (owner or member)';
COMMENT ON FUNCTION can_modify_team_resource(UUID, UUID) IS 'Check if user can modify team resources (owner or admin)';
COMMENT ON FUNCTION get_team_from_project(UUID) IS 'Get team ID from project ID for RLS policies';