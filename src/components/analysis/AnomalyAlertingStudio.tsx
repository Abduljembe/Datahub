import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Sliders,
  SlidersHorizontal,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  Filter,
  Search,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  Radio,
  FileSpreadsheet,
  X,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  Dataset,
  ColumnMeta,
  AnomalyAlertRule,
  AnomalyAlertIncident,
  StreamMonitoringStats
} from '../../types';
import {
  DEFAULT_ALERT_RULES,
  getSavedAlertRules,
  saveAlertRules,
  getSavedAlertIncidents,
  saveAlertIncidents,
  getSavedMonitoringStats,
  saveMonitoringStats,
  evaluateStreamPoint,
  computeRollingStats,
  playAlertChime,
  requestNotificationPermission,
  sendBrowserNotification,
  generateRulesForDataset
} from '../../utils/anomalyAlertingEngine';
import { exportToCSV, exportToJSON } from '../../utils/dataEngine';

interface AnomalyAlertingStudioProps {
  dataset?: Dataset;
  availableDatasets?: Dataset[];
  onUpdateDataset?: (dataset: Dataset) => void;
  onCreateDataset?: (newDataset: Dataset) => void;
}

// IoT Stream Preset Definitions
const IOT_STREAM_PRESETS = [
  {
    id: 'factory_cnc',
    name: 'Smart Factory CNC Spindle & Motor',
    category: 'Industrial IoT',
    metrics: [
      { key: 'vibration_mm_s', name: 'Vibration (mm/s)', base: 2.5, variance: 0.75, spikeMin: 7.2, spikeMax: 10.5, unit: 'mm/s' },
      { key: 'temperature_c', name: 'Bearing Temp (°C)', base: 65.0, variance: 3.2, spikeMin: 92.0, spikeMax: 112.0, unit: '°C' },
      { key: 'motor_rpm', name: 'Shaft Speed (RPM)', base: 1750, variance: 22, spikeMin: 1180, spikeMax: 1350, unit: 'RPM' },
      { key: 'pressure_psi', name: 'Hydraulic Pressure (PSI)', base: 120.0, variance: 4.5, spikeMin: 68.0, spikeMax: 82.0, unit: 'PSI' }
    ]
  },
  {
    id: 'power_grid',
    name: 'Smart Substation Transmission Grid',
    category: 'Energy & Utilities',
    metrics: [
      { key: 'grid_frequency_hz', name: 'Grid Frequency (Hz)', base: 60.0, variance: 0.04, spikeMin: 59.1, spikeMax: 59.4, unit: 'Hz' },
      { key: 'voltage_kv', name: 'Line Voltage (kV)', base: 115.0, variance: 1.1, spikeMin: 98.0, spikeMax: 104.0, unit: 'kV' },
      { key: 'current_load_mw', name: 'Active Load (MW)', base: 450.0, variance: 16.0, spikeMin: 610.0, spikeMax: 680.0, unit: 'MW' }
    ]
  },
  {
    id: 'health_icu',
    name: 'ICU Patient Bedside Telemetry Monitor',
    category: 'Healthcare Devices',
    metrics: [
      { key: 'heart_rate_bpm', name: 'Heart Rate (BPM)', base: 72.0, variance: 3.8, spikeMin: 135.0, spikeMax: 165.0, unit: 'BPM' },
      { key: 'spo2_pct', name: 'Blood Oxygen SpO2 (%)', base: 98.5, variance: 0.4, spikeMin: 86.0, spikeMax: 90.5, unit: '%' },
      { key: 'systolic_bp', name: 'Systolic BP (mmHg)', base: 120.0, variance: 5.5, spikeMin: 175.0, spikeMax: 200.0, unit: 'mmHg' }
    ]
  },
  {
    id: 'aerospace_engine',
    name: 'Turbofan Jet Engine Core Telemetry',
    category: 'Aerospace Fleet',
    metrics: [
      { key: 'exhaust_temp_c', name: 'EGT Exhaust Temp (°C)', base: 640.0, variance: 12.0, spikeMin: 850.0, spikeMax: 940.0, unit: '°C' },
      { key: 'n1_spool_pct', name: 'N1 Fan Spool Speed (%)', base: 92.0, variance: 1.2, spikeMin: 106.0, spikeMax: 114.0, unit: '%' },
      { key: 'oil_pressure_psi', name: 'Engine Oil Pressure (PSI)', base: 55.0, variance: 2.0, spikeMin: 28.0, spikeMax: 36.0, unit: 'PSI' }
    ]
  }
];

