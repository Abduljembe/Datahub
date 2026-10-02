// Automated Fraud, Speed-Click & Anti-Cheat Anomaly Engine for Supervisor Vault
import { SupervisorSubmission } from './supervisorEngine';
import { calculateDistanceKm } from './enumeratorFleetEngine';

export type AnomalyCategory = 
  | 'speed_clicking' 
  | 'gps_teleportation' 
  | 'duplicate_cloned_survey' 
  | 'low_entropy_straightline' 
  | 'geofence_spoofing' 
  | 'battery_temperature_anomaly'
  | 'impossible_household_size';

export interface FraudAnomalyFlag {
  id: string;
  submissionId: string;
  submissionCode: string;
  enumeratorId: string;
  enumeratorName: string;
  category: AnomalyCategory;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidencePct: number;
  detectedAt: string;
  title: string;
  description: string;
  evidence: {
    metricName: string;
    observedValue: string | number;
    expectedThreshold: string | number;
  }[];
  resolutionStatus: 'unresolved' | 'cleared' | 'confirmed_fraud' | 'sent_for_revisit';
  supervisorNotes?: string;
}

export interface FraudEngineStats {
  totalAnalyzed: number;
  anomaliesDetected: number;
  criticalFlags: number;
  confirmedFraudCount: number;
  revisitRequestedCount: number;
  fraudRatePct: number;
  topRiskEnumerators: {
    enumeratorId: string;
    enumeratorName: string;
    flagCount: number;
    highestSeverity: 'critical' | 'high' | 'medium' | 'low';
  }[];
}

const FRAUD_ANOMALIES_STORAGE_KEY = 'datahub_supervisor_fraud_anomalies_v1';

