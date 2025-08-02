-- Team Invitations Table
-- Allows teams to invite users via email

-- Create team_invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON team_invitations(expires_at);

-- RLS Policies
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Team owners and admins can view invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can create invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can delete invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitation with valid token" ON team_invitations;

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

-- Team owners and admins can update invitations
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

-- Team owners and admins can delete invitations
CREATE POLICY "Team owners and admins can delete invitations" ON team_invitations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = team_invitations.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('owner', 'admin')
        )
    );

-- Anyone with a valid token can view their invitation
CREATE POLICY "Users can view invitation with valid token" ON team_invitations
    FOR SELECT
    USING (
        token IS NOT NULL
        AND expires_at > NOW()
        AND status = 'pending'
    );

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(invitation_token TEXT)
RETURNS JSON AS $$
DECLARE
    invitation_record team_invitations;
    user_email TEXT;
    result JSON;
BEGIN
    -- Get current user email
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    IF user_email IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User not authenticated');
    END IF;

    -- Find and validate invitation
    SELECT * INTO invitation_record
    FROM team_invitations
    WHERE token = invitation_token
    AND email = user_email
    AND status = 'pending'
    AND expires_at > NOW();

    IF invitation_record IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
    END IF;

    -- Check if user is already a team member
    IF EXISTS (
        SELECT 1 FROM team_members
        WHERE team_id = invitation_record.team_id
        AND user_id = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'User is already a team member');
    END IF;

    -- Add user to team
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (invitation_record.team_id, auth.uid(), invitation_record.role);

    -- Update invitation status
    UPDATE team_invitations
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = invitation_record.id;

    RETURN json_build_object(
        'success', true,
        'team_id', invitation_record.team_id,
        'role', invitation_record.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;