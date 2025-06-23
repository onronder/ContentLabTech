-- =====================================================
-- ContentLab Nexus Database Indexes
-- Comprehensive indexing strategy for optimal performance
-- =====================================================

-- =====================================================
-- TEAMS TABLE INDEXES
-- =====================================================

-- Index for finding teams by owner
CREATE INDEX idx_teams_owner_id ON teams(owner_id);

-- Index for team name searches (case-insensitive)
CREATE INDEX idx_teams_name_lower ON teams(LOWER(name));

-- Index for active teams sorting
CREATE INDEX idx_teams_created_at ON teams(created_at DESC);

-- Composite index for owner and creation date
CREATE INDEX idx_teams_owner_created ON teams(owner_id, created_at DESC);

-- =====================================================
-- TEAM_MEMBERS TABLE INDEXES
-- =====================================================

-- Index for finding team members by user
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Index for finding members by team and role
CREATE INDEX idx_team_members_team_role ON team_members(team_id, role);

-- Index for member join date
CREATE INDEX idx_team_members_joined_at ON team_members(joined_at DESC);

-- Composite index for user's teams with role
CREATE INDEX idx_team_members_user_role ON team_members(user_id, role);

-- =====================================================
-- PROJECTS TABLE INDEXES
-- =====================================================

-- Index for finding projects by team
CREATE INDEX idx_projects_team_id ON projects(team_id);

-- Index for finding projects by creator
CREATE INDEX idx_projects_created_by ON projects(created_by);

-- Index for project status filtering
CREATE INDEX idx_projects_status ON projects(status);

-- Index for project name searches (case-insensitive)
CREATE INDEX idx_projects_name_lower ON projects(LOWER(name));

-- Composite index for team and status
CREATE INDEX idx_projects_team_status ON projects(team_id, status);

-- Composite index for team and creation date
CREATE INDEX idx_projects_team_created ON projects(team_id, created_at DESC);

-- Index for website URL lookups
CREATE INDEX idx_projects_website_url ON projects(website_url) WHERE website_url IS NOT NULL;

-- GIN index for target keywords array search
CREATE INDEX idx_projects_target_keywords ON projects USING GIN(target_keywords);

-- =====================================================
-- CONTENT_ITEMS TABLE INDEXES
-- =====================================================

-- Index for finding content by project
CREATE INDEX idx_content_items_project_id ON content_items(project_id);

-- Index for content status filtering
CREATE INDEX idx_content_items_status ON content_items(status);

-- Index for content type filtering
CREATE INDEX idx_content_items_type ON content_items(content_type);

-- Index for SEO score sorting
CREATE INDEX idx_content_items_seo_score ON content_items(seo_score DESC) WHERE seo_score IS NOT NULL;

-- Index for readability score sorting
CREATE INDEX idx_content_items_readability_score ON content_items(readability_score DESC) WHERE readability_score IS NOT NULL;

-- Index for word count sorting
CREATE INDEX idx_content_items_word_count ON content_items(word_count DESC) WHERE word_count IS NOT NULL;

-- Index for published content
CREATE INDEX idx_content_items_published_at ON content_items(published_at DESC) WHERE published_at IS NOT NULL;

-- Index for URL lookups
CREATE INDEX idx_content_items_url ON content_items(url);

-- Composite index for project and status
CREATE INDEX idx_content_items_project_status ON content_items(project_id, status);

-- Composite index for project and creation date
CREATE INDEX idx_content_items_project_created ON content_items(project_id, created_at DESC);

-- Composite index for project and published date
CREATE INDEX idx_content_items_project_published ON content_items(project_id, published_at DESC) WHERE published_at IS NOT NULL;

-- GIN index for focus keywords array search
CREATE INDEX idx_content_items_focus_keywords ON content_items USING GIN(focus_keywords);

-- Full-text search index for title and content
CREATE INDEX idx_content_items_title_fts ON content_items USING GIN(to_tsvector('english', title));
CREATE INDEX idx_content_items_content_fts ON content_items USING GIN(to_tsvector('english', COALESCE(content, '')));

