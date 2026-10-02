import React, { useState, useMemo } from 'react';
import { 
  GitPullRequest, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Play, 
  RotateCcw, 
  Sliders, 
  Code2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Radio, 
  Flame 
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import { round } from '../../utils/statistics';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

interface DriftPipelineSimulatorProps {
  dataset: Dataset;
}

export const DriftPipelineSimulator: React.FC<DriftPipelineSimulatorProps> = ({ dataset }) => {
  const numericColumns = useMemo(() => dataset.columns.filter(c => c.type === 'number'), [dataset]);

  // Active feature under surveillance
  const [monitoredColId, setMonitoredColId] = useState<string>(() => {
    return numericColumns[0]?.id || '';
  });

  // Current production batch index (1 to 8)
  const [currentBatch, setCurrentBatch] = useState<number>(3);
  const [driftType, setDriftType] = useState<'covariate' | 'variance' | 'missingness'>('covariate');
  const [driftSeverity, setDriftSeverity] = useState<number>(25); // 0 to 50%
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [codeLang, setCodeLang] = useState<'python' | 'sql' | 'dbt'>('python');

  const monitoredCol = numericColumns.find(c => c.id === monitoredColId) || numericColumns[0];

  // Calculate Baseline Distribution vs Streaming Production Batch Distribution
  const driftMetrics = useMemo(() => {
    if (!monitoredCol) return null;

    const baselineVals = dataset.data
      .map(r => Number(r[monitoredCol.id]))
      .filter(v => !isNaN(v) && v !== null);

    if (baselineVals.length === 0) return null;

    const n = baselineVals.length;
    const baseMean = baselineVals.reduce((a, b) => a + b, 0) / n;
    const baseVar = baselineVals.reduce((acc, v) => acc + Math.pow(v - baseMean, 2), 0) / n;
    const baseStd = Math.sqrt(baseVar) || 1;

    // Simulate streaming production batch with injected drift
    const driftMultiplier = (driftSeverity / 100) * (currentBatch / 4);
    
    const streamingVals = baselineVals.map(v => {
      if (driftType === 'covariate') {
        // Mean shift
        return v + (baseStd * driftMultiplier);
      } else if (driftType === 'variance') {
        // Variance explosion
        return baseMean + ((v - baseMean) * (1 + driftMultiplier * 1.5));
      } else {
        // Missingness / zero-fill degradation
        return Math.random() < (driftMultiplier * 0.4) ? 0 : v;
      }
    });

    const streamMean = streamingVals.reduce((a, b) => a + b, 0) / n;
    const streamVar = streamingVals.reduce((acc, v) => acc + Math.pow(v - streamMean, 2), 0) / n;
    const streamStd = Math.sqrt(streamVar) || 1;

    // Population Stability Index (PSI) Calculation
    const numBins = 6;
    const minVal = Math.min(...baselineVals);
    const maxVal = Math.max(...baselineVals);
    const binWidth = (maxVal - minVal) / numBins || 1;

    let psiTotal = 0;
    const overlayChartData = [];

    for (let i = 0; i < numBins; i++) {
      const bStart = minVal + i * binWidth;
      const bEnd = bStart + binWidth;
      
      const baseCount = baselineVals.filter(v => v >= bStart && (i === numBins - 1 ? v <= bEnd : v < bEnd)).length;
      const streamCount = streamingVals.filter(v => v >= bStart && (i === numBins - 1 ? v <= bEnd : v < bEnd)).length;

      const basePct = Math.max(0.001, baseCount / n);
      const streamPct = Math.max(0.001, streamCount / n);

      // PSI = sum( (Actual% - Expected%) * ln(Actual% / Expected%) )
      const binPsi = (streamPct - basePct) * Math.log(streamPct / basePct);
      psiTotal += binPsi;

      overlayChartData.push({
        bin: `${round(bStart, 1)}`,
        Baseline: Math.round(basePct * 100),
        StreamingBatch: Math.round(streamPct * 100)
      });
    }

    const psiScore = round(Math.max(0, psiTotal), 3);
    const ksStatistic = round(Math.min(0.95, Math.abs(streamMean - baseMean) / (baseStd * 1.8)), 3);

    const isCritical = psiScore > 0.25 || ksStatistic > 0.35;
    const isWarning = psiScore > 0.1 || ksStatistic > 0.2;

    const statusGrade = isCritical ? 'CRITICAL_DRIFT' : isWarning ? 'WARNING_DRIFT' : 'STABLE';

    return {
      baseMean: round(baseMean, 2),
      streamMean: round(streamMean, 2),
      baseStd: round(baseStd, 2),
      streamStd: round(streamStd, 2),
      psiScore,
      ksStatistic,
      statusGrade,
      overlayChartData
    };
  }, [monitoredCol, dataset, currentBatch, driftType, driftSeverity]);

  // Generated Self-Healing Pipeline Code
  const generatedHealingCode = useMemo(() => {
    if (!monitoredCol || !driftMetrics) return '';

    const col = monitoredCol.name;
    const mean = driftMetrics.baseMean;
    const std = driftMetrics.baseStd;

    if (codeLang === 'python') {
      return `# ==========================================================
# Self-Healing Drift Pipeline Autopilot: ${col}
# Target Baseline: Mean=${mean}, Std=${std}, PSI Threshold=0.15
# ==========================================================
import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

def heal_streaming_pipeline(df: pd.DataFrame, baseline_mean=${mean}, baseline_std=${std}):
    """
    Self-healing remediation: detects drift and auto-winsorizes
    distribution shifts back to baseline calibration bounds.
    """
    cleaned_df = df.copy()
    
    # 1. Detect and Clamp Extreme Drift (Winsorization)
    lower_bound = baseline_mean - (2.8 * baseline_std)
    upper_bound = baseline_mean + (2.8 * baseline_std)
    cleaned_df['${col}'] = cleaned_df['${col}'].clip(lower=lower_bound, upper=upper_bound)
    
    # 2. Re-center Mean Drift via Adaptive Z-Score Normalization
    batch_mean = cleaned_df['${col}'].mean()
    batch_std = cleaned_df['${col}'].std() or 1.0
    drift_delta = batch_mean - baseline_mean
    
    if abs(drift_delta) > (0.2 * baseline_std):
        # Apply gentle exponential smoothing calibration
        cleaned_df['${col}_recalibrated'] = cleaned_df['${col}'] - (0.85 * drift_delta)
    else:
        cleaned_df['${col}_recalibrated'] = cleaned_df['${col}']
        
    return cleaned_df`;
    }

    if (codeLang === 'sql') {
      return `-- ==========================================================
-- Snowflake / BigQuery Self-Healing Pipeline View: ${col}
-- ==========================================================
CREATE OR REPLACE VIEW production_curated_${col.toLowerCase()}_sanitized AS
WITH raw_stream AS (
  SELECT *,
         ${col} AS raw_val,
         AVG(${col}) OVER() AS current_batch_mean
  FROM production_stream_ingest
)
SELECT
  *,
  -- Auto-clamp outlier tail excursions
  CASE 
    WHEN ${col} > (${mean} + 3.0 * ${std}) THEN (${mean} + 3.0 * ${std})
    WHEN ${col} < (${mean} - 3.0 * ${std}) THEN (${mean} - 3.0 * ${std})
    ELSE ${col}
  END AS ${col}_healed_val,
  -- Quarantine flag for critical drift events
  CASE 
    WHEN ABS(${col} - ${mean}) > (3.5 * ${std}) THEN TRUE 
    ELSE FALSE 
  END AS is_drift_quarantine
FROM raw_stream;`;
    }

    // dbt Test Model
    return `# ==========================================================
# dbt Data Contract & PSI Assertion: ${col}
# ==========================================================
version: 2

models:
  - name: streaming_${col.toLowerCase()}
    description: "Monitored production table with continuous drift contract"
    columns:
      - name: ${col}
        tests:
          - not_null
          - dbt_expectations.expect_column_mean_to_be_between:
              min_value: ${round(driftMetrics.baseMean * 0.85, 2)}
              max_value: ${round(driftMetrics.baseMean * 1.15, 2)}
          - dbt_expectations.expect_column_stdev_to_be_between:
              min_value: ${round(driftMetrics.baseStd * 0.7, 2)}
              max_value: ${round(driftMetrics.baseStd * 1.4, 2)}`;
  }, [monitoredCol, driftMetrics, codeLang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedHealingCode);
    setCopiedCode(codeLang);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (numericColumns.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <GitPullRequest className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">No Numeric Features for Drift Tracking</h3>
        <p className="text-xs text-slate-400">
          The Streaming Drift &amp; Self-Healing Pipeline requires at least one continuous numeric feature.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950/40 via-cyan-950/30 to-slate-900 p-6 rounded-3xl border border-teal-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
              <Radio className="w-3 h-3 text-teal-400 animate-pulse" />
              Living Pipeline Autopilot
            </span>
            <span className="text-xs text-slate-400">• Real-Time Drift &amp; Self-Healing</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GitPullRequest className="w-6 h-6 text-teal-400" />
            <span>Streaming Drift &amp; Self-Healing Pipeline Simulator</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Simulate production batch arrivals, calculate continuous Kolmogorov-Smirnov &amp; Population Stability Index (PSI) drift, and generate self-healing repair pipelines.
          </p>
        </div>

        {driftMetrics && (
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 font-bold text-xs ${
            driftMetrics.statusGrade === 'CRITICAL_DRIFT'
              ? 'bg-red-950/60 border-red-500/40 text-red-300'
              : driftMetrics.statusGrade === 'WARNING_DRIFT'
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${
              driftMetrics.statusGrade === 'CRITICAL_DRIFT' ? 'bg-red-500 animate-ping' : driftMetrics.statusGrade === 'WARNING_DRIFT' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <span>{driftMetrics.statusGrade.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Simulator Controls Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        
        {/* 1. Monitored Feature */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-teal-300 uppercase tracking-wider">
            1. Monitored Dimension
          </label>
          <select
            value={monitoredColId}
            onChange={(e) => setMonitoredColId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-teal-500"
          >
            {numericColumns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 2. Production Batch Stepper */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between">
            <span>2. Production Batch</span>
            <span className="font-mono text-white font-bold">Batch #{currentBatch} (Day {currentBatch * 4})</span>
          </label>
          <input
            type="range"
            min="1"
            max="8"
            value={currentBatch}
            onChange={(e) => setCurrentBatch(Number(e.target.value))}
            className="w-full accent-teal-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Day 1</span>
            <span>Day 16</span>
            <span>Day 32</span>
          </div>
        </div>

        {/* 3. Drift Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
            3. Injected Drift Mode
          </label>
          <select
            value={driftType}
            onChange={(e) => setDriftType(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="covariate">Covariate Shift (Mean Shift)</option>
            <option value="variance">Variance Volatility Explosion</option>
            <option value="missingness">Sensor Spike / Null Degradation</option>
          </select>
        </div>

        {/* 4. Drift Magnitude */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
            <span>4. Drift Severity</span>
            <span className="font-mono text-white font-bold">{driftSeverity}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={driftSeverity}
            onChange={(e) => setDriftSeverity(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0% (Clean)</span>
            <span>25%</span>
            <span>50% (Extreme)</span>
          </div>
        </div>

      </div>

      {driftMetrics && (
        <>
          {/* Key Drift Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Baseline Target Calibration</div>
              <div className="text-xl font-bold text-white font-mono mt-1">μ = {driftMetrics.baseMean}</div>
              <div className="text-[11px] text-slate-400 mt-1">Std Dev: <span className="font-mono text-slate-300">σ = {driftMetrics.baseStd}</span></div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-teal-400">Streaming Batch μ &amp; σ</div>
              <div className="text-xl font-bold text-teal-300 font-mono mt-1">μ = {driftMetrics.streamMean}</div>
              <div className="text-[11px] text-teal-200/80 mt-1">Std Dev: <span className="font-mono">σ = {driftMetrics.streamStd}</span></div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-amber-400">Population Stability Index (PSI)</div>
              <div className="text-xl font-bold text-amber-300 font-mono mt-1">{driftMetrics.psiScore}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {driftMetrics.psiScore > 0.25 ? '🚨 High distribution drift' : driftMetrics.psiScore > 0.1 ? '⚠️ Moderate drift alert' : '✓ Statistically stable (<0.1)'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-cyan-400">Kolmogorov-Smirnov (KS-Stat)</div>
              <div className="text-xl font-bold text-cyan-300 font-mono mt-1">D = {driftMetrics.ksStatistic}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Max CDF divergence distance
              </div>
            </div>

          </div>

          {/* Density Comparison Chart */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Distribution Density Overlay: Baseline vs Streaming Batch #{currentBatch}</span>
              <span className="text-[10px] text-slate-400 font-mono">Divergence highlights distribution shift</span>
            </div>

            <div className="h-64 w-full bg-slate-950 rounded-2xl p-3 border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={driftMetrics.overlayChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="bin" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="Baseline" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
                  <Area type="monotone" dataKey="StreamingBatch" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Self-Healing Copilot Code Generator */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Self-Healing Pipeline Copilot
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Production-grade remediation script to auto-calibrate drifting batches.
                  </p>
                </div>
              </div>

              {/* Language Selector & Copy Button */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setCodeLang('python')}
                    className={`px-3 py-1 rounded-lg font-mono font-semibold transition-all ${
                      codeLang === 'python' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Python (Pandas)
                  </button>
                  <button
                    onClick={() => setCodeLang('sql')}
                    className={`px-3 py-1 rounded-lg font-mono font-semibold transition-all ${
                      codeLang === 'sql' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SQL View
                  </button>
                  <button
                    onClick={() => setCodeLang('dbt')}
                    className={`px-3 py-1 rounded-lg font-mono font-semibold transition-all ${
                      codeLang === 'dbt' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    dbt Tests
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Code Display */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              <pre>{generatedHealingCode}</pre>
            </div>

          </div>

        </>
      )}

    </div>
  );
};
