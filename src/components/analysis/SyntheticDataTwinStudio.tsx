import React, { useState } from 'react';
import { 
  Sparkles, 
  Binary, 
  Download, 
  CheckCircle2, 
  Sliders, 
  ShieldCheck, 
  Database, 
  Layers, 
  RefreshCw,
  PlusCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { Dataset } from '../../types';
import { generateSyntheticTwin, SyntheticFidelityReport } from '../../utils/syntheticDataEngine';
import { exportToCSV, exportToExcel } from '../../utils/dataEngine';

interface SyntheticDataTwinStudioProps {
  dataset: Dataset;
  onAddDataset?: (newDataset: Dataset) => void;
}

export const SyntheticDataTwinStudio: React.FC<SyntheticDataTwinStudioProps> = ({
  dataset,
  onAddDataset,
}) => {
  const [sampleSize, setSampleSize] = useState<number>(dataset.data.length || 100);
  const [epsilon, setEpsilon] = useState<number>(2.0);
  const [dpEnabled, setDpEnabled] = useState<boolean>(true);
  const [preserveCorrelations, setPreserveCorrelations] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [syntheticResult, setSyntheticResult] = useState<{
    syntheticDataset: Dataset;
    fidelityReport: SyntheticFidelityReport;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const result = generateSyntheticTwin(dataset, {
          sampleSize,
          epsilonPrivacy: epsilon,
          preserveCorrelations,
          differentialPrivacyEnabled: dpEnabled,
        });
        setSyntheticResult(result);
        setToastMessage(`✨ Synthesized ${result.syntheticDataset.data.length} records with ${result.fidelityReport.overallFidelityScore}% statistical fidelity.`);
        setTimeout(() => setToastMessage(null), 4000);
      } catch (err: any) {
        setToastMessage(`Error: ${err.message}`);
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  const handleLoadIntoWorkspace = () => {
    if (!syntheticResult || !onAddDataset) return;
    onAddDataset(syntheticResult.syntheticDataset);
    setToastMessage('📥 Synthetic dataset added to your active workspace datasets.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
              <Binary className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Synthetic Data Digital Twin Generator
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Differential Privacy
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate high-fidelity statistical digital twins mimicking marginal distributions and cross-feature correlations with zero real subject records.
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            <span>{syntheticResult ? 'Re-Generate Twin' : 'Generate Synthetic Twin'}</span>
          </button>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Synthetic Row Count (N)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={10}
                max={5000}
                value={sampleSize}
                onChange={(e) => setSampleSize(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 font-mono shrink-0">rows</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Privacy Budget (ε = {epsilon})
              </label>
              <span className="text-[10px] text-cyan-400 font-mono">
                {epsilon <= 1.0 ? 'High Privacy' : epsilon <= 3.0 ? 'Balanced' : 'High Fidelity'}
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={5.0}
              step={0.2}
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={dpEnabled}
                onChange={(e) => setDpEnabled(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Differential Privacy Noise</span>
            </label>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={preserveCorrelations}
                onChange={(e) => setPreserveCorrelations(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Preserve Covariance Matrix</span>
            </label>
          </div>
        </div>

        {toastMessage && (
          <div className="p-3 bg-cyan-950/60 border border-cyan-500/30 rounded-xl text-xs text-cyan-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Synthetic Results & Fidelity Dashboard */}
      {syntheticResult && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Fidelity Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Fidelity Score</div>
              <div className="text-3xl font-black text-cyan-400 mt-1">
                {syntheticResult.fidelityReport.overallFidelityScore}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Statistical congruence across numeric moments and category frequencies
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correlation Preservation</div>
              <div className="text-3xl font-black text-indigo-400 mt-1">
                {syntheticResult.fidelityReport.correlationPreservationScore}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Preservation of cross-feature pairwise relationship directions
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Privacy Guarantee</div>
                <div className="text-xs text-emerald-400 font-semibold mt-1">
                  {syntheticResult.fidelityReport.privacyGuarantee}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Zero real subjects included</div>
            </div>
          </div>

          {/* Numeric Moments Comparison Table */}
          {syntheticResult.fidelityReport.numericMetrics.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Statistical Moment Comparison (Original vs Synthetic)
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                      <th className="p-3 font-semibold font-sans">Feature Name</th>
                      <th className="p-3 font-semibold">Original Mean</th>
                      <th className="p-3 font-semibold text-cyan-400">Synthetic Mean</th>
                      <th className="p-3 font-semibold">Original Std</th>
                      <th className="p-3 font-semibold text-cyan-400">Synthetic Std</th>
                      <th className="p-3 font-semibold font-sans">Fidelity Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {syntheticResult.fidelityReport.numericMetrics.map((metric, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-3 font-sans font-semibold text-white">{metric.column}</td>
                        <td className="p-3 text-slate-300">{metric.originalMean}</td>
                        <td className="p-3 text-cyan-300 font-bold">{metric.syntheticMean}</td>
                        <td className="p-3 text-slate-300">{metric.originalStd}</td>
                        <td className="p-3 text-cyan-300">{metric.syntheticStd}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                            {metric.fidelityScore}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export & Integration Center */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Distribute & Share Synthetic Twin</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Safe for external sharing, hackathons, academic publications, and public code repositories.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => exportToCSV(syntheticResult.syntheticDataset)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download CSV</span>
              </button>

              <button
                onClick={() => exportToExcel(syntheticResult.syntheticDataset)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Excel</span>
              </button>

              {onAddDataset && (
                <button
                  onClick={handleLoadIntoWorkspace}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-teal-600/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Import as New Workspace Dataset</span>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
