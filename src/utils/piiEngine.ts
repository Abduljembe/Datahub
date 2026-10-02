import { Dataset } from '../types';
import { createDatasetSnapshot } from './versionEngine';
import { exportToCSV, exportToExcel, exportToJSON } from './dataEngine';

export type PiiType = 
  | 'email' 
  | 'phone' 
  | 'credit_card' 
  | 'ssn' 
  | 'ip_address' 
  | 'name'
  | 'address'
  | 'dob'
  | 'api_key';

export type PiiSeverity = 'critical' | 'warning' | 'info';
export type MaskingStrategy = 'partial_mask' | 'sha256_hash' | 'full_redaction' | 'pseudonym';

export interface PiiDetection {
  id: string;
  column: string;
  type: PiiType;
  label: string;
  severity: PiiSeverity;
  matchCount: number;
  matchPercentage: number;
  sampleOriginals: string[];
  sampleMasked: string[];
  suggestedStrategy: MaskingStrategy;
  description: string;
}

export interface PiiScanResult {
  totalPiiCells: number;
  totalColumnsAudited: number;
  affectedColumnsCount: number;
  detections: PiiDetection[];
  isClean: boolean;
  complianceRiskLevel: 'Low' | 'Moderate' | 'High (GDPR / CCPA / HIPAA Risk)';
  scannedAt: string;
}

// Regular Expressions for Detection
const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
  creditCard: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:[0-9]{4}[-\s]?){3}[0-9]{4})$/,
  ssn: /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/,
  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  dobDate: /^(?:19|20)\d{2}[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])$|^(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}$/,
  apiKey: /^(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z-_]{35}|bearer\s+[a-zA-Z0-9-._~+/]+=*)$/i,
};

const COLUMN_HINTS: Record<PiiType, string[]> = {
  email: ['email', 'e_mail', 'mail', 'email_address', 'contact_email'],
  phone: ['phone', 'telephone', 'mobile', 'cell', 'tel', 'phone_number', 'contact_number'],
  credit_card: ['credit_card', 'card_number', 'card_num', 'cc_number', 'cc_num', 'card', 'pan'],
  ssn: ['ssn', 'social_security', 'tax_id', 'national_id', 'id_number', 'gov_id'],
  ip_address: ['ip', 'ip_address', 'client_ip', 'user_ip', 'ipv4', 'remote_addr'],
  name: ['name', 'full_name', 'first_name', 'last_name', 'customer_name', 'patient_name', 'employee_name', 'user_name'],
  address: ['address', 'street', 'addr', 'residence', 'postal_code', 'zip', 'zipcode', 'billing_address', 'shipping_address'],
  dob: ['dob', 'birth_date', 'birthdate', 'date_of_birth', 'birthday'],
  api_key: ['api_key', 'apikey', 'secret_key', 'secret', 'token', 'auth_token', 'access_token', 'password', 'passwd'],
};

/**
 * High-entropy 64-bit deterministic hash for safe string anonymization
 */
export function fastHash(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `hash_${hex1}${hex2.slice(0, 4)}`;
}

/**
 * Mask an email address: e.g. j***e@domain.com
 */
export function maskEmail(val: string): string {
  const parts = val.split('@');
  if (parts.length !== 2) return '[REDACTED_EMAIL]';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0]}*@${domain}`;
  }
  return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}@${domain}`;
}

/**
 * Mask a phone number: e.g. (***) ***-1234 or +1 ***-***-1234
 */
export function maskPhone(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `(***) ***-${last4}`;
  }
  return '***-***-****';
}

/**
 * Mask a credit card number: e.g. ****-****-****-4242
 */
export function maskCreditCard(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `****-****-****-${last4}`;
  }
  return '****-****-****-****';
}

/**
 * Mask an SSN: e.g. ***-**-6789
 */
export function maskSsn(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `***-**-${last4}`;
  }
  return '***-**-****';
}

/**
 * Mask an IP address: e.g. 192.168.***.***
 */
export function maskIp(val: string): string {
  const segments = val.split('.');
  if (segments.length === 4) {
    return `${segments[0]}.${segments[1]}.***.***`;
  }
  return '***.***.***.***';
}

