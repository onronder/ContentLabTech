-- =============================================
-- ContentLab Nexus - Competitive Intelligence Database Schema
-- =============================================

-- Create competitive intelligence tables with proper relationships
-- and Row Level Security (RLS) policies

-- =============================================
-- 1. COMPETITOR ALERTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS competitor_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'ranking_change', 'traffic_change', 'new_content', 
        'keyword_opportunity', 'technical_issue'
    )),
    keyword TEXT,
    threshold DECIMAL(10,2),
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    alert_config JSONB DEFAULT '{}',
    last_triggered TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_project_id ON competitor_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_team_id ON competitor_alerts(team_id);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_competitor_id ON competitor_alerts(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_alert_type ON competitor_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_is_active ON competitor_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_last_triggered ON competitor_alerts(last_triggered);

-- Enable RLS
ALTER TABLE competitor_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_alerts
CREATE POLICY "Users can view alerts for their team projects" ON competitor_alerts
    FOR SELECT 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create alerts for their team projects" ON competitor_alerts
    FOR INSERT 
    WITH CHECK (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
        AND project_id IN (
            SELECT p.id 
            FROM projects p 
            WHERE p.team_id = team_id
        )
    );

CREATE POLICY "Users can update alerts for their team projects" ON competitor_alerts
    FOR UPDATE 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete alerts for their team projects" ON competitor_alerts
    FOR DELETE 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

-- =============================================
-- 2. COMPETITOR ANALYSIS RESULTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS competitor_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN (
        'content_gap', 'keyword_overlap', 'backlink_analysis', 
        'technical_seo', 'performance_metrics', 'content_strategy'
    )),
    analysis_data JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_project_id ON competitor_analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_team_id ON competitor_analysis_results(team_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_competitor_id ON competitor_analysis_results(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_type ON competitor_analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_generated_at ON competitor_analysis_results(generated_at);
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_expires_at ON competitor_analysis_results(expires_at);

-- Enable RLS
ALTER TABLE competitor_analysis_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_analysis_results
CREATE POLICY "Users can view analysis results for their team projects" ON competitor_analysis_results
    FOR SELECT 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create analysis results for their team projects" ON competitor_analysis_results
    FOR INSERT 
    WITH CHECK (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
        AND project_id IN (
            SELECT p.id 
            FROM projects p 
            WHERE p.team_id = team_id
        )
    );

-- =============================================
-- 3. COMPETITOR TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS competitor_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metrics JSONB NOT NULL DEFAULT '{}',
    rankings JSONB DEFAULT '{}',
    traffic_data JSONB DEFAULT '{}',
    content_count INTEGER DEFAULT 0,
    backlink_count INTEGER DEFAULT 0,
    domain_authority DECIMAL(5,2),
    page_authority DECIMAL(5,2),
    organic_keywords INTEGER DEFAULT 0,
    paid_keywords INTEGER DEFAULT 0,
    social_signals JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per competitor per day
    UNIQUE(competitor_id, tracking_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_project_id ON competitor_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_team_id ON competitor_tracking(team_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_competitor_id ON competitor_tracking(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_date ON competitor_tracking(tracking_date);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_created_at ON competitor_tracking(created_at);

-- Enable RLS
ALTER TABLE competitor_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_tracking
CREATE POLICY "Users can view tracking data for their team projects" ON competitor_tracking
    FOR SELECT 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create tracking data for their team projects" ON competitor_tracking
    FOR INSERT 
    WITH CHECK (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
        AND project_id IN (
            SELECT p.id 
            FROM projects p 
            WHERE p.team_id = team_id
        )
    );

-- =============================================
-- 4. COMPETITIVE KEYWORDS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS competitive_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    search_volume INTEGER DEFAULT 0,
    difficulty_score DECIMAL(5,2) CHECK (difficulty_score >= 0 AND difficulty_score <= 100),
    cpc DECIMAL(10,2),
    competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high', 'very_high')),
    trend_data JSONB DEFAULT '{}',
    our_position INTEGER,
    our_url TEXT,
    competitors_data JSONB DEFAULT '{}', -- Array of competitor positions
    opportunity_score DECIMAL(5,2) CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per keyword per project
    UNIQUE(project_id, keyword)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_project_id ON competitive_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_team_id ON competitive_keywords(team_id);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_keyword ON competitive_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_search_volume ON competitive_keywords(search_volume);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_difficulty ON competitive_keywords(difficulty_score);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_opportunity ON competitive_keywords(opportunity_score);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_last_updated ON competitive_keywords(last_updated);

-- Enable RLS
ALTER TABLE competitive_keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitive_keywords
CREATE POLICY "Users can view keywords for their team projects" ON competitive_keywords
    FOR SELECT 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage keywords for their team projects" ON competitive_keywords
    FOR ALL 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

-- =============================================
-- 5. COMPETITIVE CONTENT ANALYSIS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS competitive_content_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    content_url TEXT NOT NULL,
    content_title TEXT,
    content_type TEXT CHECK (content_type IN (
        'blog_post', 'landing_page', 'product_page', 'category_page', 
        'guide', 'case_study', 'whitepaper', 'infographic', 'video', 'other'
    )),
    word_count INTEGER DEFAULT 0,
    readability_score DECIMAL(5,2),
    seo_score DECIMAL(5,2),
    target_keywords TEXT[] DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT,
    headings JSONB DEFAULT '{}',
    internal_links INTEGER DEFAULT 0,
    external_links INTEGER DEFAULT 0,
    images_count INTEGER DEFAULT 0,
    social_shares JSONB DEFAULT '{}',
    estimated_traffic INTEGER DEFAULT 0,
    content_freshness DATE,
    analysis_data JSONB DEFAULT '{}',
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_analyzed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per content URL per competitor
    UNIQUE(competitor_id, content_url)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competitive_content_project_id ON competitive_content_analysis(project_id);
CREATE INDEX IF NOT EXISTS idx_competitive_content_team_id ON competitive_content_analysis(team_id);
CREATE INDEX IF NOT EXISTS idx_competitive_content_competitor_id ON competitive_content_analysis(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitive_content_type ON competitive_content_analysis(content_type);
CREATE INDEX IF NOT EXISTS idx_competitive_content_seo_score ON competitive_content_analysis(seo_score);
CREATE INDEX IF NOT EXISTS idx_competitive_content_traffic ON competitive_content_analysis(estimated_traffic);
CREATE INDEX IF NOT EXISTS idx_competitive_content_discovered ON competitive_content_analysis(discovered_at);
CREATE INDEX IF NOT EXISTS idx_competitive_content_keywords ON competitive_content_analysis USING GIN(target_keywords);

-- Enable RLS
ALTER TABLE competitive_content_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitive_content_analysis
CREATE POLICY "Users can view content analysis for their team projects" ON competitive_content_analysis
    FOR SELECT 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage content analysis for their team projects" ON competitive_content_analysis
    FOR ALL 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

-- =============================================
-- 6. USER EVENTS TABLE (for audit logging)
-- =============================================

CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at);

-- Enable RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_events
CREATE POLICY "Users can view their own events" ON user_events
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own events" ON user_events
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- =============================================
-- 7. ADD MISSING COLUMNS TO EXISTING TABLES
-- =============================================

-- Add team_id to competitors table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competitors' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE competitors ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
        
        -- Update existing competitors to have team_id from their project
        UPDATE competitors 
        SET team_id = (
            SELECT p.team_id 
            FROM projects p 
            WHERE p.id = competitors.project_id
        );
        
        -- Make team_id NOT NULL after updating
        ALTER TABLE competitors ALTER COLUMN team_id SET NOT NULL;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_competitors_team_id ON competitors(team_id);
    END IF;
END$$;

-- Add competitor_name and competitor_url to competitors table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competitors' AND column_name = 'competitor_name'
    ) THEN
        ALTER TABLE competitors ADD COLUMN competitor_name TEXT;
        UPDATE competitors SET competitor_name = name WHERE competitor_name IS NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'competitors' AND column_name = 'competitor_url'
    ) THEN
        ALTER TABLE competitors ADD COLUMN competitor_url TEXT;
        UPDATE competitors SET competitor_url = website_url WHERE competitor_url IS NULL;
    END IF;
END$$;

-- =============================================
-- 8. UPDATE EXISTING RLS POLICIES
-- =============================================

-- Update competitors table RLS policies to include team_id
DROP POLICY IF EXISTS "Users can view competitors for their team projects" ON competitors;
DROP POLICY IF EXISTS "Users can create competitors for their team projects" ON competitors;
DROP POLICY IF EXISTS "Users can update competitors for their team projects" ON competitors;
DROP POLICY IF EXISTS "Users can delete competitors for their team projects" ON competitors;

CREATE POLICY "Users can view competitors for their team projects" ON competitors
    FOR SELECT 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create competitors for their team projects" ON competitors
    FOR INSERT 
    WITH CHECK (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
        AND project_id IN (
            SELECT p.id 
            FROM projects p 
            WHERE p.team_id = team_id
        )
    );

CREATE POLICY "Users can update competitors for their team projects" ON competitors
    FOR UPDATE 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete competitors for their team projects" ON competitors
    FOR DELETE 
    USING (
        team_id IN (
            SELECT tm.team_id 
            FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
    );

-- =============================================
-- 9. FUNCTIONS FOR COMPETITIVE INTELLIGENCE
-- =============================================

-- Function to get competitor analysis summary
CREATE OR REPLACE FUNCTION get_competitor_analysis_summary(
    project_uuid UUID,
    competitor_uuid UUID DEFAULT NULL,
    analysis_type_filter TEXT DEFAULT NULL,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    competitor_id UUID,
    competitor_name TEXT,
    total_analyses INTEGER,
    latest_analysis TIMESTAMPTZ,
    avg_confidence_score DECIMAL,
    analysis_types TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as competitor_id,
        c.name as competitor_name,
        COUNT(car.id)::INTEGER as total_analyses,
        MAX(car.generated_at) as latest_analysis,
        AVG(car.confidence_score) as avg_confidence_score,
        ARRAY_AGG(DISTINCT car.analysis_type) as analysis_types
    FROM competitors c
    LEFT JOIN competitor_analysis_results car ON c.id = car.competitor_id
    WHERE c.project_id = project_uuid
        AND (competitor_uuid IS NULL OR c.id = competitor_uuid)
        AND (analysis_type_filter IS NULL OR car.analysis_type = analysis_type_filter)
        AND (car.generated_at IS NULL OR car.generated_at >= NOW() - INTERVAL '1 day' * days_back)
    GROUP BY c.id, c.name
    ORDER BY total_analyses DESC, latest_analysis DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get keyword opportunity insights
CREATE OR REPLACE FUNCTION get_keyword_opportunities(
    project_uuid UUID,
    min_search_volume INTEGER DEFAULT 100,
    max_difficulty INTEGER DEFAULT 70,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    keyword TEXT,
    search_volume INTEGER,
    difficulty_score DECIMAL,
    opportunity_score DECIMAL,
    our_position INTEGER,
    best_competitor_position INTEGER,
    gap_opportunity INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ck.keyword,
        ck.search_volume,
        ck.difficulty_score,
        ck.opportunity_score,
        ck.our_position,
        (ck.competitors_data->'best_position')::INTEGER as best_competitor_position,
        CASE 
            WHEN ck.our_position IS NULL THEN 100
            ELSE ck.our_position - (ck.competitors_data->'best_position')::INTEGER
        END as gap_opportunity
    FROM competitive_keywords ck
    WHERE ck.project_id = project_uuid
        AND ck.search_volume >= min_search_volume
        AND ck.difficulty_score <= max_difficulty
        AND ck.opportunity_score IS NOT NULL
    ORDER BY ck.opportunity_score DESC, ck.search_volume DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired analysis results
CREATE OR REPLACE FUNCTION cleanup_expired_competitive_analysis()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM competitor_analysis_results
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO user_events (user_id, event_type, event_data)
    VALUES (
        '00000000-0000-0000-0000-000000000000'::UUID,
        'system_cleanup',
        jsonb_build_object('deleted_analyses', deleted_count, 'table', 'competitor_analysis_results')
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 10. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables that have this column
CREATE TRIGGER update_competitor_alerts_updated_at
    BEFORE UPDATE ON competitor_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to ensure team_id consistency
CREATE OR REPLACE FUNCTION ensure_team_id_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- For competitor_alerts, ensure team_id matches project's team_id
    IF TG_TABLE_NAME = 'competitor_alerts' THEN
        SELECT team_id INTO NEW.team_id
        FROM projects
        WHERE id = NEW.project_id;
    END IF;
    
    -- For competitor_analysis_results, ensure team_id matches project's team_id
    IF TG_TABLE_NAME = 'competitor_analysis_results' THEN
        SELECT team_id INTO NEW.team_id
        FROM projects
        WHERE id = NEW.project_id;
    END IF;
    
    -- For competitive_keywords, ensure team_id matches project's team_id
    IF TG_TABLE_NAME = 'competitive_keywords' THEN
        SELECT team_id INTO NEW.team_id
        FROM projects
        WHERE id = NEW.project_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply team_id consistency triggers
CREATE TRIGGER ensure_competitor_alerts_team_id
    BEFORE INSERT OR UPDATE ON competitor_alerts
    FOR EACH ROW
    EXECUTE FUNCTION ensure_team_id_consistency();

CREATE TRIGGER ensure_competitor_analysis_team_id
    BEFORE INSERT OR UPDATE ON competitor_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION ensure_team_id_consistency();

CREATE TRIGGER ensure_competitive_keywords_team_id
    BEFORE INSERT OR UPDATE ON competitive_keywords
    FOR EACH ROW
    EXECUTE FUNCTION ensure_team_id_consistency();

-- =============================================
-- 11. GRANT PERMISSIONS
-- =============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON competitor_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON competitor_analysis_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON competitor_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON competitive_keywords TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON competitive_content_analysis TO authenticated;
GRANT SELECT, INSERT ON user_events TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_competitor_analysis_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_keyword_opportunities TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_competitive_analysis TO authenticated;

-- =============================================
-- SCHEMA CREATION COMPLETE
-- =============================================

-- Log the schema creation
INSERT INTO user_events (user_id, event_type, event_data)
VALUES (
    '00000000-0000-0000-0000-000000000000'::UUID,
    'schema_creation',
    jsonb_build_object(
        'schema_type', 'competitive_intelligence',
        'tables_created', ARRAY[
            'competitor_alerts',
            'competitor_analysis_results', 
            'competitor_tracking',
            'competitive_keywords',
            'competitive_content_analysis',
            'user_events'
        ],
        'functions_created', ARRAY[
            'get_competitor_analysis_summary',
            'get_keyword_opportunities',
            'cleanup_expired_competitive_analysis'
        ]
    )
);

-- Success message
SELECT 'Competitive Intelligence Database Schema Created Successfully!' as status;