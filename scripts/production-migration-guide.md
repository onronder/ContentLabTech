# Production Database Migration Guide

## Overview

The database verification revealed that several tables are missing from the production database. This guide provides step-by-step instructions to apply the required migrations.

## Missing Tables

Based on the verification results, the following tables need to be created:

- ✅ `teams` - EXISTS
- ✅ `team_members` - EXISTS
- ✅ `projects` - EXISTS
- ✅ `content_items` - EXISTS
- ❌ `team_invitations` - MISSING
- ❌ `user_preferences` - MISSING
- ❌ `notification_preferences` - MISSING
- ❌ `user_sessions` - MISSING
- ❌ `login_history` - MISSING
- ❌ `analytics_events` - MISSING

## Migration Options

### Option 1: Supabase Dashboard (Recommended)

1. **Login to Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project: `contentlab-nexus`

2. **Navigate to SQL Editor**
   - Go to the SQL Editor tab
   - Create a new query

3. **Apply Migration 1: Team Invitations**

   ```sql
   -- Copy and paste the contents of:
   -- supabase/migrations/20250112000001_team_invitations.sql
   ```

4. **Apply Migration 2: User Preferences**

   ```sql
   -- Copy and paste the contents of:
   -- supabase/migrations/20250114000001_user_preferences.sql
   ```

5. **Apply Migration 3: Analytics Events**

   ```sql
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

   -- Create indexes
   CREATE INDEX IF NOT EXISTS idx_analytics_events_project_id ON analytics_events(project_id);
   CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
   CREATE INDEX IF NOT EXISTS idx_analytics_events_team_id ON analytics_events(team_id);
   CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
   CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
   CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

   -- Enable RLS
   ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

   -- RLS Policies
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
   ```

### Option 2: Supabase CLI (Advanced)

1. **Install Supabase CLI**

   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**

   ```bash
   supabase login
   ```

3. **Link to Project**

   ```bash
   supabase link --project-ref rwyaipbxlvrilagkirsq
   ```

4. **Push Migrations**
   ```bash
   supabase db push
   ```

### Option 3: Manual SQL Execution

If you have direct database access, you can execute the SQL files directly:

1. **Connect to Database**

   ```bash
   psql "postgresql://postgres:[password]@db.rwyaipbxlvrilagkirsq.supabase.co:5432/postgres"
   ```

2. **Execute Migration Files**
   ```bash
   \i supabase/migrations/20250112000001_team_invitations.sql
   \i supabase/migrations/20250114000001_user_preferences.sql
   ```

## Verification

After applying the migrations, run the verification script to confirm all tables are present:

```bash
node scripts/verify-production-db.js
```

Expected output:

```
✅ All required tables exist
✅ RLS policies are active
✅ Database verification passed successfully!
```

## Post-Migration Steps

1. **Test Database Health Endpoint**

   ```bash
   curl https://your-app.vercel.app/api/health/database
   ```

2. **Verify Settings Page Functionality**
   - Login to your application
   - Navigate to Settings page
   - Test all tabs: Profile, Notifications, Security, Team

3. **Check Team Invitations**
   - Test sending team invitations
   - Verify invitation acceptance flow

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure you're using the service role key, not the anon key
   - Check that RLS policies are configured correctly

2. **Missing Dependencies**
   - Ensure all required extensions are installed
   - Check that enum types are created before tables

3. **Foreign Key Constraints**
   - Apply migrations in the correct order
   - Ensure referenced tables exist before creating foreign keys

### Getting Help

If you encounter issues:

1. Check the Supabase dashboard logs
2. Review the migration files for syntax errors
3. Verify your database connection settings
4. Contact support if needed

## Security Considerations

- Always backup your database before applying migrations
- Test migrations in a staging environment first
- Monitor application logs after deployment
- Verify that RLS policies are working correctly

## Files Referenced

- `supabase/migrations/20250112000001_team_invitations.sql`
- `supabase/migrations/20250114000001_user_preferences.sql`
- `scripts/verify-production-db.js`
- `scripts/database-verification.sql`
