import React, { useState } from 'react';
import { 
  Database, 
  Layers, 
  BarChart3, 
  FileText, 
  Plus, 
  Download, 
  Table, 
  Sparkles, 
  ChevronDown, 
  Activity, 
  HardDrive,
  UploadCloud,
  User,
  LogOut,
  Globe,
  Lock,
  Users,
  Share2,
  ShieldCheck,
  Menu,
  X,
  History,
  Compass,
  HelpCircle,
  Radio,
  Monitor,
  LayoutDashboard,
  ChevronLeft
} from 'lucide-react';
import { Dataset, UserProfile, AppTab } from '../types';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/dataEngine';
import { exportMaskedDataset } from '../utils/piiEngine';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { getActiveSupervisorSession } from '../utils/supervisorAuthEngine';
import { AppLogo } from './AppLogo';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab?: (tab: AppTab) => void;
  onChangeTab?: (tab: AppTab) => void;
  datasets: Dataset[];
  activeDataset: Dataset | null;
  onSelectDataset: (id: string) => void;
  onOpenDatasetModal: () => void;
  onOpenNewDatasetModal?: () => void;
  onOpenUploadStudio?: () => void;
  onOpenShareModal?: () => void;
  onOpenCommsHub?: () => void;
  onOpenDesktopExe?: () => void;
  onOpenAllTools?: () => void;
  user?: UserProfile | null;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onLogout?: () => void;
  onNavigateToLanding?: () => void;
  onOpenTour?: () => void;
  onOpenCopilot?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onChangeTab,
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenDatasetModal,
  onOpenNewDatasetModal,
  onOpenUploadStudio,
  onOpenShareModal,
  onOpenCommsHub,
  onOpenDesktopExe,
  onOpenAllTools,
  user,
  onOpenAuth,
  onLogout,
  onNavigateToLanding,
  onOpenTour,
  onOpenCopilot,
}) => {
  const [exportOpen, setExportOpen] = React.useState(false);
  const [datasetDropdownOpen, setDatasetDropdownOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { isDark } = useTheme();

  const handleTabChange = (tab: AppTab) => {
    const sectionMap: Record<string, string> = {
      'upload': 'section-ingest',
      'grid': 'section-grid',
      'analysis': 'section-analytics',
      'simulation': 'section-forecast',
      'collection': 'section-surveys',
      'report': 'section-reports',
      'team': 'section-reports',
      'operations': 'section-reports',
      'supervisor': 'section-reports',
      'admin': 'section-reports',
    };

    const targetSection = sectionMap[tab];
    if (activeTab === 'dashboard' && targetSection) {
      const el = document.getElementById(targetSection);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-indigo-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 2000);
        setMobileMenuOpen(false);
        setWorkspaceDropdownOpen(false);
        return;
      }
    }

    if (setActiveTab) setActiveTab(tab);
    else if (onChangeTab) onChangeTab(tab);
    setMobileMenuOpen(false);
    setWorkspaceDropdownOpen(false);
  };

  const handleOpenNewDataset = () => {
    if (onOpenNewDatasetModal) onOpenNewDatasetModal();
    else if (onOpenDatasetModal) onOpenDatasetModal();
    setMobileMenuOpen(false);
  };

  const navigationTabs = [
    {
      id: 'dashboard',
      name: 'All-in-One Dashboard',
      shortName: 'Dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-indigo-400',
      activeGradient: 'from-indigo-600 via-indigo-500 to-cyan-500',
      badge: 'All-in-One',
      description: 'Unified command center: live metrics, analysis, grid, forecast & all features in one place',
    },
    {
      id: 'upload',
      name: 'Upload & Clean',
      shortName: 'Upload',
      icon: UploadCloud,
      iconColor: 'text-cyan-400',
      activeGradient: 'from-indigo-600 to-cyan-600',
      badge: 'Ingest',
      description: 'Upload CSV, Excel, JSON and run automated data quality cleaning',
    },
    {
      id: 'analysis',
      name: 'Data Analysis',
      shortName: 'Analysis',
      icon: BarChart3,
      iconColor: 'text-indigo-400',
      activeGradient: 'from-indigo-600 to-cyan-600',
      badge: '9+ Tools',
      description: 'Statistical tests, EDA profiler, anomaly detection, SQL & AI scientist',
    },
    {
      id: 'grid',
      name: 'Grid Editor',
      shortName: 'Grid',
      icon: Table,
      iconColor: 'text-emerald-400',
      activeGradient: 'from-indigo-600 to-emerald-600',
      badge: 'Spreadsheet',
      description: 'Live tabular editor, cell transformations & formula columns',
    },
    {
      id: 'simulation',
      name: 'What-If & Forecast',
      shortName: 'What-If',
      icon: Sparkles,
      iconColor: 'text-amber-400',
      activeGradient: 'from-amber-500 via-orange-500 to-indigo-600',
      badge: 'Forecast',
      description: 'Monte Carlo simulations, predictive regressions & scenario models',
    },
    {
      id: 'collection',
      name: 'Data Collection',
      shortName: 'Collect',
      icon: Layers,
      iconColor: 'text-indigo-400',
      activeGradient: 'from-indigo-600 to-indigo-500',
      badge: 'Forms',
      description: 'Offline survey forms, GPS mobile collector & real-time sync',
    },
    {
      id: 'report',
      name: 'Report',
      shortName: 'Report',
      icon: FileText,
      iconColor: 'text-teal-400',
      activeGradient: 'from-cyan-600 to-teal-500',
      badge: 'PDF',
      description: 'Executive briefing, health grades & boardroom printable PDF dossiers',
    },
    {
      id: 'team',
      name: 'Team & Chat',
      shortName: 'Team',
      icon: Users,
      iconColor: 'text-cyan-400',
      activeGradient: 'from-indigo-600 via-teal-600 to-cyan-600',
      badge: 'Live',
      description: 'Collaborate with team members, share data slices & chat in real time',
    },
    {
      id: 'supervisor',
      name: 'Supervisor Vault',
      shortName: 'Supervisor',
      icon: ShieldCheck,
      iconColor: 'text-purple-400',
      activeGradient: 'from-indigo-600 via-purple-600 to-indigo-700',
      badge: 'Audit',
      description: 'Review field submissions, run fraud detection & track enumerators',
    },
    {
      id: 'admin',
      name: 'Admin Console',
      shortName: 'Admin',
      icon: Activity,
      iconColor: 'text-rose-400',
      activeGradient: 'from-rose-600 via-indigo-600 to-indigo-700',
      badge: 'Live',
      description: 'System telemetry, engine diagnostics, audit logs & RBAC security',
    },
    {
      id: 'operations',
      name: 'Comms & Ops',
      shortName: 'Ops Hub',
      icon: Radio,
      iconColor: 'text-cyan-400',
      activeGradient: 'from-cyan-600 via-indigo-600 to-emerald-600',
      badge: 'All-In-One',
      description: 'Central operations hub: team chat, supervisors directory, field broadcasts & all features catalog',
    },
  ] as const;

  const activeSupervisor = getActiveSupervisorSession();

  return (
    <>
      <header className={`border-b transition-colors sticky top-0 z-40 backdrop-blur-md ${
        isDark ? 'border-slate-800 bg-slate-900/90 text-slate-100' : 'border-slate-200 bg-white/95 text-slate-900 shadow-xs'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            
            {/* Logo & Brand */}
            <div 
              className="cursor-pointer group shrink-0"
              onClick={onNavigateToLanding}
              title="Go to Landing Page"
            >
              <AppLogo size="md" showSubtitle={true} />
            </div>

            {/* Desktop Navigation: Focused All-in-One Dashboard Center & Workspace Switcher */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Primary Anchor: All-in-One Dashboard */}
              <button
                id="main-dashboard-nav-btn"
                onClick={() => handleTabChange('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-indigo-600/30'
                    : isDark
                      ? 'bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white'
                      : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                }`}
                title="All-in-One Dashboard: Command center uniting all features in one place"
              >
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-400'}`} />
                <span>All-in-One Dashboard</span>
                {activeTab === 'dashboard' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white font-bold ml-0.5">
                    All Features
                  </span>
                )}
              </button>

              {/* If on another tab, show return button */}
              {activeTab !== 'dashboard' && (
                <button
                  onClick={() => handleTabChange('dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 hover:text-white transition-all shadow-xs"
                  title="Return to the All-in-One Dashboard"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Return to Dashboard</span>
                </button>
              )}

              {/* Compact Workspace Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    activeTab !== 'dashboard'
                      ? isDark 
                        ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-300'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : isDark
                        ? 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                  }`}
                  title="Select or jump to dedicated workspace"
                >
                  <span className="truncate max-w-[140px]">
                    {activeTab === 'dashboard'
                      ? 'Workspaces'
                      : navigationTabs.find(t => t.id === activeTab)?.name || 'Workspaces'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {workspaceDropdownOpen && (
                  <div
                    className={`absolute left-0 mt-2 w-80 rounded-2xl border shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                      isDark ? 'bg-slate-900 border-slate-800 shadow-black/80' : 'bg-white border-slate-200 shadow-slate-300/50'
                    }`}
                    onMouseLeave={() => setWorkspaceDropdownOpen(false)}
                  >
                    <div className={`px-3 py-1.5 border-b text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between ${
                      isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                    }`}>
                      <span>Platform Workspaces</span>
                      <span className="text-[10px] font-mono text-indigo-400">11 Tools</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto py-1 space-y-0.5 px-1.5">
                      {navigationTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              handleTabChange(tab.id as any);
                              setWorkspaceDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                              isActive
                                ? isDark ? 'bg-indigo-600/20 text-white font-bold border border-indigo-500/30' : 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                                : isDark ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="truncate font-semibold">{tab.name}</span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                                  isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {tab.badge}
                                </span>
                              </div>
                              <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {tab.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Action Items & Dataset Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Quick Share with Co-workers Button (Desktop) */}
              {onOpenShareModal && (
                <button
                  id="quick-share-header-btn"
                  onClick={onOpenShareModal}
                  className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.02] shadow-xs ${
                    isDark 
                      ? 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300 hover:text-white' 
                      : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                  }`}
                  title="Share Active Dataset with Colleagues"
                >
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Share</span>
                </button>
              )}

              {/* Comms & Ops Hub Trigger */}
              {onOpenCommsHub && (
                <button
                  id="navbar-comms-hub-btn"
                  onClick={onOpenCommsHub}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02] shadow-xs ${
                    isDark
                      ? 'bg-gradient-to-r from-cyan-950/70 to-indigo-950/70 hover:from-cyan-900/80 hover:to-indigo-900/80 border-cyan-500/40 text-cyan-200 hover:text-white shadow-cyan-900/20'
                      : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-800 shadow-xs'
                  }`}
                  title="Open Live Team & Field Comms Hub (Chat, County Supervisors & Broadcasts)"
                  aria-label="Open Comms Hub"
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                  <span className="hidden md:inline">Comms & Ops</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
                </button>
              )}

              {/* Desktop App & Windows .EXE Studio Trigger */}
              {onOpenDesktopExe && (
                <button
                  id="navbar-desktop-exe-btn"
                  onClick={onOpenDesktopExe}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02] shadow-xs ${
                    isDark
                      ? 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/40 text-blue-300 hover:text-white shadow-blue-900/20'
                      : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 shadow-xs'
                  }`}
                  title="Open Desktop App & Windows .EXE Studio (Download .bat, .exe, or 1-Click Install)"
                  aria-label="Desktop .EXE App"
                >
                  <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="hidden sm:inline">.EXE App</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Win
                  </span>
                </button>
              )}

              {/* Theme Switcher */}
              <ThemeToggle variant="dropdown" showLabel={false} />

              {/* AI Copilot Quick Trigger */}
              {onOpenCopilot && (
                <button
                  id="ai-copilot-navbar-btn"
                  onClick={onOpenCopilot}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-[1.02] shadow-xs ${
                    isDark
                      ? 'bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 border-purple-500/40 text-purple-200 hover:text-white shadow-purple-900/20'
                      : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 hover:text-purple-800 shadow-xs'
                  }`}
                  title="Open Gemini AI Data Copilot"
                  aria-label="Open AI Copilot"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
                  <span className="hidden md:inline">AI Copilot</span>
                </button>
              )}

              {/* Getting Started Tour Quick Trigger */}
              {onOpenTour && (
                <button
                  id="getting-started-tour-btn"
                  onClick={onOpenTour}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.02] shadow-xs ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-cyan-300 hover:text-cyan-200 hover:border-cyan-500/40'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-cyan-700 hover:text-cyan-800 hover:border-cyan-300 shadow-xs'
                  }`}
                  title="Getting Started Tour & Navigation Guide"
                  aria-label="Getting Started Tour"
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="hidden sm:inline">Tour</span>
                </button>
              )}

              {/* Dataset Picker Dropdown */}
              <div className="relative">
                <button
                  id="dataset-picker-dropdown-btn"
                  onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border transition-all text-xs font-medium max-w-[130px] xs:max-w-[160px] sm:max-w-[200px] ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{activeDataset ? activeDataset.name : 'Select Dataset'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-auto" />
                </button>

                {datasetDropdownOpen && (
                  <div 
                    className={`absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] rounded-2xl border shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                      isDark ? 'bg-slate-900 border-slate-800 shadow-black/80' : 'bg-white border-slate-200 shadow-slate-300/50'
                    }`}
                    onMouseLeave={() => setDatasetDropdownOpen(false)}
                  >
                    <div className={`px-3 py-1.5 border-b text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between ${
                      isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                    }`}>
                      <span>Available Datasets ({datasets.length})</span>
                      <button
                        onClick={() => {
                          setDatasetDropdownOpen(false);
                          handleOpenNewDataset();
                        }}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-normal capitalize"
                      >
                        <Plus className="w-3 h-3" /> New
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto py-1">
                      {datasets.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-400 space-y-2">
                          <p>No datasets stored yet.</p>
                          {onOpenUploadStudio && (
                            <button
                              onClick={() => {
                                setDatasetDropdownOpen(false);
                                onOpenUploadStudio();
                              }}
                              className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold"
                            >
                              Upload File
                            </button>
                          )}
                        </div>
                      ) : (
                        datasets.map(ds => (
                          <button
                            key={ds.id}
                            onClick={() => {
                              onSelectDataset(ds.id);
                              setDatasetDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                              activeDataset?.id === ds.id
                                ? isDark ? 'bg-indigo-600/15 text-indigo-300 font-medium' : 'bg-indigo-50 text-indigo-700 font-medium'
                                : isDark ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate font-medium">{ds.name}</p>
                              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {ds.data.length} rows · {ds.columns.length} cols
                              </p>
                            </div>
                            {activeDataset?.id === ds.id && (
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                            )}
                          </button>
                        ))
                      )}
                    </div>

                    <div className={`px-2 pt-2 border-t flex flex-col gap-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      {onOpenUploadStudio && (
                        <button
                          onClick={() => {
                            setDatasetDropdownOpen(false);
                            onOpenUploadStudio();
                          }}
                          className="w-full text-center py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Upload & Clean File</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setDatasetDropdownOpen(false);
                          onOpenDatasetModal();
                        }}
                        className={`w-full text-center py-2 rounded-xl text-xs font-medium transition-colors ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700/80 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        Manage Datasets & Snapshots
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Export Button */}
              {activeDataset && (
                <div className="relative">
                  <button
                    id="export-dropdown-toggle-btn"
                    onClick={() => setExportOpen(!exportOpen)}
                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      isDark
                        ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                    }`}
                    title="Export Dataset"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden md:inline">Export</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {exportOpen && (
                    <div 
                      className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                        isDark ? 'bg-slate-900 border-slate-800 shadow-black/80 text-slate-300' : 'bg-white border-slate-200 shadow-slate-300/50 text-slate-700'
                      }`}
                      onMouseLeave={() => setExportOpen(false)}
                    >
                      <button
                        onClick={() => {
                          exportToCSV(activeDataset);
                          setExportOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${
                          isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>Export as CSV (.csv)</span>
                      </button>
                      <button
                        onClick={() => {
                          exportToExcel(activeDataset);
                          setExportOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${
                          isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>Export as Excel (.xlsx)</span>
                      </button>
                      <button
                        onClick={() => {
                          exportToJSON(activeDataset);
                          setExportOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${
                          isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span>Export as JSON (.json)</span>
                      </button>

                      <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />

                      <button
                        onClick={() => {
                          exportMaskedDataset(activeDataset, {
                            format: 'csv',
                            strategy: 'sha256_hash',
                            includeCertificate: true,
                          });
                          setExportOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 font-medium ${
                          isDark ? 'hover:bg-slate-800 text-teal-400' : 'hover:bg-slate-100 text-teal-600'
                        }`}
                        title="Scans dataset, redacts/hashes all PII and exports sanitized CSV with certificate"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <div>
                          <div>Privacy-Masked (CSV)</div>
                          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Hash PII + Audit Cert</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          exportMaskedDataset(activeDataset, {
                            format: 'excel',
                            strategy: 'sha256_hash',
                            includeCertificate: true,
                          });
                          setExportOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 font-medium ${
                          isDark ? 'hover:bg-slate-800 text-emerald-400' : 'hover:bg-slate-100 text-emerald-600'
                        }`}
                        title="Scans dataset, redacts/hashes all PII and exports sanitized Excel with certificate"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <div>Privacy-Masked (Excel)</div>
                          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Hash PII + Audit Cert</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* User Account / Auth Section */}
              {user ? (
                <div className="relative">
                  <button
                    id="user-profile-menu-btn"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-all text-xs font-semibold ${
                      isDark
                        ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white text-[11px] font-black uppercase shadow-xs shrink-0">
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                    <span className="hidden sm:inline truncate max-w-[90px]">{user.name.split(' ')[0]}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div
                      className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                        isDark ? 'bg-slate-900 border-slate-800 shadow-black/80' : 'bg-white border-slate-200 shadow-slate-300/50'
                      }`}
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      <div className={`px-4 py-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                          {(user.isOwner || user.email === 'abduljembe@gmail.com') && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              👑 Owner
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                            isDark ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {user.role}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                            isDark ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            {user.organization || 'Enterprise'}
                          </span>
                        </div>
                      </div>

                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleTabChange('admin');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2 transition-colors ${
                            isDark ? 'text-rose-300 hover:bg-slate-800 hover:text-white' : 'text-rose-700 hover:bg-slate-100 hover:text-rose-900'
                          }`}
                        >
                          <Activity className="w-3.5 h-3.5 text-rose-400" />
                          <span>Admin & Observability</span>
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleTabChange('supervisor');
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2 transition-colors ${
                            isDark ? 'text-indigo-300 hover:bg-slate-800 hover:text-white' : 'text-indigo-700 hover:bg-slate-100 hover:text-indigo-900'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Supervisor Operations Vault</span>
                        </button>

                        {onOpenTour && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onOpenTour();
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2 transition-colors ${
                              isDark ? 'text-cyan-300 hover:bg-slate-800 hover:text-white' : 'text-cyan-700 hover:bg-slate-100 hover:text-cyan-900'
                            }`}
                          >
                            <Compass className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Getting Started Tour</span>
                          </button>
                        )}

                        {onNavigateToLanding && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onNavigateToLanding();
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2 transition-colors ${
                              isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <Globe className="w-3.5 h-3.5 text-indigo-400" />
                            <span>View Landing Page</span>
                          </button>
                        )}

                        {onOpenAuth && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onOpenAuth('signin');
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2 transition-colors ${
                              isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <User className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Switch Account</span>
                          </button>
                        )}

                        {onLogout && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onLogout();
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl flex items-center gap-2 transition-colors"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                onOpenAuth && (
                  <button
                    id="nav-signin-btn"
                    onClick={() => onOpenAuth('signin')}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5 text-cyan-200" />
                    <span>Sign In</span>
                  </button>
                )
              )}

              {/* Mobile Drawer Trigger Button */}
              <button
                id="mobile-nav-drawer-toggle-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden p-2 rounded-xl border transition-colors ${
                  isDark
                    ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                }`}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5 text-indigo-400" />}
              </button>

            </div>

          </div>
        </div>

        {/* Mobile Sub-Header: Clean Return to Dashboard Banner if on another view */}
        {activeTab !== 'dashboard' && (
          <div className={`lg:hidden border-t px-3 py-1.5 flex items-center justify-between text-xs ${
            isDark ? 'border-slate-800/80 bg-slate-950/80 text-slate-300' : 'border-slate-100 bg-slate-50 text-slate-700'
          }`}>
            <span className="font-semibold truncate">
              {navigationTabs.find(t => t.id === activeTab)?.name || 'Workspace Tool'}
            </span>
            <button
              onClick={() => handleTabChange('dashboard')}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold flex items-center gap-1 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        )}
      </header>

      {/* Slide-In Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className={`fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm border-l p-5 overflow-y-auto shadow-2xl flex flex-col justify-between z-10 transition-transform ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="space-y-6">
              
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
                <AppLogo size="sm" showBadge={false} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Active Dataset Quick Widget */}
              <div className={`p-3.5 rounded-2xl border ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Active Dataset</span>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenDatasetModal();
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Switch
                  </button>
                </div>
                <p className="text-xs font-bold text-white truncate">{activeDataset?.name || 'No Dataset Selected'}</p>
                {activeDataset && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {activeDataset.data.length.toLocaleString()} rows · {activeDataset.columns.length} columns
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  {onOpenUploadStudio && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenUploadStudio();
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1 border border-indigo-500/30"
                    >
                      <UploadCloud className="w-3 h-3 text-cyan-400" />
                      <span>Upload Data</span>
                    </button>
                  )}
                  {onOpenShareModal && activeDataset && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenShareModal();
                      }}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700"
                    >
                      <Share2 className="w-3 h-3 text-cyan-400" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>

              {/* All Workspace Tools */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-mono text-slate-400 font-semibold px-2 mb-2">Workspaces</p>
                {navigationTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as any)}
                      className={`w-full text-left p-2.5 rounded-2xl flex items-start gap-3 transition-all min-h-[50px] ${
                        isActive
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                          : isDark ? 'hover:bg-slate-800/60 text-slate-300' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive 
                          ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-md` 
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : ''}`}>{tab.name}</p>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                            isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {tab.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{tab.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-800/60 space-y-2 mt-6">
              {onOpenCommsHub && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCommsHub();
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border ${
                    isDark 
                      ? 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-200 border-cyan-500/40 shadow-xs' 
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>Comms & Operations Hub</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </button>
              )}

              {onOpenCopilot && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCopilot();
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border ${
                    isDark 
                      ? 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border-purple-500/40 shadow-xs' 
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span>Gemini AI Data Copilot</span>
                </button>
              )}

              {onOpenTour && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenTour();
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border ${
                    isDark 
                      ? 'bg-indigo-950/60 hover:bg-indigo-900/60 text-cyan-300 border-indigo-500/30' 
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Getting Started Tour</span>
                </button>
              )}

              {onOpenDesktopExe && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenDesktopExe();
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border shadow-xs ${
                    isDark 
                      ? 'bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border-blue-500/30' 
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                  <span>Windows .EXE / Desktop App</span>
                </button>
              )}

              {onOpenAllTools && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAllTools();
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>All 24 Tools Launcher</span>
                </button>
              )}

              {onNavigateToLanding && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToLanding();
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Landing Page</span>
                </button>
              )}

              {user ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="truncate max-w-[120px]">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{user.role}</p>
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                onOpenAuth && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth('signin');
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sign In to Account</span>
                  </button>
                )
              )}
            </div>

          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar (Phone-Optimized 4-Anchor Dock) */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl px-2 py-1.5 flex items-center justify-around pb-safe transition-colors ${
        isDark ? 'bg-slate-950/95 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-700 shadow-lg'
      }`}>
        {/* 1. Mobile Dashboard */}
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] ${
            activeTab === 'dashboard'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Phone Dashboard"
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-cyan-400 scale-110' : 'text-slate-400'}`} />
          <span className="text-[10px] leading-none">Dashboard</span>
        </button>

        {/* 2. Field Surveys & GPS Collection */}
        <button
          onClick={() => handleTabChange('collection')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] ${
            activeTab === 'collection'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Field Surveys & Mobile Collection"
        >
          <Layers className={`w-5 h-5 ${activeTab === 'collection' ? 'text-indigo-400 scale-110' : 'text-slate-400'}`} />
          <span className="text-[10px] leading-none">Collect</span>
        </button>

        {/* 3. Operations & Team Comms */}
        <button
          onClick={() => handleTabChange('operations')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] relative ${
            activeTab === 'operations'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Live Team & County Operations Comms"
        >
          <span className="relative">
            <Radio className={`w-5 h-5 ${activeTab === 'operations' ? 'text-cyan-400 scale-110' : 'text-slate-400'}`} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="text-[10px] leading-none">Comms</span>
        </button>

        {/* 4. All Tools Sheet Launcher */}
        <button
          onClick={() => {
            if (onOpenAllTools) onOpenAllTools();
            else handleTabChange('analysis');
          }}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] text-purple-400 hover:text-purple-300"
          title="Open All 24 Tools"
        >
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          <span className="text-[10px] leading-none font-bold">Tools</span>
        </button>

        {/* 5. Mobile Drawer Menu */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] text-slate-400 hover:text-slate-200"
          title="More Options"
        >
          <Menu className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] leading-none">Menu</span>
        </button>
      </div>
    </>
  );
};