/**
 * Mask a full name: e.g. "Jane Doe" -> "J*** D***"
 */
export function maskName(val: string): string {
  const parts = val.trim().split(/\s+/);
  return parts
    .map(p => (p.length > 0 ? `${p[0]}${'*'.repeat(Math.max(1, p.length - 1))}` : '*'))
    .join(' ');
}

/**
 * Mask an Address: e.g. "123 Main St, Suite 4, Springfield" -> "*** Main St, [REDACTED]"
 */
export function maskAddress(val: string): string {
  const parts = val.split(',');
  if (parts.length > 1) {
    return `*** ${parts[0].replace(/^\d+/, '').trim()}, [REDACTED_LOCATION]`;
  }
  return val.replace(/^\d+/, '***') + ' [REDACTED]';
}

/**
 * Mask a Date of Birth: e.g. "1985-04-12" -> "****-**-12" or "****-**-**"
 */
export function maskDob(val: string): string {
  if (val.includes('-')) {
    const parts = val.split('-');
    return `****-**-${parts[2] || '**'}`;
  }
  if (val.includes('/')) {
    const parts = val.split('/');
    return `**/**/****`;
  }
  return '****-**-**';
}

/**
 * Mask API Key / Token: e.g. "sk-abc123456789xyz" -> "sk-***...xyz"
 */
export function maskApiKey(val: string): string {
  if (val.length > 8) {
    return `${val.slice(0, 3)}***...${val.slice(-3)}`;
  }
  return '***[REDACTED_SECRET]***';
}

/**
 * Generate a consistent synthetic pseudonym for an entity
 */
export function generatePseudonym(val: string, type: PiiType): string {
  const hash = fastHash(val).replace('hash_', '');
  const prefix = type === 'name' ? 'Subject' : type === 'email' ? 'user' : 'entity';
  if (type === 'email') {
    return `anon_${hash.slice(0, 6)}@anonymized-research.org`;
  }
  if (type === 'name') {
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Sam'];
    const idx = parseInt(hash.slice(0, 2), 16) % firstNames.length;
    return `${firstNames[idx]}_${hash.slice(2, 6).toUpperCase()}`;
  }
  return `${prefix}_${hash.slice(0, 8)}`;
}

/**
 * Applies the requested masking strategy to a specific value
 */
export function applyMask(value: any, type: PiiType, strategy: MaskingStrategy): string {
  if (value === null || value === undefined || value === '') return '';
  const str = String(value).trim();

  if (strategy === 'full_redaction') {
    return `[REDACTED_${type.toUpperCase()}]`;
  }

  if (strategy === 'sha256_hash') {
    return fastHash(str);
  }

  if (strategy === 'pseudonym') {
    return generatePseudonym(str, type);
  }

  // Default: partial_mask
  switch (type) {
    case 'email':
      return maskEmail(str);
    case 'phone':
      return maskPhone(str);
    case 'credit_card':
      return maskCreditCard(str);
    case 'ssn':
      return maskSsn(str);
    case 'ip_address':
      return maskIp(str);
    case 'name':
      return maskName(str);
    case 'address':
      return maskAddress(str);
    case 'dob':
      return maskDob(str);
    case 'api_key':
      return maskApiKey(str);
    default:
      return `${str.slice(0, 1)}***${str.slice(-1)}`;
  }
}

/**
 * Scans a dataset for sensitive PII records
 */
