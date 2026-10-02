// Automated Fraud & Anomaly Shield Tab for Supervisor Vault
import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Flame,
  Search,
  Filter,
  Eye,
  Check,
  Send,
  Sparkles,
  Info
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { SupervisorSubmission } from '../../../utils/supervisorEngine';
import {
  FraudAnomalyFlag,
  FraudEngineStats,
  runFleetFraudAnalysis,
  computeFraudStats,
  updateAnomalyResolution
} from '../../../utils/supervisorFraudEngine';

interface SupervisorFraudShieldTabProps {
  submissions: SupervisorSubmission[];
  onInspectSubmission?: (sub: SupervisorSubmission) => void;
  onSendRevisionRequest?: (submissionId: string, enumeratorId: string, notes: string) => void;
}

export const SupervisorFraudShieldTab: React.FC<SupervisorFraudShieldTabProps> = ({
  submissions,
  onInspectSubmission,
  onSendRevisionRequest,
}) => {
  const { isDark } = useTheme();

  const [anomalies, setAnomalies] = useState<FraudAnomalyFlag[]>(() => runFleetFraudAnalysis(submissions));
  const [stats, setStats] = useState<FraudEngineStats>(() => computeFraudStats(submissions, anomalies));

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revisitModalFlag, setRevisitModalFlag] = useState<FraudAnomalyFlag | null>(null);
  const [revisitNotes, setRevisitNotes] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Re-run analysis when submissions change
  useEffect(() => {
    const fresh = runFleetFraudAnalysis(submissions);
    setAnomalies(fresh);
    setStats(computeFraudStats(submissions, fresh));
  }, [submissions]);

  const handleResolve = (flagId: string, status: FraudAnomalyFlag['resolutionStatus'], notes?: string) => {
    updateAnomalyResolution(flagId, status, notes);
    const updated = anomalies.map(a => a.id === flagId ? { ...a, resolutionStatus: status, supervisorNotes: notes ?? a.supervisorNotes } : a);
    setAnomalies(updated);
    setStats(computeFraudStats(submissions, updated));
    setToastMsg(`Flag ${status === 'confirmed_fraud' ? 'marked as Fraud' : status === 'cleared' ? 'cleared' : 'updated'}.`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleConfirmRevisit = () => {
    if (!revisitModalFlag) return;
    handleResolve(revisitModalFlag.id, 'sent_for_revisit', revisitNotes);
    if (onSendRevisionRequest) {
      onSendRevisionRequest(revisitModalFlag.submissionId, revisitModalFlag.enumeratorId, revisitNotes || 'Please revisit and re-conduct interview.');
    }
    setRevisitModalFlag(null);
    setRevisitNotes('');
  };

  // Filtered list
  const filtered = anomalies.filter(a => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && a.resolutionStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.submissionCode.toLowerCase().includes(q) ||
        a.enumeratorName.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-emerald-400 border border-emerald-500/40 shadow-xl flex items-center gap-2 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submissions Screened</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black">{stats.totalAnalyzed}</span>
            <span className="text-xs text-emerald-400 font-medium">100% real-time AI scan</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50/50 border-rose-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Critical Risk Flags</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-500">{stats.criticalFlags}</span>
            <span className="text-xs text-rose-400 font-medium">Require action</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/50 border-amber-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Total Anomalies</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-500">{stats.anomaliesDetected}</span>
            <span className="text-xs text-slate-400 font-medium">Rate: {stats.fraudRatePct}%</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revisits Dispatched</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-400">{stats.revisitRequestedCount}</span>
            <span className="text-xs text-slate-400 font-medium">To field units</span>
          </div>
        </div>
      </div>

      {/* Main Fraud Investigation Desk */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      } shadow-md space-y-6`}>
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Automated Anti-Cheat & Anomaly Radar</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {filtered.length} Flagged
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Multi-vector heuristic scanner checking GPS teleportation velocity, sub-45s dwell clicking, duplicate hashes, and synthetic entropy.
            </p>
          </div>

          {/* Quick Rescan Button */}
          <button
            id="fraud-shield-rescan-btn"
            onClick={() => {
              const fresh = runFleetFraudAnalysis(submissions);
              setAnomalies(fresh);
              setStats(computeFraudStats(submissions, fresh));
              setToastMsg('Heuristic anti-fraud pipeline re-executed across all submissions.');
              setTimeout(() => setToastMsg(null), 3000);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all self-start"
          >
            <Sparkles className="w-4 h-4" />
            <span>Re-Scan Fleet Telemetry</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, agent or flag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              } focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Anomaly Categories</option>
            <option value="speed_clicking">⚡ Speed-Clicking (&lt; 45s)</option>
            <option value="gps_teleportation">🚀 GPS Teleportation (&gt; 110 km/h)</option>
            <option value="duplicate_cloned_survey">🧬 Duplicate Cloned Payload</option>
            <option value="low_entropy_straightline">📏 Straight-Line Answers</option>
            <option value="geofence_spoofing">📍 Fake / Null Coordinates</option>
          </select>

          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Severities</option>
            <option value="critical">🔴 Critical Risk</option>
            <option value="high">🟠 High Risk</option>
            <option value="medium">🟡 Medium Risk</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">All Resolution Statuses</option>
            <option value="unresolved">⏳ Unresolved / Active</option>
            <option value="sent_for_revisit">🔄 Sent for Revisit</option>
            <option value="confirmed_fraud">❌ Confirmed Fraud</option>
            <option value="cleared">✅ Cleared / False Positive</option>
          </select>
        </div>

        {/* Anomaly Cards List */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-300">Zero Anomalies Matching Filter</p>
            <p className="text-xs text-slate-500">All submissions pass anti-fraud velocity, dwell, and entropy thresholds.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(flag => {
              const matchedSub = submissions.find(s => s.id === flag.submissionId);

              return (
                <div
                  key={flag.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    flag.severity === 'critical'
                      ? isDark ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700' : 'bg-rose-50/40 border-rose-200'
                      : isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Details & Evidence */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          flag.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : flag.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {flag.severity} RISK ({flag.confidencePct}% Conf)
                        </span>

                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {flag.submissionCode}
                        </span>

                        <span className="text-xs text-slate-400">
                          Agent: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{flag.enumeratorName}</strong>
                        </span>

                        {flag.resolutionStatus !== 'unresolved' && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            flag.resolutionStatus === 'cleared'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : flag.resolutionStatus === 'confirmed_fraud'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            Status: {flag.resolutionStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold">{flag.title}</h4>
                      <p className="text-xs text-slate-400">{flag.description}</p>

                      {/* Evidence Pill Grid */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {flag.evidence.map((ev, idx) => (
                          <div
                            key={idx}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                            }`}
                          >
                            <span className="text-slate-400">{ev.metricName}:</span>{' '}
                            <strong className="text-rose-400">{ev.observedValue}</strong>{' '}
                            <span className="text-slate-400 text-[10px]">(Expected {ev.expectedThreshold})</span>
                          </div>
                        ))}
                      </div>

                      {flag.supervisorNotes && (
                        <p className="text-xs text-amber-300 italic pt-1">
                          Supervisor Note: {flag.supervisorNotes}
                        </p>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      {matchedSub && onInspectSubmission && (
                        <button
                          onClick={() => onInspectSubmission(matchedSub)}
                          className={`p-2 rounded-xl text-xs font-semibold border ${
                            isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                          title="Open full Raw vs Clean inspection drawer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setRevisitModalFlag(flag)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Order Revisit</span>
                      </button>

                      <button
                        onClick={() => handleResolve(flag.id, 'confirmed_fraud')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Confirm Fraud</span>
                      </button>

                      <button
                        onClick={() => handleResolve(flag.id, 'cleared', 'Cleared as genuine field variance by supervisor.')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Clear Flag</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* REVISIT DISPATCH MODAL */}
      {revisitModalFlag && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Dispatch Revisit Directive</h3>
                  <p className="text-xs text-slate-400">To Agent: {revisitModalFlag.enumeratorName}</p>
                </div>
              </div>
              <button
                onClick={() => setRevisitModalFlag(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 rounded-xl text-xs font-mono border ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              Target Submission: <strong>{revisitModalFlag.submissionCode}</strong> ({revisitModalFlag.title})
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Supervisor Directive & Correction Instructions</label>
              <textarea
                rows={4}
                value={revisitNotes}
                onChange={e => setRevisitNotes(e.target.value)}
                placeholder="Specify what was incorrect (e.g. Dwell time too fast, please verify respondent GPS coordinates and crop yield units on-site)..."
                className={`w-full p-3 rounded-xl text-xs border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRevisitModalFlag(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevisit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Revisit Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
