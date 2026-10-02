import React, { useState } from 'react';
import {
  X,
  Zap,
  TrendingUp,
  HelpCircle,
  Copy,
  Lock,
  ShieldAlert,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Database,
  ArrowRight,
  Sliders,
  Layers
} from 'lucide-react';
import { Dataset } from '../../types';
import {
  StressScenarioType,
  STRESS_SCENARIOS,
  generateDeterministicStressData,
  generateAiStressData,
  injectStressRows
} from '../../utils/stressDataEngine';

interface StressDataGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const StressDataGeneratorModal: React.FC<StressDataGeneratorModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<StressScenarioType>('extreme_outliers');
  const [rowCount, setRowCount] = useState<number>(5);
  const [injectMode, setInjectMode] = useState<'append' | 'replace'>('append');
  const [customAiPrompt, setCustomAiPrompt] = useState<string>('Simulate 5 adversarial customer purchases with extreme negative quantities, invalid emails, and stolen cards.');
  const [useGeminiAi, setUseGeminiAi] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[] | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentScenarioDef = STRESS_SCENARIOS.find(s => s.id === selectedScenario) || STRESS_SCENARIOS[0];

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    setPreviewRows(null);

    try {
      if (useGeminiAi || selectedScenario === 'gemini_custom') {
        const res = await generateAiStressData(
          dataset,
          selectedScenario,
          selectedScenario === 'gemini_custom' ? customAiPrompt : currentScenarioDef.title,
          rowCount
        );
        setPreviewRows(res.records);
        setModelUsed(res.modelUsed || 'gemini-3.8-flash');
      } else {
        const rows = generateDeterministicStressData(dataset, selectedScenario, rowCount);
        setPreviewRows(rows);
        setModelUsed('DataHub Embedded Engine (Deterministic)');
      }
    } catch (err) {
      console.error('Failed to generate stress rows:', err);
      // Fallback
      const rows = generateDeterministicStressData(dataset, selectedScenario, rowCount);
      setPreviewRows(rows);
      setModelUsed('DataHub Embedded Engine (Fallback)');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitInjection = () => {
    if (!previewRows || previewRows.length === 0) return;

    const { updatedDataset, count } = injectStressRows(
      dataset,
      previewRows,
      injectMode,
      currentScenarioDef.title
    );

    onUpdateDataset(updatedDataset);
    setSuccessToast(`Successfully injected ${count} stress records into dataset with a rollback snapshot.`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const getScenarioIcon = (id: StressScenarioType) => {
    switch (id) {
      case 'extreme_outliers': return <TrendingUp className="w-4 h-4 text-rose-400" />;
      case 'sparse_missing': return <HelpCircle className="w-4 h-4 text-amber-400" />;
      case 'duplicate_burst': return <Copy className="w-4 h-4 text-cyan-400" />;
      case 'format_chaos': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'adversarial_pii': return <Lock className="w-4 h-4 text-purple-400" />;
      case 'contract_breakers': return <ShieldAlert className="w-4 h-4 text-orange-400" />;
      case 'gemini_custom': return <Sparkles className="w-4 h-4 text-indigo-400" />;
      default: return <Sliders className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Synthetic Edge-Case & Stress Data Generator
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Adversarial Testbed
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Simulate real-world data corruption, extreme outliers, PII leaks, and contract violations to stress-test your pipelines.
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
          
          {/* Scenario Selection Cards Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              1. Choose Stress Injection Scenario
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STRESS_SCENARIOS.map((scenario) => {
                const isSelected = selectedScenario === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      setSelectedScenario(scenario.id);
                      setPreviewRows(null);
                    }}
                    className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        {getScenarioIcon(scenario.id)}
                        <span>{scenario.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {scenario.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {scenario.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Gemini Prompt if gemini_custom is selected */}
          {selectedScenario === 'gemini_custom' && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2 animate-in fade-in">
              <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Prompt Gemini 3.8 Flash for Custom Adversarial Records
              </label>
              <textarea
                rows={2}
                value={customAiPrompt}
                onChange={(e) => setCustomAiPrompt(e.target.value)}
                placeholder="e.g. Simulate 5 extreme e-commerce fraud attempts with negative tax and duplicate addresses."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 custom-scrollbar"
              />
            </div>
          )}

          {/* Configuration Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              2. Generator Controls & Volume
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Row count */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Record Volume
                </label>
                <div className="flex items-center gap-2">
                  {[5, 10, 15, 25].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setRowCount(cnt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        rowCount === cnt
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cnt} rows
                    </button>
                  ))}
                </div>
              </div>

              {/* Injection Target Mode */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Injection Target
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInjectMode('append')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      injectMode === 'append'
                        ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    Append to Active Data
                  </button>
                  <button
                    onClick={() => setInjectMode('replace')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      injectMode === 'replace'
                        ? 'bg-slate-800 text-rose-300 border-rose-500/50'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    Replace as Sandbox
                  </button>
                </div>
              </div>

              {/* Engine Toggle */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Generation Mode
                </label>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={useGeminiAi || selectedScenario === 'gemini_custom'}
                    disabled={selectedScenario === 'gemini_custom'}
                    onChange={(e) => setUseGeminiAi(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Use Gemini 3.8 Flash AI
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleGeneratePreview}
                disabled={isGenerating}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-amber-600/20 flex items-center gap-2"
              >
                {isGenerating ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Synthesizing Edge Cases...' : 'Generate Stress Records Preview'}</span>
              </button>
            </div>
          </div>

          {/* Generated Preview Table */}
          {previewRows && (
            <div className="space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Synthetic Payload Preview ({previewRows.length} records)
                  </span>
                  {modelUsed && (
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {modelUsed}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleCommitInjection}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Inject {previewRows.length} Records into Dataset</span>
                </button>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/80">
                <div className="max-h-56 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/90 text-slate-400 sticky top-0 font-mono text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5 w-12 text-center">#</th>
                        {dataset.columns.map(c => (
                          <th key={c.name} className="p-2.5 whitespace-nowrap">
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="p-2.5 text-slate-500 text-center">#{idx + 1}</td>
                          {dataset.columns.map(c => {
                            const val = row[c.name];
                            const isNull = val === null || val === undefined || val === '';
                            return (
                              <td key={c.name} className="p-2.5 whitespace-nowrap max-w-[180px] truncate">
                                {isNull ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                                    &lt;NULL&gt;
                                  </span>
                                ) : (
                                  <span className="text-slate-200">{String(val)}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Injecting stress data automatically creates a rollback version snapshot.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
            >
              Cancel
            </button>
            {previewRows && (
              <button
                onClick={handleCommitInjection}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20"
              >
                Inject into Dataset
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