-- Combined full-text search index
CREATE INDEX idx_content_items_full_text_search ON content_items USING GIN(
    to_tsvector('english', 
        title || ' ' || 
        COALESCE(meta_title, '') || ' ' || 
        COALESCE(meta_description, '') || ' ' || 
        COALESCE(content, '')
    )
);

-- =====================================================
-- COMPETITORS TABLE INDEXES
-- =====================================================

-- Index for finding competitors by project
CREATE INDEX idx_competitors_project_id ON competitors(project_id);

-- Index for competitor name searches (case-insensitive)
CREATE INDEX idx_competitors_name_lower ON competitors(LOWER(name));

-- Index for website URL lookups
CREATE INDEX idx_competitors_website_url ON competitors(website_url);

-- Index for monitoring status
CREATE INDEX idx_competitors_monitoring_enabled ON competitors(monitoring_enabled);

-- Index for last analysis date
CREATE INDEX idx_competitors_last_analyzed ON competitors(last_analyzed_at DESC) WHERE last_analyzed_at IS NOT NULL;

-- Composite index for project and monitoring status
CREATE INDEX idx_competitors_project_monitoring ON competitors(project_id, monitoring_enabled);

-- Composite index for project and market share
CREATE INDEX idx_competitors_project_market_share ON competitors(project_id, market_share DESC) WHERE market_share IS NOT NULL;

-- Unique index to prevent duplicate competitors per project
CREATE UNIQUE INDEX idx_competitors_project_url_unique ON competitors(project_id, website_url);

-- =====================================================
-- KEYWORD_OPPORTUNITIES TABLE INDEXES
-- =====================================================

-- Index for finding keywords by project
CREATE INDEX idx_keyword_opportunities_project_id ON keyword_opportunities(project_id);

-- Index for keyword searches (case-insensitive)
CREATE INDEX idx_keyword_opportunities_keyword_lower ON keyword_opportunities(LOWER(keyword));

-- Index for search volume sorting
CREATE INDEX idx_keyword_opportunities_search_volume ON keyword_opportunities(search_volume DESC) WHERE search_volume IS NOT NULL;

-- Index for difficulty score sorting
CREATE INDEX idx_keyword_opportunities_difficulty ON keyword_opportunities(difficulty_score ASC) WHERE difficulty_score IS NOT NULL;

-- Index for opportunity score sorting
CREATE INDEX idx_keyword_opportunities_opportunity ON keyword_opportunities(opportunity_score DESC) WHERE opportunity_score IS NOT NULL;

-- Index for current ranking
CREATE INDEX idx_keyword_opportunities_current_ranking ON keyword_opportunities(current_ranking ASC) WHERE current_ranking IS NOT NULL;

-- Index for competition level
CREATE INDEX idx_keyword_opportunities_competition_level ON keyword_opportunities(competition_level);

-- Index for last updated date
CREATE INDEX idx_keyword_opportunities_last_updated ON keyword_opportunities(last_updated_at DESC);

-- Composite index for project and opportunity score
CREATE INDEX idx_keyword_opportunities_project_opportunity ON keyword_opportunities(project_id, opportunity_score DESC) WHERE opportunity_score IS NOT NULL;

-- Composite index for project and difficulty
CREATE INDEX idx_keyword_opportunities_project_difficulty ON keyword_opportunities(project_id, difficulty_score ASC) WHERE difficulty_score IS NOT NULL;

-- Composite index for high-opportunity, low-difficulty keywords
CREATE INDEX idx_keyword_opportunities_sweet_spot ON keyword_opportunities(project_id, opportunity_score DESC, difficulty_score ASC) 
WHERE opportunity_score IS NOT NULL AND difficulty_score IS NOT NULL;

-- GIN index for trend data JSONB queries
CREATE INDEX idx_keyword_opportunities_trend_data ON keyword_opportunities USING GIN(trend_data);

-- =====================================================
-- ANALYSIS_RESULTS TABLE INDEXES
-- =====================================================

