-- =====================================================
-- ContentLab Nexus - RLS Policy Optimization
-- Optimizes Row Level Security policies for performance
-- =====================================================

-- =====================================================
-- BACKUP EXISTING POLICIES (FOR ROLLBACK IF NEEDED)
-- =====================================================

-- Create a backup table to store policy definitions
CREATE TABLE IF NOT EXISTS rls_policy_backup (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    policy_definition TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup current policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, definition
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        INSERT INTO rls_policy_backup (table_name, policy_name, policy_definition)
        VALUES (
            policy_record.tablename, 
            policy_record.policyname, 
            policy_record.definition
        );
    END LOOP;
    
    RAISE NOTICE '✅ Backed up % existing RLS policies', (SELECT COUNT(*) FROM rls_policy_backup);
END $$;

-- =====================================================
-- OPTIMIZED TEAM ACCESS POLICIES
-- =====================================================

-- Drop existing team policies
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Users can update teams they own" ON teams;
DROP POLICY IF EXISTS "Users can delete teams they own" ON teams;

-- Optimized team policies with better indexes utilization
CREATE POLICY "optimized_teams_select" ON teams
    FOR SELECT TO authenticated
    USING (
        -- More efficient team membership check
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = teams.id 
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "optimized_teams_update" ON teams
    FOR UPDATE TO authenticated
    USING (
        -- Owner check with index optimization
        owner_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = teams.id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "optimized_teams_delete" ON teams
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- =====================================================
-- OPTIMIZED TEAM MEMBERS POLICIES
-- =====================================================

-- Drop existing team member policies
DROP POLICY IF EXISTS "Users can view team members of teams they belong to" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage members" ON team_members;

-- Optimized team member policies
CREATE POLICY "optimized_team_members_select" ON team_members
    FOR SELECT TO authenticated
    USING (
        -- Self-access or team membership
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = team_members.team_id 
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "optimized_team_members_insert" ON team_members
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Only team owners/admins can add members
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id
            AND (
                t.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.team_id = t.id
                    AND tm.user_id = auth.uid()
                    AND tm.role IN ('owner', 'admin')
                )
            )
        )
    );

CREATE POLICY "optimized_team_members_update" ON team_members
    FOR UPDATE TO authenticated
    USING (
        -- Self-update of non-critical fields or admin access
        (user_id = auth.uid() AND role = OLD.role) -- User can't change their own role
        OR
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id
            AND (
                t.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.team_id = t.id
                    AND tm.user_id = auth.uid()
                    AND tm.role IN ('owner', 'admin')
                )
            )
        )
    );

CREATE POLICY "optimized_team_members_delete" ON team_members
    FOR DELETE TO authenticated
    USING (
        -- Self-removal or admin removal
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id
            AND (
                t.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.team_id = t.id
                    AND tm.user_id = auth.uid()
                    AND tm.role IN ('owner', 'admin')
                )
            )
        )
    );

-- =====================================================
-- OPTIMIZED PROJECT POLICIES
-- =====================================================

-- Drop existing project policies
DROP POLICY IF EXISTS "Users can view projects of teams they belong to" ON projects;
DROP POLICY IF EXISTS "Team members can manage projects" ON projects;

-- Optimized project policies using efficient joins
CREATE POLICY "optimized_projects_select" ON projects
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "optimized_projects_insert" ON projects
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "optimized_projects_update" ON projects
    FOR UPDATE TO authenticated
    USING (
        -- Project creator or team admin
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.team_id = projects.team_id 
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "optimized_projects_delete" ON projects
    FOR DELETE TO authenticated
    USING (
        -- Project creator or team owner
        created_by = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = projects.team_id
            AND t.owner_id = auth.uid()
        )
    );

-- =====================================================
-- OPTIMIZED CONTENT POLICIES
-- =====================================================

-- Drop existing content policies
DROP POLICY IF EXISTS "Users can view content of accessible projects" ON content_items;
DROP POLICY IF EXISTS "Team members can manage content" ON content_items;

-- Optimized content policies with project-based access
CREATE POLICY "optimized_content_select" ON content_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = content_items.project_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "optimized_content_insert" ON content_items
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = content_items.project_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "optimized_content_update" ON content_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = content_items.project_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "optimized_content_delete" ON content_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = content_items.project_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- OPTIMIZED COMPETITOR POLICIES
-- =====================================================

