import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Navigation,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Filter,
  Download,
  Search,
  Eye,
  Check,
  X,
  Plus,
  Send,
  Sparkles,
  Phone,
  Mail,
  Battery,
  Radio,
  FileSpreadsheet,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Smartphone,
  Wand2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  FileText,
  Lock,
  BarChart3,
  Globe,
  Building,
  MessageSquare
} from 'lucide-react';
import { Dataset } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { TeamMessenger } from '../team/TeamMessenger';
import {
  SupervisorSubmission,
  SubmissionPipelineStage,
  SupervisorCleaningConfig,
  DEFAULT_SUPERVISOR_CLEANING_CONFIG,
  getStoredSupervisorSubmissions,
  saveStoredSupervisorSubmissions,
  getStoredSupervisorCleaningConfig,
  saveStoredSupervisorCleaningConfig,
  cleanRawSubmission,
  generateDatasetFromCleanedSubmissions,
  computeSupervisorMetrics
} from '../../utils/supervisorEngine';
import {
  EnumeratorAgent,
  INITIAL_DEFAULT_FLEET,
  fetchEnumeratorFleet,
  calculateDistanceKm
} from '../../utils/enumeratorFleetEngine';
import { RegisterEnumeratorModal } from './RegisterEnumeratorModal';
import { EditEnumeratorModal } from './EditEnumeratorModal';
import { SupervisorDispatchModal } from './SupervisorDispatchModal';
import { EnumeratorFieldPortalModal } from './EnumeratorFieldPortalModal';
import { exportToCSV, exportToExcel, exportToJSON } from '../../utils/dataEngine';
import {
  SupervisorSession,
  getActiveSupervisorSession,
  clearActiveSupervisorSession
} from '../../utils/supervisorAuthEngine';
import { SupervisorLockScreen } from './SupervisorLockScreen';
import { SupervisorSecurityModal } from './SupervisorSecurityModal';
import { SupervisorFraudShieldTab } from './supervisor/SupervisorFraudShieldTab';
import { SupervisorTacticalRadarTab } from './supervisor/SupervisorTacticalRadarTab';
import { SupervisorQuotaDispatchTab } from './supervisor/SupervisorQuotaDispatchTab';
import { SupervisorRecipeBuilderTab } from './supervisor/SupervisorRecipeBuilderTab';
import { SupervisorMediaInspectorModal } from './supervisor/SupervisorMediaInspectorModal';
import { SupervisorComplianceDossierTab } from './supervisor/SupervisorComplianceDossierTab';
import { SupervisorApprovalVaultTab } from './supervisor/SupervisorApprovalVaultTab';
import { runFleetFraudAnalysis } from '../../utils/supervisorFraudEngine';
import { SupervisorSendToAdminModal } from './SupervisorSendToAdminModal';

interface SupervisorOperationsCenterProps {
  activeDataset?: Dataset | null;
  datasets?: Dataset[];
  onAppendRowsToActive?: (newRows: Record<string, any>[]) => void;
  onCreateDataset?: (newDataset: Dataset) => void;
  onNavigateToAnalysis?: () => void;
  onNavigateToGrid?: () => void;
}

type SupervisorTab = 
  | 'stream' 
  | 'approval_vault'
  | 'fraud_shield' 
  | 'tactical_radar' 
  | 'fleet' 
  | 'quota_dispatch' 
  | 'recipe_builder' 
  | 'compliance_dossier' 
  | 'analytics'
  | 'team_chat';

