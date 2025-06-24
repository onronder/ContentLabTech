-- =====================================================
-- Phase 2: Machine Learning & Advanced Analytics Schema
-- Predictive performance analytics and enhanced collaboration
-- =====================================================

-- Add new analysis types for Phase 2
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'ml_performance_prediction';
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'trend_analysis';
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'collaborative_analysis';
ALTER TYPE analysis_type ADD VALUE IF NOT EXISTS 'custom_analytics';

-- Add team collaboration enhancements
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'data_analyst';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'content_strategist';

-- Add dashboard widget types
CREATE TYPE widget_type AS ENUM (
  'performance_chart',
  'prediction_graph',
  'competitor_comparison',
  'keyword_trends',
  'team_metrics',
  'content_pipeline',
  'roi_calculator',
  'custom_metric'
);

-- Add prediction confidence levels
CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high', 'very_high');

-- Add collaboration session status
CREATE TYPE session_status AS ENUM ('active', 'completed', 'cancelled', 'archived');

-- =====================================================
-- MACHINE LEARNING & PREDICTIONS TABLES
-- =====================================================

-- ML Training Data for Performance Predictions
CREATE TABLE ml_training_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  features JSONB NOT NULL DEFAULT '{}',
  target_metrics JSONB NOT NULL DEFAULT '{}',
  prediction_timeframe INTEGER NOT NULL CHECK (prediction_timeframe > 0),
  data_quality_score DECIMAL(5,2) CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  is_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ml_training_data_features_check CHECK (jsonb_typeof(features) = 'object'),
  CONSTRAINT ml_training_data_metrics_check CHECK (jsonb_typeof(target_metrics) = 'object')
);

-- Model Performance Tracking
CREATE TABLE model_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  accuracy_metrics JSONB NOT NULL DEFAULT '{}',
  training_date TIMESTAMPTZ NOT NULL,
  evaluation_date TIMESTAMPTZ NOT NULL,
  training_data_count INTEGER NOT NULL CHECK (training_data_count > 0),
  validation_data_count INTEGER NOT NULL CHECK (validation_data_count > 0),
  is_active BOOLEAN DEFAULT false,
  model_config JSONB DEFAULT '{}',
  performance_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT model_performance_unique_active UNIQUE (model_type, is_active) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT model_performance_accuracy_check CHECK (jsonb_typeof(accuracy_metrics) = 'object')
);

-- Model Predictions with Enhanced Tracking
CREATE TABLE model_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  prediction_data JSONB NOT NULL DEFAULT '{}',
  confidence_level confidence_level DEFAULT 'medium',
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  prediction_timeframe INTEGER NOT NULL CHECK (prediction_timeframe > 0),
  actual_results JSONB DEFAULT '{}',
  accuracy_score DECIMAL(5,2) CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
  variance_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  prediction_date TIMESTAMPTZ NOT NULL,
  evaluation_date TIMESTAMPTZ,
  is_evaluated BOOLEAN DEFAULT false,
  
  CONSTRAINT model_predictions_data_check CHECK (jsonb_typeof(prediction_data) = 'object'),
  CONSTRAINT model_predictions_evaluation_logic CHECK (
    (is_evaluated = true AND evaluation_date IS NOT NULL AND accuracy_score IS NOT NULL) OR
    (is_evaluated = false)
  )
);

-- =====================================================
-- ADVANCED ANALYTICS TABLES
-- =====================================================

-- Analytics Aggregations for Real-time Performance
CREATE TABLE analytics_aggregations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  aggregation_type VARCHAR(100) NOT NULL,
  time_period DATE NOT NULL,
  granularity VARCHAR(20) NOT NULL CHECK (granularity IN ('hourly', 'daily', 'weekly', 'monthly')),
  metrics JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  data_sources TEXT[] DEFAULT '{}',
  processing_duration_ms INTEGER CHECK (processing_duration_ms >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_aggregation UNIQUE (project_id, aggregation_type, time_period, granularity),
  CONSTRAINT analytics_aggregations_metrics_check CHECK (jsonb_typeof(metrics) = 'object')
);

-- Custom Dashboards for Personalized Analytics
CREATE TABLE custom_dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  dashboard_name VARCHAR(255) NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  layout_config JSONB DEFAULT '{}',
  is_shared BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  access_permissions JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0 CHECK (view_count >= 0),
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT custom_dashboards_name_check CHECK (length(trim(dashboard_name)) > 0),
  CONSTRAINT custom_dashboards_config_check CHECK (jsonb_typeof(configuration) = 'object')
);

-- Dashboard Widgets with Enhanced Configuration
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dashboard_id UUID NOT NULL REFERENCES custom_dashboards(id) ON DELETE CASCADE,
  widget_type widget_type NOT NULL,
  widget_config JSONB NOT NULL DEFAULT '{}',
  data_source_config JSONB DEFAULT '{}',
  display_config JSONB DEFAULT '{}',
  position_x INTEGER NOT NULL CHECK (position_x >= 0),
  position_y INTEGER NOT NULL CHECK (position_y >= 0),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  z_index INTEGER DEFAULT 1 CHECK (z_index >= 0),
  is_visible BOOLEAN DEFAULT true,
  refresh_interval_seconds INTEGER DEFAULT 300 CHECK (refresh_interval_seconds > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT dashboard_widgets_config_check CHECK (jsonb_typeof(widget_config) = 'object')
);

