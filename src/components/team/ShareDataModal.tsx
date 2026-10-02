import React, { useState } from 'react';
import { 
  Share2, 
  X, 
  Users, 
  UserCheck, 
  Shield, 
  Copy, 
  Check, 
  Send, 
  Sparkles, 
  Lock, 
  Eye, 
  Edit3, 
  ShieldAlert, 
  Database,
  Tag,
  MessageSquare,
  Mail,
  UserPlus
} from 'lucide-react';
import { Dataset, Coworker, SharedDatasetRecord, UserProfile } from '../../types';
import { getSavedCoworkers, getSavedSharedDatasets, saveSharedDatasets, getSavedTeamActivities, saveTeamActivities } from '../../utils/teamData';

interface ShareDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  currentUser?: UserProfile | null;
  onShareSuccess?: (message: string) => void;
}

export const ShareDataModal: React.FC<ShareDataModalProps> = ({
  isOpen,
  onClose,
  dataset,
  currentUser,
  onShareSuccess
}) => {
  const coworkers = getSavedCoworkers();
  const [selectedCoworkerIds, setSelectedCoworkerIds] = useState<string[]>([]);
  const [permission, setPermission] = useState<'view' | 'edit' | 'admin'>('edit');
  const [note, setNote] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('Team Shared');
  const [tags, setTags] = useState<string[]>(['Team Shared', 'Verified']);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notifyViaEmail, setNotifyViaEmail] = useState<boolean>(true);

  if (!isOpen) return null;

  const shareLink = `https://datahub.internal/shared/d-${dataset.id}-${encodeURIComponent(dataset.name.toLowerCase().replace(/\s+/g, '-'))}`;

  const filteredCoworkers = coworkers.filter(cw => 
    cw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cw.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cw.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cw.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectCoworker = (id: string) => {
    setSelectedCoworkerIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCoworkerIds.length === coworkers.length) {
      setSelectedCoworkerIds([]);
    } else {
      setSelectedCoworkerIds(coworkers.map(c => c.id));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExecuteShare = () => {
    if (selectedCoworkerIds.length === 0) {
      alert('Please select at least one coworker or choose Entire Team.');
      return;
    }

    const selectedCoworkers = coworkers.filter(c => selectedCoworkerIds.includes(c.id));
    const recipients = selectedCoworkers.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      avatarUrl: c.avatarUrl,
      permission: permission
    }));

    const newShareRecord: SharedDatasetRecord = {
      id: `share_${Date.now()}`,
      datasetId: dataset.id,
      datasetName: dataset.name,
      description: dataset.description || 'Shared analytical dataset',
      sender: {
        id: currentUser?.id || 'current_user',
        name: currentUser?.name || 'You (Analytics Lead)',
        email: currentUser?.email || 'analyst@datahub.internal',
        avatarUrl: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: currentUser?.role || 'Data Scientist',
        department: 'Quantitative Analytics'
      },
      recipients: recipients,
      permission: permission,
      note: note.trim() || 'Shared for collaborative inspection and analysis.',
      sharedAt: 'Just now',
      rowCount: dataset.data.length,
      columnCount: dataset.columns.length,
      sourceType: dataset.sourceType,
      accessLink: shareLink,
      dataSnapshot: dataset.data,
      columnsSnapshot: dataset.columns,
      tags: tags,
      comments: []
    };

    const currentShares = getSavedSharedDatasets();
    saveSharedDatasets([newShareRecord, ...currentShares]);

    // Save team activity event
    const newActivity = {
      id: `act_${Date.now()}`,
      type: 'share_dataset' as const,
      actorName: currentUser?.name || 'You',
      actorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      actorRole: currentUser?.role || 'Data Scientist',
      targetName: dataset.name,
      timestamp: 'Just now',
      details: `Shared dataset with ${selectedCoworkers.length} coworker${selectedCoworkers.length > 1 ? 's' : ''} (${permission.toUpperCase()} permission).`,
      datasetId: dataset.id
    };

    const currentActs = getSavedTeamActivities();
    saveTeamActivities([newActivity, ...currentActs]);

    // Dispatch global event for instant sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('team_data_updated', { detail: { action: 'share', datasetName: dataset.name } }));
    }

    if (onShareSuccess) {
      onShareSuccess(`🎉 Successfully shared "${dataset.name}" with ${selectedCoworkers.length} teammate${selectedCoworkers.length > 1 ? 's' : ''}!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Share Data with Co-workers
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  {dataset.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Grant team members access to inspect, query, or clean this dataset.
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

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          
          {/* 1. DATASET SUMMARY SNIPPET */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">{dataset.name}</p>
                <p className="text-[11px] text-slate-400">
                  {dataset.data.length.toLocaleString()} rows · {dataset.columns.length} columns · {dataset.sourceType.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live Memory
              </span>
            </div>
          </div>

          {/* 2. SELECT COWORKERS / RECIPIENTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                Select Co-workers to Share With ({selectedCoworkerIds.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                {selectedCoworkerIds.length === coworkers.length ? 'Deselect All' : 'Select All Team'}
              </button>
            </div>

            {/* Quick Filter Search */}
            <input
              type="text"
              placeholder="Search coworkers by name, department, or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />

            {/* Coworker Grid List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
              {filteredCoworkers.map(cw => {
                const isSelected = selectedCoworkerIds.includes(cw.id);
                return (
                  <div
                    key={cw.id}
                    onClick={() => toggleSelectCoworker(cw.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={cw.avatarUrl}
                          alt={cw.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                          cw.status === 'online' ? 'bg-emerald-400' : cw.status === 'analyzing' ? 'bg-purple-400' : 'bg-slate-500'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-white">{cw.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{cw.role}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                      isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. PERMISSION LEVEL SELECTOR */}
          <div className="space-y-2.5">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Access & Collaboration Permissions
            </label>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPermission('view')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  permission === 'view'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-white mb-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Can View</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Inspect charts, run SQL queries, and export reports.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPermission('edit')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  permission === 'edit'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-white mb-1">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Can Edit</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Clean data, impute missing values, and append rows.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPermission('admin')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  permission === 'admin'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-white mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  <span>Full Admin</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Manage schema, delete dataset, and grant shares.
                </p>
              </button>
            </div>
          </div>

          {/* 4. COLLABORATION CONTEXT NOTE */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Collaboration Note / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g., Team, please review the linear regression and outlier thresholds before our product review..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* 5. DATASET TAGS */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-teal-400" />
              Classification Tags
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add tag (e.g. Q3 Priorities, ML Training)..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Add Tag
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map(t => (
                <span
                  key={t}
                  className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-indigo-300 text-[10px] font-mono flex items-center gap-1.5"
                >
                  #{t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-400 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 6. INSTANT ACCESS LINK */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Direct Internal Workspace Link
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>Notify recipients via workspace notifications</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteShare}
              disabled={selectedCoworkerIds.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share with {selectedCoworkerIds.length} Co-worker{selectedCoworkerIds.length === 1 ? '' : 's'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
