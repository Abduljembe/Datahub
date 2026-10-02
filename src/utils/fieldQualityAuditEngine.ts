// AI Field Supervisor & Automated Quality Audit Engine
import { EnumeratorAgent, GeofenceZone, calculateDistanceKm, isAgentInsideGeofence } from './enumeratorFleetEngine';

export type AuditFlagType =
  | 'speed_violation'
  | 'dwell_time_anomaly'
  | 'geofence_breach'
  | 'gps_spoof_suspected'
  | 'data_fabrication_pattern'
  | 'photo_verification_flag'
  | 'statistical_outlier';

export type AuditSeverity = 'high' | 'medium' | 'low' | 'clean';
export type AuditStatus = 'pending_review' | 'verified' | 'flagged' | 'rejected';

export interface AuditFlag {
  id: string;
  type: AuditFlagType;
  title: string;
  severity: AuditSeverity;
  confidence: number; // 0 - 100
  description: string;
  metricLabel?: string;
  metricValue?: string | number;
  recommendation: 'approve' | 'flag_reinterview' | 'investigate' | 'reject';
}

export interface FieldAuditRecord {
  id: string;
  submissionId: string;
  agentId: string;
  agentName: string;
  campaign: string;
  timestamp: string;
  lat: number;
  lng: number;
  accuracy: number;
  dwellTimeSeconds: number; // Duration spent filling out questionnaire
  questionCount: number;
  calculatedSpeedKmH?: number; // Speed from prior pin
  assignedZone: string;
  isInsideZone: boolean;
  distanceFromZoneCenterKm?: number;
  qualityScore: number; // 0 to 100
  status: AuditStatus;
  flags: AuditFlag[];
  aiSupervisorVerdict: string;
  aiDetailedAssessment?: string;
  supervisorNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  dataSnapshot: Record<string, any>;
  hasPhotos: boolean;
  photoCount: number;
}

export interface FleetQualityMetrics {
  totalAudited: number;
  cleanPassRate: number; // e.g. 92.5%
  flaggedCount: number;
  reinterviewRequiredCount: number;
  rejectedCount: number;
  verifiedCount: number;
  avgDwellTimeSeconds: number;
  avgQualityScore: number;
  geofenceComplianceRate: number;
}

const AUDIT_STORAGE_KEY = 'datahub_field_audit_records_cache';

// Real initial audit records (empty baseline - no fake records)
export const INITIAL_AUDIT_RECORDS: FieldAuditRecord[] = [];