-- =====================================================
-- ENHANCED TEAM COLLABORATION TABLES
-- =====================================================

-- Enhanced Team Members with Specializations
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS permissions_level INTEGER DEFAULT 1 CHECK (permissions_level >= 1 AND permissions_level <= 5),
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS productivity_score DECIMAL(5,2) CHECK (productivity_score >= 0 AND productivity_score <= 100);

-- Team Performance Metrics
CREATE TABLE team_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_unit VARCHAR(50),
  time_period DATE NOT NULL,
  calculation_method VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT team_performance_metrics_unique UNIQUE (team_id, user_id, project_id, metric_type, time_period)
);

-- Collaborative Analysis Sessions
CREATE TABLE collaborative_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES analysis_results(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_name VARCHAR(255) NOT NULL,
  description TEXT,
  participants JSONB NOT NULL DEFAULT '[]',
  session_config JSONB DEFAULT '{}',
  status session_status DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  moderator_id UUID REFERENCES auth.users(id),
  scheduled_start_time TIMESTAMPTZ,
  scheduled_end_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT collaborative_sessions_name_check CHECK (length(trim(session_name)) > 0),
  CONSTRAINT collaborative_sessions_participants_check CHECK (jsonb_typeof(participants) = 'array'),
  CONSTRAINT collaborative_sessions_time_logic CHECK (
    (scheduled_start_time IS NULL OR scheduled_end_time IS NULL OR scheduled_start_time < scheduled_end_time) AND
    (actual_start_time IS NULL OR actual_end_time IS NULL OR actual_start_time < actual_end_time)
  )
);

-- Session Comments and Discussions
CREATE TABLE session_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  comment_type VARCHAR(50) DEFAULT 'general' CHECK (comment_type IN ('general', 'suggestion', 'question', 'approval', 'concern', 'insight')),
  parent_comment_id UUID REFERENCES session_comments(id) ON DELETE CASCADE,
  mentioned_users JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT session_comments_text_check CHECK (length(trim(comment_text)) > 0),
  CONSTRAINT session_comments_mentions_check CHECK (jsonb_typeof(mentioned_users) = 'array'),
  CONSTRAINT session_comments_resolution_logic CHECK (
    (is_resolved = true AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL) OR
    (is_resolved = false)
  )
);

-- Real-time Session Activity Tracking
CREATE TABLE session_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT session_activities_data_check CHECK (jsonb_typeof(activity_data) = 'object')
);

-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================

-- ML Training Data Indexes
CREATE INDEX idx_ml_training_data_content_project ON ml_training_data(content_id, project_id);
CREATE INDEX idx_ml_training_data_timeframe ON ml_training_data(prediction_timeframe);
CREATE INDEX idx_ml_training_data_validated ON ml_training_data(is_validated) WHERE is_validated = true;
CREATE INDEX idx_ml_training_data_quality ON ml_training_data(data_quality_score DESC);

-- Model Performance Indexes
CREATE INDEX idx_model_performance_type_version ON model_performance(model_type, model_version);
CREATE INDEX idx_model_performance_active ON model_performance(is_active) WHERE is_active = true;
CREATE INDEX idx_model_performance_evaluation ON model_performance(evaluation_date DESC);

-- Model Predictions Indexes
CREATE INDEX idx_model_predictions_content ON model_predictions(content_id);
CREATE INDEX idx_model_predictions_project_date ON model_predictions(project_id, prediction_date DESC);
CREATE INDEX idx_model_predictions_evaluation ON model_predictions(is_evaluated, evaluation_date);
CREATE INDEX idx_model_predictions_confidence ON model_predictions(confidence_level, confidence_score DESC);

-- Analytics Aggregations Indexes
CREATE INDEX idx_analytics_aggregations_project_type ON analytics_aggregations(project_id, aggregation_type);
CREATE INDEX idx_analytics_aggregations_time_granularity ON analytics_aggregations(time_period, granularity);
CREATE INDEX idx_analytics_aggregations_updated ON analytics_aggregations(updated_at DESC);

-- Custom Dashboards Indexes
CREATE INDEX idx_custom_dashboards_user_project ON custom_dashboards(user_id, project_id);
CREATE INDEX idx_custom_dashboards_shared ON custom_dashboards(is_shared) WHERE is_shared = true;
CREATE INDEX idx_custom_dashboards_template ON custom_dashboards(is_template) WHERE is_template = true;
CREATE INDEX idx_custom_dashboards_public ON custom_dashboards(is_public) WHERE is_public = true;

-- Dashboard Widgets Indexes
CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX idx_dashboard_widgets_visible ON dashboard_widgets(is_visible) WHERE is_visible = true;

