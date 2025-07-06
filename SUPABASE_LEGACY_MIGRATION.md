# Supabase Legacy Key Migration Guide

**Date**: July 6, 2025  
**Status**: Migration back to legacy keys completed  
**Reason**: New API key system early adoption instability

## Overview

ContentLab Nexus has been successfully migrated back to Supabase legacy JWT keys due to authentication instability experienced with the new API key system. This migration ensures stable authentication functionality while the new system matures.

## What Changed

### Environment Variables (CRITICAL - REQUIRES USER ACTION)

**Before (New Keys - Problematic):**

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

**After (Legacy Keys - Stable):**

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Code Changes Made

#### 1. Supabase Client (`src/lib/supabase/client.ts`)

- Updated to use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Added legacy JWT format validation

#### 2. Server Configuration (`src/lib/supabase/server.ts`)

- Updated to use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SECRET_KEY`
- Added legacy JWT format validation (`eyJ` prefix check)

#### 3. Edge Functions (`supabase/functions/auth-webhook/index.ts`)

- Fixed Authorization header usage: `Authorization: Bearer ${key}` → `apikey: ${key}`
- This fixes a breaking change that affects the new API key system

#### 4. Validation (`src/lib/supabase/validation.ts`)

- Added legacy key validation functions
- Updated environment configuration validation to support both formats
- Enhanced configuration status reporting

## User Action Required

### 1. Get Legacy Keys from Supabase Dashboard

1. Go to your Supabase dashboard: https://app.supabase.com/project/rwyaipbxlvrilagkirsq
2. Navigate to **Settings** → **API**
3. Copy these keys:
   - **anon/public** key (starts with `eyJhbGciOiJIUzI1NiI...`)
   - **service_role** key (starts with `eyJhbGciOiJIUzI1NiI...`)

### 2. Update Environment Variables

Replace your `.env.local` file with the legacy format:

```bash
# Supabase Configuration (LEGACY JWT FORMAT - STABLE)
NEXT_PUBLIC_SUPABASE_URL=https://rwyaipbxlvrilagkirsq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_LEGACY_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_LEGACY_SERVICE_ROLE_KEY_HERE

# Remove these new format keys:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# SUPABASE_SECRET_KEY=sb_secret_...
```

### 3. Restart Development Server

```bash
npm run dev
```

## Verification Steps

After updating the environment variables:

1. **Check Configuration Status**:

   ```bash
   curl http://localhost:3000/api/test-auth
   ```

   Should return: `"config":{"hasUrl":true,"hasKey":true,"urlValid":true,"keyValid":true}`

2. **Test Authentication**:
   - Navigate to `/auth/signin`
   - Try creating a new account
   - Verify login functionality works

3. **Verify Console Logs**:
   - Check browser console for authentication success logs
   - No JWT validation errors should appear

## Benefits of Legacy Keys

1. **Stability**: Proven track record in production environments
2. **Compatibility**: No breaking changes with existing authentication patterns
3. **Reliability**: Well-tested across different browser environments
4. **Time**: Allows new API key system to mature before migration

## Future Migration Plan

### Timeline

- **Q4 2025**: Monitor new API key system stability
- **Q1 2026**: Test migration in development environment
- **Q2 2026**: Plan production migration
- **Late 2026**: Complete migration before legacy key removal

### Migration Triggers

We will migrate back to new keys when:

1. New API key system reaches stable release status
2. Breaking changes are resolved and documented
3. Community reports indicate stable adoption
4. Comprehensive migration guides are available

## Troubleshooting

### Common Issues

#### Issue: "Invalid JWT" errors

**Solution**: Ensure you copied the complete legacy key from Supabase dashboard

#### Issue: "Missing environment variables"

**Solution**: Verify `.env.local` contains `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `PUBLISHABLE_KEY`)

#### Issue: Edge Functions not working

**Solution**: Redeploy Edge Functions after environment variable changes

#### Issue: Authentication still failing

**Solution**: Clear browser storage and restart development server

### Debug Commands

```bash
# Check environment variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20))"

# Verify key format
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY | grep -o "^eyJ"

# Test Supabase connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "https://rwyaipbxlvrilagkirsq.supabase.co/rest/v1/"
```

## Backup Files

The following backup files have been created:

- `.env.local.backup-new-keys` - Original new API key configuration
- `.env.local.template-legacy` - Template for legacy key configuration

## Summary

This migration restores authentication stability by reverting to proven legacy Supabase JWT keys. All code changes maintain compatibility with the legacy key format while preparing for a future migration when the new API key system stabilizes.

The authentication architecture improvements remain in place, ensuring that when we do migrate to new keys in the future, the authentication flow will be robust and reliable.