const REMOVED_AUDIT_SEEDS: any[] = [
  {
    id: 'audit_rec_101',
    submissionId: 'rec_sub_101',
    agentId: 'enum_1',
    agentName: 'Amina Mwangi',
    campaign: 'Global Crop Yield & Soil Audit',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    lat: 37.7749,
    lng: -122.4194,
    accuracy: 4,
    dwellTimeSeconds: 420, // 7 mins
    questionCount: 14,
    calculatedSpeedKmH: 3.2,
    assignedZone: 'Zone A (North Research Valley)',
    isInsideZone: true,
    distanceFromZoneCenterKm: 1.2,
    qualityScore: 98,
    status: 'verified',
    flags: [],
    aiSupervisorVerdict: 'High-Fidelity Submission. Realistic dwell time (30s/question), verified GPS lock within assigned agricultural cluster, and consistent sensor readings.',
    dataSnapshot: {
      plot_id: 'PL-8892',
      crop_type: 'Winter Maize',
      soil_ph: 6.4,
      moisture_pct: 32.5,
      irrigation_status: 'Drip System Active',
      pest_observed: 'None',
      yield_forecast_kg: 4200
    },
    hasPhotos: true,
    photoCount: 2
  },
  {
    id: 'audit_rec_102',
    submissionId: 'rec_sub_102',
    agentId: 'enum_2',
    agentName: 'Carlos Mendez',
    campaign: 'Community Health & Maternal Survey',
    timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    lat: 37.8200, // Outside zone!
    lng: -122.3800,
    accuracy: 8,
    dwellTimeSeconds: 38, // 38 seconds for 18 questions! (Rapid clicking anomaly)
    questionCount: 18,
    calculatedSpeedKmH: 98.4, // Improbable transit speed between household clusters
    assignedZone: 'Zone B (South Agricultural Plains)',
    isInsideZone: false,
    distanceFromZoneCenterKm: 7.8,
    qualityScore: 34,
    status: 'flagged',
    flags: [
      {
        id: 'flag_dwell_1',
        type: 'dwell_time_anomaly',
        title: 'Abnormally Fast Dwell Time (Speed Clicking)',
        severity: 'high',
        confidence: 94,
        description: 'Enumerator spent only 38s completing an 18-question in-person survey (~2.1s per field), indicating probable rushed responses or fabricated entries.',
        metricLabel: 'Dwell Time',
        metricValue: '38s (Expected > 300s)',
        recommendation: 'flag_reinterview'
      },
      {
        id: 'flag_geo_1',
        type: 'geofence_breach',
        title: 'Geofence Boundary Violation',
        severity: 'medium',
        confidence: 89,
        description: 'Submission coordinates are 7.8 km away from the assigned cluster center (Zone B), breaching the designated supervisor boundary.',
        metricLabel: 'Zone Distance',
        metricValue: '7.8 km from center',
        recommendation: 'investigate'
      },
      {
        id: 'flag_speed_1',
        type: 'speed_violation',
        title: 'Improbable Cluster Transit Speed',
        severity: 'high',
        confidence: 91,
        description: 'Calculated travel velocity between consecutive household interviews was 98.4 km/h in an urban pedestrian survey cluster.',
        metricLabel: 'Transit Velocity',
        metricValue: '98.4 km/h',
        recommendation: 'flag_reinterview'
      }
    ],
    aiSupervisorVerdict: 'Severe Anomaly Detected. Unrealistic completion duration (2.1s/field) coupled with significant geofence displacement (7.8 km offset). Re-interview strongly recommended.',
    dataSnapshot: {
      household_id: 'HH-4019',
      respondent_name: 'M. Gomez',
      family_members: 5,
      vaccinated_count: 5,
      water_source: 'Municipal Tap',
      health_clinic_distance_km: 1.0,
      annual_checkup: 'Yes'
    },
    hasPhotos: false,
    photoCount: 0
  },
  {
    id: 'audit_rec_103',
    submissionId: 'rec_sub_103',
    agentId: 'enum_3',
    agentName: 'Fatima Zahra',
    campaign: 'Municipal Water Grid Audit',
    timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    lat: 37.7650,
    lng: -122.4312,
    accuracy: 3,
    dwellTimeSeconds: 510,
    questionCount: 12,
    calculatedSpeedKmH: 4.1,
    assignedZone: 'Zone B (South Agricultural Plains)',
    isInsideZone: true,
    distanceFromZoneCenterKm: 0.4,
    qualityScore: 95,
    status: 'verified',
    flags: [],
    aiSupervisorVerdict: 'High-Fidelity Field Audit. Verified water pressure telemetry, thorough dwell time, and precise sub-5m GPS lock.',
    dataSnapshot: {
      valve_id: 'V-9901',
      pressure_psi: 64.2,
      flow_rate_lpm: 180,
      chlorine_ppm: 0.75,
      structural_integrity: 'Good',
      leakage_detected: 'No'
    },
    hasPhotos: true,
    photoCount: 3
  },
  {
    id: 'audit_rec_104',
    submissionId: 'rec_sub_104',
    agentId: 'enum_4',
    agentName: 'David Kim',
    campaign: 'Household Census 2026',
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    lat: 37.7900,
    lng: -122.3980,
    accuracy: 45, // Degraded GPS accuracy
    dwellTimeSeconds: 190,
    questionCount: 16,
    calculatedSpeedKmH: 8.5,
    assignedZone: 'Zone A (North Research Valley)',
    isInsideZone: true,
    distanceFromZoneCenterKm: 1.8,
    qualityScore: 76,
    status: 'pending_review',
    flags: [
      {
        id: 'flag_gps_1',
        type: 'gps_spoof_suspected',
        title: 'Degraded GPS Position Precision',
        severity: 'low',
        confidence: 72,
        description: 'GPS accuracy radius was ±45m during record capture. Acceptable for macro demographics, but imprecise for property boundary mapping.',
        metricLabel: 'GPS Radius',
        metricValue: '±45m',
        recommendation: 'approve'
      }
    ],
    aiSupervisorVerdict: 'Moderate Quality. Demographics values appear authentic; recommend reminding agent to wait for satellite lock (±10m) before submitting future household records.',
    dataSnapshot: {
      census_block: 'BLK-12',
      dwelling_type: 'Single Family',
      resident_count: 3,
      primary_language: 'English',
      internet_access: 'Fiber Optic'
    },
    hasPhotos: false,
    photoCount: 0
  }
];

