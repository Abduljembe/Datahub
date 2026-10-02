import { AnomalyAlertRule, AnomalyAlertIncident, StreamMonitoringStats, Dataset, ColumnMeta } from '../types';
import { parseNumber } from './statistics';

const RULES_STORAGE_KEY = 'datahub_anomaly_alert_rules_v1';
const INCIDENTS_STORAGE_KEY = 'datahub_anomaly_alert_incidents_v1';
const STATS_STORAGE_KEY = 'datahub_anomaly_alert_stats_v1';

// Preset Alert Rules for IoT and Industrial Streams
export const DEFAULT_ALERT_RULES: AnomalyAlertRule[] = [
  {
    id: 'rule_vibration',
    name: 'Industrial Motor Vibration Surge',
    metricKey: 'vibration_mm_s',
    metricLabel: 'Vibration (mm/s)',
    enabled: true,
    zThreshold: 3.0,
    method: 'standard',
    direction: 'high',
    severity: 'critical',
    windowSize: 40,
    notifyBrowser: true,
    soundAlert: true,
    inAppToast: true,
    cooldownSeconds: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_temperature',
    name: 'Bearing Overheating Threshold',
    metricKey: 'temperature_c',
    metricLabel: 'Bearing Temp (°C)',
    enabled: true,
    zThreshold: 2.8,
    method: 'standard',
    direction: 'high',
    severity: 'critical',
    windowSize: 40,
    notifyBrowser: true,
    soundAlert: true,
    inAppToast: true,
    cooldownSeconds: 5,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_rpm_drop',
    name: 'Spindle Speed Stalling Drop',
    metricKey: 'motor_rpm',
    metricLabel: 'Shaft Speed (RPM)',
    enabled: true,
    zThreshold: 2.5,
    method: 'robust',
    direction: 'low',
    severity: 'warning',
    windowSize: 50,
    notifyBrowser: true,
    soundAlert: true,
    inAppToast: true,
    cooldownSeconds: 5,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_grid_frequency',
    name: 'Substation Frequency Instability',
    metricKey: 'grid_frequency_hz',
    metricLabel: 'Grid Frequency (Hz)',
    enabled: true,
    zThreshold: 3.0,
    method: 'standard',
    direction: 'both',
    severity: 'critical',
    windowSize: 35,
    notifyBrowser: true,
    soundAlert: true,
    inAppToast: true,
    cooldownSeconds: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_heart_rate',
    name: 'ICU Cardiac Tachycardia / Bradycardia',
    metricKey: 'heart_rate_bpm',
    metricLabel: 'Heart Rate (BPM)',
    enabled: true,
    zThreshold: 2.8,
    method: 'standard',
    direction: 'both',
    severity: 'critical',
    windowSize: 40,
    notifyBrowser: true,
    soundAlert: true,
    inAppToast: true,
    cooldownSeconds: 4,
    createdAt: new Date().toISOString()
  },
  {
    id: 'rule_spo2_drop',
    name: 'Patient Hypoxia SpO2 Drop',
    metricKey: 'spo2_pct',
    metricLabel: 'Blood Oxygen SpO2 (%)',
    enabled: true,
    zThreshold: 2.5,
    method: 'robust',
    direction: 'low',
    severity: 'critical',
    windowSize: 30,
    notifyBrowser: true,
    soundAlert: true,
    inAppToast: true,
    cooldownSeconds: 4,
    createdAt: new Date().toISOString()
  }
];

// Generate dynamic rules from any numeric dataset columns
export function generateRulesForDataset(dataset: Dataset): AnomalyAlertRule[] {
  const numericCols = dataset.columns.filter(c => c.type === 'number');
  return numericCols.map((col, idx) => ({
    id: `rule_auto_${col.name}_${idx}`,
    name: `${col.name} Outlier Alert (Z ≥ 3.0σ)`,
    metricKey: col.name,
    metricLabel: col.name,
    enabled: true,
    zThreshold: 3.0,
    method: 'standard',
    direction: 'both',
    severity: idx === 0 ? 'critical' : 'warning',
    windowSize: Math.min(50, Math.max(20, Math.floor(dataset.data.length / 5))),
    notifyBrowser: true,
    soundAlert: true,
    inAppToast: true,
    cooldownSeconds: 5,
    createdAt: new Date().toISOString()
  }));
}

// Storage helpers
export function getSavedAlertRules(): AnomalyAlertRule[] {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return DEFAULT_ALERT_RULES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ALERT_RULES;
  } catch {
    return DEFAULT_ALERT_RULES;
  }
}

export function saveAlertRules(rules: AnomalyAlertRule[]): void {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch (err) {
    console.warn('Failed to save alert rules:', err);
  }
}

export function getSavedAlertIncidents(): AnomalyAlertIncident[] {
  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAlertIncidents(incidents: AnomalyAlertIncident[]): void {
  try {
    localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents.slice(0, 500)));
  } catch (err) {
    console.warn('Failed to save incidents:', err);
  }
}

export function getSavedMonitoringStats(): StreamMonitoringStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) {
      return {
        totalPointsProcessed: 0,
        outliersDetectedCount: 0,
        criticalAlertsCount: 0,
        warningAlertsCount: 0,
        browserNotificationsSentCount: 0,
        currentStreamSpeedHz: 2,
        activeRulesCount: DEFAULT_ALERT_RULES.filter(r => r.enabled).length,
        lastUpdated: new Date().toISOString()
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      totalPointsProcessed: 0,
      outliersDetectedCount: 0,
      criticalAlertsCount: 0,
      warningAlertsCount: 0,
      browserNotificationsSentCount: 0,
      currentStreamSpeedHz: 2,
      activeRulesCount: DEFAULT_ALERT_RULES.filter(r => r.enabled).length,
      lastUpdated: new Date().toISOString()
    };
  }
}

