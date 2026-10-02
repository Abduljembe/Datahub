// Daily Quota Targets, Live Form Deployer & Direct Supervisor Revision Dispatcher Tab
import React, { useState } from 'react';
import {
  Target,
  Send,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  User,
  Radio,
  Sparkles,
  Plus,
  MessageSquare,
  Lock,
  Mic,
  Camera,
  Layers
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { EnumeratorAgent } from '../../../utils/enumeratorFleetEngine';
import {
  DailyEnumeratorQuota,
  SupervisorRevisionMessage,
  LiveFormDeployment,
  getStoredQuotas,
  saveStoredQuotas,
  updateAgentQuota,
  getStoredRevisionMessages,
  sendRevisionMessage,
  getStoredFormDeployments,
  saveStoredFormDeployments
} from '../../../utils/supervisorQuotaDispatchEngine';
import { SupervisorSession } from '../../../utils/supervisorAuthEngine';

interface SupervisorQuotaDispatchTabProps {
  fleet: EnumeratorAgent[];
  supervisorSession: SupervisorSession;
  onOpenAgentPortal?: (agent: EnumeratorAgent) => void;
}

export const SupervisorQuotaDispatchTab: React.FC<SupervisorQuotaDispatchTabProps> = ({
  fleet,
  supervisorSession,
  onOpenAgentPortal
}) => {
  const { isDark } = useTheme();

  const [quotas, setQuotas] = useState<Record<string, DailyEnumeratorQuota>>(() => getStoredQuotas(fleet));
  const [messages, setMessages] = useState<SupervisorRevisionMessage[]>(() => getStoredRevisionMessages());
  const [forms, setForms] = useState<LiveFormDeployment[]>(() => getStoredFormDeployments());

  // Message composer state
  const [targetAgentId, setTargetAgentId] = useState<string>(fleet[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'standard' | 'urgent' | 'notice'>('standard');
  const [requiresRevisit, setRequiresRevisit] = useState(false);
  const [fieldToCorrect, setFieldToCorrect] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New form deployment modal state
  const [isDeployFormOpen, setIsDeployFormOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newFormCampaign, setNewFormCampaign] = useState('Global Crop Yield & Soil Audit');
  const [newFormMandatoryQuestions, setNewFormMandatoryQuestions] = useState(25);
  const [newFormAudioReq, setNewFormAudioReq] = useState(true);
  const [newFormPhotoReq, setNewFormPhotoReq] = useState(true);
  const [newFormMinDwell, setNewFormMinDwell] = useState(60);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    const targetAgent = fleet.find(f => f.id === targetAgentId) || fleet[0];

    const newMsg = sendRevisionMessage({
      enumeratorId: targetAgent.id,
      enumeratorName: targetAgent.name,
      senderName: supervisorSession.name,
      senderBadgeId: supervisorSession.badgeId,
      subject: subject || 'Field Data Directive',
      message: body,
      priority,
      requiresRevisit,
      fieldToCorrect: fieldToCorrect || undefined
    });

    setMessages([newMsg, ...messages]);
    setSubject('');
    setBody('');
    setFieldToCorrect('');
    setRequiresRevisit(false);
    showToast(`Directive transmitted to agent ${targetAgent.name}'s field device.`);
  };

  const handleQuotaChange = (agentId: string, newTarget: number) => {
    updateAgentQuota(agentId, newTarget);
    setQuotas({ ...getStoredQuotas(fleet) });
    showToast('Daily quota updated.');
  };

  const handlePublishNewForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;

    const createdForm: LiveFormDeployment = {
      formId: `form_custom_${Date.now()}`,
      formTitle: newFormTitle,
      version: `v${(forms.length + 1).toFixed(1)}.0 (Live)`,
      publishedAt: new Date().toISOString(),
      targetCampaign: newFormCampaign,
      status: 'active',
      mandatoryQuestionsCount: Number(newFormMandatoryQuestions),
      gpsLockRequired: true,
      audioRecordingRequired: newFormAudioReq,
      photoProofRequired: newFormPhotoReq,
      enforceMinimumDwellSeconds: Number(newFormMinDwell),
      deployedToCount: fleet.length
    };

    const updated = [createdForm, ...forms];
    setForms(updated);
    saveStoredFormDeployments(updated);
    setIsDeployFormOpen(false);
    setNewFormTitle('');
    showToast(`Form '${createdForm.formTitle}' pushed live to all ${fleet.length} field tablets.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-emerald-400 border border-emerald-500/40 shadow-xl flex items-center gap-2 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Section: Daily Quotas & Targets Tracker */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      } shadow-md space-y-5`}>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-400" />
              <span>Enumerator Daily Quota & Output Targets</span>
            </h3>
            <p className="text-xs text-slate-400">
              Set real-time completion quotas, monitor pace against daily deadlines, and adjust targets per field agent.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              Deadline: 17:30 UTC
            </span>
          </div>
        </div>

        {/* Quota Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fleet.map(agent => {
            const quota = quotas[agent.id] || {
              targetSubmissions: 20,
              approvedCount: agent.submissionsToday || 8,
              pendingCount: 1,
              rejectedCount: 0,
              status: 'on_track'
            };

            const completed = agent.submissionsToday || 8;
            const target = quota.targetSubmissions || 20;
            const pct = Math.min(100, Math.round((completed / target) * 100));

            return (
              <div
                key={agent.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                } space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{agent.name}</h4>
                    <p className="text-xs text-slate-400">{agent.role}</p>
                    <span className="text-[10px] font-mono text-indigo-400">{agent.assignedZone}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    pct >= 100
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : pct >= 50
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {pct}% Complete
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Progress:</span>
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                      {completed} / {target} surveys
                    </strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Target adjustment slider */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-3 text-xs">
                  <span className="text-slate-400 text-[11px]">Adjust Target:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuotaChange(agent.id, Math.max(5, target - 5))}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
                    >
                      -5
                    </button>
                    <span className="font-mono font-bold w-6 text-center">{target}</span>
                    <button
                      onClick={() => handleQuotaChange(agent.id, target + 5)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold"
                    >
                      +5
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Split Section: Live Form Deployment & Direct Supervisor Revision Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Dynamic Form Version Push */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-md space-y-5`}>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                <span>Live Form Deployer & Rules</span>
              </h3>
              <p className="text-xs text-slate-400">
                Deploy updated survey schemas, lock mandatory media & GPS rules across active field devices.
              </p>
            </div>

            <button
              onClick={() => setIsDeployFormOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Deploy Form</span>
            </button>
          </div>

          {/* Deployed Forms List */}
          <div className="space-y-3">
            {forms.map(form => (
              <div
                key={form.formId}
                className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                } space-y-2`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{form.formTitle}</h4>
                    <p className="text-xs text-slate-400">Campaign: {form.targetCampaign}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    form.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {form.version}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {form.mandatoryQuestionsCount} Qs
                  </span>
                  {form.audioRecordingRequired && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700">
                      <Mic className="w-3 h-3 text-purple-400" />
                      Audio Req
                    </span>
                  )}
                  {form.photoProofRequired && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700">
                      <Camera className="w-3 h-3 text-blue-400" />
                      Photo Proof
                    </span>
                  )}
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Min {form.enforceMinimumDwellSeconds}s Dwell
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right: Direct Supervisor Revision Directive Messenger */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-md space-y-5`}>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span>Field Revision Directives & Alerts</span>
              </h3>
              <p className="text-xs text-slate-400">
                Send direct instructions, revisit notices, or field warnings directly into agent portals.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{messages.length} Sent</span>
          </div>

          {/* Message Form */}
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Recipient Agent</label>
                <select
                  value={targetAgentId}
                  onChange={e => setTargetAgentId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {fleet.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.assignedZone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Priority Level</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="standard">Standard Notice</option>
                  <option value="urgent">🔴 Urgent Action Required</option>
                  <option value="notice">ℹ️ General Advisory</option>
                </select>
              </div>
            </div>

            <div>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Directive Subject (e.g. Revisit Household #402 / Fix phone prefix)"
                className={`w-full px-3 py-2 rounded-xl text-xs border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <textarea
                rows={3}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Type detailed supervisor directive, required corrections, or safety warnings..."
                className={`w-full p-3 rounded-xl text-xs border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresRevisit}
                  onChange={e => setRequiresRevisit(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Flags physical on-site revisit mandatory</span>
              </label>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Directive</span>
              </button>
            </div>
          </form>

          {/* Recent Directives Feed */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recently Transmitted Directives</h4>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl border text-xs ${
                    msg.priority === 'urgent'
                      ? isDark ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50 border-rose-200'
                      : isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200'
                  } space-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{msg.subject}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      To: {msg.enumeratorName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-2">{msg.message}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* DEPLOY NEW FORM MODAL */}
      {isDeployFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Deploy Live Survey Schema</h3>
                  <p className="text-xs text-slate-400">Push to all {fleet.length} active enumerator devices</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeployFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishNewForm} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400">Form Title</label>
                <input
                  type="text"
                  required
                  value={newFormTitle}
                  onChange={e => setNewFormTitle(e.target.value)}
                  placeholder="e.g. 2026 Soil Nutrients & Water Salinity Metric"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400">Mandatory Questions</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={newFormMandatoryQuestions}
                    onChange={e => setNewFormMandatoryQuestions(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">Min Dwell Time (Seconds)</label>
                  <input
                    type="number"
                    min={15}
                    max={600}
                    value={newFormMinDwell}
                    onChange={e => setNewFormMinDwell(Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newFormAudioReq}
                    onChange={e => setNewFormAudioReq(e.target.checked)}
                    className="rounded border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>Enforce mandatory 10-second ambient audio recording</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newFormPhotoReq}
                    onChange={e => setNewFormPhotoReq(e.target.checked)}
                    className="rounded border-slate-700 text-purple-600 focus:ring-0"
                  />
                  <span>Enforce mandatory geotagged on-site photo proof</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDeployFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Push Form Live to Tablets</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
