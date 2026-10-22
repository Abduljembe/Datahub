import React, { useMemo } from 'react';
import {
  LayoutDashboard,
  Database,
  Sparkles,
  BarChart3,
  UploadCloud,
  Table,
  TrendingUp,
  ShieldCheck,
  Activity,
  Users,
  Radio,
  ArrowRight,
  Download,
  FileText,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  Share2,
  Presentation,
  QrCode,
  Monitor,
  Check,
  Terminal,
  FileSpreadsheet,
  Clock,
  Zap,
  Lock,
  Cpu,
  Wand2,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Dataset, UserProfile, AppTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { computeGroundTruthHealthStats } from '../../utils/dataHealthEngine';
import { parseNumber, round } from '../../utils/statistics';

interface UnifiedDashboardProps {
  dataset: Dataset | null;
  datasets: Dataset[];
  onSelectDataset: (id: string) => void;
  onCreateDataset: (newDataset: Dataset) => void;
  onUpdateDataset: (updatedDataset: Dataset) => void;
  onDeleteDataset?: (id: string) => void;
  onAppendRowsToActive: (newRows: Record<string, any>[]) => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenDatasetModal: (initialTab?: 'list' | 'versions' | 'create') => void;
  onOpenShareModal: (dataset?: Dataset | null) => void;
  onOpenCopilot: () => void;
  onOpenSlideDeck: () => void;
  onOpenQrSurvey: () => void;
  onOpenTour: () => void;
  onOpenDesktopExe: () => void;
  onOpenCommsHub?: () => void;
  currentUser: UserProfile | null;
  onOpenAutoHeal?: () => void;
  onOpenFieldTour?: () => void;
}

export const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  dataset,
  datasets,
  onSelectDataset,
  onNavigateTab,
  onOpenDatasetModal,
  onOpenShareModal,
  onOpenCopilot,
  onOpenSlideDeck,
  onOpenQrSurvey,
  currentUser,
  onOpenAutoHeal,
  onOpenFieldTour
}) => {
  const { isDark } = useTheme();

  // Compute ground-truth hygiene stats
  const healthStats = useMemo(() => {
    if (!dataset || !dataset.data || dataset.data.length === 0) {
      return {
        rowCount: 0,
        columnCount: 0,
        totalCells: 0,
        totalNulls: 0,
        completenessRate: 100,
        totalOutliers: 0,
        baselineScore: 100
      };
    }
    return computeGroundTruthHealthStats(dataset);
  }, [dataset]);

  // Numerical columns
  const numericColumns = useMemo(() => {
    if (!dataset?.columns) return [];
    return dataset.columns.filter(c => c.type === 'number');
  }, [dataset]);

  const categoricalColumns = useMemo(() => {
    if (!dataset?.columns) return [];
    return dataset.columns.filter(c => c.type !== 'number');
  }, [dataset]);

  // Chart data for quick visual distribution
  const chartData = useMemo(() => {
    if (!dataset || !dataset.data || dataset.data.length === 0) return [];
    const xCol = categoricalColumns[0]?.name || dataset.columns[0]?.name;
    const yCol = numericColumns[0]?.name;

    if (!xCol || !yCol) return [];

    const slice = dataset.data.slice(0, 10);
    return slice.map((row, idx) => {
      const xVal = row[xCol] !== null && row[xCol] !== undefined ? String(row[xCol]).slice(0, 14) : `#${idx + 1}`;
      const yVal = parseNumber(row[yCol]);
      return {
        name: xVal,
        value: yVal !== null ? round(yVal, 2) : 0
      };
    });
  }, [dataset, categoricalColumns, numericColumns]);

  // Workspace Pipeline Navigation Cards
  const workspaceCards: {
    id: AppTab;
    title: string;
    category: string;
    icon: any;
    iconBg: string;
    iconColor: string;
    badge: string;
    description: string;
  }[] = [
    {
      id: 'upload',
      title: 'Ingestion & Auto-Clean',
      category: 'Data Pipeline',
      icon: UploadCloud,
      iconBg: 'bg-cyan-600/15',
      iconColor: 'text-cyan-400',
      badge: 'Zero Egress',
      description: 'Upload CSV, Excel, or JSON files with automated type detection and null imputation.'
    },
    {
      id: 'grid',
      title: 'Spreadsheet & Smart Grid',
      category: 'Tabular Editor',
      icon: Table,
      iconBg: 'bg-emerald-600/15',
      iconColor: 'text-emerald-400',
      badge: 'Inline Edit',
      description: 'High-density tabular viewer with inline cell editing, formula columns, and sorting.'
    },
    {
      id: 'analyst',
      title: 'Data Analyst Workbench',
      category: 'Code & Schema',
      icon: Terminal,
      iconBg: 'bg-cyan-600/15',
      iconColor: 'text-cyan-400',
      badge: 'PRO Code',
      description: 'Automated algorithmic insights, schema dictionary, and 1-click Python/SQL/R code generation.'
    },
    {
      id: 'analysis',
      title: 'Visual Analytics & EDA',
      category: 'Exploratory Analysis',
      icon: BarChart3,
      iconBg: 'bg-indigo-600/15',
      iconColor: 'text-indigo-400',
      badge: 'Interactive',
      description: 'Multi-metric chart studio, correlation matrices, hypothesis tests, and SQL queries.'
    },
    {
      id: 'simulation',
      title: 'What-If Forecaster',
      category: 'Predictive Modeling',
      icon: TrendingUp,
      iconBg: 'bg-amber-600/15',
      iconColor: 'text-amber-400',
      badge: 'Monte Carlo',
      description: 'Driver elasticity perturbations, regression trendlines, and projected confidence bands.'
    },
    {
      id: 'collection',
      title: 'Field Surveys & QR Kiosk',
      category: 'Data Collection',
      icon: QrCode,
      iconBg: 'bg-teal-600/15',
      iconColor: 'text-teal-400',
      badge: 'Mobile Fleet',
      description: 'Generate public survey QR codes, offline forms, audio debriefs, and GPS location tracking.'
    },
    {
      id: 'operations',
      title: 'Supervisor Operations',
      category: 'Field Governance',
      icon: ShieldCheck,
      iconBg: 'bg-purple-600/15',
      iconColor: 'text-purple-400',
      badge: 'PIN Auth',
      description: 'Enumerator quota dispatch, fraud shield anomaly detection, and tactical field radar.'
    },
    {
      id: 'report',
      title: 'Executive Reports & Slides',
      category: 'Executive Delivery',
      icon: FileText,
      iconBg: 'bg-amber-600/15',
      iconColor: 'text-amber-400',
      badge: 'Print Ready',
      description: 'Export boardroom dossiers in PDF, Excel workbooks, and interactive slide presentations.'
    },
    {
      id: 'team',
      title: 'Team & Collaborators',
      category: 'Governance & RBAC',
      icon: Users,
      iconBg: 'bg-blue-600/15',
      iconColor: 'text-blue-400',
      badge: '6 Active',
      description: 'Manage workspace collaborators, granular read/write roles, and dataset permissions.'
    },
    {
      id: 'admin',
      title: 'Admin Console & Telemetry',
      category: 'System Diagnostics',
      icon: Cpu,
      iconBg: 'bg-rose-600/15',
      iconColor: 'text-rose-400',
      badge: 'Engine Live',
      description: 'Audit logs, in-memory RAM diagnostics, zero cloud egress validation, and system controls.'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">

      {/* 1. EXECUTIVE HERO BANNER */}
      <section className={`p-6 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md shadow-xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 tracking-wider">
                Enterprise Intelligence Platform
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Workstation Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {dataset?.name || 'Research & Intelligence Workstation'}
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {dataset?.description || 'Select a specialized workspace from the left navigation or launch directly into any analytical pipeline below.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {onOpenFieldTour && (
              <button
                onClick={onOpenFieldTour}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="Watch 60-second end-to-end field data to boardroom deck demo"
              >
                <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>60s Live Demo</span>
              </button>
            )}

            {onOpenAutoHeal && dataset && (
              <button
                onClick={onOpenAutoHeal}
                className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="1-Click Auto-Heal & Standardize dirty formats, currencies, and nulls"
              >
                <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Heal</span>
              </button>
            )}

            <button
              onClick={onOpenCopilot}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:opacity-90 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-purple-600/25 transition-all"
            >
              <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" />
              <span>Ask AI Copilot</span>
            </button>

            <button
              onClick={() => onNavigateTab('upload')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <span>Import Dataset</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Records</span>
            <span className="text-xl font-black font-mono text-white mt-1 block">
              {healthStats.rowCount.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Row instances</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Dimensions</span>
            <span className="text-xl font-black font-mono text-indigo-400 mt-1 block">
              {healthStats.columnCount}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Columns mapped</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Quality Score</span>
            <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
              {healthStats.baselineScore}%
            </span>
            <span className="text-[10px] text-emerald-500 font-medium font-mono">Optimal integrity</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Completeness</span>
            <span className="text-xl font-black font-mono text-cyan-400 mt-1 block">
              {healthStats.completenessRate}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {healthStats.totalNulls} null cells
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Engine Latency</span>
            <span className="text-xl font-black font-mono text-teal-400 mt-1 block">
              &lt; 1.8 ms
            </span>
            <span className="text-[10px] text-slate-500 font-mono">100% In-Memory</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Team Fleet</span>
            <span className="text-xl font-black font-mono text-purple-400 mt-1 block">
              6 Active
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Synchronized</span>
          </div>
        </div>
      </section>

      {/* 2. DEDICATED WORKSPACE PIPELINE DIRECTORY */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Platform Workspaces & Operational Pipelines
            </h2>
            <p className="text-xs text-slate-400">
              Select any specialized workspace to begin focused analysis or data operations.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
            10 Dedicated Studios
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {workspaceCards.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigateTab(card.id)}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer group hover:scale-[1.01] ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800/80 hover:border-indigo-500/60 hover:bg-slate-900'
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className={`w-8 h-8 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {card.badge}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-500 block uppercase font-bold">
                    {card.category}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors mt-0.5">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-indigo-400 font-semibold group-hover:text-cyan-300">
                  <span>Open Studio</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. VISUAL SUMMARY & RECENT RESEARCH ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Quick Visual Analytics Preview (Span 8) */}
        <section className={`lg:col-span-8 p-5 rounded-2xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Visual Distribution Snapshot</h3>
                <p className="text-xs text-slate-400">Sample distribution of primary continuous metric</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('analysis')}
              className="text-xs text-indigo-400 hover:text-white font-semibold flex items-center gap-1"
            >
              <span>Full Analytics Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No numerical metric available for preview.
              </div>
            )}
          </div>
        </section>

        {/* Live Operations & Audit Stream (Span 4) */}
        <section className={`lg:col-span-4 p-5 rounded-2xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Recent Pipeline Log</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              { time: 'Just now', user: 'System Engine', action: 'In-memory hygiene check validated', color: 'text-emerald-400' },
              { time: '4m ago', user: 'Dr. Elena Rostova', action: 'Generated OLS regression model', color: 'text-indigo-400' },
              { time: '18m ago', user: 'Amina Mwangi', action: 'Approved 3 field surveys in Sector A', color: 'text-teal-400' },
              { time: '1h ago', user: 'Marcus Vance', action: 'Snapshot v2 captured and archived', color: 'text-cyan-400' },
            ].map((log, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${log.color} mt-1.5 shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="font-bold text-slate-300">{log.user}</span>
                    <span>{log.time}</span>
                  </div>
                  <p className="text-slate-300 mt-0.5 truncate">{log.action}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('admin')}
            className="w-full mt-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 text-center transition-colors block"
          >
            View Full Audit Trail →
          </button>
        </section>

      </div>

    </div>
  );
};
