# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these environment variables in your Vercel dashboard (Settings → Environment Variables):

### Core Application

```
NEXT_PUBLIC_APP_NAME=ContentLab Nexus
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

### Supabase Configuration (REQUIRED)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
SUPABASE_SECRET_KEY=sb_secret_your_secret_key_here
```

### Email Configuration (REQUIRED)

```
EMAIL_FROM=info@contentlabtech.com
NEXT_PUBLIC_SUPPORT_EMAIL=info@contentlabtech.com
RESEND_API_KEY=re_your_resend_api_key_here
```

### Authentication & Security

```
NEXTAUTH_SECRET=your_random_secret_32_chars_min
NEXTAUTH_URL=https://your-domain.vercel.app
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

### OAuth Providers (Google)

```
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
```

### Google Search Console Integration (REQUIRED for Analytics)

```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
TEST_SITE_URL=https://your-domain.vercel.app
```

### Supabase Edge Functions (REQUIRED for server operations)

```
SUPABASE_URL=https://your-project-id.supabase.co
```

### Optional: External AI Services

```
SERPAPI_API_KEY=your_serpapi_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Optional: API Configuration

```
NEXT_PUBLIC_API_URL=/api
```

### Optional: Analytics & Monitoring

```
SENTRY_DSN=your_sentry_dsn
VERCEL_ANALYTICS_ID=your_vercel_analytics_id
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
```

### Optional: Rate Limiting

```
API_RATE_LIMIT_REQUESTS=100
API_RATE_LIMIT_WINDOW=3600
```

## Notes

1. **Required variables**: The build will fail without Supabase and Resend API keys
2. **Security**: Never expose secret keys in client-side code
3. **Domains**: Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to your actual domain
4. **Webhooks**: Set up webhook endpoints after deployment for email automation
5. **Google Service Account**: Create a service account in Google Cloud Console with Search Console API access. Download the JSON key and paste it as a single-line string in `GOOGLE_SERVICE_ACCOUNT_KEY`
6. **Supabase Edge Functions**: The `SUPABASE_URL` variable is required for server-side operations and is different from the public URL

## Webhook Configuration

After deployment, configure these webhooks in your services:

- **Supabase Auth Webhooks**: `https://your-domain.vercel.app/api/webhooks/auth`
- **Edge Functions**: Deploy Supabase Edge Functions with environment variables

## Build Warnings

The following warnings are expected and don't affect functionality:

- Supabase Realtime.js expression dependency warning
- ESLint Next.js plugin warning (using flat config)

## Bundle Size Analysis

Current bundle sizes:

- Total First Load JS: ~101 kB (shared)
- Dashboard page: ~207 kB (includes charts)
- Email preview: ~243 kB (dev only)
- Auth pages: ~150-160 kB
- Static pages: ~105 kB

All sizes are within acceptable limits for modern web applications.