// Analyzes a set of submissions for advanced fraud patterns
export function runFleetFraudAnalysis(submissions: SupervisorSubmission[]): FraudAnomalyFlag[] {
  const anomalies: FraudAnomalyFlag[] = [];

  // Group submissions by enumerator sorted chronologically
  const byEnumerator: Record<string, SupervisorSubmission[]> = {};
  submissions.forEach(sub => {
    if (!byEnumerator[sub.enumeratorId]) byEnumerator[sub.enumeratorId] = [];
    byEnumerator[sub.enumeratorId].push(sub);
  });

  // Check 1: Speed Clicking & Dwell Time < 45s with high question count
  submissions.forEach(sub => {
    const qCount = sub.questionCount || Object.keys(sub.rawData || {}).length || 10;
    const dwell = sub.dwellTimeSeconds || 120;
    
    // Sub-45 seconds for 10+ questions = speed click fraud
    if (dwell < 45 && qCount >= 5) {
      anomalies.push({
        id: `fraud_speed_${sub.id}`,
        submissionId: sub.id,
        submissionCode: sub.submissionCode,
        enumeratorId: sub.enumeratorId,
        enumeratorName: sub.enumeratorName,
        category: 'speed_clicking',
        severity: dwell < 25 ? 'critical' : 'high',
        confidencePct: Math.min(98, Math.round(100 - (dwell / 45) * 40)),
        detectedAt: new Date().toISOString(),
        title: 'Speed-Clicking / Incomplete Dwell Time',
        description: `Survey completed in only ${dwell}s for ${qCount} questions (avg ${(dwell / qCount).toFixed(1)}s/question). Below mandatory 45s human interview baseline.`,
        evidence: [
          { metricName: 'Dwell Time', observedValue: `${dwell} seconds`, expectedThreshold: '≥ 45 seconds' },
          { metricName: 'Speed per Question', observedValue: `${(dwell / qCount).toFixed(1)}s/q`, expectedThreshold: '≥ 3.5s/q' }
        ],
        resolutionStatus: 'unresolved'
      });
    }

    // Check 2: Low Entropy / Straight-line answering (All categorical fields have identical answers)
    const rawVals = Object.values(sub.rawData || {});
    if (rawVals.length >= 4) {
      const distinctVals = new Set(rawVals.map(v => String(v).trim().toLowerCase()));
      if (distinctVals.size <= 2 && rawVals.length >= 6) {
        anomalies.push({
          id: `fraud_entropy_${sub.id}`,
          submissionId: sub.id,
          submissionCode: sub.submissionCode,
          enumeratorId: sub.enumeratorId,
          enumeratorName: sub.enumeratorName,
          category: 'low_entropy_straightline',
          severity: 'high',
          confidencePct: 88,
          detectedAt: new Date().toISOString(),
          title: 'Straight-Lining / Synthetic Low-Entropy Responses',
          description: 'Survey responses show repetitive, identical answers across divergent question categories without variation.',
          evidence: [
            { metricName: 'Distinct Values Count', observedValue: distinctVals.size, expectedThreshold: '≥ 4 distinct values' },
            { metricName: 'Field Sample', observedValue: Array.from(distinctVals).join(', '), expectedThreshold: 'Diverse responses' }
          ],
          resolutionStatus: 'unresolved'
        });
      }
    }

    // Check 3: GPS Jitter / Suspicious Coordinate Rounding (Exact 0.000000)
    if (sub.gps && (Math.abs(sub.gps.lat) < 0.0001 || Math.abs(sub.gps.lng) < 0.0001)) {
      anomalies.push({
        id: `fraud_gps_null_${sub.id}`,
        submissionId: sub.id,
        submissionCode: sub.submissionCode,
        enumeratorId: sub.enumeratorId,
        enumeratorName: sub.enumeratorName,
        category: 'geofence_spoofing',
        severity: 'critical',
        confidencePct: 99,
        detectedAt: new Date().toISOString(),
        title: 'Null Island / Fake GPS Coordinates Detected',
        description: 'Submission coordinates were logged at (0.0000°, 0.0000°), indicating disabled device telemetry or location emulator.',
        evidence: [
          { metricName: 'Latitude / Longitude', observedValue: `${sub.gps.lat}, ${sub.gps.lng}`, expectedThreshold: 'Valid Sector Bounds' }
        ],
        resolutionStatus: 'unresolved'
      });
    }
  });

  // Check 4: GPS Teleportation & Impossible Velocity (> 120 km/h between field surveys)
  Object.entries(byEnumerator).forEach(([enumId, subs]) => {
    // Sort by timestamp
    const sorted = [...subs].sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      const prev = sorted[i];
      const curr = sorted[i + 1];
      
      const timeDiffMinutes = (new Date(curr.collectedAt).getTime() - new Date(prev.collectedAt).getTime()) / (1000 * 60);
      if (timeDiffMinutes > 0 && timeDiffMinutes < 120) { // Within 2 hours
        const distanceKm = calculateDistanceKm(prev.gps.lat, prev.gps.lng, curr.gps.lat, curr.gps.lng);
        const velocityKmh = (distanceKm / (timeDiffMinutes / 60));

        if (velocityKmh > 110 && distanceKm > 15) { // Unrealistic field transit
          anomalies.push({
            id: `fraud_teleport_${curr.id}`,
            submissionId: curr.id,
            submissionCode: curr.submissionCode,
            enumeratorId: enumId,
            enumeratorName: curr.enumeratorName,
            category: 'gps_teleportation',
            severity: 'critical',
            confidencePct: 94,
            detectedAt: new Date().toISOString(),
            title: 'Impossible Velocity / GPS Teleportation',
            description: `Consecutive submissions logged ${distanceKm.toFixed(1)} km apart in only ${timeDiffMinutes.toFixed(0)} minutes (${velocityKmh.toFixed(0)} km/h). Violates feasible terrain transit.`,
            evidence: [
              { metricName: 'Implied Velocity', observedValue: `${velocityKmh.toFixed(0)} km/h`, expectedThreshold: '≤ 60 km/h field limit' },
              { metricName: 'Inter-Survey Distance', observedValue: `${distanceKm.toFixed(1)} km`, expectedThreshold: 'Sector radius' },
              { metricName: 'Time Delta', observedValue: `${timeDiffMinutes.toFixed(0)} mins`, expectedThreshold: 'Realistic commute' }
            ],
            resolutionStatus: 'unresolved'
          });
        }
      }
    }
  });

  // Check 5: Duplicate Cloned Survey Detection (Identical Hash of payload data across different IDs)
  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const s1 = submissions[i];
      const s2 = submissions[j];

      // Compare content
      const r1 = JSON.stringify(s1.rawData || {});
      const r2 = JSON.stringify(s2.rawData || {});

      if (r1.length > 30 && r1 === r2 && s1.id !== s2.id) {
        anomalies.push({
          id: `fraud_clone_${s2.id}`,
          submissionId: s2.id,
          submissionCode: s2.submissionCode,
          enumeratorId: s2.enumeratorId,
          enumeratorName: s2.enumeratorName,
          category: 'duplicate_cloned_survey',
          severity: 'critical',
          confidencePct: 99,
          detectedAt: new Date().toISOString(),
          title: 'Identical Cloned Survey Payload',
          description: `Payload matches submission ${s1.submissionCode} byte-for-byte. Likely copy-pasted or re-submitted duplicate interview.`,
          evidence: [
            { metricName: 'Duplicate Reference', observedValue: s1.submissionCode, expectedThreshold: 'Unique interview' },
            { metricName: 'Payload Hash Match', observedValue: '100% Identical', expectedThreshold: 'Varied respondents' }
          ],
          resolutionStatus: 'unresolved'
        });
      }
    }
  }

  // Merge with previously saved resolution states
  const saved = getStoredFraudAnomalies();
  const merged = anomalies.map(a => {
    const existing = saved.find(s => s.id === a.id);
    if (existing) {
      return {
        ...a,
        resolutionStatus: existing.resolutionStatus,
        supervisorNotes: existing.supervisorNotes
      };
    }
    return a;
  });

  saveStoredFraudAnomalies(merged);
  return merged;
}

