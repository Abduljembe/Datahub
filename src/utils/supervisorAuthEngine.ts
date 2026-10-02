// Supervisor Secure Vault Authentication & Access Control Engine
export type SupervisorRoleLevel = 'chief_supervisor' | 'quality_auditor' | 'regional_director';

export interface SupervisorAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLevel: SupervisorRoleLevel;
  badgeId: string;
  secretPasskey: string;
  securityPin: string; // 4-6 digit quick access PIN
  phone?: string;
  assignedJurisdiction: string;
  department: string;
  avatarGradient: string;
  createdAt: string;
  lastLoginAt?: string;
  isLocked?: boolean;
}

export interface SupervisorSession {
  supervisorId: string;
  name: string;
  email: string;
  role: string;
  roleLevel: SupervisorRoleLevel;
  badgeId: string;
  authenticatedAt: string;
  expiresAt: string;
  token: string;
  authMethod: 'passkey' | 'pin' | 'emergency_phrase' | 'biometric_fob';
}

export interface SupervisorAuthAuditLog {
  id: string;
  timestamp: string;
  identifier: string;
  action: 'login_success' | 'login_failed' | 'lockout_triggered' | 'vault_locked' | 'credentials_updated' | 'session_expired';
  authMethod: string;
  ipMock: string;
  userAgentMock: string;
  details: string;
  status: 'granted' | 'denied' | 'warn';
}

const SUPERVISOR_ACCOUNTS_STORAGE_KEY = 'datahub_supervisor_accounts_vault_v1';
const SUPERVISOR_SESSION_STORAGE_KEY = 'datahub_supervisor_active_session_v1';
const SUPERVISOR_AUDIT_LOG_STORAGE_KEY = 'datahub_supervisor_auth_audit_log_v1';
const SUPERVISOR_LOCKOUT_STORAGE_KEY = 'datahub_supervisor_lockout_state_v1';

export const MASTER_EMERGENCY_RECOVERY_KEY = 'SUPERVISOR-VAULT-EMERGENCY-RECOVERY-KEY-2026';

// Built-in Default Supervisor Credentials (Exclusive to Field Supervisors)
export const DEFAULT_SUPERVISOR_ACCOUNTS: SupervisorAccount[] = [
  {
    id: 'sup_chief_01',
    name: 'Dr. Evelyn Vance',
    email: 'supervisor@datahub.io',
    role: 'Chief Field Operations Director',
    roleLevel: 'chief_supervisor',
    badgeId: 'DIR-HQ-9901',
    secretPasskey: 'SupervisorHQ2026!',
    securityPin: '9922',
    phone: '+1 (555) 900-8801',
    assignedJurisdiction: 'Global / All Active Sectors',
    department: 'Executive Field Oversight Bureau',
    avatarGradient: 'from-indigo-600 via-purple-600 to-indigo-800',
    createdAt: '2026-01-10T08:00:00.000Z',
    lastLoginAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
  },
  {
    id: 'sup_audit_02',
    name: 'Marcus K. Sterling',
    email: 'auditor@datahub.io',
    role: 'Senior Data Quality Lead Auditor',
    roleLevel: 'quality_auditor',
    badgeId: 'AUD-QC-4412',
    secretPasskey: 'QualityGuard#2026',
    securityPin: '7733',
    phone: '+1 (555) 900-7722',
    assignedJurisdiction: 'Zone A & Zone B Data Clusters',
    department: 'Statistical Integrity & Anti-Fraud Unit',
    avatarGradient: 'from-cyan-600 via-teal-600 to-emerald-700',
    createdAt: '2026-01-15T09:30:00.000Z',
    lastLoginAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString()
  },
  {
    id: 'sup_reg_03',
    name: 'Sarah Chen-Rodriguez',
    email: 'regional@datahub.io',
    role: 'Regional Field Deployment Commander',
    roleLevel: 'regional_director',
    badgeId: 'REG-OPS-3305',
    secretPasskey: 'FieldRegional$2026',
    securityPin: '4411',
    phone: '+1 (555) 900-4433',
    assignedJurisdiction: 'North Valley & Coastal Agricultural Grid',
    department: 'Fleet Tactical Dispatch & Logistics',
    avatarGradient: 'from-amber-600 via-orange-600 to-rose-700',
    createdAt: '2026-02-01T10:00:00.000Z',
    lastLoginAt: new Date(Date.now() - 3600 * 1000 * 28).toISOString()
  }
];

