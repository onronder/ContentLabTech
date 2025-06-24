-- =====================================================
-- AI-Powered Content Intelligence Enhancements
-- Migration to add AI analysis capabilities and workflow management
-- =====================================================

-- Add AI analysis types
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'ai_content_optimization';
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'ai_competitor_intelligence';
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'ai_keyword_strategy';
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'ai_content_gaps';
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'ai_performance_prediction';

-- Add workflow status enum for project-based approvals
CREATE TYPE workflow_status AS ENUM ('pending', 'in_review', 'approved', 'rejected', 'implemented');

-- Add AI models enum
CREATE TYPE ai_model AS ENUM ('gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro');

-- =====================================================
-- AI ANALYSIS CONFIGURATIONS
-- =====================================================

-- AI analysis configurations table
CREATE TABLE ai_analysis_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    analysis_type analysis_type NOT NULL,
    ai_model ai_model DEFAULT 'gpt-4',
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT ai_analysis_configs_unique_per_project_type UNIQUE (project_id, analysis_type)
);

-- =====================================================
-- WORKFLOW MANAGEMENT
-- =====================================================

-- Workflow tasks table for project-based approval system
CREATE TABLE workflow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES auth.users(id),
    reviewer_id UUID REFERENCES auth.users(id),
    status workflow_status DEFAULT 'pending',
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    data JSONB DEFAULT '{}',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT workflow_tasks_title_check CHECK (length(trim(title)) > 0),
    CONSTRAINT workflow_tasks_completion_logic CHECK (
        (status = 'implemented' AND completed_at IS NOT NULL) OR
        (status != 'implemented')
    ),
    CONSTRAINT workflow_tasks_approval_logic CHECK (
        (status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL) OR
        (status != 'approved')
    )
);

-- =====================================================
-- ENHANCED ANALYTICS
-- =====================================================

-- Real-time competitor monitoring alerts
CREATE TABLE competitor_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    alert_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    read_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT competitor_alerts_title_check CHECK (length(trim(title)) > 0),
    CONSTRAINT competitor_alerts_message_check CHECK (length(trim(message)) > 0),
    CONSTRAINT competitor_alerts_severity_check CHECK (
        severity IN ('low', 'medium', 'high', 'critical')
    )
);

-- AI-powered content optimization sessions
CREATE TABLE optimization_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    session_type VARCHAR(100) NOT NULL,
    ai_model ai_model DEFAULT 'gpt-4',
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    optimization_score DECIMAL(5,2) CHECK (optimization_score >= 0 AND optimization_score <= 100),
    processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
    tokens_used INTEGER CHECK (tokens_used >= 0),
    cost_usd DECIMAL(10,4) CHECK (cost_usd >= 0),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    started_by UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT optimization_sessions_completion_logic CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed')
    )
);

-- =====================================================
-- KEYWORD INTELLIGENCE
-- =====================================================

-- Enhanced keyword tracking with AI insights
CREATE TABLE keyword_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    keyword VARCHAR(255) NOT NULL,
    intent_type VARCHAR(50) DEFAULT 'informational',
    semantic_cluster JSONB DEFAULT '{}',
    competitor_rankings JSONB DEFAULT '{}',
    content_gaps JSONB DEFAULT '{}',
    ai_insights JSONB DEFAULT '{}',
    predicted_difficulty DECIMAL(5,2) CHECK (predicted_difficulty >= 0 AND predicted_difficulty <= 100),
    predicted_ctr DECIMAL(5,2) CHECK (predicted_ctr >= 0 AND predicted_ctr <= 100),
    content_suggestions TEXT[],
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT keyword_intelligence_keyword_check CHECK (length(trim(keyword)) > 0),
    CONSTRAINT keyword_intelligence_intent_check CHECK (
        intent_type IN ('informational', 'navigational', 'transactional', 'commercial')
    ),
    CONSTRAINT keyword_intelligence_unique_per_project UNIQUE (project_id, keyword)
);

-- =====================================================
-- PERFORMANCE PREDICTIONS
-- =====================================================

