-- =====================================================
-- ContentLab Nexus Seed Data
-- Initial data for development and testing
-- =====================================================

-- =====================================================
-- DEVELOPMENT SEED DATA
-- =====================================================

-- Note: This seed data is for development purposes only
-- In production, teams and projects will be created through the application

-- Insert development users (these would normally be created through auth)
-- This is handled by Supabase Auth, so we don't insert directly into auth.users

-- =====================================================
-- EXAMPLE DATA STRUCTURE
-- =====================================================

-- Example of how data would look when created through the application:

-- Teams would be created like:
-- INSERT INTO teams (name, description, owner_id) 
-- VALUES ('Example Marketing Team', 'Content marketing team for our SaaS product', user_uuid);

-- Projects would be created like:
-- INSERT INTO projects (team_id, name, description, website_url, target_keywords, created_by)
-- VALUES (team_uuid, 'Main Website', 'Our main company website', 'https://example.com', 
--         ARRAY['content marketing', 'saas', 'analytics'], user_uuid);

-- Content items would be created like:
-- INSERT INTO content_items (project_id, title, url, content_type, focus_keywords)
-- VALUES (project_uuid, 'How to Improve Your Content Marketing Strategy', 
--         'https://example.com/blog/content-marketing-strategy', 'blog_post',
--         ARRAY['content marketing', 'strategy', 'seo']);

-- =====================================================
-- SAMPLE KEYWORD OPPORTUNITIES DATA
-- =====================================================

-- This can be populated as an example once projects exist
-- INSERT INTO keyword_opportunities (project_id, keyword, search_volume, difficulty_score, opportunity_score, competition_level)
-- VALUES 
--     (project_uuid, 'content marketing tools', 2400, 65.5, 78.2, 'medium'),
--     (project_uuid, 'seo analytics dashboard', 1200, 72.1, 68.9, 'high'),
--     (project_uuid, 'competitor analysis software', 890, 58.3, 82.1, 'medium');

-- =====================================================
-- DEVELOPMENT FUNCTIONS
-- =====================================================

-- Function to generate sample data for testing (dev only)
CREATE OR REPLACE FUNCTION generate_sample_data_for_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    team_uuid UUID;
    project_uuid UUID;
    content_uuid UUID;
    competitor_uuid UUID;
