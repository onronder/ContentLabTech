#!/bin/bash

# Fix Supabase Security Issues Script
# This script applies the security fixes to your Supabase database

set -e

echo "🔒 Starting Supabase Security Fixes..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed. Please install it first:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Not in Supabase project directory. Please run from project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Security issues to fix:${NC}"
echo "1. Remove SECURITY DEFINER from index_usage_stats view"
echo "2. Enable RLS on audit_logs table"
echo "3. Create appropriate RLS policies for audit_logs"
echo ""

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20250716_fix_security_issues.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Applying security fixes...${NC}"

# Apply the migration
if supabase db push; then
    echo -e "${GREEN}✅ Security fixes applied successfully!${NC}"
else
    echo -e "${RED}❌ Failed to apply security fixes${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Security fixes completed!${NC}"
echo ""
echo -e "${YELLOW}📝 What was fixed:${NC}"
echo "✅ Removed SECURITY DEFINER from index_usage_stats view"
echo "✅ Enabled RLS on audit_logs table"
echo "✅ Created RLS policies for audit_logs table"
echo "✅ Added performance indexes for RLS policies"
echo ""
echo -e "${YELLOW}🧪 To verify the fixes:${NC}"
echo "1. Check Supabase dashboard → Database → Database Linter"
echo "2. The two security errors should now be resolved"
echo ""
echo -e "${GREEN}🔒 Your database is now more secure!${NC}"