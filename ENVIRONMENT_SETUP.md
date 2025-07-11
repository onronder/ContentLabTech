# Environment Variables Configuration Guide

## 🔍 Environment Variables Audit Results

Use the debug endpoint to check your environment configuration:

```bash
# Check environment variables
curl http://localhost:3000/api/debug-env

# Run comprehensive tests
curl -X POST http://localhost:3000/api/debug-env \
  -H "Content-Type: application/json" \
  -d '{"testType": "comprehensive"}'
```

## 📋 Required Environment Variables

### Core Supabase Configuration

```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Publishable Key (Public/Anon Key)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (Private/Secret Key)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: JWT Secret for advanced auth features
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

### Deployment Configuration

```env
# Vercel-specific (automatically set in Vercel)
VERCEL_URL=your-app.vercel.app
VERCEL_ENV=production

# Node Environment
NODE_ENV=production
```

## 🚨 Common Issues & Solutions

### Issue 1: Key Name Confusion

**Problem**: Using `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Solution**: Update your environment variables:

```env
# ❌ OLD (incorrect)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ NEW (correct)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue 2: Missing Service Role Key

**Problem**: Backend authentication fails without service role key

**Solution**: Add the service role key:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Issue 3: Invalid URL Format

**Problem**: URL doesn't include proper Supabase domain

**Solution**: Ensure URL format:

```env
# ✅ Correct format
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co

# ❌ Incorrect formats
NEXT_PUBLIC_SUPABASE_URL=abcdefghijklmnop.supabase.co  # Missing https://
NEXT_PUBLIC_SUPABASE_URL=https://localhost:3000        # Wrong domain
```

## 🔧 Environment Setup Instructions

### Local Development (.env.local)

1. Create `.env.local` file in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Restart your development server:

```bash
npm run dev
```

### Vercel Deployment

1. Go to your Vercel dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the correct name and value
4. Redeploy your application

### Getting Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the required keys:
   - **URL**: Copy "Project URL"
   - **Publishable Key**: Copy "anon public" key
   - **Service Role Key**: Copy "service_role" key

## 🧪 Testing Your Configuration

### 1. Environment Variables Check

```bash
curl http://localhost:3000/api/debug-env
```

### 2. Comprehensive Test

```bash
curl -X POST http://localhost:3000/api/debug-env \
  -H "Content-Type: application/json" \
  -d '{"testType": "comprehensive"}'
```

### 3. Authentication Test

```bash
curl http://localhost:3000/api/content
```

## 📊 Expected Results

### ✅ Healthy Configuration

```json
{
  "status": "Environment Variables Audit Complete",
  "validation": {
    "requiredVarsPresent": true,
    "missingVariables": [],
    "issues": [],
    "warnings": []
  },
  "recommendations": ["✅ Environment variables appear correctly configured"]
}
```

### ❌ Problematic Configuration

```json
{
  "status": "Environment Variables Audit Complete",
  "validation": {
    "requiredVarsPresent": false,
    "missingVariables": ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    "issues": [
      "Missing environment variables: NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY should start with 'eyJ' (JWT format)"
    ],
    "warnings": [
      "Found NEXT_PUBLIC_SUPABASE_ANON_KEY but missing NEXT_PUBLIC_SUPABASE_ANON_KEY - key names may be incorrect"
    ]
  },
  "recommendations": [
    "🚨 CRITICAL: Fix the issues listed above before proceeding",
    "📝 Rename NEXT_PUBLIC_SUPABASE_ANON_KEY to NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ]
}
```

## 🔐 Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local development
   - Add `.env*` to `.gitignore`

2. **Use appropriate key types**
   - Publishable key: Safe for client-side use
   - Service role key: Server-side only, never expose to client

3. **Verify key permissions**
   - Service role key should have appropriate database permissions
   - Publishable key should have limited permissions

## 🛠️ Troubleshooting Checklist

- [ ] All required environment variables are set
- [ ] Variable names are correct (especially `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Keys start with `eyJ` (JWT format)
- [ ] URL includes `https://` and `.supabase.co`
- [ ] Keys are from the correct Supabase project
- [ ] Environment variables are set in deployment platform
- [ ] Application has been restarted/redeployed after changes

## 🆘 Getting Help

If you're still experiencing issues after following this guide:

1. Run the debug endpoint and share the results
2. Check the browser console for error messages
3. Verify your Supabase project is active and accessible
4. Ensure your database has the required tables and RLS policies