export function saveMonitoringStats(stats: StreamMonitoringStats): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.warn('Failed to save stats:', err);
  }
}

/**
 * Statistical Baseline Calculations
 */
export interface RollingStats {
  mean: number;
  stdDev: number;
  variance: number;
  median: number;
  mad: number;
  min: number;
  max: number;
  count: number;
}

export function computeRollingStats(values: number[]): RollingStats {
  const valid = values.filter(v => typeof v === 'number' && !isNaN(v));
  if (valid.length === 0) {
    return { mean: 0, stdDev: 1, variance: 1, median: 0, mad: 1, min: 0, max: 0, count: 0 };
  }

  const n = valid.length;
  const sum = valid.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const sqDiffs = valid.map(v => Math.pow(v - mean, 2));
  const variance = n > 1 ? sqDiffs.reduce((a, b) => a + b, 0) / (n - 1) : 0.0001;
  const stdDev = Math.max(0.0001, Math.sqrt(variance));

  // Median & MAD
  const sorted = [...valid].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  
  const absDevs = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
  const madRaw = n % 2 === 0 ? (absDevs[n / 2 - 1] + absDevs[n / 2]) / 2 : absDevs[Math.floor(n / 2)];
  const mad = Math.max(0.0001, madRaw);

  return {
    mean,
    stdDev,
    variance,
    median,
    mad,
    min: sorted[0],
    max: sorted[n - 1],
    count: n
  };
}

/**
 * Evaluates an incoming single point against a specific active rule
 */
export interface PointEvaluationResult {
  isOutlier: boolean;
  value: number;
  zScore: number;
  robustZScore: number;
  effectiveZ: number;
  baseline: RollingStats;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  shouldNotify: boolean;
}

export function evaluateStreamPoint(
  val: number,
  history: number[],
  rule: AnomalyAlertRule
): PointEvaluationResult {
  const windowSlice = history.slice(-rule.windowSize);
  const baseline = computeRollingStats(windowSlice.length >= 3 ? windowSlice : [val, val * 0.98, val * 1.02]);
  
  // Standard Z-Score: (x - mean) / stdDev
  const zScore = (val - baseline.mean) / baseline.stdDev;
  
  // Robust Z-Score: 0.6745 * (x - median) / MAD
  const robustZScore = 0.6745 * ((val - baseline.median) / baseline.mad);

  const effectiveZ = rule.method === 'robust' ? robustZScore : zScore;
  const absZ = Math.abs(effectiveZ);

  let isOutlier = false;
  if (rule.direction === 'high') {
    isOutlier = effectiveZ >= rule.zThreshold;
  } else if (rule.direction === 'low') {
    isOutlier = effectiveZ <= -rule.zThreshold;
  } else {
    isOutlier = absZ >= rule.zThreshold;
  }

  // Determine severity tier
  let severity: 'critical' | 'warning' | 'info' = 'info';
  if (isOutlier) {
    if (absZ >= rule.zThreshold * 1.35 || rule.severity === 'critical') {
      severity = 'critical';
    } else {
      severity = 'warning';
    }
  }

  const directionLabel = effectiveZ > 0 ? `+${effectiveZ.toFixed(2)}σ above` : `${effectiveZ.toFixed(2)}σ below`;
  const message = `${rule.metricLabel} reading ${val.toFixed(2)} is ${directionLabel} baseline mean (${baseline.mean.toFixed(2)} ± ${baseline.stdDev.toFixed(2)}), exceeding threshold ${rule.zThreshold.toFixed(1)}σ.`;

  // Cooldown check for notifications
  let shouldNotify = isOutlier;
  if (isOutlier && rule.lastTriggeredAt) {
    const lastTime = new Date(rule.lastTriggeredAt).getTime();
    const elapsedSec = (Date.now() - lastTime) / 1000;
    if (elapsedSec < (rule.cooldownSeconds || 4)) {
      shouldNotify = false; // in cooldown window
    }
  }

  return {
    isOutlier,
    value: val,
    zScore,
    robustZScore,
    effectiveZ,
    baseline,
    severity,
    message,
    shouldNotify
  };
}

/**
 * Web Audio API Alert Chime
 */
let sharedAudioContext: AudioContext | null = null;

export function playAlertChime(severity: 'critical' | 'warning' | 'info' = 'critical'): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioContext || sharedAudioContext.state === 'suspended') {
      sharedAudioContext = new AudioCtx();
    }
    const ctx = sharedAudioContext;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'critical') {
      // Dual high-pitch urgent siren beep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Soft two-tone warning chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.32);
    }
  } catch (err) {
    console.debug('Audio alert playback silent fail:', err);
  }
}

/**
 * Browser Notification Dispatcher
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('HTML5 Web Notifications not supported in this browser.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const res = await Notification.requestPermission();
    return res;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export function sendBrowserNotification(
  title: string,
  options: {
    body: string;
    tag?: string;
    icon?: string;
    requireInteraction?: boolean;
    data?: any;
  }
): boolean {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: options.body,
        tag: options.tag || 'datahub-anomaly-alert',
        icon: options.icon || 'https://api.iconify.design/lucide:shield-alert.svg?color=%23ef4444',
        requireInteraction: options.requireInteraction ?? false,
        silent: true // Audio is handled independently with Web Audio API chime
      });

      // Auto close after 6 seconds
      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, 6000);

      return true;
    } catch (err) {
      console.warn('Failed to dispatch browser notification:', err);
      return false;
    }
  }
  return false;
}
