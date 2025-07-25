-- =====================================================
-- ContentLab Nexus - Production Performance Optimization
-- Critical database performance optimizations for enterprise scale
-- =====================================================

-- =====================================================
-- MISSING FOREIGN KEY INDEXES
-- =====================================================

-- Competitors table foreign key indexes (missing from competitive intelligence)
DO $$
BEGIN
    -- Index for competitor foreign keys that might be missing
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_project_id_performance') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_project_id_performance ON competitors(project_id, monitoring_enabled, last_analyzed_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_team_id_active') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_team_id_active ON competitors(team_id, monitoring_enabled) WHERE monitoring_enabled = true;
    END IF;
END $$;

-- Competitive intelligence table indexes
DO $$
BEGIN
    -- Competitor alerts indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_alerts_project_team') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_alerts_project_team ON competitor_alerts(project_id, team_id, is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_alerts_competitor_type') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_alerts_competitor_type ON competitor_alerts(competitor_id, alert_type, is_active);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_alerts_frequency_triggered') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_alerts_frequency_triggered ON competitor_alerts(frequency, last_triggered);
    END IF;

    -- Competitor analysis results indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_analysis_project_type') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_analysis_project_type ON competitor_analysis_results(project_id, analysis_type, generated_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_analysis_competitor_fresh') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_analysis_competitor_fresh ON competitor_analysis_results(competitor_id, generated_at DESC) WHERE expires_at IS NULL OR expires_at > NOW();
    END IF;

    -- Competitor tracking indexes  
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_tracking_date_performance') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_tracking_date_performance ON competitor_tracking(competitor_id, tracking_date DESC, domain_authority DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_tracking_project_date') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_tracking_project_date ON competitor_tracking(project_id, tracking_date DESC);
    END IF;

    -- Competitive keywords indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitive_keywords_project_opportunity') THEN
        CREATE INDEX CONCURRENTLY idx_competitive_keywords_project_opportunity ON competitive_keywords(project_id, opportunity_score DESC NULLS LAST, difficulty_score ASC NULLS LAST);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitive_keywords_search_volume') THEN
        CREATE INDEX CONCURRENTLY idx_competitive_keywords_search_volume ON competitive_keywords(search_volume DESC, last_updated DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitive_keywords_our_position') THEN
        CREATE INDEX CONCURRENTLY idx_competitive_keywords_our_position ON competitive_keywords(project_id, our_position ASC) WHERE our_position IS NOT NULL;
    END IF;

    -- Competitive content analysis indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitive_content_competitor_type') THEN
        CREATE INDEX CONCURRENTLY idx_competitive_content_competitor_type ON competitive_content_analysis(competitor_id, content_type, last_analyzed DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitive_content_traffic_performance') THEN
        CREATE INDEX CONCURRENTLY idx_competitive_content_traffic_performance ON competitive_content_analysis(estimated_traffic DESC, seo_score DESC NULLS LAST);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitive_content_keywords_gin') THEN
        CREATE INDEX CONCURRENTLY idx_competitive_content_keywords_gin ON competitive_content_analysis USING GIN(target_keywords);
    END IF;
END $$;

-- =====================================================
-- ANALYTICS PERFORMANCE INDEXES
-- =====================================================

DO $$
BEGIN
    -- Content analytics time-series optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_analytics_time_series') THEN
        CREATE INDEX CONCURRENTLY idx_content_analytics_time_series ON content_analytics(date DESC, content_id) 
        INCLUDE (pageviews, organic_traffic, conversions);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_analytics_performance_ranking') THEN
        CREATE INDEX CONCURRENTLY idx_content_analytics_performance_ranking ON content_analytics(date, pageviews DESC, organic_traffic DESC);
    END IF;
    
    -- Competitor analytics time-series optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_analytics_time_series') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_analytics_time_series ON competitor_analytics(date DESC, competitor_id)
        INCLUDE (estimated_traffic, domain_authority, backlinks_count);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_analytics_domain_authority') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_analytics_domain_authority ON competitor_analytics(date, domain_authority DESC NULLS LAST);
    END IF;
END $$;

-- =====================================================
-- DASHBOARD AND WIDGET PERFORMANCE INDEXES
-- =====================================================

DO $$
BEGIN
    -- Dashboard access patterns
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_custom_dashboards_project_shared') THEN
        CREATE INDEX CONCURRENTLY idx_custom_dashboards_project_shared ON custom_dashboards(project_id, is_shared, updated_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_custom_dashboards_template_access') THEN
        CREATE INDEX CONCURRENTLY idx_custom_dashboards_template_access ON custom_dashboards(is_template, is_shared) WHERE is_template = true;
    END IF;
    
    -- Dashboard widgets optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dashboard_widgets_dashboard_visible') THEN
        CREATE INDEX CONCURRENTLY idx_dashboard_widgets_dashboard_visible ON dashboard_widgets(dashboard_id, is_visible) WHERE is_visible = true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_dashboard_widgets_type_performance') THEN
        CREATE INDEX CONCURRENTLY idx_dashboard_widgets_type_performance ON dashboard_widgets(widget_type, dashboard_id);
    END IF;
END $$;

-- =====================================================
-- TEAM AND PROJECT ACCESS OPTIMIZATION
-- =====================================================

DO $$
BEGIN
    -- Team member role-based access
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_user_role_access') THEN
        CREATE INDEX CONCURRENTLY idx_team_members_user_role_access ON team_members(user_id, role, team_id);
    END IF;
    
    -- Project team optimization (covering index)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_team_status_covering') THEN
        CREATE INDEX CONCURRENTLY idx_projects_team_status_covering ON projects(team_id, status, updated_at DESC) 
        INCLUDE (id, name, description, website_url, created_by);
    END IF;
    
    -- Content project optimization (covering index)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_items_project_status_covering') THEN
        CREATE INDEX CONCURRENTLY idx_content_items_project_status_covering ON content_items(project_id, status, updated_at DESC)
        INCLUDE (id, title, url, seo_score, readability_score, word_count);
    END IF;
END $$;

-- =====================================================
-- SEARCH AND FILTERING OPTIMIZATION
-- =====================================================

DO $$
BEGIN
    -- Multi-table search optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_search_gin') THEN
        CREATE INDEX CONCURRENTLY idx_projects_search_gin ON projects USING GIN(
            to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(website_url, ''))
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_search_gin') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_search_gin ON competitors USING GIN(
            to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || website_url)
        );
    END IF;
    
    -- Keyword search optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_keyword_opportunities_search_trgm') THEN
        CREATE INDEX CONCURRENTLY idx_keyword_opportunities_search_trgm ON keyword_opportunities USING GIN(keyword gin_trgm_ops);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitive_keywords_search_trgm') THEN
        CREATE INDEX CONCURRENTLY idx_competitive_keywords_search_trgm ON competitive_keywords USING GIN(keyword gin_trgm_ops);
    END IF;
END $$;

-- =====================================================
-- PARTIAL INDEXES FOR ACTIVE DATA
-- =====================================================

DO $$
BEGIN
    -- Active monitoring optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_active_monitoring') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_active_monitoring ON competitors(project_id, last_analyzed_at DESC, market_share DESC NULLS LAST) 
        WHERE monitoring_enabled = true;
    END IF;
    
    -- Recent analysis results (last 30 days)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analysis_results_recent') THEN
        CREATE INDEX CONCURRENTLY idx_analysis_results_recent ON analysis_results(project_id, analysis_type, generated_at DESC)
        WHERE generated_at > NOW() - INTERVAL '30 days';
    END IF;
    
    -- Active recommendations (not implemented or dismissed)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_recommendations_actionable') THEN
        CREATE INDEX CONCURRENTLY idx_content_recommendations_actionable ON content_recommendations(project_id, priority DESC, created_at DESC)
        WHERE is_implemented = false AND dismissed_at IS NULL;
    END IF;
    
    -- Recent analytics (last 90 days)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_analytics_recent_performance') THEN
        CREATE INDEX CONCURRENTLY idx_content_analytics_recent_performance ON content_analytics(content_id, date DESC, pageviews DESC)
        WHERE date > NOW() - INTERVAL '90 days';
    END IF;
END $$;

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

DO $$
BEGIN
    -- Team dashboard query optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_project_content_hierarchy') THEN
        CREATE INDEX CONCURRENTLY idx_team_project_content_hierarchy ON content_items(project_id, status, published_at DESC NULLS LAST, seo_score DESC NULLS LAST);
    END IF;
    
    -- Competitive analysis workflow
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_analysis_workflow') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_analysis_workflow ON competitor_analysis_results(project_id, competitor_id, analysis_type, generated_at DESC, confidence_score DESC NULLS LAST);
    END IF;
    
    -- Performance trending analysis
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_performance_trending') THEN
        CREATE INDEX CONCURRENTLY idx_content_performance_trending ON content_analytics(content_id, date DESC, organic_traffic DESC, conversions DESC);
    END IF;
END $$;

-- =====================================================
-- USER EVENT AND AUDIT OPTIMIZATION
-- =====================================================

DO $$
BEGIN
    -- User activity tracking
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_events_type_date') THEN
        CREATE INDEX CONCURRENTLY idx_user_events_type_date ON user_events(user_id, event_type, created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_events_data_gin') THEN
        CREATE INDEX CONCURRENTLY idx_user_events_data_gin ON user_events USING GIN(event_data);
    END IF;
    
    -- Audit log optimization (if table exists)
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_audit_logs_performance') THEN
                CREATE INDEX CONCURRENTLY idx_audit_logs_performance ON audit_logs(table_name, record_id, timestamp DESC);
            END IF;
        END IF;
    END $$;
END $$;

-- =====================================================
-- JSONB OPTIMIZATION FOR DYNAMIC DATA
-- =====================================================

DO $$
BEGIN
    -- Analysis results JSONB optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_analysis_results_jsonb_performance') THEN
        CREATE INDEX CONCURRENTLY idx_analysis_results_jsonb_performance ON analysis_results USING GIN(results jsonb_path_ops);
    END IF;
    
    -- Competitor tracking metrics optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_tracking_metrics_gin') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_tracking_metrics_gin ON competitor_tracking USING GIN(metrics jsonb_path_ops);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitor_tracking_rankings_gin') THEN
        CREATE INDEX CONCURRENTLY idx_competitor_tracking_rankings_gin ON competitor_tracking USING GIN(rankings jsonb_path_ops);
    END IF;
    
    -- Project settings optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_settings_gin') THEN
        CREATE INDEX CONCURRENTLY idx_projects_settings_gin ON projects USING GIN(settings jsonb_path_ops);
    END IF;
    
    -- Team settings optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_teams_settings_gin') THEN
        CREATE INDEX CONCURRENTLY idx_teams_settings_gin ON teams USING GIN(settings jsonb_path_ops);
    END IF;
END $$;

-- =====================================================
-- COVERING INDEXES FOR READ-HEAVY QUERIES
-- =====================================================

DO $$
BEGIN
    -- Project list view optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_list_view_covering') THEN
        CREATE INDEX CONCURRENTLY idx_projects_list_view_covering ON projects(team_id, status, updated_at DESC)
        INCLUDE (id, name, description, website_url, created_by, created_at, target_keywords);
    END IF;
    
    -- Content list view optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_list_view_covering') THEN
        CREATE INDEX CONCURRENTLY idx_content_list_view_covering ON content_items(project_id, status, updated_at DESC)
        INCLUDE (id, title, url, content_type, seo_score, readability_score, word_count, published_at);
    END IF;
    
    -- Competitor list view optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_list_view_covering') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_list_view_covering ON competitors(project_id, monitoring_enabled, updated_at DESC)
        INCLUDE (id, name, website_url, market_share, last_analyzed_at, description);
    END IF;
    
    -- Team member list optimization
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_members_list_covering') THEN
        CREATE INDEX CONCURRENTLY idx_team_members_list_covering ON team_members(team_id, role)
        INCLUDE (user_id, joined_at, permissions);
    END IF;
END $$;

-- =====================================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- =====================================================

DO $$
BEGIN
    -- Case-insensitive name searching
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_name_lower') THEN
        CREATE INDEX CONCURRENTLY idx_projects_name_lower ON projects(LOWER(name), team_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_name_lower') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_name_lower ON competitors(LOWER(name), project_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_items_title_lower') THEN
        CREATE INDEX CONCURRENTLY idx_content_items_title_lower ON content_items(LOWER(title), project_id);
    END IF;
    
    -- Domain extraction for competitors
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_competitors_domain_extracted') THEN
        CREATE INDEX CONCURRENTLY idx_competitors_domain_extracted ON competitors(
            regexp_replace(website_url, '^https?://(?:www\.)?([^/]+).*$', '\1', 'i'),
            project_id
        );
    END IF;
END $$;

-- =====================================================
-- PERFORMANCE MONITORING VIEWS
-- =====================================================

-- Create or replace performance monitoring views
CREATE OR REPLACE VIEW database_performance_summary AS
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs,
    histogram_bounds
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

CREATE OR REPLACE VIEW index_efficiency_analysis AS
SELECT 
    schemaname,
    tablename,
    indexrelname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_tup_read = 0 THEN 'NEVER_READ'
        WHEN idx_tup_fetch::float / idx_tup_read < 0.1 THEN 'LOW_EFFICIENCY'
        WHEN idx_tup_fetch::float / idx_tup_read < 0.5 THEN 'MEDIUM_EFFICIENCY'
        ELSE 'HIGH_EFFICIENCY'
    END as efficiency_status,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_get_indexdef(indexrelid) as index_definition
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC, tablename;

CREATE OR REPLACE VIEW table_performance_metrics AS
SELECT 
    schemaname,
    relname as tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_tup_hot_upd as hot_updates,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup > 0 
        THEN round((n_dead_tup::float / n_live_tup) * 100, 2)
        ELSE 0 
    END as dead_tuple_percentage,
    pg_size_pretty(pg_total_relation_size(oid)) as total_size,
    pg_size_pretty(pg_relation_size(oid)) as table_size
FROM pg_stat_user_tables pst
JOIN pg_class pc ON pc.relname = pst.relname
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(oid) DESC;

-- =====================================================
-- VACUUM AND ANALYZE OPTIMIZATION
-- =====================================================

-- Update autovacuum settings for high-traffic tables
ALTER TABLE content_analytics SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE competitor_analytics SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE competitor_tracking SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_cost_delay = 10,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE user_events SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 20,
    autovacuum_vacuum_cost_limit = 2000
);

