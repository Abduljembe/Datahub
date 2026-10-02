import React, { useState } from 'react';
import { 
  Database, 
  Sparkles, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  UploadCloud, 
  Table2, 
  FileText, 
  Terminal, 
  PieChart as PieIcon, 
  ChevronRight, 
  TrendingUp, 
  Lock, 
  Globe2, 
  Layers, 
  HelpCircle, 
  Star,
  Users,
  Code2,
  Sliders,
  Check,
  Play
} from 'lucide-react';
import { UserProfile } from '../../types';
import { AppLogo } from '../AppLogo';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  user: UserProfile | null;
  onLogout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onOpenAuth,
  user,
  onLogout,
}) => {
  const [activeFeatureTab, setActiveFeatureTab] = useState<'profiler' | 'cleaner' | 'anomaly' | 'stats' | 'dashboard' | 'simulation'>('dashboard');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const featureTabs = [
    { id: 'dashboard', label: 'Interactive Dashboard', icon: BarChart3 },
    { id: 'simulation', label: 'What-If & Forecasting', icon: Sparkles },
    { id: 'cleaner', label: 'Upload & Auto-Clean', icon: UploadCloud },
    { id: 'anomaly', label: 'Anomaly Radar', icon: ShieldCheck },
    { id: 'stats', label: 'Statistical Suite', icon: Activity },
    { id: 'profiler', label: 'SQL & AI Scientist', icon: Terminal },
  ];

  const faqs = [
    {
      q: 'Does DataHub upload my confidential data to external servers?',
      a: 'No. DataHub operates an ultra-fast, in-browser WebAssembly and JavaScript analytical engine. Your datasets are parsed, cleaned, and modeled locally on your machine with zero unauthorized cloud egress.',
    },
    {
      q: 'What file formats can I ingest and clean?',
      a: 'DataHub natively parses CSV, TSV, Microsoft Excel (.xlsx, .xls), JSON arrays, raw clipboard pastes, and real-time IoT feeds with automated type inference.',
    },
    {
      q: 'Can I export presentation-ready reports for stakeholders?',
      a: 'Yes. Generate interactive visual dashboards with dark/light themes, print-ready PDF Executive Dossiers, CSV/Excel spreadsheets, and direct email distribution briefs with a single click.',
    },
    {
      q: 'How does the anomaly detection algorithm work?',
      a: 'We provide dual statistical algorithms: Gaussian Standard Z-scores (parametric) and Median Absolute Deviation (MAD / Robust Z-score) to catch extreme multivariate outliers without distribution bias.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      
      {/* 1. TOP GLOBAL NAVIGATION */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="cursor-pointer" onClick={onEnterApp}>
            <AppLogo size="md" showBadge={true} badgeText="Enterprise" />
          </div>

          {/* Nav Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo-preview" className="hover:text-white transition-colors">Interactive Demo</a>
            <a href="#pipeline" className="hover:text-white transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-white transition-colors">Plans</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* CTA & Auth Action Buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{user.role}</p>
                </div>
                <button
                  onClick={onEnterApp}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-indigo-300 hover:text-white transition-all shadow-sm"
                >
                  Create Account
                </button>
                <button
                  onClick={onEnterApp}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                >
                  <span>Launch Live App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Glow ambient background elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Hero Tagline Chip */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono">Next-Gen Data Science & Ingestion Suite</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-300 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Zero-Lag In-Memory Engine
          </span>
        </div>

        {/* Main Display Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.1] mb-6">
          Turn Raw Data into <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
            Executive Intelligence
          </span> in Seconds.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10">
          Upload, clean, inspect, and model complex datasets in one unified studio. Eliminate nulls, isolate statistical anomalies, run regressions, and generate boardroom-ready interactive dossiers with zero backend setup.
        </p>

        {/* CTA Button Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-14">
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <span>Launch Live Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onOpenAuth('signin')}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Lock className="w-4 h-4 text-cyan-400" />
            <span>Sign In / Demo Access</span>
          </button>
        </div>

        {/* Trust Badges & Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-slate-800/60">
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">100%</p>
            <p className="text-xs text-slate-400 mt-1">Client-Side Privacy (Zero Egress)</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-400">&lt; 5ms</p>
            <p className="text-xs text-slate-400 mt-1">Real-time In-Memory Computations</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black font-mono text-teal-400">9+ Modules</p>
            <p className="text-xs text-slate-400 mt-1">EDA, Regression, ANOVA, Anomaly</p>
          </div>
          <div className="p-3">
            <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400">1-Click</p>
            <p className="text-xs text-slate-400 mt-1">Executive Dossiers & Email Export</p>
          </div>
        </div>

      </section>

      {/* 3. INTERACTIVE FEATURE DEMO PREVIEW */}
      <section id="demo-preview" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-indigo-400 mb-2">
            Hands-on Intelligence
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Explore the Unified Analytics Engine
          </h3>
          <p className="text-sm text-slate-400 mt-2">
            Switch between modules to preview the power of DataHub's analytical architecture.
          </p>
        </div>

        {/* Feature Nav Pill Selector */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
          {featureTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeFeatureTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFeatureTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Mock Canvas Box */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-sm">
          
          {/* Mock Window Controls Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-slate-500 ml-2">datahub://workspace/live_preview</span>
            </div>
            
            <button
              onClick={onEnterApp}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition-all"
            >
              <span>Try Live with Real Data</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Dynamic Interactive Preview Content */}
          <div className="pt-6">
            
            {activeFeatureTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Sample Size</span>
                    <p className="text-2xl font-black font-mono text-cyan-400 mt-1">1,240 rows</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Enterprise Sales</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Primary Mean (μ)</span>
                    <p className="text-2xl font-black font-mono text-indigo-400 mt-1">$48,250</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">ARR per Deal</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Integrity Score</span>
                    <p className="text-2xl font-black font-mono text-emerald-400 mt-1">99.4% (A+)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">0 Missing Cells</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Top Segment</span>
                    <p className="text-2xl font-black font-mono text-amber-400 mt-1">Enterprise</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">58.2% Total Volume</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 max-w-md">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                      <Sparkles className="w-3 h-3" /> Live Visual Presentation
                    </div>
                    <h4 className="text-lg font-bold text-white">Interactive Slicers & Instant Chart Rerendering</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Filter by cohort, toggle dark/light theme, tweak color palettes, or switch to presentation mode with zero lag.
                    </p>
                  </div>
                  <div className="w-full md:w-1/2 h-36 bg-gradient-to-tr from-indigo-950/60 to-cyan-950/40 rounded-xl border border-slate-800/80 p-4 flex items-end justify-between gap-2">
                    {[40, 65, 55, 80, 70, 95, 88, 60, 75, 100].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-cyan-400 hover:brightness-125 transition-all cursor-pointer"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[9px] font-mono text-slate-500">Q{i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'simulation' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-white">What-If Parameter Sandbox & Predictive Forecast Engine</h4>
                    <p className="text-xs text-slate-400">Perturb driver variables with real-time elasticity response and 95% confidence bands.</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
                    Forecast: +24.8% Upside
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-amber-400 block mb-1">Dynamic Sliders</span>
                    <p className="text-slate-400 text-[11px]">Real-time perturbation from -60% to +100% with elasticity weighting.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-emerald-400 block mb-1">5 Forecasting Models</span>
                    <p className="text-slate-400 text-[11px]">Linear Trend, Polynomial Curves, Exponential Growth, Moving Average, & Monte Carlo.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-cyan-400 block mb-1">Confidence Bands</span>
                    <p className="text-slate-400 text-[11px]">80%, 90%, 95%, 99% prediction intervals with historical volatility fans.</p>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'cleaner' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-white">Automated Imputation & Transformation Pipeline</h4>
                    <p className="text-xs text-slate-400">Handles CSV, Excel, JSON or clipboard inputs with smart type detection.</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                    Clean Status: Optimal
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-indigo-400 block mb-1">Deduplication</span>
                    <p className="text-slate-400 text-[11px]">Auto-detects matching keys and merges duplicate observations.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-cyan-400 block mb-1">Missing Value Imputation</span>
                    <p className="text-slate-400 text-[11px]">Mean, Median, Mode, Forward-fill, or custom scalar injection.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-teal-400 block mb-1">Casing & Normalization</span>
                    <p className="text-slate-400 text-[11px]">Trim whitespace, capitalize titles, and normalize numeric ranges.</p>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'anomaly' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-white">Z-Score & Median Absolute Deviation (MAD) Radar</h4>
                    <p className="text-xs text-slate-400">Pinpoint statistical anomalies with configurable sigma thresholds.</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold">
                    Outliers Detected: 3 rows
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <div>
                      <span className="font-mono font-bold text-white">Row #42: Outlier ARR ($420,000)</span>
                      <p className="text-[11px] text-slate-400">Z-Score: +3.82 σ (Extreme positive variance)</p>
                    </div>
                  </div>
                  <button onClick={onEnterApp} className="px-3 py-1 rounded-lg bg-slate-800 text-indigo-300 font-semibold hover:text-white">
                    Apply Winsorization
                  </button>
                </div>
              </div>
            )}

            {activeFeatureTab === 'stats' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-white">Scientific Inference & Hypothesis Testing</h4>
                    <p className="text-xs text-slate-400">Ordinary Least Squares Regression, Two-Sample T-Tests, ANOVA, & Pearson Correlation.</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
                    R² = 0.887 (Strong Model)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-mono">P-VALUE</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">p &lt; 0.001</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-mono">F-STATISTIC</span>
                    <span className="font-mono font-bold text-indigo-400 text-sm">142.6</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-mono">SLOPE (β)</span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">+2.451</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block font-mono">CONFIDENCE</span>
                    <span className="font-mono font-bold text-teal-400 text-sm">99% CI</span>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 'profiler' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-white">Full In-Memory SQL Runner & AI Data Scientist</h4>
                    <p className="text-xs text-slate-400">Run complex SELECT queries or chat directly with the Gemini Data Scientist.</p>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                    Execution: 2.1ms
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                  <span className="text-indigo-400">SELECT</span> region, <span className="text-cyan-400">AVG</span>(revenue) <span className="text-indigo-400">AS</span> avg_rev, <span className="text-cyan-400">COUNT</span>(*) <span className="text-indigo-400">FROM</span> dataset <span className="text-indigo-400">GROUP BY</span> region <span className="text-indigo-400">ORDER BY</span> avg_rev <span className="text-indigo-400">DESC</span>;
                </div>
              </div>
            )}

          </div>

        </div>

      </section>

      {/* 4. CORE CAPABILITIES BENTO GRID */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-indigo-400 mb-2">
            Built for Modern Data Teams
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Everything You Need from Ingestion to Boardroom
          </h3>
          <p className="text-sm text-slate-400 mt-2">
            Engineered to replace fragmented toolchains with one intuitive, high-craft workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6 text-cyan-400" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Smart Ingestion & Auto-Clean</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload CSV, Excel, or JSON files. Automatic header recognition, missing value imputation, deduplication, and string normalization in seconds.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Statistical Modeling Suite</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Linear regression with R² and p-value validation, Pearson correlation matrices, Two-Sample T-tests, One-Way ANOVA, and K-Means segmentation.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-rose-400" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Anomaly & Outlier Radar</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Identify multivariate extremes via Standard Z-Scores and Median Absolute Deviation (MAD). Apply winsorization or filter outliers with 1 click.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6 text-teal-400" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Interactive Visual Dashboard</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Live dimension slicers, customizable Recharts color palettes, dark/light theme switching, and fullscreen presentation mode for board meetings.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
              <Terminal className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">In-Memory SQL Runner</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Execute fast SQL queries directly on your loaded datasets. Filter, aggregate, sort, and spawn new derivative datasets instantly.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Executive Dossier & Multi-Export</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Print-ready executive summary reports, methodology documentation, email distribution modal, and instant export to CSV, Excel, and JSON.
            </p>
          </div>

          {/* Card 7: Co-worker Collaboration & Team Data Sharing */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-cyan-950/30 border border-indigo-500/40 hover:border-indigo-500/70 transition-all group md:col-span-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-xs uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Live Team Collaboration
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">Co-worker Live Presence & Frictionless Data Sharing</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  See colleagues active in real-time, view their current analytical tasks, and exchange point-in-time dataset snapshots, custom data slices, and collaborator comments with granular role-based permissions (View, Edit, Admin).
                </p>
              </div>
              <button
                onClick={onEnterApp}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 shrink-0 transition-all hover:scale-105"
              >
                <span>Try Team Sharing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </section>

      {/* 5. 3-STEP PIPELINE WORKFLOW */}
      <section id="pipeline" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-cyan-400 mb-2">
            Frictionless Flow
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            How DataHub Operates in 3 Simple Steps
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <span className="w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
              01
            </span>
            <h4 className="text-base font-bold text-white mb-2">Ingest & Inspect</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop any CSV, Excel file, or paste raw text. DataHub infers data types, calculates initial health scores, and flags missing values.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <span className="w-8 h-8 rounded-full bg-cyan-600 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
              02
            </span>
            <h4 className="text-base font-bold text-white mb-2">Clean, Model & Detect</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apply automated imputations, compute correlation matrices, isolate outliers with Z-scores, and run predictive regressions.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <span className="w-8 h-8 rounded-full bg-teal-600 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
              03
            </span>
            <h4 className="text-base font-bold text-white mb-2">Present & Distribute</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toggle the interactive visual dashboard, switch to presentation mode, or export executive PDF dossiers and Excel workbooks.
            </p>
          </div>

        </div>
      </section>

      {/* 6. TRANSPARENT PRICING & TIERS */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-indigo-400 mb-2">
            Transparent Access
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Plans for Individual Analysts & Global Teams
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* Free Tier */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold font-mono text-slate-400 uppercase">Community Explorer</span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-xs text-slate-400">/ forever free</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Perfect for ad-hoc data cleaning and quick statistical audits.</p>
              
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Upload CSV, Excel & JSON
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Basic Imputation & Deduplication
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Standard EDA & Distribution Profiling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Export to CSV & JSON
                </li>
              </ul>
            </div>

            <button
              onClick={onEnterApp}
              className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
            >
              Start Free Explorer
            </button>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500 shadow-xl shadow-indigo-500/10 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider font-mono shadow-md">
              Most Popular
            </div>

            <div>
              <span className="text-xs font-bold font-mono text-indigo-400 uppercase">Pro Data Scientist</span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$29</span>
                <span className="text-xs text-slate-400">/ user / month</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Comprehensive suite for analytics engineers and scientific researchers.</p>
              
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" /> Everything in Explorer
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" /> Full Statistical Inference (Regression, ANOVA, T-Tests)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" /> Z-Score & MAD Anomaly Radar with Winsorization
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" /> Interactive Visual Dashboard & Presentation Mode
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400" /> Print-ready Executive Dossiers & Email Export
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('signup')}
              className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
            >
              Get Started with Pro
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold font-mono text-teal-400 uppercase">Enterprise Organization</span>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">Custom</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">For large data organizations requiring custom SSO, audits, and dedicated SLAs.</p>
              
              <ul className="mt-6 space-y-3 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400" /> Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400" /> Dedicated Enterprise SSO (Okta, Azure AD, Google)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400" /> SOC-2 Type II Certification & Audit Logs
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-400" /> Dedicated Solutions Architect
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenAuth('signin')}
              className="mt-8 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
            >
              Contact Enterprise Sales
            </button>
          </div>

        </div>
      </section>

      {/* 7. FAQ ACCORDION */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-indigo-400 mb-2">
            Common Inquiries
          </h2>
          <h3 className="text-3xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div 
                key={index}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white hover:text-indigo-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90 text-indigo-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. FINAL HIGH-IMPACT CALL TO ACTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900/80 via-slate-900 to-cyan-950/80 border border-indigo-500/30 p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
              Ready to Upgrade Your Analytics Workflow?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
              Experience the power of real-time in-browser data cleaning, statistical modeling, and automated executive dashboards today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onEnterApp}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <span>Launch Free Live Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-sm transition-all"
              >
                Create Account
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="cursor-pointer" onClick={onEnterApp}>
            <AppLogo size="sm" showBadge={false} />
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} DataHub Inc. High-Performance Client-Side Analytical Architecture. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <button onClick={onEnterApp} className="hover:text-white transition-colors">Workspace</button>
            <button onClick={() => onOpenAuth('signin')} className="hover:text-white transition-colors">Sign In</button>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('DataHub is a zero-egress client-side analytics platform. No data is stored externally.'); }} className="hover:text-white transition-colors">Security & Privacy</a>
          </div>
        </div>
      </footer>

    </div>
  );
};
