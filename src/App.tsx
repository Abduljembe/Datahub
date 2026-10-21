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
import { UnifiedDashboard } from './components/dashboard/UnifiedDashboard';
import { MobileDashboardOverview } from './components/mobile/MobileDashboardOverview';
import { MobileAllToolsSheet } from './components/mobile/MobileAllToolsSheet';
import { Sidebar } from './components/Sidebar';
import { CommandHeader } from './components/CommandHeader';
import { AnalystWorkbench } from './components/dashboard/AnalystWorkbench';
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
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
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
  const [isMobileAllToolsOpen, setIsMobileAllToolsOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  
  // Top-level Navigation & View Mode ('landing' | 'app') - Defaults directly to the All-in-One Workstation
  const [viewMode, setViewMode] = useState<'landing' | 'app'>(() => {
    try {
      const saved = localStorage.getItem('datahub_view_mode');
      if (saved === 'landing' || saved === 'app') return saved;
    } catch {}
    return 'app';
  });

  useEffect(() => {
    try {
      localStorage.setItem('datahub_view_mode', viewMode);
    } catch {}
  }, [viewMode]);

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
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      id: 'usr_lead_analyst',
      name: 'Abdul Jembe',
      email: 'abduljembe@gmail.com',
      role: 'Lead Data Scientist',
      avatarUrl: '',
      createdAt: new Date().toISOString()
    };
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const activeDataset: Dataset | null = datasets.find(d => d.id === activeDatasetId) || datasets[0] || null;

  // Desktop keyboard shortcuts & native Electron app bridge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Must be authenticated to use workspace keyboard shortcuts
      if (!user) return;

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
    setViewMode('landing');
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
      
      {/* LANDING PAGE / AUTH WALL VIEW - Gated so dashboard is inaccessible unless signed in */}
      {viewMode === 'landing' || !user ? (
        <LandingPage
          onEnterApp={() => {
            if (user) {
              setViewMode('app');
            } else {
              handleOpenAuth('signin');
            }
          }}
          onOpenAuth={handleOpenAuth}
          user={user}
          onLogout={handleLogout}
        />
      ) : (
        <>
          {/* PROFESSIONAL ENTERPRISE APP WORKSPACE */}
          <div className="min-h-screen flex w-full relative">
          {/* Collapsible Left Rail Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setIsMobileSidebarOpen(false);
            }}
            datasets={datasets}
            activeDataset={activeDataset}
            onSelectDataset={handleSelectDataset}
            onOpenNewDataset={() => {
              setDatasetModalInitialTab('create');
              setIsDatasetModalOpen(true);
            }}
            currentUser={user}
            onOpenAuth={handleOpenAuth}
            onLogout={handleLogout}
            onOpenCopilot={() => setIsCopilotOpen(true)}
            onOpenTour={() => setIsTourOpen(true)}
            onOpenSlideDeck={() => setIsSlideDeckOpen(true)}
            onOpenDesktopExe={() => setIsDesktopExeOpen(true)}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />

          {/* Main Content Workspace Column */}
          <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}>
            {/* Professional Command Header with Breadcrumbs, Dataset Telemetry, & Actions */}
            <CommandHeader
              activeTab={activeTab}
              activeDataset={activeDataset}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              onOpenCopilot={() => setIsCopilotOpen(true)}
              onOpenSnapshots={() => {
                setDatasetModalInitialTab('versions');
                setIsDatasetModalOpen(true);
              }}
              onOpenShare={() => handleOpenShare(activeDataset)}
              onOpenSlideDeck={() => setIsSlideDeckOpen(true)}
              onOpenQrSurvey={() => setIsQrSurveyOpen(true)}
              onOpenTour={() => setIsTourOpen(true)}
              onOpenDesktopExe={() => setIsDesktopExeOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              currentUser={user}
            />

            {/* Focused Workspace View (Clean, Dedicated Studio Per Feature) */}
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
              {/* TAB 0: EXECUTIVE OVERVIEW DASHBOARD */}
              {activeTab === 'dashboard' && (
                <UnifiedDashboard
                  dataset={activeDataset}
                  datasets={datasets}
                  onSelectDataset={handleSelectDataset}
                  onCreateDataset={handleCreateDataset}
                  onUpdateDataset={handleUpdateDataset}
                  onDeleteDataset={handleDeleteDataset}
                  onAppendRowsToActive={handleAddRowsToDataset}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenDatasetModal={(tab) => {
                    setDatasetModalInitialTab(tab || 'list');
                    setIsDatasetModalOpen(true);
                  }}
                  onOpenShareModal={() => handleOpenShare(activeDataset)}
                  onOpenCopilot={() => setIsCopilotOpen(true)}
                  onOpenSlideDeck={() => setIsSlideDeckOpen(true)}
                  onOpenQrSurvey={() => setIsQrSurveyOpen(true)}
                  onOpenTour={() => setIsTourOpen(true)}
                  onOpenDesktopExe={() => setIsDesktopExeOpen(true)}
                  onOpenCommsHub={() => setIsCommsHubOpen(true)}
                  currentUser={user}
                />
              )}

              {/* TAB: ANALYST WORKBENCH */}
              {activeTab === 'analyst' && (
                <AnalystWorkbench
                  dataset={activeDataset}
                  onUpdateDataset={handleUpdateDataset}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenCopilot={() => setIsCopilotOpen(true)}
                />
              )}

              {/* TAB 1: UPLOAD & DATA CLEANING STUDIO */}
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
                  onNavigateTab={(tab) => setActiveTab(tab)}
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
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onAppendRowsToActive={handleAddRowsToDataset}
                />
              )}

            </main>
          </div>
        </div>

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

          {/* Modal: Windows Desktop App & Computer Studio */}
          <DesktopExeModal
            isOpen={isDesktopExeOpen}
            onClose={() => setIsDesktopExeOpen(false)}
            onNavigateTab={(tab) => {
              setIsDesktopExeOpen(false);
              setActiveTab(tab);
            }}
            onOpenCopilot={() => {
              setIsDesktopExeOpen(false);
              setIsCopilotOpen(true);
            }}
          />

          {/* Mobile Bottom Sheet: All 24 Tools Launcher */}
          <MobileAllToolsSheet
            isOpen={isMobileAllToolsOpen}
            onClose={() => setIsMobileAllToolsOpen(false)}
            onSelectTab={(tab) => setActiveTab(tab)}
            onOpenDesktopExe={() => setIsDesktopExeOpen(true)}
            onOpenCopilot={() => setIsCopilotOpen(true)}
            onOpenTour={() => setIsTourOpen(true)}
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
