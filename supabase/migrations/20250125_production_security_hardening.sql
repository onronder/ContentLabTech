-- =====================================================
-- PRODUCTION SECURITY HARDENING & AUDIT LOGGING
-- Critical security enhancements for production deployment
-- =====================================================

-- Create audit log tables for security monitoring
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    endpoint TEXT,
    request_id TEXT,
    details JSONB,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit log performance
CREATE INDEX idx_security_audit_logs_timestamp ON security_audit_logs(timestamp DESC);
CREATE INDEX idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX idx_security_audit_logs_severity ON security_audit_logs(severity);
CREATE INDEX idx_security_audit_logs_ip_address ON security_audit_logs(ip_address);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    violation_count INTEGER NOT NULL DEFAULT 1,
    first_violation_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_violation_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_banned BOOLEAN DEFAULT FALSE,
    ban_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for rate limiting
CREATE INDEX idx_rate_limit_violations_ip ON rate_limit_violations(ip_address);
CREATE INDEX idx_rate_limit_violations_user_id ON rate_limit_violations(user_id);
CREATE INDEX idx_rate_limit_violations_endpoint ON rate_limit_violations(endpoint);
CREATE INDEX idx_rate_limit_violations_banned ON rate_limit_violations(is_banned, ban_expires_at) WHERE is_banned = TRUE;

