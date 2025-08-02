-- Apply Critical Missing Tables
-- Add only the essential missing functionality without policy conflicts

-- 1. AI Enhancement Tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_status') THEN
        CREATE TYPE workflow_status AS ENUM ('pending', 'in_review', 'approved', 'rejected', 'implemented');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_model') THEN
        CREATE TYPE ai_model AS ENUM ('gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro');
    END IF;
END $$;

-- AI analysis configurations table
CREATE TABLE IF NOT EXISTS ai_analysis_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    analysis_type analysis_type NOT NULL,
    ai_model ai_model DEFAULT 'gpt-4',
    config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing Jobs System
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
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  progress_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Core Web Vitals History
CREATE TABLE IF NOT EXISTS core_web_vitals_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    largest_contentful_paint DECIMAL(10,2),
    first_input_delay DECIMAL(10,2),
    cumulative_layout_shift DECIMAL(6,3),
    first_contentful_paint DECIMAL(10,2),
    speed_index DECIMAL(10,2),
    performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
    device_type VARCHAR(20) DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile')),
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential Missing Tables for Edge Functions
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  target_resource TEXT,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'failed', 'rate_limited', 'bounced', 'delivered')),
  recipient_email TEXT NOT NULL,
  subject TEXT,
  template_id TEXT,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

-- Add missing RPC function for Edge Functions
CREATE OR REPLACE FUNCTION has_team_access(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_uuid 
    AND user_id = user_uuid
  );
END;
$$;

-- Add essential indexes
CREATE INDEX IF NOT EXISTS idx_ai_analysis_configs_project_id ON ai_analysis_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_core_web_vitals_project_id ON core_web_vitals_history(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_email_logs_event_type ON email_logs(event_type);

-- Enable RLS on new tables
ALTER TABLE ai_analysis_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_web_vitals_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for new tables
DO $$
BEGIN
    -- AI analysis configs
    DROP POLICY IF EXISTS "Users can view team ai configs" ON ai_analysis_configs;
    CREATE POLICY "Users can view team ai configs" ON ai_analysis_configs
        FOR SELECT USING (
            project_id IN (
                SELECT id FROM projects p
                JOIN team_members tm ON p.team_id = tm.team_id
                WHERE tm.user_id = auth.uid()
            )
        );

    -- Processing jobs
    DROP POLICY IF EXISTS "Users can view team processing jobs" ON processing_jobs;
    CREATE POLICY "Users can view team processing jobs" ON processing_jobs
        FOR SELECT USING (
            team_id IN (
                SELECT team_id FROM team_members WHERE user_id = auth.uid()
            )
        );

    -- Core web vitals
    DROP POLICY IF EXISTS "Users can view team web vitals" ON core_web_vitals_history;
    CREATE POLICY "Users can view team web vitals" ON core_web_vitals_history
        FOR SELECT USING (
            project_id IN (
                SELECT id FROM projects p
                JOIN team_members tm ON p.team_id = tm.team_id
                WHERE tm.user_id = auth.uid()
            )
        );

EXCEPTION WHEN OTHERS THEN
    -- Ignore policy errors, they may already exist
    NULL;
END $$;