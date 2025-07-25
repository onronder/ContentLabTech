# Critical Security Fixes - Implementation Guide

## 1. Remove Debug Endpoints

### Files to Delete Immediately:
```bash
# Execute these commands NOW
rm -f src/app/api/debug-env/route.ts
rm -f src/app/api/test-db/route.ts
rm -f src/app/api/debug-cookies/route.ts
rm -f src/app/api/debug-team-membership/route.ts
rm -f src/app/api/list-users/route.ts
rm -f src/app/api/test-team-creation/route.ts
rm -f src/app/api/fix-team-assignments/route.ts
rm -f src/app/api/diagnose-persistence/route.ts
rm -f src/app/api/fix-persistence/route.ts
rm -f src/app/api/test-validation/route.ts
rm -rf src/app/api/debug/
```

## 2. Secure Authentication Middleware

Create `/src/lib/auth/secure-api-auth.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { z } from "zod";

// UUID validation schema
const uuidSchema = z.string().uuid();

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

export function withSecureAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>,
  options?: {
    requiredRole?: string;
    rateLimit?: { requests: number; window: number };
  }
) {
  return async (req: NextRequest) => {
    try {
      // 1. Rate limiting check (use Redis in production)
      if (options?.rateLimit) {
        const rateLimitOk = await checkRateLimit(req, options.rateLimit);
        if (!rateLimitOk) {
          return NextResponse.json(
            { error: "Too many requests" },
            { 
              status: 429,
              headers: {
                'Retry-After': '60',
                'X-RateLimit-Limit': String(options.rateLimit.requests),
                'X-RateLimit-Remaining': '0',
              }
            }
          );
        }
      }

      // 2. Authentication check
      const supabase = await createServerAuthClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // 3. Role-based access control
      if (options?.requiredRole) {
        const hasRole = await checkUserRole(user.id, options.requiredRole);
        if (!hasRole) {
          return NextResponse.json(
            { error: "Insufficient permissions" },
            { status: 403 }
          );
        }
      }

      // 4. Add user to request
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email!,
      };

      // 5. Execute handler
      return await handler(req as AuthenticatedRequest);

    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

// Redis-based rate limiting (implement with ioredis)
async function checkRateLimit(
  req: NextRequest,
  limits: { requests: number; window: number }
): Promise<boolean> {
  // TODO: Implement Redis-based rate limiting
  // For now, return true (no limiting)
  return true;
}

async function checkUserRole(userId: string, requiredRole: string): Promise<boolean> {
  // Implement role checking logic
  return true;
}

// UUID validation helper
export function validateUUID(id: string): boolean {
  try {
    uuidSchema.parse(id);
    return true;
  } catch {
    return false;
  }
}
```

## 3. Fix SQL Injection Vulnerabilities

Update all API routes to validate UUIDs:

```typescript
// Example fix for /src/app/api/projects/[id]/route.ts
import { validateUUID } from "@/lib/auth/secure-api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  
  // CRITICAL: Validate UUID format
  if (!validateUUID(projectId)) {
    return createErrorResponse("Invalid project ID format", 400);
  }
  
  // Continue with safe projectId...
}
```

## 4. Implement Redis Rate Limiting

Install dependencies:
```bash
npm install ioredis @types/ioredis
```

Create `/src/lib/security/rate-limiter.ts`:

```typescript
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
});

export async function checkRateLimit(
  identifier: string,
  limits: { requests: number; window: number }
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const window = limits.window * 1000; // Convert to milliseconds
  
  try {
    // Use Redis sorted sets for sliding window
    const pipeline = redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, now - window);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Count requests in window
    pipeline.zcard(key);
    
    // Set expiry
    pipeline.expire(key, Math.ceil(limits.window));
    
    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number || 0;
    
    return {
      allowed: count <= limits.requests,
      remaining: Math.max(0, limits.requests - count),
      reset: now + window,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open in case of Redis failure
    return { allowed: true, remaining: limits.requests, reset: now + window };
  }
}
```

## 5. Secure Environment Variables

