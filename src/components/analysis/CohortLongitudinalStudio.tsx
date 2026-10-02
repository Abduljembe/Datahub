import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle,
  FileText,
  Sliders,
  Filter
} from 'lucide-react';
import { Dataset } from '../../types';
import { analyzeCohorts, CohortAnalysisReport } from '../../utils/cohortEngine';

interface CohortLongitudinalStudioProps {
  dataset: Dataset;
}

export const CohortLongitudinalStudio: React.FC<CohortLongitudinalStudioProps> = ({ dataset }) => {
  // Find potential segment columns
  const categoricalCols = useMemo(
    () => dataset.columns.filter((c) => c.type === 'category' || c.type === 'string'),
    [dataset.columns]
  );
  const numericCols = useMemo(
    () => dataset.columns.filter((c) => c.type === 'number'),
    [dataset.columns]
  );

  // Default segment
  const [segmentCol, setSegmentCol] = useState<string>(() => {
    const candidate = categoricalCols.find((c) => /cohort|segment|tier|channel|plan|role|group|region/i.test(c.name));
    return candidate?.name || categoricalCols[0]?.name || dataset.columns[0]?.name || '';
  });

  // Selected numeric metric
  const [metricCol, setMetricCol] = useState<string>(() => {
    const candidate = numericCols.find((c) => /satisfaction|rating|score|nps|val|amount/i.test(c.name));
    return candidate?.name || numericCols[0]?.name || '';
  });

  // Wave dimension
  const [waveCol, setWaveCol] = useState<string>(() => {
    const candidate = dataset.columns.find((c) => /date|wave|quarter|month|year|created/i.test(c.name));
    return candidate?.name || '';
  });

  const report: CohortAnalysisReport = useMemo(() => {
    return analyzeCohorts(
      dataset.data,
      segmentCol,
      metricCol ? [metricCol] : numericCols.map((c) => c.name),
      categoricalCols.map((c) => c.name),
      waveCol || undefined
    );
  }, [dataset.data, segmentCol, metricCol, numericCols, categoricalCols, waveCol]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/50 via-blue-950/30 to-slate-900 border border-cyan-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Segment Intelligence
              </span>
              <span className="text-xs text-slate-400">Welch's t-Test & Effect Size</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Users className="w-6 h-6 text-cyan-400" />
              Cohort Comparison & Longitudinal Wave Analysis
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Compare respondent cohorts across demographic slices, detect sentiment drift, evaluate statistical significance, and track wave-over-wave longitudinal changes.
            </p>
          </div>

          {/* Dimension Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400 font-medium">Cohort:</span>
              <select
                value={segmentCol}
                onChange={(e) => setSegmentCol(e.target.value)}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none"
              >
                {categoricalCols.map((c) => (
                  <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {numericCols.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-slate-400 font-medium">Metric:</span>
                <select
                  value={metricCol}
                  onChange={(e) => setMetricCol(e.target.value)}
                  className="bg-transparent text-emerald-300 font-bold focus:outline-none"
                >
                  {numericCols.map((c) => (
                    <option key={c.id} value={c.name} className="bg-slate-900 text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cohort Cards Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {report.cohorts.map((c, idx) => {
          const stats = metricCol ? c.numericMetrics[metricCol] : Object.values(c.numericMetrics)[0];
          return (
            <div
              key={c.cohortName}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cohort {idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-white truncate max-w-[190px]">{c.cohortName}</h3>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-cyan-400">{c.sampleSize}</div>
                  <div className="text-[10px] text-slate-400">{c.percentageOfTotal}% share</div>
                </div>
              </div>

              {/* Primary Metric Score */}
              {stats && (
                <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-1">
                  <div className="text-[11px] text-slate-400 flex justify-between">
                    <span>Average {stats.column.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500 font-mono">SD: ±{stats.std}</span>
                  </div>
                  <div className="text-2xl font-black text-white flex items-baseline gap-2">
                    <span>{stats.mean}</span>
                    <span className="text-xs font-normal text-slate-400">median {stats.median}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono">
                    <span>min: {stats.min}</span>
                    <span>max: {stats.max}</span>
                  </div>
                </div>
              )}

              {/* Sentiment Profile if available */}
              {c.sentimentBreakdown && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Sentiment Polarity</span>
                    <span
                      className={`font-bold ${
                        c.sentimentBreakdown.averageScore > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {c.sentimentBreakdown.averageScore > 0 ? '+' : ''}
                      {c.sentimentBreakdown.averageScore} index
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
                    <div
                      style={{ width: `${c.sentimentBreakdown.positive}%` }}
                      className="bg-emerald-500 h-full"
                      title={`Positive: ${c.sentimentBreakdown.positive}%`}
                    />
                    <div
                      style={{ width: `${c.sentimentBreakdown.neutral}%` }}
                      className="bg-slate-500 h-full"
                      title={`Neutral: ${c.sentimentBreakdown.neutral}%`}
                    />
                    <div
                      style={{ width: `${c.sentimentBreakdown.negative}%` }}
                      className="bg-rose-500 h-full"
                      title={`Negative: ${c.sentimentBreakdown.negative}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span className="text-emerald-400">Pos: {c.sentimentBreakdown.positive}%</span>
                    <span className="text-slate-400">Neu: {c.sentimentBreakdown.neutral}%</span>
                    <span className="text-rose-400">Neg: {c.sentimentBreakdown.negative}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pairwise Statistical Significance Tests */}
      {report.significanceTests.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Hypothesis Testing: Welch's Two-Sample t-Test
            </h3>
            <span className="text-[11px] text-slate-400">Threshold: α = 0.05</span>
          </div>

          <div className="space-y-2">
            {report.significanceTests.map((test, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  test.isSignificant
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-950 border-slate-800/80'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      {test.cohortA} vs. {test.cohortB}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">({test.metric})</span>
                    {test.isSignificant ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Significant (p = {test.pValue})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                        Not Significant (p = {test.pValue})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{test.interpretation}</p>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0">
                  <div className="text-right">
                    <div className="font-bold font-mono text-white">
                      Δ {test.delta > 0 ? `+${test.delta}` : test.delta}
                    </div>
                    <div className="text-[10px] text-slate-500">Cohen's d = {test.cohensD}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Longitudinal Wave-over-Wave Progression */}
      {report.isLongitudinal && report.longitudinalWaves.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Longitudinal Wave-over-Wave Tracker
              </h3>
              <p className="text-xs text-slate-400">Chronological trajectory across survey waves</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              {report.longitudinalWaves.length} Waves Tracked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {report.longitudinalWaves.map((wave) => (
              <div
                key={wave.waveId}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-white">{wave.label}</span>
                  <span className="text-[11px] text-slate-400">{wave.sampleCount} responses</span>
                </div>

                <div className="space-y-1 pt-1">
                  {Object.entries(wave.metricAverages).slice(0, 2).map(([col, avg]) => (
                    <div key={col} className="flex justify-between text-xs">
                      <span className="text-slate-400 truncate max-w-[120px]">{col}</span>
                      <span className="font-bold font-mono text-cyan-300">{avg}</span>
                    </div>
                  ))}
                </div>

                {wave.deltasVsPrevious && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Delta vs Prior:</span>
                    <span
                      className={`font-bold flex items-center gap-0.5 ${
                        wave.deltasVsPrevious.sentimentDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {wave.deltasVsPrevious.sentimentDelta >= 0 ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {wave.deltasVsPrevious.sentimentDelta > 0 ? '+' : ''}
                      {wave.deltasVsPrevious.sentimentDelta}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
