import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Activity,
  FileCheck2,
  Terminal,
  Zap,
  Clock,
  Download,
  Trash2,
  Fingerprint,
  Radio,
  Server
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dataset, UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
  getSecurityConfig,
  saveSecurityConfig,
  getSecurityAuditLogs,
  logSecurityEvent,
  verifyMasterSecurityPin,
  setMasterSecurityPin,
  sealDataset,
  verifyDatasetIntegrity,
  WorkstationSecurityConfig,
  SecurityAuditEntry
} from '../../utils/securityEngine';

interface SecurityShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset | null;
  onUpdateDataset: (updated: Dataset) => void;
  currentUser: UserProfile | null;
}

export const SecurityShieldModal: React.FC<SecurityShieldModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  currentUser
}) => {
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'overview' | 'audit_log' | 'pin_settings'>('overview');
  const [config, setConfig] = useState<WorkstationSecurityConfig>(getSecurityConfig);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditEntry[]>(getSecurityAuditLogs);

  // Verification & Seal status for active dataset
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isIntact: boolean;
    computedHash: string;
    sealedHash?: string;
    message: string;
  } | null>(null);

  // PIN settings state
  const [enteredPin, setEnteredPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Lockdown switch modal state
  const [lockdownPinInput, setLockdownPinInput] = useState('');
  const [isLockdownPromptOpen, setIsLockdownPromptOpen] = useState(false);
  const [lockdownError, setLockdownError] = useState('');

  // Server health & threat count
  const [serverStats, setServerStats] = useState<{
    threatsBlockedCount: number;
    totalAuditEvents: number;
    shieldStatus: string;
    protectionGrade: string;
  }>({
    threatsBlockedCount: 0,
    totalAuditEvents: 0,
    shieldStatus: 'active',
    protectionGrade: 'A+'
  });

  // Load config & server stats on open
  useEffect(() => {
    if (isOpen) {
      const cfg = getSecurityConfig();
      setConfig(cfg);
      setAuditLogs(getSecurityAuditLogs());

      // Fetch server-side security telemetry
      fetch('/api/security/status')
        .then(res => res.json())
        .then(data => {
          if (data && data.shieldStatus) {
            setServerStats({
              threatsBlockedCount: data.threatsBlockedCount || 0,
              totalAuditEvents: data.totalAuditEvents || 0,
              shieldStatus: data.shieldStatus,
              protectionGrade: data.protectionGrade || 'A+'
            });
          }
        })
        .catch(() => {});

      // Verify active dataset checksum
      if (dataset) {
        verifyDatasetIntegrity(dataset).then(res => {
          setVerificationResult(res);
        });
      }
    }
  }, [isOpen, dataset?.id]);

  if (!isOpen) return null;

  // Handle Sealing the Dataset with SHA-256
  const handleSealDataset = async () => {
    if (!dataset) return;
    setIsVerifying(true);
    try {
      const sealed = await sealDataset(dataset, currentUser?.email || 'Central Admin');
      onUpdateDataset(sealed);
      const res = await verifyDatasetIntegrity(sealed);
      setVerificationResult(res);
      setAuditLogs(getSecurityAuditLogs());
      try {
        confetti({ particleCount: 30, spread: 50 });
      } catch {}
    } finally {
      setIsVerifying(false);
    }
  };

  // Toggle Emergency Lockdown
  const handleToggleLockdown = async () => {
    // If enabling or disabling, require Master PIN confirmation
    const valid = await verifyMasterSecurityPin(lockdownPinInput);
    if (!valid) {
      setLockdownError('Invalid Master PIN. Authorization denied.');
      return;
    }

    const nextState = !config.emergencyLockdown;
    const updated = saveSecurityConfig({
      emergencyLockdown: nextState,
      lastLockdownAt: new Date().toISOString(),
      lockdownReason: nextState ? 'Manual Emergency Lockdown engaged by Administrator' : undefined
    });

    setConfig(updated);
    setIsLockdownPromptOpen(false);
    setLockdownPinInput('');
    setLockdownError('');

    logSecurityEvent({
      eventType: nextState ? 'lockdown_engaged' : 'lockdown_released',
      severity: nextState ? 'critical' : 'info',
      userEmail: currentUser?.email,
      actionDetails: nextState
        ? 'EMERGENCY LOCKDOWN ENGAGED: Entire workstation frozen in read-only mode.'
        : 'Emergency Lockdown released by verified Administrator.',
      status: 'allowed'
    });
    setAuditLogs(getSecurityAuditLogs());
  };

  // Set / Change Master PIN
  const handleSavePin = async () => {
    if (newPin.length < 4 || newPin.length > 8) {
      setPinMessage({ text: 'PIN must be between 4 and 8 digits.', type: 'error' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ text: 'PINs do not match.', type: 'error' });
      return;
    }

    // Verify current PIN if one was already set
    if (config.masterPinHash) {
      const isCurrentValid = await verifyMasterSecurityPin(enteredPin);
      if (!isCurrentValid) {
        setPinMessage({ text: 'Current PIN is incorrect.', type: 'error' });
        return;
      }
    }

    const success = await setMasterSecurityPin(newPin);
    if (success) {
      const updated = getSecurityConfig();
      setConfig(updated);
      setNewPin('');
      setConfirmPin('');
      setEnteredPin('');
      setPinMessage({ text: 'Master Security PIN successfully saved and hashed with SHA-256.', type: 'success' });
      setAuditLogs(getSecurityAuditLogs());
      setTimeout(() => setPinMessage(null), 4000);
    }
  };

  // Export Security Audit Log as JSON
  const handleExportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `datahub_security_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
      }`}>
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          config.emergencyLockdown 
            ? 'bg-rose-950/40 border-rose-800/80' 
            : isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${
              config.emergencyLockdown
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}>
              {config.emergencyLockdown ? (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Workstation Security Shield & Anti-Tamper Engine
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border ${
                  config.emergencyLockdown
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {config.emergencyLockdown ? '🚨 EMERGENCY LOCKDOWN' : 'GRADE A+ ENFORCED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cryptographic SHA-256 dataset seals, SSRF cloud firewall, rate limiters, and anti-tamper safeguards.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-4 bg-slate-950/40 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Protection Matrix & Seals</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_log')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'audit_log'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Security Audit Log</span>
            <span className="px-1.5 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
              {auditLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pin_settings')}
            className={`px-4 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pin_settings'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Master PIN & Lockdown</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: OVERVIEW & CRYPTOGRAPHIC SEALS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Emergency Lockdown Notice Banner (if active) */}
              {config.emergencyLockdown && (
                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                      Workstation is Under Emergency Lockdown
                    </h3>
                    <p className="text-xs text-rose-300/90 mt-1">
                      All mutating actions (uploading, editing, deleting records, executing recipes) are completely frozen to prevent any unauthorized interference.
                    </p>
                    <button
                      onClick={() => setIsLockdownPromptOpen(true)}
                      className="mt-2.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Release Lockdown (Requires Master PIN)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Cryptographic Dataset Integrity Seal */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                      <Fingerprint className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Cryptographic SHA-256 Dataset Seal
                      </h3>
                      <p className="text-xs text-slate-400">
                        Generates an immutable cryptographic hash of all columns and rows to detect any background tampering.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSealDataset}
                    disabled={isVerifying || !dataset}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>{dataset?.securitySeal ? 'Re-Compute & Verify SHA-256' : 'Seal Active Dataset Now'}</span>
                  </button>
                </div>

                {dataset ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Target Dataset</div>
                      <div className="text-xs font-bold text-white mt-0.5 truncate">{dataset.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        {dataset.data.length.toLocaleString()} rows • {dataset.columns.length} columns
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                      <div className="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
                        <span>Integrity Status</span>
                        {verificationResult && (
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                            verificationResult.isIntact
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300 animate-pulse'
                          }`}>
                            {verificationResult.isIntact ? 'VERIFIED INTACT' : 'TAMPER DETECTED'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-cyan-300 mt-1 break-all">
                        {verificationResult?.computedHash 
                          ? `${verificationResult.computedHash.substring(0, 32)}...` 
                          : 'Pending calculation...'}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {verificationResult?.message || 'Ready for verification.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">No dataset currently active to seal.</div>
                )}
              </div>

              {/* 2. Active Protection Matrix Strip */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enforced Security Subsystems
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  {/* Layer 1: SSRF Firewall */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Server className="w-3.5 h-3.5 text-indigo-400" />
                        <span>SSRF & Metadata Firewall</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Blocks internal IP ranges (10.x, 127.x, 192.168.x) and Cloud Instance Metadata (169.254.169.254).
                    </p>
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      Enforced on /api/*
                    </span>
                  </div>

                  {/* Layer 2: Rate Limiting */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Anti-Brute Force Limiter</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Sliding-window IP throttling throttles rapid bot attacks, brute-force requests, and automated scraping.
                    </p>
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      30 req/min Threshold
                    </span>
                  </div>

                  {/* Layer 3: Role-Based Access Control */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Role-Based Access Guard</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Strict operational privilege segregation between Central Admins, Field Supervisors, and Enumerators.
                    </p>
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      Active Role: {currentUser?.role || 'Admin'}
                    </span>
                  </div>

                  {/* Layer 4: HTTP Security Headers */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Terminal className="w-3.5 h-3.5 text-purple-400" />
                        <span>HTTP Security Headers</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Nosniff, X-Frame-Options SAMEORIGIN, XSS-Protection, and strict Content-Security policies.
                    </p>
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      Browser Protection Active
                    </span>
                  </div>

                  {/* Layer 5: Master PIN Protection */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Master Security PIN</span>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${config.masterPinHash ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {config.masterPinHash ? 'Hashed Master PIN active for destructive operations.' : 'Default PIN (1234) active. Update in PIN Settings.'}
                    </p>
                    <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border ${
                      config.masterPinHash 
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                    }`}>
                      {config.masterPinHash ? 'PIN Configured' : 'Needs Custom PIN'}
                    </span>
                  </div>

                  {/* Layer 6: Inactivity Auto-Lock */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Inactivity Auto-Lock</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Automatically secures active screen sessions when unattended.
                    </p>
                    <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                      {config.autoLockMinutes > 0 ? `${config.autoLockMinutes} Minutes` : 'Disabled'}
                    </span>
                  </div>

                </div>
              </div>

              {/* 3. Emergency Lockdown Quick Trigger */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Emergency Threat Lockdown Switch</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immediately freeze all dataset editing and ingestion across all devices if suspicious activity is detected.
                  </p>
                </div>

                <button
                  onClick={() => setIsLockdownPromptOpen(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                    config.emergencyLockdown
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                  }`}
                >
                  {config.emergencyLockdown ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{config.emergencyLockdown ? 'Release Lockdown' : 'Engage Emergency Lockdown'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: LIVE SECURITY AUDIT LOG */}
          {activeTab === 'audit_log' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Security Event Audit Log ({auditLogs.length} events)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cryptographic signature events, PIN checks, SSRF blocks, and tamper alerts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportAuditLogs}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                      log.severity === 'critical'
                        ? 'bg-rose-950/30 border-rose-800/60'
                        : log.severity === 'warning'
                        ? 'bg-amber-950/30 border-amber-800/60'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {log.severity === 'critical' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        ) : log.severity === 'warning' ? (
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white capitalize">
                            {log.eventType.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                            log.status === 'blocked'
                              ? 'bg-rose-500/20 text-rose-300'
                              : log.status === 'flagged'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          {log.actionDetails}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MASTER PIN & SETTINGS */}
          {activeTab === 'pin_settings' && (
            <div className="max-w-xl space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Master Security PIN Configuration</h3>
                <p className="text-xs text-slate-400">
                  The Master PIN is required to authorize critical destructive actions such as deleting datasets, engaging emergency lockdown, or modifying user role privileges.
                </p>
              </div>

              {pinMessage && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  pinMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}>
                  {pinMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{pinMessage.text}</span>
                </div>
              )}

              <div className="space-y-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
                {config.masterPinHash && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Current Master PIN
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={enteredPin}
                      onChange={e => setEnteredPin(e.target.value)}
                      placeholder="Enter existing PIN"
                      maxLength={8}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    New Master PIN (4 to 8 digits)
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-8 digit new PIN"
                    maxLength={8}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Confirm New Master PIN
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter new PIN"
                    maxLength={8}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? 'Hide PIN' : 'Show PIN'}</span>
                  </button>

                  <button
                    onClick={handleSavePin}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                  >
                    Save & Hash Master PIN
                  </button>
                </div>
              </div>

              {/* Inactivity Auto-Lock Config */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Inactivity Auto-Lock Period</h4>
                    <p className="text-[11px] text-slate-400">Lock workstation session after user becomes idle.</p>
                  </div>
                  <select
                    value={config.autoLockMinutes}
                    onChange={e => {
                      const mins = parseInt(e.target.value, 10);
                      const updated = saveSecurityConfig({ autoLockMinutes: mins });
                      setConfig(updated);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={0}>Disabled</option>
                    <option value={5}>5 Minutes</option>
                    <option value={15}>15 Minutes (Recommended)</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                  </select>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Cryptographic Defense Layer Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
          >
            Close Security Shield
          </button>
        </div>

      </div>

      {/* Confirmation Dialog for Emergency Lockdown */}
      {isLockdownPromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                config.emergencyLockdown ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {config.emergencyLockdown ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold">
                  {config.emergencyLockdown ? 'Release Emergency Lockdown' : 'Authorize Emergency Lockdown'}
                </h3>
                <p className="text-xs text-slate-400">
                  {config.emergencyLockdown 
                    ? 'Workstation will return to standard operational mode.' 
                    : 'All dataset mutations will be immediately frozen across the platform.'}
                </p>
              </div>
            </div>

            {lockdownError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                {lockdownError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Enter Master Security PIN
              </label>
              <input
                type="password"
                value={lockdownPinInput}
                onChange={e => {
                  setLockdownPinInput(e.target.value);
                  setLockdownError('');
                }}
                placeholder="Enter PIN (Default: 1234)"
                maxLength={8}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsLockdownPromptOpen(false);
                  setLockdownPinInput('');
                  setLockdownError('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleLockdown}
                disabled={!lockdownPinInput}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md disabled:opacity-40 ${
                  config.emergencyLockdown
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                {config.emergencyLockdown ? 'Confirm Release' : 'Confirm Lockdown'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
