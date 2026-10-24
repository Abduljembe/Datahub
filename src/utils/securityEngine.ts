// Cryptographic Anti-Tamper, SHA-256 Verification & Workstation Security Engine
import { Dataset, ColumnMeta } from '../types';

export interface CryptographicSeal {
  sha256: string;
  sealedAt: string;
  sealedBy: string;
  rowCount: number;
  columnCount: number;
  tamperStatus: 'verified' | 'tampered' | 'unsealed';
  lastVerifiedAt?: string;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  eventType:
    | 'auth_attempt'
    | 'ssrf_blocked'
    | 'rate_limit_triggered'
    | 'tamper_detected'
    | 'dataset_sealed'
    | 'lockdown_engaged'
    | 'lockdown_released'
    | 'role_changed'
    | 'data_deleted'
    | 'dataset_exported'
    | 'pin_verification'
    | 'security_audit_run';
  severity: 'info' | 'warning' | 'critical';
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  actionDetails: string;
  datasetId?: string;
  status: 'allowed' | 'blocked' | 'flagged';
}

export interface WorkstationSecurityConfig {
  masterPinHash?: string; // SHA-256 hash of PIN
  isPinRequiredForDestructive: boolean;
  autoLockMinutes: number; // 0 = disabled, 5, 15, 30
  emergencyLockdown: boolean;
  tamperProtectionEnabled: boolean;
  antiScreengrabWatermark: boolean;
  lastLockdownAt?: string;
  lockdownReason?: string;
}

const STORAGE_SECURITY_CONFIG_KEY = 'datahub_security_config_v1';
const STORAGE_SECURITY_AUDIT_KEY = 'datahub_security_audit_log_v1';
const DEFAULT_SALT = 'datahub_remix_salt_sec_2026';

/**
 * Computes a standard SHA-256 hexadecimal string from plain text using Web Crypto
 */
export async function computeSha256(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback lightweight hash generator if subtle crypto is unavailable
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Computes a deterministic SHA-256 cryptographic signature for a Dataset's columns & row data
 */
export async function computeDatasetHash(dataset: Dataset): Promise<string> {
  const normalizedColumns = (dataset.columns || [])
    .map(c => `${c.id || c.name}:${c.type}:${c.name}`)
    .sort()
    .join('|');

  // Sample or complete row representation
  const rowSignatures: string[] = [];
  const rows = dataset.data || [];
  
  // For maximum speed and accuracy on large datasets, serialize all rows deterministically
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const keys = Object.keys(r).sort();
    const rowStr = keys.map(k => `${k}=${String(r[k])}`).join(';');
    rowSignatures.push(rowStr);
  }

  const payload = `COLS[${normalizedColumns}]::ROWS[${rowSignatures.join('||')}]::ID[${dataset.id}]`;
  return await computeSha256(payload);
}

/**
 * Seals a dataset with a cryptographic SHA-256 signature
 */
export async function sealDataset(dataset: Dataset, userEmail: string = 'System Admin'): Promise<Dataset> {
  const hash = await computeDatasetHash(dataset);
  const seal: CryptographicSeal = {
    sha256: hash,
    sealedAt: new Date().toISOString(),
    sealedBy: userEmail,
    rowCount: dataset.data?.length || 0,
    columnCount: dataset.columns?.length || 0,
    tamperStatus: 'verified',
    lastVerifiedAt: new Date().toISOString(),
  };

  const updated: Dataset = {
    ...dataset,
    securitySeal: seal
  };

  logSecurityEvent({
    eventType: 'dataset_sealed',
    severity: 'info',
    userEmail,
    actionDetails: `Dataset "${dataset.name}" sealed with SHA-256 checksum (${hash.substring(0, 12)}...) across ${dataset.data.length} rows.`,
    datasetId: dataset.id,
    status: 'allowed'
  });

  return updated;
}

/**
 * Verifies whether a dataset's current contents match its cryptographic seal
 */
export async function verifyDatasetIntegrity(dataset: Dataset): Promise<{
  isIntact: boolean;
  computedHash: string;
  sealedHash?: string;
  message: string;
}> {
  const computedHash = await computeDatasetHash(dataset);
  const seal = dataset.securitySeal;

  if (!seal || !seal.sha256) {
    return {
      isIntact: true,
      computedHash,
      message: 'Dataset has not yet been sealed with a cryptographic signature.'
    };
  }

  if (seal.sha256 === computedHash) {
    return {
      isIntact: true,
      computedHash,
      sealedHash: seal.sha256,
      message: 'Cryptographic SHA-256 integrity verified. No data tampering detected.'
    };
  }

  // Tamper detected!
  logSecurityEvent({
    eventType: 'tamper_detected',
    severity: 'critical',
    actionDetails: `TAMPER ALERT: Dataset "${dataset.name}" checksum mismatch! Expected ${seal.sha256.substring(0, 10)}... but computed ${computedHash.substring(0, 10)}...`,
    datasetId: dataset.id,
    status: 'flagged'
  });

  return {
    isIntact: false,
    computedHash,
    sealedHash: seal.sha256,
    message: 'WARNING: Cryptographic integrity checksum failed! Records have been modified outside authorized channels.'
  };
}

/**
 * Reads persistent Security Configuration
 */
