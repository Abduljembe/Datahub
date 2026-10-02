// Supervisor Central Ingestion & Field Enumerator Command Engine
import { EnumeratorAgent, GeofenceZone, DEFAULT_GEOFENCES, INITIAL_DEFAULT_FLEET, calculateDistanceKm, isAgentInsideGeofence } from './enumeratorFleetEngine';
import { AuditFlag, AuditSeverity, AuditStatus } from './fieldQualityAuditEngine';
import { Dataset, ColumnMeta } from '../types';

export type SubmissionPipelineStage = 
  | 'raw_received' 
  | 'auto_cleaned' 
  | 'supervisor_approved' 
  | 'rejected' 
  | 'ingested';

export interface DataCleaningDiff {
  field: string;
  originalValue: any;
  cleanedValue: any;
  ruleApplied: string;
  severity: 'info' | 'warning' | 'fixed';
}

export interface SupervisorSubmission {
  id: string;
  submissionCode: string;
  enumeratorId: string;
  enumeratorName: string;
  enumeratorEmail: string;
  enumeratorPhone?: string;
  enumeratorRole: string;
  campaign: string;
  assignedZone: string;
  collectedAt: string;
  cleanedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  ingestedAt?: string;
  gps: {
    lat: number;
    lng: number;
    accuracy: number;
    isInsideZone: boolean;
    distanceFromZoneCenterKm: number;
    addressDescription?: string;
  };
  dwellTimeSeconds: number;
  questionCount: number;
  qualityScore: number; // 0 to 100
  stage: SubmissionPipelineStage;
  rawData: Record<string, any>;
  cleanedData: Record<string, any>;
  cleaningDiffs: DataCleaningDiff[];
  flags: AuditFlag[];
  aiQualityVerdict: string;
  supervisorNotes?: string;
  supervisorActionBy?: string;
  targetDatasetId?: string;
  targetDatasetName?: string;
  photosCount?: number;
  offlineSync?: boolean;
}

export interface SupervisorCleaningConfig {
  autoTrimWhitespace: boolean;
  standardizeCase: boolean;
  formatPhoneAndIds: boolean;
  imputeMissingValues: boolean;
  imputeNumericStrategy: 'mean' | 'median' | 'zero' | 'mode';
  capOutliersWithIQR: boolean;
  iqrMultiplier: number;
  enforceGeofenceRules: boolean;
  minDwellTimeSeconds: number;
  deduplicateByRespondentId: boolean;
}

export const DEFAULT_SUPERVISOR_CLEANING_CONFIG: SupervisorCleaningConfig = {
  autoTrimWhitespace: true,
  standardizeCase: true,
  formatPhoneAndIds: true,
  imputeMissingValues: true,
  imputeNumericStrategy: 'median',
  capOutliersWithIQR: true,
  iqrMultiplier: 2.5,
  enforceGeofenceRules: true,
  minDwellTimeSeconds: 60,
  deduplicateByRespondentId: true,
};

export interface SupervisorOverviewMetrics {
  totalSubmissions: number;
  rawReceivedCount: number;
  autoCleanedCount: number;
  supervisorApprovedCount: number;
  rejectedCount: number;
  ingestedCount: number;
  totalEnumerators: number;
  activeEnumeratorsCount: number;
  avgFleetQualityScore: number;
  avgDwellTimeMinutes: number;
  geofenceCompliancePct: number;
  cleaningFixesAppliedCount: number;
}

const SUPERVISOR_SUBMISSIONS_STORAGE_KEY = 'datahub_supervisor_submissions_vault';
const SUPERVISOR_CONFIG_STORAGE_KEY = 'datahub_supervisor_cleaning_config';

// Initial rich seed data for field submissions from all enumerators
export const INITIAL_SUPERVISOR_SUBMISSIONS: SupervisorSubmission[] = [];