export const SupervisorOperationsCenter: React.FC<SupervisorOperationsCenterProps> = ({
  activeDataset,
  datasets = [],
  onAppendRowsToActive,
  onCreateDataset,
  onNavigateToAnalysis,
  onNavigateToGrid,
}) => {
  const { isDark } = useTheme();

  // Supervisor Security & Session State
  const [supervisorSession, setSupervisorSession] = useState<SupervisorSession | null>(() => getActiveSupervisorSession());
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState<SupervisorSubmission[]>(() => getStoredSupervisorSubmissions());
  
  // Fleet State
  const [fleet, setFleet] = useState<EnumeratorAgent[]>(() => {
    try {
      const saved = localStorage.getItem('datahub_enumerator_fleet_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Cleaning Configuration State
  const [cleaningConfig, setCleaningConfig] = useState<SupervisorCleaningConfig>(() => getStoredSupervisorCleaningConfig());

  // Active Tab View
  const [activeTab, setActiveTab] = useState<SupervisorTab>('stream');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | SubmissionPipelineStage>('all');
  const [enumeratorFilter, setEnumeratorFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);

  // Modals & Inspector State
  const [inspectingSubmission, setInspectingSubmission] = useState<SupervisorSubmission | null>(null);
  const [mediaInspectingSub, setMediaInspectingSub] = useState<SupervisorSubmission | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<EnumeratorAgent | null>(null);
  const [dispatchAgentId, setDispatchAgentId] = useState<string | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [portalAgent, setPortalAgent] = useState<EnumeratorAgent | null>(null);
  const [isSendToAdminModalOpen, setIsSendToAdminModalOpen] = useState(false);

  // Status message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rejectionModalSubmission, setRejectionModalSubmission] = useState<SupervisorSubmission | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Live anomalies computation for fraud badge
  const liveAnomalies = useMemo(() => {
    return runFleetFraudAnalysis(submissions);
  }, [submissions]);

  // Pending enumerator applicants awaiting supervisor vetting
  const pendingApplicantsCount = useMemo(() => {
    return fleet.filter(a => a.approvalStatus === 'pending_approval').length;
  }, [fleet]);

  // Reload data from local storage periodically or on event
  const refreshVault = () => {
    const updatedSubmissions = getStoredSupervisorSubmissions();
    setSubmissions(updatedSubmissions);
    
    try {
      const savedFleet = localStorage.getItem('datahub_enumerator_fleet_cache');
      if (savedFleet) {
        const parsed = JSON.parse(savedFleet);
        if (Array.isArray(parsed) && parsed.length > 0) setFleet(parsed);
      }
    } catch {}

    showToast('Refreshed latest field submissions and enumerator beacons');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Metrics computation
  const metrics = useMemo(() => computeSupervisorMetrics(submissions, fleet), [submissions, fleet]);

  // Unique lists for dropdown filters
  const uniqueEnumerators = useMemo(() => {
    const map = new Map<string, string>();
    fleet.forEach(f => map.set(f.id, f.name));
    submissions.forEach(s => map.set(s.enumeratorId, s.enumeratorName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [fleet, submissions]);

  const uniqueZones = useMemo(() => {
    const set = new Set<string>();
    fleet.forEach(f => set.add(f.assignedZone));
    submissions.forEach(s => set.add(s.assignedZone));
    return Array.from(set).filter(Boolean);
  }, [fleet, submissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      if (stageFilter !== 'all' && sub.stage !== stageFilter) return false;
      if (enumeratorFilter !== 'all' && sub.enumeratorId !== enumeratorFilter) return false;
      if (zoneFilter !== 'all' && sub.assignedZone !== zoneFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = sub.submissionCode.toLowerCase().includes(q);
        const matchEnum = sub.enumeratorName.toLowerCase().includes(q);
        const matchCamp = sub.campaign.toLowerCase().includes(q);
        const matchData = Object.values(sub.cleanedData).some(val => 
          String(val).toLowerCase().includes(q)
        );
        if (!matchCode && !matchEnum && !matchCamp && !matchData) return false;
      }
      return true;
    });
  }, [submissions, stageFilter, enumeratorFilter, zoneFilter, searchQuery]);

  // Approve a submission
  const handleApproveSubmission = (submissionId: string) => {
    const updated = submissions.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          stage: 'supervisor_approved' as SubmissionPipelineStage,
          approvedAt: new Date().toISOString(),
          supervisorActionBy: 'Field Supervisor / Admin',
          supervisorNotes: s.supervisorNotes || 'Reviewed and approved by Supervisor.'
        };
      }
      return s;
    });
    setSubmissions(updated);
    saveStoredSupervisorSubmissions(updated);
    showToast(`Submission approved and certified.`);
    if (inspectingSubmission?.id === submissionId) {
      setInspectingSubmission(updated.find(u => u.id === submissionId) || null);
    }
  };

  // Reject a submission
  const handleConfirmReject = () => {
    if (!rejectionModalSubmission) return;
    const submissionId = rejectionModalSubmission.id;
    const updated = submissions.map(s => {
      if (s.id === submissionId) {
        return {
          ...s,
          stage: 'rejected' as SubmissionPipelineStage,
          rejectedAt: new Date().toISOString(),
          supervisorActionBy: 'Field Supervisor / Admin',
          supervisorNotes: rejectionNotes || 'Rejected during supervisor quality audit. Re-interview required.'
        };
      }
      return s;
    });
    setSubmissions(updated);
    saveStoredSupervisorSubmissions(updated);
    setRejectionModalSubmission(null);
    setRejectionNotes('');
    showToast(`Submission rejected. Enumerator notified.`);
    if (inspectingSubmission?.id === submissionId) {
      setInspectingSubmission(updated.find(u => u.id === submissionId) || null);
    }
  };

  // Ingest approved submissions into active or new dataset
  const handleIngestToActiveDataset = (targetSubmissions: SupervisorSubmission[]) => {
    if (targetSubmissions.length === 0) {
      showToast('No submissions selected to ingest.');
      return;
    }

    const rows = targetSubmissions.map(s => ({
      submission_id: s.submissionCode,
      enumerator_name: s.enumeratorName,
      campaign: s.campaign,
      assigned_zone: s.assignedZone,
      collected_at: s.collectedAt.split('T')[0],
      gps_lat: s.gps.lat,
      gps_lng: s.gps.lng,
      quality_score: s.qualityScore,
      dwell_time_mins: Math.round(s.dwellTimeSeconds / 60 * 10) / 10,
      ...s.cleanedData
    }));

    if (activeDataset && onAppendRowsToActive) {
      onAppendRowsToActive(rows);
      
      // Update stage to 'ingested'
      const ids = new Set(targetSubmissions.map(s => s.id));
      const updated = submissions.map(s => {
        if (ids.has(s.id)) {
          return {
            ...s,
            stage: 'ingested' as SubmissionPipelineStage,
            ingestedAt: new Date().toISOString(),
            targetDatasetName: activeDataset.name
          };
        }
        return s;
      });
      setSubmissions(updated);
      saveStoredSupervisorSubmissions(updated);
      showToast(`Successfully ingested ${rows.length} cleaned records into '${activeDataset.name}'!`);
    } else if (onCreateDataset) {
      const newDs = generateDatasetFromCleanedSubmissions(targetSubmissions, 'Supervisor Verified Field Cleaned Dataset');
      onCreateDataset(newDs);
      
      const ids = new Set(targetSubmissions.map(s => s.id));
      const updated = submissions.map(s => {
        if (ids.has(s.id)) {
          return {
            ...s,
            stage: 'ingested' as SubmissionPipelineStage,
            ingestedAt: new Date().toISOString(),
            targetDatasetName: newDs.name
          };
        }
        return s;
      });
      setSubmissions(updated);
      saveStoredSupervisorSubmissions(updated);
      showToast(`Created new verified master dataset with ${rows.length} records!`);
    }
  };

  // Re-run cleaning engine across all submissions
  const handleExecuteBatchCleaning = () => {
    saveStoredSupervisorCleaningConfig(cleaningConfig);
    const updated = submissions.map(s => {
      if (s.stage === 'ingested' || s.stage === 'rejected') return s;
      const { cleanedData, diffs } = cleanRawSubmission(s.rawData, cleaningConfig);
      return {
        ...s,
        cleanedData,
        cleaningDiffs: diffs,
        cleanedAt: new Date().toISOString(),
        stage: s.stage === 'supervisor_approved' ? 'supervisor_approved' : 'auto_cleaned'
      };
    });
    setSubmissions(updated);
    saveStoredSupervisorSubmissions(updated);
    showToast(`Executed supervisor cleaning recipes across all submissions! Applied ${updated.reduce((a, b) => a + b.cleaningDiffs.length, 0)} field fixes.`);
  };

  // Export submissions
  const handleExportData = (format: 'csv' | 'excel' | 'json') => {
    const ds = generateDatasetFromCleanedSubmissions(filteredSubmissions, 'Supervisor_Field_Ingestion_Dossier');
    if (format === 'csv') exportToCSV(ds);
    else if (format === 'excel') exportToExcel(ds);
    else exportToJSON(ds);
    showToast(`Exported ${filteredSubmissions.length} records as ${format.toUpperCase()}`);
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedSubmissions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubmissions.length === filteredSubmissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(filteredSubmissions.map(s => s.id));
    }
  };

  // Stage Badge helper
  const renderStageBadge = (stage: SubmissionPipelineStage) => {
    switch (stage) {
      case 'raw_received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/30">
            <Radio className="w-3 h-3 animate-pulse" /> Raw Received
          </span>
        );
      case 'auto_cleaned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
            <Wand2 className="w-3 h-3" /> Auto-Cleaned
          </span>
        );
      case 'supervisor_approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
            <ShieldCheck className="w-3 h-3" /> Supervisor Approved
          </span>
        );
      case 'ingested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            <Database className="w-3 h-3" /> Master Ingested
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/30">
            <X className="w-3 h-3" /> Flagged / Rejected
          </span>
        );
    }
  };

  // Render Lock Screen if no supervisor session is active
  if (!supervisorSession) {
    return (
      <div className="py-6">
        <SupervisorLockScreen
          onUnlockSuccess={unlockedSession => {
            setSupervisorSession(unlockedSession);
            showToast(`Supervisor Vault unlocked. Active Officer: ${unlockedSession.name}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* TOP EXECUTIVE COMMAND BANNER */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/30 shadow-2xl shadow-black/60' 
          : 'bg-gradient-to-r from-white via-indigo-50/50 to-white border-indigo-100 shadow-xl shadow-slate-200/50'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Header text & Officer Session info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Supervisor & Admin Operations Vault
                  </h1>
                  <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Command Central
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Consolidated repository gathering all field enumerators, mobile submissions, automated cleaning transformations & master ingestion audits.
                </p>
              </div>
            </div>

            {/* Logged in supervisor badge & controls */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-100/90 border-slate-200 text-slate-700'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">Officer in Command:</span>
                <strong className={isDark ? 'text-white' : 'text-slate-900'}>{supervisorSession.name}</strong>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {supervisorSession.badgeId}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">• {supervisorSession.role}</span>
              </div>

              <button
                id="supervisor-security-settings-btn"
                onClick={() => setIsSecurityModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isDark
                    ? 'bg-indigo-950/50 hover:bg-indigo-900/60 border-indigo-800/60 text-indigo-300'
                    : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                }`}
                title="Manage supervisor logins, update passkey/PIN, view audit trail"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Security & Passkeys</span>
              </button>

              <button
                id="supervisor-lock-vault-btn"
                onClick={() => {
                  clearActiveSupervisorSession();
                  setSupervisorSession(null);
                  showToast('Supervisor Vault has been secured and locked.');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isDark
                    ? 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/50 text-rose-300'
                    : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                }`}
                title="Lock supervisor vault and return to secure access gate"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Vault</span>
              </button>
            </div>
          </div>

          {/* Quick Supervisor Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="supervisor-register-enum-btn"
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Register Enumerator</span>
            </button>

            <button
              id="supervisor-batch-clean-btn"
              onClick={handleExecuteBatchCleaning}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-300' 
                  : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-800'
              }`}
              title="Re-run all automated cleaning and imputation recipes"
            >
              <Wand2 className="w-4 h-4 text-cyan-400" />
              <span>Run Cleaning Recipes</span>
            </button>

            <button
              id="supervisor-send-to-admin-btn"
              onClick={() => setIsSendToAdminModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 transition-all"
              title="Dispatch cleaned and verified field data to Central Admin Office"
            >
              <Building className="w-4 h-4" />
              <span>Send Cleaned Data to Admin (Office)</span>
            </button>

            <button
              id="supervisor-dispatch-fleet-btn"
              onClick={() => {
                setDispatchAgentId(null);
                setIsDispatchModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <Send className="w-4 h-4 text-indigo-400" />
              <span>Broadcast Dispatch</span>
            </button>

            <button
              id="supervisor-refresh-btn"
              onClick={refreshVault}
              className={`p-2 rounded-xl border transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700'
              }`}
              title="Refresh submissions stream"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* METRICS KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          
          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Submissions
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{metrics.totalSubmissions}</span>
              <span className="text-[11px] font-semibold text-indigo-400">Stream Live</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Auto-Cleaned & Ready
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-cyan-400">{metrics.autoCleanedCount}</span>
              <span className="text-[11px] font-semibold text-cyan-500">{metrics.cleaningFixesAppliedCount} Fixes</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Active Enumerators
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-emerald-400">{metrics.activeEnumeratorsCount} / {metrics.totalEnumerators}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Avg Quality Score
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-xl font-black ${metrics.avgFleetQualityScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {metrics.avgFleetQualityScore}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400">Target 90%+</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Geofence Compliance
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-indigo-400">{metrics.geofenceCompliancePct}%</span>
              <span className="text-[11px] font-semibold text-slate-400">Lock &lt;5m</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Ingested to Dataset
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xl font-black text-emerald-400">{metrics.ingestedCount}</span>
              <span className="text-[11px] font-semibold text-emerald-500">Certified</span>
            </div>
          </div>

        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="px-4 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-semibold shadow-2xl shadow-indigo-600/50 flex items-center gap-2 border border-indigo-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* NAVIGATION TABS FOR SUPERVISOR VAULT */}
      <div className="flex items-center justify-between border-b pb-3 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          
          <button
            id="sup-tab-stream"
            onClick={() => setActiveTab('stream')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'stream'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Field Stream ({submissions.length})</span>
          </button>

          <button
            id="sup-tab-approval-vault"
            onClick={() => setActiveTab('approval_vault')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'approval_vault'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Approval & Sign-In Gate</span>
            {pendingApplicantsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-400 text-slate-950 font-black animate-bounce shadow-sm">
                {pendingApplicantsCount} PENDING
              </span>
            )}
          </button>

          <button
            id="sup-tab-fraud-shield"
            onClick={() => setActiveTab('fraud_shield')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'fraud_shield'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Anti-Cheat Shield</span>
            {liveAnomalies.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-black animate-pulse">
                {liveAnomalies.length}
              </span>
            )}
          </button>

          <button
            id="sup-tab-tactical-radar"
            onClick={() => setActiveTab('tactical_radar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'tactical_radar'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tactical Radar Map</span>
          </button>

          <button
            id="sup-tab-fleet"
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'fleet'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Fleet Roster ({fleet.length})</span>
          </button>

          <button
            id="sup-tab-quota-dispatch"
            onClick={() => setActiveTab('quota_dispatch')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'quota_dispatch'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quotas & Dispatch</span>
          </button>

          <button
            id="sup-tab-recipe-builder"
            onClick={() => setActiveTab('recipe_builder')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'recipe_builder'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Recipe Builder & Auto-Heal</span>
          </button>

          <button
            id="sup-tab-compliance-dossier"
            onClick={() => setActiveTab('compliance_dossier')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'compliance_dossier'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Compliance Sign-Off Dossier</span>
          </button>

          <button
            id="sup-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Velocity & Charts</span>
          </button>

          <button
            id="sup-tab-team-chat"
            onClick={() => setActiveTab('team_chat')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'team_chat'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Team & Field Comms</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              LIVE
            </span>
          </button>

        </div>

        {/* Direct Ingest Master Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'stream' && selectedSubmissions.length > 0 && (
            <button
              onClick={() => {
                const targets = submissions.filter(s => selectedSubmissions.includes(s.id));
                handleIngestToActiveDataset(targets);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all animate-in fade-in"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ingest Selected ({selectedSubmissions.length}) into Dataset</span>
            </button>
          )}

          <div className="relative group">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Dossier</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            <div className={`absolute right-0 mt-1 w-44 rounded-2xl border shadow-2xl py-1 hidden group-hover:block z-50 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-slate-300/50'
            }`}>
              <button
                onClick={() => handleExportData('csv')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-600/10 hover:text-indigo-400 flex items-center gap-2"
              >
                <span>Export as CSV (.csv)</span>
              </button>
              <button
                onClick={() => handleExportData('excel')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-600/10 hover:text-indigo-400 flex items-center gap-2"
              >
                <span>Export as Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => handleExportData('json')}
                className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-600/10 hover:text-indigo-400 flex items-center gap-2"
              >
                <span>Export as JSON (.json)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FIELD INGESTION STREAM & RAW VS CLEANED AUDIT PIPELINE */}
      {/* ========================================================================= */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by submission code, enumerator, respondent ID, crop, asset..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Stage filter */}
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">All Pipeline Stages ({submissions.length})</option>
                <option value="raw_received">Raw Received ({metrics.rawReceivedCount})</option>
                <option value="auto_cleaned">Auto-Cleaned & Imputed ({metrics.autoCleanedCount})</option>
                <option value="supervisor_approved">Supervisor Approved ({metrics.supervisorApprovedCount})</option>
                <option value="ingested">Master Ingested ({metrics.ingestedCount})</option>
                <option value="rejected">Flagged / Rejected ({metrics.rejectedCount})</option>
              </select>

              {/* Enumerator filter */}
              <select
                value={enumeratorFilter}
                onChange={e => setEnumeratorFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">All Enumerators</option>
                {uniqueEnumerators.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>

              {/* Zone filter */}
              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <option value="all">All Sectors & Zones</option>
                {uniqueZones.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>

              {/* Bulk Select All */}
              <button
                onClick={handleSelectAll}
                className={`px-3 py-2 rounded-xl text-xs border font-semibold transition-colors ${
                  selectedSubmissions.length > 0 && selectedSubmissions.length === filteredSubmissions.length
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {selectedSubmissions.length === filteredSubmissions.length && filteredSubmissions.length > 0 ? 'Deselect All' : 'Select All'}
              </button>

            </div>

          </div>

          {/* Submissions List / Table */}
          {filteredSubmissions.length === 0 ? (
            <div className={`p-12 text-center rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <Radio className="w-10 h-10 mx-auto text-slate-600 mb-3 animate-pulse" />
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No submissions match the active filter</h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Clear search terms or filters to inspect incoming field surveys and cleaned batches.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStageFilter('all');
                  setEnumeratorFilter('all');
                  setZoneFilter('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  
                  <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                          onChange={handleSelectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="py-3 px-4">Submission Code & Time</th>
                      <th className="py-3 px-4">Field Enumerator</th>
                      <th className="py-3 px-4">Campaign & Sector</th>
                      <th className="py-3 px-4">Quality & Dwell</th>
                      <th className="py-3 px-4">Pipeline Stage</th>
                      <th className="py-3 px-4">Cleaned Fixes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
                    {filteredSubmissions.map(sub => {
                      const isSelected = selectedSubmissions.includes(sub.id);
                      return (
                        <tr
                          key={sub.id}
                          className={`transition-colors group ${
                            isSelected 
                              ? isDark ? 'bg-indigo-950/30' : 'bg-indigo-50/60'
                              : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(sub.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Code & Time */}
                          <td className="py-3.5 px-4 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-400">{sub.submissionCode}</span>
                              {sub.offlineSync && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20" title="Collected offline and synced">
                                  Offline Sync
                                </span>
                              )}
                            </div>
                            <span className={`text-[11px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {new Date(sub.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(sub.collectedAt).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Enumerator */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                {sub.enumeratorName.charAt(0)}
                              </div>
                              <div className="truncate max-w-[140px]">
                                <p className="font-semibold truncate">{sub.enumeratorName}</p>
                                <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sub.enumeratorRole}</p>
                              </div>
                            </div>
                          </td>

                          {/* Campaign & Sector */}
                          <td className="py-3.5 px-4">
                            <p className="font-medium truncate max-w-[160px]">{sub.campaign}</p>
                            <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                              sub.gps.isInsideZone ? 'text-emerald-500' : 'text-rose-500 font-semibold'
                            }`}>
                              <MapPin className="w-2.5 h-2.5" />
                              {sub.assignedZone} ({sub.gps.isInsideZone ? 'In Geofence' : `${sub.gps.distanceFromZoneCenterKm}km breach`})
                            </span>
                          </td>

                          {/* Quality Score */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                sub.qualityScore >= 90
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : sub.qualityScore >= 70
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                                {sub.qualityScore}% Q-Score
                              </span>
                            </div>
                            <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              ⏱️ {Math.round(sub.dwellTimeSeconds / 60 * 10) / 10} min dwell ({sub.questionCount} fields)
                            </span>
                          </td>

                          {/* Pipeline Stage */}
                          <td className="py-3.5 px-4">
                            {renderStageBadge(sub.stage)}
                          </td>

                          {/* Cleaned Fixes */}
                          <td className="py-3.5 px-4">
                            {sub.cleaningDiffs.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400">
                                <Sparkles className="w-3 h-3" />
                                {sub.cleaningDiffs.length} rules applied
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">Pristine (No edits)</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              
                              {/* Inspect & Compare Diff */}
                              <button
                                onClick={() => setInspectingSubmission(sub)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                                }`}
                                title="Inspect Raw vs Cleaned Diff"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              </button>

                              {/* Media & Audio / EXIF Inspector */}
                              <button
                                onClick={() => setMediaInspectingSub(sub)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-purple-400' : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                                }`}
                                title="Inspect Audio Recording & EXIF Geotagged Photo"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>

                              {/* Direct Approve */}
                              {sub.stage !== 'supervisor_approved' && sub.stage !== 'ingested' && (
                                <button
                                  onClick={() => handleApproveSubmission(sub.id)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                                  title="Approve Submission"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Reject with feedback */}
                              {sub.stage !== 'rejected' && sub.stage !== 'ingested' && (
                                <button
                                  onClick={() => setRejectionModalSubmission(sub)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400"
                                  title="Flag / Reject with Revision Notes"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Direct Ingest Single */}
                              {sub.stage === 'supervisor_approved' && (
                                <button
                                  onClick={() => handleIngestToActiveDataset([sub])}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm"
                                  title="Ingest into dataset"
                                >
                                  <Database className="w-3 h-3" />
                                  <span>Ingest</span>
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ENUMERATOR APPROVAL & SIGN-IN AUTHORIZATION VAULT GATE */}
      {/* ========================================================================= */}
      {activeTab === 'approval_vault' && (
        <SupervisorApprovalVaultTab
          fleet={fleet}
          onUpdateFleet={updatedFleet => {
            setFleet(updatedFleet);
            localStorage.setItem('datahub_enumerator_fleet_cache', JSON.stringify(updatedFleet));
          }}
          onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
          onOpenEditModal={agent => setEditingAgent(agent)}
          onLaunchPortal={agent => setPortalAgent(agent)}
          onShowToast={msg => showToast(msg)}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALL ENUMERATORS GATHERING ROSTER & LIVE FLEET COMMAND */}
      {/* ========================================================================= */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                All Enumerators Field Fleet Roster
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Monitor real-time beacons, survey quotas, GPS accuracy, and launch direct field mobile links.
              </p>
            </div>

            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Enumerator</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleet.map(agent => {
              const agentSubmissions = submissions.filter(s => s.enumeratorId === agent.id);
              const approvedCount = agentSubmissions.filter(s => s.stage === 'supervisor_approved' || s.stage === 'ingested').length;
              const rejectedCount = agentSubmissions.filter(s => s.stage === 'rejected').length;

              const statusColor = 
                agent.status === 'collecting' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                agent.status === 'transit' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                agent.status === 'sos' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' :
                'bg-slate-500/10 text-slate-400 border-slate-500/30';

              return (
                <div
                  key={agent.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Header: Avatar, Name, Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {agent.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{agent.name}</h4>
                          <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{agent.role}</p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                        {agent.status}
                      </span>
                    </div>

                    {/* Sector & Telemetry strip */}
                    <div className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                      isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Assigned Sector:</span>
                        <span className="font-semibold text-indigo-400 truncate max-w-[160px]">{agent.assignedZone}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Campaign:</span>
                        <span className={`font-medium truncate max-w-[160px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{agent.campaign}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Battery className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{agent.batteryLevel || 88}%</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                          <span>±{agent.accuracy || 4}m GPS</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Active Now</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] text-slate-400 block">Surveys</span>
                        <span className="font-bold text-white text-sm">{agentSubmissions.length}</span>
                      </div>
                      <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] text-emerald-400 block">Approved</span>
                        <span className="font-bold text-emerald-400 text-sm">{approvedCount}</span>
                      </div>
                      <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] text-rose-400 block">Rejected</span>
                        <span className="font-bold text-rose-400 text-sm">{rejectedCount}</span>
                      </div>
                    </div>

                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    
                    {/* Launch Mobile Field Portal */}
                    <button
                      onClick={() => setPortalAgent(agent)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-colors"
                      title="Open Live Mobile Device Collector for this Enumerator"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Field Portal</span>
                    </button>

                    {/* Dispatch Direct Order */}
                    <button
                      onClick={() => {
                        setDispatchAgentId(agent.id);
                        setIsDispatchModalOpen(true);
                      }}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      }`}
                      title="Send Urgent Instructions / Route"
                    >
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                    </button>

                    {/* Edit Agent */}
                    <button
                      onClick={() => setEditingAgent(agent)}
                      className={`p-2 rounded-xl border text-xs font-semibold transition-colors ${
                        isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      }`}
                      title="Edit Profile & Zone Assignment"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ANTI-FRAUD & INTEGRITY RADAR SHIELD */}
      {/* ========================================================================= */}
      {activeTab === 'fraud_shield' && (
        <SupervisorFraudShieldTab
          submissions={submissions}
          fleet={fleet}
          onApproveSubmission={handleApproveSubmission}
          onRejectSubmission={(subId, reason) => {
            const sub = submissions.find(s => s.id === subId);
            if (sub) {
              const updated = submissions.map(s => s.id === subId ? {
                ...s,
                stage: 'rejected' as const,
                supervisorNotes: reason,
                reviewedAt: new Date().toISOString(),
                reviewedBy: supervisorSession?.name || 'Lead Field Supervisor'
              } : s);
              setSubmissions(updated);
              saveStoredSupervisorSubmissions(updated);
              showToast(`Flagged submission ${sub.submissionCode} as fraud/rejected.`);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE FIELD TACTICAL RADAR & MAP */}
      {/* ========================================================================= */}
      {activeTab === 'tactical_radar' && (
        <SupervisorTacticalRadarTab
          submissions={submissions}
          fleet={fleet}
          onSelectSubmission={sub => setInspectingSubmission(sub)}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DAILY QUOTAS, FORM DEPLOYMENT & DISPATCH */}
      {/* ========================================================================= */}
      {activeTab === 'quota_dispatch' && (
        <SupervisorQuotaDispatchTab
          fleet={fleet}
          submissions={submissions}
          onDispatchUpdate={() => {
            showToast('Field quotas & dispatched revisions synced with fleet.');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NO-CODE CLEANING RECIPE BUILDER & AUTO-HEAL */}
      {/* ========================================================================= */}
      {activeTab === 'recipe_builder' && (
        <SupervisorRecipeBuilderTab
          submissions={submissions}
          onBatchCleaned={updatedSubs => {
            setSubmissions(updatedSubs);
            saveStoredSupervisorSubmissions(updatedSubs);
            showToast('Batch auto-healing recipes applied to submissions.');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 7: COMPLIANCE REGULATORY SIGN-OFF DOSSIER */}
      {/* ========================================================================= */}
      {activeTab === 'compliance_dossier' && (
        <SupervisorComplianceDossierTab
          submissions={submissions}
          supervisorSession={supervisorSession || {
            name: 'Field Operations Commander',
            badgeId: 'SUP-CMD-001',
            role: 'Lead Data Quality Supervisor',
            pin: '••••',
            lastLoginAt: new Date().toISOString(),
            securityLevel: 'LEVEL_3_ADMIN'
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIT ANALYTICS & VELOCITY CHARTS */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Velocity Overview */}
            <div className={`p-6 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Fleet Collection Velocity & Ingestion Pipeline
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Auto-Cleaned & Imputed</span>
                  <span className="font-mono font-bold text-cyan-400">{metrics.autoCleanedCount} records</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" 
                    style={{ width: `${metrics.totalSubmissions > 0 ? (metrics.autoCleanedCount / metrics.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Supervisor Certified & Ingested</span>
                  <span className="font-mono font-bold text-emerald-400">{metrics.ingestedCount + metrics.supervisorApprovedCount} records</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${metrics.totalSubmissions > 0 ? ((metrics.ingestedCount + metrics.supervisorApprovedCount) / metrics.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Flagged for Re-Interview</span>
                  <span className="font-mono font-bold text-rose-400">{metrics.rejectedCount} records</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full" 
                    style={{ width: `${metrics.totalSubmissions > 0 ? (metrics.rejectedCount / metrics.totalSubmissions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Enumerator Quality Leaderboard */}
            <div className={`p-6 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Enumerator Fidelity & Quality Leaderboard
              </h3>

              <div className="space-y-2">
                {fleet.map(f => {
                  const agentSubs = submissions.filter(s => s.enumeratorId === f.id);
                  const avgScore = agentSubs.length > 0 
                    ? Math.round(agentSubs.reduce((a, b) => a + b.qualityScore, 0) / agentSubs.length)
                    : 95;

                  return (
                    <div key={f.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                          {f.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold">{f.name}</p>
                          <p className="text-[10px] text-slate-400">{f.assignedZone}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-mono font-bold ${avgScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {avgScore}% Q-Score
                        </span>
                        <p className="text-[10px] text-slate-400">{agentSubs.length} submissions</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TEAM & FIELD COMMS */}
      {/* ========================================================================= */}
      {activeTab === 'team_chat' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Header Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-slate-900 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black tracking-tight">Supervisor & Field Comms Center</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    47 Counties Network
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Direct channels with County Supervisors, Field Enumerator dispatch, automated data cleaning alerts, and Central Admin Office HQ.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Dispatch Ready
              </span>
            </div>
          </div>

          {/* Embedded TeamMessenger */}
          <div className={`rounded-3xl border shadow-xl overflow-hidden min-h-[640px] ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
          }`}>
            <TeamMessenger
              datasets={datasets}
              activeDataset={activeDataset || null}
              onSelectDataset={() => {
                if (onNavigateToGrid) onNavigateToGrid();
              }}
              onNavigateToTab={(tab) => {
                if (tab === 'analysis' && onNavigateToAnalysis) onNavigateToAnalysis();
                if (tab === 'grid' && onNavigateToGrid) onNavigateToGrid();
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE RAW VS CLEANED INSPECTOR MODAL */}
      {/* ========================================================================= */}
      {inspectingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">{inspectingSubmission.submissionCode}</h3>
                    {renderStageBadge(inspectingSubmission.stage)}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enumerator: <strong className="text-indigo-400">{inspectingSubmission.enumeratorName}</strong> · Sector: {inspectingSubmission.assignedZone}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingSubmission(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Side by Side Comparison */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Quality & Geolocation banner */}
              <div className={`p-4 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-4 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className="text-[10px] text-slate-400 block">GPS Coordinates</span>
                  <span className="font-mono font-bold text-indigo-400">{inspectingSubmission.gps.lat.toFixed(4)}°, {inspectingSubmission.gps.lng.toFixed(4)}°</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Dwell Time</span>
                  <span className="font-mono font-bold text-cyan-400">{Math.round(inspectingSubmission.dwellTimeSeconds / 60 * 10) / 10} minutes</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Geofence Compliance</span>
                  <span className={`font-bold ${inspectingSubmission.gps.isInsideZone ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {inspectingSubmission.gps.isInsideZone ? 'Within Boundary' : `${inspectingSubmission.gps.distanceFromZoneCenterKm}km Offset`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Quality Score</span>
                  <span className="font-bold text-emerald-400">{inspectingSubmission.qualityScore}% (High Fidelity)</span>
                </div>
              </div>

              {/* AI Supervisor Verdict */}
              <div className={`p-4 rounded-2xl border ${
                inspectingSubmission.flags.length === 0
                  ? isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark ? 'bg-amber-950/20 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Supervisor AI Audit Verdict</span>
                </div>
                <p className="text-xs">{inspectingSubmission.aiQualityVerdict}</p>
              </div>

              {/* Side-by-Side Comparator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left: Raw Data */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-amber-400">
                      <Radio className="w-3.5 h-3.5" />
                      1. Raw Field Entry (Unsanitized)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">As Received</span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(inspectingSubmission.rawData).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800/40">
                        <span className="text-[11px] text-slate-400 font-mono">{k}:</span>
                        <span className="font-mono text-amber-300 truncate max-w-[180px]">{String(v === null ? 'null (missing)' : v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Cleaned Data */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
                    <span className="font-bold text-xs flex items-center gap-1.5 text-cyan-400">
                      <Wand2 className="w-3.5 h-3.5" />
                      2. Cleaned & Standardized Output
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Ready for Ingest</span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(inspectingSubmission.cleanedData).map(([k, v]) => {
                      const diff = inspectingSubmission.cleaningDiffs.find(d => d.field === k);
                      return (
                        <div key={k} className={`flex items-center justify-between p-2 rounded-lg border ${
                          diff 
                            ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-200' 
                            : 'bg-slate-900/50 border-slate-800/40'
                        }`}>
                          <span className="text-[11px] text-slate-400 font-mono">{k}:</span>
                          <div className="text-right">
                            <span className="font-mono font-bold text-white truncate max-w-[180px] block">{String(v)}</span>
                            {diff && (
                              <span className="text-[9px] text-cyan-400 block">{diff.ruleApplied}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectingSubmission(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Close Inspector
                </button>
              </div>

              <div className="flex items-center gap-2">
                {inspectingSubmission.stage !== 'rejected' && inspectingSubmission.stage !== 'ingested' && (
                  <button
                    onClick={() => {
                      setRejectionModalSubmission(inspectingSubmission);
                      setInspectingSubmission(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors"
                  >
                    Reject with Feedback
                  </button>
                )}

                {inspectingSubmission.stage !== 'supervisor_approved' && inspectingSubmission.stage !== 'ingested' && (
                  <button
                    onClick={() => handleApproveSubmission(inspectingSubmission.id)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors"
                  >
                    Approve Submission
                  </button>
                )}

                {inspectingSubmission.stage === 'supervisor_approved' && (
                  <button
                    onClick={() => {
                      handleIngestToActiveDataset([inspectingSubmission]);
                      setInspectingSubmission(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Ingest Clean Record into Dataset</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REJECTION NOTES FEEDBACK MODAL */}
      {/* ========================================================================= */}
      {rejectionModalSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Supervisor Revision & Rejection Notice</span>
            </div>

            <p className="text-xs text-slate-400">
              Provide feedback for <strong className="text-white">{rejectionModalSubmission.enumeratorName}</strong> regarding submission <strong className="text-indigo-400">{rejectionModalSubmission.submissionCode}</strong>:
            </p>

            <textarea
              value={rejectionNotes}
              onChange={e => setRejectionNotes(e.target.value)}
              placeholder="e.g. Geofence coordinates offset by 7.8km from assigned cluster. Please re-visit household and verify meter reading."
              rows={3}
              className={`w-full p-3 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectionModalSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
              >
                Confirm Rejection & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW ENUMERATOR MODAL */}
      <RegisterEnumeratorModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegistered={newAgent => {
          setFleet(prev => [newAgent, ...prev]);
          setIsRegisterModalOpen(false);
          showToast(`Successfully registered enumerator ${newAgent.name}!`);
        }}
      />

      {/* EDIT ENUMERATOR MODAL */}
      {editingAgent && (
        <EditEnumeratorModal
          isOpen={!!editingAgent}
          onClose={() => setEditingAgent(null)}
          agent={editingAgent}
          onUpdated={updatedAgent => {
            setFleet(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
            setEditingAgent(null);
            showToast(`Updated profile for ${updatedAgent.name}`);
          }}
        />
      )}

      {/* SUPERVISOR DISPATCH MODAL */}
      <SupervisorDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        fleet={fleet}
        selectedAgentId={dispatchAgentId}
        onDispatched={() => {
          setIsDispatchModalOpen(false);
          showToast('Supervisor dispatch instructions transmitted to field agents!');
        }}
      />

      {/* ENUMERATOR MOBILE FIELD PORTAL MODAL */}
      {portalAgent && (
        <EnumeratorFieldPortalModal
          isOpen={!!portalAgent}
          onClose={() => setPortalAgent(null)}
          agent={portalAgent}
          onSubmissionsUpdated={() => {
            refreshVault();
          }}
        />
      )}

      {/* SUPERVISOR SECURITY & CREDENTIAL MANAGEMENT MODAL */}
      <SupervisorSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        currentSession={supervisorSession}
        onLockVault={() => {
          setIsSecurityModalOpen(false);
          clearActiveSupervisorSession();
          setSupervisorSession(null);
          showToast('Supervisor Vault locked.');
        }}
        onSessionUpdated={updatedSession => {
          setSupervisorSession(updatedSession);
        }}
      />

      {/* SUPERVISOR MULTIMEDIA & EXIF EVIDENCE INSPECTOR MODAL */}
      <SupervisorMediaInspectorModal
        isOpen={!!mediaInspectingSub}
        onClose={() => setMediaInspectingSub(null)}
        submission={mediaInspectingSub}
        onApproveMedia={subId => {
          handleApproveSubmission(subId);
          showToast('Multimedia & audio proof verified by supervisor.');
        }}
      />

      {/* SUPERVISOR SEND CLEANED DATA TO CENTRAL ADMIN OFFICE MODAL */}
      <SupervisorSendToAdminModal
        isOpen={isSendToAdminModalOpen}
        onClose={() => setIsSendToAdminModalOpen(false)}
        supervisorSession={supervisorSession}
        submissions={submissions}
        onDispatchSuccess={(batch) => {
          showToast(`Batch ${batch.batchId} (${batch.recordCount} cleaned records) transmitted to Central Admin Office!`);
          refreshVault();
        }}
      />

    </div>
  );
};