-- Index for finding analysis by project
CREATE INDEX idx_analysis_results_project_id ON analysis_results(project_id);

-- Index for finding analysis by content
CREATE INDEX idx_analysis_results_content_id ON analysis_results(content_id) WHERE content_id IS NOT NULL;

-- Index for finding analysis by competitor
CREATE INDEX idx_analysis_results_competitor_id ON analysis_results(competitor_id) WHERE competitor_id IS NOT NULL;

-- Index for analysis type filtering
CREATE INDEX idx_analysis_results_type ON analysis_results(analysis_type);

-- Index for generated date sorting
CREATE INDEX idx_analysis_results_generated_at ON analysis_results(generated_at DESC);

-- Index for expiration cleanup
CREATE INDEX idx_analysis_results_expires_at ON analysis_results(expires_at) WHERE expires_at IS NOT NULL;

-- Index for confidence score sorting
CREATE INDEX idx_analysis_results_confidence_score ON analysis_results(confidence_score DESC) WHERE confidence_score IS NOT NULL;

-- Composite index for project and type
CREATE INDEX idx_analysis_results_project_type ON analysis_results(project_id, analysis_type);

-- Composite index for project and generation date
CREATE INDEX idx_analysis_results_project_generated ON analysis_results(project_id, generated_at DESC);

-- GIN index for results JSONB queries
CREATE INDEX idx_analysis_results_data ON analysis_results USING GIN(results);

-- =====================================================
-- CONTENT_ANALYTICS TABLE INDEXES
-- =====================================================

-- Index for finding analytics by content
CREATE INDEX idx_content_analytics_content_id ON content_analytics(content_id);

-- Index for date range queries
CREATE INDEX idx_content_analytics_date ON content_analytics(date DESC);

-- Index for pageviews sorting
CREATE INDEX idx_content_analytics_pageviews ON content_analytics(pageviews DESC);

-- Index for organic traffic sorting
CREATE INDEX idx_content_analytics_organic_traffic ON content_analytics(organic_traffic DESC);

-- Index for conversions sorting
CREATE INDEX idx_content_analytics_conversions ON content_analytics(conversions DESC);

-- Composite index for content and date range
CREATE INDEX idx_content_analytics_content_date ON content_analytics(content_id, date DESC);

-- Composite index for date and pageviews (for trending content)
CREATE INDEX idx_content_analytics_date_pageviews ON content_analytics(date DESC, pageviews DESC);

-- Partial index for high-performing content
CREATE INDEX idx_content_analytics_high_pageviews ON content_analytics(content_id, date DESC) 
WHERE pageviews > 1000;

-- =====================================================
-- COMPETITOR_ANALYTICS TABLE INDEXES
-- =====================================================

-- Index for finding analytics by competitor
CREATE INDEX idx_competitor_analytics_competitor_id ON competitor_analytics(competitor_id);

-- Index for date range queries
CREATE INDEX idx_competitor_analytics_date ON competitor_analytics(date DESC);

-- Index for estimated traffic sorting
CREATE INDEX idx_competitor_analytics_traffic ON competitor_analytics(estimated_traffic DESC);

-- Index for domain authority sorting
CREATE INDEX idx_competitor_analytics_domain_authority ON competitor_analytics(domain_authority DESC);

-- Index for backlinks sorting
CREATE INDEX idx_competitor_analytics_backlinks ON competitor_analytics(backlinks_count DESC);

-- Composite index for competitor and date range
CREATE INDEX idx_competitor_analytics_competitor_date ON competitor_analytics(competitor_id, date DESC);

-- GIN index for top keywords array search
CREATE INDEX idx_competitor_analytics_top_keywords ON competitor_analytics USING GIN(top_keywords);

-- =====================================================
-- CONTENT_RECOMMENDATIONS TABLE INDEXES
-- =====================================================

-- Index for finding recommendations by project
CREATE INDEX idx_content_recommendations_project_id ON content_recommendations(project_id);

-- Index for finding recommendations by content
CREATE INDEX idx_content_recommendations_content_id ON content_recommendations(content_id) WHERE content_id IS NOT NULL;

