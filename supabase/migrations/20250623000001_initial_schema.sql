-- =====================================================
-- ContentLab Nexus Database Schema
-- Initial migration with comprehensive table structure
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";

-- =====================================================
-- CUSTOM TYPES AND ENUMS
-- =====================================================

-- User role enum for team membership
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Project status enum
CREATE TYPE project_status AS ENUM ('active', 'paused', 'archived', 'deleted');

-- Content type enum
CREATE TYPE content_type AS ENUM ('article', 'blog_post', 'landing_page', 'product_page', 'category_page', 'other');

-- Content status enum
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived', 'deleted');

-- Analysis type enum
CREATE TYPE analysis_type AS ENUM ('content_seo', 'competitor_analysis', 'keyword_research', 'content_gap', 'performance_audit');

-- Competition level enum
CREATE TYPE competition_level AS ENUM ('low', 'medium', 'high', 'very_high');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Teams table - Core organizational unit
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT teams_name_check CHECK (length(trim(name)) > 0)
);

-- Team members table - User membership in teams
CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (team_id, user_id)
);

-- Projects table - Individual projects within teams
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website_url VARCHAR(2048),
    target_keywords TEXT[] DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    status project_status DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT projects_name_check CHECK (length(trim(name)) > 0),
    CONSTRAINT projects_website_url_check CHECK (
        website_url IS NULL OR 
        website_url ~ '^https?://.+'
    )
);

-- Content items table - Individual pieces of content
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT,
    url VARCHAR(2048) NOT NULL,
    content_type content_type DEFAULT 'article',
    status content_status DEFAULT 'draft',
    seo_score DECIMAL(5,2) CHECK (seo_score >= 0 AND seo_score <= 100),
    readability_score DECIMAL(5,2) CHECK (readability_score >= 0 AND readability_score <= 100),
    word_count INTEGER CHECK (word_count >= 0),
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    focus_keywords TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT content_items_title_check CHECK (length(trim(title)) > 0),
    CONSTRAINT content_items_url_check CHECK (
        url ~ '^https?://.+' OR url ~ '^/.+'
    )
);

-- Competitors table - Competitor tracking
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    website_url VARCHAR(2048) NOT NULL,
    description TEXT,
    market_share DECIMAL(5,2) CHECK (market_share >= 0 AND market_share <= 100),
    monitoring_enabled BOOLEAN DEFAULT true,
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT competitors_name_check CHECK (length(trim(name)) > 0),
    CONSTRAINT competitors_website_url_check CHECK (
        website_url ~ '^https?://.+'
    ),
    CONSTRAINT competitors_unique_per_project UNIQUE (project_id, website_url)
);

-- Keyword opportunities table - SEO keyword tracking
CREATE TABLE keyword_opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    search_volume INTEGER CHECK (search_volume >= 0),
    difficulty_score DECIMAL(5,2) CHECK (difficulty_score >= 0 AND difficulty_score <= 100),
    opportunity_score DECIMAL(5,2) CHECK (opportunity_score >= 0 AND opportunity_score <= 100),
    current_ranking INTEGER CHECK (current_ranking > 0),
    target_ranking INTEGER CHECK (target_ranking > 0 AND target_ranking <= 100),
    competition_level competition_level DEFAULT 'medium',
    trend_data JSONB DEFAULT '{}',
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT keyword_opportunities_keyword_check CHECK (length(trim(keyword)) > 0),
    CONSTRAINT keyword_opportunities_unique_per_project UNIQUE (project_id, keyword)
);

-- Analysis results table - Store analysis outputs
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
    analysis_type analysis_type NOT NULL,
    results JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT analysis_results_expires_after_generated CHECK (
        expires_at IS NULL OR expires_at > generated_at
    )
);

-- Content analytics table - Performance metrics
CREATE TABLE content_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    pageviews INTEGER DEFAULT 0 CHECK (pageviews >= 0),
    unique_visitors INTEGER DEFAULT 0 CHECK (unique_visitors >= 0),
    bounce_rate DECIMAL(5,2) CHECK (bounce_rate >= 0 AND bounce_rate <= 100),
    avg_session_duration INTEGER DEFAULT 0 CHECK (avg_session_duration >= 0),
    conversions INTEGER DEFAULT 0 CHECK (conversions >= 0),
    conversion_rate DECIMAL(5,2) CHECK (conversion_rate >= 0 AND conversion_rate <= 100),
    organic_traffic INTEGER DEFAULT 0 CHECK (organic_traffic >= 0),
    backlinks_count INTEGER DEFAULT 0 CHECK (backlinks_count >= 0),
    social_shares INTEGER DEFAULT 0 CHECK (social_shares >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT content_analytics_unique_content_date UNIQUE (content_id, date)
);

-- Competitor analytics table - Competitor performance tracking
CREATE TABLE competitor_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    estimated_traffic INTEGER DEFAULT 0 CHECK (estimated_traffic >= 0),
    domain_authority DECIMAL(5,2) CHECK (domain_authority >= 0 AND domain_authority <= 100),
    backlinks_count INTEGER DEFAULT 0 CHECK (backlinks_count >= 0),
    referring_domains INTEGER DEFAULT 0 CHECK (referring_domains >= 0),
    top_keywords TEXT[] DEFAULT '{}',
    content_updates_count INTEGER DEFAULT 0 CHECK (content_updates_count >= 0),
    new_content_count INTEGER DEFAULT 0 CHECK (new_content_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT competitor_analytics_unique_competitor_date UNIQUE (competitor_id, date)
);

-- Content recommendations table - AI-generated suggestions
CREATE TABLE content_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    estimated_impact VARCHAR(50) DEFAULT 'medium',
    implementation_effort VARCHAR(50) DEFAULT 'medium',
    data JSONB DEFAULT '{}',
    is_implemented BOOLEAN DEFAULT false,
    implemented_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT content_recommendations_title_check CHECK (length(trim(title)) > 0),
    CONSTRAINT content_recommendations_description_check CHECK (length(trim(description)) > 0)
);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_items_updated_at 
    BEFORE UPDATE ON content_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitors_updated_at 
    BEFORE UPDATE ON competitors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE teams IS 'Core organizational units for grouping users and projects';
COMMENT ON TABLE team_members IS 'User membership and roles within teams';
COMMENT ON TABLE projects IS 'Individual projects containing content and analysis';
COMMENT ON TABLE content_items IS 'Individual pieces of content being tracked and analyzed';
COMMENT ON TABLE competitors IS 'Competitor websites being monitored';
COMMENT ON TABLE keyword_opportunities IS 'SEO keyword tracking and opportunities';
COMMENT ON TABLE analysis_results IS 'Results from various content and competitor analyses';
COMMENT ON TABLE content_analytics IS 'Performance metrics for content items';
COMMENT ON TABLE competitor_analytics IS 'Performance metrics for competitors';
COMMENT ON TABLE content_recommendations IS 'AI-generated recommendations for content improvement';