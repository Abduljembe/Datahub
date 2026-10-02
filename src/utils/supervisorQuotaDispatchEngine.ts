// Dynamic Enumerator Quota, Form Version Dispatch & Revision Messaging Engine
import { EnumeratorAgent } from './enumeratorFleetEngine';

export interface DailyEnumeratorQuota {
  enumeratorId: string;
  targetSubmissions: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  deadlineTime: string; // e.g. '18:00'
  status: 'on_track' | 'lagging' | 'completed' | 'critical';
}

export interface SupervisorRevisionMessage {
  id: string;
  submissionId?: string;
  submissionCode?: string;
  enumeratorId: string;
  enumeratorName: string;
  senderName: string;
  senderBadgeId: string;
  subject: string;
  message: string;
  priority: 'urgent' | 'standard' | 'notice';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'resolved';
  requiresRevisit: boolean;
  fieldToCorrect?: string;
}

export interface LiveFormDeployment {
  formId: string;
  formTitle: string;
  version: string;
  publishedAt: string;
  targetCampaign: string;
  status: 'active' | 'draft' | 'deprecated';
  mandatoryQuestionsCount: number;
  gpsLockRequired: boolean;
  audioRecordingRequired: boolean;
  photoProofRequired: boolean;
  enforceMinimumDwellSeconds: number;
  deployedToCount: number;
}

const QUOTAS_STORAGE_KEY = 'datahub_supervisor_quotas_v1';
const REVISION_MESSAGES_STORAGE_KEY = 'datahub_supervisor_revisions_v1';
const FORM_DEPLOYMENTS_STORAGE_KEY = 'datahub_supervisor_forms_v1';

export const DEFAULT_FORM_DEPLOYMENTS: LiveFormDeployment[] = [
  {
    formId: 'form_crop_v24',
    formTitle: 'Global Agricultural & Soil Carbon Baseline Survey',
    version: 'v2.4.1 (Live)',
    publishedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    targetCampaign: 'Global Crop Yield & Soil Audit',
    status: 'active',
    mandatoryQuestionsCount: 28,
    gpsLockRequired: true,
    audioRecordingRequired: true,
    photoProofRequired: true,
    enforceMinimumDwellSeconds: 60,
    deployedToCount: 8
  },
  {
    formId: 'form_household_v19',
    formTitle: 'Peri-Urban Household Economic & Energy Access Census',
    version: 'v1.9.0 (Live)',
    publishedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    targetCampaign: 'Urban Household Resilience & Energy Access',
    status: 'active',
    mandatoryQuestionsCount: 34,
    gpsLockRequired: true,
    audioRecordingRequired: false,
    photoProofRequired: true,
    enforceMinimumDwellSeconds: 90,
    deployedToCount: 6
  },
  {
    formId: 'form_water_v30',
    formTitle: 'Rural Groundwater & Borehole Hydro-Chemistry Metric',
    version: 'v3.0.2 (Staging)',
    publishedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    targetCampaign: 'Clean Water Index & Sanitation',
    status: 'draft',
    mandatoryQuestionsCount: 19,
    gpsLockRequired: true,
    audioRecordingRequired: true,
    photoProofRequired: true,
    enforceMinimumDwellSeconds: 45,
    deployedToCount: 0
  }
];

export function getStoredQuotas(fleet: EnumeratorAgent[]): Record<string, DailyEnumeratorQuota> {
  try {
    const raw = localStorage.getItem(QUOTAS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Generate initial default quotas
  const initial: Record<string, DailyEnumeratorQuota> = {};
  fleet.forEach((agent, idx) => {
    const target = 20;
    const completed = agent.surveysCollectedToday || 8;
    const approved = Math.max(0, completed - 1);
    const pending = 1;
    const rejected = 0;
    const pct = target > 0 ? (completed / target) * 100 : 0;
    
    let status: DailyEnumeratorQuota['status'] = 'on_track';
    if (pct >= 100) status = 'completed';
    else if (pct < 40) status = 'lagging';

    initial[agent.id] = {
      enumeratorId: agent.id,
      targetSubmissions: target,
      approvedCount: approved,
      pendingCount: pending,
      rejectedCount: rejected,
      deadlineTime: '17:30',
      status
    };
  });

  saveStoredQuotas(initial);
  return initial;
}

export function saveStoredQuotas(quotas: Record<string, DailyEnumeratorQuota>): void {
  try {
    localStorage.setItem(QUOTAS_STORAGE_KEY, JSON.stringify(quotas));
  } catch {}
}

export function updateAgentQuota(enumeratorId: string, newTarget: number, deadlineTime = '17:30'): void {
  const current = getStoredQuotas([]);
  if (current[enumeratorId]) {
    current[enumeratorId].targetSubmissions = newTarget;
    current[enumeratorId].deadlineTime = deadlineTime;
  } else {
    current[enumeratorId] = {
      enumeratorId,
      targetSubmissions: newTarget,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      deadlineTime,
      status: 'on_track'
    };
  }
  saveStoredQuotas(current);
}

export function getStoredRevisionMessages(): SupervisorRevisionMessage[] {
  try {
    const raw = localStorage.getItem(REVISION_MESSAGES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const initial: SupervisorRevisionMessage[] = [
    {
      id: 'rev_msg_101',
      submissionId: 'sub_vault_103',
      submissionCode: 'SUB-2026-8893',
      enumeratorId: 'enum_3',
      enumeratorName: 'Farhan Malik',
      senderName: 'Dr. Evelyn Vance',
      senderBadgeId: 'SUP-9901',
      subject: 'Incomplete Crop Area & Zero Dwell Time Alert',
      message: 'Please revisit Farmer plot #4102. The recorded yield figure (950 bags) exceeds normal plot boundaries by 400%, and GPS dwell time was only 48s.',
      priority: 'urgent',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      status: 'delivered',
      requiresRevisit: true,
      fieldToCorrect: 'yield_estimate_kg'
    },
    {
      id: 'rev_msg_102',
      submissionId: 'sub_vault_105',
      submissionCode: 'SUB-2026-8895',
      enumeratorId: 'enum_5',
      enumeratorName: 'Elena Rostova',
      senderName: 'Dr. Evelyn Vance',
      senderBadgeId: 'SUP-9901',
      subject: 'Clarify Respondent Phone Prefix',
      message: 'Phone number missing country dial code. Update prefix to +1 before final signoff.',
      priority: 'standard',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      status: 'read',
      requiresRevisit: false,
      fieldToCorrect: 'respondent_phone'
    }
  ];

  saveStoredRevisionMessages(initial);
  return initial;
}

export function saveStoredRevisionMessages(messages: SupervisorRevisionMessage[]): void {
  try {
    localStorage.setItem(REVISION_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

export function sendRevisionMessage(msg: Omit<SupervisorRevisionMessage, 'id' | 'timestamp' | 'status'>): SupervisorRevisionMessage {
  const current = getStoredRevisionMessages();
  const newMsg: SupervisorRevisionMessage = {
    ...msg,
    id: `rev_msg_${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: 'sent'
  };
  const updated = [newMsg, ...current];
  saveStoredRevisionMessages(updated);
  return newMsg;
}

export function getStoredFormDeployments(): LiveFormDeployment[] {
  try {
    const raw = localStorage.getItem(FORM_DEPLOYMENTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_FORM_DEPLOYMENTS;
}

export function saveStoredFormDeployments(forms: LiveFormDeployment[]): void {
  try {
    localStorage.setItem(FORM_DEPLOYMENTS_STORAGE_KEY, JSON.stringify(forms));
  } catch {}
}
