# Quick Start: Essential Environment Variables

## Minimum Required Setup (App Won't Work Without These)

### 1. Vercel Dashboard Setup

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

### 2. Add These 8 Critical Variables:

#### From Supabase (https://supabase.com/dashboard → Your Project → Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL = https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SECRET_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL = https://abcdefghijklmnop.supabase.co
```

#### From Resend (https://resend.com/dashboard → API Keys):

```
RESEND_API_KEY = re_123456789...
EMAIL_FROM = noreply@contentlabtech.com
```

#### App Configuration:

```
NEXT_PUBLIC_APP_URL = https://app.contentlabtech.com
NEXTAUTH_SECRET = [generate with: openssl rand -hex 32]
```

### 3. Generate Secret

Run this command in terminal:

```bash
openssl rand -hex 32
```

Copy the output and use it for `NEXTAUTH_SECRET`

### 4. Deploy

After adding all variables in Vercel, trigger a new deployment.

---

## That's It!

Your app should now work with basic functionality. Add other variables later for advanced features.
