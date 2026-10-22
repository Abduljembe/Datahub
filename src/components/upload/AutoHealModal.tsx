import React, { useState, useMemo } from 'react';
import {
  Wand2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  X,
  History,
  Check,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { Dataset } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { analyzeAndAutoHealDataset, AutoHealResult } from '../../utils/autoHealEngine';
import { createDatasetSnapshot } from '../../utils/versionEngine';

interface AutoHealModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset | null;
  onUpdateDataset: (updatedDataset: Dataset) => void;
}

export const AutoHealModal: React.FC<AutoHealModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset
}) => {
  const { isDark } = useTheme();
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Compute auto-heal analysis
  const healResult: AutoHealResult | null = useMemo(() => {
    if (!dataset || !dataset.data || dataset.data.length === 0) return null;
    return analyzeAndAutoHealDataset(dataset);
  }, [dataset]);

  if (!isOpen || !dataset) return null;

  const handleApplyAutoHeal = () => {
    if (!healResult) return;
    setIsApplying(true);

    try {
      // 1. Create historical snapshot before applying
      createDatasetSnapshot(dataset, {
        name: 'Pre-AutoHeal Snapshot',
        description: 'Automatic backup snapshot captured prior to 1-Click Auto-Heal pipeline remediation.',
        tag: 'manual_snapshot'
      });

      // 2. Build updated dataset
      const updatedDataset: Dataset = {
        ...dataset,
        data: healResult.healedData,
        columns: healResult.healedColumns,
        updatedAt: new Date().toISOString()
      };

      // 3. Save post-heal version
      const { updatedDataset: finalWithSnapshot } = createDatasetSnapshot(updatedDataset, {
        name: `Auto-Healed Dataset (${healResult.totalFixesApplied} fixes)`,
        description: `Standardized data types, imputed nulls, normalized dates and clamped anomalies. Health score upgraded to ${healResult.healthScoreAfter}%.`,
        tag: 'cleaned'
      });

      onUpdateDataset(finalWithSnapshot);
      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        setIsApplying(false);
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Wand2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">
                  1-Click Auto-Heal & Standardize
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  Zero Egress AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated in-memory data hygiene repair, currency parsing, and null imputation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Health Score Upgrade Banner */}
          {healResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Health Score Lift</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black font-mono text-slate-400">{healResult.healthScoreBefore}%</span>
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                    <span className="text-3xl font-black font-mono text-emerald-400">{healResult.healthScoreAfter}%</span>
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-800 hidden sm:block" />

                <div>
                  <span className="text-xs font-bold text-white block">
                    {healResult.totalFixesApplied.toLocaleString()} Defects Remediated
                  </span>
                  <span className="text-xs text-slate-400 block">
                    {healResult.issues.length} distinct data hygiene categories resolved
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Audit Safe
                </span>
              </div>
            </div>
          )}

          {/* Issue Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
              Diagnosed Data Quality Issues & Automated Fixes
            </h4>

            {healResult && healResult.issues.length > 0 ? (
              <div className="space-y-2.5">
                {healResult.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">{issue.title}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                              {issue.count.toLocaleString()} occurrences
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {issue.autoFixDescription}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full ${
                          issue.severity === 'high'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : issue.severity === 'medium'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {issue.severity} priority
                        </span>
                      </div>
                    </div>

                    {/* Sample Before / After Pill */}
                    {issue.sampleBefore && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-rose-400 line-through truncate max-w-[140px] sm:max-w-xs">{issue.sampleBefore}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="text-emerald-400 font-bold truncate max-w-[140px] sm:max-w-xs">{issue.sampleAfter}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h5 className="font-bold text-sm text-white">Primacy Integrity Validated</h5>
                <p className="text-xs text-slate-400 mt-1">
                  No critical missing values, dirty currency strings, or date defects detected in active dataset.
                </p>
              </div>
            )}
          </div>

          {/* Safety Notice */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
            <History className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Safe Reversible Operation:</strong> An automated dataset version snapshot will be archived before applying changes, allowing 1-click historical rollback at any time.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-4 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApplyAutoHeal}
            disabled={isApplying || appliedSuccess || !healResult || healResult.totalFixesApplied === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
              appliedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white shadow-indigo-600/30 disabled:opacity-40'
            }`}
          >
            {isApplying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Applying In-Memory Repair...</span>
              </>
            ) : appliedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Dataset Auto-Healed!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                <span>Apply Auto-Heal & Snapshot</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
