import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Layers, 
  Sparkles, 
  BarChart3, 
  Table2, 
  FileText, 
  Plus, 
  Download, 
  CheckCircle2, 
  Activity, 
  ArrowRight, 
  UploadCloud,
  Globe,
  Users,
  Share2,
  History,
  Camera,
  Compass
} from 'lucide-react';
import { Dataset, UserProfile, AppTab } from './types';
import { Navbar } from './components/Navbar';
import { DatasetModal } from './components/DatasetModal';
import { GettingStartedTourModal } from './components/GettingStartedTourModal';
import { AiDataCopilotModal } from './components/analysis/AiDataCopilotModal';
import { CollectionHub } from './components/collection/CollectionHub';
import { AnalysisHub } from './components/analysis/AnalysisHub';
import { GridEditor } from './components/collection/GridEditor';
import { ReportExporter } from './components/analysis/ReportExporter';
import { UploadCleanStudio } from './components/upload/UploadCleanStudio';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { TeamHub } from './components/team/TeamHub';
import { ShareDataModal } from './components/team/ShareDataModal';
import { ScenarioSimulator } from './components/simulation/ScenarioSimulator';
import { SupervisorOperationsCenter } from './components/collection/SupervisorOperationsCenter';
import { AdminConsole } from './components/admin/AdminConsole';
import { AcceptInvitationModal } from './components/team/AcceptInvitationModal';
import { exportToCSV, exportToJSON, exportToExcel } from './utils/dataEngine';
import { getDatasetVersions } from './utils/versionEngine';
import { useTheme } from './context/ThemeContext';
import { DEFAULT_QUALITATIVE_DATASET } from './data/defaultQualitativeData';
import { ExecutiveSlideDeckModal } from './components/analysis/ExecutiveSlideDeckModal';
import { PublicSurveyShareModal } from './components/collection/PublicSurveyShareModal';
import { UnifiedOperationsCommsHub } from './components/comms/UnifiedOperationsCommsHub';
import { DesktopExeModal } from './components/desktop/DesktopExeModal';
import { Presentation, QrCode } from 'lucide-react';