const REMOVED_SEED_SUBMISSIONS: any[] = [
  {
    id: 'sub_vault_101',
    submissionCode: 'SUB-2026-8891',
    enumeratorId: 'enum_1',
    enumeratorName: 'Amina Mwangi',
    enumeratorEmail: 'amina.mwangi@datahub-field.org',
    enumeratorPhone: '+1 (555) 019-100',
    enumeratorRole: 'Senior Agricultural Assessor',
    campaign: 'Global Crop Yield & Soil Audit',
    assignedZone: 'Zone A (North Research Valley)',
    collectedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    cleanedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    gps: {
      lat: 37.7749,
      lng: -122.4194,
      accuracy: 4,
      isInsideZone: true,
      distanceFromZoneCenterKm: 1.2,
      addressDescription: 'North Valley Agronomy Plot #418'
    },
    dwellTimeSeconds: 420,
    questionCount: 14,
    qualityScore: 98,
    stage: 'auto_cleaned',
    rawData: {
      respondent_id: '  AGR-9921  ',
      respondent_name: 'john kiprop ',
      contact_phone: '555019234',
      farm_size_acres: '14.5',
      crop_type: 'maize',
      soil_ph: 6.4,
      moisture_pct: 32.5,
      irrigation_type: 'drip',
      yield_kg_est: 4200,
      pesticide_applied: 'no',
      subsidy_eligible: 'yes',
      annual_revenue_usd: 18500
    },
    cleanedData: {
      respondent_id: 'AGR-9921',
      respondent_name: 'John Kiprop',
      contact_phone: '+1 (555) 019-234',
      farm_size_acres: 14.5,
      crop_type: 'Maize',
      soil_ph: 6.4,
      moisture_pct: 32.5,
      irrigation_type: 'Drip System',
      yield_kg_est: 4200,
      pesticide_applied: 'No',
      subsidy_eligible: 'Yes',
      annual_revenue_usd: 18500
    },
    cleaningDiffs: [
      { field: 'respondent_id', originalValue: '  AGR-9921  ', cleanedValue: 'AGR-9921', ruleApplied: 'Trim whitespace & standardize key', severity: 'fixed' },
      { field: 'respondent_name', originalValue: 'john kiprop ', cleanedValue: 'John Kiprop', ruleApplied: 'Proper Title Case capitalization', severity: 'fixed' },
      { field: 'contact_phone', originalValue: '555019234', cleanedValue: '+1 (555) 019-234', ruleApplied: 'E.164 Phone format standardizer', severity: 'fixed' },
      { field: 'farm_size_acres', originalValue: '14.5', cleanedValue: 14.5, ruleApplied: 'Cast string to Float number', severity: 'fixed' },
      { field: 'crop_type', originalValue: 'maize', cleanedValue: 'Maize', ruleApplied: 'Taxonomy standardizer', severity: 'info' }
    ],
    flags: [],
    aiQualityVerdict: 'Pristine Submission. Realistic dwell time (30s/field), verified GPS lock within assigned sector, and all agricultural indices match seasonal baseline.',
    photosCount: 2,
    offlineSync: false
  },
  {
    id: 'sub_vault_102',
    submissionCode: 'SUB-2026-8892',
    enumeratorId: 'enum_2',
    enumeratorName: 'Carlos Mendez',
    enumeratorEmail: 'carlos.mendez@datahub-field.org',
    enumeratorPhone: '+1 (555) 024-883',
    enumeratorRole: 'Public Health Field Officer',
    campaign: 'Community Health & Maternal Survey',
    assignedZone: 'Zone B (South Agricultural Plains)',
    collectedAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    cleanedAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
    gps: {
      lat: 37.8200,
      lng: -122.3800,
      accuracy: 9,
      isInsideZone: false,
      distanceFromZoneCenterKm: 7.8,
      addressDescription: 'Highway Interchange 84 (Out of Geofence)'
    },
    dwellTimeSeconds: 42,
    questionCount: 16,
    qualityScore: 36,
    stage: 'raw_received',
    rawData: {
      household_id: 'HH-4019',
      head_of_household: 'mendez gomez',
      family_size: 5,
      infants_under_5: 2,
      vaccinated_status: 'all',
      water_access: 'tap',
      clinic_distance_km: 1.0,
      monthly_income: null,
      fever_cases_last_month: 0,
      hospitalized: 'no'
    },
    cleanedData: {
      household_id: 'HH-4019',
      head_of_household: 'Mendez Gomez',
      family_size: 5,
      infants_under_5: 2,
      vaccinated_status: 'Fully Vaccinated',
      water_access: 'Municipal Tap',
      clinic_distance_km: 1.0,
      monthly_income: 620, // Imputed median
      fever_cases_last_month: 0,
      hospitalized: 'No'
    },
    cleaningDiffs: [
      { field: 'head_of_household', originalValue: 'mendez gomez', cleanedValue: 'Mendez Gomez', ruleApplied: 'Title Case formatting', severity: 'fixed' },
      { field: 'monthly_income', originalValue: null, cleanedValue: 620, ruleApplied: 'Median imputation for missing economic survey field', severity: 'warning' },
      { field: 'vaccinated_status', originalValue: 'all', cleanedValue: 'Fully Vaccinated', ruleApplied: 'Categorical mapping', severity: 'fixed' }
    ],
    flags: [
      {
        id: 'flag_dwell_fast',
        type: 'dwell_time_anomaly',
        title: 'Abnormally Fast Dwell Time (Speed Clicking)',
        severity: 'high',
        confidence: 95,
        description: 'Completed in only 42 seconds for 16 detailed clinical questions (~2.6s per question), indicating hurried or simulated entry.',
        metricLabel: 'Dwell Time',
        metricValue: '42s (Min Threshold: 180s)',
        recommendation: 'flag_reinterview'
      },
      {
        id: 'flag_geo_out',
        type: 'geofence_breach',
        title: 'Geofence Perimeter Breach',
        severity: 'medium',
        confidence: 90,
        description: 'Submission coordinates located 7.8 km outside the designated Zone B cluster.',
        metricLabel: 'Cluster Offset',
        metricValue: '7.8 km',
        recommendation: 'investigate'
      }
    ],
    aiQualityVerdict: 'Flagged for Supervisor Review: Rapid speed-click duration (42s total) and coordinates recorded outside active sector perimeter.',
    photosCount: 0,
    offlineSync: false
  },
  {
    id: 'sub_vault_103',
    submissionCode: 'SUB-2026-8893',
    enumeratorId: 'enum_3',
    enumeratorName: 'Fatima Zahra',
    enumeratorEmail: 'fatima.zahra@datahub-field.org',
    enumeratorPhone: '+1 (555) 039-441',
    enumeratorRole: 'Environmental Water Inspector',
    campaign: 'Municipal Water Grid Audit',
    assignedZone: 'Zone B (South Agricultural Plains)',
    collectedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    cleanedAt: new Date(Date.now() - 54 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    gps: {
      lat: 37.7650,
      lng: -122.4312,
      accuracy: 3,
      isInsideZone: true,
      distanceFromZoneCenterKm: 0.4,
      addressDescription: 'South Plains Pumping Station #12'
    },
    dwellTimeSeconds: 510,
    questionCount: 12,
    qualityScore: 96,
    stage: 'supervisor_approved',
    rawData: {
      asset_tag: 'VALVE-9901',
      inspector_tag: 'FZ-3',
      water_ph: '7.2',
      pressure_psi: 64.2,
      flow_rate_lpm: 180,
      chlorine_ppm: 0.75,
      turbidity_ntu: 1.1,
      structural_state: 'good',
      leakage_found: 'none'
    },
    cleanedData: {
      asset_tag: 'VALVE-9901',
      inspector_tag: 'FZ-3',
      water_ph: 7.2,
      pressure_psi: 64.2,
      flow_rate_lpm: 180,
      chlorine_ppm: 0.75,
      turbidity_ntu: 1.1,
      structural_state: 'Good',
      leakage_found: 'No Leakage'
    },
    cleaningDiffs: [
      { field: 'water_ph', originalValue: '7.2', cleanedValue: 7.2, ruleApplied: 'Cast string to Float number', severity: 'fixed' },
      { field: 'structural_state', originalValue: 'good', cleanedValue: 'Good', ruleApplied: 'Title Case formatting', severity: 'fixed' },
      { field: 'leakage_found', originalValue: 'none', cleanedValue: 'No Leakage', ruleApplied: 'Standard terminology lookup', severity: 'fixed' }
    ],
    flags: [],
    aiQualityVerdict: 'Verified High Quality. Valid water sensor range, meticulous dwell time, and exact GPS checkpoint alignment.',
    supervisorNotes: 'Inspected sensor readings and approved for municipal master water ingestion.',
    supervisorActionBy: 'Executive Supervisor',
    photosCount: 3,
    offlineSync: false
  },
  {
    id: 'sub_vault_104',
    submissionCode: 'SUB-2026-8894',
    enumeratorId: 'enum_4',
    enumeratorName: 'Daisuke Sato',
    enumeratorEmail: 'daisuke.sato@datahub-field.org',
    enumeratorPhone: '+1 (555) 048-912',
    enumeratorRole: 'Urban Infrastructure Auditor',
    campaign: 'Urban Grid & Solar Installation Survey',
    assignedZone: 'Zone A (North Research Valley)',
    collectedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    cleanedAt: new Date(Date.now() - 109 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    ingestedAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    gps: {
      lat: 37.7880,
      lng: -122.4080,
      accuracy: 2,
      isInsideZone: true,
      distanceFromZoneCenterKm: 0.3,
      addressDescription: 'North Civic Solar Array Block 5'
    },
    dwellTimeSeconds: 620,
    questionCount: 15,
    qualityScore: 99,
    stage: 'ingested',
    targetDatasetName: 'Cleaned Field Master Roster',
    rawData: {
      building_id: 'CIVIC-SOLAR-005',
      roof_area_sqm: '480',
      tilt_angle_deg: 28,
      solar_inverter_kw: 50,
      daily_kwh_gen: 240,
      grid_connection_status: 'active',
      meter_reading_verified: 'true'
    },
    cleanedData: {
      building_id: 'CIVIC-SOLAR-005',
      roof_area_sqm: 480,
      tilt_angle_deg: 28,
      solar_inverter_kw: 50,
      daily_kwh_gen: 240,
      grid_connection_status: 'Active',
      meter_reading_verified: true
    },
    cleaningDiffs: [
      { field: 'roof_area_sqm', originalValue: '480', cleanedValue: 480, ruleApplied: 'Cast string to Integer', severity: 'fixed' },
      { field: 'meter_reading_verified', originalValue: 'true', cleanedValue: true, ruleApplied: 'Boolean cast', severity: 'fixed' }
    ],
    flags: [],
    aiQualityVerdict: 'Master Quality Record. Fully validated against civic engineering specs.',
    supervisorNotes: 'Approved and ingested into Active Master Dataset.',
    supervisorActionBy: 'Admin Lead',
    photosCount: 4,
    offlineSync: true
  },
  {
    id: 'sub_vault_105',
    submissionCode: 'SUB-2026-8895',
    enumeratorId: 'enum_5',
    enumeratorName: 'Elena Rostova',
    enumeratorEmail: 'elena.rostova@datahub-field.org',
    enumeratorPhone: '+1 (555) 057-229',
    enumeratorRole: 'Market Price & Supply Chain Surveyor',
    campaign: 'Regional Food Commodities & Logistics Tracker',
    assignedZone: 'Zone A (North Research Valley)',
    collectedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    cleanedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    gps: {
      lat: 37.7810,
      lng: -122.4140,
      accuracy: 5,
      isInsideZone: true,
      distanceFromZoneCenterKm: 0.6,
      addressDescription: 'Central Agro-Wholesale Market Stall #88'
    },
    dwellTimeSeconds: 340,
    questionCount: 11,
    qualityScore: 94,
    stage: 'auto_cleaned',
    rawData: {
      vendor_code: '  VEND-8812 ',
      commodity: 'wheat flour 50kg',
      wholesale_price_usd: '24.50',
      stock_available_bags: 120,
      supplier_origin: 'kansas coop',
      delivery_lead_time_days: 3,
      price_trend: 'stable'
    },
    cleanedData: {
      vendor_code: 'VEND-8812',
      commodity: 'Wheat Flour 50kg',
      wholesale_price_usd: 24.5,
      stock_available_bags: 120,
      supplier_origin: 'Kansas Coop',
      delivery_lead_time_days: 3,
      price_trend: 'Stable'
    },
    cleaningDiffs: [
      { field: 'vendor_code', originalValue: '  VEND-8812 ', cleanedValue: 'VEND-8812', ruleApplied: 'Trim whitespace', severity: 'fixed' },
      { field: 'commodity', originalValue: 'wheat flour 50kg', cleanedValue: 'Wheat Flour 50kg', ruleApplied: 'Title Case formatting', severity: 'fixed' },
      { field: 'wholesale_price_usd', originalValue: '24.50', cleanedValue: 24.5, ruleApplied: 'Cast string to Float', severity: 'fixed' },
      { field: 'supplier_origin', originalValue: 'kansas coop', cleanedValue: 'Kansas Coop', ruleApplied: 'Proper noun formatting', severity: 'fixed' }
    ],
    flags: [],
    aiQualityVerdict: 'Reliable Field Record. Realistic wholesale margin and verified vendor geolocation.',
    photosCount: 1,
    offlineSync: false
  }
];

// Persistent Storage Helpers
export function getStoredSupervisorSubmissions(): SupervisorSubmission[] {
  try {
    const raw = localStorage.getItem(SUPERVISOR_SUBMISSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredSupervisorSubmissions(submissions: SupervisorSubmission[]): void {
  try {
    localStorage.setItem(SUPERVISOR_SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
  } catch (err) {
    console.error('Failed to save supervisor submissions', err);
  }
}

export function getStoredSupervisorCleaningConfig(): SupervisorCleaningConfig {
  try {
    const raw = localStorage.getItem(SUPERVISOR_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SUPERVISOR_CLEANING_CONFIG, ...parsed };
    }
  } catch {}
  return DEFAULT_SUPERVISOR_CLEANING_CONFIG;
}

export function saveStoredSupervisorCleaningConfig(config: SupervisorCleaningConfig): void {
  try {
    localStorage.setItem(SUPERVISOR_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save supervisor cleaning config', err);
  }
}

// Automated Cleaning Engine
export function cleanRawSubmission(
  rawData: Record<string, any>,
  config: SupervisorCleaningConfig = DEFAULT_SUPERVISOR_CLEANING_CONFIG
): { cleanedData: Record<string, any>; diffs: DataCleaningDiff[] } {
  const cleanedData: Record<string, any> = {};
  const diffs: DataCleaningDiff[] = [];

  for (const [key, val] of Object.entries(rawData)) {
    let cleanVal = val;

    // 1. Missing Value Imputation
    if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
      if (config.imputeMissingValues) {
        if (typeof val === 'number' || (!isNaN(Number(val)) && val !== '')) {
          cleanVal = config.imputeNumericStrategy === 'zero' ? 0 : null; // Will fallback
        } else {
          cleanVal = 'N/A';
        }
        diffs.push({
          field: key,
          originalValue: val,
          cleanedValue: cleanVal,
          ruleApplied: `Imputed missing value with '${cleanVal}'`,
          severity: 'warning'
        });
      } else {
        cleanedData[key] = val;
        continue;
      }
    }

    // 2. String Cleaning: Trim & Capitalization
    if (typeof cleanVal === 'string') {
      let originalStr = cleanVal;
      if (config.autoTrimWhitespace) {
        cleanVal = cleanVal.trim();
      }

      // Check numeric string
      if (/^-?\d+(\.\d+)?$/.test(cleanVal)) {
        const numVal = cleanVal.includes('.') ? parseFloat(cleanVal) : parseInt(cleanVal, 10);
        cleanVal = numVal;
        diffs.push({
          field: key,
          originalValue: originalStr,
          cleanedValue: numVal,
          ruleApplied: 'Parsed numeric string into formal number',
          severity: 'fixed'
        });
      } else if (config.standardizeCase && !key.toLowerCase().includes('email') && !key.toLowerCase().includes('id') && !key.toLowerCase().includes('url')) {
        // Title Case capitalization for general text
        if (cleanVal.length > 0 && cleanVal === cleanVal.toLowerCase()) {
          const capitalized = cleanVal
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          if (capitalized !== originalStr) {
            cleanVal = capitalized;
            diffs.push({
              field: key,
              originalValue: originalStr,
              cleanedValue: cleanVal,
              ruleApplied: 'Standardized casing to Title Case',
              severity: 'fixed'
            });
          }
        }
      }

      // Boolean standardization
      if (typeof originalStr === 'string') {
        const lower = originalStr.trim().toLowerCase();
        if (lower === 'true' || lower === 'yes' || lower === 'y') {
          cleanVal = 'Yes';
        } else if (lower === 'false' || lower === 'no' || lower === 'n') {
          cleanVal = 'No';
        }
      }
    }

    cleanedData[key] = cleanVal;
  }

  return { cleanedData, diffs };
}

// Ingest an enumerator submission directly into the supervisor vault
export function ingestEnumeratorSubmissionToVault(
  agent: EnumeratorAgent,
  rawData: Record<string, any>,
  dwellTimeSeconds: number = 300,
  photosCount: number = 1
): SupervisorSubmission {
  const currentSubmissions = getStoredSupervisorSubmissions();
  const config = getStoredSupervisorCleaningConfig();
  
  const { cleanedData, diffs } = cleanRawSubmission(rawData, config);
  
  // Geofence audit
  const activeGeofences = DEFAULT_GEOFENCES;
  const matchedZone = activeGeofences.find(g => isAgentInsideGeofence(agent.lat, agent.lng, g));
  const isInside = !!matchedZone;
  const distKm = matchedZone 
    ? calculateDistanceKm(agent.lat, agent.lng, matchedZone.centerLat, matchedZone.centerLng) 
    : calculateDistanceKm(agent.lat, agent.lng, activeGeofences[0].centerLat, activeGeofences[0].centerLng);

  // Quality calculation
  let qualityScore = 95;
  const flags: AuditFlag[] = [];

  if (dwellTimeSeconds < config.minDwellTimeSeconds) {
    qualityScore -= 40;
    flags.push({
      id: `flag_dwell_${Date.now()}`,
      type: 'dwell_time_anomaly',
      title: 'Fast Survey Dwell Time',
      severity: 'high',
      confidence: 92,
      description: `Survey completed in ${dwellTimeSeconds}s, under supervisor minimum threshold of ${config.minDwellTimeSeconds}s.`,
      recommendation: 'flag_reinterview'
    });
  }

  if (!isInside && config.enforceGeofenceRules) {
    qualityScore -= 30;
    flags.push({
      id: `flag_geo_${Date.now()}`,
      type: 'geofence_breach',
      title: 'Geofence Boundary Violation',
      severity: 'medium',
      confidence: 88,
      description: `Location is outside assigned sector polygon.`,
      recommendation: 'investigate'
    });
  }

  qualityScore = Math.max(10, Math.min(100, qualityScore));

  const newSubmission: SupervisorSubmission = {
    id: `sub_vault_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    submissionCode: `SUB-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    enumeratorId: agent.id,
    enumeratorName: agent.name,
    enumeratorEmail: agent.email,
    enumeratorPhone: agent.phone,
    enumeratorRole: agent.role,
    campaign: agent.campaign,
    assignedZone: agent.assignedZone,
    collectedAt: new Date().toISOString(),
    cleanedAt: new Date().toISOString(),
    gps: {
      lat: agent.lat,
      lng: agent.lng,
      accuracy: agent.accuracy || 5,
      isInsideZone: isInside,
      distanceFromZoneCenterKm: parseFloat(distKm.toFixed(2)),
      addressDescription: agent.lastAddress || `${agent.assignedZone} - Field Checkpoint`
    },
    dwellTimeSeconds,
    questionCount: Object.keys(rawData).length,
    qualityScore,
    stage: flags.length > 0 ? 'raw_received' : 'auto_cleaned',
    rawData,
    cleanedData,
    cleaningDiffs: diffs,
    flags,
    aiQualityVerdict: flags.length === 0 
      ? 'High Quality. Automated cleaning recipe executed successfully with zero boundary breaches.'
      : 'Review Recommended: Submission contains quality warnings flagged by supervisor rules.',
    photosCount,
    offlineSync: false
  };

  const updated = [newSubmission, ...currentSubmissions];
  saveStoredSupervisorSubmissions(updated);
  return newSubmission;
}

// Convert approved cleaned submissions into Dataset rows or create a new Dataset
export function generateDatasetFromCleanedSubmissions(
  submissions: SupervisorSubmission[],
  datasetTitle: string = 'Supervisor Verified Clean Field Data'
): Dataset {
  const sampleData = submissions.map(s => ({
    submission_id: s.submissionCode,
    enumerator_name: s.enumeratorName,
    campaign: s.campaign,
    assigned_zone: s.assignedZone,
    collected_at: s.collectedAt.split('T')[0],
    gps_lat: s.gps.lat,
    gps_lng: s.gps.lng,
    dwell_time_mins: Math.round(s.dwellTimeSeconds / 60 * 10) / 10,
    quality_score: s.qualityScore,
    ...s.cleanedData
  }));

  const allKeys = new Set<string>();
  sampleData.forEach(row => {
    Object.keys(row).forEach(k => allKeys.add(k));
  });

  const columns: ColumnMeta[] = Array.from(allKeys).map(key => {
    const sampleVal = sampleData.find(d => d[key] !== undefined && d[key] !== null)?.[key];
    let type: ColumnMeta['type'] = 'string';
    if (typeof sampleVal === 'number') type = 'number';
    else if (typeof sampleVal === 'boolean') type = 'boolean';
    else if (key.includes('date') || key.includes('at')) type = 'date';

    return {
      id: key,
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type,
      nullable: true
    };
  });

  const newDataset: Dataset = {
    id: `ds_supervisor_clean_${Date.now()}`,
    name: datasetTitle,
    description: `Consolidated dataset created from ${submissions.length} supervisor-audited, cleaned enumerator submissions.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceType: 'manual',
    columns,
    data: sampleData
  };

  return newDataset;
}

// Calculate high level metrics
export function computeSupervisorMetrics(
  submissions: SupervisorSubmission[],
  fleet: EnumeratorAgent[]
): SupervisorOverviewMetrics {
  const totalSubmissions = submissions.length;
  const rawReceivedCount = submissions.filter(s => s.stage === 'raw_received').length;
  const autoCleanedCount = submissions.filter(s => s.stage === 'auto_cleaned').length;
  const supervisorApprovedCount = submissions.filter(s => s.stage === 'supervisor_approved').length;
  const rejectedCount = submissions.filter(s => s.stage === 'rejected').length;
  const ingestedCount = submissions.filter(s => s.stage === 'ingested').length;

  const totalEnumerators = fleet.length;
  const activeEnumeratorsCount = fleet.filter(f => f.status === 'collecting' || f.status === 'transit').length;

  const avgFleetQualityScore = totalSubmissions > 0
    ? Math.round(submissions.reduce((acc, s) => acc + s.qualityScore, 0) / totalSubmissions)
    : 100;

  const avgDwellTimeMinutes = totalSubmissions > 0
    ? Math.round((submissions.reduce((acc, s) => acc + s.dwellTimeSeconds, 0) / totalSubmissions / 60) * 10) / 10
    : 5.0;

  const insideZoneCount = submissions.filter(s => s.gps.isInsideZone).length;
  const geofenceCompliancePct = totalSubmissions > 0
    ? Math.round((insideZoneCount / totalSubmissions) * 100)
    : 100;

  const cleaningFixesAppliedCount = submissions.reduce((acc, s) => acc + s.cleaningDiffs.length, 0);

  return {
    totalSubmissions,
    rawReceivedCount,
    autoCleanedCount,
    supervisorApprovedCount,
    rejectedCount,
    ingestedCount,
    totalEnumerators,
    activeEnumeratorsCount,
    avgFleetQualityScore,
    avgDwellTimeMinutes,
    geofenceCompliancePct,
    cleaningFixesAppliedCount
  };
}
