-- =====================================================
-- ContentLab Nexus Database Functions
-- Automation, validation, and utility functions
-- =====================================================

-- =====================================================
-- AUDIT LOGGING FUNCTIONS
-- =====================================================

-- Create audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT audit_logs_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Create audit log function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_teams_trigger
    AFTER INSERT OR UPDATE OR DELETE ON teams
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_projects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_content_items_trigger
    AFTER INSERT OR UPDATE OR DELETE ON content_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- TEAM MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to create a team with the creator as owner
CREATE OR REPLACE FUNCTION create_team_with_owner(
    team_name TEXT,
    team_description TEXT DEFAULT NULL,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
    team_id UUID;
BEGIN
    -- Validate input
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated to create a team';
    END IF;
    
    IF LENGTH(TRIM(team_name)) = 0 THEN
        RAISE EXCEPTION 'Team name cannot be empty';
    END IF;
    
    -- Create team
    INSERT INTO teams (name, description, owner_id)
    VALUES (TRIM(team_name), team_description, user_uuid)
    RETURNING id INTO team_id;
    
    -- Add creator as team owner in team_members
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (team_id, user_uuid, 'owner');
    
    RETURN team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite user to team
CREATE OR REPLACE FUNCTION invite_user_to_team(
    team_uuid UUID,
    user_email TEXT,
    user_role user_role DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
    current_user UUID := auth.uid();
BEGIN
    -- Check if current user can modify team
    IF NOT can_modify_team_resource(team_uuid, current_user) THEN
        RAISE EXCEPTION 'Insufficient permissions to invite users to this team';
    END IF;
    
    -- Find user by email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
    
    -- Check if user is already a team member
    IF EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = team_uuid AND user_id = user_uuid
    ) THEN
        RAISE EXCEPTION 'User is already a member of this team';
    END IF;
    
    -- Add user to team
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (team_uuid, user_uuid, user_role);
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to transfer team ownership
CREATE OR REPLACE FUNCTION transfer_team_ownership(
    team_uuid UUID,
    new_owner_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    current_owner UUID;
    current_user UUID := auth.uid();
BEGIN
    -- Get current owner
    SELECT owner_id INTO current_owner FROM teams WHERE id = team_uuid;
    
    -- Only current owner can transfer ownership
    IF current_owner != current_user THEN
        RAISE EXCEPTION 'Only the current team owner can transfer ownership';
    END IF;
    
    -- Check if new owner is a team member
    IF NOT EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_id = team_uuid AND user_id = new_owner_uuid
    ) THEN
        RAISE EXCEPTION 'New owner must be a team member';
    END IF;
    
    -- Update team owner
    UPDATE teams SET owner_id = new_owner_uuid WHERE id = team_uuid;
    
    -- Update team_members roles
    UPDATE team_members 
    SET role = 'admin' 
    WHERE team_id = team_uuid AND user_id = current_owner;
    
    UPDATE team_members 
    SET role = 'owner' 
    WHERE team_id = team_uuid AND user_id = new_owner_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONTENT MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to calculate content SEO score
CREATE OR REPLACE FUNCTION calculate_content_seo_score(
    content_id_param UUID
)
RETURNS DECIMAL AS $$
DECLARE
    content_record RECORD;
    seo_score DECIMAL := 0;
    title_length INTEGER;
    meta_desc_length INTEGER;
    content_length INTEGER;
    keyword_count INTEGER;
BEGIN
    -- Get content details
    SELECT title, meta_title, meta_description, content, focus_keywords
    INTO content_record
    FROM content_items
    WHERE id = content_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Content item not found';
    END IF;
    
    -- Calculate title score (25 points max)
    title_length := LENGTH(COALESCE(content_record.meta_title, content_record.title));
    IF title_length >= 30 AND title_length <= 60 THEN
        seo_score := seo_score + 25;
    ELSIF title_length >= 20 AND title_length <= 70 THEN
        seo_score := seo_score + 15;
    ELSIF title_length > 0 THEN
        seo_score := seo_score + 5;
    END IF;
    
    -- Calculate meta description score (20 points max)
    meta_desc_length := LENGTH(content_record.meta_description);
    IF meta_desc_length >= 120 AND meta_desc_length <= 160 THEN
        seo_score := seo_score + 20;
    ELSIF meta_desc_length >= 100 AND meta_desc_length <= 180 THEN
        seo_score := seo_score + 15;
    ELSIF meta_desc_length > 0 THEN
        seo_score := seo_score + 5;
    END IF;
    
    -- Calculate content length score (25 points max)
    content_length := LENGTH(content_record.content);
    IF content_length >= 1000 THEN
        seo_score := seo_score + 25;
    ELSIF content_length >= 500 THEN
        seo_score := seo_score + 15;
    ELSIF content_length >= 200 THEN
        seo_score := seo_score + 10;
    ELSIF content_length > 0 THEN
        seo_score := seo_score + 5;
    END IF;
    
    -- Calculate focus keywords score (20 points max)
    keyword_count := array_length(content_record.focus_keywords, 1);
    IF keyword_count >= 3 AND keyword_count <= 5 THEN
        seo_score := seo_score + 20;
    ELSIF keyword_count >= 1 AND keyword_count <= 7 THEN
        seo_score := seo_score + 15;
    ELSIF keyword_count > 0 THEN
        seo_score := seo_score + 5;
    END IF;
    
    -- URL structure score (10 points max)
    -- This is a simplified check
    seo_score := seo_score + 10;
    
    RETURN LEAST(seo_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-update SEO score when content changes
CREATE OR REPLACE FUNCTION update_content_seo_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.seo_score := calculate_content_seo_score(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update SEO score on insert
CREATE TRIGGER update_content_seo_score_insert_trigger
    BEFORE INSERT ON content_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_content_seo_score();

-- Trigger to auto-update SEO score on update (only when relevant fields change)
CREATE TRIGGER update_content_seo_score_update_trigger
    BEFORE UPDATE ON content_items
    FOR EACH ROW 
    WHEN (
        NEW.title IS DISTINCT FROM OLD.title OR
        NEW.meta_title IS DISTINCT FROM OLD.meta_title OR
        NEW.meta_description IS DISTINCT FROM OLD.meta_description OR
        NEW.content IS DISTINCT FROM OLD.content OR
        NEW.focus_keywords IS DISTINCT FROM OLD.focus_keywords
    )
    EXECUTE FUNCTION update_content_seo_score();

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Function to get project performance summary
CREATE OR REPLACE FUNCTION get_project_performance_summary(
    project_uuid UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_content INTEGER,
    published_content INTEGER,
    avg_seo_score DECIMAL,
    total_pageviews BIGINT,
    total_organic_traffic BIGINT,
    avg_bounce_rate DECIMAL,
    total_conversions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(ci.id)::INTEGER as total_content,
        COUNT(CASE WHEN ci.status = 'published' THEN 1 END)::INTEGER as published_content,
        ROUND(AVG(ci.seo_score), 2) as avg_seo_score,
        COALESCE(SUM(ca.pageviews), 0)::BIGINT as total_pageviews,
        COALESCE(SUM(ca.organic_traffic), 0)::BIGINT as total_organic_traffic,
        ROUND(AVG(ca.bounce_rate), 2) as avg_bounce_rate,
        COALESCE(SUM(ca.conversions), 0)::BIGINT as total_conversions
    FROM content_items ci
    LEFT JOIN content_analytics ca ON ci.id = ca.content_id 
        AND ca.date BETWEEN start_date AND end_date
    WHERE ci.project_id = project_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top performing content
CREATE OR REPLACE FUNCTION get_top_performing_content(
    project_uuid UUID,
    limit_count INTEGER DEFAULT 10,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    content_id UUID,
    title TEXT,
    url TEXT,
    total_pageviews BIGINT,
    total_organic_traffic BIGINT,
    avg_bounce_rate DECIMAL,
    conversions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.id,
        ci.title::TEXT,
        ci.url::TEXT,
        COALESCE(SUM(ca.pageviews), 0)::BIGINT as total_pageviews,
        COALESCE(SUM(ca.organic_traffic), 0)::BIGINT as total_organic_traffic,
        ROUND(AVG(ca.bounce_rate), 2) as avg_bounce_rate,
        COALESCE(SUM(ca.conversions), 0)::BIGINT as conversions
    FROM content_items ci
    LEFT JOIN content_analytics ca ON ci.id = ca.content_id 
        AND ca.date BETWEEN start_date AND end_date
    WHERE ci.project_id = project_uuid 
        AND ci.status = 'published'
    GROUP BY ci.id, ci.title, ci.url
    ORDER BY total_pageviews DESC, total_organic_traffic DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATA VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate URL format
CREATE OR REPLACE FUNCTION is_valid_url(url_string TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN url_string ~ '^https?://.+\..+';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email_string TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email_string ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean and normalize keywords
CREATE OR REPLACE FUNCTION normalize_keywords(keywords TEXT[])
RETURNS TEXT[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT DISTINCT LOWER(TRIM(unnest))
        FROM unnest(keywords)
        WHERE LENGTH(TRIM(unnest)) > 0
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up expired analysis results
CREATE OR REPLACE FUNCTION cleanup_expired_analysis()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analysis_results 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to anonymize deleted user data
CREATE OR REPLACE FUNCTION anonymize_user_data(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update audit logs to remove user reference
    UPDATE audit_logs 
    SET user_id = NULL 
    WHERE user_id = user_uuid;
    
    -- Note: Teams and projects created by the user are preserved
    -- but the created_by field could be updated to NULL if needed
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_team_with_owner(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION invite_user_to_team(UUID, TEXT, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_team_ownership(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_content_seo_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_project_performance_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performing_content(UUID, INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_url(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_keywords(TEXT[]) TO authenticated;

-- Grant cleanup functions to service role only
GRANT EXECUTE ON FUNCTION cleanup_expired_analysis() TO service_role;
GRANT EXECUTE ON FUNCTION anonymize_user_data(UUID) TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION create_team_with_owner(TEXT, TEXT, UUID) IS 'Create a new team with the specified user as owner';
COMMENT ON FUNCTION invite_user_to_team(UUID, TEXT, user_role) IS 'Invite a user to join a team with specified role';
COMMENT ON FUNCTION transfer_team_ownership(UUID, UUID) IS 'Transfer ownership of a team to another member';
COMMENT ON FUNCTION calculate_content_seo_score(UUID) IS 'Calculate SEO score for content item based on various factors';
COMMENT ON FUNCTION get_project_performance_summary(UUID, DATE, DATE) IS 'Get performance summary for a project within date range';
COMMENT ON FUNCTION get_top_performing_content(UUID, INTEGER, DATE, DATE) IS 'Get top performing content for a project';
COMMENT ON FUNCTION cleanup_expired_analysis() IS 'Remove expired analysis results from the database';
COMMENT ON FUNCTION anonymize_user_data(UUID) IS 'Anonymize data associated with a deleted user';