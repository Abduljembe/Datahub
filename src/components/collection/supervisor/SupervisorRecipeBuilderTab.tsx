// Visual Data Cleaning Recipe Builder & Batch Auto-Healer Tab
import React, { useState } from 'react';
import {
  Wand2,
  Plus,
  Play,
  Sliders,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowRight,
  Shield,
  Eye,
  RefreshCw,
  Zap,
  Code
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { SupervisorSubmission, DataCleaningDiff } from '../../../utils/supervisorEngine';
import {
  CleaningRecipeBook,
  CleaningRecipeRule,
  RecipeActionType,
  getStoredRecipeBook,
  saveStoredRecipeBook,
  applyRecipeBookToData
} from '../../../utils/supervisorRecipeEngine';

interface SupervisorRecipeBuilderTabProps {
  submissions: SupervisorSubmission[];
  onBatchCleaned?: (updatedSubmissions: SupervisorSubmission[]) => void;
}

export const SupervisorRecipeBuilderTab: React.FC<SupervisorRecipeBuilderTabProps> = ({
  submissions,
  onBatchCleaned
}) => {
  const { isDark } = useTheme();

  const [recipeBook, setRecipeBook] = useState<CleaningRecipeBook>(() => getStoredRecipeBook());
  const [simulationResults, setSimulationResults] = useState<{ subCode: string; diffs: DataCleaningDiff[] }[]>([]);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Rule Form State
  const [ruleName, setRuleName] = useState('');
  const [targetField, setTargetField] = useState('*');
  const [actionType, setActionType] = useState<RecipeActionType>('trim_whitespace');
  const [minVal, setMinVal] = useState<number | ''>('');
  const [maxVal, setMaxVal] = useState<number | ''>('');
  const [fallbackVal, setFallbackVal] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [replacementText, setReplacementText] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = recipeBook.rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
    const updatedBook = { ...recipeBook, rules: updatedRules, lastUpdated: new Date().toISOString() };
    setRecipeBook(updatedBook);
    saveStoredRecipeBook(updatedBook);
    showToast('Recipe book updated.');
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = recipeBook.rules.filter(r => r.id !== ruleId);
    const updatedBook = { ...recipeBook, rules: updatedRules, lastUpdated: new Date().toISOString() };
    setRecipeBook(updatedBook);
    saveStoredRecipeBook(updatedBook);
    showToast('Rule removed from pipeline recipe.');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const newRule: CleaningRecipeRule = {
      id: `rule_custom_${Date.now()}`,
      name: ruleName,
      targetField: targetField.trim(),
      action: actionType,
      enabled: true,
      params: {
        minVal: minVal !== '' ? Number(minVal) : undefined,
        maxVal: maxVal !== '' ? Number(maxVal) : undefined,
        fallbackValue: fallbackVal || undefined,
        regexPattern: regexPattern || undefined,
        replacementText: replacementText || undefined
      },
      description: `Automated ${actionType} transformation on ${targetField}.`,
      executionCount: 0
    };

    const updatedBook = {
      ...recipeBook,
      rules: [...recipeBook.rules, newRule],
      lastUpdated: new Date().toISOString()
    };

    setRecipeBook(updatedBook);
    saveStoredRecipeBook(updatedBook);
    setIsAddingRule(false);
    setRuleName('');
    showToast(`Rule '${newRule.name}' added to recipe.`);
  };

  // Run dry-run simulation on current submissions
  const handleRunSimulation = () => {
    const sample = submissions.slice(0, 10);
    const results = sample.map(sub => {
      const { diffs } = applyRecipeBookToData(sub.rawData || {}, recipeBook);
      return {
        subCode: sub.submissionCode,
        diffs
      };
    }).filter(r => r.diffs.length > 0);

    setSimulationResults(results);
    showToast(`Simulation dry-run completed on ${sample.length} records (${results.length} with diffs).`);
  };

  // Run batch execution and update submissions
  const handleExecuteBatchAutoHeal = () => {
    let totalFixes = 0;
    const updated = submissions.map(sub => {
      if (sub.stage === 'raw_received' || sub.stage === 'auto_cleaned') {
        const { cleanedData, diffs } = applyRecipeBookToData(sub.rawData || {}, recipeBook);
        totalFixes += diffs.length;
        return {
          ...sub,
          cleanedData,
          cleaningDiffs: diffs,
          stage: 'auto_cleaned' as const,
          cleanedAt: new Date().toISOString(),
          qualityScore: Math.min(100, Math.max(sub.qualityScore, 85 + Math.min(15, diffs.length * 2)))
        };
      }
      return sub;
    });

    if (onBatchCleaned) {
      onBatchCleaned(updated);
    }
    showToast(`Executed batch recipe transformation: ${totalFixes} cells healed across ${updated.length} records.`);
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

      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      } shadow-md space-y-4`}>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-400" />
              <span>{recipeBook.name}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {recipeBook.version}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Build no-code transformation chains (case conversion, range clamps, regex taxonomy, and PII masking) that auto-execute during field ingestion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddingRule(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Rule</span>
            </button>

            <button
              onClick={handleRunSimulation}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                isDark ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
            >
              <Play className="w-4 h-4 text-emerald-400" />
              <span>Test Dry-Run (10 Records)</span>
            </button>

            <button
              onClick={handleExecuteBatchAutoHeal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Batch Auto-Heal All Submissions</span>
            </button>
          </div>
        </div>

      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipeBook.rules.map(rule => (
          <div
            key={rule.id}
            className={`p-4 rounded-2xl border transition-all ${
              rule.enabled
                ? isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
                : isDark ? 'bg-slate-950/30 border-slate-900 opacity-60' : 'bg-slate-50 border-slate-200 opacity-60'
            } space-y-3`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">{rule.name}</h4>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                    Field: {rule.targetField}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{rule.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Rule Parameters Summary */}
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-400 pt-1">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300">
                Action: {rule.action.toUpperCase()}
              </span>
              {rule.params.minVal !== undefined && (
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  Min: {rule.params.minVal}
                </span>
              )}
              {rule.params.maxVal !== undefined && (
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  Max: {rule.params.maxVal}
                </span>
              )}
              {rule.params.fallbackValue !== undefined && (
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                  Fallback: {rule.params.fallbackValue}
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                {rule.executionCount} Executions
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Simulation Dry Run Output Drawer */}
      {simulationResults.length > 0 && (
        <div className={`p-6 rounded-2xl border space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-md`}>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Simulation Dry-Run: Predicted Transformations ({simulationResults.length} records affected)</span>
            </h4>
            <button
              onClick={() => setSimulationResults([])}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear Preview
            </button>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {simulationResults.map((res, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="font-bold text-indigo-400">{res.subCode}:</span>
                <div className="space-y-1 pl-3">
                  {res.diffs.map((d, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-400">{d.field}:</span>
                      <span className="text-rose-400 line-through">"{String(d.originalValue)}"</span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-emerald-400 font-bold">"{String(d.cleanedValue)}"</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                        [{d.ruleApplied}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD RULE MODAL */}
      {isAddingRule && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Create Cleaning Transformation</h3>
                  <p className="text-xs text-slate-400">Define rule logic and target column</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingRule(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400">Rule Display Name</label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={e => setRuleName(e.target.value)}
                  placeholder="e.g. Standardize Village Spelling or Clamp pH Range"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400">Target Field / Column</label>
                  <input
                    type="text"
                    value={targetField}
                    onChange={e => setTargetField(e.target.value)}
                    placeholder="e.g. yield_estimate_kg or * for all"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">Transformation Action</label>
                  <select
                    value={actionType}
                    onChange={e => setActionType(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="trim_whitespace">Trim Whitespace</option>
                    <option value="title_case">Capitalize Title Case</option>
                    <option value="upper_case">UPPERCASE</option>
                    <option value="lower_case">lowercase</option>
                    <option value="phone_e164">Phone Standard (+1 XXX-XXX-XXXX)</option>
                    <option value="clamp_numeric_range">Clamp Numeric Range</option>
                    <option value="impute_missing">Impute Missing Fallback</option>
                    <option value="mask_pii">Mask PII (••••-XXXX)</option>
                    <option value="regex_replace">Regex Pattern Replace</option>
                  </select>
                </div>
              </div>

              {actionType === 'clamp_numeric_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400">Min Clamp Value</label>
                    <input
                      type="number"
                      value={minVal}
                      onChange={e => setMinVal(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 0"
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400">Max Clamp Value</label>
                    <input
                      type="number"
                      value={maxVal}
                      onChange={e => setMaxVal(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 5000"
                      className={`w-full px-3 py-2 rounded-xl text-xs border ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              {actionType === 'impute_missing' && (
                <div>
                  <label className="text-xs font-bold text-slate-400">Fallback Imputation Value</label>
                  <input
                    type="text"
                    value={fallbackVal}
                    onChange={e => setFallbackVal(e.target.value)}
                    placeholder="e.g. 450 or Unknown"
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule to Recipe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
