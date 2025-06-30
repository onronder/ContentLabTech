-- =================================================
-- Competitive Intelligence Database Schema
-- Production-grade schema for comprehensive competitive analysis
-- =================================================

-- Competitors table - stores competitor information
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('direct', 'indirect', 'emerging', 'aspirational')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'monitoring', 'archived')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_analyzed TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata structure:
  -- {
  --   "industry": "string",
  --   "size": "startup|small|medium|large|enterprise",
  --   "location": "string",
  --   "description": "string",
  --   "tags": ["tag1", "tag2"],
  --   "customFields": {}
  -- }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competitive analysis results table
CREATE TABLE IF NOT EXISTS competitive_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  project_id UUID NOT NULL,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'content-similarity', 
    'seo-comparison', 
    'performance-benchmark', 
    'market-position', 
    'content-gaps', 
    'comprehensive'
  )),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  data JSONB NOT NULL DEFAULT '{}',
  confidence JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Data structure contains all analysis results based on type
  -- Confidence structure:
  -- {
  --   "overall": 0-100,
  --   "dataQuality": 0-100,
  --   "sampleSize": 0-100,
  --   "recency": 0-100,
  --   "sourceReliability": 0-100,
  --   "analysisAccuracy": 0-100
  -- }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competitive alerts table
CREATE TABLE IF NOT EXISTS competitive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'content-published',
    'ranking-change',
    'backlink-gained',
    'strategy-shift',
    'performance-improvement',
    'market-movement',
    'threat-detected',
    'opportunity-identified'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'in-progress', 'resolved', 'dismissed')),
  action_required BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata structure:
  -- {
  --   "source": "string",
  --   "confidence": 0-100,
  --   "impact": 0-100,
  --   "urgency": 0-100,
  --   "relatedEntities": ["entity1", "entity2"],
  --   "data": {}
  -- }
  
  -- Recommendations structure:
  -- [
  --   {
  --     "action": "string",
  --     "priority": "immediate|short-term|medium-term|long-term",
  --     "description": "string",
  --     "expectedOutcome": "string",
  --     "effort": "low|medium|high"
  --   }
  -- ]
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competitive monitoring configurations
CREATE TABLE IF NOT EXISTS competitive_monitoring_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  monitoring_types TEXT[] NOT NULL,
  alert_thresholds JSONB NOT NULL DEFAULT '{}',
  scheduled_frequency TEXT NOT NULL CHECK (scheduled_frequency IN ('hourly', 'daily', 'weekly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Alert thresholds structure:
  -- {
  --   "rankingChange": number,
  --   "contentFrequency": number,
  --   "performanceChange": number,
  --   "backlinksChange": number,
  --   "trafficChange": number
  -- }
  
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, competitor_id)
);

-- Content analysis snapshots
CREATE TABLE IF NOT EXISTS competitive_content_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  content_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- Content analysis structure:
  -- {
  --   "contentSimilarity": {...},
  --   "contentQuality": {...},
  --   "topicAnalysis": {...},
  --   "contentVolume": {...},
  --   "contentStrategy": {...}
  -- }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SEO analysis snapshots
CREATE TABLE IF NOT EXISTS competitive_seo_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  seo_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- SEO analysis structure:
  -- {
  --   "overallComparison": {...},
  --   "keywordAnalysis": {...},
  --   "technicalSEO": {...},
  --   "contentOptimization": {...},
  --   "linkProfile": {...}
  -- }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance analysis snapshots
CREATE TABLE IF NOT EXISTS competitive_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  performance_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- Performance analysis structure:
  -- {
  --   "speedComparison": {...},
  --   "userExperience": {...},
  --   "mobilePerformance": {...},
  --   "performanceOpportunities": [...]
  -- }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Market position analysis snapshots
CREATE TABLE IF NOT EXISTS competitive_market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  market_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- Market analysis structure:
  -- {
  --   "overallPosition": {...},
  --   "competitiveStrengths": [...],
  --   "competitiveWeaknesses": [...],
  --   "marketOpportunities": [...],
  --   "threats": [...],
  --   "strategicRecommendations": [...]
  -- }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content gap analysis snapshots