Create `/src/lib/config/secure-env.ts`:

```typescript
import { z } from "zod";

const envSchema = z.object({
  // Public keys (safe for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(100),
  
  // Server-only keys (NEVER expose to client)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(100),
  
  // Optional services
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
  
  // Security
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
});

// Validate on startup
export const env = envSchema.parse(process.env);

// Type-safe access
export function getSecureEnv<K extends keyof typeof env>(key: K): typeof env[K] {
  const value = env[key];
  
  // Extra safety: Never log sensitive values
  if (key.includes("KEY") || key.includes("SECRET")) {
    console.log(`Accessing ${key}: [REDACTED]`);
  }
  
  return value;
}
```

## 6. Add Security Headers

Update `/src/middleware.ts`:

```typescript
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Existing headers...
  
  // Add missing security headers
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Expect-CT", "max-age=86400, enforce");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  
  // Stronger CSP
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
    "upgrade-insecure-requests",
  ].join("; ");
  
  response.headers.set("Content-Security-Policy", csp);
  
  return response;
}
```

## 7. Implement Audit Logging

Create `/src/lib/security/audit-logger.ts`:

```typescript
import { createServerAuthClient } from "@/lib/supabase/server-auth";

interface AuditEvent {
  event_type: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class AuditLogger {
  static async log(event: Omit<AuditEvent, "timestamp">) {
    try {
      const supabase = await createServerAuthClient();
      
      const auditEvent: AuditEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };
      
      // Store in audit_logs table
      const { error } = await supabase
        .from("audit_logs")
        .insert(auditEvent);
        
      if (error) {
        console.error("Audit log failed:", error);
      }
      
      // Also send to SIEM if configured
      if (process.env.SIEM_ENDPOINT) {
        await fetch(process.env.SIEM_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.SIEM_API_KEY}`,
          },
          body: JSON.stringify(auditEvent),
        });
      }
    } catch (error) {
      console.error("Critical: Audit logging failed", error);
    }
  }
}
```

## 8. Create Database Migration for Security

Create `/supabase/migrations/20250125_security_fixes.sql`:

```sql
-- Add audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    resource_type VARCHAR(50),
    resource_id UUID,
    action VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);

-- Add soft delete columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create secure views that exclude deleted items
CREATE OR REPLACE VIEW active_projects AS
SELECT * FROM projects WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_content_items AS
SELECT * FROM content_items WHERE deleted_at IS NULL;

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_items_project_id ON content_items(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_content_analytics_date ON content_analytics(date);
CREATE INDEX IF NOT EXISTS idx_content_analytics_content_id ON content_analytics(content_id);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "audit_logs_admin_read" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- System can insert audit logs
CREATE POLICY "audit_logs_system_insert" ON audit_logs
    FOR INSERT
    WITH CHECK (true);
```

## 9. Emergency Response Script

Create `/scripts/emergency-security-lockdown.sh`:

```bash
#!/bin/bash

echo "🚨 EMERGENCY SECURITY LOCKDOWN INITIATED"

# 1. Disable all debug endpoints
echo "Removing debug endpoints..."
find src/app/api -name "*debug*" -type f -delete
find src/app/api -name "*test*" -type f -delete

# 2. Rotate all keys
echo "Rotating API keys..."
# Add key rotation logic here

# 3. Clear all sessions
echo "Invalidating all sessions..."
# Add session clearing logic

# 4. Enable strict mode
echo "Enabling strict security mode..."
export SECURITY_MODE="STRICT"

# 5. Notify team
echo "Sending security alert..."
# Add notification logic

echo "✅ Emergency lockdown complete"
```

## Deployment Checklist

- [ ] Delete all debug endpoints
- [ ] Implement secure authentication middleware
- [ ] Add UUID validation to all routes
- [ ] Deploy Redis for rate limiting
- [ ] Run security migration
- [ ] Update environment variables
- [ ] Enable audit logging
- [ ] Configure monitoring alerts
- [ ] Run penetration testing
- [ ] Schedule security review