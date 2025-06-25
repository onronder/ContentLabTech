# Environment Variables Setup Guide

This guide explains exactly WHERE to create each environment variable and HOW to get the values.

## WHERE to Add Environment Variables

### For Vercel Deployment (Production)

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project: `contentlab-nexus`
3. Go to **Settings** → **Environment Variables**
4. Click **Add** for each variable below

### For Local Development

1. Create a `.env.local` file in your project root
2. Add all variables there (never commit this file)

---

## REQUIRED Environment Variables

### 1. Supabase Database (CRITICAL - App won't work without these)

**Where to get these values:**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**

**Variables to add:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**For Supabase Edge Functions (server-side operations):**

```bash
SUPABASE_URL=https://your-project-id.supabase.co
```

_(Note: This is the same URL as NEXT_PUBLIC_SUPABASE_URL but used server-side)_

### 2. Email Service (CRITICAL - Email features won't work)

**Where to get these values:**

1. Go to https://resend.com/dashboard
2. Go to **API Keys**
3. Create a new API key

**Variables to add:**

```bash
RESEND_API_KEY=re_1234567890abcdef...
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
```

### 3. App Configuration (CRITICAL)

**Variables to add:**

```bash
NEXT_PUBLIC_APP_NAME=ContentLab Nexus
NEXT_PUBLIC_APP_URL=https://app.contentlabtech.com
NODE_ENV=production
```

### 4. Authentication Security (CRITICAL)

**How to generate:**

- Use a random string generator or run: `openssl rand -hex 32`

**Variables to add:**

```bash
NEXTAUTH_SECRET=your_32_character_random_string_here
NEXTAUTH_URL=https://app.contentlabtech.com
JWT_SECRET=another_32_character_random_string
JWT_EXPIRES_IN=7d
```

---

## OPTIONAL Environment Variables

### 5. Google OAuth (for "Sign in with Google" button)

**Where to get these values:**

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID**
5. Set redirect URI: `https://app.contentlabtech.com/auth/callback`

**Variables to add:**

```bash
GOOGLE_OAUTH_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
```

### 6. Google Search Console (for analytics features)

**Where to get these values:**

1. Go to https://console.cloud.google.com
2. Go to **APIs & Services** → **Credentials**
3. Create **Service Account**
4. Download the JSON key file

**Variables to add:**

```bash
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
TEST_SITE_URL=https://app.contentlabtech.com
```

### 7. AI Services (for content optimization features)

**Where to get these values:**

- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com
- SERPAPI: https://serpapi.com/dashboard

**Variables to add:**

```bash
OPENAI_API_KEY=sk-1234567890abcdef...
ANTHROPIC_API_KEY=sk-ant-1234567890...
SERPAPI_API_KEY=1234567890abcdef...
GOOGLE_AI_API_KEY=AIzaSy1234567890...
```

---

## Step-by-Step Setup for Production

### Step 1: Vercel Environment Variables

1. Login to Vercel: https://vercel.com/dashboard
2. Find your `contentlab-nexus` project
3. Click **Settings** → **Environment Variables**
4. For each variable above, click **Add**:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://your-project-id.supabase.co`
   - Environment: `Production`, `Preview`, `Development`

### Step 2: Supabase Setup

1. Login to Supabase: https://supabase.com/dashboard
2. Find your project
3. Go to **Settings** → **API**
4. Copy the values:
   - URL → use for `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - Anon public key → use for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Service role secret → use for `SUPABASE_SECRET_KEY`

### Step 3: Email Setup (Resend)

1. Sign up at https://resend.com
2. Go to **API Keys**
3. Create new key → copy for `RESEND_API_KEY`
4. Verify your domain in Resend dashboard

### Step 4: Generate Secrets

Run this command to generate random secrets:

```bash
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
```

---

## What Happens If Variables Are Missing?

- **Missing Supabase vars**: App won't load, database errors
- **Missing email vars**: User registration/password reset fails
- **Missing auth secrets**: Login sessions won't work
- **Missing Google vars**: OAuth and Search Console features disabled
- **Missing AI vars**: Content optimization features disabled

---

## Quick Checklist

✅ Added all CRITICAL variables to Vercel  
✅ Supabase project created and API keys copied  
✅ Resend account created and API key copied  
✅ Random secrets generated for auth  
✅ Domain configured in all services  
✅ Triggered new deployment after adding variables

**After adding variables, redeploy your app in Vercel to apply changes.**
