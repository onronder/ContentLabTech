-- Add processing jobs table for background task management
-- This table tracks all analytical processing jobs and their status

CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN (
    'content-analysis',
    'seo-health-check', 
    'performance-analysis',
    'competitive-intelligence',
    'industry-benchmarking',
    'project-health-scoring'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing', 
    'completed',
    'failed',
    'cancelled',
    'retrying'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN (
    'critical',
    'high',
    'normal', 
    'low'
  )),
  
  -- Foreign key relationships
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Job data and configuration
  data JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  
  -- Retry and progress tracking
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_completion_status CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  ),
  CONSTRAINT valid_failure_status CHECK (
    (status = 'failed' AND failed_at IS NOT NULL AND error IS NOT NULL) OR
    (status != 'failed')
  )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON processing_jobs(type);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_team_id ON processing_jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_priority_created ON processing_jobs(priority, created_at);

-- Composite index for queue processing
CREATE INDEX IF NOT EXISTS idx_processing_jobs_queue ON processing_jobs(status, priority, created_at) 
WHERE status IN ('pending', 'retrying');

-- RLS policies
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see jobs for their teams
CREATE POLICY "Users can view team processing jobs" 
  ON processing_jobs FOR SELECT 
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only create jobs for their teams  
CREATE POLICY "Users can create team processing jobs"
  ON processing_jobs FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid()
    ) AND
    user_id = auth.uid()
  );

-- Users can only update jobs they created or have admin access
CREATE POLICY "Users can update their team processing jobs"
  ON processing_jobs FOR UPDATE
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Add analytical results storage tables that reference processing jobs

-- Content analysis results
CREATE TABLE IF NOT EXISTS content_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Content quality scores
  overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  technical_seo DECIMAL(5,2) NOT NULL CHECK (technical_seo >= 0 AND technical_seo <= 100),
  content_depth DECIMAL(5,2) NOT NULL CHECK (content_depth >= 0 AND content_depth <= 100),
  readability DECIMAL(5,2) NOT NULL CHECK (readability >= 0 AND readability <= 100),
  semantic_relevance DECIMAL(5,2) NOT NULL CHECK (semantic_relevance >= 0 AND semantic_relevance <= 100),
  
  -- Detailed analysis data
  recommendations JSONB NOT NULL DEFAULT '[]',
  content_gaps JSONB NOT NULL DEFAULT '[]',
  improvement_timeline TEXT,
  competitor_comparison JSONB,
  
  -- Metadata
  analysis_depth TEXT NOT NULL CHECK (analysis_depth IN ('basic', 'comprehensive')),
  pages_analyzed INTEGER NOT NULL DEFAULT 0,
  content_volume INTEGER NOT NULL DEFAULT 0, -- word count
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEO health results  
CREATE TABLE IF NOT EXISTS seo_health_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- SEO health scores
  overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  technical DECIMAL(5,2) NOT NULL CHECK (technical >= 0 AND technical <= 100),
  on_page DECIMAL(5,2) NOT NULL CHECK (on_page >= 0 AND on_page <= 100),
  performance DECIMAL(5,2) NOT NULL CHECK (performance >= 0 AND performance <= 100),
  mobile DECIMAL(5,2) NOT NULL CHECK (mobile >= 0 AND mobile <= 100),
  
  -- Issue tracking
  critical_issues JSONB NOT NULL DEFAULT '[]',
  warnings JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  
  -- Competitor comparison
  competitor_comparison JSONB,
  industry_benchmark JSONB,
  
  -- Technical details
  pages_crawled INTEGER NOT NULL DEFAULT 0,
  issues_found INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance analysis results