CREATE TABLE IF NOT EXISTS competitive_content_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  gap_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- Gap analysis structure:
  -- {
  --   "topicGaps": [...],
  --   "keywordGaps": [...],
  --   "formatGaps": [...],
  --   "audienceGaps": [...],
  --   "opportunityMatrix": {...},
  --   "prioritizedRecommendations": [...]
  -- }
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keywords tracking for competitive analysis
CREATE TABLE IF NOT EXISTS competitive_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  project_id UUID NOT NULL,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  current_ranking INTEGER,
  previous_ranking INTEGER,
  search_volume INTEGER,
  difficulty DECIMAL(5,2),
  cpc DECIMAL(10,2),
  trend TEXT CHECK (trend IN ('rising', 'stable', 'declining')),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(keyword, project_id, competitor_id)
);

-- Backlinks tracking for competitive analysis
CREATE TABLE IF NOT EXISTS competitive_backlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  source_domain TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  link_type TEXT,
  domain_authority INTEGER,
  discovered_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competitive insights aggregation view
CREATE VIEW competitive_insights_summary AS
SELECT 
  c.id as competitor_id,
  c.name as competitor_name,
  c.domain,
  c.category,
  c.priority,
  c.status,
  COUNT(DISTINCT car.id) as total_analyses,
  COUNT(DISTINCT ca.id) as active_alerts,
  MAX(car.timestamp) as last_analysis_date,
  MAX(ca.timestamp) as last_alert_date,
  AVG(CASE 
    WHEN car.data->>'overallScore' IS NOT NULL 
    THEN (car.data->>'overallScore')::numeric 
    ELSE NULL 
  END) as avg_competitive_score
FROM competitors c
LEFT JOIN competitive_analysis_results car ON c.id = car.competitor_id
LEFT JOIN competitive_alerts ca ON c.id = ca.competitor_id AND ca.status != 'resolved'
GROUP BY c.id, c.name, c.domain, c.category, c.priority, c.status;

-- =================================================
-- Indexes for Performance Optimization
-- =================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_competitors_domain ON competitors(domain);
CREATE INDEX IF NOT EXISTS idx_competitors_category ON competitors(category);
CREATE INDEX IF NOT EXISTS idx_competitors_status ON competitors(status);
CREATE INDEX IF NOT EXISTS idx_competitors_priority ON competitors(priority);