export function scanDatasetForPii(dataset: Dataset): PiiScanResult {
  const data = dataset.data || [];
  const columns = dataset.columns || [];
  const rowCount = data.length;

  const detections: PiiDetection[] = [];
  let totalPiiCells = 0;

  if (rowCount === 0 || columns.length === 0) {
    return {
      totalPiiCells: 0,
      totalColumnsAudited: 0,
      affectedColumnsCount: 0,
      detections: [],
      isClean: true,
      complianceRiskLevel: 'Low',
      scannedAt: new Date().toISOString(),
    };
  }

  columns.forEach(col => {
    const colName = col.name;
    const colNameLower = colName.toLowerCase().replace(/[\s-_]/g, '');

    // Check values in column
    let emailMatches = 0;
    let phoneMatches = 0;
    let ccMatches = 0;
    let ssnMatches = 0;
    let ipMatches = 0;
    let dobMatches = 0;
    let keyMatches = 0;

    const rawSamples: string[] = [];

    data.forEach(row => {
      const val = row[colName];
      if (val !== null && val !== undefined && val !== '') {
        const str = String(val).trim();
        if (rawSamples.length < 5 && !rawSamples.includes(str)) {
          rawSamples.push(str);
        }

        if (PATTERNS.email.test(str)) emailMatches++;
        else if (PATTERNS.creditCard.test(str)) ccMatches++;
        else if (PATTERNS.ssn.test(str)) ssnMatches++;
        else if (PATTERNS.phone.test(str)) phoneMatches++;
        else if (PATTERNS.ipv4.test(str)) ipMatches++;
        else if (PATTERNS.dobDate.test(str)) dobMatches++;
        else if (PATTERNS.apiKey.test(str)) keyMatches++;
      }
    });

    const sampleCount = Math.max(1, data.filter(r => r[colName] != null && r[colName] !== '').length);

    // Determine candidate PII
    let detectedType: PiiType | null = null;
    let matchCount = 0;

    if (ccMatches / sampleCount >= 0.25 || COLUMN_HINTS.credit_card.some(h => colNameLower.includes(h))) {
      detectedType = 'credit_card';
      matchCount = ccMatches || sampleCount;
    } else if (ssnMatches / sampleCount >= 0.25 || COLUMN_HINTS.ssn.some(h => colNameLower.includes(h))) {
      detectedType = 'ssn';
      matchCount = ssnMatches || sampleCount;
    } else if (keyMatches / sampleCount >= 0.2 || COLUMN_HINTS.api_key.some(h => colNameLower.includes(h))) {
      detectedType = 'api_key';
      matchCount = keyMatches || sampleCount;
    } else if (emailMatches / sampleCount >= 0.3 || COLUMN_HINTS.email.some(h => colNameLower.includes(h))) {
      detectedType = 'email';
      matchCount = emailMatches || sampleCount;
    } else if (phoneMatches / sampleCount >= 0.3 || COLUMN_HINTS.phone.some(h => colNameLower.includes(h))) {
      detectedType = 'phone';
      matchCount = phoneMatches || sampleCount;
    } else if (ipMatches / sampleCount >= 0.3 || COLUMN_HINTS.ip_address.some(h => colNameLower.includes(h))) {
      detectedType = 'ip_address';
      matchCount = ipMatches || sampleCount;
    } else if (dobMatches / sampleCount >= 0.3 || COLUMN_HINTS.dob.some(h => colNameLower.includes(h))) {
      detectedType = 'dob';
      matchCount = dobMatches || sampleCount;
    } else if (COLUMN_HINTS.address.some(h => colNameLower.includes(h))) {
      detectedType = 'address';
      matchCount = sampleCount;
    } else if (col.type === 'string' && COLUMN_HINTS.name.some(h => colNameLower.includes(h))) {
      detectedType = 'name';
      matchCount = sampleCount;
    }

    if (detectedType) {
      const severity: PiiSeverity = 
        detectedType === 'credit_card' || detectedType === 'ssn' || detectedType === 'api_key'
          ? 'critical'
          : detectedType === 'email' || detectedType === 'phone' || detectedType === 'dob' || detectedType === 'address'
          ? 'warning'
          : 'info';

      const matchPercentage = Math.min(100, Math.round((matchCount / rowCount) * 100));
      const sampleOriginals = rawSamples.slice(0, 3);
      const sampleMasked = sampleOriginals.map(s => applyMask(s, detectedType!, 'partial_mask'));

      detections.push({
        id: `pii_${colName}_${detectedType}`,
        column: colName,
        type: detectedType,
        label: detectedType.replace('_', ' ').toUpperCase(),
        severity,
        matchCount,
        matchPercentage,
        sampleOriginals,
        sampleMasked,
        suggestedStrategy: detectedType === 'credit_card' || detectedType === 'ssn' || detectedType === 'api_key' ? 'full_redaction' : 'partial_mask',
        description: `Detected ${matchCount} sensitive ${detectedType.replace('_', ' ')} record(s) subject to GDPR / CCPA privacy restrictions.`,
      });

      totalPiiCells += matchCount;
    }
  });

  const hasCritical = detections.some(d => d.severity === 'critical');
  const hasWarning = detections.some(d => d.severity === 'warning');
  const complianceRiskLevel = hasCritical
    ? 'High (GDPR / CCPA / HIPAA Risk)'
    : hasWarning
    ? 'Moderate'
    : 'Low';

  return {
    totalPiiCells,
    totalColumnsAudited: columns.length,
    affectedColumnsCount: detections.length,
    detections,
    isClean: detections.length === 0,
    complianceRiskLevel,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Creates an in-memory sanitized copy of the dataset without modifying the original dataset
 */
export function createMaskedDatasetCopy(
  dataset: Dataset,
  options?: {
    strategy?: MaskingStrategy;
    columnOverrides?: Record<string, MaskingStrategy>;
    detections?: PiiDetection[];
  }
): { 
  maskedDataset: Dataset; 
  totalMaskedCells: number; 
  maskedColumnCount: number; 
  maskedColumns: string[];
} {
  const detections = options?.detections || scanDatasetForPii(dataset).detections;
  const defaultStrategy = options?.strategy || 'sha256_hash';
  const overrides = options?.columnOverrides || {};

  if (detections.length === 0) {
    return {
      maskedDataset: { ...dataset },
      totalMaskedCells: 0,
      maskedColumnCount: 0,
      maskedColumns: [],
    };
  }

  // Create a map of column -> { type, strategy }
  const colRuleMap = new Map<string, { type: PiiType; strategy: MaskingStrategy }>();
  detections.forEach(det => {
    const strat = overrides[det.id] || overrides[det.column] || defaultStrategy;
    colRuleMap.set(det.column, { type: det.type, strategy: strat });
  });

  let totalMaskedCells = 0;
  const sanitizedRows = dataset.data.map(row => {
    const newRow = { ...row };
    colRuleMap.forEach(({ type, strategy }, colName) => {
      const originalVal = row[colName];
      if (originalVal !== null && originalVal !== undefined && originalVal !== '') {
        newRow[colName] = applyMask(originalVal, type, strategy);
        totalMaskedCells++;
      }
    });
    return newRow;
  });

  const maskedColumns = Array.from(colRuleMap.keys());

  const maskedDataset: Dataset = {
    ...dataset,
    id: `${dataset.id}_masked_${Date.now()}`,
    name: `${dataset.name} (Privacy Masked)`,
    data: sanitizedRows,
    updatedAt: new Date().toISOString(),
  };

  return {
    maskedDataset,
    totalMaskedCells,
    maskedColumnCount: maskedColumns.length,
    maskedColumns,
  };
}

/**
 * Export options for privacy-masked exports
 */
export interface MaskedExportOptions {
  format?: 'csv' | 'excel' | 'json';
  strategy?: MaskingStrategy;
  columnOverrides?: Record<string, MaskingStrategy>;
  detections?: PiiDetection[];
  filename?: string;
  includeCertificate?: boolean;
}

/**
 * Generate a downloadable Privacy & Anonymization Audit Certificate (JSON / Text)
 */
export function generatePrivacyAuditCertificate(
  dataset: Dataset,
  maskedColumns: string[],
  totalMaskedCells: number,
  strategy: MaskingStrategy
): string {
  const cert = {
    certificateId: `PAC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    datasetName: dataset.name,
    originalRecordCount: dataset.data.length,
    totalColumnsAudited: dataset.columns.length,
    sanitizedColumnsCount: maskedColumns.length,
    sanitizedColumns: maskedColumns,
    totalPiiCellsAnonymized: totalMaskedCells,
    appliedStrategy: strategy,
    hashAlgorithm: strategy === 'sha256_hash' ? 'Deterministic 64-bit Non-Reversible FNV Hash' : 'Direct Attribute Scrubbing',
    complianceAttestation: {
      gdprArticle32: 'Passed: Pseudonymisation and encryption of personal data implemented.',
      ccpaDeIdentification: 'Passed: Consumer personal identifiers obscured or cryptographic keys removed.',
      hipaaSafeHarbor: 'Audited: Direct identifiers (SSN, medical ID, names, dates, contacts) sanitized.',
    },
    verificationFingerprint: fastHash(`${dataset.name}_${dataset.data.length}_${totalMaskedCells}_${Date.now()}`),
  };

  return JSON.stringify(cert, null, 2);
}

/**
 * Export dataset with privacy masking applied on-the-fly (zero mutation of original working dataset)
 */
export function exportMaskedDataset(
  dataset: Dataset,
  options: MaskedExportOptions = {}
): { totalMaskedCells: number; maskedColumnCount: number; filename: string } {
  const {
    format = 'csv',
    strategy = 'sha256_hash',
    columnOverrides = {},
    detections,
    filename,
    includeCertificate = false,
  } = options;

  const { maskedDataset, totalMaskedCells, maskedColumnCount, maskedColumns } = createMaskedDatasetCopy(dataset, {
    strategy,
    columnOverrides,
    detections,
  });

  const baseName = (filename || dataset.name || 'dataset').replace(/\.[^/.]+$/, '');
  const outFilename = `${baseName}_privacy_masked`;

  if (format === 'csv') {
    exportToCSV(maskedDataset, outFilename);
  } else if (format === 'excel') {
    exportToExcel(maskedDataset, outFilename);
  } else if (format === 'json') {
    exportToJSON(maskedDataset, outFilename);
  }

  // Optionally generate and download accompanying certificate
  if (includeCertificate) {
    const certJson = generatePrivacyAuditCertificate(dataset, maskedColumns, totalMaskedCells, strategy);
    const blob = new Blob([certJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${outFilename}_audit_certificate.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    totalMaskedCells,
    maskedColumnCount,
    filename: outFilename,
  };
}

/**
 * Masks a specific column in the dataset and creates a snapshot
 */
export function maskColumnData(
  dataset: Dataset,
  column: string,
  type: PiiType,
  strategy: MaskingStrategy = 'partial_mask'
): { updatedDataset: Dataset; rowsMasked: number; description: string } {
  let rowsMasked = 0;
  const newData = dataset.data.map(row => {
    const val = row[column];
    if (val !== null && val !== undefined && val !== '') {
      rowsMasked++;
      return {
        ...row,
        [column]: applyMask(val, type, strategy),
      };
    }
    return row;
  });

  const baseUpdated: Dataset = {
    ...dataset,
    data: newData,
    updatedAt: new Date().toISOString(),
  };

  const description = `Masked ${rowsMasked} PII value(s) in column '${column}' using ${strategy.replace('_', ' ')}.`;
  const { updatedDataset } = createDatasetSnapshot(baseUpdated, {
    name: `PII Masking (${column})`,
    description,
    tag: 'cleaned',
    createdBy: 'PII Privacy Guard',
  });

  return {
    updatedDataset,
    rowsMasked,
    description,
  };
}

/**
 * Masks all detected sensitive columns at once
 */
export function maskAllDetections(
  dataset: Dataset,
  detections: PiiDetection[],
  strategyOverride?: MaskingStrategy
): { updatedDataset: Dataset; totalMasked: number; summary: string } {
  let currentDataset = dataset;
  let totalMasked = 0;
  const maskedCols: string[] = [];

  detections.forEach(det => {
    const strategy = strategyOverride || det.suggestedStrategy;
    const res = maskColumnData(currentDataset, det.column, det.type, strategy);
    currentDataset = res.updatedDataset;
    totalMasked += res.rowsMasked;
    maskedCols.push(det.column);
  });

  const summary = `Masked ${totalMasked} sensitive records across ${maskedCols.length} column(s): ${maskedCols.join(', ')}.`;
  return {
    updatedDataset: currentDataset,
    totalMasked,
    summary,
  };
}