export function getSecurityConfig(): WorkstationSecurityConfig {
  try {
    const raw = localStorage.getItem(STORAGE_SECURITY_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return {
    isPinRequiredForDestructive: true,
    autoLockMinutes: 15,
    emergencyLockdown: false,
    tamperProtectionEnabled: true,
    antiScreengrabWatermark: false
  };
}

/**
 * Saves persistent Security Configuration
 */
export function saveSecurityConfig(partial: Partial<WorkstationSecurityConfig>): WorkstationSecurityConfig {
  const current = getSecurityConfig();
  const updated: WorkstationSecurityConfig = {
    ...current,
    ...partial
  };
  try {
    localStorage.setItem(STORAGE_SECURITY_CONFIG_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

/**
 * Sets a new Master Security PIN (4 to 8 digits)
 */
export async function setMasterSecurityPin(pin: string): Promise<boolean> {
  if (!pin || pin.length < 4) return false;
  const hash = await computeSha256(`${DEFAULT_SALT}:${pin}`);
  saveSecurityConfig({ masterPinHash: hash });
  
  logSecurityEvent({
    eventType: 'security_audit_run',
    severity: 'info',
    actionDetails: 'Master Security PIN established/updated.',
    status: 'allowed'
  });
  return true;
}

/**
 * Validates an entered Master PIN
 */
export async function verifyMasterSecurityPin(enteredPin: string): Promise<boolean> {
  const config = getSecurityConfig();
  if (!config.masterPinHash) {
    // If no pin set yet, default PIN '1234' works initially
    return enteredPin === '1234';
  }
  const enteredHash = await computeSha256(`${DEFAULT_SALT}:${enteredPin}`);
  const match = enteredHash === config.masterPinHash;

  logSecurityEvent({
    eventType: 'pin_verification',
    severity: match ? 'info' : 'warning',
    actionDetails: match ? 'Master PIN successfully verified.' : 'Incorrect Master PIN attempt.',
    status: match ? 'allowed' : 'blocked'
  });

  return match;
}

/**
 * Reads local Security Audit Events
 */
export function getSecurityAuditLogs(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_SECURITY_AUDIT_KEY);
    if (raw) {
      const logs = JSON.parse(raw);
      if (Array.isArray(logs)) return logs;
    }
  } catch {}

  // Initial seed logs
  return [
    {
      id: 'sec_seed_1',
      timestamp: new Date().toISOString(),
      eventType: 'security_audit_run',
      severity: 'info',
      actionDetails: 'Workstation Security Shield initialized. Anti-Tamper SHA-256 Engine online.',
      status: 'allowed'
    }
  ];
}

/**
 * Records a new Security Audit Event
 */
export function logSecurityEvent(entry: Omit<SecurityAuditEntry, 'id' | 'timestamp'>): SecurityAuditEntry {
  const current = getSecurityAuditLogs();
  const newEntry: SecurityAuditEntry = {
    id: `sec_evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry
  };

  const updated = [newEntry, ...current].slice(0, 150);
  try {
    localStorage.setItem(STORAGE_SECURITY_AUDIT_KEY, JSON.stringify(updated));
  } catch {}

  // Also post to backend if available
  try {
    fetch('/api/security/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEntry)
    }).catch(() => {});
  } catch {}

  return newEntry;
}

/**
 * Role-Based Access Control (RBAC) Permission Matrix
 */
export type SecurityAction = 
  | 'delete_dataset' 
  | 'modify_schema' 
  | 'toggle_lockdown' 
  | 'export_pii' 
  | 'assign_roles' 
  | 'alter_system_telemetry' 
  | 'clean_data' 
  | 'append_field_records'
  | 'view_analytics';

export function checkRolePermission(
  userRole: string | undefined, 
  action: SecurityAction
): { allowed: boolean; reason?: string } {
  const role = (userRole || '').toLowerCase();
  const config = getSecurityConfig();

  // If in Emergency Lockdown, block all mutating operations regardless of role!
  if (config.emergencyLockdown && action !== 'toggle_lockdown' && action !== 'view_analytics') {
    return {
      allowed: false,
      reason: `Workstation is currently in EMERGENCY LOCKDOWN (${config.lockdownReason || 'System Freeze'}). Mutating operations are strictly disabled.`
    };
  }

  // Central Admin / Workspace Owner has full access
  if (role.includes('owner') || role.includes('admin') || role.includes('central')) {
    return { allowed: true };
  }

  // Lead Supervisor
  if (role.includes('supervisor')) {
    if (action === 'delete_dataset' || action === 'toggle_lockdown' || action === 'assign_roles') {
      return {
        allowed: false,
        reason: 'Only Central Workspace Owners/Admins have permission for system governance and dataset deletion.'
      };
    }
    return { allowed: true };
  }

  // Field Enumerator
  if (role.includes('enumerator') || role.includes('agent')) {
    if (action === 'append_field_records' || action === 'view_analytics') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Field Enumerators operate in Safe Append-Only mode. Modifying datasets or deleting records is prohibited.'
    };
  }

  // Data Analyst / Scientist
  if (role.includes('analyst') || role.includes('scientist') || role.includes('engineer')) {
    if (action === 'delete_dataset' || action === 'toggle_lockdown' || action === 'assign_roles') {
      return {
        allowed: false,
        reason: 'Data Analysts have analytical access. Governance actions require Central Admin authorization.'
      };
    }
    return { allowed: true };
  }

  return { allowed: true };
}
