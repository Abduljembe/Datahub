import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Database, 
  Trash2, 
  Copy, 
  FileSpreadsheet, 
  Calendar, 
  Sparkles, 
  UploadCloud,
  History,
  Camera,
  RotateCcw,
  GitBranch,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  AlertCircle,
  Tag,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Dataset, DatasetVersion, ColumnMeta } from '../types';
import { 
  getDatasetVersions, 
  createDatasetSnapshot, 
  restoreDatasetVersion, 
  deleteDatasetVersion, 
  compareDatasetWithVersion, 
  forkVersionAsNewDataset, 
  exportVersionToCSV, 
  exportVersionToJSON 
} from '../utils/versionEngine';

interface DatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: Dataset[];
  activeDataset: Dataset | null;
  onSelectDataset: (id: string) => void;
  onCreateDataset: (dataset: Dataset) => void;
  onDeleteDataset: (id: string) => void;
  onUpdateDataset?: (updated: Dataset) => void;
  onOpenUploadStudio?: () => void;
  initialTab?: 'list' | 'versions' | 'create';
}

export const DatasetModal: React.FC<DatasetModalProps> = ({
  isOpen,
  onClose,
  datasets,
  activeDataset,
  onSelectDataset,
  onCreateDataset,
  onDeleteDataset,
  onUpdateDataset,
  onOpenUploadStudio,
  initialTab = 'list',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'versions' | 'create'>(initialTab);
  const [selectedDatasetIdForVersions, setSelectedDatasetIdForVersions] = useState<string>(activeDataset?.id || datasets[0]?.id || '');
  
  // Create Dataset state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Snapshot Creation state
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDesc, setSnapshotDesc] = useState('');
  const [snapshotTag, setSnapshotTag] = useState<DatasetVersion['tag']>('cleaned');

  // Preview & Compare State
  const [inspectedVersionId, setInspectedVersionId] = useState<string | null>(null);
  const [confirmRestoreVersionId, setConfirmRestoreVersionId] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Sync selected dataset when modal opens or active dataset changes
  React.useEffect(() => {
    if (activeDataset?.id) {
      setSelectedDatasetIdForVersions(activeDataset.id);
    }
  }, [activeDataset?.id, isOpen]);

  // Handle initial tab override if passed
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentVersionTargetDs = datasets.find(d => d.id === selectedDatasetIdForVersions) || activeDataset || datasets[0];
  const datasetVersions: DatasetVersion[] = currentVersionTargetDs ? getDatasetVersions(currentVersionTargetDs) : [];

  const triggerToast = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => {
      setActionSuccessNotice(null);
    }, 4000);
  };

  const handleCreateEmpty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newDsId = 'ds_' + Date.now();
    const cols: ColumnMeta[] = [
      { id: 'id', name: 'id', type: 'number', nullable: false },
      { id: 'item_name', name: 'item_name', type: 'string', nullable: true },
      { id: 'value', name: 'value', type: 'number', nullable: true },
      { id: 'category', name: 'category', type: 'category', nullable: true },
    ];
    const initialRows = [
      { id: 1, item_name: 'Sample A', value: 100, category: 'Group 1' },
      { id: 2, item_name: 'Sample B', value: 250, category: 'Group 2' },
      { id: 3, item_name: 'Sample C', value: 180, category: 'Group 1' },
    ];

    const newDs: Dataset = {
      id: newDsId,
      name: newTitle.trim(),
      description: newDesc.trim() || 'Custom user dataset',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'manual',
      columns: cols,
      data: initialRows,
      versions: [
        {
          id: `ver_init_${newDsId}`,
          versionNumber: 1,
          name: 'v1.0 - Initial Creation Snapshot',
          description: 'Baseline version upon manual creation',
          createdAt: new Date().toISOString(),
          createdBy: 'User',
          tag: 'initial',
          rowCount: initialRows.length,
          columnCount: cols.length,
          columns: cols,
          data: initialRows,
          changeSummary: 'Initial empty template structure',
        },
      ],
    };

    onCreateDataset(newDs);
    setNewTitle('');
    setNewDesc('');
    setActiveSubTab('list');
    triggerToast(`Created dataset "${newDs.name}"`);
  };

  // 1. Create a Snapshot Version
  const handleSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVersionTargetDs) return;

    const { updatedDataset, newVersion } = createDatasetSnapshot(currentVersionTargetDs, {
      name: snapshotName.trim() || undefined,
      description: snapshotDesc.trim() || undefined,
      tag: snapshotTag,
      createdBy: 'Analyst',
    });

    if (onUpdateDataset) {
      onUpdateDataset(updatedDataset);
    }
    setSnapshotName('');
    setSnapshotDesc('');
    setIsCreatingSnapshot(false);
    triggerToast(`Snapshot "${newVersion.name}" saved successfully!`);
  };

  // 2. Restore a Snapshot Version
  const handleRestoreVersion = (version: DatasetVersion) => {
    if (!currentVersionTargetDs) return;

    try {
      const { updatedDataset } = restoreDatasetVersion(currentVersionTargetDs, version.id, 'Analyst');
      if (onUpdateDataset) {
        onUpdateDataset(updatedDataset);
      }
      setConfirmRestoreVersionId(null);
      triggerToast(`Reverted dataset to "${version.name}" (${version.rowCount} records). Auto-backup saved!`);
    } catch (err: any) {
      console.error(err);
    }
  };

  // 3. Fork a Snapshot Version into a new dataset
  const handleForkVersion = (version: DatasetVersion) => {
    if (!currentVersionTargetDs) return;
    const forked = forkVersionAsNewDataset(currentVersionTargetDs, version);
    onCreateDataset(forked);
    triggerToast(`Forked version into new standalone dataset "${forked.name}"`);
  };

  // 4. Delete a Snapshot Version
  const handleDeleteVersion = (versionId: string) => {
    if (!currentVersionTargetDs) return;
    if (datasetVersions.length <= 1) {
      triggerToast('Cannot delete the only remaining baseline version.');
      return;
    }
    const updated = deleteDatasetVersion(currentVersionTargetDs, versionId);
    if (onUpdateDataset) {
      onUpdateDataset(updated);
    }
    if (inspectedVersionId === versionId) {
      setInspectedVersionId(null);
    }
    triggerToast('Version snapshot deleted.');
  };

  const getTagBadgeStyle = (tag?: DatasetVersion['tag']) => {
    switch (tag) {
      case 'cleaned':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'filtered':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'transformed':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'reverted':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'system':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'initial':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">Dataset & Version Management</h2>
              <p className="text-xs text-slate-400">Switch active datasets, capture historical snapshots, and restore prior states safely.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Success Banner Notification */}
        {actionSuccessNotice && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccessNotice}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 bg-slate-900/60 overflow-x-auto">
          <div className="flex shrink-0">
            <button
              onClick={() => setActiveSubTab('list')}
              className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeSubTab === 'list'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>My Datasets ({datasets.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('versions')}
              className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeSubTab === 'versions'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dataset Versions & Snapshots</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                {datasetVersions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('create')}
              className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                activeSubTab === 'create'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Empty</span>
            </button>
          </div>

          {onOpenUploadStudio && (
            <button
              onClick={onOpenUploadStudio}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-colors shrink-0 ml-2"
            >
              <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Custom Data</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: DATASETS LIST */}
          {activeSubTab === 'list' && (
            <div className="space-y-3">
              {datasets.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm">No Datasets In Workspace</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Import your real CSV, Excel, or JSON data files, or create an empty schema to start collecting and analyzing.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {onOpenUploadStudio && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenUploadStudio();
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Custom Data</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveSubTab('create')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Empty Dataset</span>
                    </button>
                  </div>
                </div>
              ) : (
                datasets.map(ds => {
                  const isActive = activeDataset?.id === ds.id;
                  const vCount = getDatasetVersions(ds).length;

                  return (
                    <div
                      key={ds.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-indigo-950/30 border-indigo-500/50 shadow-md shadow-indigo-950/40'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-sm text-white">{ds.name}</h3>
                          {isActive && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Active
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                            {ds.sourceType}
                          </span>
                          
                          {/* Snapshot badge */}
                          <button
                            onClick={() => {
                              setSelectedDatasetIdForVersions(ds.id);
                              setActiveSubTab('versions');
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-colors"
                            title="View and manage version snapshots for this dataset"
                          >
                            <History className="w-3 h-3 text-cyan-400" />
                            <span>{vCount} {vCount === 1 ? 'Snapshot' : 'Snapshots'}</span>
                          </button>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">{ds.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 pt-0.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                            {ds.data.length} records · {ds.columns.length} columns
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(ds.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => {
                            setSelectedDatasetIdForVersions(ds.id);
                            setActiveSubTab('versions');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          <History className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Versions</span>
                        </button>

                        {!isActive ? (
                          <button
                            onClick={() => {
                              onSelectDataset(ds.id);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
                          >
                            Switch
                          </button>
                        ) : (
                          <span className="text-xs text-indigo-400 font-semibold px-2 py-1 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Selected
                          </span>
                        )}

                        {datasets.length > 1 && (
                          <button
                            onClick={() => onDeleteDataset(ds.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/40 transition-colors"
                            title="Delete Dataset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: DATASET VERSIONS & SNAPSHOTS */}
          {activeSubTab === 'versions' && (
            <div className="space-y-6">
              
              {/* Target Dataset Selector Banner */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Dataset:</label>
                    <select
                      value={selectedDatasetIdForVersions}
                      onChange={e => {
                        setSelectedDatasetIdForVersions(e.target.value);
                        setInspectedVersionId(null);
                        setConfirmRestoreVersionId(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      {datasets.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.data.length} rows)
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-400">
                    Currently working with <span className="text-white font-medium">{currentVersionTargetDs?.name}</span> ({currentVersionTargetDs?.data.length} live records, {currentVersionTargetDs?.columns.length} columns).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreatingSnapshot(prev => !prev)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCreatingSnapshot ? 'Close Form' : 'Capture Snapshot'}</span>
                  </button>
                </div>
              </div>

              {/* Snapshot Creation Card (Collapsible) */}
              {isCreatingSnapshot && (
                <form onSubmit={handleSaveSnapshot} className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-bold text-white">Capture Current State Snapshot</h4>
                    </div>
                    <span className="text-xs text-indigo-300 font-mono">
                      State: {currentVersionTargetDs?.data.length} rows · {currentVersionTargetDs?.columns.length} columns
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Snapshot Title / Checkpoint Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Pre-Cleaning: Before Imputing Missing Values"
                        value={snapshotName}
                        onChange={e => setSnapshotName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Snapshot Tag</label>
                      <select
                        value={snapshotTag}
                        onChange={e => setSnapshotTag(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                      >
                        <option value="cleaned">Cleaned (Post-cleaning)</option>
                        <option value="filtered">Filtered (Subsetting)</option>
                        <option value="transformed">Transformed (Feature Math)</option>
                        <option value="manual_snapshot">Manual Checkpoint</option>
                        <option value="initial">Raw / Initial State</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Description (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Removed 5 duplicate customer accounts and winsorized transaction outliers."
                      value={snapshotDesc}
                      onChange={e => setSnapshotDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingSnapshot(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Snapshot Version</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Version History List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-cyan-400" />
                    Historical Versions & Snapshots ({datasetVersions.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Select a snapshot to compare or restore
                  </span>
                </div>

                {datasetVersions.map((version, index) => {
                  const isCurrent = currentVersionTargetDs?.currentVersionId === version.id || (index === 0 && !currentVersionTargetDs?.currentVersionId);
                  const isInspected = inspectedVersionId === version.id;
                  const isConfirmingRestore = confirmRestoreVersionId === version.id;
                  const diff = currentVersionTargetDs ? compareDatasetWithVersion(currentVersionTargetDs, version) : null;

                  return (
                    <div
                      key={version.id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isCurrent
                          ? 'bg-slate-950/60 border-indigo-500/40 shadow-sm'
                          : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Version Card Main Header */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30">
                              v{version.versionNumber}.0
                            </span>
                            
                            <h4 className="text-sm font-bold text-white">{version.name}</h4>

                            {version.tag && (
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getTagBadgeStyle(version.tag)}`}>
                                {version.tag}
                              </span>
                            )}

                            {isCurrent && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Current Base
                              </span>
                            )}
                          </div>

                          {version.description && (
                            <p className="text-xs text-slate-300">{version.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                            <span className="flex items-center gap-1 font-mono text-slate-300">
                              <FileSpreadsheet className="w-3 h-3 text-cyan-400" />
                              {version.rowCount} records · {version.columnCount} columns
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="w-3 h-3" />
                              {new Date(version.createdAt).toLocaleString()}
                            </span>
                            {version.createdBy && (
                              <span className="text-slate-500">
                                By: <span className="text-slate-300">{version.createdBy}</span>
                              </span>
                            )}
                            {version.changeSummary && (
                              <span className="text-indigo-300 font-mono text-[10px] bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-500/20">
                                {version.changeSummary}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions on this Version */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                          
                          {/* Toggle Diff & Preview */}
                          <button
                            onClick={() => setInspectedVersionId(isInspected ? null : version.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                              isInspected
                                ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                            }`}
                            title="Inspect snapshot records and compare against current live state"
                          >
                            {isInspected ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                            <span>{isInspected ? 'Hide Diff' : 'Compare & Preview'}</span>
                          </button>

                          {/* Restore Button */}
                          {!isConfirmingRestore ? (
                            <button
                              onClick={() => setConfirmRestoreVersionId(version.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                              title="Revert the current live dataset to this exact snapshot"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Restore</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 p-1 bg-amber-950/60 border border-amber-500/50 rounded-xl animate-in fade-in">
                              <span className="text-[11px] text-amber-300 font-medium px-1.5">Revert to v{version.versionNumber}?</span>
                              <button
                                onClick={() => handleRestoreVersion(version)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmRestoreVersionId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {/* Fork as New Dataset */}
                          <button
                            onClick={() => handleForkVersion(version)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                            title="Fork this snapshot into a new standalone dataset"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>

                          {/* Export CSV */}
                          <button
                            onClick={() => exportVersionToCSV(version, currentVersionTargetDs?.name || 'dataset')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
                            title="Download version snapshot as CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {datasetVersions.length > 1 && (
                            <button
                              onClick={() => handleDeleteVersion(version.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/40 transition-colors"
                              title="Delete this snapshot version"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                        </div>
                      </div>

                      {/* Expandable Inspection & Diff Drawer */}
                      {isInspected && diff && (
                        <div className="p-4 border-t border-slate-800/80 bg-slate-950/90 space-y-4 animate-in fade-in">
                          
                          {/* Diff Summary Strip */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px] uppercase">Row Difference</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-bold text-white">{version.rowCount} in snapshot</span>
                                <span className="text-slate-400">vs {diff.currentRows} live</span>
                              </div>
                              <span className={`text-[11px] font-semibold ${diff.rowCountDelta === 0 ? 'text-slate-400' : diff.rowCountDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {diff.rowCountDelta === 0 ? '0 row delta (Equal)' : diff.rowCountDelta > 0 ? `+${diff.rowCountDelta} live rows` : `${diff.rowCountDelta} live rows`}
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-slate-500 block text-[10px] uppercase">Feature Dimensions</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-sm font-bold text-white">{version.columnCount} columns</span>
                                <span className="text-slate-400">vs {diff.currentCols} live</span>
                              </div>
                              <span className="text-[11px] text-indigo-300">
                                {diff.identicalColumns.length} shared columns
                              </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                              <span className="text-slate-500 block text-[10px] uppercase">Integrity / Match</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {diff.isIdentical ? (
                                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Exact match with live data
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> State differs from live data
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {diff.addedColumns.length > 0 && `+${diff.addedColumns.length} new cols. `}
                                {diff.removedColumns.length > 0 && `-${diff.removedColumns.length} removed cols.`}
                              </span>
                            </div>
                          </div>

                          {/* Notes checklist */}
                          {diff.notes.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                              {diff.notes.map((note, nIdx) => (
                                <p key={nIdx} className="flex items-center gap-1.5">
                                  <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                                  <span>{note}</span>
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Snapshot Data Table Preview */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-300">Snapshot Record Preview (First 5 rows):</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Columns: {version.columns.map(c => c.name).join(', ')}
                              </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-48">
                              <table className="w-full text-left text-xs font-mono">
                                <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                                  <tr>
                                    <th className="p-2 w-8 text-slate-600">#</th>
                                    {version.columns.map(col => (
                                      <th key={col.id} className="p-2 font-semibold text-slate-300">{col.name}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                                  {version.data.slice(0, 5).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-900/40">
                                      <td className="p-2 text-slate-600 text-[10px]">{rIdx + 1}</td>
                                      {version.columns.map(col => (
                                        <td key={col.id} className="p-2 text-slate-300 truncate max-w-xs text-[11px]">
                                          {String(row[col.name] ?? '-')}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 3: CREATE EMPTY DATASET */}
          {activeSubTab === 'create' && (
            <form onSubmit={handleCreateEmpty} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dataset Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Customer Retention Survey"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the objectives or context of this dataset..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Dataset</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex justify-between items-center">
          {onOpenUploadStudio ? (
            <button
              onClick={onOpenUploadStudio}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Or drag & drop custom files in Upload Studio</span>
            </button>
          ) : <div />}
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
