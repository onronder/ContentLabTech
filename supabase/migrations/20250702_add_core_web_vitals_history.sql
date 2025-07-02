-- =====================================================
-- Core Web Vitals History Table
-- Stores Google PageSpeed Insights Core Web Vitals data
-- =====================================================

-- Create Core Web Vitals history table
CREATE TABLE IF NOT EXISTS core_web_vitals_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  measurement_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Core Web Vitals metrics (Google's official thresholds)
  lcp_value DECIMAL(8,2), -- Largest Contentful Paint (ms)
  fid_value DECIMAL(8,2), -- First Input Delay (ms) 
  cls_value DECIMAL(5,3), -- Cumulative Layout Shift (score)
  fcp_value DECIMAL(8,2), -- First Contentful Paint (ms)
  speed_index DECIMAL(8,2), -- Speed Index
  
  -- Scores based on Google thresholds (0-100)
  lcp_score INTEGER CHECK (lcp_score >= 0 AND lcp_score <= 100),
  fid_score INTEGER CHECK (fid_score >= 0 AND fid_score <= 100),
  cls_score INTEGER CHECK (cls_score >= 0 AND cls_score <= 100),
  fcp_score INTEGER CHECK (fcp_score >= 0 AND fcp_score <= 100),
  speed_index_score INTEGER CHECK (speed_index_score >= 0 AND speed_index_score <= 100),
  overall_performance_score INTEGER CHECK (overall_performance_score >= 0 AND overall_performance_score <= 100),
  
  -- Context
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
  
  -- Raw data storage
  lighthouse_data JSONB DEFAULT '{}',
  
  -- Ensure unique measurements per URL/device/time
  CONSTRAINT unique_measurement UNIQUE(project_id, url, measurement_date, device_type),
  
  -- Ensure URL is valid format
  CONSTRAINT valid_url_format CHECK (url ~* '^https?://.*'),
  
  -- Ensure measurement date is not in future
  CONSTRAINT valid_measurement_date CHECK (measurement_date <= NOW())
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_core_web_vitals_project_id ON core_web_vitals_history(project_id);
CREATE INDEX IF NOT EXISTS idx_core_web_vitals_url ON core_web_vitals_history(url);
CREATE INDEX IF NOT EXISTS idx_core_web_vitals_measurement_date ON core_web_vitals_history(measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_core_web_vitals_project_url_device ON core_web_vitals_history(project_id, url, device_type);
CREATE INDEX IF NOT EXISTS idx_core_web_vitals_performance_score ON core_web_vitals_history(overall_performance_score DESC);

-- Composite index for trend analysis
CREATE INDEX IF NOT EXISTS idx_core_web_vitals_trends ON core_web_vitals_history(project_id, url, device_type, measurement_date DESC);

-- Enable Row Level Security
ALTER TABLE core_web_vitals_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Core Web Vitals for their team projects" 
  ON core_web_vitals_history FOR SELECT 
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert Core Web Vitals for their team projects"
  ON core_web_vitals_history FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update Core Web Vitals for their team projects"
  ON core_web_vitals_history FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to automatically clean old data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_core_web_vitals()
RETURNS void AS $$
BEGIN
  DELETE FROM core_web_vitals_history 
  WHERE measurement_date < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE core_web_vitals_history IS 'Stores historical Core Web Vitals measurements from Google PageSpeed Insights API';
COMMENT ON COLUMN core_web_vitals_history.lcp_value IS 'Largest Contentful Paint in milliseconds';
COMMENT ON COLUMN core_web_vitals_history.fid_value IS 'First Input Delay in milliseconds';
COMMENT ON COLUMN core_web_vitals_history.cls_value IS 'Cumulative Layout Shift score (0-1+)';
COMMENT ON COLUMN core_web_vitals_history.fcp_value IS 'First Contentful Paint in milliseconds';
COMMENT ON COLUMN core_web_vitals_history.speed_index IS 'Speed Index score';
COMMENT ON COLUMN core_web_vitals_history.lighthouse_data IS 'Complete Lighthouse audit data in JSON format';