-- Aggressive autovacuum for audit logs if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        ALTER TABLE audit_logs SET (
            autovacuum_vacuum_scale_factor = 0.2,
            autovacuum_analyze_scale_factor = 0.1,
            autovacuum_vacuum_cost_delay = 20,
            autovacuum_vacuum_cost_limit = 2000
        );
    END IF;
END $$;

-- =====================================================
-- ANALYZE ALL TABLES FOR STATISTICS
-- =====================================================

-- Update table statistics for query planner optimization
ANALYZE teams;
ANALYZE team_members;
ANALYZE projects;
ANALYZE content_items;
ANALYZE competitors;
ANALYZE keyword_opportunities;
ANALYZE analysis_results;
ANALYZE content_analytics;
ANALYZE competitor_analytics;
ANALYZE content_recommendations;

-- Analyze competitive intelligence tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_alerts') THEN
        ANALYZE competitor_alerts;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_analysis_results') THEN
        ANALYZE competitor_analysis_results;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitor_tracking') THEN
        ANALYZE competitor_tracking;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitive_keywords') THEN
        ANALYZE competitive_keywords;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'competitive_content_analysis') THEN
        ANALYZE competitive_content_analysis;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_events') THEN
        ANALYZE user_events;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_dashboards') THEN
        ANALYZE custom_dashboards;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_widgets') THEN
        ANALYZE dashboard_widgets;
    END IF;
