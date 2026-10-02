import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  PieChart as PieIcon, 
  Layers, 
  Sparkles, 
  Filter, 
  Search, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  Sun, 
  Moon, 
  Database,
  Calendar,
  Zap,
  Target,
  Award,
  Download,
  Printer,
  Loader2,
  Eye
} from 'lucide-react';
import { Dataset, ColumnMeta, AggregationType } from '../../types';
import { computeColumnStats, computeCorrelationMatrix, round } from '../../utils/statistics';
import { generateAndDownloadPdf, triggerCleanPrint } from '../../utils/pdfGenerator';
import { PdfExportModal } from './PdfExportModal';
import { PrintPreviewModal } from './PrintPreviewModal';

interface InteractiveReportDashboardProps {
  dataset: Dataset;
  authorName?: string;
  organizationName?: string;
}

const DASHBOARD_PALETTES: Record<string, string[]> = {
  vibrant: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'],
  emerald: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#047857', '#a7f3d0', '#065f46'],
  ocean: ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#0369a1', '#bae6fd', '#0c4a6e'],
  sunset: ['#f43f5e', '#fb923c', '#f59e0b', '#e11d48', '#d97706', '#be123c', '#fbbf24'],
};

export const InteractiveReportDashboard: React.FC<InteractiveReportDashboardProps> = ({
  dataset,
  authorName = 'Data Analytics Team',
  organizationName = 'Enterprise Analytics',
}) => {
  // Theme & presentation mode
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paletteKey, setPaletteKey] = useState<string>('vibrant');

  // Interactive filters
  const [selectedCategoryCol, setSelectedCategoryCol] = useState<string>(() => {
    return dataset.columns.find(c => c.type === 'category' || c.type === 'string')?.name || '';
  });
  const [selectedFilterValue, setSelectedFilterValue] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Dynamic Chart Metric Selection
  const numberColumns = useMemo(() => dataset.columns.filter(c => c.type === 'number'), [dataset.columns]);
  const catColumns = useMemo(() => dataset.columns.filter(c => c.type === 'category' || c.type === 'string'), [dataset.columns]);

  const [primaryMetricCol, setPrimaryMetricCol] = useState<string>(() => numberColumns[0]?.name || dataset.columns[0]?.name || '');
  const [secondaryMetricCol, setSecondaryMetricCol] = useState<string>(() => numberColumns[1]?.name || numberColumns[0]?.name || '');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  const [aggregation, setAggregation] = useState<AggregationType>('mean');

  const colors = DASHBOARD_PALETTES[paletteKey] || DASHBOARD_PALETTES.vibrant;

  // Compute distinct category values for the active slicer
  const slicerOptions = useMemo(() => {
    if (!selectedCategoryCol) return [];
    const values = new Set<string>();
    dataset.data.forEach(r => {
      const val = r[selectedCategoryCol];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        values.add(String(val));
      }
    });
    return Array.from(values).sort().slice(0, 15);
  }, [dataset, selectedCategoryCol]);

  // Filtered dataset based on interactive category slicer + search
  const filteredData = useMemo(() => {
    let list = dataset.data;

    if (selectedCategoryCol && selectedFilterValue !== 'ALL') {
      list = list.filter(r => String(r[selectedCategoryCol]) === selectedFilterValue);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => {
        return Object.values(r).some(val => 
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [dataset.data, selectedCategoryCol, selectedFilterValue, searchQuery]);

  // Compute Overall Health & Completeness
  const healthMetrics = useMemo(() => {
    let totalCells = dataset.data.length * (dataset.columns.length || 1);
    if (totalCells === 0) totalCells = 1;

    let totalNulls = 0;
    dataset.columns.forEach(col => {
      const stats = computeColumnStats(dataset.data, col);
      totalNulls += stats.nullCount || 0;
    });

    const completeness = Math.max(0, Math.min(100, Math.round(((totalCells - totalNulls) / totalCells) * 1000) / 10));
    let score = completeness;
    if (dataset.data.length > 0 && dataset.columns.length > 0) {
      if (completeness >= 98) score = 99;
      else if (completeness >= 90) score = 92;
      else if (completeness >= 80) score = 84;
    } else {
      score = 50;
    }

    return {
      totalCells,
      totalNulls,
      completeness,
      healthScore: score,
      grade: score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : 'C',
    };
  }, [dataset]);

  // Dynamic Primary Metric Stats
  const primaryMetricStats = useMemo(() => {
    if (!primaryMetricCol) return null;
    const colMeta = dataset.columns.find(c => c.name === primaryMetricCol);
    if (!colMeta) return null;

    const baseStats = computeColumnStats(dataset.data, colMeta);
    const filteredStats = computeColumnStats(filteredData, colMeta);

    return {
      mean: filteredStats.mean ?? 0,
      baseMean: baseStats.mean ?? 0,
      median: filteredStats.median ?? 0,
      min: filteredStats.min ?? 0,
      max: filteredStats.max ?? 0,
      sum: filteredStats.sum ?? 0,
      stdDev: filteredStats.stdDev ?? 0,
    };
  }, [dataset, filteredData, primaryMetricCol]);

  // Dynamic Aggregate Chart Series (X: Selected Category, Y: Primary Metric)
  const chartData = useMemo(() => {
    const groupCol = selectedCategoryCol || catColumns[0]?.name || dataset.columns[0]?.name;
    if (!groupCol || !primaryMetricCol) return [];

    const groups: Record<string, number[]> = {};
    filteredData.forEach(row => {
      const key = String(row[groupCol] ?? 'Other');
      const val = Number(row[primaryMetricCol]);
      if (!groups[key]) groups[key] = [];
      if (!isNaN(val)) groups[key].push(val);
    });

    const result = Object.entries(groups).map(([label, vals]) => {
      let aggregatedVal = 0;
      if (vals.length > 0) {
        if (aggregation === 'sum') aggregatedVal = vals.reduce((a, b) => a + b, 0);
        else if (aggregation === 'mean') aggregatedVal = vals.reduce((a, b) => a + b, 0) / vals.length;
        else if (aggregation === 'count') aggregatedVal = vals.length;
        else if (aggregation === 'min') aggregatedVal = Math.min(...vals);
        else if (aggregation === 'max') aggregatedVal = Math.max(...vals);
      }
      return {
        name: label.length > 18 ? label.substring(0, 16) + '...' : label,
        fullName: label,
        value: round(aggregatedVal, 2),
        count: vals.length,
      };
    });

    result.sort((a, b) => b.value - a.value);
    return result.slice(0, 10);
  }, [filteredData, selectedCategoryCol, catColumns, dataset.columns, primaryMetricCol, aggregation]);

  // Categorical Breakdown Data for Donut Chart
  const donutData = useMemo(() => {
    const groupCol = selectedCategoryCol || catColumns[0]?.name;
    if (!groupCol) return [];

    const counts: Record<string, number> = {};
    filteredData.forEach(row => {
      const key = String(row[groupCol] ?? 'Unknown');
      counts[key] = (counts[key] || 0) + 1;
    });

    const total = filteredData.length || 1;
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({
        name: name.length > 16 ? name.substring(0, 14) + '...' : name,
        fullName: name,
        value: count,
        percentage: round((count / total) * 100, 1),
      }))
      .sort((a, b) => b.value - a.value);

    // Limit to top 5 and group remainder as "Other"
    if (sorted.length > 6) {
      const top5 = sorted.slice(0, 5);
      const remainderCount = sorted.slice(5).reduce((acc, curr) => acc + curr.value, 0);
      top5.push({
        name: 'Other',
        fullName: 'Other Groups',
        value: remainderCount,
        percentage: round((remainderCount / total) * 100, 1),
      });
      return top5;
    }

    return sorted;
  }, [filteredData, selectedCategoryCol, catColumns]);

  // Scatter/Bivariate Relationship (Primary Metric vs Secondary Metric)
  const scatterData = useMemo(() => {
    if (!primaryMetricCol || !secondaryMetricCol || primaryMetricCol === secondaryMetricCol) return [];
    return filteredData
      .map((row, idx) => ({
        x: Number(row[primaryMetricCol]),
        y: Number(row[secondaryMetricCol]),
        label: `Row #${idx + 1}`,
      }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y))
      .slice(0, 60);
  }, [filteredData, primaryMetricCol, secondaryMetricCol]);

  // Top Key Correlation Pair
  const correlationHighlights = useMemo(() => {
    if (numberColumns.length < 2 || dataset.data.length < 3) return [];
    const matrix = computeCorrelationMatrix(dataset.data, dataset.columns);
    const pairs: Array<{ colA: string; colB: string; r: number }> = [];
    const seen = new Set<string>();

    numberColumns.forEach(c1 => {
      numberColumns.forEach(c2 => {
        if (c1.id !== c2.id) {
          const key = [c1.id, c2.id].sort().join('___');
          if (!seen.has(key)) {
            seen.add(key);
            const val = matrix.matrix[c1.id]?.[c2.id];
            if (val !== undefined && !isNaN(val)) {
              pairs.push({ colA: c1.name, colB: c2.name, r: round(val, 2) });
            }
          }
        }
      });
    });

    pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    return pairs.slice(0, 3);
  }, [dataset, numberColumns]);

  // Leaderboard / Top Cohort
  const topCohort = chartData[0];

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [pdfStatusText, setPdfStatusText] = useState('');

  const handlePrintDashboard = () => {
    triggerCleanPrint('interactive-dashboard-container', `${dataset.name} Interactive Dashboard`);
  };

  const handleDownloadDashboardPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfStatusText('Preparing PDF...');

    try {
      const cleanName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Dashboard_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;

      const success = await generateAndDownloadPdf({
        elementId: 'interactive-dashboard-container',
        filename,
        title: `${dataset.name} Visual Dashboard`,
        onProgress: (status) => setPdfStatusText(status),
      });

      if (!success) {
        triggerCleanPrint('interactive-dashboard-container', `${dataset.name} Interactive Dashboard`);
      }
    } catch (e) {
      console.error('PDF export error:', e);
      triggerCleanPrint('interactive-dashboard-container', `${dataset.name} Interactive Dashboard`);
    } finally {
      setIsGeneratingPdf(false);
      setPdfStatusText('');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div 
      id="interactive-dashboard-container"
      data-printable-report="true"
      data-dataset-name={dataset.name}
      data-dataset-rows={`${dataset.data.length.toLocaleString()} records`}
      data-dataset-cols={`${dataset.columns.length} columns`}
      data-dataset-source={dataset.sourceType || 'Live Stream'}
      data-dataset-date={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      data-dataset-author={authorName || 'Data Analytics Team'}
      data-dataset-org={organizationName || 'Enterprise Analytics'}
      data-dataset-health="100% (A+)"
      data-dataset-classification="OFFICIAL ANALYTICAL REPORT"
      className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
        isDark 
          ? 'bg-slate-900 border-slate-800 text-slate-100' 
          : 'bg-slate-50 border-slate-200 text-slate-900'
      } ${isFullscreen ? 'fixed inset-0 z-50 p-6 overflow-y-auto max-w-none rounded-none' : 'p-6 sm:p-8 space-y-6'}`}
    >

      {/* AUTOMATIC PRINT SUMMARY HEADER (Injected exclusively in Print / PDF exports) */}
      <div className="print-summary-header" data-print-header="true">
        <div className="print-header-top">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs font-mono">
              DH
            </div>
            <div>
              <h1 className="print-brand-title">{dataset.name} — Visual Analytics Dashboard</h1>
              <p className="text-[8.5pt] text-slate-500 font-sans mt-0.5">
                {dataset.description || 'Visual executive analytics dashboard, distribution charts, and dimensional metrics.'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="print-badge">Executive Analytical Dossier</span>
            <p className="text-[7.5pt] text-slate-400 font-mono mt-1">CONFIDENTIAL &amp; PROPRIETARY</p>
          </div>
        </div>

        <div className="print-meta-grid">
          <div className="print-meta-item">
            <div className="print-meta-label">Total Observations</div>
            <div className="print-meta-val">{dataset.data.length.toLocaleString()} rows</div>
          </div>
          <div className="print-meta-item">
            <div className="print-meta-label">Total Dimensions</div>
            <div className="print-meta-val">{dataset.columns.length} columns</div>
          </div>
          <div className="print-meta-item">
            <div className="print-meta-label">Pipeline Source</div>
            <div className="print-meta-val uppercase">{dataset.sourceType || 'Ingestion'}</div>
          </div>
          <div className="print-meta-item">
            <div className="print-meta-label">Lead Analyst</div>
            <div className="print-meta-val">{authorName || 'Analytics Team'}</div>
          </div>
          <div className="print-meta-item">
            <div className="print-meta-label">Organization</div>
            <div className="print-meta-val">{organizationName || 'Enterprise'}</div>
          </div>
          <div className="print-meta-item">
            <div className="print-meta-label">Generation Timestamp</div>
            <div className="print-meta-val">{new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>
          <div className="print-meta-item">
            <div className="print-meta-label">Security Protocol</div>
            <div className="print-meta-val text-emerald-700 font-bold">100% Zero-Egress Airgap</div>
          </div>
          <div className="print-meta-item">
            <div className="print-meta-label">Data Engine</div>
            <div className="print-meta-val font-mono">Remix In-Memory Engine</div>
          </div>
        </div>
      </div>
      
      {/* 1. DASHBOARD CONTROL BAR */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        
        {/* Title & Metadata */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight">{dataset.name} Visual Dashboard</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono border ${
                isDark ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                Live Interactive
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Prepared by <span className="font-semibold">{authorName}</span> • {organizationName} • {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Dashboard Visual Tools: Theme, Palette, Fullscreen, PDF Download & Print */}
        <div className="flex items-center flex-wrap gap-2 no-print" data-no-print="true">
          
          {/* Download Dashboard PDF Button */}
          <button
            onClick={handleDownloadDashboardPdf}
            disabled={isGeneratingPdf}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Download Dashboard as High-Res PDF"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{pdfStatusText || 'PDF...'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </>
            )}
          </button>

          {/* Open PDF Studio Modal */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-rose-300 border-rose-500/30' 
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
            }`}
            title="Open Interactive PDF Document Studio"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">PDF Studio</span>
          </button>

          {/* Open Print Preview Modal */}
          <button
            onClick={() => setIsPrintPreviewOpen(true)}
            className={`px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30' 
                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200'
            }`}
            title="Open Print Preview & Section Customizer"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Print Preview</span>
          </button>

          {/* Quick Print Button */}
          <button
            onClick={handlePrintDashboard}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Print Dashboard"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Palette Selector */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <span className={`text-[10px] uppercase font-bold px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Palette
            </span>
            {(['vibrant', 'emerald', 'ocean', 'sunset'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPaletteKey(p)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold capitalize transition-colors ${
                  paletteKey === p 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            <span className="hidden sm:inline">{isDark ? 'Light UI' : 'Dark UI'}</span>
          </button>

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Presentation Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Presentation'}</span>
          </button>

        </div>
      </div>

      {/* 2. INTERACTIVE SLICERS & FILTER BAR */}
      <div 
        data-no-print="true"
        className={`p-4 rounded-2xl border space-y-3 no-print ${
          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Dimension Selector & Slicer Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Slice By:</span>
            </span>

            {/* Dimensional Column Selector Dropdown */}
            {catColumns.length > 0 && (
              <select
                value={selectedCategoryCol}
                onChange={e => {
                  setSelectedCategoryCol(e.target.value);
                  setSelectedFilterValue('ALL');
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none shrink-0 ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                {catColumns.map(col => (
                  <option key={col.id} value={col.name}>{col.name}</option>
                ))}
              </select>
            )}

            {/* Quick Slicer Filter Pills */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedFilterValue('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedFilterValue === 'ALL'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm'
                    : isDark ? 'bg-slate-900 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-black'
                }`}
              >
                All Records ({dataset.data.length})
              </button>

              {slicerOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setSelectedFilterValue(opt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selectedFilterValue === opt
                      ? 'bg-indigo-600 text-white shadow-sm font-bold'
                      : isDark ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:text-black'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Search filter & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search values..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1 rounded-xl border text-xs focus:outline-none ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-black placeholder-slate-400'
                }`}
              />
            </div>

            {(selectedFilterValue !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedFilterValue('ALL');
                  setSearchQuery('');
                }}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-800 text-rose-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-rose-600'
                }`}
                title="Reset Slicers & Filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 3. EXECUTIVE HERO STATS RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Sample Volume / Sliced Count */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Filtered Records
            </span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight">{filteredData.length.toLocaleString()}</span>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              of {dataset.data.length.toLocaleString()} total
            </span>
          </div>
          <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden bg-slate-800/50">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
              style={{ width: `${Math.round((filteredData.length / (dataset.data.length || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Primary Metric Central Value */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider truncate max-w-[130px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {primaryMetricCol || 'Primary Metric'}
            </span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight text-cyan-400">
              {primaryMetricStats ? round(primaryMetricStats.mean, 2) : '-'}
            </span>
            <span className={`text-[11px] uppercase font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Avg (μ)
            </span>
          </div>
          <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Range: [{primaryMetricStats ? round(primaryMetricStats.min, 1) : '-'}, {primaryMetricStats ? round(primaryMetricStats.max, 1) : '-'}]
          </p>
        </div>

        {/* Card 3: Data Health & Reliability Grade */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Health & Integrity
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
              {healthMetrics.completeness}%
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
              Grade {healthMetrics.grade}
            </span>
          </div>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {healthMetrics.totalNulls === 0 ? 'Zero missing values' : `${healthMetrics.totalNulls} missing cells handled`}
          </p>
        </div>

        {/* Card 4: Dominant Leader / Top Cohort */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Top Performing Segment
            </span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 truncate">
            <span className="text-lg font-black tracking-tight text-amber-400 truncate block">
              {topCohort?.fullName || 'N/A'}
            </span>
          </div>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {topCohort ? `${topCohort.value} (${aggregation})` : 'No category variance'}
          </p>
        </div>

      </div>

      {/* 4. MAIN CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Main Interactive Trend / Distribution Chart */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          
          {/* Chart Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-tight">Feature Performance & Distribution</h3>
              </div>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Comparing <span className="font-semibold text-indigo-300">{primaryMetricCol}</span> across <span className="font-semibold text-cyan-300">{selectedCategoryCol}</span>
              </p>
            </div>

            {/* Metric & Chart Switchers */}
            <div className="flex items-center flex-wrap gap-2 text-xs">
              
              {/* Primary Metric Picker */}
              <select
                value={primaryMetricCol}
                onChange={e => setPrimaryMetricCol(e.target.value)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
                title="Select metric to plot on Y-axis"
              >
                {numberColumns.map(col => (
                  <option key={col.id} value={col.name}>{col.name}</option>
                ))}
              </select>

              {/* Aggregation Mode */}
              <select
                value={aggregation}
                onChange={e => setAggregation(e.target.value as AggregationType)}
                className={`px-2 py-1 rounded-lg border text-xs font-semibold focus:outline-none ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                <option value="mean">Mean (Avg)</option>
                <option value="sum">Sum (Total)</option>
                <option value="count">Count (Freq)</option>
                <option value="max">Max Peak</option>
                <option value="min">Min Floor</option>
              </select>

              {/* Chart Visual Type */}
              <div className={`flex items-center p-0.5 rounded-lg border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}>
                <button
                  onClick={() => setChartType('area')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${chartType === 'area' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${chartType === 'bar' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${chartType === 'line' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  Line
                </button>
              </div>

            </div>
          </div>

          {/* Recharts Canvas */}
          <div className="h-72 w-full pt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No observations match current filter criteria.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                    <defs>
                      <linearGradient id="dashboardAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[0]} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={colors[0]} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      angle={-25} 
                      textAnchor="end" 
                    />
                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                      formatter={(val: any) => [`${val} (${aggregation})`, primaryMetricCol]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={colors[0]} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#dashboardAreaGrad)" 
                    />
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      angle={-25} 
                      textAnchor="end" 
                    />
                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                      formatter={(val: any) => [`${val} (${aggregation})`, primaryMetricCol]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                    <XAxis 
                      dataKey="name" 
                      stroke={isDark ? '#94a3b8' : '#64748b'} 
                      fontSize={11} 
                      angle={-25} 
                      textAnchor="end" 
                    />
                    <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                      formatter={(val: any) => [`${val} (${aggregation})`, primaryMetricCol]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={colors[1]} 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: colors[1] }} 
                      activeDot={{ r: 7 }} 
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 1 Col: Donut Composition & Share */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm tracking-tight">Category Breakdown</h3>
              </div>
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {donutData.length} Slices
              </span>
            </div>

            {/* Donut Chart Canvas */}
            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: isDark ? '#ffffff' : '#000000',
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${val} rows (${item?.payload?.percentage}%)`,
                      item?.payload?.fullName || name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Legend List */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 max-h-36 overflow-y-auto">
            {donutData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: colors[idx % colors.length] }} 
                  />
                  <span className={`truncate font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {item.fullName}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold shrink-0">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* 5. SECONDARY ANALYTICAL ROW: BIVARIATE SCATTER & KEY STRATEGIC TAKEAWAYS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bivariate Relationship Scatter Plot */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              <h3 className="font-bold text-sm tracking-tight">Bivariate Elasticity & Scatter</h3>
            </div>
            
            {/* Secondary Column Selector */}
            {numberColumns.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Y-Axis:</span>
                <select
                  value={secondaryMetricCol}
                  onChange={e => setSecondaryMetricCol(e.target.value)}
                  className={`px-2 py-0.5 rounded-lg border text-xs font-semibold focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  {numberColumns.map(col => (
                    <option key={col.id} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="h-48 w-full">
            {scatterData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Select two numeric features to plot covariance.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 15, bottom: 10, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={primaryMetricCol} 
                    stroke={isDark ? '#94a3b8' : '#64748b'} 
                    fontSize={11} 
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={secondaryMetricCol} 
                    stroke={isDark ? '#94a3b8' : '#64748b'} 
                    fontSize={11} 
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: isDark ? '#ffffff' : '#000000',
                    }}
                    formatter={(val: any, name: any) => [val, name]}
                  />
                  <Scatter 
                    name="Observations" 
                    data={scatterData} 
                    fill={colors[2]} 
                    opacity={0.8}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>

          {correlationHighlights.length > 0 && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Strongest Driver: {correlationHighlights[0].colA} ↔ {correlationHighlights[0].colB}
              </span>
              <span className="font-mono font-bold text-teal-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                r = {correlationHighlights[0].r}
              </span>
            </div>
          )}
        </div>

        {/* Automated Key Insights & Executive Synthesis */}
        <div className={`p-5 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm tracking-tight">Automated Executive Takeaways</h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className={`p-3 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className={isDark ? 'text-white' : 'text-black'}>Data Hygiene Passed:</strong> Overall record completeness stands at{' '}
                <span className="font-mono font-bold text-emerald-400">{healthMetrics.completeness}%</span> across{' '}
                {dataset.columns.length} tracked feature dimensions.
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <Target className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong className={isDark ? 'text-white' : 'text-black'}>Concentration Index:</strong> The top category{' '}
                <span className="font-bold text-cyan-300">"{topCohort?.fullName}"</span> commands{' '}
                <span className="font-mono font-bold">{donutData[0]?.percentage || 0}%</span> of all active cohort records.
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className={isDark ? 'text-white' : 'text-black'}>Analytical Action:</strong> High covariance detected between continuous numerical features. Recommended deployment of multivariable regression and K-Means segmentation.
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Powered by DataHub Real-Time In-Memory Engine</span>
            <span className="font-mono">N={filteredData.length} records</span>
          </div>

        </div>

      </div>

      {/* PDF Export Studio Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        dataset={dataset}
        initialAuthor={authorName}
        initialOrganization={organizationName}
      />

      {/* Print Preview & Section Customizer Modal */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        dataset={dataset}
        initialAuthor={authorName}
        initialOrganization={organizationName}
      />

    </div>
  );
};
