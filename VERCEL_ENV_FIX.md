# Vercel Environment Configuration Fix Guide

## 🚨 Critical Issues to Fix

### 1. Supabase Configuration Error

**Problem**: The application expects the new Supabase key format but is receiving the legacy JWT format.

**Current Error**:

- "Supabase anon key has invalid format"
- "CRITICAL: Legacy JWT token detected as anon key"

**Solution**: Update your Vercel environment variables with the correct format.

#### Required Supabase Environment Variables:

```bash
# Supabase URL (keep as is)
NEXT_PUBLIC_SUPABASE_URL=https://rwyaipbxlvrilagkirsq.supabase.co

# IMPORTANT: Use the NEW format keys (not the legacy JWT format)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-key-starting-with-sb_publishable_>
SUPABASE_SERVICE_ROLE_KEY=<your-secret-key-starting-with-sb_secret_>

# Legacy format (DO NOT USE - will cause errors):
# ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### How to Get the Correct Keys:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Look for the **NEW** API keys section (not the legacy JWT section)
5. Copy:
   - `anon` `public` key → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → Use as `SUPABASE_SERVICE_ROLE_KEY`

### 2. Redis Configuration (Optional but Recommended)

**Problem**: Redis is not configured, affecting caching and rate limiting.

**Solution**: Add Redis configuration to Vercel.

#### Option A: Use Upstash Redis (Recommended for Vercel)

1. Go to https://upstash.com and create a free Redis instance
2. Get your connection details
3. Add to Vercel:

```bash
REDIS_HOST=<your-upstash-endpoint>
REDIS_PORT=<your-upstash-port>
REDIS_PASSWORD=<your-upstash-password>
REDIS_TLS=true
```

#### Option B: Use Redis Cloud

1. Go to https://redis.com/try-free/
2. Create a free database
3. Add to Vercel:

```bash
REDIS_HOST=<your-redis-endpoint>
REDIS_PORT=<your-redis-port>
REDIS_PASSWORD=<your-redis-password>
REDIS_TLS=true
```

#### Option C: Skip Redis (Fallback Mode)

If you don't want to use Redis, the app will work but without:

- Advanced rate limiting
- Performance caching
- Job queue processing

### 3. External Services Configuration

**Problem**: Some external services are not configured or have invalid credentials.

#### Required External Services:

##### OpenAI (Required for AI Features)

```bash
OPENAI_API_KEY=sk-...your-openai-api-key
```

##### BrightData (Required for Competitive Analysis)

```bash
BRIGHTDATA_CUSTOMER_ID=<your-customer-id>
BRIGHTDATA_ZONE=<your-zone>
BRIGHTDATA_PASSWORD=<your-password>
```

##### Google Analytics (Optional)

```bash
GOOGLE_ANALYTICS_CLIENT_ID=<your-client-id>
GOOGLE_ANALYTICS_CLIENT_SECRET=<your-client-secret>
```

## 📝 Step-by-Step Fix Instructions

### Step 1: Update Supabase Keys in Vercel

1. Go to your Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Update these variables:

```bash
# DELETE or UPDATE these if they exist with JWT format:
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<new-secret-key>

# Also check for these legacy names and remove them:
SUPABASE_SECRET_KEY
SUPABASE_ANON_KEY
```

### Step 2: Add Redis Configuration (Optional)

Add these variables to Vercel:

```bash
REDIS_HOST=<your-redis-host>
REDIS_PORT=<your-redis-port>
REDIS_PASSWORD=<your-redis-password>
REDIS_TLS=true
```

### Step 3: Configure External Services

Add missing service credentials:

```bash
# AI Features
OPENAI_API_KEY=sk-...

# Competitive Analysis
BRIGHTDATA_CUSTOMER_ID=...
BRIGHTDATA_ZONE=...
BRIGHTDATA_PASSWORD=...
```

### Step 4: Redeploy

After updating environment variables:

1. Go to your Vercel project
2. Go to Deployments
3. Click on the three dots menu on the latest deployment
4. Select "Redeploy"
5. ✅ Check "Use existing Build Cache"

## 🧪 Verification

After redeployment, run these tests:

```bash
# Test health endpoint
curl https://app.contentlabtech.com/api/health | jq .

# Check for errors
curl https://app.contentlabtech.com/api/health/environment | jq .
```

Expected result:

- No "Legacy JWT token" errors
- Status should be "healthy" or have fewer errors

## 🔒 Security Notes

1. **Never commit these values to git**
2. **Use Vercel's environment variables UI**
3. **Different values for Production/Preview/Development**
4. **Rotate keys regularly**

## 📋 Complete Environment Variables Checklist

### Required:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (new format)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (new format)

### Recommended:

- [ ] `OPENAI_API_KEY`
- [ ] `REDIS_HOST`
- [ ] `REDIS_PORT`
- [ ] `REDIS_PASSWORD`
- [ ] `REDIS_TLS`

### Optional:

- [ ] `BRIGHTDATA_CUSTOMER_ID`
- [ ] `BRIGHTDATA_ZONE`
- [ ] `BRIGHTDATA_PASSWORD`
- [ ] `GOOGLE_ANALYTICS_CLIENT_ID`
- [ ] `GOOGLE_ANALYTICS_CLIENT_SECRET`

## 🚀 Quick Test After Fix

Save this as `test-env-fix.sh`:

```bash
#!/bin/bash
echo "Testing ContentLab environment configuration..."
echo "============================================="

# Test health
echo -n "Health Status: "
curl -s https://app.contentlabtech.com/api/health | jq -r .status

# Test environment
echo -n "Environment Issues: "
curl -s https://app.contentlabtech.com/api/health/environment | jq -r '.details.errors[]' 2>/dev/null || echo "None"

# Test external services
echo -n "External Services: "
curl -s https://app.contentlabtech.com/api/health/external | jq -r .status

echo "============================================="
```

---

**Need Help?**

- Supabase Docs: https://supabase.com/docs/guides/api#api-url-and-keys
- Upstash Redis: https://docs.upstash.com/redis
- Vercel Env Vars: https://vercel.com/docs/environment-variables