export default function App() {
  const { isDark } = useTheme();
  const [datasets, setDatasets] = useState<Dataset[]>(() => {
    try {
      const saved = localStorage.getItem('datahub_datasets_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_QUALITATIVE_DATASET];
  });
  const [activeDatasetId, setActiveDatasetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('datahub_datasets_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return DEFAULT_QUALITATIVE_DATASET.id;
  });
  const [activeTab, setActiveTab] = useState<AppTab>('upload');
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState<boolean>(false);
  const [datasetModalInitialTab, setDatasetModalInitialTab] = useState<'list' | 'versions' | 'create'>('list');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [datasetToShare, setDatasetToShare] = useState<Dataset | null>(null);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isSlideDeckOpen, setIsSlideDeckOpen] = useState<boolean>(false);
  const [isQrSurveyOpen, setIsQrSurveyOpen] = useState<boolean>(false);
  const [isCommsHubOpen, setIsCommsHubOpen] = useState<boolean>(false);
  const [isDesktopExeOpen, setIsDesktopExeOpen] = useState<boolean>(false);
  
  // Top-level Navigation & View Mode ('landing' | 'app')
  const [viewMode, setViewMode] = useState<'landing' | 'app'>('landing');

  // Coworker Invitation URL Token Handling (?invite_token=...)
  const [urlInviteToken, setUrlInviteToken] = useState<string | null>(null);
  const [isUrlInviteModalOpen, setIsUrlInviteModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('invite_token');
      if (token) {
        setUrlInviteToken(token);
        setIsUrlInviteModalOpen(true);
      }
    } catch (e) {
      console.warn('Failed to parse URL query params', e);
    }
  }, []);

  // Automatically trigger Getting Started tour on first visit to the App Workspace
  useEffect(() => {
    if (viewMode === 'app') {
      try {
        const completed = localStorage.getItem('datahub_tour_completed_v1');
        if (completed !== 'true') {
          const timer = setTimeout(() => {
            setIsTourOpen(true);
          }, 600);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, [viewMode]);

  // Sync datasets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('datahub_datasets_cache', JSON.stringify(datasets));
    } catch (e) {
      console.warn(e);
    }
  }, [datasets]);

  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('datahub_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const activeDataset: Dataset | null = datasets.find(d => d.id === activeDatasetId) || datasets[0] || null;

  // Desktop keyboard shortcuts & native Electron app bridge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input / textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Ctrl+N / Cmd+N -> Create new dataset
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setDatasetModalInitialTab('create');
        setIsDatasetModalOpen(true);
      }
      // Ctrl+E -> Export active dataset as CSV
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        if (activeDataset) {
          e.preventDefault();
          exportToCSV(activeDataset);
        }
      }
      // Ctrl+P -> Executive Slide Deck
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsSlideDeckOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Electron desktop bridge (when executed inside packaged .exe)
    const win = window as any;
    if (win.datahubDesktop) {
      win.datahubDesktop.onMenuAction((action: string) => {
        if (action === 'new-dataset') {
          setDatasetModalInitialTab('create');
          setIsDatasetModalOpen(true);
        } else if (action === 'export-csv' && activeDataset) {
          exportToCSV(activeDataset);
        } else if (action === 'export-pdf') {
          setIsSlideDeckOpen(true);
        }
      });
      win.datahubDesktop.onMenuNavigate((tab: AppTab) => {
        setActiveTab(tab);
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDataset]);

  const handleSelectDataset = (id: string) => {
    setActiveDatasetId(id);
  };

  const handleCreateDataset = (newDataset: Dataset) => {
    setDatasets(prev => [newDataset, ...prev]);
    setActiveDatasetId(newDataset.id);
  };

  const handleUpdateDataset = (updated: Dataset) => {
    setDatasets(prev => prev.map(d => d.id === updated.id ? updated : d));
  };

  const handleDeleteDataset = (id: string) => {
    const remaining = datasets.filter(d => d.id !== id);
    setDatasets(remaining);
    if (activeDatasetId === id) {
      setActiveDatasetId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  const handleAddRowsToDataset = (newRows: Record<string, any>[]) => {
    if (!activeDataset) return;
    const updated: Dataset = {
      ...activeDataset,
      data: [...activeDataset.data, ...newRows],
      updatedAt: new Date().toISOString(),
    };
    handleUpdateDataset(updated);
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenShare = (ds?: Dataset | null) => {
    const target = ds || activeDataset;
    if (target) {
      setDatasetToShare(target);
      setIsShareModalOpen(true);
    }
  };

  const handleLoginSuccess = (userProfile: UserProfile) => {
    setUser(userProfile);
    setViewMode('app');
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('datahub_auth_user');
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-150 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* LANDING PAGE VIEW */}
      {viewMode === 'landing' ? (
        <LandingPage
          onEnterApp={() => setViewMode('app')}
          onOpenAuth={handleOpenAuth}
          user={user}
          onLogout={handleLogout}
        />
      ) : (
        /* APP WORKSPACE VIEW */
        <>
          {/* Global Top Navbar */}
          <Navbar
            datasets={datasets}
            activeDataset={activeDataset}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSelectDataset={handleSelectDataset}
            onOpenDatasetModal={() => setIsDatasetModalOpen(true)}
            onOpenNewDatasetModal={() => setIsDatasetModalOpen(true)}
            onOpenUploadStudio={() => setActiveTab('upload')}
            onOpenShareModal={() => handleOpenShare(activeDataset)}
            onOpenCommsHub={() => setIsCommsHubOpen(true)}
            onOpenDesktopExe={() => setIsDesktopExeOpen(true)}
            user={user}
            onOpenAuth={handleOpenAuth}
            onLogout={handleLogout}
            onNavigateToLanding={() => setViewMode('landing')}
            onOpenTour={() => setIsTourOpen(true)}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />

          {/* Sub-header Context Banner */}
          <header className={`border-b transition-colors px-3 sm:px-6 lg:px-8 py-3 backdrop-blur-md ${
            isDark ? 'border-slate-800/80 bg-slate-900/40 text-slate-100' : 'border-slate-200 bg-white/80 text-slate-900 shadow-xs'
          }`}>
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold shrink-0 ${
                  isDark ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}>
                  <Database className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className={`text-sm font-bold tracking-tight truncate max-w-[220px] sm:max-w-md ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activeDataset?.name || 'No Dataset Selected'}
                    </h1>
                    {activeDataset && (
                      <>
                        <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                          isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {activeDataset.sourceType || 'dataset'}
                        </span>
                        {activeDataset.sourceType !== 'form' && activeDataset.sourceType !== 'synthetic' && activeDataset.sourceType !== 'iot' && (
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border hidden xs:inline-block ${
                            isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            Custom Data
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <p className={`text-xs line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeDataset?.description || 'Upload, import, or collect real data to begin analysis.'}
                  </p>
                </div>
              </div>

              {/* Quick Metrics Badge, Co-worker Share & Direct Ingestion Action */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
                
                <div className="flex items-center gap-1.5">
                  {/* AI Copilot Summon Button */}
                  {activeDataset && (
                    <button
                      onClick={() => setIsCopilotOpen(true)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-md ${
                        isDark
                          ? 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-800/70 hover:to-indigo-800/70 border-purple-500/40 text-purple-200 hover:text-white shadow-purple-950/40'
                          : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                      }`}
                      title="Ask natural language questions to filter rows, build columns, and analyze data"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      <span>AI Copilot</span>
                    </button>
                  )}

                  {/* Snapshot & Versions Button */}
                  {activeDataset && (
                    <button
                      onClick={() => {
                        setDatasetModalInitialTab('versions');
                        setIsDatasetModalOpen(true);
                      }}
                      className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                        isDark
                          ? 'bg-cyan-950/60 hover:bg-cyan-900/80 border-cyan-500/40 text-cyan-300 hover:text-white'
                          : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700'
                      }`}
                      title="Capture snapshots, compare historical versions, and revert dataset changes"
                    >
                      <History className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden sm:inline">Snapshots</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                        {getDatasetVersions(activeDataset).length}
                      </span>
                    </button>
                  )}

                  {/* Share with Co-workers Button */}
                  {activeDataset && (
                    <button
                      onClick={() => handleOpenShare(activeDataset)}
                      className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                        isDark 
                          ? 'bg-gradient-to-r from-indigo-600/20 to-cyan-600/20 hover:from-indigo-600/30 hover:to-cyan-600/30 border-indigo-500/40 text-indigo-300 hover:text-white'
                          : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                      }`}
                      title="Share active dataset with co-workers and set permissions"
                    >
                      <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                      isDark
                        ? 'bg-indigo-600/20 hover:bg-indigo-600/30 border-indigo-500/40 text-indigo-300 hover:text-white'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                    }`}
                    title="Upload your own custom dataset file (CSV, Excel, JSON)"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload</span>
                  </button>

                  {/* Executive Slide Deck Button */}
                  {activeDataset && (
                    <button
                      onClick={() => setIsSlideDeckOpen(true)}
                      className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                        isDark
                          ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300 hover:text-white'
                          : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                      }`}
                      title="Generate executive presentation slide deck from active research data"
                    >
                      <Presentation className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Slide Deck</span>
                    </button>
                  )}

                  {/* Public QR Survey Button */}
                  {activeDataset && (
                    <button
                      onClick={() => setIsQrSurveyOpen(true)}
                      className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                        isDark
                          ? 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-500/40 text-purple-300 hover:text-white'
                          : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                      }`}
                      title="Create public QR codes and live web survey links"
                    >
                      <QrCode className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline">QR Survey</span>
                    </button>
                  )}

                  {/* Quick Tour Guide Button */}
                  <button
                    onClick={() => setIsTourOpen(true)}
                    className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
                      isDark
                        ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-cyan-300 hover:text-cyan-200'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-cyan-700 hover:text-cyan-800 shadow-xs'
                    }`}
                    title="Interactive Getting Started Tour & Navigation Guide"
                  >
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Tour</span>
                  </button>
                </div>

                {activeDataset ? (
                  <div className={`flex items-center gap-2.5 sm:gap-3.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono shrink-0 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <div>
                      <span className={`text-[9px] block leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ROWS</span>
                      <span className={`font-bold text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{activeDataset.data.length.toLocaleString()}</span>
                    </div>
                    <div className={`w-px h-5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <div>
                      <span className={`text-[9px] block leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>COLS</span>
                      <span className={`font-bold text-xs ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{activeDataset.columns.length}</span>
                    </div>
                    <div className={`w-px h-5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <div>
                      <span className={`text-[9px] block leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>STATUS</span>
                      <span className="font-semibold text-[11px] text-emerald-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    <span>No active dataset</span>
                  </div>
                )}

                {activeDataset && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      onClick={() => exportToCSV(activeDataset)}
                      className={`p-2 rounded-xl border transition-colors ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white' 
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                      }`}
                      title="Export as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          </header>

          {/* Main App Body */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:p-8 pb-24 sm:pb-28 md:pb-8">
            
            {/* TAB 1: UPLOAD, CLEAN & ANALYZE CUSTOM DATA */}
            {activeTab === 'upload' && (
              <UploadCleanStudio
                datasets={datasets}
                activeDataset={activeDataset}
                onSelectDataset={handleSelectDataset}
                onCreateDataset={handleCreateDataset}
                onUpdateDataset={handleUpdateDataset}
                onDeleteDataset={handleDeleteDataset}
                onNavigateToAnalysis={() => setActiveTab('analysis')}
                onNavigateToGrid={() => setActiveTab('grid')}
                onShareDataset={handleOpenShare}
              />
            )}

            {/* TAB 2: DATA ANALYSIS SUITE */}
            {activeTab === 'analysis' && (
              <AnalysisHub
                dataset={activeDataset}
                availableDatasets={datasets}
                onUpdateDataset={handleUpdateDataset}
                onCreateDataset={handleCreateDataset}
                onOpenUploadStudio={() => setActiveTab('upload')}
                onOpenDatasetModal={(tab) => {
                  setDatasetModalInitialTab(tab || 'list');
                  setIsDatasetModalOpen(true);
                }}
              />
            )}

            {/* TAB 3: DATA COLLECTION HUB */}
            {activeTab === 'collection' && (
              <CollectionHub
                activeDataset={activeDataset}
                onAppendRowsToActive={handleAddRowsToDataset}
                onCreateDataset={handleCreateDataset}
                onUpdateDataset={handleUpdateDataset}
              />
            )}

            {/* TAB 4: GRID EDITOR */}
            {activeTab === 'grid' && (
              <GridEditor
                dataset={activeDataset}
                onUpdateDataset={handleUpdateDataset}
                onNavigateToAnalysis={() => setActiveTab('analysis')}
                onNavigateToSimulation={() => setActiveTab('simulation')}
                onOpenDatasetModal={(tab) => {
                  setDatasetModalInitialTab(tab || 'list');
                  setIsDatasetModalOpen(true);
                }}
              />
            )}

            {/* TAB 5: WHAT-IF SCENARIO MODELING & PREDICTIVE FORECASTING */}
            {activeTab === 'simulation' && (
              <ScenarioSimulator
                dataset={activeDataset}
                currentUser={user}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenShareModal={handleOpenShare}
              />
            )}

            {/* TAB 6: EXECUTIVE REPORT */}
            {activeTab === 'report' && (
              <ReportExporter
                dataset={activeDataset}
              />
            )}

            {/* TAB 7: CO-WORKER & TEAM COLLABORATION HUB */}
            {activeTab === 'team' && (
              <TeamHub
                activeDataset={activeDataset}
                datasets={datasets}
                currentUser={user}
                onSelectDataset={handleSelectDataset}
                onCreateDataset={handleCreateDataset}
                onOpenShareModal={handleOpenShare}
                onOpenUploadStudio={() => setActiveTab('upload')}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {/* TAB 8: SUPERVISOR & ADMIN OPERATIONS CENTER */}
            {activeTab === 'supervisor' && (
              <SupervisorOperationsCenter
                activeDataset={activeDataset}
                datasets={datasets}
                onAppendRowsToActive={handleAddRowsToDataset}
                onCreateDataset={handleCreateDataset}
                onNavigateToAnalysis={() => setActiveTab('analysis')}
                onNavigateToGrid={() => setActiveTab('grid')}
              />
            )}

            {/* TAB 9: ADMIN OBSERVABILITY COMMAND CENTER */}
            {activeTab === 'admin' && (
              <AdminConsole
                activeDataset={activeDataset}
                datasets={datasets}
                currentUser={user}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onAppendRowsToActive={handleAddRowsToDataset}
                onCreateDataset={handleCreateDataset}
              />
            )}

            {/* TAB 10: UNIFIED OPERATIONS, COMMS & ALL-IN-ONE HUB */}
            {activeTab === 'operations' && (
              <UnifiedOperationsCommsHub
                isOpen={true}
                mode="embedded"
                datasets={datasets}
                activeDataset={activeDataset}
                currentUser={user}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onAppendRowsToActive={handleAddRowsToDataset}
              />
            )}

          </main>

          {/* Modal: Dataset Switcher / Manager / Snapshots */}
          <DatasetModal
            isOpen={isDatasetModalOpen}
            onClose={() => setIsDatasetModalOpen(false)}
            datasets={datasets}
            activeDataset={activeDataset}
            initialTab={datasetModalInitialTab}
            onSelectDataset={handleSelectDataset}
            onCreateDataset={handleCreateDataset}
            onDeleteDataset={handleDeleteDataset}
            onUpdateDataset={handleUpdateDataset}
            onOpenUploadStudio={() => {
              setIsDatasetModalOpen(false);
              setActiveTab('upload');
            }}
          />

          {/* Modal: Share Dataset with Coworkers */}
          <ShareDataModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            dataset={datasetToShare || activeDataset}
            currentUser={user}
          />

          {/* Modal: Getting Started Interactive Tour */}
          <GettingStartedTourModal
            isOpen={isTourOpen}
            onClose={() => setIsTourOpen(false)}
            isDark={isDark}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenDatasetModal={() => {
              setDatasetModalInitialTab('list');
              setIsDatasetModalOpen(true);
            }}
            activeDataset={activeDataset}
          />

          {/* Modal: Executive Presentation Slide Deck */}
          {isSlideDeckOpen && (
            <ExecutiveSlideDeckModal
              isOpen={isSlideDeckOpen}
              onClose={() => setIsSlideDeckOpen(false)}
              dataset={activeDataset}
            />
          )}

          {/* Modal: Public Survey & QR Code Generator */}
          {isQrSurveyOpen && (
            <PublicSurveyShareModal
              isOpen={isQrSurveyOpen}
              onClose={() => setIsQrSurveyOpen(false)}
              dataset={activeDataset || undefined}
              formTitle={activeDataset ? `${activeDataset.name} - Public Survey` : 'Public Survey'}
              onRespondentSubmit={(record) => {
                if (activeDataset) {
                  handleAddRowsToDataset([record]);
                }
              }}
            />
          )}

          {/* Modal: Unified Operations & Comms Hub (Chat, Supervisors, Dispatches & Broadcasts) */}
          <UnifiedOperationsCommsHub
            isOpen={isCommsHubOpen}
            mode="modal"
            onClose={() => setIsCommsHubOpen(false)}
            datasets={datasets}
            activeDataset={activeDataset}
            currentUser={user}
            onNavigateToTab={(tab) => {
              setActiveTab(tab);
            }}
            onAppendRowsToActive={handleAddRowsToDataset}
          />

          {/* Modal: Gemini AI Data Copilot & Natural Language Analyst */}
          <AiDataCopilotModal
            isOpen={isCopilotOpen}
            onClose={() => setIsCopilotOpen(false)}
            dataset={activeDataset}
            onUpdateDataset={handleUpdateDataset}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
            isDark={isDark}
          />

          {/* Modal: Windows Desktop App & .EXE Studio */}
          <DesktopExeModal
            isOpen={isDesktopExeOpen}
            onClose={() => setIsDesktopExeOpen(false)}
          />

          {/* Floating AI Copilot Launcher */}
          <button
            id="floating-ai-copilot-btn"
            onClick={() => setIsCopilotOpen(true)}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-purple-600/35 border border-white/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
            title="Ask Gemini AI Data Copilot"
            aria-label="Open AI Copilot"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            <span className="hidden xs:inline">Ask Copilot</span>
          </button>
        </>
      )}

      {/* Global Auth Modal (Login / Sign Up / Forgot Password / Demo Access) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Global Coworker Accept Invitation Modal (triggered via email link ?invite_token=...) */}
      <AcceptInvitationModal
        isOpen={isUrlInviteModalOpen}
        onClose={() => setIsUrlInviteModalOpen(false)}
        inviteToken={urlInviteToken || ''}
        onAcceptSuccess={(newUser) => {
          setUser(newUser);
          try {
            localStorage.setItem('datahub_auth_user', JSON.stringify(newUser));
          } catch {}
          setViewMode('app');
          setActiveTab('team');
        }}
      />

    </div>
  );
}