-- AI-powered performance predictions
CREATE TABLE performance_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
    prediction_type VARCHAR(100) NOT NULL,
    timeframe_days INTEGER NOT NULL CHECK (timeframe_days > 0),
    predicted_metrics JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    actual_metrics JSONB DEFAULT '{}',
    accuracy_score DECIMAL(5,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
    model_version VARCHAR(50),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    evaluation_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT performance_predictions_evaluation_logic CHECK (
        (accuracy_score IS NOT NULL AND evaluation_date IS NOT NULL) OR
        (accuracy_score IS NULL)
    )
);

-- =====================================================
-- USER ACTIVITY TRACKING
-- =====================================================

-- Enhanced user events for analytics
CREATE TABLE user_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_events_event_type_check CHECK (length(trim(event_type)) > 0)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- AI analysis configs indexes
CREATE INDEX idx_ai_analysis_configs_project_type ON ai_analysis_configs(project_id, analysis_type);
CREATE INDEX idx_ai_analysis_configs_active ON ai_analysis_configs(is_active) WHERE is_active = true;

-- Workflow tasks indexes
CREATE INDEX idx_workflow_tasks_project_status ON workflow_tasks(project_id, status);
CREATE INDEX idx_workflow_tasks_assignee ON workflow_tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_workflow_tasks_reviewer ON workflow_tasks(reviewer_id) WHERE reviewer_id IS NOT NULL;
CREATE INDEX idx_workflow_tasks_due_date ON workflow_tasks(due_date) WHERE due_date IS NOT NULL;

-- Competitor alerts indexes
CREATE INDEX idx_competitor_alerts_competitor ON competitor_alerts(competitor_id);
CREATE INDEX idx_competitor_alerts_unread ON competitor_alerts(is_read, created_at) WHERE is_read = false;

-- Optimization sessions indexes
CREATE INDEX idx_optimization_sessions_project ON optimization_sessions(project_id);
CREATE INDEX idx_optimization_sessions_content ON optimization_sessions(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX idx_optimization_sessions_status ON optimization_sessions(status);
CREATE INDEX idx_optimization_sessions_started_by ON optimization_sessions(started_by);

-- Keyword intelligence indexes
CREATE INDEX idx_keyword_intelligence_project ON keyword_intelligence(project_id);
CREATE INDEX idx_keyword_intelligence_intent ON keyword_intelligence(intent_type);
CREATE INDEX idx_keyword_intelligence_last_analyzed ON keyword_intelligence(last_analyzed_at);

-- Performance predictions indexes
CREATE INDEX idx_performance_predictions_project ON performance_predictions(project_id);
CREATE INDEX idx_performance_predictions_content ON performance_predictions(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX idx_performance_predictions_type ON performance_predictions(prediction_type);
CREATE INDEX idx_performance_predictions_evaluation ON performance_predictions(evaluation_date) WHERE evaluation_date IS NOT NULL;

-- User events indexes
CREATE INDEX idx_user_events_user_timestamp ON user_events(user_id, timestamp);
CREATE INDEX idx_user_events_type_timestamp ON user_events(event_type, timestamp);
CREATE INDEX idx_user_events_session ON user_events(session_id) WHERE session_id IS NOT NULL;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_ai_analysis_configs_updated_at 
    BEFORE UPDATE ON ai_analysis_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_tasks_updated_at 
    BEFORE UPDATE ON workflow_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keyword_intelligence_updated_at 
    BEFORE UPDATE ON keyword_intelligence 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE ai_analysis_configs IS 'Configuration settings for AI-powered analysis types per project';
COMMENT ON TABLE workflow_tasks IS 'Project-based workflow management with approval system';
COMMENT ON TABLE competitor_alerts IS 'Real-time alerts for competitor monitoring';
COMMENT ON TABLE optimization_sessions IS 'AI-powered content optimization sessions with usage tracking';
COMMENT ON TABLE keyword_intelligence IS 'Enhanced keyword analysis with AI insights and predictions';
COMMENT ON TABLE performance_predictions IS 'AI-generated performance predictions with accuracy tracking';
COMMENT ON TABLE user_events IS 'Enhanced user activity tracking for analytics and insights';