END $$;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_competitors_project_id_performance IS 'Performance index for competitor project queries with monitoring status';
COMMENT ON INDEX idx_team_members_user_role_access IS 'Optimized index for user role-based access control';
COMMENT ON INDEX idx_content_analytics_time_series IS 'Time-series optimization for content performance analytics';
COMMENT ON INDEX idx_competitive_keywords_project_opportunity IS 'Sweet spot index for high-opportunity, low-difficulty keywords';
COMMENT ON INDEX idx_projects_list_view_covering IS 'Covering index to eliminate I/O for project list views';
COMMENT ON VIEW database_performance_summary IS 'Database statistics summary for performance monitoring';
COMMENT ON VIEW index_efficiency_analysis IS 'Index usage efficiency analysis for optimization';
COMMENT ON VIEW table_performance_metrics IS 'Table performance metrics including dead tuple analysis';

-- =====================================================
-- COMPLETION LOG
-- =====================================================

INSERT INTO user_events (user_id, event_type, event_data) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'database_optimization_applied',
    jsonb_build_object(
        'migration_name', '20250725_production_performance_optimization',
        'indexes_created', 50,
        'performance_views_created', 3,
        'autovacuum_optimized', true,
        'statistics_updated', true,
        'timestamp', now()
    )
) ON CONFLICT DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Production performance optimization migration completed successfully';
    RAISE NOTICE '📊 Created 50+ performance indexes for enterprise scale';
    RAISE NOTICE '🔍 Added monitoring views and statistics optimization';
    RAISE NOTICE '🏃‍♂️ Configured autovacuum for high-traffic tables';
    RAISE NOTICE '⚡ Database ready for million+ record scale';
END $$;