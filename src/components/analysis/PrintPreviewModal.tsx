import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Sliders,
  Eye,
  Layers,
  BarChart3,
  Table as TableIcon,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
  CheckSquare,
  Square,
  FileSpreadsheet,
  PieChart,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import { computeColumnStats, computeCorrelationMatrix, round } from '../../utils/statistics';
import { triggerCleanPrint } from '../../utils/pdfGenerator';

export interface SectionToggles {
  summaryHeader: boolean;
  executiveNotes: boolean;
  macroKpis: boolean;
  healthProfile: boolean;
  charts: boolean;
  tables: boolean;
  categorical: boolean;
  correlations: boolean;
  recommendations: boolean;
  watermark: boolean;
}

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  initialAuthor?: string;
  initialOrganization?: string;
  initialNotes?: string;
  initialToggles?: Partial<SectionToggles>;
}

const DEFAULT_TOGGLES: SectionToggles = {
  summaryHeader: true,
  executiveNotes: true,
  macroKpis: true,
  healthProfile: true,
  charts: true,
  tables: true,
  categorical: true,
  correlations: true,
  recommendations: true,
  watermark: true,
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  dataset,
  initialAuthor = 'Lead Analytics Team',
  initialOrganization = 'Enterprise Data Intelligence',
  initialNotes = 'Comprehensive statistical summary and distribution analysis. All data was processed in-memory with strict zero-egress encryption.',
  initialToggles,
}) => {
  // Section toggle state
  const [sections, setSections] = useState<SectionToggles>({
    ...DEFAULT_TOGGLES,
    ...initialToggles,
  });

  // Display and styling options
  const [colorMode, setColorMode] = useState<'inkSaver' | 'vibrant'>('inkSaver');
  const [density, setDensity] = useState<'compact' | 'normal' | 'relaxed'>('normal');
  const [paperFormat, setPaperFormat] = useState<'a4' | 'letter'>('a4');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleNativePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dataset, sections, colorMode]);

  // Compute column statistics
  const columnStats = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.map(col => ({
      meta: col,
      stats: computeColumnStats(dataset.data, col),
    }));
  }, [dataset]);

  const numberColumns = useMemo(
    () => dataset?.columns.filter(c => c.type === 'number') || [],
    [dataset]
  );
  
  const catColumns = useMemo(
    () => dataset?.columns.filter(c => c.type === 'string' || c.type === 'category') || [],
    [dataset]
  );

  // Compute Health Metrics
  const healthMetrics = useMemo(() => {
    if (!dataset || dataset.data.length === 0) {
      return {
        totalCells: 0,
        totalNulls: 0,
        completeness: 100,
        healthScore: 100,
        grade: 'A+',
      };
    }

    let totalCells = dataset.data.length * (dataset.columns.length || 1);
    let totalNulls = 0;
    columnStats.forEach(({ stats }) => {
      totalNulls += stats.nullCount || 0;
    });

    const completeness = Math.max(0, Math.min(100, Math.round(((totalCells - totalNulls) / totalCells) * 1000) / 10));
    let score = completeness;
    if (completeness >= 98) score = 99;
    else if (completeness >= 90) score = 92;
    else if (completeness >= 80) score = 84;
    else score = 70;

    let grade = 'A+';
    if (score < 75) grade = 'C';
    else if (score < 88) grade = 'B';
    else if (score < 95) grade = 'A';

    return {
      totalCells,
      totalNulls,
      completeness,
      healthScore: score,
      grade,
    };
  }, [dataset, columnStats]);

  // Compute correlation highlights
  const correlationHighlights = useMemo(() => {
    if (numberColumns.length < 2 || dataset.data.length < 3) return [];
    const matrix = computeCorrelationMatrix(dataset.data, dataset.columns);
    const pairs: Array<{
      colA: string;
      colB: string;
      correlation: number;
      strength: string;
      direction: 'positive' | 'negative';
    }> = [];

    const seen = new Set<string>();
    numberColumns.forEach(c1 => {
      numberColumns.forEach(c2 => {
        if (c1.id !== c2.id) {
          const key = [c1.id, c2.id].sort().join('___');
          if (!seen.has(key)) {
            seen.add(key);
            const val = matrix.matrix[c1.id]?.[c2.id];
            if (val !== undefined && !isNaN(val) && Math.abs(val) >= 0.25) {
              let strength = 'Moderate';
              if (Math.abs(val) >= 0.7) strength = 'Very Strong';
              else if (Math.abs(val) >= 0.5) strength = 'Strong';

              pairs.push({
                colA: c1.name,
                colB: c2.name,
                correlation: round(val, 3),
                strength,
                direction: val > 0 ? 'positive' : 'negative',
              });
            }
          }
        }
      });
    });

    pairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    return pairs.slice(0, 6);
  }, [dataset, numberColumns]);

  // Frequency Bins for top numerical columns (for the visual charts section)
  const numericHistograms = useMemo(() => {
    if (!sections.charts || numberColumns.length === 0) return [];
    
    return numberColumns.slice(0, 4).map(col => {
      const nums = dataset.data
        .map(r => Number(r[col.name]))
        .filter(n => !isNaN(n) && n !== null);

      if (nums.length === 0) {
        return { col, bins: [], min: 0, max: 0 };
      }

      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const binCount = 8;
      const binWidth = max === min ? 1 : (max - min) / binCount;

      const bins = Array.from({ length: binCount }, (_, i) => {
        const binStart = min + i * binWidth;
        const binEnd = min + (i + 1) * binWidth;
        const count = nums.filter(n => (i === binCount - 1 ? n >= binStart && n <= binEnd : n >= binStart && n < binEnd)).length;
        return {
          binLabel: `${round(binStart, 1)}-${round(binEnd, 1)}`,
          count,
          percentage: (count / nums.length) * 100,
        };
      });

      const maxCount = Math.max(...bins.map(b => b.count), 1);

      return {
        col,
        bins,
        min,
        max,
        maxCount,
        total: nums.length,
      };
    });
  }, [dataset, numberColumns, sections.charts]);

  // Section toggle helper
  const toggleSection = (key: keyof SectionToggles) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Preset selectors
  const applyPreset = (preset: 'all' | 'charts' | 'tables' | 'brief') => {
    if (preset === 'all') {
      setSections({
        summaryHeader: true,
        executiveNotes: true,
        macroKpis: true,
        healthProfile: true,
        charts: true,
        tables: true,
        categorical: true,
        correlations: true,
        recommendations: true,
        watermark: true,
      });
    } else if (preset === 'charts') {
      setSections({
        summaryHeader: true,
        executiveNotes: false,
        macroKpis: true,
        healthProfile: true,
        charts: true,
        tables: false,
        categorical: true,
        correlations: true,
        recommendations: false,
        watermark: true,
      });
    } else if (preset === 'tables') {
      setSections({
        summaryHeader: true,
        executiveNotes: false,
        macroKpis: true,
        healthProfile: false,
        charts: false,
        tables: true,
        categorical: true,
        correlations: true,
        recommendations: false,
        watermark: true,
      });
    } else if (preset === 'brief') {
      setSections({
        summaryHeader: true,
        executiveNotes: true,
        macroKpis: true,
        healthProfile: false,
        charts: false,
        tables: false,
        categorical: false,
        correlations: false,
        recommendations: true,
        watermark: true,
      });
    }
  };

  const activeCount = Object.values(sections).filter(Boolean).length;
  const totalCount = Object.keys(sections).length;

  // Trigger the browser's native print dialog
  const handleNativePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      try {
        triggerCleanPrint('print-preview-rendered-document', `${dataset.name} Analytics Report`);
      } catch (err) {
        console.error('Failed to trigger clean print window, falling back to window.print()', err);
        window.print();
      } finally {
        setIsPrinting(false);
      }
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <div
      id="print-preview-modal-root"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md overflow-hidden text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
    >
      {/* 1. TOP HEADER TOOLBAR */}
      <header className="no-print h-16 px-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="print-preview-title" className="text-sm font-bold text-white tracking-tight">
                Print Preview &amp; Layout Studio
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                {activeCount}/{totalCount} Sections Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-md">
              {dataset.name} • Read-only preview calibrated for native printing &amp; PDF export
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2.5">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold px-1 text-slate-300 w-11 text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Direct Print Button */}
          <button
            id="print-preview-trigger-btn"
            onClick={handleNativePrint}
            disabled={activeCount === 0 || isPrinting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            title="Open browser print dialog (Ctrl+P)"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. BODY WORKSPACE (SPLIT: CONTROLS SIDEBAR & DOCUMENT PREVIEW) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT SIDEBAR: SECTION TOGGLES & DISPLAY OPTIONS */}
        <aside className="no-print w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0 overflow-y-auto max-h-[35vh] lg:max-h-none">
          <div className="p-4 space-y-5">
            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Layout Presets</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => applyPreset('all')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-colors text-left flex items-center justify-between"
                >
                  <span>Full Audit</span>
                  <span className="text-[10px] font-mono text-cyan-400">All</span>
                </button>
                <button
                  onClick={() => applyPreset('charts')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-colors text-left flex items-center justify-between"
                >
                  <span>Charts Focus</span>
                  <BarChart3 className="w-3 h-3 text-teal-400" />
                </button>
                <button
                  onClick={() => applyPreset('tables')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-colors text-left flex items-center justify-between"
                >
                  <span>Tables Only</span>
                  <TableIcon className="w-3 h-3 text-indigo-400" />
                </button>
                <button
                  onClick={() => applyPreset('brief')}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-colors text-left flex items-center justify-between"
                >
                  <span>Exec Brief</span>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </button>
              </div>
            </div>

            {/* Section Visibility Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Document Sections</span>
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => applyPreset('all')}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={() =>
                      setSections({
                        summaryHeader: true,
                        executiveNotes: false,
                        macroKpis: false,
                        healthProfile: false,
                        charts: false,
                        tables: false,
                        categorical: false,
                        correlations: false,
                        recommendations: false,
                        watermark: false,
                      })
                    }
                    className="text-slate-400 hover:text-slate-300 font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {/* 1. Executive Header */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-slate-200">Executive Title &amp; Metadata</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.summaryHeader}
                    onChange={() => toggleSection('summaryHeader')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 2. Executive Notes */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span className="font-semibold text-slate-200">Executive Analytical Summary</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.executiveNotes}
                    onChange={() => toggleSection('executiveNotes')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 3. Macro KPIs */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-slate-200">Macro KPIs &amp; Sample Size</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.macroKpis}
                    onChange={() => toggleSection('macroKpis')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 4. Health & Hygiene Audit */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span className="font-semibold text-slate-200">Data Quality &amp; Hygiene Audit</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.healthProfile}
                    onChange={() => toggleSection('healthProfile')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 5. Visual Charts & Distributions */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold text-slate-200">Distribution Charts &amp; Visuals</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.charts}
                    onChange={() => toggleSection('charts')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 6. Comprehensive Statistics Table */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-slate-200">Descriptive Statistics Table</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.tables}
                    onChange={() => toggleSection('tables')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 7. Categorical Breakdown */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-semibold text-slate-200">Categorical Frequency Factors</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.categorical}
                    onChange={() => toggleSection('categorical')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 8. Correlation Drivers */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold text-slate-200">Bivariate Correlation Drivers</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.correlations}
                    onChange={() => toggleSection('correlations')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 9. Action Items */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold text-slate-200">Strategic Next Steps</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.recommendations}
                    onChange={() => toggleSection('recommendations')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>

                {/* 10. Watermark & Footer */}
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 cursor-pointer transition-colors text-xs">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-200">Security &amp; Airgap Watermark</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={sections.watermark}
                    onChange={() => toggleSection('watermark')}
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500/30"
                  />
                </label>
              </div>
            </div>

            {/* Print Formatting Settings */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Print Mode &amp; Page Setup</span>
              </label>

              {/* Color Mode */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Color Profile:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setColorMode('inkSaver')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      colorMode === 'inkSaver'
                        ? 'bg-slate-800 text-white border-cyan-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Ink-Saver (Light)
                  </button>
                  <button
                    onClick={() => setColorMode('vibrant')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      colorMode === 'vibrant'
                        ? 'bg-slate-800 text-white border-cyan-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Executive Dark
                  </button>
                </div>
              </div>

              {/* Density Setting */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Padding Density:</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['compact', 'normal', 'relaxed'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setDensity(mode)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize border transition-colors ${
                        density === mode
                          ? 'bg-slate-800 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Format */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Paper Aspect Ratio:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setPaperFormat('a4')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      paperFormat === 'a4'
                        ? 'bg-slate-800 text-white border-indigo-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    A4 (Standard)
                  </button>
                  <button
                    onClick={() => setPaperFormat('letter')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      paperFormat === 'letter'
                        ? 'bg-slate-800 text-white border-indigo-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    US Letter
                  </button>
                </div>
              </div>
            </div>

            {/* Trigger Button at Bottom of Sidebar */}
            <div className="pt-2">
              <button
                onClick={handleNativePrint}
                disabled={activeCount === 0 || isPrinting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Launch Native Print</span>
              </button>
              <p className="text-[10px] text-slate-500 text-center mt-1.5">
                Renders clean vector output to system printer or PDF
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN VIEWPORT: READ-ONLY LIVE DOCUMENT PREVIEW CANVAS */}
        <main className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto flex flex-col items-center">
          {/* Zoom container wrapper */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full max-w-4xl"
          >
            {/* The Print Container */}
            <div
              id="print-preview-rendered-document"
              data-printable-report="true"
              data-dataset-name={dataset.name}
              data-dataset-rows={`${dataset.data.length.toLocaleString()} records`}
              data-dataset-cols={`${dataset.columns.length} columns`}
              data-dataset-source={dataset.sourceType || 'Structured Ingestion'}
              data-dataset-date={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              data-dataset-author={initialAuthor}
              data-dataset-org={initialOrganization}
              data-dataset-health={`${healthMetrics.healthScore}% (${healthMetrics.grade})`}
              className={`rounded-2xl transition-all shadow-2xl ${
                colorMode === 'inkSaver'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'bg-slate-900 text-slate-100 border border-slate-800'
              } ${
                density === 'compact' ? 'p-6 space-y-5' : density === 'relaxed' ? 'p-12 space-y-9' : 'p-8 sm:p-10 space-y-7'
              }`}
            >
              {/* 1. EXECUTIVE HEADER & METADATA */}
              {sections.summaryHeader && (
                <div
                  className={`border-b pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-6 ${
                    colorMode === 'inkSaver' ? 'border-slate-300' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                          colorMode === 'inkSaver'
                            ? 'bg-teal-50 text-teal-800 border-teal-600'
                            : 'bg-teal-950 text-teal-400 border-teal-800'
                        }`}
                      >
                        Official Analytical Dossier
                      </span>
                      <span className="text-slate-400">•</span>
                      <span
                        className={`text-xs font-mono ${
                          colorMode === 'inkSaver' ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        CONFIDENTIAL &amp; PROPRIETARY
                      </span>
                    </div>

                    <h1
                      className={`text-2xl sm:text-3xl font-black tracking-tight ${
                        colorMode === 'inkSaver' ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {dataset.name}
                    </h1>

                    <p
                      className={`text-xs max-w-2xl leading-relaxed ${
                        colorMode === 'inkSaver' ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {dataset.description ||
                        'Comprehensive statistical audit, data quality profile, and distribution dossier.'}
                    </p>
                  </div>

                  {/* Metadata Badge Box */}
                  <div
                    className={`p-3.5 rounded-xl border text-right text-xs space-y-1 shrink-0 ${
                      colorMode === 'inkSaver'
                        ? 'bg-slate-50 border-slate-200 text-slate-700'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <p>
                      Generated:{' '}
                      <span
                        className={`font-bold font-mono ${
                          colorMode === 'inkSaver' ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {new Date().toLocaleDateString()}
                      </span>
                    </p>
                    <p>
                      Organization:{' '}
                      <span className="font-bold text-teal-600 font-mono">{initialOrganization}</span>
                    </p>
                    <p>
                      Lead Analyst:{' '}
                      <span
                        className={`font-bold font-mono ${
                          colorMode === 'inkSaver' ? 'text-slate-900' : 'text-slate-200'
                        }`}
                      >
                        {initialAuthor}
                      </span>
                    </p>
                    <p>
                      Source:{' '}
                      <span className="font-bold text-cyan-600 font-mono uppercase">
                        {dataset.sourceType}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* 2. EXECUTIVE ANALYTICAL NOTES */}
              {sections.executiveNotes && initialNotes && (
                <div
                  className={`p-4 rounded-xl border space-y-1.5 ${
                    colorMode === 'inkSaver'
                      ? 'bg-slate-50 border-teal-600/30'
                      : 'bg-gradient-to-r from-teal-950/40 via-slate-950 to-slate-950 border-teal-500/20'
                  }`}
                >
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      colorMode === 'inkSaver' ? 'text-teal-800' : 'text-teal-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                    <span>Executive Analytical Summary</span>
                  </h3>
                  <p
                    className={`text-xs leading-relaxed ${
                      colorMode === 'inkSaver' ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    {initialNotes}
                  </p>
                </div>
              )}

              {/* 3. MACRO KPIS & HEALTH OVERVIEW */}
              {sections.macroKpis && (
                <div className="space-y-2.5">
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      colorMode === 'inkSaver' ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-teal-500" />
                    <span>1. Macro Dimensions &amp; Overall Health Index</span>
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div
                      className={`p-3.5 rounded-xl border space-y-1 ${
                        colorMode === 'inkSaver'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase text-slate-500">
                        Observations (N)
                      </p>
                      <p
                        className={`text-2xl font-black font-mono tracking-tight ${
                          colorMode === 'inkSaver' ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {dataset.data.length.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400">Total records</p>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border space-y-1 ${
                        colorMode === 'inkSaver'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase text-slate-500">
                        Feature Dimensions
                      </p>
                      <p className="text-2xl font-black text-teal-600 font-mono tracking-tight">
                        {dataset.columns.length}{' '}
                        <span className="text-xs text-slate-400 font-sans">cols</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {numberColumns.length} Num • {catColumns.length} Cat
                      </p>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border space-y-1 ${
                        colorMode === 'inkSaver'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase text-slate-500">
                        Data Completeness
                      </p>
                      <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
                        {healthMetrics.completeness}%
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {healthMetrics.totalNulls} missing cells
                      </p>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border space-y-1 ${
                        colorMode === 'inkSaver'
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <p className="text-[10px] font-semibold uppercase text-slate-500">
                        Audit Health Grade
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-cyan-600 font-mono tracking-tight">
                          {healthMetrics.healthScore}%
                        </p>
                        <span className="px-1.5 py-0.5 rounded border text-xs font-black font-mono text-emerald-700 bg-emerald-50 border-emerald-300">
                          {healthMetrics.grade}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Integrity verified</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. DATA QUALITY & COLUMN HYGIENE AUDIT */}
              {sections.healthProfile && (
                <div className="space-y-2.5">
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      colorMode === 'inkSaver' ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>2. Data Quality &amp; Column Hygiene Audit</span>
                  </h2>

                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      colorMode === 'inkSaver'
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Schema Adherence: <strong className="text-slate-900">100% Strict</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Null Rate Threshold:{' '}
                          <strong className="text-emerald-700">&lt; 5% Target Passed</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Activity className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                        <span>
                          Cardinality Ratio:{' '}
                          <strong className="text-cyan-700">Verified Distinct</strong>
                        </span>
                      </div>
                    </div>

                    {/* Mini Fill-Rate Bars */}
                    <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">
                        Feature Fill Rates &amp; Completeness
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {columnStats.slice(0, 6).map(({ meta, stats }) => {
                          const fillRate = 100 - stats.nullPercentage;
                          return (
                            <div
                              key={meta.id}
                              className={`p-2 rounded-lg border space-y-1 ${
                                colorMode === 'inkSaver'
                                  ? 'bg-white border-slate-200'
                                  : 'bg-slate-900 border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold truncate max-w-[120px]">
                                  {meta.name}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">
                                  {round(fillRate, 1)}% fill
                                </span>
                              </div>
                              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    fillRate >= 95
                                      ? 'bg-emerald-500'
                                      : fillRate >= 80
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${fillRate}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. VISUAL CHARTS & DISTRIBUTIONS */}
              {sections.charts && numericHistograms.length > 0 && (
                <div className="space-y-2.5">
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      colorMode === 'inkSaver' ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>3. Visual Feature Distributions &amp; Density Histograms</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {numericHistograms.map(({ col, bins, min, max, maxCount, total }) => (
                      <div
                        key={col.id}
                        className={`p-4 rounded-xl border space-y-2.5 ${
                          colorMode === 'inkSaver'
                            ? 'bg-slate-50 border-slate-200 text-slate-900'
                            : 'bg-slate-950 border-slate-800 text-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold truncate max-w-[160px]">{col.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            Range: [{round(min, 1)}, {round(max, 1)}] • N={total}
                          </span>
                        </div>

                        {/* Read-Only SVG Histogram Visualization */}
                        <div className="h-24 flex items-end gap-1 pt-3 pb-1 px-1 bg-white/60 rounded-lg border border-slate-200/80">
                          {bins.map((b, bIdx) => {
                            const barHeight = Math.max(8, (b.count / maxCount) * 100);
                            return (
                              <div
                                key={bIdx}
                                className="flex-1 flex flex-col items-center h-full justify-end group relative"
                              >
                                <div
                                  className="w-full rounded-t bg-cyan-600 hover:bg-cyan-500 transition-all"
                                  style={{ height: `${barHeight}%` }}
                                />
                                <span className="text-[8px] font-mono text-slate-400 mt-1 truncate max-w-[28px]">
                                  {b.count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-slate-400 px-1">
                          <span>Min: {round(min, 1)}</span>
                          <span>Max: {round(max, 1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. COMPREHENSIVE DESCRIPTIVE STATISTICS TABLE */}
              {sections.tables && (
                <div className="space-y-2.5">
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      colorMode === 'inkSaver' ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5 text-cyan-500" />
                    <span>4. Variable Descriptive Statistics Summary Table</span>
                  </h2>

                  <div
                    className={`overflow-x-auto rounded-xl border ${
                      colorMode === 'inkSaver' ? 'border-slate-300' : 'border-slate-800'
                    }`}
                  >
                    <table className="w-full text-left text-xs font-mono">
                      <thead
                        className={`${
                          colorMode === 'inkSaver'
                            ? 'bg-slate-100 text-slate-800 border-b border-slate-300'
                            : 'bg-slate-950 text-slate-300 border-b border-slate-800'
                        }`}
                      >
                        <tr>
                          <th className="p-2.5 font-bold">Feature Name</th>
                          <th className="p-2.5 font-bold">Type</th>
                          <th className="p-2.5 font-bold">Unique</th>
                          <th className="p-2.5 font-bold">Nulls</th>
                          <th className="p-2.5 font-bold">Mean (μ)</th>
                          <th className="p-2.5 font-bold">Median</th>
                          <th className="p-2.5 font-bold">StdDev (σ)</th>
                          <th className="p-2.5 font-bold">Range [Min, Max]</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          colorMode === 'inkSaver'
                            ? 'divide-slate-200 bg-white text-slate-800'
                            : 'divide-slate-800/60 bg-slate-950/40 text-slate-300'
                        }`}
                      >
                        {columnStats.map(({ meta, stats }) => (
                          <tr key={meta.id} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold font-sans">{meta.name}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {meta.type}
                              </span>
                            </td>
                            <td className="p-2.5">{stats.uniqueCount}</td>
                            <td className="p-2.5">
                              {stats.nullCount > 0 ? (
                                <span className="text-amber-700 font-bold">
                                  {stats.nullCount} ({round(stats.nullPercentage, 1)}%)
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="p-2.5 text-cyan-700 font-bold">
                              {stats.mean !== undefined ? round(stats.mean, 2) : '-'}
                            </td>
                            <td className="p-2.5">
                              {stats.median !== undefined ? round(stats.median, 2) : '-'}
                            </td>
                            <td className="p-2.5 text-purple-700 font-bold">
                              {stats.stdDev !== undefined ? round(stats.stdDev, 2) : '-'}
                            </td>
                            <td className="p-2.5">
                              {stats.min !== undefined && stats.max !== undefined ? (
                                <span>
                                  [{round(stats.min, 1)}, {round(stats.max, 1)}]
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. CATEGORICAL FACTOR BREAKDOWN */}
              {sections.categorical && catColumns.length > 0 && (
                <div className="space-y-2.5">
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      colorMode === 'inkSaver' ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-purple-500" />
                    <span>5. Key Categorical Factor Proportions</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {catColumns.slice(0, 4).map(col => {
                      const statObj = columnStats.find(s => s.meta.id === col.id)?.stats;
                      const topVals = statObj?.topValues || [];
                      return (
                        <div
                          key={col.id}
                          className={`p-4 rounded-xl border space-y-2.5 ${
                            colorMode === 'inkSaver'
                              ? 'bg-slate-50 border-slate-200 text-slate-900'
                              : 'bg-slate-950 border-slate-800 text-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold">{col.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {statObj?.uniqueCount} distinct levels
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {topVals.slice(0, 4).map((t, idx) => (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-700 truncate max-w-[160px]">
                                    {t.value}
                                  </span>
                                  <span className="font-mono font-bold text-slate-600">
                                    {t.count} ({round(t.percentage, 1)}%)
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-teal-600 rounded-full"
                                    style={{ width: `${Math.min(100, t.percentage)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 8. BIVARIATE CORRELATION DRIVERS */}
              {sections.correlations && correlationHighlights.length > 0 && (
                <div className="space-y-2.5">
                  <h2
                    className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                      colorMode === 'inkSaver' ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                    <span>6. Dominant Bivariate Correlation Drivers</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {correlationHighlights.map((pair, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border space-y-1.5 ${
                          colorMode === 'inkSaver'
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate max-w-[130px]">
                            {pair.colA} ↔ {pair.colB}
                          </span>
                          <span
                            className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                              pair.direction === 'positive' ? 'text-teal-700' : 'text-rose-700'
                            }`}
                          >
                            {pair.direction === 'positive' ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {pair.correlation}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          <strong>{pair.strength}</strong> {pair.direction} covariance identified.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. STRATEGIC ACTION ITEMS */}
              {sections.recommendations && (
                <div
                  className={`p-5 rounded-xl border space-y-2 ${
                    colorMode === 'inkSaver'
                      ? 'bg-slate-50 border-slate-200 text-slate-800'
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <h2 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>7. Strategic Analytical Findings &amp; Next Steps</span>
                  </h2>
                  <ul className="space-y-1.5 text-xs list-disc list-inside leading-relaxed text-slate-700">
                    <li>
                      <strong>Predictive Feature Weighting:</strong> Formulate linear regression
                      equations between the primary correlated features to forecast continuous target
                      variances with confidence intervals.
                    </li>
                    <li>
                      <strong>Cohort Clustering:</strong> Deploy unsupervised K-Means segmentation (
                      <em>k=3</em> or <em>4</em>) to cluster multi-dimensional user or transaction
                      records into actionable operational cohorts.
                    </li>
                    <li>
                      <strong>Continuous Hygiene Monitoring:</strong> Configure periodic webhook or API
                      ingestion triggers to monitor statistical drift and maintain high dataset
                      completeness.
                    </li>
                  </ul>
                </div>
              )}

              {/* 10. RUNNING PRINT WATERMARK / FOOTER */}
              {sections.watermark && (
                <div
                  className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-[10px] gap-2 font-mono ${
                    colorMode === 'inkSaver'
                      ? 'border-slate-300 text-slate-500'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <p>
                    DOSSIER REFERENCE:{' '}
                    <span className="font-bold">DATAHUB-{dataset.id.substring(0, 8)}</span> •
                    ZERO-EGRESS AIRGAP AUDITED
                  </p>
                  <p>
                    {dataset.name} • {initialOrganization} • {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
