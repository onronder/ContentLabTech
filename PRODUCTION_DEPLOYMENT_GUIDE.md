# Production Deployment Guide 🚀

Complete guide for deploying ContentLab Nexus to Supabase-Vercel production environment.

## Phase 1: Database Setup ✅

### 1.1 Apply Database Migrations

Your Supabase database has been successfully set up with all required tables:

- ✅ **teams** - Team management
- ✅ **team_members** - Team membership
- ✅ **team_invitations** - Invitation system
- ✅ **user_preferences** - User settings
- ✅ **notification_preferences** - Notification settings
- ✅ **user_sessions** - Session management
- ✅ **login_history** - Authentication logs
- ✅ **projects** - Project management
- ✅ **content_items** - Content management
- ✅ **analytics_events** - Analytics tracking

### 1.2 Database Verification

Run the verification script to confirm database health:

```bash
node scripts/verify-production-db.js
```

## Phase 2: Vercel Deployment 🌐

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### 2.3 Configure Environment Variables

In your Vercel dashboard, add these environment variables:

**Required Variables:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://rwyaipbxlvrilagkirsq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
RESEND_API_KEY=your_resend_api_key
```

**Optional Variables:**

```env
SENTRY_DSN=your_sentry_dsn
ANALYTICS_WRITE_KEY=your_analytics_key
```

### 2.4 Get Your Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `rwyaipbxlvrilagkirsq`
3. Go to Settings → API
4. Copy the keys:
   - **Project URL**: Already configured
   - **Anon Public Key**: Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Service Role Key**: Use for `SUPABASE_SERVICE_ROLE_KEY`

## Phase 3: Production Verification 🔍

### 3.1 Access Health Dashboard

Once deployed, access your production health dashboard:

```
https://your-app.vercel.app/health
```

This dashboard provides:

- ✅ Real-time system status
- ✅ Database connectivity monitoring
- ✅ Environment variable verification
- ✅ Authentication flow testing
- ✅ API endpoint status

### 3.2 Run Production Tests

Test your production environment:

```bash
# Set your production URL
export VERCEL_URL=https://your-app.vercel.app

# Run comprehensive production tests
node scripts/verify-production-environment.js
```

### 3.3 Health Check Endpoints

Your production environment includes these health endpoints:

- **Database Health**: `/api/health/database`
- **Environment Health**: `/api/health/environment`
- **Detailed Health**: `/api/health/detailed`

## Phase 4: Team Invitations Testing 📧

### 4.1 Configure Email Service

1. Sign up for [Resend](https://resend.com)
2. Get your API key
3. Add it to Vercel environment variables as `RESEND_API_KEY`

### 4.2 Test Invitation Flow

1. Access your production app
2. Create an account or sign in
3. Navigate to Team settings
4. Send a test invitation
5. Verify email delivery

## Phase 5: Production Monitoring 📊

### 5.1 Real-time Monitoring

The health dashboard automatically refreshes every 30 seconds and shows:

- **System Uptime**: Overall system health percentage
- **Database Status**: PostgreSQL connection and performance
- **Environment Status**: Configuration completeness
- **Authentication Status**: Auth service availability

### 5.2 Error Handling

All components include production-ready error handling:

- **Graceful Degradation**: Components work even with API issues
- **User-Friendly Messages**: Clear error communication
- **Automatic Retry**: Network resilience built-in
- **Development Debugging**: Detailed error info in dev mode

## Production URLs Structure

```
Production App: https://your-app.vercel.app
├── Health Dashboard: /health
├── API Health: /api/health/*
├── Authentication: /auth/*
├── Protected Routes: /(protected)/*
└── Team Invitations: /api/teams/*/invitations
```

## Troubleshooting 🔧

### Common Issues:

**1. Database Connection Errors**

- Verify Supabase keys in Vercel environment variables
- Check database URL format
- Ensure service role key has correct permissions

**2. Authentication Issues**

- Confirm `NEXT_PUBLIC_APP_URL` matches Vercel URL
- Verify Supabase Auth settings allow your domain
- Check JWT secret configuration

**3. Email Delivery Problems**

- Verify Resend API key is valid
- Check email templates are properly configured
- Ensure sender domain is verified in Resend

**4. API Route 404 Errors**

- Confirm deployment includes all routes
- Check build logs for compilation errors
- Verify Next.js configuration

### Getting Help:

1. **Health Dashboard**: Check `/health` for system status
2. **Verification Script**: Run production verification script
3. **Logs**: Check Vercel deployment logs
4. **Database**: Use Supabase dashboard for database issues

## Success Criteria ✅

Your production deployment is successful when:

- ✅ Health dashboard shows all systems "healthy"
- ✅ Database verification script passes all checks
- ✅ Authentication flow works end-to-end
- ✅ Team invitations send successfully
- ✅ API endpoints respond correctly
- ✅ No console errors in browser

## Next Steps 🎯

After successful deployment:

1. **Set up monitoring alerts** (optional)
2. **Configure custom domain** (optional)
3. **Set up backup procedures**
4. **Plan scaling strategy**
5. **Monitor performance metrics**

---

**Need help?** The health dashboard at `/health` provides real-time diagnostics and deployment instructions.
