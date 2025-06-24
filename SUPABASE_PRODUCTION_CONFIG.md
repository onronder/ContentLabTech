# Fix Supabase Production URL Configuration

## Problem

Email verification links are pointing to `localhost:3000` instead of your production domain.

## Solution: Update Supabase Project Settings

### 1. Go to Supabase Dashboard

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `contentlab-nexus`

### 2. Update Site URL

1. Go to **Settings** → **Authentication**
2. Find **Site URL** section
3. Change from: `http://localhost:3000`
4. Change to: `https://your-vercel-domain.vercel.app`

### 3. Update Redirect URLs

1. In the same **Authentication** settings
2. Find **Redirect URLs** section
3. Add your production domains:
   ```
   https://your-vercel-domain.vercel.app/auth/callback
   https://your-vercel-domain.vercel.app/auth/verify-email
   https://your-vercel-domain.vercel.app/**
   ```

### 4. Update Email Templates (if needed)

1. Go to **Authentication** → **Email Templates**
2. Check the **Confirm signup** template
3. Make sure it uses `{{ .SiteURL }}` (this should auto-update with Site URL)

### 5. Environment Variables Check

Make sure your Vercel environment variables are set correctly:

**Required in Vercel Dashboard:**

```
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://rwyaipbxlvrilagkirsq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mT3MRZEJ0wNKBRvYS4S8bA_sAfqszRu
SUPABASE_SECRET_KEY=sb_secret_8XmLzdbY4f0-R8i5QREzBQ_lkongp52
RESEND_API_KEY=re_9f75PrXu_14UAfnHYzxazefzXodU9ir3b
EMAIL_FROM=info@contentlabtech.com
NEXT_PUBLIC_SUPPORT_EMAIL=info@contentlabtech.com
```

## Quick Fix Steps:

1. **Immediate Fix**: Update Supabase Site URL to your Vercel domain
2. **Test**: Create a new user and verify the email link points to production
3. **Verify**: Check that all auth flows work in production

## What This Fixes:

- ✅ Email verification links will point to production
- ✅ Password reset links will point to production
- ✅ OAuth redirects will work correctly
- ✅ All auth flows will work in production environment

## Alternative: Custom Email Templates

If you want more control, you can also:

1. Go to **Authentication** → **Email Templates**
2. Customize the **Confirm signup** template
3. Replace `{{ .SiteURL }}` with your hardcoded domain

But updating the Site URL is the recommended approach as it handles all auth flows automatically.
