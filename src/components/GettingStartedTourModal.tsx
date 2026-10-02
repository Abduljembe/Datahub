import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  UploadCloud, 
  BarChart3, 
  Table, 
  TrendingUp, 
  Smartphone, 
  FileText, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Database, 
  FileSpreadsheet, 
  Zap, 
  Compass, 
  Layers,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Dataset } from '../types';

interface GettingStartedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onNavigateTab: (tab: 'upload' | 'analysis' | 'collection' | 'grid' | 'simulation' | 'report' | 'team' | 'supervisor') => void;
  onOpenDatasetModal: () => void;
  activeDataset: Dataset | null;
}

const TOUR_STEPS = [
  {
    id: 'welcome',
    badge: 'Step 1 of 4 • Quick Overview',
    title: 'Welcome to DataHub Intelligence Studio',
    subtitle: 'Your end-to-end platform for data ingestion, cleaning, high-order statistical modeling, and field operations.',
    icon: Compass,
    iconColor: 'from-indigo-500 to-cyan-500',
  },
  {
    id: 'import',
    badge: 'Step 2 of 4 • Data Ingestion',
    title: 'Import or Choose Your First Dataset',
    subtitle: 'Upload your own files or explore pre-loaded domain datasets to start analyzing immediately.',
    icon: UploadCloud,
    iconColor: 'from-cyan-500 to-emerald-500',
  },
  {
    id: 'workspaces',
    badge: 'Step 3 of 4 • Navigation Guide',
    title: 'Explore the 8 Specialized Workspaces',
    subtitle: 'Everything you need from automated data cleaning to machine learning forecasts and supervisor auditing.',
    icon: Layers,
    iconColor: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'ready',
    badge: 'Step 4 of 4 • Ready to Launch',
    title: "You're All Set! How would you like to begin?",
    subtitle: 'Pick a starting workflow below to jump straight into your data analysis.',
    icon: Sparkles,
    iconColor: 'from-amber-500 to-indigo-500',
  },
];

