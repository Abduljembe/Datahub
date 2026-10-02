import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Play, 
  Square, 
  Sliders, 
  AlertTriangle, 
  Database, 
  RefreshCw, 
  Zap, 
  CheckCircle2,
  Trash2,
  BellRing,
  Volume2,
  VolumeX,
  ShieldAlert
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Dataset } from '../../types';
import { generateColumnsFromData } from '../../utils/dataEngine';
import {
  computeRollingStats,
  sendBrowserNotification,
  playAlertChime,
  requestNotificationPermission,
  saveAlertIncidents,
  getSavedAlertIncidents
} from '../../utils/anomalyAlertingEngine';

interface IoTSimulatorProps {
  onImportComplete: (dataset: Dataset) => void;
  activeDataset: Dataset | null;
  onAppendToActive: (newRows: Record<string, any>[]) => void;
  onOpenAlertingStudio?: () => void;
}

const SENSOR_PRESETS = [
  {
    id: 'factory',
    name: 'Smart Factory Industrial Motor (CNC)',
    metrics: [
      { key: 'vibration_mm_s', name: 'Vibration (mm/s)', base: 2.5, variance: 0.8, anomalyMin: 6.0, anomalyMax: 9.5 },
      { key: 'temperature_c', name: 'Bearing Temp (°C)', base: 65, variance: 3.5, anomalyMin: 85, anomalyMax: 105 },
      { key: 'motor_rpm', name: 'Shaft Speed (RPM)', base: 1750, variance: 25, anomalyMin: 1200, anomalyMax: 1400 },
      { key: 'pressure_psi', name: 'Hydraulic Pressure (PSI)', base: 120, variance: 5, anomalyMin: 70, anomalyMax: 85 },
    ]
  },
  {
    id: 'power_grid',
    name: 'Smart Energy Substation Grid',
    metrics: [
      { key: 'grid_frequency_hz', name: 'Frequency (Hz)', base: 60.0, variance: 0.05, anomalyMin: 59.2, anomalyMax: 59.5 },
      { key: 'voltage_kv', name: 'Line Voltage (kV)', base: 115.0, variance: 1.2, anomalyMin: 102.0, anomalyMax: 106.0 },
      { key: 'current_load_mw', name: 'Load Demand (MW)', base: 450, variance: 18, anomalyMin: 580, anomalyMax: 640 },
    ]
  },
  {
    id: 'health_icu',
    name: 'ICU Patient Bedside Telemetry',
    metrics: [
      { key: 'heart_rate_bpm', name: 'Heart Rate (BPM)', base: 74, variance: 4, anomalyMin: 125, anomalyMax: 150 },
      { key: 'spo2_pct', name: 'Blood Oxygen SpO2 (%)', base: 98.5, variance: 0.5, anomalyMin: 88, anomalyMax: 91 },
      { key: 'systolic_bp', name: 'Systolic BP (mmHg)', base: 120, variance: 6, anomalyMin: 165, anomalyMax: 185 },
    ]
  }
];

