import React, { useState, useEffect } from 'react';
import {
  X,
  Workflow,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  Save,
  ShieldCheck,
  Zap,
  Sliders,
  Sparkles,
  Layers,
  HelpCircle,
  Copy,
  Lock,
  Scissors
} from 'lucide-react';
import { Dataset } from '../../types';
import {
  CleaningRecipe,
  RecipeStep,
  RecipeStepAction,
  RecipeExecutionReport,
  PRESET_RECIPES,
  loadCleaningRecipes,
  saveCleaningRecipes,
  executeCleaningRecipe
} from '../../utils/recipeEngine';

interface CleaningRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
  onOpenDiffModal?: () => void;
}

export const CleaningRecipeModal: React.FC<CleaningRecipeModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  onOpenDiffModal,
}) => {
  const [recipes, setRecipes] = useState<CleaningRecipe[]>(() => loadCleaningRecipes());
  const [activeRecipeId, setActiveRecipeId] = useState<string>(PRESET_RECIPES[0].id);
  const [isAddingStep, setIsAddingStep] = useState<boolean>(false);
  const [executionReport, setExecutionReport] = useState<RecipeExecutionReport | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New step form state
  const [newAction, setNewAction] = useState<RecipeStepAction>('impute_missing');
  const [newCol, setNewCol] = useState<string>('_all_');
  const [newImputeStrat, setNewImputeStrat] = useState<'median' | 'mean' | 'zero'>('median');
  const [newTextTransform, setNewTextTransform] = useState<'trim' | 'lowercase' | 'uppercase' | 'titlecase'>('trim');
  const [newPiiStrat, setNewPiiStrat] = useState<'mask' | 'hash' | 'redact'>('mask');
  const [newThreshold, setNewThreshold] = useState<number>(3.0);

  // Get active recipe
  const activeRecipe = recipes.find(r => r.id === activeRecipeId) || recipes[0] || PRESET_RECIPES[0];

  useEffect(() => {
    saveCleaningRecipes(recipes);
  }, [recipes]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleToggleStep = (stepId: string) => {
    setRecipes(prev => prev.map(r => {
      if (r.id !== activeRecipe.id) return r;
      return {
        ...r,
        steps: r.steps.map(s => s.id === stepId ? { ...s, enabled: !s.enabled } : s),
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const handleDeleteStep = (stepId: string) => {
    setRecipes(prev => prev.map(r => {
      if (r.id !== activeRecipe.id) return r;
      return {
        ...r,
        steps: r.steps.filter(s => s.id !== stepId),
        updatedAt: new Date().toISOString(),
      };
    }));
    showToast('Step removed from pipeline');
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!activeRecipe) return;
    const steps = [...activeRecipe.steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;

    const temp = steps[index];
    steps[index] = steps[targetIdx];
    steps[targetIdx] = temp;

    setRecipes(prev => prev.map(r => r.id === activeRecipe.id ? { ...r, steps, updatedAt: new Date().toISOString() } : r));
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    const createdStep: RecipeStep = {
      id: `step_${Date.now()}`,
      action: newAction,
      name: getStepDefaultName(newAction, newCol),
      enabled: true,
      column: newCol,
      params: {
        imputeStrategy: newImputeStrat,
        textTransform: newTextTransform,
        piiStrategy: newPiiStrat,
        stdDevThreshold: newThreshold,
      },
      description: `Automated ${newAction.replace('_', ' ')} on ${newCol === '_all_' ? 'all matching columns' : newCol}.`,
    };

    setRecipes(prev => prev.map(r => {
      if (r.id !== activeRecipe.id) return r;
      return {
        ...r,
        steps: [...r.steps, createdStep],
        updatedAt: new Date().toISOString(),
      };
    }));

    setIsAddingStep(false);
    showToast(`Added step: ${createdStep.name}`);
  };

  const handleCreateNewRecipe = () => {
    const newRec: CleaningRecipe = {
      id: `recipe_custom_${Date.now()}`,
      name: `Custom Pipeline #${recipes.length + 1}`,
      description: 'Custom user-defined multi-step cleaning pipeline.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPreset: false,
      steps: [
        {
          id: `step_init_dedup`,
          action: 'remove_duplicates',
          name: 'Deduplicate Rows',
          enabled: true,
          params: {},
          description: 'Remove duplicate records.',
        },
      ],
    };

    setRecipes(prev => [newRec, ...prev]);
    setActiveRecipeId(newRec.id);
    showToast(`Created custom recipe: ${newRec.name}`);
  };

  const handleExecuteRecipe = () => {
    setIsExecuting(true);
    setTimeout(() => {
      try {
        const { updatedDataset, report } = executeCleaningRecipe(dataset, activeRecipe);
        onUpdateDataset(updatedDataset);
        setExecutionReport(report);
        showToast(`Recipe executed! Modified ${report.cellsModified} cells across ${report.executedSteps} step(s).`);
      } catch (err: any) {
        console.error('Failed to execute recipe:', err);
      } finally {
        setIsExecuting(false);
      }
    }, 400);
  };

  const handleExportRecipeJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeRecipe, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeRecipe.name.toLowerCase().replace(/\s+/g, '_')}_recipe.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportRecipeJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.name && Array.isArray(parsed.steps)) {
          const imported: CleaningRecipe = {
            ...parsed,
            id: `recipe_imported_${Date.now()}`,
            isPreset: false,
          };
          setRecipes(prev => [imported, ...prev]);
          setActiveRecipeId(imported.id);
          showToast(`Imported recipe: ${imported.name}`);
        }
      } catch (err) {
        alert('Invalid recipe JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const getStepDefaultName = (action: RecipeStepAction, col: string) => {
    const colLabel = col === '_all_' ? 'All Columns' : col;
    switch (action) {
      case 'remove_duplicates': return 'Remove Duplicate Rows';
      case 'impute_missing': return `Impute Missing in ${colLabel}`;
      case 'drop_missing': return `Drop Rows with Null in ${colLabel}`;
      case 'winsorize_outliers': return `Winsorize Outliers in ${colLabel}`;
      case 'trim_outliers': return `Trim Extreme Rows in ${colLabel}`;
      case 'anonymize_pii': return `Mask PII in ${colLabel}`;
      case 'enforce_contracts': return 'Enforce Active Contracts';
      case 'text_clean': return `Normalize Text in ${colLabel}`;
    }
  };

  const getActionIcon = (action: RecipeStepAction) => {
    switch (action) {
      case 'remove_duplicates': return <Copy className="w-4 h-4 text-cyan-400" />;
      case 'impute_missing': return <Sliders className="w-4 h-4 text-amber-400" />;
      case 'drop_missing': return <Scissors className="w-4 h-4 text-rose-400" />;
      case 'winsorize_outliers': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'trim_outliers': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'anonymize_pii': return <Lock className="w-4 h-4 text-purple-400" />;
      case 'enforce_contracts': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'text_clean': return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Data Cleaning Recipes & Macro Pipelines
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Batch Automation
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Compose, save, and re-run multi-action cleaning sequences across your dataset in 1 click.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-600/20 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Recipe Selector Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Recipe:</span>
              <select
                value={activeRecipeId}
                onChange={(e) => {
                  setActiveRecipeId(e.target.value);
                  setExecutionReport(null);
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500 flex-1"
              >
                {recipes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isPreset ? '(Preset)' : '(Custom)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNewRecipe}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Recipe</span>
              </button>

              <button
                onClick={handleExportRecipeJson}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
                title="Export current recipe as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportRecipeJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Active Recipe Summary Header */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">{activeRecipe.name}</h4>
                {activeRecipe.isPreset && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    System Preset
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{activeRecipe.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsAddingStep(!isAddingStep)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingStep ? 'Cancel' : 'Add Step'}</span>
              </button>

              <button
                onClick={handleExecuteRecipe}
                disabled={isExecuting || activeRecipe.steps.filter(s => s.enabled).length === 0}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
              >
                {isExecuting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isExecuting ? 'Running Pipeline...' : 'Run Pipeline Now'}</span>
              </button>
            </div>
          </div>

          {/* Add Step Builder Form */}
          {isAddingStep && (
            <form onSubmit={handleAddStep} className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4 animate-in fade-in">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Workflow className="w-4 h-4 text-indigo-400" />
                Configure New Pipeline Step
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Action */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Action Type</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value as RecipeStepAction)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="remove_duplicates">Remove Duplicate Rows</option>
                    <option value="impute_missing">Impute Missing Values</option>
                    <option value="drop_missing">Drop Rows with Nulls</option>
                    <option value="winsorize_outliers">Winsorize Outliers (Cap σ)</option>
                    <option value="trim_outliers">Trim Extreme Rows</option>
                    <option value="anonymize_pii">Mask / Anonymize PII</option>
                    <option value="enforce_contracts">Enforce Data Contracts</option>
                    <option value="text_clean">Normalize Text Whitespace</option>
                  </select>
                </div>

                {/* Column */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Column</label>
                  <select
                    value={newCol}
                    onChange={(e) => setNewCol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="_all_">All Applicable Columns</option>
                    {dataset.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Parameter based on Action */}
                <div>
                  {newAction === 'impute_missing' && (
                    <>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Imputation Strategy</label>
                      <select
                        value={newImputeStrat}
                        onChange={(e) => setNewImputeStrat(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="median">Median (Robust)</option>
                        <option value="mean">Mean (Average)</option>
                        <option value="zero">Zero (0)</option>
                      </select>
                    </>
                  )}

                  {newAction === 'text_clean' && (
                    <>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Text Transformation</label>
                      <select
                        value={newTextTransform}
                        onChange={(e) => setNewTextTransform(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="trim">Trim Whitespace</option>
                        <option value="lowercase">Lowercase</option>
                        <option value="uppercase">Uppercase</option>
                        <option value="titlecase">Title Case</option>
                      </select>
                    </>
                  )}

                  {newAction === 'anonymize_pii' && (
                    <>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Masking Strategy</label>
                      <select
                        value={newPiiStrat}
                        onChange={(e) => setNewPiiStrat(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="mask">Partial Mask (j***e@domain)</option>
                        <option value="hash">Deterministic Hash</option>
                        <option value="redact">Full Redaction [REDACTED]</option>
                      </select>
                    </>
                  )}

                  {(newAction === 'winsorize_outliers' || newAction === 'trim_outliers') && (
                    <>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Threshold (Std Devs)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingStep(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
                >
                  Append Step to Pipeline
                </button>
              </div>
            </form>
          )}

          {/* Execution Audit Result Box if available */}
          {executionReport && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Pipeline Execution Complete
                  </span>
                </div>
                {onOpenDiffModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenDiffModal();
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
                  >
                    View Visual Diff Checkpoint
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Steps Run</span>
                  <span className="text-base font-bold text-white">{executionReport.executedSteps} / {executionReport.totalSteps}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Initial Rows</span>
                  <span className="text-base font-bold text-white">{executionReport.initialRowCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Final Rows</span>
                  <span className="text-base font-bold text-emerald-400">{executionReport.finalRowCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Cells Modified</span>
                  <span className="text-base font-bold text-cyan-400">{executionReport.cellsModified}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                {executionReport.stepResults.map((sr, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 bg-slate-900/60 rounded-lg">
                    <span className="text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold">Step {idx + 1}: {sr.name}</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{sr.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step Pipeline Timeline */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Pipeline Sequence ({activeRecipe.steps.length} Steps)</span>
              <span className="text-slate-500 text-[11px] lowercase">Executes in top-down sequential order</span>
            </div>

            {activeRecipe.steps.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-400">No steps in this pipeline. Click "+ Add Step" to build your cleaning macro.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeRecipe.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      step.enabled
                        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </div>

                      <input
                        type="checkbox"
                        checked={step.enabled}
                        onChange={() => handleToggleStep(step.id)}
                        className="w-4 h-4 rounded text-cyan-600 bg-slate-800 border-slate-700 cursor-pointer shrink-0"
                        title="Enable / Disable Step"
                      />

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          {getActionIcon(step.action)}
                          <span className="text-xs font-bold text-white">{step.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                            {step.column === '_all_' ? 'all columns' : step.column}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{step.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"
                        title="Move step up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === activeRecipe.steps.length - 1}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all"
                        title="Move step down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all ml-1"
                        title="Delete Step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Running a recipe automatically captures an atomic rollback version snapshot.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
            >
              Close
            </button>
            <button
              onClick={handleExecuteRecipe}
              disabled={isExecuting || activeRecipe.steps.filter(s => s.enabled).length === 0}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
            >
              {isExecuting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Execute Recipe</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
