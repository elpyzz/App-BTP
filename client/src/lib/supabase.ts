import { supabase } from './supabaseClient';

// Permission interface and constants
export interface Permission {
  id: string;
  label: string;
  description?: string;
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
  { id: 'view_projects', label: 'Voir les chantiers', description: 'Accès en lecture aux projets' },
  { id: 'edit_projects', label: 'Modifier les chantiers', description: 'Modification des projets' },
  { id: 'view_quotes', label: 'Voir les devis', description: 'Accès en lecture aux devis' },
  { id: 'edit_quotes', label: 'Modifier les devis', description: 'Modification des devis' },
  { id: 'view_clients', label: 'Voir les clients', description: 'Accès aux informations clients' },
  { id: 'view_planning', label: 'Voir le planning', description: 'Accès au planning' },
  { id: 'view_analytics', label: 'Voir les analytics', description: 'Accès aux statistiques' }
];

export const PERMISSION_ROUTES: Record<string, string> = {
  'view_projects': '/team-dashboard/projects',
  'view_planning': '/team-dashboard/planning',
  'view_analytics': '/team-dashboard/analytics',
  'view_quotes': '/team-dashboard/quotes',
  'view_clients': '/team-dashboard/clients'
};

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: 'actif' | 'inactif';
  login_code: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  permissions: string[];
}

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Helper functions for permissions
export function hasPermission(member: TeamMember | null, permission: string): boolean {
  if (!member || !member.permissions) return false;
  return member.permissions.includes(permission);
}

export function getAuthorizedRoutes(member: TeamMember | null): string[] {
  if (!member || !member.permissions) return [];
  return member.permissions
    .map(permission => PERMISSION_ROUTES[permission])
    .filter(route => route !== undefined);
}

// Team Members functions
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'actif')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    return (data || []).map((member: any) => ({
      ...member,
      permissions: member.permissions || []
    }));
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<TeamMember | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const loginCode = member.login_code || Math.floor(100000 + Math.random() * 900000).toString();
    
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        ...member,
        login_code: loginCode,
        user_id: userId,
        permissions: member.permissions || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team member:', error);
      return null;
    }

    return {
      ...data,
      permissions: data.permissions || []
    };
  } catch (error) {
    console.error('Error creating team member:', error);
    return null;
  }
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('team_members')
      .update({
        ...updates,
        permissions: updates.permissions !== undefined ? updates.permissions : undefined,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating team member:', error);
      return null;
    }

    return {
      ...data,
      permissions: data.permissions || []
    };
  } catch (error) {
    console.error('Error updating team member:', error);
    return null;
  }
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting team member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting team member:', error);
    return false;
  }
}

export async function verifyTeamMemberCode(code: string, invitationToken?: string): Promise<TeamMember | null> {
  try {
    if (invitationToken) {
      const invitation = await getInvitationByToken(invitationToken);
      if (!invitation || !invitation.team_member_id) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', invitation.team_member_id)
        .eq('login_code', code)
        .eq('status', 'actif')
        .single();

      if (error || !data) return null;

      return {
        ...data,
        permissions: data.permissions || []
      };
    }

    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('login_code', code)
      .eq('status', 'actif')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      permissions: data.permissions || []
    };
  } catch (error) {
    console.error('Error verifying code:', error);
    return null;
  }
}


// Team Invitation functions
export interface TeamInvitation {
  id: string;
  user_id: string;
  team_member_id: string | null;
  email: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  updated_at: string;
}

function generateInvitationToken(): string {
  return crypto.randomUUID() + '-' + Date.now().toString(36);
}

export async function createTeamInvitation(
  teamMemberId: string,
  email: string
): Promise<{ invitation: TeamInvitation | null; inviteLink: string | null }> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        user_id: userId,
        team_member_id: teamMemberId,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return { invitation: null, inviteLink: null };
    }

    const inviteLink = `${window.location.origin}/invite/${token}`;
    return { invitation: data, inviteLink };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return { invitation: null, inviteLink: null };
  }
}

export async function getInvitationByToken(
  token: string
): Promise<TeamInvitation | null> {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error || !data) return null;

    // Vérifier si l'invitation a expiré
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting invitation:', error);
    return null;
  }
}

export async function markInvitationAsUsed(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .update({ used: true })
      .eq('token', token)
      .select()
      .single();

    if (error || !data) return false;
    return true;
  } catch (error) {
    console.error('Error marking invitation as used:', error);
    return false;
  }
}