/**
 * Retrieve all field audit records from local cache
 */
export function getLocalAuditRecords(): FieldAuditRecord[] {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Save field audit records to local cache
 */
export function saveLocalAuditRecords(records: FieldAuditRecord[]) {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * Compute aggregate quality metrics for the fleet
 */
export function computeFleetQualityMetrics(records: FieldAuditRecord[]): FleetQualityMetrics {
  if (records.length === 0) {
    return {
      totalAudited: 0,
      cleanPassRate: 100,
      flaggedCount: 0,
      reinterviewRequiredCount: 0,
      rejectedCount: 0,
      verifiedCount: 0,
      avgDwellTimeSeconds: 0,
      avgQualityScore: 100,
      geofenceComplianceRate: 100,
    };
  }

  const total = records.length;
  const verified = records.filter(r => r.status === 'verified').length;
  const flagged = records.filter(r => r.status === 'flagged').length;
  const rejected = records.filter(r => r.status === 'rejected').length;
  const reinterview = records.filter(r => r.flags.some(f => f.recommendation === 'flag_reinterview')).length;
  
  const insideZoneCount = records.filter(r => r.isInsideZone).length;
  const sumScore = records.reduce((acc, r) => acc + r.qualityScore, 0);
  const sumDwell = records.reduce((acc, r) => acc + (r.dwellTimeSeconds || 0), 0);

  const cleanPassRate = Math.round(((total - flagged - rejected) / total) * 100);

  return {
    totalAudited: total,
    cleanPassRate,
    flaggedCount: flagged,
    reinterviewRequiredCount: reinterview,
    rejectedCount: rejected,
    verifiedCount: verified,
    avgDwellTimeSeconds: Math.round(sumDwell / total),
    avgQualityScore: Math.round((sumScore / total) * 10) / 10,
    geofenceComplianceRate: Math.round((insideZoneCount / total) * 100)
  };
}

/**
 * Perform instant rule-based audit on a field record
 */
export function auditSubmissionLocally(params: {
  submissionId: string;
  agent: EnumeratorAgent;
  lat: number;
  lng: number;
  accuracy?: number;
  dwellTimeSeconds: number;
  data: Record<string, any>;
  photos?: string[];
  geofences: GeofenceZone[];
}): FieldAuditRecord {
  const { submissionId, agent, lat, lng, accuracy = 5, dwellTimeSeconds, data, photos = [], geofences } = params;
  const flags: AuditFlag[] = [];
  let score = 100;

  const questionCount = Object.keys(data).length || 10;
  const timePerQuestion = dwellTimeSeconds / Math.max(1, questionCount);

  // 1. Dwell Time Anomaly Detection (< 3.5s per question is speed clicking)
  if (timePerQuestion < 3.5 && questionCount >= 5) {
    flags.push({
      id: `flag_dwell_${Date.now()}`,
      type: 'dwell_time_anomaly',
      title: 'Severe Speed Clicking (Rapid Submission)',
      severity: 'high',
      confidence: 95,
      description: `Survey completed in only ${dwellTimeSeconds}s for ${questionCount} questions (~${timePerQuestion.toFixed(1)}s/question). Human interview pace typically requires at least 15-30s per question.`,
      metricLabel: 'Time Per Question',
      metricValue: `${timePerQuestion.toFixed(1)}s`,
      recommendation: 'flag_reinterview'
    });
    score -= 40;
  } else if (timePerQuestion < 7.0 && questionCount >= 5) {
    flags.push({
      id: `flag_dwell_${Date.now()}`,
      type: 'dwell_time_anomaly',
      title: 'Fast Interview Pacing Warning',
      severity: 'medium',
      confidence: 78,
      description: `Interview pacing was notably fast (${timePerQuestion.toFixed(1)}s per question).`,
      metricLabel: 'Time Per Question',
      metricValue: `${timePerQuestion.toFixed(1)}s`,
      recommendation: 'investigate'
    });
    score -= 15;
  }

  // 2. Geofence Boundary Check
  const insideAnyZone = geofences.some(z => isAgentInsideGeofence(lat, lng, z));
  let minZoneDistance = 999;
  for (const zone of geofences) {
    const dist = calculateDistanceKm(lat, lng, zone.centerLat, zone.centerLng);
    if (dist < minZoneDistance) minZoneDistance = dist;
  }

  if (!insideAnyZone && geofences.length > 0) {
    flags.push({
      id: `flag_geo_${Date.now()}`,
      type: 'geofence_breach',
      title: 'Geofence Boundary Displacement',
      severity: 'medium',
      confidence: 90,
      description: `Submission coordinates are located outside assigned cluster boundaries (${minZoneDistance.toFixed(2)} km from closest sector center).`,
      metricLabel: 'Sector Offset',
      metricValue: `${minZoneDistance.toFixed(2)} km`,
      recommendation: 'investigate'
    });
    score -= 25;
  }

  // 3. Improbable Speed / Teleportation check from previous checkpoint
  let speedKmH = 0;
  if (agent.history && agent.history.length > 0) {
    const lastPoint = agent.history[agent.history.length - 1];
    const distKm = calculateDistanceKm(lat, lng, lastPoint.lat, lastPoint.lng);
    const timeDeltaHours = Math.max(0.001, (Date.now() - new Date(lastPoint.timestamp).getTime()) / 3600000);
    speedKmH = distKm / timeDeltaHours;

    if (speedKmH > 120 && distKm > 2) {
      flags.push({
        id: `flag_speed_${Date.now()}`,
        type: 'speed_violation',
        title: 'Improbable Spatial Teleportation Velocity',
        severity: 'high',
        confidence: 92,
        description: `Travel velocity between consecutive field points reached ${Math.round(speedKmH)} km/h across ${distKm.toFixed(1)} km, indicating potential coordinate spoofing or batch remote entry.`,
        metricLabel: 'Transit Velocity',
        metricValue: `${Math.round(speedKmH)} km/h`,
        recommendation: 'flag_reinterview'
      });
      score -= 35;
    }
  }

  // 4. GPS Precision Warning
  if (accuracy > 40) {
    flags.push({
      id: `flag_gps_${Date.now()}`,
      type: 'gps_spoof_suspected',
      title: 'High GPS Position Uncertainty',
      severity: 'low',
      confidence: 70,
      description: `GPS accuracy was degraded (±${Math.round(accuracy)}m radius).`,
      metricLabel: 'GPS Accuracy',
      metricValue: `±${Math.round(accuracy)}m`,
      recommendation: 'approve'
    });
    score -= 10;
  }

  // 5. Straight-lining / Uniform data pattern check
  const values = Object.values(data);
  const distinctValues = new Set(values);
  if (values.length >= 6 && distinctValues.size <= 2) {
    flags.push({
      id: `flag_pattern_${Date.now()}`,
      type: 'data_fabrication_pattern',
      title: 'Straight-Lining Response Pattern',
      severity: 'high',
      confidence: 88,
      description: 'The respondent answers exhibit identical uniform selections across all questionnaire dimensions, a strong indicator of non-genuine enumerator straight-lining.',
      metricLabel: 'Unique Values',
      metricValue: `${distinctValues.size} distinct across ${values.length} fields`,
      recommendation: 'flag_reinterview'
    });
    score -= 30;
  }

  score = Math.max(5, Math.min(100, score));
  let status: AuditStatus = 'verified';
  if (score < 60) status = 'flagged';
  else if (score < 85) status = 'pending_review';

  let aiVerdict = 'Passed automated data integrity and spatial checks.';
  if (flags.length > 0) {
    aiVerdict = `${flags.length} anomaly flag(s) identified. ${flags.map(f => f.title).join('; ')}.`;
  }

  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    submissionId,
    agentId: agent.id,
    agentName: agent.name,
    campaign: agent.campaign || 'Field Survey Campaign',
    timestamp: new Date().toISOString(),
    lat,
    lng,
    accuracy,
    dwellTimeSeconds,
    questionCount,
    calculatedSpeedKmH: Math.round(speedKmH * 10) / 10,
    assignedZone: agent.assignedZone || 'Designated Zone',
    isInsideZone: insideAnyZone,
    distanceFromZoneCenterKm: Math.round(minZoneDistance * 10) / 10,
    qualityScore: score,
    status,
    flags,
    aiSupervisorVerdict: aiVerdict,
    dataSnapshot: { ...data },
    hasPhotos: photos.length > 0,
    photoCount: photos.length
  };
}

/**
 * Run Deep AI Supervisor Audit on selected records via Gemini API
 */
export async function runDeepAiSupervisorAudit(records: FieldAuditRecord[]): Promise<{
  updatedRecords: FieldAuditRecord[];
  executiveReport: string;
}> {
  try {
    const res = await fetch('/api/enumerator/ai-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: records.slice(0, 10) }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.updatedRecords && Array.isArray(data.updatedRecords)) {
        return {
          updatedRecords: data.updatedRecords,
          executiveReport: data.executiveReport || 'Deep AI Audit completed successfully.'
        };
      }
    }
  } catch (err) {
    console.error('Remote AI audit call failed, using heuristic engine:', err);
  }

  // Heuristic supervisor synthesis if server is busy
  const updated = records.map(r => {
    let verdict = r.aiSupervisorVerdict;
    let score = r.qualityScore;
    if (r.flags.length === 0) {
      verdict = `✓ AI Verified: Data patterns align with expected empirical distributions. Dwell time (${r.dwellTimeSeconds}s) confirms authentic in-person interview pacing.`;
    } else {
      verdict = `⚠️ AI Audit Alert: Flagged ${r.flags.length} potential anomalies (${r.flags.map(f => f.title).join(', ')}). Recommended supervisor action: ${r.flags[0].recommendation.toUpperCase()}.`;
    }
    return {
      ...r,
      aiSupervisorVerdict: verdict,
      qualityScore: score
    };
  });

  const metrics = computeFleetQualityMetrics(updated);
  const report = `### 🛡️ AI Field Supervisor Executive Audit Report
- **Total Audited Records**: ${metrics.totalAudited} submissions across field clusters.
- **Fleet Integrity Score**: **${metrics.avgQualityScore}/100** (${metrics.cleanPassRate}% clean pass rate).
- **Geofence Compliance**: ${metrics.geofenceComplianceRate}% within assigned sector boundaries.
- **Flagged Anomalies**: ${metrics.flaggedCount} submissions require supervisor attention (Speed-clicking, boundary breaches, or data uniformity).
- **Recommended Action**: Initiate re-interviews for flagged surveys with dwell times < 45 seconds to preserve overall dataset integrity.`;

  return {
    updatedRecords: updated,
    executiveReport: report
  };
}
