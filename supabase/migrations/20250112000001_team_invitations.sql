-- Team Invitations Table
-- Handles team member invitations with secure tokens and expiration

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_expires_at ON team_invitations(expires_at);

-- RLS Policies
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Team owners and admins can view invitations for their teams
CREATE POLICY "Team owners and admins can view invitations" ON team_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = team_invitations.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

-- Team owners and admins can create invitations
CREATE POLICY "Team owners and admins can create invitations" ON team_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = team_invitations.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
        AND invited_by = auth.uid()
    );

-- Team owners and admins can update invitation status
CREATE POLICY "Team owners and admins can update invitations" ON team_invitations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = team_invitations.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

-- Anyone with a valid token can view their invitation
CREATE POLICY "Users can view their own invitations by token" ON team_invitations
    FOR SELECT
    USING (token IS NOT NULL);

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR(255) AS $$
DECLARE
    token VARCHAR(255);
BEGIN
    -- Generate a secure random token
    token := encode(gen_random_bytes(32), 'hex');
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM team_invitations WHERE team_invitations.token = token) LOOP
        token := encode(gen_random_bytes(32), 'hex');
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set token on insert
CREATE OR REPLACE FUNCTION set_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token IS NULL THEN
        NEW.token := generate_invitation_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invitation_token_trigger
    BEFORE INSERT ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_token();

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token VARCHAR(255), user_id UUID)
RETURNS JSONB AS $$
DECLARE
    invitation RECORD;
    result JSONB;
BEGIN
    -- Find the invitation
    SELECT * INTO invitation
    FROM team_invitations
    WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    -- Check if invitation exists and is valid
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;
    
    -- Check if user already a member
    IF EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = invitation.team_id
        AND team_members.user_id = accept_team_invitation.user_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is already a team member'
        );
    END IF;
    
    -- Start transaction
    BEGIN
        -- Add user to team
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (invitation.team_id, accept_team_invitation.user_id, invitation.role);
        
        -- Update invitation status
        UPDATE team_invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = invitation.id;
        
        -- Return success with team info
        SELECT jsonb_build_object(
            'success', true,
            'team_id', invitation.team_id,
            'role', invitation.role
        ) INTO result;
        
        RETURN result;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Failed to accept invitation'
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE team_invitations
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger
CREATE TRIGGER update_team_invitations_updated_at
    BEFORE UPDATE ON team_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON team_invitations TO authenticated;
GRANT INSERT ON team_invitations TO authenticated;
GRANT UPDATE ON team_invitations TO authenticated;