-- Create failed login attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for failed login tracking
CREATE INDEX idx_failed_login_attempts_email ON failed_login_attempts(email);
CREATE INDEX idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX idx_failed_login_attempts_time ON failed_login_attempts(attempt_time DESC);

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_severity TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO security_audit_logs (
        event_type,
        user_id,
        ip_address,
        user_agent,
        endpoint,
        request_id,
        details,
        severity
    ) VALUES (
        p_event_type,
        p_user_id,
        p_ip_address,
        p_user_agent,
        p_endpoint,
        p_request_id,
        p_details,
        p_severity
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track rate limit violations
CREATE OR REPLACE FUNCTION track_rate_limit_violation(
    p_ip_address INET,
    p_user_id UUID DEFAULT NULL,
    p_endpoint TEXT DEFAULT '/'
)
RETURNS BOOLEAN AS $$
DECLARE
    violation_record RECORD;
    should_ban BOOLEAN := FALSE;
BEGIN
    -- Get or create violation record
    SELECT * INTO violation_record 
    FROM rate_limit_violations 
    WHERE ip_address = p_ip_address 
    AND endpoint = p_endpoint
    AND (ban_expires_at IS NULL OR ban_expires_at > NOW());
    
    IF violation_record IS NULL THEN
        -- Create new violation record
        INSERT INTO rate_limit_violations (
            ip_address,
            user_id,
            endpoint,
            violation_count,
            first_violation_at,
            last_violation_at
        ) VALUES (
            p_ip_address,
            p_user_id,
            p_endpoint,
            1,
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing record
        UPDATE rate_limit_violations
        SET 
            violation_count = violation_count + 1,
            last_violation_at = NOW(),
            user_id = COALESCE(p_user_id, user_id),
            updated_at = NOW()
        WHERE id = violation_record.id;
        
        -- Check if should ban (5+ violations in 1 hour)
        IF violation_record.violation_count >= 4 
           AND violation_record.last_violation_at > (NOW() - INTERVAL '1 hour') THEN
            should_ban := TRUE;
            
            UPDATE rate_limit_violations
            SET 
                is_banned = TRUE,
                ban_expires_at = NOW() + INTERVAL '24 hours',
                updated_at = NOW()
            WHERE id = violation_record.id;
        END IF;
    END IF;
    
    -- Log the violation
    PERFORM log_security_event(
        'RATE_LIMIT_VIOLATION',
        p_user_id,
        p_ip_address,
        NULL,
        p_endpoint,
        NULL,
        jsonb_build_object(
            'violation_count', COALESCE(violation_record.violation_count, 0) + 1,
            'banned', should_ban
        ),
        CASE WHEN should_ban THEN 'high' ELSE 'medium' END
    );
    
    RETURN should_ban;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if IP is banned
CREATE OR REPLACE FUNCTION is_ip_banned(p_ip_address INET)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM rate_limit_violations
        WHERE ip_address = p_ip_address
        AND is_banned = TRUE
        AND ban_expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log failed login attempts
CREATE OR REPLACE FUNCTION log_failed_login(
    p_email TEXT,
    p_ip_address INET,
    p_user_agent TEXT DEFAULT NULL,
    p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    recent_attempts INTEGER;
BEGIN
    -- Insert failed login attempt
    INSERT INTO failed_login_attempts (
        email,
        ip_address,
        user_agent,
        failure_reason
    ) VALUES (
        p_email,
        p_ip_address,
        p_user_agent,
        p_failure_reason
    ) RETURNING id INTO log_id;
    
    -- Count recent attempts from this IP
    SELECT COUNT(*) INTO recent_attempts
    FROM failed_login_attempts
    WHERE ip_address = p_ip_address
    AND attempt_time > (NOW() - INTERVAL '1 hour');
    
    -- Log security event if many attempts
    IF recent_attempts >= 5 THEN
        PERFORM log_security_event(
            'BRUTE_FORCE_ATTEMPT',
            NULL,
            p_ip_address,
            p_user_agent,
            '/auth/signin',
            NULL,
            jsonb_build_object(
                'email', p_email,
                'recent_attempts', recent_attempts,
                'failure_reason', p_failure_reason
            ),
            'critical'
        );
    END IF;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENHANCED RLS POLICIES WITH AUDIT LOGGING
-- =====================================================

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
    -- Log sensitive operations
    IF TG_OP = 'DELETE' THEN
        PERFORM log_security_event(
            'SENSITIVE_DELETE',
            auth.uid(),
            NULL,
            NULL,
            NULL,
            NULL,
            jsonb_build_object(
                'table', TG_TABLE_NAME,
                'old_record', to_jsonb(OLD)
            ),
            'high'
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log role changes in team_members
        IF TG_TABLE_NAME = 'team_members' AND OLD.role != NEW.role THEN
            PERFORM log_security_event(
                'ROLE_CHANGE',
                auth.uid(),
                NULL,
                NULL,
                NULL,
                NULL,
                jsonb_build_object(
                    'table', TG_TABLE_NAME,
                    'target_user', NEW.user_id,
                    'old_role', OLD.role,
                    'new_role', NEW.role
                ),
                'high'
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        -- Log team member additions
        IF TG_TABLE_NAME = 'team_members' THEN
            PERFORM log_security_event(
                'TEAM_MEMBER_ADDED',
                auth.uid(),
                NULL,
                NULL,
                NULL,
                NULL,
                jsonb_build_object(
                    'table', TG_TABLE_NAME,
                    'new_member', NEW.user_id,
                    'role', NEW.role,
                    'team_id', NEW.team_id
                ),
                'medium'
            );
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers on sensitive tables
CREATE TRIGGER audit_team_members_trigger
    AFTER INSERT OR UPDATE OR DELETE ON team_members
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

CREATE TRIGGER audit_teams_trigger
    AFTER DELETE ON teams
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

CREATE TRIGGER audit_projects_trigger
    AFTER DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

-- =====================================================
-- FIELD-LEVEL ENCRYPTION SETUP
-- =====================================================

-- Create extension for encryption (if not exists)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
    -- Use application key or generate one
    IF key IS NULL THEN
        key := COALESCE(current_setting('app.encryption_key', true), 'default_key_change_in_production');
    END IF;
    
    RETURN encode(pgp_sym_encrypt(data, key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
    -- Use application key or generate one
    IF key IS NULL THEN
        key := COALESCE(current_setting('app.encryption_key', true), 'default_key_change_in_production');
    END IF;
    
    RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), key);
EXCEPTION
    WHEN OTHERS THEN
        -- Return null if decryption fails
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CONNECTION POOLING & PERFORMANCE SECURITY
-- =====================================================

-- Create connection monitoring table
CREATE TABLE IF NOT EXISTS connection_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    connection_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_duration INTERVAL,
    query_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for connection monitoring
CREATE INDEX idx_connection_monitoring_user_id ON connection_monitoring(user_id);
CREATE INDEX idx_connection_monitoring_time ON connection_monitoring(connection_time DESC);
CREATE INDEX idx_connection_monitoring_ip ON connection_monitoring(ip_address);

-- Function to monitor connections
CREATE OR REPLACE FUNCTION monitor_connection(
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    monitoring_id UUID;
    concurrent_sessions INTEGER;
BEGIN
    -- Count concurrent sessions for user
    IF p_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO concurrent_sessions
        FROM connection_monitoring
        WHERE user_id = p_user_id
        AND connection_time > (NOW() - INTERVAL '1 hour')
        AND session_duration IS NULL;
        
        -- Log if too many concurrent sessions
        IF concurrent_sessions > 5 THEN
            PERFORM log_security_event(
                'EXCESSIVE_CONCURRENT_SESSIONS',
                p_user_id,
                p_ip_address,
                p_user_agent,
                NULL,
                NULL,
                jsonb_build_object('concurrent_sessions', concurrent_sessions),
                'high'
            );
        END IF;
    END IF;
    
    -- Record connection
    INSERT INTO connection_monitoring (
        user_id,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO monitoring_id;
    
    RETURN monitoring_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CLEANUP FUNCTIONS FOR AUDIT DATA
-- =====================================================

-- Function to cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old security audit logs
    DELETE FROM security_audit_logs
    WHERE created_at < (NOW() - make_interval(days => retention_days));
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old failed login attempts
    DELETE FROM failed_login_attempts
    WHERE created_at < (NOW() - make_interval(days => retention_days));
    
    -- Delete old rate limit violations
    DELETE FROM rate_limit_violations
    WHERE created_at < (NOW() - make_interval(days => retention_days))
    AND is_banned = FALSE;
    
    -- Delete old connection monitoring
    DELETE FROM connection_monitoring
    WHERE created_at < (NOW() - make_interval(days => retention_days));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES FOR AUDIT TABLES
-- =====================================================

-- Enable RLS on audit tables
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_monitoring ENABLE ROW LEVEL SECURITY;

-- Security audit logs: Only accessible by service role and users viewing their own logs
CREATE POLICY "security_audit_logs_select_policy" ON security_audit_logs
    FOR SELECT
    USING (
        current_setting('role') = 'service_role'
        OR user_id = auth.uid()
    );

-- Rate limit violations: Only accessible by service role
CREATE POLICY "rate_limit_violations_service_only" ON rate_limit_violations
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Failed login attempts: Only accessible by service role
CREATE POLICY "failed_login_attempts_service_only" ON failed_login_attempts
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Connection monitoring: Users can see their own connections
CREATE POLICY "connection_monitoring_select_policy" ON connection_monitoring
    FOR SELECT
    USING (
        current_setting('role') = 'service_role'
        OR user_id = auth.uid()
    );

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute on security functions to authenticated users
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, UUID, INET, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION track_rate_limit_violation(INET, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_ip_banned(INET) TO authenticated;
GRANT EXECUTE ON FUNCTION log_failed_login(TEXT, INET, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_connection(UUID, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION encrypt_sensitive_data(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_sensitive_data(TEXT, TEXT) TO authenticated;

-- Grant cleanup function only to service role
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(INTEGER) TO service_role;

-- =====================================================
-- SCHEDULED CLEANUP JOB
-- =====================================================

-- Note: This would typically be set up via pg_cron or external scheduler
-- For now, we'll create a manual cleanup function that can be called periodically

CREATE OR REPLACE FUNCTION scheduled_security_cleanup()
RETURNS TEXT AS $$
DECLARE
    result TEXT;
    deleted_logs INTEGER;
BEGIN
    -- Cleanup old audit data
    SELECT cleanup_old_audit_logs(90) INTO deleted_logs;
    
    -- Log cleanup activity
    PERFORM log_security_event(
        'AUDIT_CLEANUP',
        NULL,
        NULL,
        NULL,
        'scheduled_cleanup',
        NULL,
        jsonb_build_object('deleted_logs', deleted_logs),
        'low'
    );
    
    result := format('Cleanup completed. Deleted %s old audit log entries.', deleted_logs);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant cleanup function to service role
GRANT EXECUTE ON FUNCTION scheduled_security_cleanup() TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE security_audit_logs IS 'Comprehensive security audit logging for monitoring and compliance';
COMMENT ON TABLE rate_limit_violations IS 'Tracking of rate limit violations and automatic banning';
COMMENT ON TABLE failed_login_attempts IS 'Failed authentication attempts for brute force detection';
COMMENT ON TABLE connection_monitoring IS 'Database connection monitoring for security analysis';

COMMENT ON FUNCTION log_security_event(TEXT, UUID, INET, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Log security events for audit trail';
COMMENT ON FUNCTION track_rate_limit_violation(INET, UUID, TEXT) IS 'Track and manage rate limit violations';
COMMENT ON FUNCTION is_ip_banned(INET) IS 'Check if IP address is currently banned';
COMMENT ON FUNCTION log_failed_login(TEXT, INET, TEXT, TEXT) IS 'Log failed authentication attempts';
COMMENT ON FUNCTION monitor_connection(UUID, INET, TEXT) IS 'Monitor database connections for security';
COMMENT ON FUNCTION encrypt_sensitive_data(TEXT, TEXT) IS 'Encrypt sensitive data using pgcrypto';
COMMENT ON FUNCTION decrypt_sensitive_data(TEXT, TEXT) IS 'Decrypt sensitive data using pgcrypto';
COMMENT ON FUNCTION cleanup_old_audit_logs(INTEGER) IS 'Cleanup old audit data based on retention policy';
COMMENT ON FUNCTION scheduled_security_cleanup() IS 'Scheduled cleanup of security audit data';

-- =====================================================
-- SECURITY HARDENING COMPLETE
-- =====================================================

-- Log the completion of security hardening
SELECT log_security_event(
    'SECURITY_HARDENING_COMPLETE',
    NULL,
    NULL,
    NULL,
    'database_migration',
    NULL,
    jsonb_build_object(
        'migration', '20250125_production_security_hardening',
        'timestamp', NOW(),
        'version', '2.0'
    ),
    'high'
);