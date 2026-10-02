import { Coworker, SharedDatasetRecord, TeamActivityEvent, Dataset, ColumnMeta, CoworkerInvitation, UserProfile } from '../types';

export const INITIAL_COWORKERS: Coworker[] = [];

export const INITIAL_SHARED_DATASETS: SharedDatasetRecord[] = [];

export const INITIAL_TEAM_ACTIVITIES: TeamActivityEvent[] = [];

// Helper to get coworkers with local storage support
export function getSavedCoworkers(): Coworker[] {
  try {
    const saved = localStorage.getItem('datahub_coworkers_list');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

// Helper to save coworkers
export function saveCoworkers(coworkers: Coworker[]): void {
  try {
    localStorage.setItem('datahub_coworkers_list', JSON.stringify(coworkers));
  } catch (e) {
    console.warn(e);
  }
}

// Helper to get shared datasets
export function getSavedSharedDatasets(): SharedDatasetRecord[] {
  try {
    const saved = localStorage.getItem('datahub_shared_datasets');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

// Helper to save shared datasets
export function saveSharedDatasets(records: SharedDatasetRecord[]): void {
  try {
    localStorage.setItem('datahub_shared_datasets', JSON.stringify(records));
  } catch (e) {
    console.warn(e);
  }
}

// Helper to get team activities
export function getSavedTeamActivities(): TeamActivityEvent[] {
  try {
    const saved = localStorage.getItem('datahub_team_activities');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

// Helper to save team activities
export function saveTeamActivities(events: TeamActivityEvent[]): void {
  try {
    localStorage.setItem('datahub_team_activities', JSON.stringify(events));
  } catch (e) {
    console.warn(e);
  }
}

// Helper to get pending and accepted invitations
export function getSavedInvitations(): CoworkerInvitation[] {
  try {
    const saved = localStorage.getItem('datahub_coworker_invitations');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

// Helper to save invitations
export function saveInvitations(invitations: CoworkerInvitation[]): void {
  try {
    localStorage.setItem('datahub_coworker_invitations', JSON.stringify(invitations));
  } catch (e) {
    console.warn(e);
  }
}

// Add or update single invitation
export function saveSingleInvitation(invite: CoworkerInvitation): void {
  const existing = getSavedInvitations();
  const index = existing.findIndex(i => i.token === invite.token || i.id === invite.id);
  if (index >= 0) {
    existing[index] = invite;
  } else {
    existing.unshift(invite);
  }
  saveInvitations(existing);
}

// Find invitation by token
export function getInvitationByToken(token: string): CoworkerInvitation | null {
  const invitations = getSavedInvitations();
  return invitations.find(i => i.token.trim() === token.trim()) || null;
}

// Complete and activate coworker upon accepting invitation
export function acceptCoworkerInvitation(
  token: string, 
  userProfileUpdates: { name?: string; avatarUrl?: string; password?: string }
): { coworker: Coworker; userProfile: UserProfile } | null {
  const invitations = getSavedInvitations();
  const inviteIndex = invitations.findIndex(i => i.token === token);
  if (inviteIndex < 0) return null;

  const invite = invitations[inviteIndex];
  const now = new Date().toISOString();
  
  // Mark invite accepted
  invite.status = 'accepted';
  invite.acceptedAt = now;
  saveInvitations(invitations);

  // Update coworker directory
  const coworkers = getSavedCoworkers();
  const existingCwIndex = coworkers.findIndex(c => c.email.toLowerCase() === invite.email.toLowerCase());
  
  const finalName = userProfileUpdates.name?.trim() || invite.name;
  const finalAvatar = userProfileUpdates.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  const realCoworker: Coworker = {
    id: existingCwIndex >= 0 ? coworkers[existingCwIndex].id : `cw_${Date.now()}`,
    name: finalName,
    email: invite.email,
    role: invite.role,
    department: invite.department,
    avatarUrl: finalAvatar,
    status: 'online',
    currentActivity: 'Active workspace member · collaborating in DataHub',
    datasetsSharedCount: 0,
    joinedDate: 'Joined Today',
    location: 'Remote',
    skills: invite.skills || ['Analytics', 'SQL', 'Collaboration'],
    isRealUser: true,
    invitationToken: token,
    invitedAt: invite.createdAt,
    acceptedAt: now,
  };

  if (existingCwIndex >= 0) {
    coworkers[existingCwIndex] = realCoworker;
  } else {
    coworkers.unshift(realCoworker);
  }
  saveCoworkers(coworkers);

  // Create real UserProfile so they can be logged in
  const userProfile: UserProfile = {
    id: realCoworker.id,
    name: realCoworker.name,
    email: realCoworker.email,
    role: (invite.role.includes('Scientist') || invite.role.includes('Engineer') || invite.role.includes('Analyst') 
      ? invite.role as any 
      : 'Data Scientist'),
    organization: 'DataHub Analytics',
    plan: 'Enterprise',
    department: invite.department,
    avatarUrl: finalAvatar,
    approvalStatus: 'approved',
    emailVerified: true,
    authMethod: 'password',
    createdAt: now,
    lastLogin: now,
  };

  try {
    localStorage.setItem('datahub_auth_user', JSON.stringify(userProfile));
  } catch (e) {
    console.warn(e);
  }

  // Record team activity
  const activities = getSavedTeamActivities();
  const newActivity: TeamActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'invite_member',
    actorName: realCoworker.name,
    actorAvatar: realCoworker.avatarUrl,
    actorRole: realCoworker.role,
    targetName: invite.inviterName,
    timestamp: 'Just now',
    details: `${realCoworker.name} accepted the invitation from ${invite.inviterName} and joined the ${invite.department} workspace!`,
  };
  saveTeamActivities([newActivity, ...activities]);

  return { coworker: realCoworker, userProfile };
}