CREATE TABLE IF NOT EXISTS performance_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Performance scores
  overall_score DECIMAL(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  speed_index DECIMAL(10,2) NOT NULL DEFAULT 0,
  first_contentful_paint DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Core Web Vitals
  largest_contentful_paint DECIMAL(10,2) NOT NULL DEFAULT 0,
  first_input_delay DECIMAL(10,2) NOT NULL DEFAULT 0,
  cumulative_layout_shift DECIMAL(6,3) NOT NULL DEFAULT 0,
  
  -- Recommendations and improvements
  recommendations JSONB NOT NULL DEFAULT '[]',
  device_comparison JSONB NOT NULL DEFAULT '[]',
  performance_opportunities JSONB NOT NULL DEFAULT '[]',
  
  -- Analysis metadata
  pages_tested INTEGER NOT NULL DEFAULT 0,
  test_locations JSONB NOT NULL DEFAULT '[]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Competitive intelligence results
CREATE TABLE IF NOT EXISTS competitive_intelligence_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Market position
  market_position DECIMAL(5,2) NOT NULL CHECK (market_position >= 0 AND market_position <= 100),
  competitive_score DECIMAL(5,2) NOT NULL CHECK (competitive_score >= 0 AND competitive_score <= 100),
  
  -- Analysis results
  competitive_gaps JSONB NOT NULL DEFAULT '[]',
  opportunities JSONB NOT NULL DEFAULT '[]',
  threats JSONB NOT NULL DEFAULT '[]',
  strategic_recommendations JSONB NOT NULL DEFAULT '[]',
  competitor_analysis JSONB NOT NULL DEFAULT '[]',
  
  -- Analysis scope
  competitors_analyzed INTEGER NOT NULL DEFAULT 0,
  keywords_analyzed INTEGER NOT NULL DEFAULT 0,
  analysis_scope TEXT NOT NULL CHECK (analysis_scope IN ('content', 'technical', 'comprehensive')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Industry benchmarking results
CREATE TABLE IF NOT EXISTS industry_benchmark_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Benchmark positioning
  industry_percentile DECIMAL(5,2) NOT NULL CHECK (industry_percentile >= 0 AND industry_percentile <= 100),
  performance_rank INTEGER NOT NULL DEFAULT 0,
  total_industry_sample INTEGER NOT NULL DEFAULT 0,
  
  -- Benchmark data
  benchmark_scores JSONB NOT NULL DEFAULT '[]',
  industry_trends JSONB NOT NULL DEFAULT '[]',
  improvement_opportunities JSONB NOT NULL DEFAULT '[]',
  
  -- Industry classification
  industry TEXT NOT NULL,
  business_type TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'global',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project health scoring results
CREATE TABLE IF NOT EXISTS project_health_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Health scores
  overall_health DECIMAL(5,2) NOT NULL CHECK (overall_health >= 0 AND overall_health <= 100),
  progress_velocity DECIMAL(5,2) NOT NULL CHECK (progress_velocity >= 0 AND progress_velocity <= 100),
  implementation_quality DECIMAL(5,2) NOT NULL CHECK (implementation_quality >= 0 AND implementation_quality <= 100),
  market_adaptation DECIMAL(5,2) NOT NULL CHECK (market_adaptation >= 0 AND market_adaptation <= 100),
  success_prediction DECIMAL(5,2) NOT NULL CHECK (success_prediction >= 0 AND success_prediction <= 100),
  
  -- Risk and progress analysis
  risk_factors JSONB NOT NULL DEFAULT '[]',
  milestone_progress JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  
  -- Prediction metadata
  prediction_confidence DECIMAL(5,2) NOT NULL DEFAULT 0,
  data_completeness DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for result tables
CREATE INDEX IF NOT EXISTS idx_content_analysis_results_job_id ON content_analysis_results(job_id);
CREATE INDEX IF NOT EXISTS idx_content_analysis_results_project_id ON content_analysis_results(project_id);

CREATE INDEX IF NOT EXISTS idx_seo_health_results_job_id ON seo_health_results(job_id);
CREATE INDEX IF NOT EXISTS idx_seo_health_results_project_id ON seo_health_results(project_id);

CREATE INDEX IF NOT EXISTS idx_performance_analysis_results_job_id ON performance_analysis_results(job_id);
CREATE INDEX IF NOT EXISTS idx_performance_analysis_results_project_id ON performance_analysis_results(project_id);

CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_results_job_id ON competitive_intelligence_results(job_id);
CREATE INDEX IF NOT EXISTS idx_competitive_intelligence_results_project_id ON competitive_intelligence_results(project_id);

CREATE INDEX IF NOT EXISTS idx_industry_benchmark_results_job_id ON industry_benchmark_results(job_id);
CREATE INDEX IF NOT EXISTS idx_industry_benchmark_results_project_id ON industry_benchmark_results(project_id);

CREATE INDEX IF NOT EXISTS idx_project_health_results_job_id ON project_health_results(job_id);
CREATE INDEX IF NOT EXISTS idx_project_health_results_project_id ON project_health_results(project_id);

-- Enable RLS on result tables
ALTER TABLE content_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_health_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_intelligence_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_benchmark_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_health_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for result tables (users can only see results for their team projects)
DO $$
BEGIN
  -- Content analysis results
  CREATE POLICY "Users can view team content analysis results" 
    ON content_analysis_results FOR SELECT 
    USING (
      project_id IN (
        SELECT id FROM projects WHERE team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    );

  -- SEO health results  
  CREATE POLICY "Users can view team seo health results"
    ON seo_health_results FOR SELECT
    USING (
      project_id IN (
        SELECT id FROM projects WHERE team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    );

  -- Performance analysis results
  CREATE POLICY "Users can view team performance results"
    ON performance_analysis_results FOR SELECT
    USING (
      project_id IN (
        SELECT id FROM projects WHERE team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    );

  -- Competitive intelligence results
  CREATE POLICY "Users can view team competitive results"
    ON competitive_intelligence_results FOR SELECT
    USING (
      project_id IN (
        SELECT id FROM projects WHERE team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    );

  -- Industry benchmark results
  CREATE POLICY "Users can view team benchmark results"
    ON industry_benchmark_results FOR SELECT
    USING (
      project_id IN (
        SELECT id FROM projects WHERE team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    );

  -- Project health results
  CREATE POLICY "Users can view team project health results"
    ON project_health_results FOR SELECT
    USING (
      project_id IN (
        SELECT id FROM projects WHERE team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        )
      )
    );

END $$;

-- Add updated_at trigger for all result tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_analysis_results_updated_at 
  BEFORE UPDATE ON content_analysis_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_health_results_updated_at 
  BEFORE UPDATE ON seo_health_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_analysis_results_updated_at 
  BEFORE UPDATE ON performance_analysis_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitive_intelligence_results_updated_at 
  BEFORE UPDATE ON competitive_intelligence_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_benchmark_results_updated_at 
  BEFORE UPDATE ON industry_benchmark_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_health_results_updated_at 
  BEFORE UPDATE ON project_health_results 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();