const WORKSPACE_FEATURES = [
  {
    tab: 'upload' as const,
    title: 'Upload & Clean Studio',
    desc: 'Ingest CSV/Excel/JSON files, autofix missing values, deduplicate rows, and engineer new computed columns.',
    icon: UploadCloud,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    tab: 'analysis' as const,
    title: 'Statistical & ML Analysis',
    desc: 'Pearson correlations, distribution histograms, PCA clustering, random forest models, and PDF export.',
    icon: BarChart3,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    tab: 'grid' as const,
    title: 'Interactive Grid Editor',
    desc: 'Spreadsheet-style data grid with instant filtering, multi-column sorting, inline editing, and formula evaluations.',
    icon: Table,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    tab: 'simulation' as const,
    title: 'What-If & Forecasting',
    desc: 'Interactive parameter sliders, dynamic scenario modeling, and Monte Carlo multi-step projections.',
    icon: TrendingUp,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    tab: 'collection' as const,
    title: 'Field Form Collection',
    desc: 'Mobile-responsive questionnaires with GPS geolocation, offline sync, validation rules, and quotas.',
    icon: Smartphone,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  {
    tab: 'report' as const,
    title: 'Executive Briefs',
    desc: 'Auto-compiled summaries, KPI scorecard metrics, high-impact chart decks, and printable summaries.',
    icon: FileText,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    tab: 'team' as const,
    title: 'Team & Coworker Chat',
    desc: 'Collaborate with team members, discuss datasets in real time, and share snapshots with role-based permissions.',
    icon: Users,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  {
    tab: 'supervisor' as const,
    title: 'Supervisor Vault',
    desc: 'Tactical fleet tracking, enumerator verification, data fraud detection, and quality compliance control.',
    icon: ShieldCheck,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
];

export const GettingStartedTourModal: React.FC<GettingStartedTourModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onNavigateTab,
  onOpenDatasetModal,
  activeDataset,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight' && currentStepIndex < TOUR_STEPS.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];

  const handleDismiss = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('datahub_tour_completed_v1', 'true');
      } catch (err) {
        console.warn(err);
      }
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Getting Started Tour"
    >
      <div 
        className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 ${
          isDark 
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/80' 
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Ambient Gradient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-500/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className={`p-4 sm:p-6 pb-3 border-b flex items-center justify-between relative z-10 ${
          isDark ? 'border-slate-800/80' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${currentStep.iconColor} flex items-center justify-center text-white shadow-lg shrink-0`}>
              <currentStep.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {currentStep.badge}
                </span>
              </div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight mt-0.5 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {currentStep.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Close Tour"
            aria-label="Close Tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 relative z-10 flex-1">
          <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {currentStep.subtitle}
          </p>

          {/* STEP 1: WELCOME */}
          {currentStepIndex === 0 && (
            <div className="space-y-3.5 pt-1">
              <div className={`p-4 rounded-2xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2 ${
                  isDark ? 'text-indigo-400' : 'text-indigo-600'
                }`}>
                  <Zap className="w-4 h-4" />
                  Key Highlights of DataHub
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-xs'
                  }`}>
                    <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 dark:text-slate-100">Zero-Friction Ingestion</h4>
                      <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                        Drop any CSV, Excel spreadsheet, or paste raw JSON. Clean missing values automatically.
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-xs'
                  }`}>
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 dark:text-slate-100">Rich Statistical Suite</h4>
                      <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                        Instant correlation matrix, PCA cluster projections, distributions, and predictive modeling.
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-xs'
                  }`}>
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 dark:text-slate-100">Predictive Simulation</h4>
                      <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                        Perform what-if sensitivity simulations and multi-step forecasts with interactive parameter sliders.
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                    isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-xs'
                  }`}>
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 dark:text-slate-100">Field Collection & Audit</h4>
                      <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                        Deploy mobile survey forms, track enumerator GPS positions, and audit data fraud in the Supervisor Vault.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: IMPORT YOUR FIRST DATASET */}
          {currentStepIndex === 1 && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Method 1: File Upload */}
                <div 
                  onClick={() => {
                    handleDismiss();
                    onNavigateTab('upload');
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/80 border-indigo-500/30 hover:border-indigo-500' : 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 dark:text-white">1. Upload Files</h4>
                    <p className="text-[11px] text-slate-400">
                      Drag and drop your CSV, Excel (.xlsx/.xls), or JSON dataset file directly.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-400 mt-3 flex items-center gap-1">
                    Upload File <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Method 2: Paste Raw Data */}
                <div 
                  onClick={() => {
                    handleDismiss();
                    onNavigateTab('upload');
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/80 border-cyan-500/30 hover:border-cyan-500' : 'bg-cyan-50/50 border-cyan-200 hover:border-cyan-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 dark:text-white">2. Paste Raw Data</h4>
                    <p className="text-[11px] text-slate-400">
                      Copy rows directly from Google Sheets or Excel and paste into the editor.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 mt-3 flex items-center gap-1">
                    Paste Data <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Method 3: Pre-loaded Datasets */}
                <div 
                  onClick={() => {
                    handleDismiss();
                    onOpenDatasetModal();
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/80 border-emerald-500/30 hover:border-emerald-500' : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Database className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 dark:text-white">3. Sample Datasets</h4>
                    <p className="text-[11px] text-slate-400">
                      Pick from pre-loaded industry benchmarks (Crop Yield, Health Survey, Telecom Churn).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-3 flex items-center gap-1">
                    Browse Library <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Active Dataset Indicator */}
              {activeDataset && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-slate-400">Currently Active Dataset:</span>
                    <span className="font-bold text-cyan-400 truncate">{activeDataset.name}</span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-400 shrink-0">
                    {activeDataset.data.length} rows • {activeDataset.columns.length} cols
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: WORKSPACES NAVIGATION */}
          {currentStepIndex === 2 && (
            <div className="space-y-2 pt-1 max-h-[360px] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WORKSPACE_FEATURES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => {
                        handleDismiss();
                        onNavigateTab(item.tab);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all hover:scale-[1.01] flex items-start gap-2.5 ${
                        isDark 
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${item.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {item.title}
                          </h4>
                          <ArrowRight className="w-3 h-3 text-slate-500 opacity-60" />
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: GET STARTED NOW */}
          {currentStepIndex === 3 && (
            <div className="space-y-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onNavigateTab('upload');
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-left shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-200 block">Recommended</span>
                    <h4 className="text-sm font-bold">Import Your Own Dataset</h4>
                    <p className="text-[11px] text-indigo-100 font-normal">
                      Upload your spreadsheet or CSV file now
                    </p>
                  </div>
                  <UploadCloud className="w-6 h-6 text-cyan-200 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDismiss();
                    onNavigateTab('analysis');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] flex items-center justify-between ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 hover:border-cyan-500/50 text-white' 
                      : 'bg-slate-50 border-slate-200 hover:border-indigo-400 text-slate-900'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">Immediate Insights</span>
                    <h4 className="text-sm font-bold">Explore Analytics Engine</h4>
                    <p className="text-[11px] text-slate-400 font-normal">
                      Inspect current data with ML & stats
                    </p>
                  </div>
                  <BarChart3 className="w-6 h-6 text-cyan-400 shrink-0" />
                </button>
              </div>

              {/* Quick tip banner */}
              <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                isDark ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}>
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Pro-Tip:</strong> You can re-open this tour at any time by clicking the <strong>Help (?)</strong> button in the top navigation bar.
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10 ${
          isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50'
        }`}>
          {/* Don't show again checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none order-2 sm:order-1">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <span>Don't show this tour automatically on startup</span>
          </label>

          {/* Stepper Dots & Navigation Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end order-1 sm:order-2">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStepIndex 
                      ? 'w-6 bg-gradient-to-r from-indigo-500 to-cyan-400' 
                      : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                    isDark 
                      ? 'border-slate-800 text-slate-300 hover:bg-slate-800' 
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}

              {currentStepIndex < TOUR_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1 transition-all active:scale-95"
                >
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1 transition-all active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Get Started</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
