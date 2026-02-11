// Mock Supabase functions - Supabase désactivé, utilisation de localStorage

// Helper function to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const userStr = localStorage.getItem('mock_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.id || null;
  }
  return null;
}

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
  permissions: string[]; // Obligatoire
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

// Helper functions pour gérer les données mock
function getMockData(table: string): any[] {
  const key = `mock_${table}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveMockData(table: string, data: any[]): void {
  const key = `mock_${table}`;
  localStorage.setItem(key, JSON.stringify(data));
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const data = getMockData('team_members');
    return data
      .filter((member: TeamMember) => member.user_id === userId && member.status === 'actif')
      .map((member: TeamMember) => ({
        ...member,
        permissions: member.permissions || [] // Rétrocompatibilité
      }))
      .sort((a: TeamMember, b: TeamMember) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
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
    
    const newMember: TeamMember = {
      ...member,
      id: crypto.randomUUID(),
      login_code: loginCode,
      user_id: userId,
      permissions: member.permissions || [], // S'assurer que permissions existe
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const data = getMockData('team_members');
    data.push(newMember);
    saveMockData('team_members', data);

    return newMember;
  } catch (error) {
    console.error('Error creating team member:', error);
    return null;
  }
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const data = getMockData('team_members');
    const index = data.findIndex((member: TeamMember) => member.id === id && member.user_id === userId);
    
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updates,
      permissions: updates.permissions !== undefined ? updates.permissions : (data[index].permissions || []), // Préserver les permissions
      updated_at: new Date().toISOString(),
    };
    saveMockData('team_members', data);

    return data[index];
  } catch (error) {
    console.error('Error updating team member:', error);
    return null;
  }
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const data = getMockData('team_members');
    const filtered = data.filter((member: TeamMember) => !(member.id === id && member.user_id === userId));
    saveMockData('team_members', filtered);

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
      if (!invitation) return null;

      const data = getMockData('team_members');
      const member = data.find(
        (m: TeamMember) => m.id === invitation.team_member_id && m.login_code === code && m.status === 'actif'
      );
      if (member) {
        return {
          ...member,
          permissions: member.permissions || [] // Rétrocompatibilité
        };
      }
      return null;
    }

    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const data = getMockData('team_members');
    const member = data.find(
      (m: TeamMember) => m.login_code === code && m.status === 'actif' && m.user_id === userId
    );
    if (member) {
      return {
        ...member,
        permissions: member.permissions || [] // Rétrocompatibilité
      };
    }
    return null;
  } catch (error) {
    console.error('Error verifying code:', error);
    return null;
  }
}

// Admin code functions
export interface AdminCode {
  id: string;
  code: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function verifyAdminCode(code: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const data = getMockData('admin_codes');
    const adminCode = data.find((ac: AdminCode) => ac.code === code && ac.user_id === userId);
    return !!adminCode;
  } catch (error) {
    console.error('Error verifying admin code:', error);
    return false;
  }
}

export async function getAdminCode(): Promise<AdminCode | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const data = getMockData('admin_codes');
    const adminCode = data
      .filter((ac: AdminCode) => ac.user_id === userId)
      .sort((a: AdminCode, b: AdminCode) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
    return adminCode || null;
  } catch (error) {
    console.error('Error getting admin code:', error);
    return null;
  }
}

export async function updateAdminCode(newCode: string): Promise<AdminCode | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const existing = await getAdminCode();
    const data = getMockData('admin_codes');
    
    if (existing) {
      const index = data.findIndex((ac: AdminCode) => ac.id === existing.id);
      if (index !== -1) {
        data[index] = {
          ...data[index],
          code: newCode,
          updated_at: new Date().toISOString(),
        };
        saveMockData('admin_codes', data);
        return data[index];
      }
    }

    const newAdminCode: AdminCode = {
      id: crypto.randomUUID(),
      code: newCode,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.push(newAdminCode);
    saveMockData('admin_codes', data);

    return newAdminCode;
  } catch (error) {
    console.error('Error updating admin code:', error);
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

    const invitation: TeamInvitation = {
      id: crypto.randomUUID(),
      user_id: userId,
      team_member_id: teamMemberId,
      email: email,
      token: token,
      expires_at: expiresAt.toISOString(),
      used: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const data = getMockData('team_invitations');
    data.push(invitation);
    saveMockData('team_invitations', data);

    const inviteLink = `${window.location.origin}/invite/${token}`;

    return { invitation, inviteLink };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return { invitation: null, inviteLink: null };
  }
}

export async function getInvitationByToken(
  token: string
): Promise<TeamInvitation | null> {
  try {
    const data = getMockData('team_invitations');
    const invitation = data.find(
      (inv: TeamInvitation) => inv.token === token && !inv.used
    );

    if (!invitation) return null;

    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return invitation;
  } catch (error) {
    console.error('Error getting invitation:', error);
    return null;
  }
}

export async function markInvitationAsUsed(token: string): Promise<boolean> {
  try {
    const data = getMockData('team_invitations');
    const index = data.findIndex((inv: TeamInvitation) => inv.token === token);
    
    if (index === -1) return false;

    data[index] = {
      ...data[index],
      used: true,
      updated_at: new Date().toISOString(),
    };
    saveMockData('team_invitations', data);

    return true;
  } catch (error) {
    console.error('Error marking invitation as used:', error);
    return false;
  }
}
