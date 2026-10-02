import React, { useState, useMemo } from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  Database,
  RefreshCw,
  Zap,
  Sliders
} from 'lucide-react';
import { Dataset } from '../../types';
import { 
  scanDatasetForPii, 
  maskColumnData, 
  maskAllDetections, 
  exportMaskedDataset,
  MaskingStrategy, 
  PiiDetection,
  applyMask
} from '../../utils/piiEngine';
import { Download } from 'lucide-react';

interface PiiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const PiiScannerModal: React.FC<PiiScannerModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
}) => {
  const scanResult = useMemo(() => scanDatasetForPii(dataset), [dataset]);
  
  // Custom strategy per detection ID
  const [strategies, setStrategies] = useState<Record<string, MaskingStrategy>>({});
  const [globalStrategy, setGlobalStrategy] = useState<MaskingStrategy>('partial_mask');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const getStrategyFor = (detection: PiiDetection): MaskingStrategy => {
    return strategies[detection.id] || detection.suggestedStrategy;
  };

  const handleSetStrategy = (id: string, strat: MaskingStrategy) => {
    setStrategies(prev => ({ ...prev, [id]: strat }));
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleMaskSingle = (detection: PiiDetection) => {
    setProcessingId(detection.id);
    try {
      const strategy = getStrategyFor(detection);
      const { updatedDataset, rowsMasked } = maskColumnData(dataset, detection.column, detection.type, strategy);
      onUpdateDataset(updatedDataset);
      showToast(`🔒 Successfully masked ${rowsMasked} cells in '${detection.column}'`);
    } catch (err) {
      console.error('Failed to mask column:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMaskAll = () => {
    if (scanResult.detections.length === 0) return;
    setIsProcessingAll(true);
    try {
      const { updatedDataset, summary } = maskAllDetections(dataset, scanResult.detections, globalStrategy);
      onUpdateDataset(updatedDataset);
      showToast(`🎉 ${summary}`);
    } catch (err) {
      console.error('Failed to mask all:', err);
    } finally {
      setIsProcessingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              scanResult.isClean 
                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
            }`}>
              {scanResult.isClean ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                PII & Sensitive Data Scanner
                <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                  scanResult.isClean 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {scanResult.complianceRiskLevel}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Identify, audit, and anonymize Personally Identifiable Information (emails, phones, cards, SSNs, IPs) to comply with privacy frameworks.
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
          
          {/* Summary Metric Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Sensitive Records
              </span>
              <div className="text-2xl font-extrabold text-white">
                {scanResult.totalPiiCells}
              </div>
              <span className="text-[11px] text-slate-500">
                Across active rows
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Impacted Columns
              </span>
              <div className="text-2xl font-extrabold text-indigo-400">
                {scanResult.affectedColumnsCount} / {scanResult.totalColumnsAudited}
              </div>
              <span className="text-[11px] text-slate-500">
                Columns flagged
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Privacy Posture
              </span>
              <div className={`text-base font-bold truncate ${scanResult.isClean ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scanResult.isClean ? 'Clean & Compliant' : 'Privacy Exposure'}
              </div>
              <span className="text-[11px] text-slate-500">
                GDPR • CCPA • HIPAA
              </span>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Rollback Safe
              </span>
              <div className="text-base font-bold text-cyan-400 flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                Snapshot Ready
              </div>
              <span className="text-[11px] text-slate-500">
                Auto-versioned edits
              </span>
            </div>

          </div>

          {/* Quick Global Action Bar */}
          {!scanResult.isClean && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Bulk One-Click Anonymization
                </div>
                <p className="text-[11px] text-slate-400">
                  Safely mask all {scanResult.affectedColumnsCount} sensitive columns in a single transaction with automatic version checkpointing.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={globalStrategy}
                  onChange={(e) => setGlobalStrategy(e.target.value as MaskingStrategy)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="partial_mask">Partial Masking (a***@domain.com)</option>
                  <option value="sha256_hash">Deterministic Hash (hash_8f9a2b)</option>
                  <option value="full_redaction">Full Redaction ([REDACTED])</option>
                </select>

                <button
                  onClick={handleMaskAll}
                  disabled={isProcessingAll}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isProcessingAll ? 'Anonymizing...' : 'Mask All Columns'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Detailed Detections List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Detected Sensitive Columns ({scanResult.detections.length})</span>
            </h4>

            {scanResult.isClean ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h5 className="text-sm font-bold text-white">No PII Found in Active Dataset</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  All columns adhere to privacy baseline heuristics. No email addresses, phone numbers, credit cards, or national identifiers were detected.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {scanResult.detections.map((detection) => {
                  const currentStrat = getStrategyFor(detection);
                  const isBusy = processingId === detection.id || isProcessingAll;

                  return (
                    <div 
                      key={detection.id}
                      className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all"
                    >
                      {/* Top Row: Column Name, Badge, Action Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-mono font-bold text-cyan-300">
                            {detection.column}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            detection.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}>
                            {detection.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({detection.matchCount} cells • {detection.matchPercentage}%)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={currentStrat}
                            onChange={(e) => handleSetStrategy(detection.id, e.target.value as MaskingStrategy)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="partial_mask">Partial Mask</option>
                            <option value="sha256_hash">Deterministic Hash</option>
                            <option value="full_redaction">Full Redaction</option>
                          </select>

                          <button
                            onClick={() => handleMaskSingle(detection)}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{isBusy ? 'Masking...' : '1-Click Mask'}</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400">
                        {detection.description}
                      </p>

                      {/* Live Transformation Preview */}
                      {detection.sampleOriginals.length > 0 && (
                        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5 font-mono text-[11px]">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-semibold">
                            Sample Value Masking Preview:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {detection.sampleOriginals.map((orig, idx) => {
                              const maskedPreview = applyMask(orig, detection.type, currentStrat);
                              return (
                                <div key={idx} className="flex items-center gap-2 p-1.5 bg-slate-950 rounded border border-slate-800/80">
                                  <span className="text-rose-400 line-through truncate max-w-[140px]">{orig}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                                  <span className="text-emerald-400 font-bold truncate">{maskedPreview}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Anonymization triggers instant rollback snapshots in dataset version history.
          </span>

          <div className="flex items-center gap-2">
            {scanResult.detections.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl p-1">
                <button
                  onClick={() => {
                    exportMaskedDataset(dataset, {
                      format: 'csv',
                      strategy: globalStrategy,
                      detections: scanResult.detections,
                      columnOverrides: strategies,
                      includeCertificate: true,
                    });
                    showToast('🚀 Exported sanitized CSV with privacy audit certificate');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-300 hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-all"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Masked CSV</span>
                </button>
                <button
                  onClick={() => {
                    exportMaskedDataset(dataset, {
                      format: 'excel',
                      strategy: globalStrategy,
                      detections: scanResult.detections,
                      columnOverrides: strategies,
                      includeCertificate: true,
                    });
                    showToast('🚀 Exported sanitized Excel with privacy audit certificate');
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-all"
                >
                  <Download className="w-3 h-3" />
                  <span>Excel</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