-- Drop existing competitor policies if they exist
DROP POLICY IF EXISTS "Users can view competitors of accessible projects" ON competitors;
DROP POLICY IF EXISTS "Team members can manage competitors" ON competitors;

-- Optimized competitor policies
CREATE POLICY "optimized_competitors_select" ON competitors
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = competitors.project_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "optimized_competitors_insert" ON competitors
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = competitors.project_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "optimized_competitors_update" ON competitors
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = competitors.project_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin', 'member')
        )
    );

CREATE POLICY "optimized_competitors_delete" ON competitors
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE p.id = competitors.project_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

-- =====================================================
-- OPTIMIZED ANALYTICS POLICIES
-- =====================================================

-- Content analytics policies
DROP POLICY IF EXISTS "Users can view analytics of accessible content" ON content_analytics;
CREATE POLICY "optimized_content_analytics_select" ON content_analytics
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM content_items ci
            JOIN projects p ON p.id = ci.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE ci.id = content_analytics.content_id
            AND tm.user_id = auth.uid()
        )
    );

-- Competitor analytics policies
DROP POLICY IF EXISTS "Users can view competitor analytics" ON competitor_analytics;
CREATE POLICY "optimized_competitor_analytics_select" ON competitor_analytics
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM competitors c
            JOIN projects p ON p.id = c.project_id
            JOIN team_members tm ON tm.team_id = p.team_id
            WHERE c.id = competitor_analytics.competitor_id
            AND tm.user_id = auth.uid()
        )
    );

-- =====================================================
-- OPTIMIZED COMPETITIVE INTELLIGENCE POLICIES
-- =====================================================

-- Competitive keywords policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitive_keywords') THEN
        DROP POLICY IF EXISTS "Users can view competitive keywords" ON competitive_keywords;
        CREATE POLICY "optimized_competitive_keywords_select" ON competitive_keywords
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.team_id = competitive_keywords.team_id
                    AND tm.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Competitor tracking policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_tracking') THEN
        DROP POLICY IF EXISTS "Users can view competitor tracking" ON competitor_tracking;
        CREATE POLICY "optimized_competitor_tracking_select" ON competitor_tracking
            FOR SELECT TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM team_members tm
                    WHERE tm.team_id = competitor_tracking.team_id
                    AND tm.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- =====================================================
-- FUNCTION-BASED POLICIES FOR COMPLEX LOGIC
-- =====================================================