BEGIN
    -- Only run in development environment
    IF current_setting('app.environment', true) != 'development' THEN
        RAISE EXCEPTION 'Sample data generation only allowed in development environment';
    END IF;
    
    -- Create sample team
    SELECT create_team_with_owner(
        'Sample Marketing Team', 
        'A sample team for testing ContentLab Nexus features',
        user_uuid
    ) INTO team_uuid;
    
    -- Create sample project
    INSERT INTO projects (team_id, name, description, website_url, target_keywords, created_by)
    VALUES (
        team_uuid,
        'Sample Website Project',
        'A sample project for testing content analysis features',
        'https://example.com',
        ARRAY['content marketing', 'seo', 'analytics', 'saas'],
        user_uuid
    ) RETURNING id INTO project_uuid;
    
    -- Create sample content items
    INSERT INTO content_items (project_id, title, url, content_type, status, focus_keywords, meta_title, meta_description, word_count)
    VALUES 
        (
            project_uuid,
            'Complete Guide to Content Marketing Analytics',
            'https://example.com/blog/content-marketing-analytics-guide',
            'blog_post',
            'published',
            ARRAY['content marketing', 'analytics', 'metrics'],
            'Content Marketing Analytics: Complete Guide 2024',
            'Learn how to track and analyze your content marketing performance with our comprehensive guide to content analytics tools and metrics.',
            2500
        ),
        (
            project_uuid,
            'Top 10 SEO Tools for Content Creators',
            'https://example.com/blog/seo-tools-content-creators',
            'blog_post',
            'published',
            ARRAY['seo tools', 'content creation', 'optimization'],
            'Best SEO Tools for Content Creators in 2024',
            'Discover the top SEO tools that content creators use to optimize their content for search engines and drive organic traffic.',
            1800
        ),
        (
            project_uuid,
            'How to Perform Competitor Content Analysis',
            'https://example.com/blog/competitor-content-analysis',
            'blog_post',
            'draft',
            ARRAY['competitor analysis', 'content strategy', 'research'],
            'Competitor Content Analysis: Step-by-Step Guide',
            'Master competitor content analysis with our detailed guide. Learn to identify content gaps and opportunities.',
            0
        )
    RETURNING id INTO content_uuid;
    
    -- Create sample competitors
    INSERT INTO competitors (project_id, name, website_url, description, market_share, monitoring_enabled)
    VALUES 
        (
            project_uuid,
            'ContentTool Pro',
            'https://contenttool.com',
            'Leading content marketing analytics platform',
            25.5,
            true
        ),
        (
            project_uuid,
            'SEO Analytics Hub',
            'https://seoanalytics.com',
            'Comprehensive SEO and content analysis tool',
            18.2,
            true
        ),
        (
            project_uuid,
            'Marketing Insights',
            'https://marketinginsights.com',
            'All-in-one marketing analytics solution',
            12.8,
            false
        )
    RETURNING id INTO competitor_uuid;
    
    -- Create sample keyword opportunities
    INSERT INTO keyword_opportunities (project_id, keyword, search_volume, difficulty_score, opportunity_score, competition_level)
    VALUES 
        (project_uuid, 'content marketing metrics', 1800, 58.5, 82.3, 'medium'),
        (project_uuid, 'seo content analysis', 2400, 65.2, 75.8, 'high'),
        (project_uuid, 'competitor content research', 890, 52.1, 88.9, 'low'),
        (project_uuid, 'content performance tracking', 1200, 61.3, 79.4, 'medium'),
        (project_uuid, 'blog analytics tools', 1600, 59.8, 76.2, 'medium'),
        (project_uuid, 'content gap analysis', 720, 48.7, 91.2, 'low'),
        (project_uuid, 'content roi measurement', 650, 55.4, 85.6, 'low'),
        (project_uuid, 'editorial calendar analytics', 420, 42.1, 93.5, 'low');
    
    -- Create sample content recommendations
    INSERT INTO content_recommendations (project_id, content_id, recommendation_type, title, description, priority, estimated_impact, implementation_effort)
    VALUES 
        (
            project_uuid,
            (SELECT id FROM content_items WHERE project_id = project_uuid LIMIT 1),
            'seo_optimization',
            'Optimize meta description length',
            'The meta description is too short. Expand it to 140-160 characters to improve click-through rates from search results.',
            8,
            'high',
            'low'
        ),
        (
            project_uuid,
            (SELECT id FROM content_items WHERE project_id = project_uuid LIMIT 1),
            'content_enhancement',
            'Add more internal links',
            'Include 3-5 internal links to related content to improve user engagement and SEO authority distribution.',
            6,
            'medium',
            'low'
        ),
        (
            project_uuid,
            NULL,
            'content_gap',
            'Create content for "content marketing roi"',
            'High-opportunity keyword with low competition. Create comprehensive guide about measuring content marketing ROI.',
            9,
            'high',
            'high'
        );
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback any partial data
        RAISE EXCEPTION 'Failed to generate sample data: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEAN UP FUNCTION
-- =====================================================

-- Function to clean up sample data (dev only)
CREATE OR REPLACE FUNCTION cleanup_sample_data()
RETURNS BOOLEAN AS $$
BEGIN
    -- Only run in development environment
    IF current_setting('app.environment', true) != 'development' THEN
        RAISE EXCEPTION 'Sample data cleanup only allowed in development environment';
    END IF;
    
    -- Delete sample data (cascading deletes will handle related records)
    DELETE FROM teams WHERE name LIKE '%Sample%';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEVELOPMENT ENVIRONMENT SETUP
-- =====================================================

-- Set development environment flag
-- This would typically be set via environment variable or config
-- SELECT set_config('app.environment', 'development', false);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION generate_sample_data_for_user(UUID) IS 'Generate sample data for testing purposes (development only)';
COMMENT ON FUNCTION cleanup_sample_data() IS 'Clean up sample data (development only)';

-- =====================================================
-- NOTES
-- =====================================================

/*
To use the sample data generation:

1. First, create a user through Supabase Auth
2. Get the user UUID from auth.users
3. Call the function:
   SELECT generate_sample_data_for_user('user-uuid-here');

This will create:
- A sample team with the user as owner
- A sample project with realistic content
- Sample content items with various statuses
- Sample competitors for analysis
- Sample keyword opportunities
- Sample content recommendations

To clean up:
   SELECT cleanup_sample_data();

Note: The sample data generation includes proper team membership,
RLS policies will ensure data isolation, and all relationships
are properly maintained.
*/