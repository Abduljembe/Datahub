import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  Users,
  Radio,
  Send,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Building,
  Activity,
  Layers,
  FileSpreadsheet,
  Download,
  Share2,
  Table,
  BarChart3,
  UploadCloud,
  Presentation,
  QrCode,
  Globe,
  Copy,
  Database,
  Sliders,
  Play,
  Award,
  Terminal,
  Compass,
  Cpu,
  RefreshCw,
  HardDrive,
  Monitor
} from 'lucide-react';
import { Dataset, UserProfile, AppTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { TeamMessenger } from '../team/TeamMessenger';
import { DesktopExeModal } from '../desktop/DesktopExeModal';
import { 
  getCountySupervisors, 
  getCountyDispatches, 
  CountySupervisor, 
  CountyDispatchBatch,
  ALL_KENYA_COUNTIES
} from '../../utils/countySupervisorEngine';
import { logTelemetryEvent } from '../../utils/telemetryEngine';

export interface UnifiedOperationsCommsHubProps {
  isOpen: boolean;
  onClose?: () => void;
  mode?: 'modal' | 'embedded';
  datasets: Dataset[];
  activeDataset: Dataset | null;
  currentUser?: UserProfile | null;
  onNavigateToTab?: (tab: AppTab) => void;
  onAppendRowsToActive?: (rows: Record<string, any>[], sourceName?: string) => void;
  defaultSubTab?: 'all_features' | 'chat' | 'supervisors' | 'dispatches' | 'broadcast' | 'custom_domain';
  initialThreadId?: string;
}

export const UnifiedOperationsCommsHub: React.FC<UnifiedOperationsCommsHubProps> = ({
  isOpen,
  onClose,
  mode = 'modal',
  datasets,
  activeDataset,
  currentUser,
  onNavigateToTab,
  onAppendRowsToActive,
  defaultSubTab = 'all_features',
  initialThreadId
}) => {
  const { isDark } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<'all_features' | 'chat' | 'supervisors' | 'dispatches' | 'broadcast' | 'custom_domain'>(defaultSubTab);
  
  // Supervisors & Dispatches data
  const [supervisors, setSupervisors] = useState<CountySupervisor[]>([]);
  const [dispatches, setDispatches] = useState<CountyDispatchBatch[]>([]);
  const [supervisorSearch, setSupervisorSearch] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Broadcast state
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'supervisors_only' | 'enumerators_only' | 'county'>('all');
  const [broadcastCounty, setBroadcastCounty] = useState<string>('Nairobi');
  const [broadcastUrgency, setBroadcastUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [broadcastSubject, setBroadcastSubject] = useState<string>('');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastSentSuccess, setBroadcastSentSuccess] = useState<boolean>(false);
  const [selectedThreadForChat, setSelectedThreadForChat] = useState<string | undefined>(initialThreadId);

  // Ingest batch status
  const [ingestedBatchIds, setIngestedBatchIds] = useState<Record<string, boolean>>({});
  const [inspectBatch, setInspectBatch] = useState<CountyDispatchBatch | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState<boolean>(false);

  // Load data on mount / open
  useEffect(() => {
    if (isOpen || mode === 'embedded') {
      setSupervisors(getCountySupervisors());
      setDispatches(getCountyDispatches());
      setBroadcastSentSuccess(false);
    }
  }, [isOpen, mode]);

  if (!isOpen && mode === 'modal') return null;

  // Filtered supervisors
  const filteredSupervisors = supervisors.filter(sup => {
    const matchesSearch = 
      sup.name.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
      sup.county.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
      sup.badgeId.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
      sup.role.toLowerCase().includes(supervisorSearch.toLowerCase());
    const matchesRegion = selectedRegion === 'ALL' || sup.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  // Handle direct message click from supervisor card
  const handleDirectMessageSupervisor = (sup: CountySupervisor) => {
    setSelectedThreadForChat(sup.id === 'sup_nrb_01' ? 'dm_sup_grace' : 'chan_supervisors');
    setActiveSubTab('chat');
  };

  // Handle dispatch broadcast
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) return;

    logTelemetryEvent({
      module: 'SUPERVISOR',
      action: 'Field Operations Broadcast Dispatched',
      severity: broadcastUrgency === 'CRITICAL' ? 'WARNING' : 'INFO',
      user: currentUser?.name || 'Operations Director',
      userRole: 'Administrator',
      details: `Dispatched [${broadcastUrgency}] Broadcast "${broadcastSubject}" to ${broadcastTarget} target.`,
      status: 'COMPLETED'
    });

    setBroadcastSentSuccess(true);
    setTimeout(() => {
      setBroadcastSubject('');
      setBroadcastMessage('');
      setBroadcastSentSuccess(false);
    }, 4000);
  };

  // Broadcast Presets
  const applyBroadcastPreset = (preset: { subject: string; message: string; urgency: 'NORMAL' | 'HIGH' | 'CRITICAL'; target: 'all' | 'supervisors_only' | 'enumerators_only' | 'county' }) => {
    setBroadcastSubject(preset.subject);
    setBroadcastMessage(preset.message);
    setBroadcastUrgency(preset.urgency);
    setBroadcastTarget(preset.target);
  };

  // Ingest batch records into active dataset
  const handleIngestBatch = (batch: CountyDispatchBatch) => {
    if (onAppendRowsToActive) {
      onAppendRowsToActive(batch.records, `County Dispatch: ${batch.county} (${batch.batchId})`);
      setIngestedBatchIds(prev => ({ ...prev, [batch.batchId]: true }));
      logTelemetryEvent({
        module: 'INGESTION',
        action: 'Ingested County Supervisor Batch',
        severity: 'INFO',
        user: currentUser?.name || 'Central Admin',
        userRole: 'Administrator',
        details: `Ingested ${batch.recordCount} verified records from batch ${batch.batchId} (${batch.county} County) into active dataset`,
        status: 'COMPLETED'
      });
    }
  };

  const handleCopyDomain = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  // Ecosystem features catalog for "All Features Under One Roof"
  const ecosystemTiers = [
    {
      tierNumber: 1,
      tierTitle: 'Ingestion & Data Preparation',
      tierDescription: 'Upload, format, cleanse, and transform custom and field datasets',
      features: [
        {
          id: 'upload',
          name: 'Upload & Quality Studio',
          icon: UploadCloud,
          gradient: 'from-indigo-600 to-cyan-600',
          badge: 'Ingest & QA',
          description: 'Drag-and-drop CSV, Excel, JSON with automated null-filling, phone normalization & recipe runner.',
          targetTab: 'upload' as AppTab
        },
        {
          id: 'grid',
          name: 'Tabular Grid Editor',
          icon: Table,
          gradient: 'from-emerald-600 to-teal-600',
          badge: 'Spreadsheet',
          description: 'Live tabular grid with formula calculations, cell transformations, and instant snapshot reverts.',
          targetTab: 'grid' as AppTab
        }
      ]
    },
    {
      tierNumber: 2,
      tierTitle: 'Field Operations & Data Collection',
      tierDescription: 'Mobile surveys, offline synchronization, GPS boundaries, and fraud checks',
      features: [
        {
          id: 'collection',
          name: 'Field Collection Hub',
          icon: Layers,
          gradient: 'from-indigo-600 to-indigo-500',
          badge: 'Mobile Forms',
          description: 'GPS geofencing, photo & audio evidence capture, offline queue, and auto-sync for field enumerators.',
          targetTab: 'collection' as AppTab
        },
        {
          id: 'supervisor',
          name: 'Supervisor Cleaning Vault',
          icon: ShieldCheck,
          gradient: 'from-indigo-600 via-purple-600 to-indigo-700',
          badge: 'Audit & QA',
          description: 'Raw vs. cleaned comparison, speedrun fraud score shields, automated cleaning recipes, and signoffs.',
          targetTab: 'supervisor' as AppTab
        },
        {
          id: 'broadcast_tab',
          name: 'Field Radio & Priority Broadcast',
          icon: Radio,
          gradient: 'from-emerald-600 to-teal-600',
          badge: 'Comms Relay',
          description: 'Instant priority broadcasts, weather bulletins, and GPS geofence alerts pushed to mobile devices.',
          action: () => setActiveSubTab('broadcast')
        }
      ]
    },
    {
      tierNumber: 3,
      tierTitle: 'Team Collaboration & Co-worker Mesh',
      tierDescription: 'Interactive team messaging, direct channels, and data slice sharing',
      features: [
        {
          id: 'team',
          name: 'Team & Co-worker Hub',
          icon: Users,
          gradient: 'from-indigo-600 via-teal-600 to-cyan-600',
          badge: 'Collaboration',
          description: 'Organization directory, token invitations, live activity audit feed, and data slice dispatches.',
          targetTab: 'team' as AppTab
        },
        {
          id: 'live_chat_link',
          name: 'Live Chat & Supervisor Hotlines',
          icon: MessageSquare,
          gradient: 'from-cyan-600 to-indigo-600',
          badge: 'Real-time',
          description: 'Dedicated channels (#county-supervisors, #field-ops, #cleaning-alerts) and 1-on-1 direct messaging.',
          action: () => setActiveSubTab('chat')
        }
      ]
    },
    {
      tierNumber: 4,
      tierTitle: 'Central HQ & Fleet Observability',
      tierDescription: 'Nationwide county surveillance, telemetry ledger, and master dataset ingestion',
      features: [
        {
          id: 'admin',
          name: 'Admin Command Console',
          icon: Activity,
          gradient: 'from-rose-600 via-indigo-600 to-indigo-700',
          badge: 'Telemetry',
          description: '47 Kenyan counties status radar, live telemetry ledger, drift alerts, and batch clearinghouse.',
          targetTab: 'admin' as AppTab
        },
        {
          id: 'dispatches_link',
          name: 'Dispatches Clearinghouse',
          icon: FileSpreadsheet,
          gradient: 'from-purple-600 to-indigo-600',
          badge: 'Ingest Queue',
          description: 'Review certified batches sent from county supervisors and ingest directly into master datasets.',
          action: () => setActiveSubTab('dispatches')
        }
      ]
    },
    {
      tierNumber: 5,
      tierTitle: 'Advanced Analytics & Executive Dossiers',
      tierDescription: 'Exploratory statistical modeling, predictive simulation, and boardroom briefings',
      features: [
        {
          id: 'analysis',
          name: 'Data Analysis Suite',
          icon: BarChart3,
          gradient: 'from-indigo-600 to-cyan-600',
          badge: '9+ Analytics',
          description: 'Statistical EDA profiler, anomaly radar, SQL engine, causal inference, and AI research scientist.',
          targetTab: 'analysis' as AppTab
        },
        {
          id: 'simulation',
          name: 'What-If & Scenario Forecaster',
          icon: Sparkles,
          gradient: 'from-amber-500 via-orange-500 to-indigo-600',
          badge: 'Forecasting',
          description: 'Monte Carlo simulations, sensitivity curves, and multi-variable predictive regressions.',
          targetTab: 'simulation' as AppTab
        },
        {
          id: 'report',
          name: 'Executive Boardroom Dossier',
          icon: FileSpreadsheet,
          gradient: 'from-cyan-600 to-teal-500',
          badge: 'Print PDF',
          description: 'Printable executive dossiers, dataset health scorecards, and boardroom-ready presentation assets.',
          targetTab: 'report' as AppTab
        },
        {
          id: 'custom_domain_card',
          name: 'Domain & URL Branding',
          icon: Globe,
          gradient: 'from-teal-600 to-cyan-600',
          badge: 'datahub.com',
          description: 'Custom domain mapping, SEO preview, favicon/app logo in search results, and DNS guides.',
          action: () => setActiveSubTab('custom_domain')
        },
        {
          id: 'desktop_exe_card',
          name: 'Windows .EXE & Desktop App Studio',
          icon: Monitor,
          gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
          badge: 'Windows App',
          description: 'Package into native Windows .EXE, download .BAT / .VBS launchers, desktop shortcuts & 1-click PWA installer.',
          action: () => setIsDesktopModalOpen(true)
        }
      ]
    }
  ];

  const content = (
    <div 
      id="unified-operations-comms-hub-container"
      className={`w-full flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
        mode === 'embedded' ? 'min-h-[85vh]' : 'h-[92vh]'
      } ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Header Bar */}
      <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50/95 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                DataHub Master Operations & All-in-One Hub
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                All Features In One
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} hidden sm:block`}>
              Unified control center connecting Field Enumerators, County Supervisors, Central Admin HQ, and the complete analytics lifecycle
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeDataset && (
            <div className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-mono ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[130px] font-semibold">{activeDataset.name}</span>
              <span className="text-emerald-400 font-bold">({activeDataset.data.length} rows)</span>
            </div>
          )}

          {mode === 'modal' && onClose && (
            <button
              id="unified-comms-close-btn"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors ${
                isDark 
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Close Hub"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className={`px-4 sm:px-6 pt-3 border-b shrink-0 flex items-center justify-between gap-2 overflow-x-auto ${
        isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <button
            id="u-tab-all-features"
            onClick={() => setActiveSubTab('all_features')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === 'all_features'
                ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>All Features Under One Roof</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              12 TOOLS
            </span>
          </button>

          <button
            id="u-tab-chat"
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === 'chat'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Team & Field Live Chat</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              LIVE
            </span>
          </button>

          <button
            id="u-tab-supervisors"
            onClick={() => setActiveSubTab('supervisors')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === 'supervisors'
                ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>County Supervisors Directory ({supervisors.length})</span>
          </button>

          <button
            id="u-tab-dispatches"
            onClick={() => setActiveSubTab('dispatches')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === 'dispatches'
                ? 'border-purple-400 text-purple-400 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Cleaning Dispatches ({dispatches.length})</span>
          </button>

          <button
            id="u-tab-broadcast"
            onClick={() => setActiveSubTab('broadcast')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === 'broadcast'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Field Priority Broadcast</span>
          </button>

          <button
            id="u-tab-custom-domain"
            onClick={() => setActiveSubTab('custom_domain')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeSubTab === 'custom_domain'
                ? 'border-teal-400 text-teal-400 bg-teal-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>datahub.com Branding</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 pb-2 text-[11px] text-slate-400 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>47 Counties Grid Mesh Active</span>
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        
        {/* SUBTAB 0: ALL FEATURES UNDER ONE ROOF */}
        {activeSubTab === 'all_features' && (
          <div className="space-y-6">
            {/* Spotlight Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/70 to-slate-900 border border-indigo-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/50">
                    Unified Platform Architecture
                  </span>
                  <span className="text-xs text-indigo-200/80 font-mono">End-to-End Operational Lifecycle</span>
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  Every DataHub Capability Connected Under One Roof
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  From offline mobile survey collection to county supervisor data cleaning, automated cleaning recipes, central admin ingestion, what-if predictive modeling, and executive board dossiers — switch to any module instantly.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveSubTab('chat')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Live Chat</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('supervisors')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 border border-slate-700 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Supervisors ({supervisors.length})</span>
                </button>
              </div>
            </div>

            {/* 5-Tier Ecosystem Grid */}
            <div className="space-y-6">
              {ecosystemTiers.map((tier) => (
                <div key={tier.tierNumber} className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                      T{tier.tierNumber}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {tier.tierTitle}
                      </h4>
                      <p className="text-xs text-slate-400">{tier.tierDescription}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {tier.features.map((feat) => {
                      const FeatIcon = feat.icon;
                      return (
                        <div
                          key={feat.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            isDark ? 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-950' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-xs'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${feat.gradient} flex items-center justify-center text-white shadow-md shrink-0`}>
                                  <FeatIcon className="w-4 h-4" />
                                </div>
                                <h5 className="text-xs font-bold leading-tight">{feat.name}</h5>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {feat.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              {feat.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Ready & Connected
                            </span>

                            <button
                              onClick={() => {
                                if (feat.targetTab && onNavigateToTab) {
                                  if (mode === 'modal' && onClose) onClose();
                                  onNavigateToTab(feat.targetTab);
                                } else if (feat.action) {
                                  feat.action();
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all flex items-center gap-1"
                            >
                              <span>Launch</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 1: CHAT & DATA EXCHANGE */}
        {activeSubTab === 'chat' && (
          <div className="h-full rounded-2xl overflow-hidden border border-slate-800 shadow-inner min-h-[580px]">
            <TeamMessenger
              datasets={datasets}
              activeDataset={activeDataset}
              currentUser={currentUser}
              onSelectDataset={() => {
                if (mode === 'modal' && onClose) onClose();
                if (onNavigateToTab) onNavigateToTab('grid');
              }}
              onNavigateToTab={(tab) => {
                if (mode === 'modal' && onClose) onClose();
                if (onNavigateToTab) onNavigateToTab(tab);
              }}
            />
          </div>
        )}

        {/* SUBTAB 2: COUNTY SUPERVISORS DIRECTORY */}
        {activeSubTab === 'supervisors' && (
          <div className="space-y-4">
            {/* Filter and Search */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search supervisor, county, badge ID..."
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border outline-hidden transition-all ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
                {['ALL', 'Nairobi', 'Central', 'Coast', 'Rift Valley', 'Nyanza', 'Western'].map(reg => (
                  <button
                    key={reg}
                    onClick={() => setSelectedRegion(reg)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedRegion === reg
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDark ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Supervisors Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSupervisors.map(sup => (
                <div
                  key={sup.id}
                  className={`p-4 rounded-2xl border transition-all hover:border-indigo-500/50 space-y-3.5 flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/60 border-slate-800 hover:bg-slate-950' : 'bg-slate-50/80 border-slate-200 hover:bg-white shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${sup.avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}>
                          {sup.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm leading-snug">{sup.name}</h4>
                          <p className="text-xs text-indigo-400 font-medium">{sup.role}</p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {sup.county}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/60">
                      <div>
                        <span className="text-slate-400 block">Badge ID</span>
                        <span className="font-mono font-semibold">{sup.badgeId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cleaned & Sent</span>
                        <span className="font-mono font-bold text-emerald-400">{sup.totalDispatchedToAdmin} records</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Assigned Sector</span>
                        <span className="truncate block">{sup.assignedSubCounties.slice(0, 2).join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Field Fleet</span>
                        <span className="font-semibold text-cyan-400">{sup.assignedEnumerators.length} enumerators</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleDirectMessageSupervisor(sup)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-indigo-600/30"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat Directly</span>
                    </button>

                    <a
                      href={`tel:${sup.phone}`}
                      className={`p-2 rounded-xl border transition-colors ${
                        isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title={`Call ${sup.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={`mailto:${sup.email}`}
                      className={`p-2 rounded-xl border transition-colors ${
                        isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title={`Email ${sup.name}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 3: DISPATCHES TRACKER & INGESTION */}
        {activeSubTab === 'dispatches' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
              <div>
                <h3 className="font-bold text-sm">Supervisor-to-Admin Dispatches Clearinghouse</h3>
                <p className="text-xs text-slate-300">Certified cleaned datasets transmitted from field supervisors to the Central Admin Office for master ingestion</p>
              </div>
              <button
                onClick={() => {
                  if (mode === 'modal' && onClose) onClose();
                  if (onNavigateToTab) onNavigateToTab('admin');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 transition-all self-start sm:self-center"
              >
                <span>Full Admin Radar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {dispatches.map(batch => {
                const isIngested = ingestedBatchIds[batch.batchId];

                return (
                  <div
                    key={batch.batchId}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-indigo-400">{batch.batchId}</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {batch.county} County
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300">
                          {batch.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold">{batch.title}</h4>
                      <p className="text-xs text-slate-400">
                        Dispatched by <strong className="text-slate-200">{batch.supervisorName}</strong> ({batch.supervisorBadge}) on {new Date(batch.sentAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-300 italic">
                        Signoff: "{batch.supervisorSignoff}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-black text-lg text-emerald-400">{batch.recordCount}</span>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Cleaned Records</span>
                      </div>

                      {/* Ingest into active dataset button */}
                      <button
                        onClick={() => handleIngestBatch(batch)}
                        disabled={isIngested}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isIngested
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        }`}
                        title="Ingest cleaned records into the active Master Dataset"
                      >
                        {isIngested ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ingested to Active</span>
                          </>
                        ) : (
                          <>
                            <Database className="w-3.5 h-3.5" />
                            <span>Ingest to Dataset</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (mode === 'modal' && onClose) onClose();
                          if (onNavigateToTab) onNavigateToTab('supervisor');
                        }}
                        className="p-2.5 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/30 transition-all"
                        title="Inspect in Supervisor Cleaning Vault"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 4: FIELD PRIORITY BROADCAST */}
        {activeSubTab === 'broadcast' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/50 to-slate-900 border border-emerald-500/30 text-white">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-sm">Emergency & Operational Field Transmitter</h3>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Send immediate push notifications, instructions, route amendments, or alert bulletins directly to field devices.
              </p>
            </div>

            {/* Quick Broadcast Presets */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 block">Quick Operational Presets:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyBroadcastPreset({
                    subject: 'Target Milestone Reached: Shift to Verification QA',
                    message: 'All enumerators who have completed today’s quota of 25 household surveys should submit their batch to the supervisor queue and verify GPS tags.',
                    urgency: 'NORMAL',
                    target: 'all'
                  })}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-left text-xs text-slate-300 transition-all"
                >
                  <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quota Milestone</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Shift to QA & sync completed batch</p>
                </button>

                <button
                  type="button"
                  onClick={() => applyBroadcastPreset({
                    subject: 'Weather Notice: Heavy rainfall approaching Western sectors',
                    message: 'Adverse weather warning in Kisumu and Kakamega. Ensure mobile devices are safely protected in weatherproof pouches and backup collected offline records.',
                    urgency: 'HIGH',
                    target: 'all'
                  })}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-left text-xs text-slate-300 transition-all"
                >
                  <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    <span>Weather Warning</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Western region rain protocol</p>
                </button>

                <button
                  type="button"
                  onClick={() => applyBroadcastPreset({
                    subject: 'GPS Geofence Boundary Check: Westlands Zone',
                    message: 'Please confirm device location services are enabled. Several enumerator submissions had GPS accuracy > 20 meters. Recalibrate sensors under clear sky.',
                    urgency: 'CRITICAL',
                    target: 'county'
                  })}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-left text-xs text-slate-300 transition-all"
                >
                  <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>Geofence Alert</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">Sensor accuracy recalibration</p>
                </button>
              </div>
            </div>

            {broadcastSentSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Broadcast Successfully Transmitted</h4>
                  <p className="text-xs text-emerald-200/80">Message has been relayed to all active field devices and logged to the central telemetry audit ledger.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Target Audience</label>
                  <select
                    value={broadcastTarget}
                    onChange={(e: any) => setBroadcastTarget(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="all">All Field Personnel (Supervisors + Enumerators)</option>
                    <option value="supervisors_only">County Supervisors Only</option>
                    <option value="enumerators_only">Field Enumerators Only</option>
                    <option value="county">Specific County Fleet</option>
                  </select>
                </div>

                {broadcastTarget === 'county' ? (
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Target County</label>
                    <select
                      value={broadcastCounty}
                      onChange={(e) => setBroadcastCounty(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {ALL_KENYA_COUNTIES.map(c => (
                        <option key={c.code} value={c.name}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Priority Level</label>
                    <select
                      value={broadcastUrgency}
                      onChange={(e: any) => setBroadcastUrgency(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="NORMAL">Normal Operational Notice</option>
                      <option value="HIGH">High Priority Instruction</option>
                      <option value="CRITICAL">Critical / Urgent Safety & Weather</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Broadcast Subject / Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., GPS Geofence boundary reminder for Westlands sector"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border outline-hidden ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Detailed Operational Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write your exact instructions to the team..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs border outline-hidden resize-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit Field Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SUBTAB 5: CUSTOM DOMAIN & BRANDING PORTAL */}
        {activeSubTab === 'custom_domain' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Domain Overview Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/80 via-cyan-950/70 to-slate-900 border border-teal-500/30 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-sm">Enterprise Domain & Search Branding (`datahub.com`)</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  SEO & PWA READY
                </span>
              </div>
              <p className="text-xs text-slate-300">
                DataHub is configured with canonical links to <strong className="text-cyan-300">https://datahub.com/</strong>, official app logos, OpenGraph social share cards, Schema.org web application schemas, and Apple touch icons.
              </p>
            </div>

            {/* Google Search Result Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Google Search Snippet Preview:</span>
              <div className={`p-4 rounded-2xl border space-y-1.5 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold">
                    D
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-300 block leading-tight">DataHub</span>
                    <span className="text-[10px] text-cyan-400 font-mono block leading-tight">https://datahub.com</span>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-indigo-400 hover:underline cursor-pointer">
                  DataHub - Enterprise Data Collection, Analytics & Operations Suite
                </h4>
                <p className="text-xs text-slate-400 leading-snug">
                  Comprehensive intelligence suite featuring qualitative and quantitative research, Admin Observability Command Center, Causal Inference, County Supervisor Vault, and automated data governance.
                </p>
              </div>
            </div>

            {/* Browser Address Bar Mockup */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Browser Tab & Address Bar Appearance:</span>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-500">https://</span>
                  <span className="font-bold text-white">datahub.com</span>
                  <span className="text-slate-500">/workspace</span>
                </div>
                <button
                  onClick={() => handleCopyDomain('https://datahub.com')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>
            </div>

            {/* Production Domain Setup Guide */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Custom Domain Setup Guide (Cloud Run & DNS):</span>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs text-slate-300">
                <p>
                  To map your custom domain (e.g. <strong className="text-cyan-300">datahub.com</strong> or <strong className="text-cyan-300">app.datahub.com</strong>) to your deployed container:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">DNS RECORD 1</span>
                    <span className="font-bold text-emerald-400">CNAME</span> app.datahub.com &rarr; ghs.googlehosted.com
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">DNS RECORD 2</span>
                    <span className="font-bold text-indigo-400">A RECORD</span> @ &rarr; Cloud Run Ingress IP
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Google Cloud Run automatically provisions free managed SSL certificates (Let's Encrypt / Google Trust Services) within minutes of DNS verification.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );

  if (mode === 'embedded') {
    return (
      <>
        {content}
        <DesktopExeModal
          isOpen={isDesktopModalOpen}
          onClose={() => setIsDesktopModalOpen(false)}
          onNavigateTab={(tab) => {
            setIsDesktopModalOpen(false);
            if (onNavigateToTab) onNavigateToTab(tab);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-6xl">
          {content}
        </div>
      </div>
      <DesktopExeModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
        onNavigateTab={(tab) => {
          setIsDesktopModalOpen(false);
          if (onNavigateToTab) onNavigateToTab(tab);
        }}
      />
    </>
  );
};
