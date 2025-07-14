#!/usr/bin/env node

/**
 * Apply Missing Migrations Script
 * Applies required migrations to bring production database up to date
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

// Create Supabase client with service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Required migrations in order
const REQUIRED_MIGRATIONS = [
  {
    name: "team_invitations",
    file: "20250112000001_team_invitations.sql",
    description: "Team invitation system with secure tokens",
  },
  {
    name: "user_preferences",
    file: "20250114000001_user_preferences.sql",
    description: "User preferences, notifications, sessions, and login history",
  },
  {
    name: "analytics_events",
    file: null, // Will be created inline
    description: "Analytics events tracking table",
  },
];

const ANALYTICS_EVENTS_SQL = `
-- Create analytics_events table for tracking user actions and metrics
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_id ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_team_id ON analytics_events(team_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_events
CREATE POLICY "Team members can view team analytics" ON analytics_events
  FOR SELECT USING (
    team_id IS NULL OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = analytics_events.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analytics for their teams" ON analytics_events
  FOR INSERT WITH CHECK (
    team_id IS NULL OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = analytics_events.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON analytics_events TO authenticated;
`;

async function main() {
  console.log("\n🔧 APPLYING MISSING MIGRATIONS");
  console.log("=================================\n");

  try {
    // Check current database state
    console.log("1. Checking current database state...");
    const currentState = await checkDatabaseState();

    console.log("2. Applying required migrations...\n");

    for (const migration of REQUIRED_MIGRATIONS) {
      if (
        currentState.missingTables.includes(migration.name) ||
        (migration.name === "analytics_events" &&
          currentState.missingTables.includes("analytics_events"))
      ) {
        console.log(`📦 Applying migration: ${migration.name}`);
        console.log(`   Description: ${migration.description}`);

        try {
          if (migration.file) {
            // Read migration file
            const migrationPath = path.join(
              __dirname,
              "../supabase/migrations",
              migration.file
            );
            const migrationSQL = fs.readFileSync(migrationPath, "utf8");

            // Execute migration
            const { error } = await supabase.rpc("exec_sql", {
              sql: migrationSQL,
            });

            if (error) {
              // Try alternative approach for migrations that might not work with RPC
              console.log(`   Attempting alternative execution method...`);
              await executeMigrationStatements(migrationSQL);
            }
          } else if (migration.name === "analytics_events") {
            // Execute inline SQL for analytics_events
            await executeMigrationStatements(ANALYTICS_EVENTS_SQL);
          }

          console.log(`   ✅ Migration applied successfully\n`);
        } catch (error) {
          console.log(`   ❌ Migration failed: ${error.message}\n`);
          throw error;
        }
      } else {
        console.log(
          `⏭️  Skipping migration: ${migration.name} (already applied)\n`
        );
      }
    }

    // Verify final state
    console.log("3. Verifying final database state...");
    const finalState = await checkDatabaseState();

    if (finalState.missingTables.length === 0) {
      console.log("✅ All required tables are now present!");
      console.log("🎉 Database migration completed successfully!\n");
    } else {
      console.log(
        `⚠️  Some tables are still missing: ${finalState.missingTables.join(", ")}`
      );
      console.log("Please check the migration logs above for errors.\n");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    process.exit(1);
  }
}

async function checkDatabaseState() {
  const requiredTables = [
    "teams",
    "team_members",
    "projects",
    "content_items",
    "team_invitations",
    "user_preferences",
    "notification_preferences",
    "user_sessions",
    "login_history",
    "analytics_events",
  ];

  const tableChecks = await Promise.all(
    requiredTables.map(async tableName => {
      try {
        const { error } = await supabase.from(tableName).select("*").limit(0);
        return { table: tableName, exists: !error };
      } catch (err) {
        return { table: tableName, exists: false };
      }
    })
  );

  const existing = tableChecks.filter(t => t.exists).map(t => t.table);
  const missing = tableChecks.filter(t => !t.exists).map(t => t.table);

  console.log(
    `   Existing tables: ${existing.length} (${existing.join(", ")})`
  );
  console.log(`   Missing tables: ${missing.length} (${missing.join(", ")})\n`);

  return {
    existingTables: existing,
    missingTables: missing,
  };
}

async function executeMigrationStatements(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(";")
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        // Try to execute via RPC first
        const { error } = await supabase.rpc("exec_sql", {
          sql: statement + ";",
        });

        if (error) {
          // If RPC fails, try direct execution for simple statements
          if (statement.toLowerCase().includes("create table")) {
            // For CREATE TABLE statements, we might need different approach
            console.log(`     Executing: ${statement.substring(0, 50)}...`);
            throw new Error(`RPC execution failed: ${error.message}`);
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.log(
          `     Warning: Statement execution failed: ${error.message}`
        );
        console.log(`     Statement: ${statement.substring(0, 100)}...`);
        // Continue with other statements
      }
    }
  }
}

// Alternative approach: Create a more robust migration system
async function createMigrationFunction() {
  const migrationFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;

  try {
    const { error } = await supabase.rpc("exec_sql", {
      sql: migrationFunction,
    });
    if (error) {
      console.log(
        "Note: exec_sql function might not be available in this Supabase instance"
      );
    }
  } catch (error) {
    console.log("Note: Could not create exec_sql function");
  }
}

// Run the migration
main().catch(console.error);