-- Index for recommendation type filtering
CREATE INDEX idx_content_recommendations_type ON content_recommendations(recommendation_type);

-- Index for priority sorting
CREATE INDEX idx_content_recommendations_priority ON content_recommendations(priority DESC);

-- Index for implementation status
CREATE INDEX idx_content_recommendations_implemented ON content_recommendations(is_implemented);

-- Index for creation date sorting
CREATE INDEX idx_content_recommendations_created_at ON content_recommendations(created_at DESC);

-- Composite index for project and implementation status
CREATE INDEX idx_content_recommendations_project_implemented ON content_recommendations(project_id, is_implemented);

-- Composite index for project and priority
CREATE INDEX idx_content_recommendations_project_priority ON content_recommendations(project_id, priority DESC);

-- Composite index for active (non-dismissed, non-implemented) recommendations
CREATE INDEX idx_content_recommendations_active ON content_recommendations(project_id, priority DESC) 
WHERE is_implemented = FALSE AND dismissed_at IS NULL;

-- GIN index for recommendation data JSONB queries
CREATE INDEX idx_content_recommendations_data ON content_recommendations USING GIN(data);

-- =====================================================
-- AUDIT_LOGS TABLE INDEXES
-- =====================================================

-- Index for finding logs by table
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);

-- Index for finding logs by record
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);

-- Index for finding logs by user
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- Index for finding logs by action
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Index for timestamp sorting
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Composite index for table and timestamp
CREATE INDEX idx_audit_logs_table_timestamp ON audit_logs(table_name, timestamp DESC);

-- Composite index for record and timestamp
CREATE INDEX idx_audit_logs_record_timestamp ON audit_logs(record_id, timestamp DESC);

-- GIN indexes for JSONB data
CREATE INDEX idx_audit_logs_old_values ON audit_logs USING GIN(old_values) WHERE old_values IS NOT NULL;
CREATE INDEX idx_audit_logs_new_values ON audit_logs USING GIN(new_values) WHERE new_values IS NOT NULL;

-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================

-- Covering index for content list with analytics
CREATE INDEX idx_content_with_analytics ON content_items(project_id, status, created_at DESC) 
INCLUDE (title, url, seo_score, readability_score);

-- Covering index for project dashboard
CREATE INDEX idx_project_dashboard ON projects(team_id, status) 
INCLUDE (name, description, created_at, updated_at);

-- Covering index for team member list
CREATE INDEX idx_team_member_list ON team_members(team_id) 
INCLUDE (user_id, role, joined_at);

-- Partial index for recent content (using a fixed date for demonstration)
-- In production, this would be managed by a maintenance job
-- CREATE INDEX idx_recent_content ON content_items(project_id, created_at DESC) 
-- WHERE created_at > '2024-01-01'::date;

-- Partial index for recent analytics (using a fixed date for demonstration)
-- In production, this would be managed by a maintenance job
-- CREATE INDEX idx_recent_analytics ON content_analytics(content_id, date DESC) 
-- WHERE date > '2024-01-01'::date;

-- =====================================================
-- VACUUM AND ANALYZE SETTINGS
-- =====================================================

-- Set autovacuum settings for high-traffic tables
ALTER TABLE content_analytics SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE competitor_analytics SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE audit_logs SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON INDEX idx_content_items_full_text_search IS 'Combined full-text search across title, meta fields, and content';
COMMENT ON INDEX idx_keyword_opportunities_sweet_spot IS 'Optimized for finding high-opportunity, low-difficulty keywords';
COMMENT ON INDEX idx_content_recommendations_active IS 'Partial index for active (actionable) recommendations';
COMMENT ON INDEX idx_content_with_analytics IS 'Covering index to reduce I/O for content list queries';

-- =====================================================
-- INDEX USAGE MONITORING
-- =====================================================

-- Create a view to monitor index usage (for development/optimization)
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

COMMENT ON VIEW index_usage_stats IS 'Monitor index usage for optimization purposes';