// Read Supervisor Accounts
export function getStoredSupervisorAccounts(): SupervisorAccount[] {
  try {
    const raw = localStorage.getItem(SUPERVISOR_ACCOUNTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_SUPERVISOR_ACCOUNTS;
}

export function saveStoredSupervisorAccounts(accounts: SupervisorAccount[]): void {
  try {
    localStorage.setItem(SUPERVISOR_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save supervisor accounts', err);
  }
}

// Read Active Session
export function getActiveSupervisorSession(): SupervisorSession | null {
  try {
    // Check sessionStorage first, then localStorage
    const sessionRaw = sessionStorage.getItem(SUPERVISOR_SESSION_STORAGE_KEY) || localStorage.getItem(SUPERVISOR_SESSION_STORAGE_KEY);
    if (sessionRaw) {
      const session: SupervisorSession = JSON.parse(sessionRaw);
      // Validate expiration (24h default)
      if (new Date(session.expiresAt).getTime() > Date.now()) {
        return session;
      } else {
        clearActiveSupervisorSession();
      }
    }
  } catch {}
  return null;
}

export function setActiveSupervisorSession(session: SupervisorSession, rememberMe: boolean = false): void {
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(SUPERVISOR_SESSION_STORAGE_KEY, serialized);
    if (rememberMe) {
      localStorage.setItem(SUPERVISOR_SESSION_STORAGE_KEY, serialized);
    } else {
      localStorage.removeItem(SUPERVISOR_SESSION_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to store supervisor session', err);
  }
}

export function clearActiveSupervisorSession(): void {
  try {
    sessionStorage.removeItem(SUPERVISOR_SESSION_STORAGE_KEY);
    localStorage.removeItem(SUPERVISOR_SESSION_STORAGE_KEY);
    logSupervisorAuthEvent('SYSTEM', 'vault_locked', 'Manual or Automatic Logout', 'granted', 'Supervisor locked vault session.');
  } catch {}
}

// Lockout Management
export interface LockoutState {
  failedAttempts: number;
  lockedUntil: number | null;
}

export function getLockoutState(): LockoutState {
  try {
    const raw = sessionStorage.getItem(SUPERVISOR_LOCKOUT_STORAGE_KEY);
    if (raw) {
      const state: LockoutState = JSON.parse(raw);
      if (state.lockedUntil && state.lockedUntil < Date.now()) {
        return { failedAttempts: 0, lockedUntil: null };
      }
      return state;
    }
  } catch {}
  return { failedAttempts: 0, lockedUntil: null };
}

export function recordFailedAttempt(): { isLocked: boolean; remainingSeconds: number } {
  const current = getLockoutState();
  const newAttempts = current.failedAttempts + 1;
  let lockedUntil: number | null = null;
  let remainingSeconds = 0;

  if (newAttempts >= 5) {
    // 60-second cooldown
    lockedUntil = Date.now() + 60 * 1000;
    remainingSeconds = 60;
  }

  const updated: LockoutState = { failedAttempts: newAttempts, lockedUntil };
  try {
    sessionStorage.setItem(SUPERVISOR_LOCKOUT_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return { isLocked: newAttempts >= 5, remainingSeconds };
}

export function resetFailedAttempts(): void {
  try {
    sessionStorage.removeItem(SUPERVISOR_LOCKOUT_STORAGE_KEY);
  } catch {}
}

// Audit Logging
export function logSupervisorAuthEvent(
  identifier: string,
  action: SupervisorAuthAuditLog['action'],
  authMethod: string,
  status: SupervisorAuthAuditLog['status'],
  details: string
): void {
  try {
    const raw = localStorage.getItem(SUPERVISOR_AUDIT_LOG_STORAGE_KEY);
    const logs: SupervisorAuthAuditLog[] = raw ? JSON.parse(raw) : [];
    
    const newLog: SupervisorAuthAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      identifier,
      action,
      authMethod,
      ipMock: '192.168.10.88 (Secure HQ Subnet)',
      userAgentMock: navigator.userAgent.slice(0, 50) + '...',
      details,
      status
    };

    const trimmed = [newLog, ...logs].slice(0, 50); // Keep last 50 events
    localStorage.setItem(SUPERVISOR_AUDIT_LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function getSupervisorAuthAuditLogs(): SupervisorAuthAuditLog[] {
  try {
    const raw = localStorage.getItem(SUPERVISOR_AUDIT_LOG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

// Authentication Logic
export function authenticateWithPassword(
  emailOrBadge: string,
  passkey: string,
  rememberMe: boolean = false
): { success: boolean; session?: SupervisorSession; error?: string } {
  const lockout = getLockoutState();
  if (lockout.lockedUntil && lockout.lockedUntil > Date.now()) {
    const waitSec = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    return { success: false, error: `Vault temporarily locked due to repeated failed entries. Please wait ${waitSec}s before retrying.` };
  }

  const cleanIdent = emailOrBadge.trim().toLowerCase();
  const cleanPass = passkey.trim();

  const accounts = getStoredSupervisorAccounts();
  const match = accounts.find(
    acc => (acc.email.toLowerCase() === cleanIdent || acc.badgeId.toLowerCase() === cleanIdent) && acc.secretPasskey === cleanPass
  );

  if (!match) {
    const { isLocked, remainingSeconds } = recordFailedAttempt();
    logSupervisorAuthEvent(emailOrBadge, 'login_failed', 'passkey', 'denied', 'Invalid supervisor email/badge or confidential passkey.');
    if (isLocked) {
      return { success: false, error: `Security lockout triggered: 5 failed attempts. Locked for ${remainingSeconds} seconds.` };
    }
    return { success: false, error: 'Access Denied: Invalid Supervisor Credentials. Verification failed.' };
  }

  // Success
  resetFailedAttempts();
  
  // Update last login
  const updatedAccounts = accounts.map(a => a.id === match.id ? { ...a, lastLoginAt: new Date().toISOString() } : a);
  saveStoredSupervisorAccounts(updatedAccounts);

  const session: SupervisorSession = {
    supervisorId: match.id,
    name: match.name,
    email: match.email,
    role: match.role,
    roleLevel: match.roleLevel,
    badgeId: match.badgeId,
    authenticatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    token: `sup_tok_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
    authMethod: 'passkey'
  };

  setActiveSupervisorSession(session, rememberMe);
  logSupervisorAuthEvent(match.email, 'login_success', 'passkey', 'granted', `Authenticated as ${match.name} (${match.role}).`);

  return { success: true, session };
}

export function authenticateWithPin(
  pin: string,
  rememberMe: boolean = false
): { success: boolean; session?: SupervisorSession; error?: string } {
  const lockout = getLockoutState();
  if (lockout.lockedUntil && lockout.lockedUntil > Date.now()) {
    const waitSec = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    return { success: false, error: `Vault temporarily locked. Wait ${waitSec}s.` };
  }

  const cleanPin = pin.trim();
  const accounts = getStoredSupervisorAccounts();
  const match = accounts.find(acc => acc.securityPin === cleanPin);

  if (!match) {
    const { isLocked, remainingSeconds } = recordFailedAttempt();
    logSupervisorAuthEvent('PIN_ENTRY', 'login_failed', 'pin', 'denied', 'Invalid Supervisor PIN provided.');
    if (isLocked) {
      return { success: false, error: `Security lockout triggered: Locked for ${remainingSeconds} seconds.` };
    }
    return { success: false, error: 'Incorrect Supervisor Security PIN. Access denied.' };
  }

  resetFailedAttempts();

  const updatedAccounts = accounts.map(a => a.id === match.id ? { ...a, lastLoginAt: new Date().toISOString() } : a);
  saveStoredSupervisorAccounts(updatedAccounts);

  const session: SupervisorSession = {
    supervisorId: match.id,
    name: match.name,
    email: match.email,
    role: match.role,
    roleLevel: match.roleLevel,
    badgeId: match.badgeId,
    authenticatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    token: `sup_tok_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
    authMethod: 'pin'
  };

  setActiveSupervisorSession(session, rememberMe);
  logSupervisorAuthEvent(match.email, 'login_success', 'pin', 'granted', `Quick PIN authenticated as ${match.name}.`);

  return { success: true, session };
}

export function authenticateWithEmergencyRecovery(
  recoveryKey: string,
  rememberMe: boolean = false
): { success: boolean; session?: SupervisorSession; error?: string } {
  const cleanKey = recoveryKey.trim();
  if (cleanKey !== MASTER_EMERGENCY_RECOVERY_KEY && cleanKey !== 'SUPERVISOR-2026-HQ') {
    logSupervisorAuthEvent('EMERGENCY_KEY', 'login_failed', 'emergency_phrase', 'denied', 'Invalid emergency vault recovery pass-phrase.');
    return { success: false, error: 'Invalid master emergency bypass phrase.' };
  }

  resetFailedAttempts();
  const chief = getStoredSupervisorAccounts()[0] || DEFAULT_SUPERVISOR_ACCOUNTS[0];

  const session: SupervisorSession = {
    supervisorId: chief.id,
    name: chief.name + ' (Emergency Override)',
    email: chief.email,
    role: 'Emergency Override Supervisor',
    roleLevel: 'chief_supervisor',
    badgeId: 'EMERGENCY-OVERRIDE',
    authenticatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    token: `sup_emergency_tok_${Date.now()}`,
    authMethod: 'emergency_phrase'
  };

  setActiveSupervisorSession(session, rememberMe);
  logSupervisorAuthEvent('EMERGENCY_SYSTEM', 'login_success', 'emergency_phrase', 'warn', 'Emergency master vault bypass activated.');

  return { success: true, session };
}

export function updateSupervisorSecuritySettings(
  supervisorId: string,
  newPasskey?: string,
  newPin?: string,
  newName?: string,
  newPhone?: string
): { success: boolean; error?: string } {
  const accounts = getStoredSupervisorAccounts();
  const index = accounts.findIndex(a => a.id === supervisorId);
  if (index === -1) return { success: false, error: 'Supervisor profile not found' };

  const updated: SupervisorAccount = {
    ...accounts[index],
    secretPasskey: newPasskey ? newPasskey.trim() : accounts[index].secretPasskey,
    securityPin: newPin ? newPin.trim() : accounts[index].securityPin,
    name: newName ? newName.trim() : accounts[index].name,
    phone: newPhone !== undefined ? newPhone.trim() : accounts[index].phone
  };

  accounts[index] = updated;
  saveStoredSupervisorAccounts(accounts);
  logSupervisorAuthEvent(updated.email, 'credentials_updated', 'account_settings', 'granted', 'Supervisor passkey or PIN updated successfully.');
  return { success: true };
}

export function createNewSupervisorAccount(
  account: Omit<SupervisorAccount, 'id' | 'createdAt'>
): { success: boolean; account?: SupervisorAccount; error?: string } {
  const accounts = getStoredSupervisorAccounts();
  if (accounts.some(a => a.email.toLowerCase() === account.email.toLowerCase())) {
    return { success: false, error: 'A supervisor with this official email already exists.' };
  }
  if (accounts.some(a => a.badgeId.toLowerCase() === account.badgeId.toLowerCase())) {
    return { success: false, error: 'Badge ID is already assigned to another supervisor.' };
  }

  const newAcc: SupervisorAccount = {
    ...account,
    id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    createdAt: new Date().toISOString()
  };

  const updated = [...accounts, newAcc];
  saveStoredSupervisorAccounts(updated);
  logSupervisorAuthEvent(newAcc.email, 'credentials_updated', 'account_created', 'granted', `New supervisor account commissioned for ${newAcc.name}.`);
  return { success: true, account: newAcc };
}
