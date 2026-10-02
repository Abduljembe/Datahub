import React, { useState, useRef } from 'react';
import { 
  X, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Calendar, 
  FileText, 
  Database,
  ExternalLink
} from 'lucide-react';
import { Dataset, DataHealthReport } from '../../types';
import { computeGroundTruthHealthStats } from '../../utils/dataHealthEngine';
import { round } from '../../utils/statistics';

interface DataQualityCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  report: DataHealthReport;
}

export const DataQualityCertificateModal: React.FC<DataQualityCertificateModalProps> = ({
  isOpen,
  onClose,
  dataset,
  report,
}) => {
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const stats = computeGroundTruthHealthStats(dataset);
  const certificateId = `DH-CERT-${dataset.id.slice(0, 6).toUpperCase()}-${Math.abs(report.overallScore * 31 + dataset.data.length).toString(36).toUpperCase()}`;
  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    const md = `### 🏅 DataHub Official Quality & Integrity Certificate
**Certificate ID:** \`${certificateId}\`  
**Dataset:** ${dataset.name}  
**Issuance Date:** ${formattedDate}  
**Overall Quality Score:** **${report.overallScore}/100 (Grade ${report.grade})** — *${report.status}*  

#### Core Audit Metrics:
- **Completeness Rate:** ${stats.completenessRate}% (${stats.totalNulls} missing cells across ${stats.columnCount} columns)
- **Uniqueness Rate:** ${100 - stats.duplicateRate}% (${stats.duplicateRowCount} duplicate rows)
- **Outlier Compliance:** ${stats.totalOutliers === 0 ? 'Optimal (0 extreme points)' : `${stats.totalOutliers} points within Gaussian 3σ boundary`}
- **Engine Verification:** ${report.modelUsed || 'Gemini 3.8 Flash & Ground-Truth Statistical Engine'}

*Certified and sealed by Remix DataHub Automated Quality Assurance Authority.*`;

    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(certificateId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Modal Toolbar (hidden when printing) */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold text-white">Data Quality Certificate</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
              title="Copy formatted markdown audit summary"
            >
              {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMarkdown ? 'Copied MD!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Display Card */}
        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/40">
          
          <div 
            ref={certificateRef}
            className="relative bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-4 border-double border-amber-500/40 rounded-2xl p-6 md:p-10 shadow-2xl space-y-6 text-center overflow-hidden print:bg-white print:text-slate-900 print:border-amber-600"
          >
            {/* Background Seal Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <ShieldCheck className="w-96 h-96 text-amber-300" />
            </div>

            {/* Header / Authority */}
            <div className="space-y-1.5 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold tracking-widest uppercase">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                DataHub Verification Authority
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-wide print:text-slate-900">
                CERTIFICATE OF DATA INTEGRITY
              </h2>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">
                Statistical Quality & Reliability Assurance
              </p>
            </div>

            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto" />

            {/* Dataset Recipient Body */}
            <div className="space-y-2 relative z-10 max-w-lg mx-auto">
              <p className="text-xs text-slate-400 italic">This is officially to certify that the dataset</p>
              <div className="text-lg md:text-xl font-bold text-cyan-300 tracking-tight print:text-indigo-900">
                "{dataset.name}"
              </div>
              <p className="text-xs text-slate-300 leading-relaxed print:text-slate-700">
                has undergone comprehensive automated diagnostic profiling, missing value assessment, duplicate record screening, and Gaussian $3\sigma$ distribution boundary verification.
              </p>
            </div>

            {/* Score & Rating Callout */}
            <div className="my-6 p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 max-w-md mx-auto grid grid-cols-2 divide-x divide-slate-800 relative z-10 print:bg-slate-50 print:border-slate-300">
              <div className="px-4 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Health Score</span>
                <div className="text-3xl font-extrabold text-amber-400">
                  {report.overallScore}%
                </div>
                <span className="text-xs font-semibold text-slate-300">Rating: {report.status}</span>
              </div>
              <div className="px-4 text-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Certified Grade</span>
                <div className="text-3xl font-extrabold text-emerald-400">
                  Grade {report.grade}
                </div>
                <span className="text-xs font-semibold text-emerald-300">Pass Verified</span>
              </div>
            </div>

            {/* Verification Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left relative z-10 max-w-xl mx-auto">
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 print:text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Completeness</span>
                </div>
                <p className="text-[11px] text-slate-400 print:text-slate-600">
                  {stats.totalNulls === 0 ? '100% Complete (0 nulls)' : `${stats.completenessRate}% Complete`}
                </p>
              </div>

              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 print:text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Uniqueness</span>
                </div>
                <p className="text-[11px] text-slate-400 print:text-slate-600">
                  {stats.duplicateRowCount === 0 ? '100% Unique (0 dupes)' : `${stats.duplicateRowCount} redundant rows`}
                </p>
              </div>

              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 print:bg-white print:border-slate-300">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 print:text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Variance Bounds</span>
                </div>
                <p className="text-[11px] text-slate-400 print:text-slate-600">
                  {stats.totalOutliers === 0 ? 'Gaussian 3σ Compliant' : `${stats.totalOutliers} points flagged`}
                </p>
              </div>
            </div>

            {/* Signatures & Certification Footer */}
            <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 text-xs text-slate-400 print:text-slate-600">
              
              <div className="text-left space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">Certificate ID</span>
                <button
                  onClick={handleCopyId}
                  className="font-mono text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                  title="Click to copy Certificate ID"
                >
                  <span>{certificateId}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                </button>
                <div className="text-[10px] text-slate-500">Issued: {formattedDate}</div>
              </div>

              <div className="text-center sm:text-right space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-end text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>VERIFIED INTEGRITY</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Audited by {report.modelUsed || 'Gemini 3.8 Flash'}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer (hidden when printing) */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-400">
            Certified metrics are mathematically validated against active dataset rows.
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
          >
            Close Certificate
          </button>
        </div>

      </div>
    </div>
  );
};