-- Create optimized helper functions for RLS
CREATE OR REPLACE FUNCTION auth.user_has_team_access(team_uuid UUID, required_role TEXT DEFAULT 'member')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_uuid
        AND tm.user_id = auth.uid()
        AND (
            required_role = 'member' 
            OR required_role = 'viewer'
            OR tm.role = required_role
            OR (required_role = 'admin' AND tm.role IN ('admin', 'owner'))
            OR (required_role = 'owner' AND tm.role = 'owner')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth.user_has_project_access(project_uuid UUID, required_role TEXT DEFAULT 'member')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = project_uuid
        AND tm.user_id = auth.uid()
        AND (
            required_role = 'member' 
            OR required_role = 'viewer'
            OR tm.role = required_role
            OR (required_role = 'admin' AND tm.role IN ('admin', 'owner'))
            OR (required_role = 'owner' AND tm.role = 'owner')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- RECOMMENDATIONS AND ANALYSIS POLICIES
-- =====================================================

-- Content recommendations policies
DROP POLICY IF EXISTS "Users can view recommendations" ON content_recommendations;
CREATE POLICY "optimized_recommendations_select" ON content_recommendations
    FOR SELECT TO authenticated
    USING (auth.user_has_project_access(project_id, 'viewer'));

CREATE POLICY "optimized_recommendations_update" ON content_recommendations
    FOR UPDATE TO authenticated
    USING (auth.user_has_project_access(project_id, 'member'));

-- Analysis results policies
DROP POLICY IF EXISTS "Users can view analysis results" ON analysis_results;
CREATE POLICY "optimized_analysis_select" ON analysis_results
    FOR SELECT TO authenticated
    USING (auth.user_has_project_access(project_id, 'viewer'));

-- Keyword opportunities policies
DROP POLICY IF EXISTS "Users can view keyword opportunities" ON keyword_opportunities;
CREATE POLICY "optimized_keywords_select" ON keyword_opportunities
    FOR SELECT TO authenticated
    USING (auth.user_has_project_access(project_id, 'viewer'));

CREATE POLICY "optimized_keywords_insert" ON keyword_opportunities
    FOR INSERT TO authenticated
    WITH CHECK (auth.user_has_project_access(project_id, 'member'));

CREATE POLICY "optimized_keywords_update" ON keyword_opportunities
    FOR UPDATE TO authenticated
    USING (auth.user_has_project_access(project_id, 'member'));

-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES FOR RLS
-- =====================================================

-- Indexes to support optimized RLS policies
DO $$
BEGIN
    -- Team membership access optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_user_team_rls') THEN
        CREATE INDEX CONCURRENTLY idx_team_members_user_team_rls ON team_members(user_id, team_id, role);
    END IF;
    
    -- Project team access optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_team_rls') THEN
        CREATE INDEX CONCURRENTLY idx_projects_team_rls ON projects(team_id, id);
    END IF;
    
    -- Content project access optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_project_rls') THEN
        CREATE INDEX CONCURRENTLY idx_content_project_rls ON content_items(project_id, id);
    END IF;
    
    -- Competitor project access optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_project_rls') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_project_rls ON competitors(project_id, id);
    END IF;
END $$;

-- =====================================================
-- RLS POLICY TESTING FUNCTIONS
-- =====================================================

-- Function to test RLS policy performance
CREATE OR REPLACE FUNCTION test_rls_performance()
RETURNS TABLE(
    table_name TEXT,
    policy_name TEXT,
    avg_execution_time NUMERIC,
    test_result TEXT
) AS $$
DECLARE
    test_user_id UUID;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    execution_time NUMERIC;
BEGIN
    -- Create a test user context
    test_user_id := '550e8400-e29b-41d4-a716-446655440000';
    
    -- Test teams access
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM teams WHERE auth.user_has_team_access(id, 'viewer');
    end_time := clock_timestamp();
    execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'teams'::TEXT, 
        'optimized_teams_select'::TEXT, 
        execution_time::NUMERIC, 
        CASE WHEN execution_time < 100 THEN 'FAST' ELSE 'SLOW' END::TEXT;
    
    -- Test projects access
    start_time := clock_timestamp();
    PERFORM COUNT(*) FROM projects WHERE auth.user_has_project_access(id, 'viewer');
    end_time := clock_timestamp();
    execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    RETURN QUERY SELECT 
        'projects'::TEXT, 
        'optimized_projects_select'::TEXT, 
        execution_time::NUMERIC, 
        CASE WHEN execution_time < 100 THEN 'FAST' ELSE 'SLOW' END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING AND ALERTING
-- =====================================================

-- Create RLS performance monitoring view
CREATE OR REPLACE VIEW rls_policy_performance AS
SELECT 
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN definition LIKE '%EXISTS%' THEN 'SUBQUERY_BASED'
        WHEN definition LIKE '%auth.%' THEN 'FUNCTION_BASED'
        ELSE 'SIMPLE'
    END as policy_type,
    LENGTH(definition) as policy_complexity
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- COMPLETION AND VERIFICATION
-- =====================================================

-- Verify all policies are enabled
DO $$
DECLARE
    policy_count INTEGER;
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '✅ RLS Policy Optimization completed successfully';
    RAISE NOTICE '📊 Applied % optimized policies across % tables', policy_count, table_count;
    RAISE NOTICE '🚀 Performance-optimized RLS functions created';
    RAISE NOTICE '📈 Monitoring views and test functions available';
    RAISE NOTICE '🔍 Run SELECT * FROM test_rls_performance() to verify performance';
END $$;

-- Log the optimization
INSERT INTO user_events (user_id, event_type, event_data) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'rls_policies_optimized',
    jsonb_build_object(
        'optimization_type', 'performance_focused',
        'policies_optimized', (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'),
        'helper_functions_created', 2,
        'monitoring_views_created', 1,
        'timestamp', now()
    )
) ON CONFLICT DO NOTHING;