export const AnomalyAlertingStudio: React.FC<AnomalyAlertingStudioProps> = ({
  dataset,
  availableDatasets = [],
  onUpdateDataset,
  onCreateDataset
}) => {
  // Stream Source Selection ('iot_preset' | 'uploaded_dataset')
  const [streamSourceType, setStreamSourceType] = useState<'iot_preset' | 'uploaded_dataset'>('iot_preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('factory_cnc');
  const [selectedPlaybackDatasetId, setSelectedPlaybackDatasetId] = useState<string>(dataset?.id || availableDatasets[0]?.id || '');
  const [playbackRowIndex, setPlaybackRowIndex] = useState<number>(0);

  // Monitoring Engine State
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [streamFrequencyHz, setStreamFrequencyHz] = useState<number>(2); // 1 to 10 Hz
  const [soundAlertEnabled, setSoundAlertEnabled] = useState<boolean>(true);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<NotificationPermission>(() => {
    return 'Notification' in window ? Notification.permission : 'default';
  });

  // Manual Spike Trigger
  const [pendingSpikeMetric, setPendingSpikeMetric] = useState<string | null>(null);

  // Rules & Incident Storage
  const [alertRules, setAlertRules] = useState<AnomalyAlertRule[]>(() => getSavedAlertRules());
  const [incidents, setIncidents] = useState<AnomalyAlertIncident[]>(() => getSavedAlertIncidents());
  const [stats, setStats] = useState<StreamMonitoringStats>(() => getSavedMonitoringStats());

  // Real-time Stream Buffer for Charts
  const [streamDataBuffer, setStreamDataBuffer] = useState<Record<string, any>[]>([]);
  const metricHistoryRef = useRef<Record<string, number[]>>({});

  // Active Selected Metric for Oscilloscope Chart
  const [activeChartMetric, setActiveChartMetric] = useState<string>('vibration_mm_s');

  // Rule Creation & Edit Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<AnomalyAlertRule | null>(null);

  // Incident Feed Filter
  const [incidentFilterSeverity, setIncidentFilterSeverity] = useState<string>('all');
  const [incidentFilterStatus, setIncidentFilterStatus] = useState<string>('all');
  const [incidentSearchQuery, setIncidentSearchQuery] = useState<string>('');

  // Floating Latest Alert Toast
  const [activeToastAlert, setActiveToastAlert] = useState<AnomalyAlertIncident | null>(null);

  const selectedPreset = IOT_STREAM_PRESETS.find(p => p.id === selectedPresetId) || IOT_STREAM_PRESETS[0];
  const playbackDataset = availableDatasets.find(d => d.id === selectedPlaybackDatasetId) || dataset;

  // Sync active chart metric when source changes
  useEffect(() => {
    if (streamSourceType === 'iot_preset') {
      if (!selectedPreset.metrics.some(m => m.key === activeChartMetric)) {
        setActiveChartMetric(selectedPreset.metrics[0]?.key || 'vibration_mm_s');
      }
    } else if (playbackDataset) {
      const numCols = playbackDataset.columns.filter(c => c.type === 'number');
      if (numCols.length > 0 && !numCols.some(c => c.name === activeChartMetric)) {
        setActiveChartMetric(numCols[0].name);
      }
    }
  }, [streamSourceType, selectedPresetId, selectedPlaybackDatasetId]);

  // Request browser notification permissions
  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setBrowserNotifPermission(perm);
    if (perm === 'granted') {
      sendBrowserNotification('✅ Alerting System Online', {
        body: 'Browser notifications enabled for Statistical Z-Score Anomaly Outlier events.'
      });
    }
  };

  // Test Browser Notification trigger
  const handleTestNotification = () => {
    sendBrowserNotification('🧪 Test Outlier Alert (Z = +3.85σ)', {
      body: 'Industrial Motor Vibration spiked to 8.92 mm/s (Baseline μ: 2.51 ± 0.72).'
    });
    if (soundAlertEnabled) {
      playAlertChime('critical');
    }
  };

  // Trigger Instant Anomaly Spike
  const handleTriggerAnomalySpike = (metricKey?: string) => {
    const targetKey = metricKey || activeChartMetric || selectedPreset.metrics[0]?.key;
    setPendingSpikeMetric(targetKey);
  };

  // Main Streaming Interval Loop
  useEffect(() => {
    let intervalId: any = null;
    if (isMonitoring) {
      intervalId = setInterval(() => {
        const now = new Date();
        const timeLabel = now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100);
        
        let newRow: Record<string, any> = {
          timestamp: now.toISOString(),
          timeLabel,
          _source: streamSourceType === 'iot_preset' ? selectedPreset.name : playbackDataset?.name || 'Dataset Stream'
        };

        const currentActiveMetricKeys: string[] = [];

        // 1. Generate / Fetch Row Data
        if (streamSourceType === 'iot_preset') {
          selectedPreset.metrics.forEach(m => {
            currentActiveMetricKeys.push(m.key);
            let val = m.base + (Math.random() - 0.5) * 2 * m.variance;
            
            // Check if manual anomaly was triggered for this metric
            if (pendingSpikeMetric === m.key) {
              val = m.spikeMin + Math.random() * (m.spikeMax - m.spikeMin);
            }
            newRow[m.key] = Math.round(val * 100) / 100;
          });

          if (pendingSpikeMetric) {
            setPendingSpikeMetric(null);
          }
        } else if (playbackDataset && playbackDataset.data.length > 0) {
          const rawRow = playbackDataset.data[playbackRowIndex % playbackDataset.data.length];
          setPlaybackRowIndex(prev => prev + 1);

          playbackDataset.columns.forEach(col => {
            if (col.type === 'number') {
              currentActiveMetricKeys.push(col.name);
              let val = Number(rawRow[col.name]) || 0;
              if (pendingSpikeMetric === col.name) {
                val = val * (1 + (Math.random() > 0.5 ? 2.5 : -0.8));
              }
              newRow[col.name] = Math.round(val * 100) / 100;
            } else {
              newRow[col.name] = rawRow[col.name];
            }
          });

          if (pendingSpikeMetric) {
            setPendingSpikeMetric(null);
          }
        }

        // 2. Evaluate Each Metric Against Statistical Rules
        const detectedIncidents: AnomalyAlertIncident[] = [];
        let updatedStats = { ...stats };
        updatedStats.totalPointsProcessed += currentActiveMetricKeys.length;

        currentActiveMetricKeys.forEach(metricKey => {
          const val = newRow[metricKey];
          if (typeof val !== 'number' || isNaN(val)) return;

          // Update rolling history buffer
          if (!metricHistoryRef.current[metricKey]) {
            metricHistoryRef.current[metricKey] = [];
          }
          metricHistoryRef.current[metricKey].push(val);
          if (metricHistoryRef.current[metricKey].length > 300) {
            metricHistoryRef.current[metricKey].shift();
          }

          const history = metricHistoryRef.current[metricKey];

          // Check all active rules targeting this metric
          const matchingRules = alertRules.filter(r => r.enabled && (r.metricKey === metricKey || r.metricKey === '*'));
          
          matchingRules.forEach(rule => {
            const evalResult = evaluateStreamPoint(val, history, rule);

            if (evalResult.isOutlier) {
              const incident: AnomalyAlertIncident = {
                id: `inc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                ruleId: rule.id,
                ruleName: rule.name,
                metricKey,
                metricLabel: rule.metricLabel || metricKey,
                timestamp: now.toISOString(),
                streamSource: newRow._source,
                value: val,
                baselineMean: evalResult.baseline.mean,
                baselineStdDev: evalResult.baseline.stdDev,
                baselineMedian: evalResult.baseline.median,
                baselineMad: evalResult.baseline.mad,
                zScore: evalResult.effectiveZ,
                severity: evalResult.severity,
                status: 'active',
                message: evalResult.message,
                fullRecordSnapshot: newRow
              };

              detectedIncidents.push(incident);

              // Update rule trigger timestamp
              rule.lastTriggeredAt = now.toISOString();

              // Stats tracking
              updatedStats.outliersDetectedCount += 1;
              if (evalResult.severity === 'critical') updatedStats.criticalAlertsCount += 1;
              else updatedStats.warningAlertsCount += 1;

              // Fire notifications if allowed by cooldown
              if (evalResult.shouldNotify) {
                // Audio Chime
                if (soundAlertEnabled && rule.soundAlert) {
                  playAlertChime(evalResult.severity);
                }

                // In-App Toast
                if (rule.inAppToast) {
                  setActiveToastAlert(incident);
                }

                // Native HTML5 Browser Notification
                if (rule.notifyBrowser && browserNotifPermission === 'granted') {
                  const directionEmoji = evalResult.effectiveZ > 0 ? '🔺' : '🔻';
                  sendBrowserNotification(
                    `🚨 ${evalResult.severity === 'critical' ? 'CRITICAL' : 'WARNING'} Outlier: ${rule.metricLabel} (${directionEmoji}${Math.abs(evalResult.effectiveZ).toFixed(2)}σ)`,
                    {
                      body: `${rule.metricLabel} reading ${val.toFixed(2)} exceeded ${rule.zThreshold.toFixed(1)}σ threshold.\nBaseline: μ ${evalResult.baseline.mean.toFixed(2)} (±${evalResult.baseline.stdDev.toFixed(2)})`
                    }
                  );
                  updatedStats.browserNotificationsSentCount += 1;
                }
              }
            }
          });
        });

        // 3. Update State Buffers
        setStreamDataBuffer(prev => [...prev.slice(-35), newRow]);

        if (detectedIncidents.length > 0) {
          setIncidents(prev => {
            const nextIncidents = [...detectedIncidents, ...prev].slice(0, 500);
            saveAlertIncidents(nextIncidents);
            return nextIncidents;
          });
        }

        updatedStats.lastUpdated = now.toISOString();
        setStats(updatedStats);
        saveMonitoringStats(updatedStats);

      }, 1000 / streamFrequencyHz);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    isMonitoring,
    streamFrequencyHz,
    streamSourceType,
    selectedPresetId,
    selectedPlaybackDatasetId,
    playbackRowIndex,
    alertRules,
    pendingSpikeMetric,
    soundAlertEnabled,
    browserNotifPermission,
    playbackDataset
  ]);

  // Save rules changes
  const handleToggleRule = (ruleId: string) => {
    const updated = alertRules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
    setAlertRules(updated);
    saveAlertRules(updated);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updated = alertRules.filter(r => r.id !== ruleId);
    setAlertRules(updated);
    saveAlertRules(updated);
  };

  const handleSaveRule = (rule: AnomalyAlertRule) => {
    if (editingRule) {
      const updated = alertRules.map(r => r.id === rule.id ? rule : r);
      setAlertRules(updated);
      saveAlertRules(updated);
    } else {
      const updated = [rule, ...alertRules];
      setAlertRules(updated);
      saveAlertRules(updated);
    }
    setIsRuleModalOpen(false);
    setEditingRule(null);
  };

  // Incident status update
  const handleAcknowledgeIncident = (incidentId: string) => {
    const updated = incidents.map(inc => inc.id === incidentId ? { ...inc, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString() } : inc);
    setIncidents(updated);
    saveAlertIncidents(updated);
    if (activeToastAlert?.id === incidentId) {
      setActiveToastAlert(null);
    }
  };

  const handleResolveIncident = (incidentId: string) => {
    const updated = incidents.map(inc => inc.id === incidentId ? { ...inc, status: 'resolved' as const } : inc);
    setIncidents(updated);
    saveAlertIncidents(updated);
  };

  const handleAcknowledgeAll = () => {
    const updated = incidents.map(inc => ({ ...inc, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString() }));
    setIncidents(updated);
    saveAlertIncidents(updated);
    setActiveToastAlert(null);
  };

  const handleClearAllIncidents = () => {
    setIncidents([]);
    saveAlertIncidents([]);
    setActiveToastAlert(null);
  };

  // Auto-generate rules from current dataset
  const handleAutoGenerateRules = () => {
    if (playbackDataset) {
      const genRules = generateRulesForDataset(playbackDataset);
      const updated = [...genRules, ...alertRules.filter(r => !genRules.some(g => g.metricKey === r.metricKey))];
      setAlertRules(updated);
      saveAlertRules(updated);
    }
  };

  // Export incident reports
  const handleExportIncidentsCSV = () => {
    const flat = incidents.map(i => ({
      Timestamp: i.timestamp,
      Metric: i.metricLabel,
      ObservedValue: i.value,
      ZScore: i.zScore.toFixed(3),
      BaselineMean: i.baselineMean.toFixed(3),
      BaselineStdDev: i.baselineStdDev.toFixed(3),
      Severity: i.severity,
      Status: i.status,
      RuleName: i.ruleName,
      StreamSource: i.streamSource,
      Details: i.message
    }));
    exportToCSV(flat, `anomaly-alert-incidents-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      const matchSeverity = incidentFilterSeverity === 'all' || inc.severity === incidentFilterSeverity;
      const matchStatus = incidentFilterStatus === 'all' || inc.status === incidentFilterStatus;
      const matchSearch = incidentSearchQuery === '' ||
        inc.metricLabel.toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
        inc.ruleName.toLowerCase().includes(incidentSearchQuery.toLowerCase()) ||
        inc.streamSource.toLowerCase().includes(incidentSearchQuery.toLowerCase());
      return matchSeverity && matchStatus && matchSearch;
    });
  }, [incidents, incidentFilterSeverity, incidentFilterStatus, incidentSearchQuery]);

  // Current metric baseline for live chart reference lines
  const activeMetricHistory = metricHistoryRef.current[activeChartMetric] || [];
  const activeMetricStats = useMemo(() => {
    return computeRollingStats(activeMetricHistory.slice(-50));
  }, [activeMetricHistory, streamDataBuffer]);

  const activeRuleForChart = alertRules.find(r => r.enabled && r.metricKey === activeChartMetric) || {
    zThreshold: 3.0,
    direction: 'both'
  };

  const upperLimit = activeMetricStats.mean + activeRuleForChart.zThreshold * activeMetricStats.stdDev;
  const lowerLimit = activeMetricStats.mean - activeRuleForChart.zThreshold * activeMetricStats.stdDev;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER COMMAND BAR */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Title & Description */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-md">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Real-Time Anomaly Alerting & Stream Monitoring</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Statistical Z-Score Thresholds</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Monitors high-frequency IoT telemetry or uploaded data streams against dynamic statistical baselines ($Z \ge \pm 3.0\sigma$). Dispatches instant native browser notifications, acoustic audio chimes, and incident forensics when outliers breach statistical confidence bands.
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Stream Play/Pause Toggle */}
            <button
              onClick={() => setIsMonitoring(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                isMonitoring
                  ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
              }`}
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isMonitoring ? 'Pause Monitoring' : 'Resume Stream'}</span>
            </button>

            {/* Manual Anomaly Injection Trigger */}
            <button
              onClick={() => handleTriggerAnomalySpike()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 active:scale-95"
              title="Inject an instantaneous statistical outlier spike to test detection & alerting"
            >
              <Zap className="w-4 h-4 text-amber-200" />
              <span>Simulate Anomaly Spike</span>
            </button>

            {/* Browser Notifications Toggle / Permission */}
            {browserNotifPermission === 'granted' ? (
              <button
                onClick={handleTestNotification}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                title="Browser Notifications are Active. Click to send test alert."
              >
                <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                <span>Browser Alerts Active</span>
              </button>
            ) : (
              <button
                onClick={handleRequestPermission}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md animate-pulse"
                title="Enable Native Browser Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Browser Alerts</span>
              </button>
            )}

            {/* Audio Alert Toggle */}
            <button
              onClick={() => setSoundAlertEnabled(prev => !prev)}
              className={`p-2 rounded-xl border text-xs transition-colors ${
                soundAlertEnabled
                  ? 'bg-slate-800 text-cyan-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
              }`}
              title={soundAlertEnabled ? 'Audio Alerts Enabled (Click to Mute)' : 'Audio Alerts Muted (Click to Enable)'}
            >
              {soundAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Export Incidents */}
            <button
              onClick={handleExportIncidentsCSV}
              disabled={incidents.length === 0}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors disabled:opacity-40"
              title="Export Alert Incidents to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* METRICS TELEMETRY BAR */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Stream Status</div>
            <div className="text-base font-mono font-extrabold text-white flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isMonitoring ? 'LIVE MONITORING' : 'PAUSED'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Points Processed</div>
            <div className="text-base font-mono font-extrabold text-indigo-400 mt-0.5">
              {stats.totalPointsProcessed.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Outliers Flagged</div>
            <div className="text-base font-mono font-extrabold text-rose-400 mt-0.5 flex items-center gap-1">
              <span>{stats.outliersDetectedCount}</span>
              {stats.outliersDetectedCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300">
                  {stats.criticalAlertsCount} crit
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Browser Alerts Sent</div>
            <div className="text-base font-mono font-extrabold text-emerald-400 mt-0.5">
              {stats.browserNotificationsSentCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Rules</div>
            <div className="text-base font-mono font-extrabold text-cyan-400 mt-0.5">
              {alertRules.filter(r => r.enabled).length} Rules
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Sampling Rate</div>
            <div className="text-base font-mono font-extrabold text-white mt-0.5 flex items-center justify-between">
              <span>{streamFrequencyHz} Hz</span>
              <div className="flex gap-1 text-[10px]">
                {[1, 2, 5].map(hz => (
                  <button
                    key={hz}
                    onClick={() => setStreamFrequencyHz(hz)}
                    className={`px-1.5 py-0.5 rounded ${streamFrequencyHz === hz ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {hz}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* STREAM SOURCE SELECTOR TABS */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        
        {/* Source Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stream Source:</span>
          
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setStreamSourceType('iot_preset')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                streamSourceType === 'iot_preset'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>IoT Telemetry Hardware</span>
            </button>

            <button
              onClick={() => setStreamSourceType('uploaded_dataset')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                streamSourceType === 'uploaded_dataset'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Uploaded Stream Playback</span>
            </button>
          </div>
        </div>

        {/* Source Configuration Controls */}
        {streamSourceType === 'iot_preset' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sensor Model:</span>
            <select
              value={selectedPresetId}
              onChange={e => setSelectedPresetId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              {IOT_STREAM_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Target Dataset:</span>
            <select
              value={selectedPlaybackDatasetId}
              onChange={e => {
                setSelectedPlaybackDatasetId(e.target.value);
                setPlaybackRowIndex(0);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              {availableDatasets.map(ds => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.data.length} rows)
                </option>
              ))}
            </select>

            <button
              onClick={handleAutoGenerateRules}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
              title="Automatically create Z-score alerting rules for all numeric columns in this dataset"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Generate Rules</span>
            </button>
          </div>
        )}

      </div>

      {/* LIVE OSCILLOSCOPE & STATISTICAL BANDS CHART */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        
        {/* Oscilloscope Header & Metric Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Live Stream Oscilloscope & Statistical Z-Score Bands</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ±{activeRuleForChart.zThreshold}σ Threshold
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Moving window showing baseline mean ($\mu = {activeMetricStats.mean.toFixed(2)}$), std dev ($\sigma = {activeMetricStats.stdDev.toFixed(2)}$), and dynamic anomaly trigger thresholds.
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(streamSourceType === 'iot_preset'
              ? selectedPreset.metrics.map(m => ({ key: m.key, label: m.name }))
              : (playbackDataset?.columns.filter(c => c.type === 'number').map(c => ({ key: c.name, label: c.name })) || [])
            ).map(m => {
              const isSelected = m.key === activeChartMetric;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveChartMetric(m.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Oscilloscope Chart Container */}
        <div className="h-72 w-full pt-2">
          {streamDataBuffer.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              <Activity className="w-5 h-5 mr-2 animate-spin text-indigo-400" />
              <span>Awaiting incoming real-time telemetry stream packets...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streamDataBuffer} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timeLabel" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '1rem', color: '#f8fafc', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}`, activeChartMetric]}
                />
                
                {/* Baseline Mean Reference Line */}
                <ReferenceLine
                  y={activeMetricStats.mean}
                  stroke="#6366f1"
                  strokeDasharray="4 4"
                  label={{ value: `Mean μ: ${activeMetricStats.mean.toFixed(1)}`, fill: '#818cf8', fontSize: 10, position: 'right' }}
                />

                {/* Upper Anomaly Cutoff */}
                <ReferenceLine
                  y={upperLimit}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: `+${activeRuleForChart.zThreshold}σ (${upperLimit.toFixed(1)})`, fill: '#f87171', fontSize: 10, position: 'right' }}
                />

                {/* Lower Anomaly Cutoff */}
                <ReferenceLine
                  y={lowerLimit}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  label={{ value: `-${activeRuleForChart.zThreshold}σ (${lowerLimit.toFixed(1)})`, fill: '#f87171', fontSize: 10, position: 'right' }}
                />

                {/* Real-time Telemetry Line */}
                <Line
                  type="monotone"
                  dataKey={activeChartMetric}
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const val = payload[activeChartMetric];
                    const z = activeMetricStats.stdDev > 0 ? Math.abs(val - activeMetricStats.mean) / activeMetricStats.stdDev : 0;
                    const isOutlier = z >= activeRuleForChart.zThreshold;

                    if (isOutlier) {
                      return (
                        <g key={`outlier_dot_${payload.timestamp}`}>
                          <circle cx={cx} cy={cy} r={8} fill="#ef4444" opacity={0.3} className="animate-ping" />
                          <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#ffffff" strokeWidth={1.5} />
                        </g>
                      );
                    }
                    return <circle key={`dot_${payload.timestamp}`} cx={cx} cy={cy} r={2} fill="#06b6d4" />;
                  }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Live Gauges Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {(streamSourceType === 'iot_preset'
            ? selectedPreset.metrics
            : (playbackDataset?.columns.filter(c => c.type === 'number').map(c => ({ key: c.name, name: c.name, unit: '' })) || [])
          ).slice(0, 4).map(m => {
            const currentVal = streamDataBuffer[streamDataBuffer.length - 1]?.[m.key];
            const history = metricHistoryRef.current[m.key] || [];
            const stats = computeRollingStats(history.slice(-30));
            const z = stats.stdDev > 0 && currentVal !== undefined ? (currentVal - stats.mean) / stats.stdDev : 0;
            const absZ = Math.abs(z);
            const isAnomaly = absZ >= 2.5;

            return (
              <div
                key={m.key}
                onClick={() => setActiveChartMetric(m.key)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  activeChartMetric === m.key
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold truncate">{m.name}</span>
                  {isAnomaly && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      ALERT
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-2">
                  <div className="text-lg font-mono font-extrabold text-white">
                    {currentVal !== undefined ? currentVal.toFixed(2) : '--'}
                    {m.unit && <span className="text-xs text-slate-400 font-normal ml-1">{m.unit}</span>}
                  </div>

                  <div className={`text-xs font-mono font-bold ${
                    absZ >= 3.0 ? 'text-rose-400' :
                    absZ >= 2.0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {z > 0 ? `+${z.toFixed(2)}σ` : `${z.toFixed(2)}σ`}
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${
                      absZ >= 3.0 ? 'bg-rose-500' :
                      absZ >= 2.0 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (absZ / 4.0) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* TWO-COLUMN WORKSPACE: ALERT RULES & LIVE INCIDENT STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE STATISTICAL RULES MANAGER (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  <span>Statistical Outlier Alert Rules</span>
                </h3>
                <p className="text-xs text-slate-400">Configure Z-score thresholds and dispatch triggers</p>
              </div>

              <button
                onClick={() => {
                  setEditingRule(null);
                  setIsRuleModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Rule</span>
              </button>
            </div>

            {/* Rules List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {alertRules.map(rule => (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    rule.enabled
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{rule.name}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          rule.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {rule.severity.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400">
                        Metric: <span className="font-mono text-cyan-300">{rule.metricLabel}</span> • Threshold: <span className="font-mono text-amber-300 font-bold">±{rule.zThreshold}σ</span> ({rule.method})
                      </div>
                    </div>

                    {/* Enable Toggle */}
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        rule.enabled ? 'bg-indigo-600' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Channel Badges & Actions */}
                  <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-800/60 text-[10px]">
                    <div className="flex items-center gap-2 text-slate-400">
                      {rule.notifyBrowser && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Bell className="w-3 h-3" />
                          <span>Browser</span>
                        </span>
                      )}
                      {rule.soundAlert && (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Volume2 className="w-3 h-3" />
                          <span>Audio</span>
                        </span>
                      )}
                      <span>Window: {rule.windowSize}pts</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingRule(rule);
                          setIsRuleModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-indigo-300 px-1.5 py-0.5 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-slate-400 hover:text-rose-400 px-1.5 py-0.5 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME OUTLIER INCIDENT LOG & AUDIT (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col h-full min-h-[500px]">
            
            {/* Incident Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                    <span>Real-Time Outlier Alert Incident Log</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                    {filteredIncidents.length} Events
                  </span>
                </div>
                <p className="text-xs text-slate-400">Chronological feed of statistical outliers detected</p>
              </div>

              <div className="flex items-center gap-2">
                {incidents.some(i => i.status === 'active') && (
                  <button
                    onClick={handleAcknowledgeAll}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ack All</span>
                  </button>
                )}

                {incidents.length > 0 && (
                  <button
                    onClick={handleClearAllIncidents}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 text-xs transition-colors"
                    title="Clear Incident History"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={incidentSearchQuery}
                  onChange={e => setIncidentSearchQuery(e.target.value)}
                  placeholder="Filter metric, rule, source..."
                  className="w-full pl-7 pr-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={incidentFilterSeverity}
                onChange={e => setIncidentFilterSeverity(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warning Only</option>
              </select>

              <select
                value={incidentFilterStatus}
                onChange={e => setIncidentFilterStatus(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Incident Cards Feed */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[420px]">
              {filteredIncidents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500/40" />
                  <p className="font-semibold text-slate-400">No outlier breaches detected in current filter window.</p>
                  <p className="text-[11px]">Stream telemetry is operating stably within $\pm 3.0\sigma$ tolerance.</p>
                </div>
              ) : (
                filteredIncidents.map(inc => {
                  const isCritical = inc.severity === 'critical';
                  const isActive = inc.status === 'active';

                  return (
                    <div
                      key={inc.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isActive
                          ? isCritical
                            ? 'bg-rose-950/40 border-rose-500/50 shadow-md'
                            : 'bg-amber-950/40 border-amber-500/50 shadow-md'
                          : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{inc.metricLabel}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {inc.severity.toUpperCase()}
                            </span>

                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white animate-pulse">
                                ACTIVE
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 leading-snug">
                            {inc.message}
                          </p>

                          <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                            <span>Time: <span className="font-mono text-slate-300">{new Date(inc.timestamp).toLocaleTimeString()}</span></span>
                            <span>Source: <span className="text-indigo-300">{inc.streamSource}</span></span>
                          </div>
                        </div>

                        {/* Z-Score Badge & Action Button */}
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-extrabold ${
                            isCritical
                              ? 'bg-rose-500 text-white shadow-sm'
                              : 'bg-amber-500 text-slate-950'
                          }`}>
                            {inc.zScore > 0 ? `+${inc.zScore.toFixed(2)}σ` : `${inc.zScore.toFixed(2)}σ`}
                          </div>

                          {isActive && (
                            <button
                              onClick={() => handleAcknowledgeIncident(inc.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-colors"
                            >
                              Acknowledge
                            </button>
                          )}
                          {inc.status === 'acknowledged' && (
                            <button
                              onClick={() => handleResolveIncident(inc.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-bold transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

      </div>

      {/* FLOATING IN-APP LIVE ALERT TOAST */}
      {activeToastAlert && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900 border-2 border-rose-500 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 text-slate-100 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 animate-bounce">
            <AlertTriangle className="w-6 h-6" />
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Outlier Anomaly Detected</span>
              <span className="text-[10px] font-mono text-rose-400 font-extrabold">
                {activeToastAlert.zScore > 0 ? `+${activeToastAlert.zScore.toFixed(2)}σ` : `${activeToastAlert.zScore.toFixed(2)}σ`}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              {activeToastAlert.message}
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">{new Date(activeToastAlert.timestamp).toLocaleTimeString()}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcknowledgeIncident(activeToastAlert.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => setActiveToastAlert(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RULE EDIT / CREATE MODAL */}
      {isRuleModalOpen && (
        <RuleEditorModal
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setEditingRule(null);
          }}
          initialRule={editingRule}
          onSave={handleSaveRule}
          availableMetrics={
            streamSourceType === 'iot_preset'
              ? selectedPreset.metrics.map(m => ({ key: m.key, label: m.name }))
              : (playbackDataset?.columns.filter(c => c.type === 'number').map(c => ({ key: c.name, label: c.name })) || [])
          }
        />
      )}

    </div>
  );
};

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRule: AnomalyAlertRule | null;
  onSave: (rule: AnomalyAlertRule) => void;
  availableMetrics: { key: string; label: string }[];
}

const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  isOpen,
  onClose,
  initialRule,
  onSave,
  availableMetrics
}) => {
  const [name, setName] = useState(initialRule?.name || 'Statistical Outlier Rule');
  const [metricKey, setMetricKey] = useState(initialRule?.metricKey || availableMetrics[0]?.key || 'vibration_mm_s');
  const [zThreshold, setZThreshold] = useState<number>(initialRule?.zThreshold ?? 3.0);
  const [method, setMethod] = useState<'standard' | 'robust'>(initialRule?.method ?? 'standard');
  const [direction, setDirection] = useState<'both' | 'high' | 'low'>(initialRule?.direction ?? 'both');
  const [severity, setSeverity] = useState<'critical' | 'warning' | 'info'>(initialRule?.severity ?? 'critical');
  const [windowSize, setWindowSize] = useState<number>(initialRule?.windowSize ?? 40);
  const [notifyBrowser, setNotifyBrowser] = useState<boolean>(initialRule?.notifyBrowser ?? true);
  const [soundAlert, setSoundAlert] = useState<boolean>(initialRule?.soundAlert ?? true);
  const [inAppToast, setInAppToast] = useState<boolean>(initialRule?.inAppToast ?? true);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(initialRule?.cooldownSeconds ?? 4);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMetric = availableMetrics.find(m => m.key === metricKey);
    const rule: AnomalyAlertRule = {
      id: initialRule?.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      metricKey,
      metricLabel: selectedMetric?.label || metricKey,
      enabled: initialRule?.enabled ?? true,
      zThreshold,
      method,
      direction,
      severity,
      windowSize,
      notifyBrowser,
      soundAlert,
      inAppToast,
      cooldownSeconds,
      createdAt: initialRule?.createdAt || new Date().toISOString()
    };
    onSave(rule);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              {initialRule ? 'Edit Anomaly Alert Rule' : 'Create New Anomaly Alert Rule'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Rule Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Target Metric</label>
              <select
                value={metricKey}
                onChange={e => setMetricKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {availableMetrics.map(m => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Statistical Method</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="standard">Standard Z-Score (Mean / StdDev)</option>
                <option value="robust">Robust Z-Score (Median / MAD)</option>
              </select>
            </div>
          </div>

          {/* Z-Score Threshold Slider */}
          <div className="space-y-2 p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300">Z-Score Cutoff Threshold</label>
              <span className="font-mono font-extrabold text-amber-300 text-sm">
                ±{zThreshold.toFixed(1)}σ
              </span>
            </div>
            <input
              type="range"
              min="1.5"
              max="5.0"
              step="0.1"
              value={zThreshold}
              onChange={e => setZThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>1.5σ (Sensitive)</span>
              <span>3.0σ (Standard 99.7%)</span>
              <span>5.0σ (Extreme)</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Direction</label>
              <select
                value={direction}
                onChange={e => setDirection(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
              >
                <option value="both">Both (±Z)</option>
                <option value="high">Spike High (+Z)</option>
                <option value="low">Drop Low (-Z)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Severity</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
              >
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Window Size</label>
              <input
                type="number"
                min="10"
                max="200"
                value={windowSize}
                onChange={e => setWindowSize(parseInt(e.target.value) || 40)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Notification Channels */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="font-bold text-slate-300 block">Dispatch Channels</label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyBrowser}
                  onChange={e => setNotifyBrowser(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Browser Notification</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundAlert}
                  onChange={e => setSoundAlert(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Audio Alert Chime</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inAppToast}
                  onChange={e => setInAppToast(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>In-App Toast</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              Save Rule
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