-- Analysis results indexes
CREATE INDEX IF NOT EXISTS idx_competitive_analysis_project ON competitive_analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_competitive_analysis_competitor ON competitive_analysis_results(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitive_analysis_type ON competitive_analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_competitive_analysis_timestamp ON competitive_analysis_results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_competitive_analysis_status ON competitive_analysis_results(status);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_competitive_alerts_project ON competitive_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_competitive_alerts_competitor ON competitive_alerts(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitive_alerts_type ON competitive_alerts(type);
CREATE INDEX IF NOT EXISTS idx_competitive_alerts_severity ON competitive_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_competitive_alerts_status ON competitive_alerts(status);
CREATE INDEX IF NOT EXISTS idx_competitive_alerts_timestamp ON competitive_alerts(timestamp DESC);

-- Monitoring configs indexes
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_project ON competitive_monitoring_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_active ON competitive_monitoring_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_next_run ON competitive_monitoring_configs(next_run);

-- Snapshot indexes for historical analysis
CREATE INDEX IF NOT EXISTS idx_content_snapshots_competitor_date ON competitive_content_snapshots(competitor_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_snapshots_competitor_date ON competitive_seo_snapshots(competitor_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_competitor_date ON competitive_performance_snapshots(competitor_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_competitor_date ON competitive_market_snapshots(competitor_id, snapshot_date DESC);

-- Keywords tracking indexes
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_project ON competitive_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_competitor ON competitive_keywords(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_keyword ON competitive_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_competitive_keywords_ranking ON competitive_keywords(current_ranking);

-- Backlinks tracking indexes
CREATE INDEX IF NOT EXISTS idx_competitive_backlinks_competitor ON competitive_backlinks(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitive_backlinks_domain ON competitive_backlinks(source_domain);
CREATE INDEX IF NOT EXISTS idx_competitive_backlinks_active ON competitive_backlinks(is_active);

-- =================================================
-- Functions and Triggers
-- =================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_competitors_updated_at 
  BEFORE UPDATE ON competitors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitive_analysis_results_updated_at 
  BEFORE UPDATE ON competitive_analysis_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitive_alerts_updated_at 
  BEFORE UPDATE ON competitive_alerts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitive_monitoring_configs_updated_at 
  BEFORE UPDATE ON competitive_monitoring_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitive_keywords_updated_at 
  BEFORE UPDATE ON competitive_keywords 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitive_backlinks_updated_at 
  BEFORE UPDATE ON competitive_backlinks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically schedule next monitoring run
CREATE OR REPLACE FUNCTION schedule_next_monitoring_run()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_run = CASE 
    WHEN NEW.scheduled_frequency = 'hourly' THEN CURRENT_TIMESTAMP + INTERVAL '1 hour'
    WHEN NEW.scheduled_frequency = 'daily' THEN CURRENT_TIMESTAMP + INTERVAL '1 day'
    WHEN NEW.scheduled_frequency = 'weekly' THEN CURRENT_TIMESTAMP + INTERVAL '1 week'
    ELSE CURRENT_TIMESTAMP + INTERVAL '1 day'
  END;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic monitoring scheduling
CREATE TRIGGER schedule_competitive_monitoring 
  BEFORE INSERT OR UPDATE ON competitive_monitoring_configs 
  FOR EACH ROW EXECUTE FUNCTION schedule_next_monitoring_run();

-- =================================================
-- Row Level Security (RLS) Policies
-- =================================================

-- Enable RLS on all tables
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_monitoring_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_content_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_seo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_content_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_backlinks ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be implemented based on your authentication system
-- Example policy for project-based access:
-- CREATE POLICY competitors_project_access ON competitors
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM projects p 
--       WHERE p.id = project_id 
--       AND p.team_id = auth.jwt() ->> 'team_id'
--     )
--   );

-- =================================================
-- Data Retention and Cleanup Functions
-- =================================================

-- Function to clean up old snapshots (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_snapshots()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Clean up content snapshots
  DELETE FROM competitive_content_snapshots 
  WHERE snapshot_date < CURRENT_TIMESTAMP - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up SEO snapshots
  DELETE FROM competitive_seo_snapshots 
  WHERE snapshot_date < CURRENT_TIMESTAMP - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Clean up performance snapshots
  DELETE FROM competitive_performance_snapshots 
  WHERE snapshot_date < CURRENT_TIMESTAMP - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Clean up market snapshots
  DELETE FROM competitive_market_snapshots 
  WHERE snapshot_date < CURRENT_TIMESTAMP - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Clean up resolved alerts older than 30 days
  DELETE FROM competitive_alerts 
  WHERE status = 'resolved' 
  AND timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =================================================
-- Sample Data (for testing)
-- =================================================

-- Insert sample competitors
-- INSERT INTO competitors (name, domain, category, priority, status, metadata) VALUES
-- ('HubSpot', 'hubspot.com', 'direct', 'critical', 'active', 
--  '{"industry": "Marketing Technology", "size": "enterprise", "location": "Cambridge, MA", "description": "Inbound marketing and sales platform", "tags": ["marketing", "crm", "enterprise"], "customFields": {}}'),
-- ('Salesforce', 'salesforce.com', 'indirect', 'high', 'active',
--  '{"industry": "CRM", "size": "enterprise", "location": "San Francisco, CA", "description": "Cloud-based CRM platform", "tags": ["crm", "enterprise", "cloud"], "customFields": {}}'),
-- ('Mailchimp', 'mailchimp.com', 'direct', 'medium', 'active',
--  '{"industry": "Email Marketing", "size": "large", "location": "Atlanta, GA", "description": "Email marketing platform", "tags": ["email", "marketing", "automation"], "customFields": {}}');