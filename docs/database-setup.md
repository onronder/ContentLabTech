# Competitors Table Database Setup

## Overview

This document explains the database setup for the competitors table, including table structure, constraints, indexes, and RLS policies.

## Table Structure

### competitors

Stores competitor information for competitive intelligence tracking.

| Column             | Type         | Description       | Constraints                |
| ------------------ | ------------ | ----------------- | -------------------------- |
| id                 | UUID         | Primary key       | DEFAULT gen_random_uuid()  |
| name               | VARCHAR(255) | Company name      | NOT NULL                   |
| domain             | VARCHAR(255) | Primary domain    | NOT NULL, Format check     |
| website_url        | TEXT         | Full website URL  | NOT NULL, URL format check |
| industry           | VARCHAR(100) | Industry category | NOT NULL                   |
| description        | TEXT         | Optional notes    | -                          |
| team_id            | UUID         | Team reference    | NOT NULL, FK to teams      |
| created_by         | UUID         | Creator user      | NOT NULL, FK to auth.users |
| created_at         | TIMESTAMP    | Creation time     | DEFAULT NOW()              |
| updated_at         | TIMESTAMP    | Last update       | DEFAULT NOW()              |
| monitoring_enabled | BOOLEAN      | Monitoring flag   | DEFAULT false              |

## Constraints

### 1. Unique Domain per Team

```sql
CONSTRAINT competitors_unique_domain_per_team UNIQUE (team_id, domain)
```

- Each team can only have one entry per domain
- Different teams can track the same competitor

### 2. Domain Format Validation

```sql
CONSTRAINT competitors_domain_format CHECK (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$')
```

- Must be a valid domain format (e.g., example.com)
- No protocol or path allowed

### 3. URL Format Validation

```sql
CONSTRAINT competitors_url_format CHECK (website_url ~ '^https?://.*$')
```

- Must start with http:// or https://

## Indexes

Performance indexes are created for:

- `team_id` - Fast team filtering
- `created_by` - User's competitors lookup
- `industry` - Industry filtering
- `domain` - Domain lookups
- `created_at DESC` - Recent competitors

## Row Level Security (RLS)

### Policies

1. **SELECT** - View competitors from your team

   ```sql
   team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
   ```

2. **INSERT** - Add competitors to your team

   ```sql
   team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
   AND created_by = auth.uid()
   ```

3. **UPDATE** - Modify competitors from your team

   ```sql
   team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active')
   ```

4. **DELETE** - Remove competitors (admin/owner only)
   ```sql
   team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'owner'))
   ```

## Setup Instructions

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `/supabase/migrations/20240101000000_create_competitors_table.sql`
4. Execute the SQL

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd /path/to/contentlab-nexus

# Run the migration
supabase db push
```

### Option 3: Direct SQL Execution

```sql
-- Execute the setup function from /src/lib/database-setup.sql
SELECT create_competitors_table();
```

## Helper Functions

### 1. get_competitor_stats(team_id)

Returns statistics for a team's competitors:

- Total competitor count
- Number of unique industries
- Latest competitor name and date

### 2. check_competitor_domain_unique(team_id, domain, exclude_id)

Checks if a domain is unique within a team (case-insensitive).

## Verification

After setup, verify the table was created correctly:

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'competitors'
);

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'competitors';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'competitors';

-- Test insert (replace with your actual team_id)
INSERT INTO competitors (name, domain, website_url, industry, team_id, created_by)
VALUES ('Test Company', 'test.com', 'https://test.com', 'Technology', 'your-team-id', auth.uid());
```

## Troubleshooting

### Common Issues

1. **Table already exists error**
   - The migration is idempotent and uses `CREATE TABLE IF NOT EXISTS`
   - Safe to run multiple times

2. **Foreign key constraint error**
   - Ensure `teams` table exists
   - Ensure you have a valid team_id

3. **RLS policy blocking access**
   - Verify user is an active team member
   - Check team_members status is 'active'

4. **Domain format validation failing**
   - Ensure domain is in format: example.com
   - No http://, www., or paths

## Integration with API

The competitors API endpoint (`/api/competitive/competitors`) automatically:

- Validates all fields
- Resolves team_id from user's membership
- Handles RLS policies
- Returns detailed error messages

See `/test-competitors-api.md` for API testing guide.
