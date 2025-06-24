import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createClient, validateTeamAccess, createErrorResponse } from '@/lib/auth/session';

interface TeamMemberResponse {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
  lastActive: string;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const teamId = searchParams.get('teamId');

    if (!projectId && !teamId) {
      return createErrorResponse('Project ID or Team ID is required', 400);
    }

    const supabase = createClient();

    let targetTeamId = teamId;

    // If projectId provided, get the team ID
    if (projectId && !teamId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('team_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return createErrorResponse('Project not found', 404);
      }

      targetTeamId = project.team_id;
    }

    // Validate team access
    const hasAccess = await validateTeamAccess(targetTeamId!, 'viewer');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    // Get team members with user details
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        role,
        joined_at,
        user_id,
        users:auth.users!user_id (
          id,
          email,
          raw_user_meta_data,
          last_sign_in_at
        )
      `)
      .eq('team_id', targetTeamId);

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return createErrorResponse('Failed to fetch team members', 500);
    }

    // Get current user info
    const currentUserData = teamMembers?.find(member => member.user_id === user.id);

    // Transform the data to match expected interface
    const members: TeamMemberResponse[] = (teamMembers || []).map(member => {
      const userData = member.users;
      const lastSignIn = userData?.last_sign_in_at;
      const isRecentlyActive = lastSignIn 
        ? new Date(lastSignIn) > new Date(Date.now() - 15 * 60 * 1000) // 15 minutes
        : false;

      return {
        id: member.user_id,
        email: userData?.email || '',
        fullName: userData?.raw_user_meta_data?.full_name || 
                 userData?.raw_user_meta_data?.name || 
                 userData?.email?.split('@')[0] || 
                 'Unknown User',
        avatar: userData?.raw_user_meta_data?.avatar_url || 
                userData?.raw_user_meta_data?.picture,
        role: member.role,
        isOnline: isRecentlyActive,
        lastActive: lastSignIn || member.joined_at,
      };
    });

    // Get team information
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, description, owner_id')
      .eq('id', targetTeamId)
      .single();

    // Get recent team activity
    const { data: recentActivity } = await supabase
      .from('user_events')
      .select(`
        id,
        user_id,
        event_type,
        event_data,
        created_at,
        users:auth.users!user_id (
          email,
          raw_user_meta_data
        )
      `)
      .in('user_id', members.map(m => m.id))
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      members,
      currentUser: currentUserData ? {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || 
                 user.user_metadata?.name || 
                 user.email?.split('@')[0] || 
                 'You',
        role: currentUserData.role,
        isOnline: true,
        lastActive: new Date().toISOString(),
      } : null,
      team: team || null,
      recentActivity: recentActivity || [],
      stats: {
        totalMembers: members.length,
        onlineMembers: members.filter(m => m.isOnline).length,
        roles: members.reduce((acc, member) => {
          acc[member.role] = (acc[member.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    // Parse request body
    const { teamId, email, role = 'member' } = await request.json();

    if (!teamId || !email) {
      return createErrorResponse('Team ID and email are required', 400);
    }

    // Validate team access (requires admin role)
    const hasAccess = await validateTeamAccess(teamId, 'admin');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions - admin role required', 403);
    }

    const supabase = createClient();

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking user:', userError);
      return createErrorResponse('Failed to check user existence', 500);
    }

    let userId: string;

    if (!existingUser) {
      // User doesn't exist, send invitation
      try {
        // Generate invitation link using admin functions
        const { data: inviteData, error: inviteError } = await supabase.functions.invoke(
          'admin-operations',
          {
            body: {
              action: 'invite_user',
              email,
              teamId,
              role,
              invitedBy: user.id,
            },
          }
        );

        if (inviteError) {
          console.error('Error sending invitation:', inviteError);
          return createErrorResponse('Failed to send invitation', 500);
        }

        return NextResponse.json({
          success: true,
          message: 'Invitation sent successfully',
          invitationSent: true,
          email,
          role,
        });

      } catch (error) {
        console.error('Error with invitation process:', error);
        return createErrorResponse('Failed to process invitation', 500);
      }
    } else {
      userId = existingUser.id;

      // Check if user is already a team member
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

      if (existingMembership) {
        return createErrorResponse('User is already a member of this team', 400);
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role,
        });

      if (memberError) {
        console.error('Error adding team member:', memberError);
        return createErrorResponse('Failed to add team member', 500);
      }

      // Log team member addition
      await supabase
        .from('user_events')
        .insert({
          user_id: user.id,
          event_type: 'team_member_added',
          event_data: {
            team_id: teamId,
            added_user_id: userId,
            added_user_email: email,
            role,
          },
        });

      // Send notification to the added user
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            template: 'team_member_added',
            to: email,
            data: {
              inviterName: user.email,
              teamId,
              role,
            },
          },
        });
      } catch (error) {
        console.error('Error sending notification email:', error);
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Team member added successfully',
        member: {
          id: userId,
          email,
          role,
          joinedAt: new Date().toISOString(),
        },
      });
    }

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Update team member role
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { teamId, userId, role } = await request.json();

    if (!teamId || !userId || !role) {
      return createErrorResponse('Team ID, user ID, and role are required', 400);
    }

    // Validate team access (requires admin role)
    const hasAccess = await validateTeamAccess(teamId, 'admin');
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions - admin role required', 403);
    }

    const supabase = createClient();

    // Prevent changing own role
    if (userId === user.id) {
      return createErrorResponse('You cannot change your own role', 400);
    }

    // Get team info to prevent removing the last owner
    if (role !== 'owner') {
      const { data: team } = await supabase
        .from('teams')
        .select('owner_id')
        .eq('id', teamId)
        .single();

      const { count: ownerCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('role', 'owner');

      if (team?.owner_id === userId && (ownerCount || 0) <= 1) {
        return createErrorResponse('Cannot remove the last owner from the team', 400);
      }
    }

    // Update member role
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating member role:', updateError);
      return createErrorResponse('Failed to update member role', 500);
    }

    // If promoting to owner, update team owner
    if (role === 'owner') {
      await supabase
        .from('teams')
        .update({ owner_id: userId })
        .eq('id', teamId);
    }

    // Log role change
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'team_member_role_changed',
        event_data: {
          team_id: teamId,
          target_user_id: userId,
          new_role: role,
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully',
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Remove team member
    const user = await getCurrentUser();
    if (!user) {
      return createErrorResponse('Authentication required', 401);
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const userId = searchParams.get('userId');

    if (!teamId || !userId) {
      return createErrorResponse('Team ID and user ID are required', 400);
    }

    // Validate team access (requires admin role or removing self)
    const isRemovingSelf = userId === user.id;
    const requiredRole = isRemovingSelf ? 'member' : 'admin';
    
    const hasAccess = await validateTeamAccess(teamId, requiredRole);
    if (!hasAccess) {
      return createErrorResponse('Insufficient permissions', 403);
    }

    const supabase = createClient();

    // Get member info
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return createErrorResponse('Team member not found', 404);
    }

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const { count: ownerCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('role', 'owner');

      if ((ownerCount || 0) <= 1) {
        return createErrorResponse('Cannot remove the last owner from the team', 400);
      }
    }

    // Remove team member
    const { error: removeError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (removeError) {
      console.error('Error removing team member:', removeError);
      return createErrorResponse('Failed to remove team member', 500);
    }

    // Log member removal
    await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: isRemovingSelf ? 'team_left' : 'team_member_removed',
        event_data: {
          team_id: teamId,
          removed_user_id: userId,
          removed_role: member.role,
        },
      });

    return NextResponse.json({
      success: true,
      message: isRemovingSelf 
        ? 'You have left the team successfully' 
        : 'Team member removed successfully',
    });

  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}