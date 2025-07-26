# Required Environment Variables for Vercel Deployment

## Critical Environment Variables

The following environment variables MUST be added to your Vercel project settings:

### Supabase Configuration

```bash
# Public URL (visible to client)
NEXT_PUBLIC_SUPABASE_URL=https://rwyaipbxlvrilagkirsq.supabase.co

# Anonymous key (visible to client)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eWFpcGJ4bHZyaWxhZ2tpcnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NzM5ODUsImV4cCI6MjA2NjI0OTk4NX0.lY4dHfWAEzR87TI0Rvdo5_RyQl_-BKCDA38RslNR0NE

# Service role key (server-side only) - BOTH are required due to codebase inconsistency
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# IMPORTANT: Also add this (same value as above) due to naming inconsistency in codebase
SUPABASE_SECRET_KEY=your_supabase_service_role_key_here

# JWT Secret (for token verification)
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here

# Database URL
DATABASE_URL=your_database_url_here
```

### Email Configuration

```bash
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=info@contentlabtech.com
NEXT_PUBLIC_SUPPORT_EMAIL=info@contentlabtech.com
```

### Authentication

```bash
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://your-vercel-app.vercel.app  # Update with your actual Vercel URL
```

### AI Services

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### External Services

```bash
# Google Analytics
GOOGLE_ANALYTICS_CLIENT_ID=your_google_analytics_client_id_here
GOOGLE_ANALYTICS_CLIENT_SECRET=your_google_analytics_client_secret_here

# Google PageSpeed
GOOGLE_PAGESPEED_API_KEY=your_google_pagespeed_api_key_here

# Bright Data Proxy
BRIGHTDATA_PROXY_HOST=brd.superproxy.io
BRIGHTDATA_PROXY_PORT=33335
BRIGHTDATA_CUSTOMER_ID=hl_60607241
BRIGHTDATA_ZONE=content_lab
BRIGHTDATA_PASSWORD=your_brightdata_password_here
BRIGHTDATA_ENABLED=true
BRIGHTDATA_TIMEOUT=30000
BRIGHTDATA_MAX_RETRIES=3
```

## How to Add to Vercel

1. Go to your Vercel Dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add each variable above
5. Make sure to select the appropriate environments (Production, Preview, Development)
6. Save and redeploy

## Important Notes

⚠️ **CRITICAL**: You MUST add both `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY` with the same value due to naming inconsistency in the codebase.

⚠️ **SECURITY**: Never commit these values to your repository. Always use environment variables.

⚠️ **NEXTAUTH_URL**: Update this to match your actual Vercel deployment URL (e.g., https://your-app.vercel.app)
