import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Database, 
  ArrowRight, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  Copy, 
  Check, 
  Info, 
  FileSpreadsheet, 
  Hash, 
  KeyRound, 
  UserX, 
  FileCheck2,
  ExternalLink,
  Plus,
  Users,
  Binary,
  Trash2,
  BookOpen
} from 'lucide-react';
import { Dataset } from '../../types';
import { 
  scanDatasetForPii, 
  maskColumnData, 
  maskAllDetections, 
  createMaskedDatasetCopy,
  exportMaskedDataset,
  generatePrivacyAuditCertificate,
  MaskingStrategy, 
  PiiDetection, 
  PiiType,
  applyMask 
} from '../../utils/piiEngine';
import { KAnonymityStudio } from './KAnonymityStudio';
import { SyntheticDataTwinStudio } from './SyntheticDataTwinStudio';
import { DsarErasurePortal } from './DsarErasurePortal';
import { DatasheetGeneratorModal } from './DatasheetGeneratorModal';

interface PrivacyMaskingStudioProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
  onAddDataset?: (dataset: Dataset) => void;
}

export const PrivacyMaskingStudio: React.FC<PrivacyMaskingStudioProps> = ({
  dataset,
  onUpdateDataset,
  onAddDataset,
}) => {
  // Active sub-tab: 'audit' vs 'k_anonymity' vs 'synthetic_twins' vs 'dsar_erasure' vs 'export' vs 'compliance'
  const [activeTab, setActiveTab] = useState<'audit' | 'k_anonymity' | 'synthetic_twins' | 'dsar_erasure' | 'export' | 'compliance'>('audit');
  const [isDatasheetOpen, setIsDatasheetOpen] = useState(false);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const scanResult = useMemo(() => scanDatasetForPii(dataset), [dataset]);

  // Per-column custom masking strategy overrides
  const [columnStrategies, setColumnStrategies] = useState<Record<string, MaskingStrategy>>({});
  const [globalStrategy, setGlobalStrategy] = useState<MaskingStrategy>('sha256_hash');

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Export form configuration
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'json'>('csv');
  const [exportStrategy, setExportStrategy] = useState<MaskingStrategy>('sha256_hash');
  const [includeCertificate, setIncludeCertificate] = useState(true);
  const [customExportName, setCustomExportName] = useState(`${dataset.name}_clean`);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const getStrategyFor = (detection: PiiDetection): MaskingStrategy => {
    return columnStrategies[detection.id] || columnStrategies[detection.column] || detection.suggestedStrategy;
  };

  const handleSetStrategy = (id: string, strat: MaskingStrategy) => {
    setColumnStrategies(prev => ({ ...prev, [id]: strat }));
  };

  // 1-Click Mask a Single Column inside working dataset
  const handleMaskSingle = (detection: PiiDetection) => {
    setIsProcessing(true);
    try {
      const strategy = getStrategyFor(detection);
      const { updatedDataset, rowsMasked } = maskColumnData(dataset, detection.column, detection.type, strategy);
      onUpdateDataset(updatedDataset);
      showToast(`🔒 Anonymized ${rowsMasked} values in column '${detection.column}' with ${strategy.replace('_', ' ')}`);
    } catch (err: any) {
      console.error(err);
      showToast(`Error: ${err?.message || 'Failed to mask column'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Mask All Detected Columns in working dataset
  const handleMaskAllInDataset = () => {
    if (scanResult.detections.length === 0) return;
    setIsProcessing(true);
    try {
      const { updatedDataset, summary } = maskAllDetections(dataset, scanResult.detections, globalStrategy);
      onUpdateDataset(updatedDataset);
      showToast(`🎉 ${summary}`);
    } catch (err: any) {
      console.error(err);
      showToast(`Error: ${err?.message || 'Failed to mask columns'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Zero-Mutation Safe Export
  const handleExportSanitized = () => {
    try {
      const result = exportMaskedDataset(dataset, {
        format: exportFormat,
        strategy: exportStrategy,
        columnOverrides: columnStrategies,
        detections: scanResult.detections,
        filename: customExportName,
        includeCertificate,
      });

      showToast(`🚀 Exported sanitized ${exportFormat.toUpperCase()} (${result.totalMaskedCells} cells masked across ${result.maskedColumnCount} columns). Original dataset was untouched.`);
    } catch (err: any) {
      console.error(err);
      showToast(`Export failed: ${err.message}`);
    }
  };

  // Download Audit Certificate Standalone
  const handleDownloadCertificateOnly = () => {
    const maskedCols = scanResult.detections.map(d => d.column);
    const cert = generatePrivacyAuditCertificate(dataset, maskedCols, scanResult.totalPiiCells, exportStrategy);
    const blob = new Blob([cert], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dataset.name}_privacy_certificate.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('📜 Downloaded Cryptographic Privacy Certificate');
  };

  // Inject sample PII columns for instant testing if dataset has none
  const handleInjectSamplePii = () => {
    const sampleEmails = ['sarah.connor@cyberdyne.org', 'john.doe@enterprise.com', 'a.turing@bletchley.ac.uk', 'ada.lovelace@analytical.io', 'e.snowden@nsa.gov'];
    const samplePhones = ['+1 (415) 555-0192', '+1 (212) 555-0143', '+44 20 7946 0912', '+1 (650) 555-0188', '+1 (312) 555-0177'];
    const sampleCards = ['4532-8901-2345-9812', '5424-1800-4321-7788', '3782-8224-6310-0051', '4024-0071-8892-1144', '5105-1051-0510-5105'];
    const sampleSsns = ['123-45-6789', '987-65-4321', '456-78-9012', '234-56-7890', '345-67-8901'];

    const newData = dataset.data.map((row, idx) => ({
      ...row,
      contact_email: sampleEmails[idx % sampleEmails.length],
      phone_number: samplePhones[idx % samplePhones.length],
      payment_card: sampleCards[idx % sampleCards.length],
      social_security: sampleSsns[idx % sampleSsns.length],
    }));

    const newCols = [...dataset.columns];
    if (!newCols.some(c => c.name === 'contact_email')) newCols.push({ name: 'contact_email', type: 'string' });
    if (!newCols.some(c => c.name === 'phone_number')) newCols.push({ name: 'phone_number', type: 'string' });
    if (!newCols.some(c => c.name === 'payment_card')) newCols.push({ name: 'payment_card', type: 'string' });
    if (!newCols.some(c => c.name === 'social_security')) newCols.push({ name: 'social_security', type: 'string' });

    onUpdateDataset({
      ...dataset,
      data: newData,
      columns: newCols,
      updatedAt: new Date().toISOString(),
    });

    showToast('✨ Added 4 sample PII columns (emails, phones, payment cards, SSNs) for privacy testing.');
  };

  // Compute live masked preview for Export tab
  const previewData = useMemo(() => {
    const { maskedDataset } = createMaskedDatasetCopy(dataset, {
      strategy: exportStrategy,
      columnOverrides: columnStrategies,
      detections: scanResult.detections,
    });
    return maskedDataset.data.slice(0, 5);
  }, [dataset, exportStrategy, columnStrategies, scanResult.detections]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Audit Score Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border ${
              scanResult.isClean 
                ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-600/20 border-rose-500/30 text-rose-400'
            }`}>
              {scanResult.isClean ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Automated Privacy Masking & PII Studio
                </h2>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  scanResult.isClean 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {scanResult.complianceRiskLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated heuristic scanner for emails, phones, SSNs, payment cards, and names. Redact or cryptographic-hash sensitive fields on-the-fly during export.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setIsScanning(true);
                setTimeout(() => {
                  setIsScanning(false);
                  showToast('Scan refreshed: Dataset audit complete.');
                }, 400);
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Rescan</span>
            </button>

            {scanResult.detections.length === 0 && (
              <button
                onClick={handleInjectSamplePii}
                className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
                title="Inject realistic demo customer data with emails and cards to test masking"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Inject Sample PII Test Data</span>
              </button>
            )}

            <button
              onClick={() => setIsDatasheetOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Generate standardized Gebru et al. (2021) Datasheet for Datasets"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dataset Datasheet (BOM)</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sanitized Export</span>
            </button>
          </div>
        </div>

        {/* Metric Bento Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PII Cells Detected</div>
            <div className="text-2xl font-black text-white mt-1">{scanResult.totalPiiCells.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {dataset.data.length.toLocaleString()} records</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Flagged Columns</div>
            <div className="text-2xl font-black text-indigo-400 mt-1">
              {scanResult.affectedColumnsCount} <span className="text-xs font-normal text-slate-500">/ {scanResult.totalColumnsAudited}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Sensitive attributes</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Privacy Posture</div>
            <div className={`text-base font-bold mt-1.5 truncate ${scanResult.isClean ? 'text-emerald-400' : 'text-rose-400'}`}>
              {scanResult.isClean ? 'Verified Clean' : 'Exposure Detected'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">GDPR • HIPAA • CCPA</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Export Protection</div>
            <div className="text-base font-bold text-teal-400 mt-1.5 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" />
              <span>Zero-Mutation</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Raw dataset preserved</div>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>PII Masking & Policy</span>
          {scanResult.detections.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 text-[10px]">
              {scanResult.detections.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('k_anonymity')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'k_anonymity'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>k-Anonymity & Quasi-IDs</span>
        </button>

        <button
          onClick={() => setActiveTab('synthetic_twins')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'synthetic_twins'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Binary className="w-3.5 h-3.5 text-amber-300" />
          <span>Synthetic Twins (DP)</span>
        </button>

        <button
          onClick={() => setActiveTab('dsar_erasure')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dsar_erasure'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-300" />
          <span>Right to Erasure & DSAR</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'export'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Sanitized Export Center</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'compliance'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Compliance Frameworks</span>
        </button>
      </div>

      {/* TAB 1: COLUMN AUDIT & MASKING POLICY */}
      {activeTab === 'audit' && (
        <div className="space-y-5">
          
          {/* Global Bulk Anonymizer Action Card */}
          {scanResult.detections.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Bulk Dataset Anonymization
                </div>
                <p className="text-[11px] text-slate-400">
                  Transform all {scanResult.affectedColumnsCount} sensitive columns in your working dataset. Creates an automatic rollback snapshot in version history.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={globalStrategy}
                  onChange={(e) => setGlobalStrategy(e.target.value as MaskingStrategy)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="sha256_hash">Deterministic Hash (hash_8f9a...)</option>
                  <option value="full_redaction">Full Redaction ([REDACTED])</option>
                  <option value="partial_mask">Partial Mask (j***e@domain.com)</option>
                  <option value="pseudonym">Synthetic Pseudonym (Alex_489F)</option>
                </select>

                <button
                  onClick={handleMaskAllInDataset}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Processing...' : 'Mask All In Working Data'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Detections List */}
          {scanResult.isClean ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No PII Found in Active Dataset</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Heuristic inspection of {dataset.columns.length} columns and {dataset.data.length} records detected no emails, phone numbers, credit cards, or government identifiers.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleInjectSamplePii}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium border border-slate-700 inline-flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Sample Customer PII to Test Redaction & Hashing</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {scanResult.detections.map((detection) => {
                const currentStrat = getStrategyFor(detection);

                return (
                  <div 
                    key={detection.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-mono font-bold text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
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
                          ({detection.matchCount} cells flagged • {detection.matchPercentage}%)
                        </span>
                      </div>

                      {/* Strategy Selection & Action */}
                      <div className="flex items-center gap-2">
                        <select
                          value={currentStrat}
                          onChange={(e) => handleSetStrategy(detection.id, e.target.value as MaskingStrategy)}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="sha256_hash">Deterministic Hash</option>
                          <option value="full_redaction">Full Redaction</option>
                          <option value="partial_mask">Partial Mask</option>
                          <option value="pseudonym">Pseudonymize</option>
                        </select>

                        <button
                          onClick={() => handleMaskSingle(detection)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                          title="Apply this masking strategy to the active dataset"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Mask in Dataset</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400">
                      {detection.description}
                    </p>

                    {/* Live Transformation Preview */}
                    {detection.sampleOriginals.length > 0 && (
                      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 font-mono text-[11px]">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-semibold flex items-center justify-between">
                          <span>Value Transformation Preview ({currentStrat.replace('_', ' ')}):</span>
                          <span className="text-slate-600">Deterministic</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {detection.sampleOriginals.map((orig, idx) => {
                            const maskedPreview = applyMask(orig, detection.type, currentStrat);
                            return (
                              <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-900 rounded border border-slate-800/80">
                                <span className="text-rose-400 line-through truncate max-w-[130px]" title={orig}>{orig}</span>
                                <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                                <span className="text-emerald-400 font-bold truncate max-w-[150px]" title={maskedPreview}>{maskedPreview}</span>
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
      )}

      {/* TAB 2: SANITIZED EXPORT CENTER */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-teal-400" />
                  Zero-Mutation Privacy Export
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Download sanitized datasets for research publications, clients, or external vendors with all PII automatically redacted or hashed. Your in-app dataset remains intact.
                </p>
              </div>

              <button
                onClick={handleDownloadCertificateOnly}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Download Compliance Certificate</span>
              </button>
            </div>

            {/* Export Configurations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Export Format */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Export Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['csv', 'excel', 'json'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition-all border ${
                        exportFormat === fmt
                          ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Masking Strategy */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">PII Transformation Strategy</label>
                <select
                  value={exportStrategy}
                  onChange={(e) => setExportStrategy(e.target.value as MaskingStrategy)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="sha256_hash">Deterministic Hash (Cryptographic)</option>
                  <option value="full_redaction">Full Redaction ([REDACTED])</option>
                  <option value="partial_mask">Partial Masking (j***e@domain.com)</option>
                  <option value="pseudonym">Synthetic Pseudonyms (Subject_4A2B)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  {exportStrategy === 'sha256_hash' && 'Preserves relational joins and frequency grouping across systems.'}
                  {exportStrategy === 'full_redaction' && 'Completely scrubs all content for maximum safety.'}
                  {exportStrategy === 'partial_mask' && 'Retains partial formatting for human auditing.'}
                  {exportStrategy === 'pseudonym' && 'Replaces identifiers with realistic synthetic aliases.'}
                </p>
              </div>

              {/* Filename & Certificate */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Output Filename</label>
                <input
                  type="text"
                  value={customExportName}
                  onChange={(e) => setCustomExportName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  placeholder="dataset_privacy_clean"
                />
                <label className="flex items-center gap-2 pt-1 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCertificate}
                    onChange={(e) => setIncludeCertificate(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-teal-500 focus:ring-0"
                  />
                  <span>Attach Privacy & Anonymization Audit Certificate</span>
                </label>
              </div>

            </div>

            {/* Action Trigger */}
            <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-teal-300">
                  Ready to Export: {scanResult.detections.length} sensitive column(s) will be sanitized
                </div>
                <div className="text-[11px] text-slate-400">
                  Total of {scanResult.totalPiiCells} individual cells will be securely transformed on export.
                </div>
              </div>

              <button
                onClick={handleExportSanitized}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 flex items-center gap-2 whitespace-nowrap transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Masked {exportFormat.toUpperCase()}</span>
              </button>
            </div>

            {/* Live Masked Export Preview */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-teal-400" />
                  Live Preview of Sanitized Export (First 5 Rows)
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  Applied: {exportStrategy.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60">
                      {dataset.columns.slice(0, 7).map((col) => {
                        const isSensitive = scanResult.detections.some(d => d.column === col.name);
                        return (
                          <th key={col.name} className="px-3.5 py-2.5 font-semibold text-slate-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{col.name}</span>
                              {isSensitive && (
                                <span className="px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                                  MASKED
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        {dataset.columns.slice(0, 7).map((col) => {
                          const isSensitive = scanResult.detections.some(d => d.column === col.name);
                          const val = String(row[col.name] ?? '');
                          return (
                            <td 
                              key={col.name} 
                              className={`px-3.5 py-2 whitespace-nowrap truncate max-w-[200px] ${
                                isSensitive ? 'text-teal-300 font-bold bg-teal-950/10' : 'text-slate-400'
                              }`}
                              title={val}
                            >
                              {val || <span className="text-slate-600 italic">null</span>}
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

        </div>
      )}

      {/* TAB 3: COMPLIANCE STANDARDS & CHECKLIST */}
      {activeTab === 'compliance' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
              Privacy Frameworks & Regulatory Standards
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              How DataHub's Automated Privacy Masking satisfies international data protection mandates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* GDPR */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400">EU GDPR</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  Article 4(5) & 32
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Pseudonymisation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deterministic cryptographic hashing processes personal data such that it can no longer be attributed to a specific data subject without the use of separate cryptographic salt.
              </p>
              <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SHA-256 Hashing Compliant</span>
              </div>
            </div>

            {/* CCPA / CPRA */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400">California CCPA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  § 1798.140
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">De-Identification</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Requires information that cannot reasonably identify, relate to, describe, or be linked directly or indirectly with a particular consumer or household.
              </p>
              <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Full Redaction Compliant</span>
              </div>
            </div>

            {/* HIPAA */}
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-400">US HIPAA</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                  § 164.514(b)
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">18 Safe Harbor Identifiers</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Requires removal of specified direct identifiers: names, geographical data, all dates (birth, admission), telephone numbers, fax numbers, emails, SSNs, medical record numbers, and account numbers.
              </p>
              <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Safe Harbor Auditing Active</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: K-ANONYMITY & QUASI-IDENTIFIER GENERALIZATION */}
      {activeTab === 'k_anonymity' && (
        <KAnonymityStudio
          dataset={dataset}
          onUpdateDataset={onUpdateDataset}
        />
      )}

      {/* TAB 5: SYNTHETIC DATA TWIN GENERATOR (DIFFERENTIAL PRIVACY) */}
      {activeTab === 'synthetic_twins' && (
        <SyntheticDataTwinStudio
          dataset={dataset}
          onAddDataset={onAddDataset}
        />
      )}

      {/* TAB 6: GDPR RIGHT TO ERASURE & DSAR ACCESS PORTAL */}
      {activeTab === 'dsar_erasure' && (
        <DsarErasurePortal
          dataset={dataset}
          onUpdateDataset={onUpdateDataset}
        />
      )}

      {/* GEBRU ET AL. DATASHEET FOR DATASETS MODAL */}
      <DatasheetGeneratorModal
        isOpen={isDatasheetOpen}
        onClose={() => setIsDatasheetOpen(false)}
        dataset={dataset}
      />

    </div>
  );
};