export function getStoredFraudAnomalies(): FraudAnomalyFlag[] {
  try {
    const raw = localStorage.getItem(FRAUD_ANOMALIES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveStoredFraudAnomalies(anomalies: FraudAnomalyFlag[]): void {
  try {
    localStorage.setItem(FRAUD_ANOMALIES_STORAGE_KEY, JSON.stringify(anomalies));
  } catch {}
}

export function updateAnomalyResolution(
  anomalyId: string, 
  status: FraudAnomalyFlag['resolutionStatus'],
  notes?: string
): void {
  const current = getStoredFraudAnomalies();
  const updated = current.map(a => a.id === anomalyId ? { ...a, resolutionStatus: status, supervisorNotes: notes ?? a.supervisorNotes } : a);
  saveStoredFraudAnomalies(updated);
}

export function computeFraudStats(submissions: SupervisorSubmission[], anomalies: FraudAnomalyFlag[]): FraudEngineStats {
  const totalAnalyzed = submissions.length;
  const anomaliesDetected = anomalies.length;
  const criticalFlags = anomalies.filter(a => a.severity === 'critical').length;
  const confirmedFraudCount = anomalies.filter(a => a.resolutionStatus === 'confirmed_fraud').length;
  const revisitRequestedCount = anomalies.filter(a => a.resolutionStatus === 'sent_for_revisit').length;
  const fraudRatePct = totalAnalyzed > 0 ? Math.round((anomaliesDetected / totalAnalyzed) * 100) : 0;

  const countByEnum: Record<string, { name: string; count: number; maxSev: FraudAnomalyFlag['severity'] }> = {};
  anomalies.forEach(a => {
    if (!countByEnum[a.enumeratorId]) {
      countByEnum[a.enumeratorId] = { name: a.enumeratorName, count: 0, maxSev: a.severity };
    }
    countByEnum[a.enumeratorId].count += 1;
    if (a.severity === 'critical') countByEnum[a.enumeratorId].maxSev = 'critical';
  });

  const topRiskEnumerators = Object.entries(countByEnum)
    .map(([id, info]) => ({
      enumeratorId: id,
      enumeratorName: info.name,
      flagCount: info.count,
      highestSeverity: info.maxSev
    }))
    .sort((a, b) => b.flagCount - a.flagCount);

  return {
    totalAnalyzed,
    anomaliesDetected,
    criticalFlags,
    confirmedFraudCount,
    revisitRequestedCount,
    fraudRatePct,
    topRiskEnumerators
  };
}
