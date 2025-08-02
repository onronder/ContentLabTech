-- =====================================================
-- Edge Functions Database Fixes
-- Critical fixes for Edge Functions to work properly
-- =====================================================

-- 1. Create missing RPC function for team access (CRITICAL)
CREATE OR REPLACE FUNCTION has_team_access(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_uuid 
    AND user_id = user_uuid
  );
END;
$$;

-- 2. Create missing admin_users table (for admin-operations function)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create missing audit_logs table (for admin-operations function)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  target_resource TEXT,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- 4. Create missing email_logs table (for send-email function)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'failed', 'rate_limited', 'bounced', 'delivered')),
  recipient_email TEXT NOT NULL,
  subject TEXT,
  template_id TEXT,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_email_logs_event_type ON email_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_timestamp ON email_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);

-- 6. Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for admin_users
CREATE POLICY "Admin users can view their own record" 
  ON admin_users FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all admin users" 
  ON admin_users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert admin users" 
  ON admin_users FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update admin users" 
  ON admin_users FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 8. Create RLS policies for audit_logs
CREATE POLICY "Admins can view audit logs" 
  ON audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert audit logs" 
  ON audit_logs FOR INSERT 
  WITH CHECK (true); -- Allow system/Edge Functions to insert

-- 9. Create RLS policies for email_logs
CREATE POLICY "Admins can view email logs" 
  ON email_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert email logs" 
  ON email_logs FOR INSERT 
  WITH CHECK (true); -- Allow system/Edge Functions to insert

-- 10. Add updated_at trigger for admin_users
CREATE TRIGGER update_admin_users_updated_at 
  BEFORE UPDATE ON admin_users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Add function to check if user is admin (helper for Edge Functions)
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid
  );
END;
$$;

-- 12. Add function to check if user is super admin (helper for Edge Functions)
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid 
    AND role = 'super_admin'
  );
END;
$$;

-- 13. Add function to log admin actions (helper for Edge Functions)
CREATE OR REPLACE FUNCTION log_admin_action(
  action_name TEXT,
  performed_by_uuid UUID,
  target_resource_name TEXT DEFAULT NULL,
  action_details JSONB DEFAULT '{}'::JSONB,
  client_ip INET DEFAULT NULL,
  client_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    action, 
    performed_by, 
    target_resource, 
    details, 
    ip_address, 
    user_agent
  )
  VALUES (
    action_name,
    performed_by_uuid,
    target_resource_name,
    action_details,
    client_ip,
    client_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 14. Add function to log email events (helper for Edge Functions)
CREATE OR REPLACE FUNCTION log_email_event(
  event_type_name TEXT,
  recipient TEXT,
  email_subject TEXT DEFAULT NULL,
  template_name TEXT DEFAULT NULL,
  event_details JSONB DEFAULT '{}'::JSONB,
  error_msg TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO email_logs (
    event_type,
    recipient_email,
    subject,
    template_id,
    details,
    error_message
  )
  VALUES (
    event_type_name,
    recipient,
    email_subject,
    template_name,
    event_details,
    error_msg
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 15. Comments for documentation
COMMENT ON FUNCTION has_team_access(UUID, UUID) IS 'Check if a user has access to a specific team';
COMMENT ON FUNCTION is_admin(UUID) IS 'Check if a user is an admin';
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Check if a user is a super admin';
COMMENT ON FUNCTION log_admin_action(TEXT, UUID, TEXT, JSONB, INET, TEXT) IS 'Log admin actions for audit trail';
COMMENT ON FUNCTION log_email_event(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Log email events for monitoring';

COMMENT ON TABLE admin_users IS 'System administrators with elevated privileges';
COMMENT ON TABLE audit_logs IS 'Audit trail for administrative actions';
COMMENT ON TABLE email_logs IS 'Email delivery and failure tracking';