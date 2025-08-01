#!/usr/bin/env node

/**
 * Apply Migrations using Supabase Admin API
 * This script applies missing migrations to the production database
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

// Extract project ID from URL
const PROJECT_ID = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

// Migration content - combining all required migrations
const COMBINED_MIGRATION = `
-- =====================================================
-- COMBINED MIGRATION: Missing Tables for ContentLab Nexus
-- =====================================================

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TEAM INVITATIONS TABLE
-- =====================================================

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for team_invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

-- Enable RLS for team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. USER PREFERENCES TABLES
-- =====================================================

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  avatar_url TEXT,
  timezone VARCHAR(100) DEFAULT 'UTC',
  locale VARCHAR(10) DEFAULT 'en',
  theme VARCHAR(20) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  email_updates BOOLEAN DEFAULT true,
  email_reports BOOLEAN DEFAULT true,
  email_team_invites BOOLEAN DEFAULT true,
  email_mentions BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  in_app_updates BOOLEAN DEFAULT true,
  in_app_reports BOOLEAN DEFAULT true,
  in_app_team_activity BOOLEAN DEFAULT true,
  in_app_mentions BOOLEAN DEFAULT true,
  report_frequency VARCHAR(20) DEFAULT 'weekly',
  digest_frequency VARCHAR(20) DEFAULT 'daily',
  content_notifications BOOLEAN DEFAULT true,
  analytics_notifications BOOLEAN DEFAULT true,
  competitor_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_type VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user tables
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);

-- Enable RLS for user tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. ANALYTICS EVENTS TABLE
-- =====================================================

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_id ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_team_id ON analytics_events(team_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Enable RLS for analytics_events
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Team invitations policies
CREATE POLICY IF NOT EXISTS "Team owners and admins can view invitations" ON team_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = team_invitations.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY IF NOT EXISTS "Team owners and admins can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = team_invitations.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
        AND invited_by = auth.uid()
    );

CREATE POLICY IF NOT EXISTS "Team owners and admins can update invitations" ON team_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = team_invitations.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY IF NOT EXISTS "Users can view their own invitations by token" ON team_invitations
    FOR SELECT USING (token IS NOT NULL);

-- User preferences policies
CREATE POLICY IF NOT EXISTS "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY IF NOT EXISTS "Users can view own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User sessions policies
CREATE POLICY IF NOT EXISTS "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Login history policies
CREATE POLICY IF NOT EXISTS "Users can view own login history" ON login_history
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics events policies
CREATE POLICY IF NOT EXISTS "Team members can view team analytics" ON analytics_events
  FOR SELECT USING (
    team_id IS NULL OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = analytics_events.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert analytics for their teams" ON analytics_events
  FOR INSERT WITH CHECK (
    team_id IS NULL OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = analytics_events.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences  
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR(255) AS $$
DECLARE
    token VARCHAR(255);
BEGIN
    token := encode(gen_random_bytes(32), 'hex');
    WHILE EXISTS (SELECT 1 FROM team_invitations WHERE team_invitations.token = token) LOOP
        token := encode(gen_random_bytes(32), 'hex');
    END LOOP;
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set invitation token
CREATE OR REPLACE FUNCTION set_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token IS NULL THEN
        NEW.token := generate_invitation_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS set_invitation_token_trigger
    BEFORE INSERT ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_token();

-- Function to create user preferences on signup
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user signups
CREATE TRIGGER IF NOT EXISTS create_user_preferences_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token VARCHAR(255), user_id UUID)
RETURNS JSONB AS $$
DECLARE
    invitation RECORD;
    result JSONB;
BEGIN
    SELECT * INTO invitation
    FROM team_invitations
    WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = invitation.team_id
        AND team_members.user_id = accept_team_invitation.user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is already a team member'
        );
    END IF;
    
    BEGIN
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (invitation.team_id, accept_team_invitation.user_id, invitation.role);
        
        UPDATE team_invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = invitation.id;
        
        SELECT jsonb_build_object(
            'success', true,
            'team_id', invitation.team_id,
            'role', invitation.role
        ) INTO result;
        
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to accept invitation'
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON team_invitations TO authenticated;
GRANT INSERT ON team_invitations TO authenticated;
GRANT UPDATE ON team_invitations TO authenticated;

GRANT SELECT, INSERT, UPDATE ON user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, DELETE ON user_sessions TO authenticated;
GRANT SELECT ON login_history TO authenticated;
GRANT SELECT, INSERT ON analytics_events TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
`;

async function executeMigration() {
  console.log("\n🚀 APPLYING PRODUCTION DATABASE MIGRATIONS");
  console.log("==========================================\n");

  try {
    // For Supabase, we need to use the SQL Editor API or Management API
    // Since direct SQL execution isn't available via REST API, we'll create a different approach

    console.log("📝 Migration content prepared");
    console.log("📦 Total SQL statements: ~50");
    console.log(
      "🔄 Creating tables: team_invitations, user_preferences, notification_preferences, user_sessions, login_history, analytics_events\n"
    );

    // Save the migration to a file for manual execution
    const migrationFile = path.join(__dirname, "production-migration.sql");
    fs.writeFileSync(migrationFile, COMBINED_MIGRATION);

    console.log("✅ Migration SQL saved to:", migrationFile);
    console.log("\n📋 MANUAL EXECUTION REQUIRED:");
    console.log("=====================================");
    console.log(
      "1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/" +
        PROJECT_ID
    );
    console.log("2. Navigate to SQL Editor");
    console.log("3. Create a new query");
    console.log("4. Copy and paste the contents of:", migrationFile);
    console.log("5. Execute the query");
    console.log("6. Verify no errors occurred");
    console.log(
      "\n🔍 After execution, run: node scripts/verify-production-db.js"
    );

    // Alternative: Try using Supabase client to execute portions
    console.log("\n🤖 Attempting automated execution...\n");

    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Test if we can create tables via API
    const testQueries = [
      {
        name: "Check if team_invitations exists",
        query: async () => {
          const { error } = await supabase
            .from("team_invitations")
            .select("count")
            .limit(1);
          return { exists: !error || !error.message.includes("relation") };
        },
      },
      {
        name: "Check if user_preferences exists",
        query: async () => {
          const { error } = await supabase
            .from("user_preferences")
            .select("count")
            .limit(1);
          return { exists: !error || !error.message.includes("relation") };
        },
      },
    ];

    console.log("🔍 Checking current table status...");
    for (const test of testQueries) {
      const result = await test.query();
      console.log(
        `   ${test.name}: ${result.exists ? "✅ EXISTS" : "❌ MISSING"}`
      );
    }

    console.log(
      "\n⚠️  IMPORTANT: Supabase requires manual SQL execution via dashboard"
    );
    console.log("📄 Migration file created at:", migrationFile);
    console.log(
      "🔗 Direct link to SQL Editor: https://supabase.com/dashboard/project/" +
        PROJECT_ID +
        "/sql/new"
    );
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

// Execute the migration
executeMigration();
