import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Lock,
  Unlock,
  Sparkles,
  Smartphone,
  MapPin,
  Mail,
  Phone,
  KeyRound,
  FileCheck,
  Award,
  Layers,
  ChevronRight,
  Send,
  Sliders,
  Check
} from 'lucide-react';
import {
  EnumeratorAgent,
  approveEnumerator,
  rejectEnumerator,
  suspendEnumerator,
  reinstateEnumerator,
  submitEnumeratorHiringApplication
} from '../../../utils/enumeratorFleetEngine';

interface SupervisorApprovalVaultTabProps {
  fleet: EnumeratorAgent[];
  onUpdateFleet: (updatedFleet: EnumeratorAgent[]) => void;
  onOpenRegisterModal: () => void;
  onOpenEditModal: (agent: EnumeratorAgent) => void;
  onLaunchPortal: (agent: EnumeratorAgent) => void;
  onShowToast: (msg: string) => void;
}

export const SupervisorApprovalVaultTab: React.FC<SupervisorApprovalVaultTabProps> = ({
  fleet,
  onUpdateFleet,
  onOpenRegisterModal,
  onOpenEditModal,
  onLaunchPortal,
  onShowToast,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'approved' | 'suspended' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectingAgent, setRejectingAgent] = useState<EnumeratorAgent | null>(null);
  const [suspendingAgent, setSuspendingAgent] = useState<EnumeratorAgent | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Group counts
  const pendingCount = fleet.filter(a => a.approvalStatus === 'pending_approval').length;
  const approvedCount = fleet.filter(a => a.approvalStatus === 'approved' || !a.approvalStatus).length;
  const suspendedCount = fleet.filter(a => a.approvalStatus === 'suspended').length;
  const rejectedCount = fleet.filter(a => a.approvalStatus === 'rejected').length;

  const filteredFleet = fleet.filter(agent => {
    const status = agent.approvalStatus || 'approved';
    if (filterMode !== 'all' && status !== filterMode) {
      if (filterMode === 'approved' && status !== 'approved') return false;
      if (filterMode !== 'approved' && status !== filterMode) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        agent.name.toLowerCase().includes(q) ||
        agent.email.toLowerCase().includes(q) ||
        (agent.badgeNumber && agent.badgeNumber.toLowerCase().includes(q)) ||
        agent.role.toLowerCase().includes(q) ||
        agent.assignedZone.toLowerCase().includes(q) ||
        agent.campaign.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Action: Approve
  const handleApprove = async (agent: EnumeratorAgent) => {
    setIsProcessing(agent.id);
    try {
      await approveEnumerator(agent.id, 'Lead Field Supervisor (Vault Commander)');
      const updated = fleet.map(a => {
        if (a.id === agent.id) {
          return {
            ...a,
            approvalStatus: 'approved' as const,
            approvedAt: new Date().toISOString(),
            approvedBy: 'Lead Field Supervisor (Vault Commander)',
            badgeNumber: a.badgeNumber?.startsWith('PENDING') ? `ENUM-2026-${Math.floor(1000 + Math.random() * 9000)}` : (a.badgeNumber || `ENUM-2026-8800`),
            status: 'idle' as const,
            rejectionReason: undefined
          };
        }
        return a;
      });
      onUpdateFleet(updated);
      onShowToast(`Authorized & Activated login for ${agent.name}!`);
    } catch {
      onShowToast(`Failed to approve ${agent.name}`);
    } finally {
      setIsProcessing(null);
    }
  };

  // Action: Confirm Rejection
  const handleConfirmReject = async () => {
    if (!rejectingAgent) return;
    setIsProcessing(rejectingAgent.id);
    const reason = actionReason.trim() || 'Did not meet field verification requirements';
    try {
      await rejectEnumerator(rejectingAgent.id, reason, 'Lead Field Supervisor');
      const updated = fleet.map(a => {
        if (a.id === rejectingAgent.id) {
          return {
            ...a,
            approvalStatus: 'rejected' as const,
            rejectionReason: reason,
            status: 'offline' as const
          };
        }
        return a;
      });
      onUpdateFleet(updated);
      onShowToast(`Rejected application for ${rejectingAgent.name}.`);
      setRejectingAgent(null);
      setActionReason('');
    } catch {
      onShowToast('Failed to reject application');
    } finally {
      setIsProcessing(null);
    }
  };

  // Action: Confirm Suspension
  const handleConfirmSuspend = async () => {
    if (!suspendingAgent) return;
    setIsProcessing(suspendingAgent.id);
    const reason = actionReason.trim() || 'Temporary security hold by supervisor';
    try {
      await suspendEnumerator(suspendingAgent.id, reason, 'Lead Field Supervisor');
      const updated = fleet.map(a => {
        if (a.id === suspendingAgent.id) {
          return {
            ...a,
            approvalStatus: 'suspended' as const,
            rejectionReason: reason,
            status: 'offline' as const
          };
        }
        return a;
      });
      onUpdateFleet(updated);
      onShowToast(`Suspended login access for ${suspendingAgent.name}.`);
      setSuspendingAgent(null);
      setActionReason('');
    } catch {
      onShowToast('Failed to suspend credentials');
    } finally {
      setIsProcessing(null);
    }
  };

  // Action: Reinstate
  const handleReinstate = async (agent: EnumeratorAgent) => {
    setIsProcessing(agent.id);
    try {
      await reinstateEnumerator(agent.id, 'Lead Field Supervisor');
      const updated = fleet.map(a => {
        if (a.id === agent.id) {
          return {
            ...a,
            approvalStatus: 'approved' as const,
            rejectionReason: undefined,
            approvedAt: new Date().toISOString(),
            status: 'idle' as const
          };
        }
        return a;
      });
      onUpdateFleet(updated);
      onShowToast(`Reinstated credentials for ${agent.name}.`);
    } catch {
      onShowToast('Failed to reinstate');
    } finally {
      setIsProcessing(null);
    }
  };

  // Demo: Add candidate to show gate live
  const handleSpawnDemoCandidate = async () => {
    const candidateNames = [
      { name: 'Tariq Al-Mansoor', email: 'tariq.mansoor@field-survey.org', role: 'Crop Assessor', zone: 'Sector A (Valley West)', campaign: 'Global Crop Yield & Soil Audit' },
      { name: 'Chloe Dubois', email: 'chloe.dubois@health-metrics.org', role: 'Health Surveyor', zone: 'Sector B (Metro Central)', campaign: 'Community Health & Maternal Survey' },
      { name: 'Mateo Rossi', email: 'mateo.rossi@urban-geo.org', role: 'Infrastructure Auditor', zone: 'Sector C (South District)', campaign: 'Municipal Water Grid Audit' }
    ];
    const pick = candidateNames[Math.floor(Math.random() * candidateNames.length)];
    const candidate = await submitEnumeratorHiringApplication({
      name: `${pick.name} (${Math.floor(100 + Math.random() * 900)})`,
      email: `${pick.email.split('@')[0]}_${Date.now()}@field.org`,
      phone: '+1 (555) 019-9' + Math.floor(10 + Math.random() * 89),
      role: pick.role,
      campaign: pick.campaign,
      assignedZone: pick.zone,
      notes: 'Fresh applicant submitted via Field Hiring Portal. Awaiting supervisor approval.'
    });

    onUpdateFleet([candidate, ...fleet]);
    setFilterMode('pending');
    onShowToast(`Added hired candidate ${candidate.name} to Pending Approval Queue!`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Protocol Notice */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Enumerator Authorization & Access Control Vault
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Gatekeeper Active
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
              Strict Field Security Protocol: All hired enumerators are registered under this Supervisor Vault. Enumerators cannot log in or access data collection portals without explicit supervisor approval.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSpawnDemoCandidate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all shadow-sm"
            title="Simulate a new hired enumerator submitting an application"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Hired Applicant</span>
          </button>
          
          <button
            onClick={onOpenRegisterModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register & Authorize Agent</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        {/* Pending Card */}
        <button
          onClick={() => setFilterMode('pending')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
            filterMode === 'pending'
              ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Pending Vetting
            </span>
            {pendingCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting supervisor sign-off</div>
        </button>

        {/* Approved Active Card */}
        <button
          onClick={() => setFilterMode('approved')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterMode === 'approved'
              ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved Active
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{approvedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Full sign-in & field access</div>
        </button>

        {/* Suspended Card */}
        <button
          onClick={() => setFilterMode('suspended')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterMode === 'suspended'
              ? 'bg-orange-500/15 border-orange-500/50 shadow-lg shadow-orange-500/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Suspended Access
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{suspendedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Login credentials locked</div>
        </button>

        {/* Rejected Card */}
        <button
          onClick={() => setFilterMode('rejected')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            filterMode === 'rejected'
              ? 'bg-rose-500/15 border-rose-500/50 shadow-lg shadow-rose-500/10'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5" />
              Declined / Ineligible
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{rejectedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Hiring application denied</div>
        </button>

      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterMode(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                filterMode === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab === 'all' && `All Enumerators (${fleet.length})`}
              {tab === 'pending' && `Pending Approval (${pendingCount})`}
              {tab === 'approved' && `Approved Fleet (${approvedCount})`}
              {tab === 'suspended' && `Suspended (${suspendedCount})`}
              {tab === 'rejected' && `Declined (${rejectedCount})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate, badge, zone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

      </div>

      {/* Enumerators Roster Cards / Table */}
      <div className="space-y-3">
        {filteredFleet.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No Enumerators Found in this View</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {filterMode === 'pending'
                ? 'Great job! All hired enumerators have been reviewed and authorized.'
                : 'No enumerator profiles match the current filter or search criteria.'}
            </p>
          </div>
        ) : (
          filteredFleet.map(agent => {
            const status = agent.approvalStatus || 'approved';
            const isPending = status === 'pending_approval';
            const isApproved = status === 'approved';
            const isSuspended = status === 'suspended';
            const isRejected = status === 'rejected';

            return (
              <div
                key={agent.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isPending
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20'
                    : isSuspended
                    ? 'bg-orange-950/20 border-orange-500/40'
                    : isRejected
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  
                  {/* Left: Agent Info */}
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                      isPending
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : isApproved
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isSuspended
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {agent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                        
                        {/* Status Tag */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isPending
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : isSuspended
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {status.replace('_', ' ')}
                        </span>

                        {/* Badge Number */}
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                          {agent.badgeNumber || 'PENDING-APP'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-300">{agent.email}</span>
                        </span>
                        {agent.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{agent.phone}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-indigo-300">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          <span>{agent.role}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{agent.assignedZone}</span>
                        </span>
                      </div>

                      {/* Notes / Reason */}
                      {agent.rejectionReason && (
                        <p className="text-[11px] text-rose-400 pt-1">
                          <strong>Supervisor Note:</strong> {agent.rejectionReason}
                        </p>
                      )}
                      {agent.notes && !agent.rejectionReason && (
                        <p className="text-[11px] text-slate-400 pt-0.5 italic">
                          "{agent.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Technical Credentials & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                    
                    {/* Device & Pin Tag */}
                    <div className="hidden sm:flex flex-col items-end text-[10px] text-slate-400 pr-2 font-mono">
                      <span>Device: {agent.deviceHardwareId || 'Unassigned'}</span>
                      <span>PIN: {agent.accessPin || '****'}</span>
                    </div>

                    {/* Pending Action Buttons */}
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleApprove(agent)}
                          disabled={isProcessing === agent.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Grant Sign-In</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setRejectingAgent(agent);
                            setActionReason('');
                          }}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {/* Approved Action Buttons */}
                    {isApproved && (
                      <>
                        <button
                          onClick={() => onLaunchPortal(agent)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
                          title="Simulate signing in as this enumerator on mobile field view"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Field Portal</span>
                        </button>

                        <button
                          onClick={() => onOpenEditModal(agent)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            setSuspendingAgent(agent);
                            setActionReason('');
                          }}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>
                      </>
                    )}

                    {/* Suspended or Rejected Reinstatement */}
                    {(isSuspended || isRejected) && (
                      <button
                        onClick={() => handleReinstate(agent)}
                        disabled={isProcessing === agent.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Reinstate & Unlock Access</span>
                      </button>
                    )}

                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Decline / Rejection Reason */}
      {rejectingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Decline Enumerator Application</h3>
                <p className="text-xs text-slate-400">Candidate: {rejectingAgent.name}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-300">Reason for Denial (Visible to Candidate)</label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="e.g. Identity documentation unverified, or assigned district quota is already full."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingAgent(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Suspension Reason */}
      {suspendingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Suspend Enumerator Access</h3>
                <p className="text-xs text-slate-400">Agent: {suspendingAgent.name} ({suspendingAgent.badgeNumber})</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Suspending this enumerator will immediately invalidate their field session tokens and block them from logging in until reinstated.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-300">Suspension Reason</label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="e.g. Geofence breach or data anomaly investigation in progress."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSuspendingAgent(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-lg shadow-orange-600/30"
              >
                Suspend Access
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
