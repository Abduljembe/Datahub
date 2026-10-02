import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  UserCheck,
  UserPlus,
  History,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Clock,
  Download,
  Copy,
  Check
} from 'lucide-react';
import {
  SupervisorSession,
  SupervisorAccount,
  SupervisorAuthAuditLog,
  getStoredSupervisorAccounts,
  getSupervisorAuthAuditLogs,
  updateSupervisorSecuritySettings,
  createNewSupervisorAccount,
  logSupervisorAuthEvent
} from '../../utils/supervisorAuthEngine';
import { useTheme } from '../../context/ThemeContext';

interface SupervisorSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: SupervisorSession | null;
  onLockVault: () => void;
  onSessionUpdated?: (updatedSession: SupervisorSession) => void;
}

type ModalTab = 'my_credentials' | 'audit_log' | 'team_supervisors' | 'add_supervisor';

export const SupervisorSecurityModal: React.FC<SupervisorSecurityModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onLockVault,
  onSessionUpdated
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<ModalTab>('my_credentials');

  // Accounts state
  const [accounts, setAccounts] = useState<SupervisorAccount[]>(() => getStoredSupervisorAccounts());
  const [auditLogs, setAuditLogs] = useState<SupervisorAuthAuditLog[]>(() => getSupervisorAuthAuditLogs());

  // Form states for updating current supervisor
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newName, setNewName] = useState(currentSession?.name || '');
  const [newPhone, setNewPhone] = useState('');
  const [showPass, setShowPass] = useState(false);

  // New supervisor account form
  const [newSupName, setNewSupName] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupRole, setNewSupRole] = useState('Senior Field Data Quality Supervisor');
  const [newSupRoleLevel, setNewSupRoleLevel] = useState<'chief_supervisor' | 'quality_auditor' | 'regional_director'>('quality_auditor');
  const [newSupBadge, setNewSupBadge] = useState(`SV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newSupPass, setNewSupPass] = useState('');
  const [newSupPin, setNewSupPin] = useState('');
  const [newSupJurisdiction, setNewSupJurisdiction] = useState('Sector East & Rural Zone 4');
  const [newSupDept, setNewSupDept] = useState('Field Integrity Division');

  // Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccounts(getStoredSupervisorAccounts());
      setAuditLogs(getSupervisorAuthAuditLogs());
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateMyCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentSession) return;

    if (newPasskey && newPasskey !== confirmPasskey) {
      setErrorMsg('The new passkeys do not match.');
      return;
    }

    if (newPin && (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin))) {
      setErrorMsg('Supervisor PIN must be between 4 and 6 numeric digits.');
      return;
    }

    const res = updateSupervisorSecuritySettings(
      currentSession.supervisorId,
      newPasskey || undefined,
      newPin || undefined,
      newName || undefined,
      newPhone || undefined
    );

    if (res.success) {
      setSuccessMsg('Supervisor credentials and security keys updated successfully!');
      setAccounts(getStoredSupervisorAccounts());
      setAuditLogs(getSupervisorAuthAuditLogs());
      setNewPasskey('');
      setConfirmPasskey('');
      setNewPin('');
    } else {
      setErrorMsg(res.error || 'Failed to update credentials.');
    }
  };

  const handleCreateSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newSupName || !newSupEmail || !newSupPass || !newSupPin) {
      setErrorMsg('Please complete all mandatory supervisor registration fields.');
      return;
    }

    if (newSupPin.length < 4 || !/^\d+$/.test(newSupPin)) {
      setErrorMsg('Supervisor PIN must be at least 4 digits.');
      return;
    }

    const res = createNewSupervisorAccount({
      name: newSupName.trim(),
      email: newSupEmail.trim().toLowerCase(),
      role: newSupRole,
      roleLevel: newSupRoleLevel,
      badgeId: newSupBadge.trim().toUpperCase(),
      secretPasskey: newSupPass.trim(),
      securityPin: newSupPin.trim(),
      assignedJurisdiction: newSupJurisdiction,
      department: newSupDept,
      avatarGradient: 'from-purple-600 via-indigo-600 to-blue-700'
    });

    if (res.success) {
      setSuccessMsg(`Supervisor ${newSupName} registered successfully with Badge ID ${newSupBadge}!`);
      setAccounts(getStoredSupervisorAccounts());
      setAuditLogs(getSupervisorAuthAuditLogs());
      setNewSupName('');
      setNewSupEmail('');
      setNewSupPass('');
      setNewSupPin('');
      setNewSupBadge(`SV-${Math.floor(1000 + Math.random() * 9000)}`);
      setActiveTab('team_supervisors');
    } else {
      setErrorMsg(res.error || 'Failed to create supervisor.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAuditLogs = () => {
    const jsonStr = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supervisor_auth_audit_log_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
        isDark ? 'bg-slate-900 border-indigo-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Supervisor Security & Access Vault</h3>
              <p className="text-xs text-indigo-300">
                Logged in as <strong className="text-white">{currentSession?.name}</strong> ({currentSession?.badgeId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLockVault}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white flex items-center gap-1.5 border border-rose-500/40 shadow-sm transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Vault</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`grid grid-cols-4 border-b text-xs font-semibold ${
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={() => { setActiveTab('my_credentials'); setSuccessMsg(null); setErrorMsg(null); }}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'my_credentials'
                ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>My Security Keys</span>
          </button>

          <button
            onClick={() => { setActiveTab('team_supervisors'); setSuccessMsg(null); setErrorMsg(null); }}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'team_supervisors'
                ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Supervisor Directory</span>
          </button>

          <button
            onClick={() => { setActiveTab('add_supervisor'); setSuccessMsg(null); setErrorMsg(null); }}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'add_supervisor'
                ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Co-Supervisor</span>
          </button>

          <button
            onClick={() => { setActiveTab('audit_log'); setSuccessMsg(null); setErrorMsg(null); }}
            className={`py-3 px-3 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'audit_log'
                ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Access Audit Log</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: MY CREDENTIALS */}
          {activeTab === 'my_credentials' && (
            <form onSubmit={handleUpdateMyCredentials} className="space-y-4 max-w-xl">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-indigo-100">Confidential Supervisory Credentials</p>
                  <p className="mt-0.5">
                    Only supervisors with these credentials can bypass the lock screen and access the central ingestion stream and raw data pipelines.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300">Supervisor Official Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">
                    New Secret Passkey (Leave blank to keep current)
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPasskey}
                      onChange={e => setNewPasskey(e.target.value)}
                      placeholder="Enter new passkey"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">
                    Confirm New Passkey
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirmPasskey}
                    onChange={e => setConfirmPasskey(e.target.value)}
                    placeholder="Repeat new passkey"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-300">
                  New 4 to 6-Digit Quick Access PIN
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="e.g. 9922"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Used for fast dialpad unlock on field supervisor tablets.</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
                >
                  Save Security Updates
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SUPERVISOR ROSTER */}
          {activeTab === 'team_supervisors' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Authorized field supervisors permitted to unlock and manage this vault:
                </p>
                <span className="text-xs font-mono text-indigo-400">{accounts.length} Active Officers</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.map(acc => (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${acc.avatarGradient} text-white flex items-center justify-center font-bold text-xs`}>
                          {acc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold">{acc.name}</h4>
                          <span className="text-[10px] font-mono text-indigo-400">{acc.badgeId}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {acc.roleLevel}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">{acc.role}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{acc.email}</p>
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>PIN: ••••</span>
                      <span>Jurisdiction: {acc.assignedJurisdiction}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ADD NEW SUPERVISOR */}
          {activeTab === 'add_supervisor' && (
            <form onSubmit={handleCreateSupervisor} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">Supervisor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newSupName}
                    onChange={e => setNewSupName(e.target.value)}
                    placeholder="e.g. Commander Arthur Pendelton"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">Official Supervisor Email *</label>
                  <input
                    type="email"
                    required
                    value={newSupEmail}
                    onChange={e => setNewSupEmail(e.target.value)}
                    placeholder="e.g. arthur.p@datahub.io"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">Badge ID</label>
                  <input
                    type="text"
                    value={newSupBadge}
                    onChange={e => setNewSupBadge(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">Role Level</label>
                  <select
                    value={newSupRoleLevel}
                    onChange={e => setNewSupRoleLevel(e.target.value as any)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="quality_auditor">Data Quality Auditor</option>
                    <option value="regional_director">Regional Field Commander</option>
                    <option value="chief_supervisor">Chief Operations Director</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">Initial Secret Passkey *</label>
                  <input
                    type="text"
                    required
                    value={newSupPass}
                    onChange={e => setNewSupPass(e.target.value)}
                    placeholder="e.g. FieldSecure#2026"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-300">4-Digit Security PIN *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newSupPin}
                    onChange={e => setNewSupPin(e.target.value)}
                    placeholder="e.g. 5566"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md transition-all"
                >
                  Commission Supervisor Account
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: AUDIT LOG */}
          {activeTab === 'audit_log' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Real-time supervisory access attempts, lockouts, and vault security transitions:
                </p>
                <button
                  onClick={handleExportAuditLogs}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Audit JSON</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No access events logged in this session.
                  </div>
                ) : (
                  auditLogs.slice(0, 15).map(log => (
                    <div key={log.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          log.status === 'granted' ? 'bg-emerald-400' : log.status === 'warn' ? 'bg-amber-400' : 'bg-rose-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{log.action.replace('_', ' ').toUpperCase()}</span>
                            <span className="font-mono text-[10px] text-slate-400">({log.authMethod})</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300">
                              {log.identifier}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{log.details}</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
