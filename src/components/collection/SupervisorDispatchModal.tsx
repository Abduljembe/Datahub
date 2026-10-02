import React, { useState } from 'react';
import {
  X,
  Send,
  Radio,
  Users,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { EnumeratorAgent, sendSupervisorDispatchMessage } from '../../utils/enumeratorFleetEngine';

interface SupervisorDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  fleet: EnumeratorAgent[];
  selectedAgentId?: string | null;
  onDispatched: () => void;
}

const QUICK_DISPATCH_TEMPLATES = [
  { label: 'Weather Warning', text: '⚠️ Severe weather / rainfall approaching your sector. Seek shelter and pause field surveys.', priority: 'urgent' as const },
  { label: 'Priority Cluster', text: '🎯 High priority cluster identified at target zone. Please proceed to checkpoint #104.', priority: 'normal' as const },
  { label: 'Quality Reminder', text: '🛡️ Quality check note: Ensure household GPS coordinates are recorded at the doorstep with <5m accuracy.', priority: 'normal' as const },
  { label: 'Mid-Day Rest Break', text: '☕ Mid-day rest window active. Please check battery levels and sync pending offline queues.', priority: 'normal' as const },
  { label: 'Daily Milestone', text: '🎉 Great work team! 100+ surveys verified today across all operational sectors.', priority: 'normal' as const }
];

export const SupervisorDispatchModal: React.FC<SupervisorDispatchModalProps> = ({
  isOpen,
  onClose,
  fleet,
  selectedAgentId,
  onDispatched,
}) => {
  const [targetMode, setTargetMode] = useState<'all' | 'single'>(selectedAgentId ? 'single' : 'all');
  const [targetAgentId, setTargetAgentId] = useState<string>(selectedAgentId || (fleet[0]?.id || ''));
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'alert'>('normal');
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    try {
      await sendSupervisorDispatchMessage({
        targetAgentId: targetMode === 'single' ? targetAgentId : undefined,
        message: message.trim(),
        priority,
        broadcastAll: targetMode === 'all',
      });

      setSuccessStatus(`Dispatched message to ${targetMode === 'all' ? 'all ' + fleet.length + ' active field agents' : 'selected enumerator'}!`);
      onDispatched();
      setTimeout(() => {
        setSuccessStatus(null);
        onClose();
      }, 1500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Supervisor Field Dispatch & Instructions</h3>
              <p className="text-xs text-slate-400">Send real-time directives, safety warnings, or cluster priorities to enumerators.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4 text-xs">
          
          {successStatus && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successStatus}</span>
            </div>
          )}

          {/* Target Selection */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Dispatch Recipient(s)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetMode('all')}
                className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  targetMode === 'all'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>All Active Fleet ({fleet.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetMode('single')}
                className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  targetMode === 'single'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Individual Enumerator</span>
              </button>
            </div>
          </div>

          {targetMode === 'single' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Select Enumerator</label>
              <select
                value={targetAgentId}
                onChange={e => setTargetAgentId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {fleet.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role} • {a.assignedZone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Dispatch Templates</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DISPATCH_TEMPLATES.map((tmpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setMessage(tmpl.text);
                    setPriority(tmpl.priority);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-medium transition-colors"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Message / Directives *</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type field instructions or instructions here..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Priority Level</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'normal', label: 'Normal', color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10' },
                { id: 'urgent', label: 'High Priority', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                { id: 'alert', label: 'Safety Alert', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' }
              ].map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPriority(p.id as any)}
                  className={`py-1.5 rounded-xl font-bold border text-center transition-all ${
                    priority === p.id
                      ? p.color + ' ring-1 ring-white/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Transmitting...' : 'Dispatch Instructions'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