-- Team Performance Indexes
CREATE INDEX idx_team_performance_team_period ON team_performance_metrics(team_id, time_period DESC);
CREATE INDEX idx_team_performance_user_metric ON team_performance_metrics(user_id, metric_type);
CREATE INDEX idx_team_performance_project ON team_performance_metrics(project_id, time_period DESC);

-- Collaborative Sessions Indexes
CREATE INDEX idx_collaborative_sessions_project ON collaborative_sessions(project_id);
CREATE INDEX idx_collaborative_sessions_status ON collaborative_sessions(status);
CREATE INDEX idx_collaborative_sessions_created_by ON collaborative_sessions(created_by);
CREATE INDEX idx_collaborative_sessions_scheduled ON collaborative_sessions(scheduled_start_time) WHERE scheduled_start_time IS NOT NULL;

-- Session Comments Indexes
CREATE INDEX idx_session_comments_session ON session_comments(session_id, created_at DESC);
CREATE INDEX idx_session_comments_user ON session_comments(user_id);
CREATE INDEX idx_session_comments_parent ON session_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_session_comments_unresolved ON session_comments(is_resolved) WHERE is_resolved = false;

-- Session Activities Indexes
CREATE INDEX idx_session_activities_session_time ON session_activities(session_id, timestamp DESC);
CREATE INDEX idx_session_activities_user ON session_activities(user_id, timestamp DESC);
CREATE INDEX idx_session_activities_type ON session_activities(activity_type);

-- =====================================================
-- ADVANCED RLS POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;

-- ML Training Data Policies
CREATE POLICY "Users can view ML training data for their team projects" ON ml_training_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = ml_training_data.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Model Performance Policies (Admin/Data Analyst only)
CREATE POLICY "Data analysts can view model performance" ON model_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND (tm.role = 'admin' OR tm.role = 'data_analyst')
    )
  );

-- Model Predictions Policies
CREATE POLICY "Users can view predictions for their team projects" ON model_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = model_predictions.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Analytics Aggregations Policies
CREATE POLICY "Users can view analytics for their team projects" ON analytics_aggregations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = analytics_aggregations.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Custom Dashboards Policies
CREATE POLICY "Users can manage their own dashboards" ON custom_dashboards FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can view shared dashboards from their teams" ON custom_dashboards FOR SELECT
  USING (
    is_shared = true AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = custom_dashboards.project_id
        AND tm.user_id = auth.uid()
      )
    )
  );

-- Dashboard Widgets Policies
CREATE POLICY "Users can manage widgets on their accessible dashboards" ON dashboard_widgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM custom_dashboards cd
      WHERE cd.id = dashboard_widgets.dashboard_id
      AND (
        cd.user_id = auth.uid() OR
        (cd.is_shared = true AND EXISTS (
          SELECT 1 FROM projects p
          JOIN team_members tm ON tm.team_id = p.team_id
          WHERE p.id = cd.project_id
          AND tm.user_id = auth.uid()
        ))
      )
    )
  );

-- Collaborative Sessions Policies
CREATE POLICY "Users can access sessions they participate in" ON collaborative_sessions FOR SELECT
  USING (
    created_by = auth.uid() OR
    moderator_id = auth.uid() OR
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
  );

CREATE POLICY "Team members can create sessions for their projects" ON collaborative_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = collaborative_sessions.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Session Comments Policies
CREATE POLICY "Session participants can view and add comments" ON session_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM collaborative_sessions cs
      WHERE cs.id = session_comments.session_id
      AND (
        cs.created_by = auth.uid() OR
        cs.moderator_id = auth.uid() OR
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(cs.participants))
      )
    )
  );

-- Session Activities Policies
CREATE POLICY "Session participants can view activities" ON session_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collaborative_sessions cs
      WHERE cs.id = session_activities.session_id
      AND (
        cs.created_by = auth.uid() OR
        cs.moderator_id = auth.uid() OR
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(cs.participants))
      )
    )
  );

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_analytics_aggregations_updated_at 
    BEFORE UPDATE ON analytics_aggregations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_dashboards_updated_at 
    BEFORE UPDATE ON custom_dashboards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at 
    BEFORE UPDATE ON dashboard_widgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborative_sessions_updated_at 
    BEFORE UPDATE ON collaborative_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_comments_updated_at 
    BEFORE UPDATE ON session_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE ml_training_data IS 'Training data for machine learning models with quality scoring';
COMMENT ON TABLE model_performance IS 'ML model performance tracking with accuracy metrics';
COMMENT ON TABLE model_predictions IS 'Content performance predictions with confidence scoring';
COMMENT ON TABLE analytics_aggregations IS 'Pre-computed analytics for real-time dashboard performance';
COMMENT ON TABLE custom_dashboards IS 'User-created custom dashboards with sharing capabilities';
COMMENT ON TABLE dashboard_widgets IS 'Individual widgets within custom dashboards';
COMMENT ON TABLE team_performance_metrics IS 'Team member performance tracking and analytics';
COMMENT ON TABLE collaborative_sessions IS 'Real-time collaborative analysis sessions';
COMMENT ON TABLE session_comments IS 'Comments and discussions within collaborative sessions';
COMMENT ON TABLE session_activities IS 'Real-time activity tracking for collaborative sessions';