export const IoTSimulator: React.FC<IoTSimulatorProps> = ({
  onImportComplete,
  activeDataset,
  onAppendToActive,
  onOpenAlertingStudio,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState('factory');
  const [isRunning, setIsRunning] = useState(false);
  const [frequencyHz, setFrequencyHz] = useState(2); // updates per second
  const [noiseLevel, setNoiseLevel] = useState(1.0);
  const [triggerAnomalyNext, setTriggerAnomalyNext] = useState(false);
  const [autoAlertOnOutlier, setAutoAlertOnOutlier] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [outlierCount, setOutlierCount] = useState(0);
  
  const [recordedStream, setRecordedStream] = useState<Record<string, any>[]>([]);
  const [liveChartPoints, setLiveChartPoints] = useState<any[]>([]);

  const selectedPreset = SENSOR_PRESETS.find(p => p.id === selectedPresetId) || SENSOR_PRESETS[0];

  useEffect(() => {
    let intervalId: any = null;
    if (isRunning) {
      intervalId = setInterval(() => {
        const now = new Date();
        const timeLabel = now.toTimeString().split(' ')[0] + '.' + Math.floor(now.getMilliseconds() / 100);
        
        const row: Record<string, any> = {
          timestamp: now.toISOString(),
          time_label: timeLabel,
          sensor_preset: selectedPreset.name,
          anomaly_flag: triggerAnomalyNext,
        };

        let hadOutlier = false;
        let outlierMetric = '';
        let outlierVal = 0;
        let outlierZ = 0;

        selectedPreset.metrics.forEach(m => {
          let val = m.base + (Math.random() - 0.5) * 2 * m.variance * noiseLevel;
          if (triggerAnomalyNext) {
            val = m.anomalyMin + Math.random() * (m.anomalyMax - m.anomalyMin);
          }
          val = Math.round(val * 100) / 100;
          row[m.key] = val;

          // Simple live Z-score check
          const z = m.variance > 0 ? (val - m.base) / m.variance : 0;
          if (Math.abs(z) >= 3.0) {
            hadOutlier = true;
            outlierMetric = m.name;
            outlierVal = val;
            outlierZ = z;
          }
        });

        if (triggerAnomalyNext) {
          setTriggerAnomalyNext(false);
        }

        if (hadOutlier) {
          setOutlierCount(prev => prev + 1);
          if (autoAlertOnOutlier) {
            if (soundEnabled) {
              playAlertChime('critical');
            }
            sendBrowserNotification(`🚨 Outlier Spike: ${outlierMetric} (${outlierZ.toFixed(2)}σ)`, {
              body: `${outlierMetric} reached ${outlierVal} (Z-Score: ${outlierZ > 0 ? '+' : ''}${outlierZ.toFixed(2)}σ).`
            });
          }
        }

        setRecordedStream(prev => [row, ...prev.slice(0, 1999)]); // keep up to 2000 in buffer
        setLiveChartPoints(prev => [...prev.slice(-25), row]); // keep last 25 for fast graph
      }, 1000 / frequencyHz);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, frequencyHz, noiseLevel, triggerAnomalyNext, selectedPreset, autoAlertOnOutlier, soundEnabled]);

  const handleSaveBuffer = (createAsNew: boolean) => {
    if (recordedStream.length === 0) return;

    if (!createAsNew && activeDataset) {
      onAppendToActive(recordedStream);
      return;
    }

    const columns = generateColumnsFromData(recordedStream);
    const newDs: Dataset = {
      id: 'ds_iot_' + Date.now(),
      name: `${selectedPreset.name} Stream`,
      description: `Real-time recorded sensor telemetry (${recordedStream.length} readings at ${frequencyHz}Hz).`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'iot',
      columns,
      data: recordedStream,
    };
    onImportComplete(newDs);
  };

  const primaryMetric = selectedPreset.metrics[0];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Real-Time IoT Telemetry & Sensor Stream Generator
        </h2>
        <p className="text-xs text-slate-400">Generate high-frequency streaming events with configurable noise, frequencies, and anomaly injection directly into your analytics pipeline.</p>
      </div>

      {/* Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Sensor Presets & Settings */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-2">Sensor Domain Preset</label>
            <div className="space-y-2">
              {SENSOR_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                    setLiveChartPoints([]);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    selectedPresetId === preset.id
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="font-semibold text-xs text-white">{preset.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{preset.metrics.map(m => m.name).join(', ')}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Sampling Rate (Hz)</span>
                <span className="font-mono text-emerald-400 font-bold">{frequencyHz} msg/sec</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={frequencyHz}
                onChange={e => setFrequencyHz(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Noise Jitter</span>
                <span className="font-mono text-emerald-400 font-bold">{(noiseLevel * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3.0}
                step={0.1}
                value={noiseLevel}
                onChange={e => setNoiseLevel(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isRunning ? 'Pause Telemetry Stream' : 'Start Streaming Live Data'}</span>
            </button>

            <button
              onClick={() => setTriggerAnomalyNext(true)}
              disabled={!isRunning}
              className="w-full py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Inject Spike Anomaly in Next Tick</span>
            </button>
          </div>

          {/* Real-time Alerting Configuration */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-rose-400" />
                Live Outlier Alerts (Z ≥ 3σ)
              </span>
              <button
                onClick={async () => {
                  if (!autoAlertOnOutlier) {
                    await requestNotificationPermission();
                  }
                  setAutoAlertOnOutlier(!autoAlertOnOutlier);
                }}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${
                  autoAlertOnOutlier
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {autoAlertOnOutlier ? 'ON (Active)' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                Audio Chime
              </span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-[10px] text-indigo-400 hover:underline"
              >
                {soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            {outlierCount > 0 && (
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Total Outliers Captured:
                </span>
                <span className="font-bold font-mono">{outlierCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right 2 Cols: Live Sparkline & Buffer Stats */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Live Chart Canvas */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Oscilloscope: {primaryMetric.name}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Buffer: {recordedStream.length} readings recorded
              </span>
            </div>

            <div className="h-48 w-full">
              {liveChartPoints.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveChartPoints}>
                    <XAxis dataKey="time_label" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey={primaryMetric.key}
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                  Press "Start Streaming Live Data" to view real-time oscilloscope
                </div>
              )}
            </div>
          </div>

          {/* Ingest Buffer Controls & Mini Table */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRecordedStream([])}
                disabled={recordedStream.length === 0}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Buffer</span>
              </button>

              <span className="text-xs text-slate-400">
                {recordedStream.length} items ready for ingestion
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveBuffer(true)}
                disabled={recordedStream.length === 0}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save as New Dataset</span>
              </button>

              {activeDataset && (
                <button
                  onClick={() => handleSaveBuffer(false)}
                  disabled={recordedStream.length === 0}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Append to Active ({activeDataset.name})</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
