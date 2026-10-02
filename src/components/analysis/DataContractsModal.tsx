import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Zap,
  Info,
  SlidersHorizontal,
  Download,
  Database
} from 'lucide-react';
import { Dataset } from '../../types';
import {
  ValidationRule,
  RuleType,
  RuleSeverity,
  loadDatasetContracts,
  saveDatasetContracts,
  generateRecommendedContracts,
  evaluateDatasetContracts,
  purgeViolatingRows,
  ContractEvaluationReport,
  RuleEvaluationResult
} from '../../utils/contractEngine';

interface DataContractsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const DataContractsModal: React.FC<DataContractsModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
}) => {
  const [rules, setRules] = useState<ValidationRule[]>(() => loadDatasetContracts(dataset));
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Rule Form State
  const [newCol, setNewCol] = useState<string>(dataset.columns[0]?.name || '');
  const [newType, setNewType] = useState<RuleType>('not_null');
  const [newSeverity, setNewSeverity] = useState<RuleSeverity>('error');
  const [newName, setNewName] = useState<string>('');
  const [newMin, setNewMin] = useState<string>('');
  const [newMax, setNewMax] = useState<string>('');
  const [newAllowed, setNewAllowed] = useState<string>('');
  const [newPattern, setNewPattern] = useState<string>('');
  const [newMinLen, setNewMinLen] = useState<string>('');
  const [newMaxLen, setNewMaxLen] = useState<string>('');

  // Persist rules whenever they change
  useEffect(() => {
    saveDatasetContracts(dataset.id, rules);
  }, [rules, dataset.id]);

  // Compute evaluation report
  const report: ContractEvaluationReport = useMemo(() => {
    return evaluateDatasetContracts(dataset, rules);
  }, [dataset, rules]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    showToast('Rule deleted');
  };

  const handleResetToRecommendations = () => {
    const recommended = generateRecommendedContracts(dataset);
    setRules(recommended);
    showToast('Generated recommended data contracts');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCol) return;

    const createdRule: ValidationRule = {
      id: `rule_custom_${Date.now()}`,
      column: newCol,
      name: newName.trim() || `${newCol} ${newType.replace('_', ' ')}`,
      type: newType,
      severity: newSeverity,
      enabled: true,
      params: {
        minValue: newMin !== '' ? Number(newMin) : undefined,
        maxValue: newMax !== '' ? Number(newMax) : undefined,
        allowedValues: newAllowed ? newAllowed.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        pattern: newPattern.trim() || undefined,
        minLength: newMinLen !== '' ? Number(newMinLen) : undefined,
        maxLength: newMaxLen !== '' ? Number(newMaxLen) : undefined,
      },
      description: `Contract assertion for column '${newCol}'.`,
    };

    setRules(prev => [createdRule, ...prev]);
    setIsAddingRule(false);
    // Reset form fields
    setNewName('');
    setNewMin('');
    setNewMax('');
    setNewAllowed('');
    setNewPattern('');
    setNewMinLen('');
    setNewMaxLen('');
    showToast(`Added contract rule: ${createdRule.name}`);
  };

  const handlePurgeRuleViolations = (res: RuleEvaluationResult) => {
    if (res.violations.length === 0) return;
    const indices = res.violations.map(v => v.rowIndex);
    const { updatedDataset, removedCount } = purgeViolatingRows(dataset, indices, res.rule.name);
    onUpdateDataset(updatedDataset);
    showToast(`Purged ${removedCount} violating rows and created a rollback snapshot.`);
  };

  const handlePurgeAllViolations = () => {
    const allIndices: number[] = [];
    report.results.forEach(res => {
      res.violations.forEach(v => allIndices.push(v.rowIndex));
    });
    if (allIndices.length === 0) return;

    const uniqueIndices = Array.from(new Set(allIndices));
    const { updatedDataset, removedCount } = purgeViolatingRows(dataset, uniqueIndices, 'All Failing Contracts');
    onUpdateDataset(updatedDataset);
    showToast(`Purged ${removedCount} violating rows across all contracts.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              report.status === 'compliant'
                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400'
                : report.status === 'warning'
                ? 'bg-amber-600/20 border-amber-500/30 text-amber-400'
                : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
            }`}>
              {report.status === 'compliant' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Data Contracts & Validation Rules
                <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                  report.status === 'compliant'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : report.status === 'warning'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {report.status === 'compliant' ? '100% Compliant' : `${report.failingRulesCount} Rules Failing`}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Define and enforce expected constraints (bounds, whitelist, regex, not-null) across your active dataset.
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

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Bento Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Active Contracts
              </span>
              <div className="text-2xl font-extrabold text-white">
                {report.totalRules}
              </div>
              <span className="text-[11px] text-slate-500">
                Rules enforced
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Passing Rules
              </span>
              <div className="text-2xl font-extrabold text-emerald-400">
                {report.passingRulesCount} / {report.totalRules}
              </div>
              <span className="text-[11px] text-slate-500">
                Rules 100% satisfied
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Failing Rules
              </span>
              <div className={`text-2xl font-extrabold ${report.failingRulesCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {report.failingRulesCount}
              </div>
              <span className="text-[11px] text-slate-500">
                Rules with violations
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Compliance Rate
              </span>
              <div className="text-2xl font-extrabold text-cyan-400">
                {report.overallPassRate}%
              </div>
              <span className="text-[11px] text-slate-500">
                Across {report.evaluatedRows} rows
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingRule(!isAddingRule)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingRule ? 'Cancel Form' : 'Add Rule'}</span>
              </button>

              <button
                onClick={handleResetToRecommendations}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
                title="Auto-inferred contracts based on dataset types & ranges"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Generate Contracts</span>
              </button>
            </div>

            {report.failingRulesCount > 0 && (
              <button
                onClick={handlePurgeAllViolations}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Purge All Violating Rows</span>
              </button>
            )}
          </div>

          {/* Add Rule Form */}
          {isAddingRule && (
            <form onSubmit={handleCreateRule} className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-4 animate-in fade-in">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Create New Validation Rule
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Column */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Column</label>
                  <select
                    value={newCol}
                    onChange={(e) => setNewCol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {dataset.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
                    ))}
                  </select>
                </div>

                {/* Rule Type */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Rule Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as RuleType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="not_null">Not Null / Required</option>
                    <option value="unique">Unique Identifier</option>
                    <option value="min_value">Min Value (&gt;= X)</option>
                    <option value="max_value">Max Value (&lt;= X)</option>
                    <option value="range">Range [Min, Max]</option>
                    <option value="allowed_values">Allowed Whitelist (Enum)</option>
                    <option value="regex_match">Regex Pattern Match</option>
                    <option value="string_length">String Length [Min, Max]</option>
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as RuleSeverity)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="error">Error (Critical Violation)</option>
                    <option value="warning">Warning (Non-Blocking)</option>
                  </select>
                </div>

                {/* Rule Label */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Rule Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Legal Age &gt;= 18"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Parameter Inputs */}
              <div className="pt-2 border-t border-indigo-500/20">
                {(newType === 'min_value' || newType === 'range') && (
                  <div className="inline-block mr-3">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Min Value</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newMin}
                      onChange={(e) => setNewMin(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-32"
                    />
                  </div>
                )}

                {(newType === 'max_value' || newType === 'range') && (
                  <div className="inline-block mr-3">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Max Value</label>
                    <input
                      type="number"
                      placeholder="100"
                      value={newMax}
                      onChange={(e) => setNewMax(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-32"
                    />
                  </div>
                )}

                {newType === 'allowed_values' && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Allowed Values (Comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Active, Pending, Closed, Archived"
                      value={newAllowed}
                      onChange={(e) => setNewAllowed(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {newType === 'regex_match' && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Regex Pattern</label>
                    <input
                      type="text"
                      placeholder="e.g. ^[A-Z]{3}-\d{4}$"
                      value={newPattern}
                      onChange={(e) => setNewPattern(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {newType === 'string_length' && (
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Min Length</label>
                      <input
                        type="number"
                        placeholder="1"
                        value={newMinLen}
                        onChange={(e) => setNewMinLen(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-28"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Max Length</label>
                      <input
                        type="number"
                        placeholder="50"
                        value={newMaxLen}
                        onChange={(e) => setNewMaxLen(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-28"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRule(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
                >
                  Save Contract Rule
                </button>
              </div>
            </form>
          )}

          {/* Rules List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Configured Rules ({rules.length})</span>
            </h4>

            {report.results.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-400">No active rules defined. Click "Auto-Generate Contracts" or "+ Add Rule" to enforce expectations.</p>
              </div>
            ) : (
              report.results.map((res) => {
                const { rule, passed, passCount, failCount, passPercentage, violations } = res;
                const isExpanded = expandedRuleId === rule.id;

                return (
                  <div
                    key={rule.id}
                    className={`p-4 bg-slate-950/80 border rounded-2xl space-y-3 transition-all ${
                      passed
                        ? 'border-slate-800 hover:border-slate-700'
                        : rule.severity === 'error'
                        ? 'border-rose-500/40 bg-rose-950/10'
                        : 'border-amber-500/40 bg-amber-950/10'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                          className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
                          title="Enable / Disable Rule"
                        />
                        
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {rule.name}
                            </span>
                            <span className="text-xs font-mono px-2 py-0.2 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                              {rule.column}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.2 rounded-full border ${
                              rule.severity === 'error'
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}>
                              {rule.severity}
                            </span>
                          </div>
                          {rule.description && (
                            <p className="text-[11px] text-slate-400">{rule.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold font-mono px-2 py-1 rounded-lg border ${
                          passed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}>
                          {passPercentage}% Pass ({failCount} fails)
                        </span>

                        {!passed && (
                          <button
                            onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1"
                          >
                            <span>Inspect ({violations.length})</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          passed ? 'bg-emerald-500' : rule.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${passPercentage}%` }}
                      />
                    </div>

                    {/* Expanded Violations Drawer */}
                    {isExpanded && !passed && (
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Violating Rows Sample ({violations.length} total)
                          </span>
                          <button
                            onClick={() => handlePurgeRuleViolations(res)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Drop {violations.length} Violating Row(s)</span>
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg">
                          <table className="w-full text-[11px] text-left border-collapse">
                            <thead className="bg-slate-950 text-slate-400 font-semibold">
                              <tr>
                                <th className="p-2 border-b border-slate-800 w-16">Row #</th>
                                <th className="p-2 border-b border-slate-800 w-32">Invalid Value</th>
                                <th className="p-2 border-b border-slate-800">Violation Reason</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {violations.slice(0, 10).map((v, i) => (
                                <tr key={i} className="hover:bg-slate-800/40">
                                  <td className="p-2 text-slate-500">#{v.rowIndex + 1}</td>
                                  <td className="p-2 text-rose-400 font-bold truncate max-w-[120px]">
                                    {v.value === null ? '<NULL>' : String(v.value)}
                                  </td>
                                  <td className="p-2 text-slate-300 font-sans">{v.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Remediating contract violations automatically creates a version snapshot.
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700"
          >
            Close Contracts
          </button>
        </div>

      </div>
    </div>
  );
};
