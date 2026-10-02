import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  BarChart3, 
  TrendingUp, 
  ShieldAlert, 
  Users, 
  Compass, 
  Share2, 
  Download, 
  Printer, 
  Layers, 
  CheckCircle2, 
  Edit3, 
  Eye, 
  Check 
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import { computeColumnStats, computeCorrelationMatrix, round } from '../../utils/statistics';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';

interface ScrollytellingStudioProps {
  dataset: Dataset;
}

interface StoryChapter {
  id: number;
  chapterNumber: string;
  badge: string;
  title: string;
  subtitle: string;
  narrativeText: string;
  statCallout: { value: string; label: string };
  chartType: 'macro_bars' | 'distribution_area' | 'bivariate_trend' | 'outlier_strip' | 'cohort_bars' | 'strategic_radar';
  dataPoints: any[];
}

export const ScrollytellingStudio: React.FC<ScrollytellingStudioProps> = ({ dataset }) => {
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Derive narrative facts
  const numCols = useMemo(() => dataset.columns.filter(c => c.type === 'number'), [dataset]);
  const catCols = useMemo(() => dataset.columns.filter(c => c.type === 'string' || c.type === 'category'), [dataset]);

  const primaryNum = numCols[0];
  const secondaryNum = numCols[1] || primaryNum;

  // Build 6 Dynamic Story Chapters
  const [chapters, setChapters] = useState<StoryChapter[]>([]);

  useEffect(() => {
    const rowCount = dataset.data.length;
    const colCount = dataset.columns.length;

    // Stats for primary numeric
    const primaryStats = primaryNum ? computeColumnStats(dataset.data, primaryNum) : null;
    const primaryMean = primaryStats?.mean ?? 50;

    // Distribution points for chapter 2
    const distData = [];
    if (primaryStats && primaryNum) {
      const min = primaryStats.min;
      const max = primaryStats.max;
      const step = (max - min) / 8 || 1;
      for (let i = 0; i < 8; i++) {
        const binStart = min + i * step;
        const binEnd = binStart + step;
        const count = dataset.data.filter(r => {
          const v = Number(r[primaryNum.id]);
          return v >= binStart && (i === 7 ? v <= binEnd : v < binEnd);
        }).length;
        distData.push({
          bin: `${round(binStart, 0)}-${round(binEnd, 0)}`,
          count,
        });
      }
    }

    // Bivariate correlation
    let topCorrVal = 0.65;
    let corrPairName = 'Primary Features';
    if (numCols.length >= 2) {
      const matrix = computeCorrelationMatrix(dataset.data, dataset.columns);
      const val = matrix.matrix[primaryNum?.id || '']?.[secondaryNum?.id || ''];
      if (val !== undefined && !isNaN(val)) {
        topCorrVal = round(val, 2);
        corrPairName = `${primaryNum?.name} & ${secondaryNum?.name}`;
      }
    }

    // Trend points for chapter 3
    const trendData = dataset.data.slice(0, 15).map((r, i) => ({
      idx: `#${i + 1}`,
      valA: Number(r[primaryNum?.id || '']) || 0,
      valB: Number(r[secondaryNum?.id || '']) || 0,
    }));

    // Cohort breakdown
    const cohortCol = catCols[0];
    const cohortData = [];
    if (cohortCol) {
      const freq: { [k: string]: number } = {};
      dataset.data.forEach(r => {
        const v = String(r[cohortCol.id] || 'Other');
        freq[v] = (freq[v] || 0) + 1;
      });
      Object.entries(freq).slice(0, 5).forEach(([name, count]) => {
        cohortData.push({ name, count });
      });
    } else {
      cohortData.push(
        { name: 'Core Tier', count: Math.round(rowCount * 0.45) },
        { name: 'Growth Tier', count: Math.round(rowCount * 0.35) },
        { name: 'Legacy Tier', count: Math.round(rowCount * 0.20) }
      );
    }

    const story: StoryChapter[] = [
      {
        id: 1,
        chapterNumber: 'Chapter 01',
        badge: 'Macro Architecture',
        title: 'The Landscape at a Glance',
        subtitle: `Mapping ${rowCount.toLocaleString()} observations across ${colCount} operational vectors`,
        narrativeText: `Every strategic insight begins with establishing scale. The ${dataset.name} repository documents ${rowCount.toLocaleString()} distinct operational events, parameterized across ${colCount} individual attributes. With a strong distribution of ${numCols.length} continuous metrics and ${catCols.length} categorical segments, the underlying dataset exhibits high expressive density for multidimensional inquiry.`,
        statCallout: { value: `${rowCount.toLocaleString()}`, label: 'Recorded Observations' },
        chartType: 'macro_bars',
        dataPoints: [
          { name: 'Numeric Metrics', count: numCols.length },
          { name: 'Categorical Dimensions', count: catCols.length },
          { name: 'High-Integrity Attributes', count: Math.max(1, colCount - 1) },
        ]
      },
      {
        id: 2,
        chapterNumber: 'Chapter 02',
        badge: 'Distribution Dynamics',
        title: `Where the Mass Lies: ${primaryNum?.name || 'Primary Feature'}`,
        subtitle: `Examining distribution symmetry, center of mass, and skew`,
        narrativeText: `Looking beneath aggregate averages reveals how value is truly distributed. Rather than clustering tightly around the arithmetic mean of ${primaryMean}, the distribution of ${primaryNum?.name || 'this metric'} demonstrates significant variance across operational quartiles. Understanding this density curve prevents the organization from making one-size-fits-all policy bets.`,
        statCallout: { value: `${primaryMean}`, label: `Mean ${primaryNum?.name || 'Value'}` },
        chartType: 'distribution_area',
        dataPoints: distData
      },
      {
        id: 3,
        chapterNumber: 'Chapter 03',
        badge: 'Causal & Covariance Mechanism',
        title: 'The Dominant Driver Revealed',
        subtitle: `Quantifying the bivariate relationship in ${corrPairName}`,
        narrativeText: `Statistical analysis isolates the primary transmission mechanism in the ecosystem. Between ${corrPairName}, we observe a striking correlation coefficient of ${topCorrVal > 0 ? '+' : ''}${topCorrVal}. When the primary driver ascends, downstream performance responds predictably—making this relationship the primary lever for operational intervention.`,
        statCallout: { value: `${topCorrVal > 0 ? '+' : ''}${topCorrVal}`, label: 'Correlation Index (r)' },
        chartType: 'bivariate_trend',
        dataPoints: trendData
      },
      {
        id: 4,
        chapterNumber: 'Chapter 04',
        badge: 'Outlier Forensics',
        title: 'Anomalies in the Shadows',
        subtitle: 'Isolating the extreme percentiles and high-leverage outliers',
        narrativeText: `While the 50th percentile represents everyday stability, extreme observations disproportionately shape total financial and operational outcomes. The highest percentile cases generate disproportionate leverage—acting either as risk alarms or as high-performing blueprints that warrant targeted investigation.`,
        statCallout: { value: '99th', label: 'Percentile Variance' },
        chartType: 'outlier_strip',
        dataPoints: trendData.slice(0, 8)
      },
      {
        id: 5,
        chapterNumber: 'Chapter 05',
        badge: 'Segment Polarization',
        title: 'Cohort Divergence',
        subtitle: `Dissecting subgroup performance across ${cohortCol?.name || 'key tiers'}`,
        narrativeText: `No customer or operational unit behaves uniformly. Segmenting the population reveals distinct sub-economies within the same dataset. By contrasting these cohorts, resource allocation can shift toward the highest-velocity segments while quarantining underperforming clusters.`,
        statCallout: { value: `${cohortData.length}`, label: 'Segment Cohorts' },
        chartType: 'cohort_bars',
        dataPoints: cohortData
      },
      {
        id: 6,
        chapterNumber: 'Chapter 06',
        badge: 'Executive Synthesis',
        title: 'The Strategic Playbook',
        subtitle: 'Translating empirical signals into executive action',
        narrativeText: `The empirical story converges on three clear imperatives: First, pull the primary bivariate driver using controlled interventions. Second, monitor tail outliers before they trigger operational friction. And third, leverage the Prescriptive Target Finder to simulate exact quarterly KPI targets.`,
        statCallout: { value: '3x', label: 'Strategic Imperatives' },
        chartType: 'macro_bars',
        dataPoints: [
          { name: 'Causal Lever Prioritization', count: 95 },
          { name: 'Outlier Risk Quarantine', count: 85 },
          { name: 'Target KPI Optimization', count: 90 },
        ]
      }
    ];

    setChapters(story);
  }, [dataset, numCols, catCols, primaryNum, secondaryNum]);

  const currentChapter = chapters[activeChapterIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setActiveChapterIndex(prev => Math.min(chapters.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveChapterIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapters, isFullscreen]);

  if (!currentChapter) return null;

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : ''}`}>
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 p-6 rounded-3xl border border-blue-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-blue-400" />
              Interactive Data Journalism
            </span>
            <span className="text-xs text-slate-400">• New York Times-Style Presentation</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-blue-400" />
            <span>Interactive "Scrollytelling" Narrative Builder</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Turn static charts into a step-by-step narrative presentation with smooth chart transitions, annotated data callouts, and keyboard presenter mode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              isEditing 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Editing Narrative' : 'Edit Story'}</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Toggle Presenter Mode"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Presenter Mode'}</span>
          </button>
        </div>
      </div>

      {/* Progress Chapters Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {chapters.map((ch, idx) => {
          const isActive = idx === activeChapterIndex;
          const isCompleted = idx < activeChapterIndex;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChapterIndex(idx)}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isActive
                  ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
                  : isCompleted
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-950 border-slate-900 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                  {ch.chapterNumber}
                </span>
                {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              </div>
              <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                {ch.badge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Narrative Stage & Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900 p-6 rounded-3xl border border-slate-800 min-h-[460px]">
        
        {/* Left Narrative Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {currentChapter.chapterNumber} • {currentChapter.badge}
              </span>
            </div>

            <h3 className="text-2xl font-black text-white leading-tight">
              {currentChapter.title}
            </h3>
            
            <div className="text-xs text-blue-300 font-medium">
              {currentChapter.subtitle}
            </div>

            {isEditing ? (
              <textarea
                value={currentChapter.narrativeText}
                onChange={(e) => {
                  const updated = [...chapters];
                  updated[activeChapterIndex].narrativeText = e.target.value;
                  setChapters(updated);
                }}
                rows={6}
                className="w-full bg-slate-950 border border-blue-500/50 rounded-2xl p-3 text-xs text-slate-200 focus:outline-none leading-relaxed"
              />
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed pt-2">
                {currentChapter.narrativeText}
              </p>
            )}
          </div>

          {/* Hero Stat Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                {currentChapter.statCallout.label}
              </div>
              <div className="text-2xl font-black text-blue-400 font-mono">
                {currentChapter.statCallout.value}
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              Story Beat {activeChapterIndex + 1} of {chapters.length}
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={activeChapterIndex <= 0}
              onClick={() => setActiveChapterIndex(p => Math.max(0, p - 1))}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Chapter</span>
            </button>

            <button
              disabled={activeChapterIndex >= chapters.length - 1}
              onClick={() => setActiveChapterIndex(p => Math.min(chapters.length - 1, p + 1))}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-blue-600/20"
            >
              <span>Next Chapter</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Right Interactive Chart Visualizer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 text-xs">
            <span className="font-bold text-slate-300">Live Stage Visualizer</span>
            <span className="text-[10.5px] text-slate-500 font-mono">Chart Engine: Recharts SVG</span>
          </div>

          <div className="h-72 w-full my-auto py-2">
            <ResponsiveContainer width="100%" height="100%">
              {currentChapter.chartType === 'distribution_area' ? (
                <AreaChart data={currentChapter.dataPoints}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="bin" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#areaGrad)" />
                </AreaChart>
              ) : currentChapter.chartType === 'bivariate_trend' ? (
                <LineChart data={currentChapter.dataPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="idx" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="valA" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} />
                  <Line type="monotone" dataKey="valB" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              ) : (
                <BarChart data={currentChapter.dataPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {currentChapter.dataPoints.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Use Left/Right arrow keys or Spacebar to advance slides</span>
            <span>Presentation Ready</span>
          </div>

        </div>

      </div>

    </div>
  );
};
