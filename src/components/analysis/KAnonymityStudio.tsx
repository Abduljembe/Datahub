import React, { useState, useMemo } from 'react';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Eye, 
  Layers, 
  HelpCircle,
  Scissors
} from 'lucide-react';
import { Dataset } from '../../types';
import { 
  detectQuasiIdentifiers, 
  computeKAnonymity, 
  applyGeneralizationAndSuppression, 
  GeneralizationRule,
  KAnonymityReport 
} from '../../utils/kAnonymityEngine';

interface KAnonymityStudioProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const KAnonymityStudio: React.FC<KAnonymityStudioProps> = ({
  dataset,
  onUpdateDataset,
}) => {
  const candidates = useMemo(() => detectQuasiIdentifiers(dataset), [dataset]);
  
  // Default selected QIs: all flagged likely quasi-identifiers, or first 3 columns
  const defaultSelectedQIs = useMemo(() => {
    const likely = candidates.filter(c => c.isLikelyQI).map(c => c.column);
    if (likely.length > 0) return likely.slice(0, 4);
    return dataset.columns.slice(0, 3).map(c => c.name);
  }, [candidates, dataset.columns]);

  const [selectedQIs, setSelectedQIs] = useState<string[]>(defaultSelectedQIs);
  const [targetK, setTargetK] = useState<number>(5);
  const [sensitiveColumn, setSensitiveColumn] = useState<string>('');
  const [suppressOutliers, setSuppressOutliers] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Compute live k-anonymity report
  const report: KAnonymityReport = useMemo(() => {
    return computeKAnonymity(dataset, selectedQIs, {
      targetK,
      sensitiveColumn: sensitiveColumn || undefined,
    });
  }, [dataset, selectedQIs, targetK, sensitiveColumn]);

  const toggleQI = (colName: string) => {
    setSelectedQIs(prev => 
      prev.includes(colName) 
        ? prev.filter(c => c !== colName) 
        : [...prev, colName]
    );
  };

  const handleApplyRecommendedGeneralization = () => {
    const rules: GeneralizationRule[] = [];

    selectedQIs.forEach(colName => {
      const candidate = candidates.find(c => c.column === colName);
      if (candidate) {
        if (candidate.recommendedGeneralization === 'binning_10') {
          rules.push({ column: colName, method: 'binning_10' });
        } else if (candidate.recommendedGeneralization === 'binning_5') {
          rules.push({ column: colName, method: 'binning_5' });
        } else if (candidate.recommendedGeneralization === 'zip_3digit') {
          rules.push({ column: colName, method: 'zip_3digit' });
        } else if (candidate.recommendedGeneralization === 'year_only') {
          rules.push({ column: colName, method: 'year_only' });
        }
      } else {
        const col = dataset.columns.find(c => c.name === colName);
        if (col?.type === 'number') {
          rules.push({ column: colName, method: 'binning_10' });
        }
      }
    });

    if (rules.length === 0) {
      setNotification('No generalization rules applicable to the selected columns.');
      return;
    }

    try {
      const result = applyGeneralizationAndSuppression(dataset, rules, {
        suppressOutliersBelowK: suppressOutliers ? targetK : undefined,
        quasiIdentifiers: selectedQIs,
      });

      onUpdateDataset(result.updatedDataset);
      setNotification(
        `🛡️ Applied generalization to ${result.generalizedColumnsCount} column(s). New min k = ${result.afterReport.minK} (was ${result.beforeReport.minK}).`
      );
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview & Metric Cards */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border ${
              report.satisfiesTargetK 
                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-600/20 border-amber-500/30 text-amber-400'
            }`}>
              {report.satisfiesTargetK ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  k-Anonymity & Quasi-Identifier Risk Assessment
                </h2>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  report.riskRating === 'LOW'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : report.riskRating === 'MODERATE'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {report.riskRating} RISK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates re-identification risk when combining demographic and geographic attributes. Generalize or bin values into cohorts of at least k={targetK}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="text-slate-400">Target k:</span>
              <select
                value={targetK}
                onChange={(e) => setTargetK(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={2} className="bg-slate-900">k = 2 (Basic)</option>
                <option value={3} className="bg-slate-900">k = 3 (Research)</option>
                <option value={5} className="bg-slate-900">k = 5 (Standard Safe)</option>
                <option value={10} className="bg-slate-900">k = 10 (Clinical / Public)</option>
              </select>
            </div>

            <button
              onClick={handleApplyRecommendedGeneralization}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Generalize ({selectedQIs.length} QIs)</span>
            </button>
          </div>
        </div>

        {/* Metric Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Minimum k Score</div>
            <div className={`text-2xl font-black mt-1 ${report.minK >= targetK ? 'text-emerald-400' : 'text-rose-400'}`}>
              k = {report.minK}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {report.minK >= targetK ? `Meets target (≥ ${targetK})` : `Violates target (< ${targetK})`}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unique Records (k=1)</div>
            <div className={`text-2xl font-black mt-1 ${report.uniqueRecordsCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {report.uniqueRecordsCount} <span className="text-xs font-normal text-slate-500">({report.uniqueRecordsPercentage}%)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Uniquely identifiable persons</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Equivalence Classes</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {report.totalEquivalenceClasses.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Avg class size: {report.averageK}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Re-Identification Risk</div>
            <div className="text-2xl font-black text-indigo-400 mt-1">
              {report.reidentificationRiskScore}<span className="text-xs font-normal text-slate-500">/100</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Adversarial linkage probability</div>
          </div>
        </div>

        {notification && (
          <div className="p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Quasi-Identifier Configuration Panel */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Select Quasi-Identifiers (QIs) to Analyze
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select attributes that an external attacker could correlate with public registries (e.g., Age, Gender, Zip Code).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                checked={suppressOutliers}
                onChange={(e) => setSuppressOutliers(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
              />
              <span>Suppress residual outliers with k &lt; {targetK}</span>
            </label>
          </div>
        </div>

        {/* Column Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
          {candidates.map((cand) => {
            const isSelected = selectedQIs.includes(cand.column);
            return (
              <button
                key={cand.column}
                onClick={() => toggleQI(cand.column)}
                className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold truncate font-mono text-[11px]">{cand.column}</span>
                  {cand.isLikelyQI && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans">
                      Likely QI
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="capitalize">{cand.category}</span>
                  <span>{cand.cardinality} values</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vulnerable Equivalence Classes Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-rose-400" />
              Most Vulnerable Equivalence Classes (Smallest Cohorts)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These combinations of attributes have the smallest group sizes and are vulnerable to individual re-identification.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing top {report.sampleEquivalenceClasses.length} cohorts
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-slate-400">
                <th className="p-3 font-semibold">Cohort Size</th>
                <th className="p-3 font-semibold">Risk Status</th>
                {selectedQIs.map(qi => (
                  <th key={qi} className="p-3 font-semibold text-slate-300">{qi}</th>
                ))}
                <th className="p-3 font-semibold">Row Indices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {report.sampleEquivalenceClasses.map((cls, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      cls.size === 1 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : cls.size < targetK
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      k = {cls.size}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                      {cls.riskLevel}
                    </span>
                  </td>
                  {selectedQIs.map(qi => (
                    <td key={qi} className="p-3 text-slate-300 truncate max-w-[160px]">
                      {String(cls.qiValues[qi] ?? 'null')}
                    </td>
                  ))}
                  <td className="p-3 text-slate-500 text-[11px]">
                    {cls.rowIndices.slice(0, 4).map(i => `#${i + 1}`).join(', ')}
                    {cls.rowIndices.length > 4 && ` +${cls.rowIndices.length - 4}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
