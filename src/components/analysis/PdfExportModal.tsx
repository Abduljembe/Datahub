import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Printer,
  Sliders,
  Eye,
  Layers,
  ShieldCheck,
  Building,
  User,
  Palette,
  Layout,
  RefreshCw,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { Dataset } from '../../types';
import { DocumentSheetPreview } from './DocumentSheetPreview';
import {
  generateDirectReportPdf,
  generateDirectReportPdfBlob,
  downloadDirectReportPdf,
  generateAndDownloadPdf,
  triggerCleanPrint,
  DirectPdfOptions,
  PdfPalette,
  PdfOrientation,
  PdfPageFormat,
  PdfTemplate,
  ConfidentialityLevel
} from '../../utils/pdfGenerator';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  initialAuthor?: string;
  initialOrganization?: string;
  initialNotes?: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  initialAuthor = 'Enterprise Analytics Team',
  initialOrganization = 'Data Intelligence Division',
  initialNotes = 'This report summarizes current feature distributions, data quality indices, and correlation drivers extracted from the dataset. All metrics have been validated against standard statistical parameters.',
}) => {
  // Mode: Direct jsPDF vs Visual Snapshot
  const [engineMode, setEngineMode] = useState<'direct_vector' | 'visual_snapshot'>('direct_vector');

  // Customization State
  const [docTitle, setDocTitle] = useState(dataset.name);
  const [docSubtitle, setDocSubtitle] = useState(dataset.description || 'Comprehensive Statistical Audit & Distribution Dossier');
  const [authorName, setAuthorName] = useState(initialAuthor);
  const [organizationName, setOrganizationName] = useState(initialOrganization);
  const [executiveNotes, setExecutiveNotes] = useState(initialNotes);
  const [confidentiality, setConfidentiality] = useState<ConfidentialityLevel>('CONFIDENTIAL');

  // Format and Styling
  const [palette, setPalette] = useState<PdfPalette>('corporate_navy');
  const [orientation, setOrientation] = useState<PdfOrientation>('portrait');
  const [format, setFormat] = useState<PdfPageFormat>('a4');
  const [template, setTemplate] = useState<PdfTemplate>('executive_brief');

  // Section Toggles
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeHealth, setIncludeHealth] = useState(true);
  const [includeDescriptive, setIncludeDescriptive] = useState(true);
  const [includeCategorical, setIncludeCategorical] = useState(true);
  const [includeCorrelations, setIncludeCorrelations] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includePrivacyStamp, setIncludePrivacyStamp] = useState(true);

  // Preview & Processing state
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Document Canvas Preview interactive controls
  const [zoom, setZoom] = useState<number>(0.85);
  const [activePage, setActivePage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('continuous');
  const [totalPages, setTotalPages] = useState<number>(1);

  // Keep track of active blob url to revoke on unmount or refresh
  const activeBlobUrlRef = useRef<string | null>(null);

  // Memoized current options for DocumentSheetPreview and PDF generation
  const currentOptions: DirectPdfOptions = useMemo(() => ({
    title: docTitle,
    subtitle: docSubtitle,
    authorName,
    organizationName,
    executiveNotes,
    confidentiality,
    palette,
    orientation,
    format,
    template,
    includeSummary,
    includeHealth,
    includeDescriptive,
    includeCategorical,
    includeCorrelations,
    includeRecommendations,
    includePrivacyStamp,
  }), [
    docTitle,
    docSubtitle,
    authorName,
    organizationName,
    executiveNotes,
    confidentiality,
    palette,
    orientation,
    format,
    template,
    includeSummary,
    includeHealth,
    includeDescriptive,
    includeCategorical,
    includeCorrelations,
    includeRecommendations,
    includePrivacyStamp,
  ]);

  // Generate / Refresh Preview
  const refreshPreview = () => {
    if (engineMode !== 'direct_vector') return;

    try {
      setIsGenerating(true);
      setProgressText('Building document...');

      const doc = generateDirectReportPdf(dataset, currentOptions);
      setPageCount(doc.getNumberOfPages());
      const blob = doc.output('blob');

      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }

      const url = URL.createObjectURL(blob);
      activeBlobUrlRef.current = url;
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  // Re-generate preview when modal opens or key parameters change
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        refreshPreview();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
        setPreviewBlobUrl(null);
      }
    }
  }, [
    isOpen,
    engineMode,
    palette,
    orientation,
    format,
    template,
    includeSummary,
    includeDescriptive,
    includeCategorical,
    includeCorrelations,
    includeRecommendations,
    includePrivacyStamp,
  ]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      if (engineMode === 'direct_vector') {
        setProgressText('Compiling vector PDF document...');
        const cleanName = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Executive_Report_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;

        const options: DirectPdfOptions = {
          title: docTitle,
          subtitle: docSubtitle,
          authorName,
          organizationName,
          executiveNotes,
          confidentiality,
          palette,
          orientation,
          format,
          template,
          includeSummary,
          includeHealth,
          includeDescriptive,
          includeCategorical,
          includeCorrelations,
          includeRecommendations,
          includePrivacyStamp,
          filename,
          onProgress: (msg) => setProgressText(msg),
        };

        downloadDirectReportPdf(dataset, options);
        setToastMessage(`✓ Saved ${filename}`);
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        // Visual snapshot mode via html2canvas
        setProgressText('Capturing visual dashboard canvas...');
        const cleanName = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Executive_Visual_Snapshot_${cleanName}.pdf`;

        await generateAndDownloadPdf({
          elementId: 'executive-report-document',
          filename,
          onProgress: (msg) => setProgressText(msg),
        });

        setToastMessage(`✓ Saved ${filename}`);
        setTimeout(() => setToastMessage(null), 3500);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      setToastMessage('⚠️ PDF generation encountered an error. Opening print fallback.');
      setTimeout(() => setToastMessage(null), 4000);
      triggerCleanPrint('executive-report-document', docTitle);
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const handleOpenInNewTab = () => {
    if (previewBlobUrl) {
      window.open(previewBlobUrl, '_blank');
    } else {
      refreshPreview();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-6xl h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Professional PDF Document Studio</h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 uppercase tracking-wide">
                  jsPDF Vector Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate high-resolution, search-friendly analytical dossier documents with automatic pagination and vector styling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {toastMessage && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-in fade-in">
                {toastMessage}
              </span>
            )}

            <button
              onClick={handleOpenInNewTab}
              disabled={!previewBlobUrl}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-50"
              title="Open Generated PDF in browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Open in Tab</span>
            </button>

            <button
              id="confirm-download-pdf-btn"
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all scale-100 hover:scale-[1.02] disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{progressText || 'Compiling...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Download PDF Document</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (SPLIT VIEW: CONTROLS & LIVE PREVIEW) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT: CONFIGURATION & DESIGN CONTROLS */}
          <div className="w-full lg:w-[460px] p-5 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto space-y-5 bg-slate-900/50">
            
            {/* Engine Mode Switch */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Rendering Engine
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setEngineMode('direct_vector')}
                  className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                    engineMode === 'direct_vector'
                      ? 'bg-rose-950/40 border-rose-500/50 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-rose-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Direct Vector PDF</span>
                  </div>
                  <span className="text-[10px] text-slate-400 text-left font-normal leading-tight">
                    jsPDF native text, auto-tables & multi-page pagination. Crisp & lightweight.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setEngineMode('visual_snapshot')}
                  className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                    engineMode === 'visual_snapshot'
                      ? 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Screen Snapshot</span>
                  </div>
                  <span className="text-[10px] text-slate-400 text-left font-normal leading-tight">
                    Raster snapshot of the current DOM layout via html2canvas.
                  </span>
                </button>
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Document Format & Depth</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {pageCount > 0 ? `${pageCount} page(s)` : ''}
                </span>
              </label>

              <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                {[
                  { id: 'executive_brief', label: 'Executive Brief', desc: 'KPIs, highlights & key stats' },
                  { id: 'full_audit', label: 'Full Audit Dossier', desc: 'All columns with Q1/Q3/IQR' },
                  { id: 'one_page', label: '1-Page Summary', desc: 'Single-page briefing' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id as PdfTemplate)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      template === t.id
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{t.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Layout: Format & Orientation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Page Orientation</label>
                <select
                  value={orientation}
                  onChange={e => setOrientation(e.target.value as PdfOrientation)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-rose-500 focus:outline-none"
                >
                  <option value="portrait">Portrait (Standard Vertical)</option>
                  <option value="landscape">Landscape (Wide Tables)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Paper Standard</label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value as PdfPageFormat)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-rose-500 focus:outline-none"
                >
                  <option value="a4">ISO A4 (210 × 297 mm)</option>
                  <option value="letter">US Letter (8.5 × 11 in)</option>
                </select>
              </div>
            </div>

            {/* Visual Color Palette Theme */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-rose-400" />
                <span>Executive Color Palette</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium">
                {[
                  { id: 'corporate_navy', name: 'Navy & Cyan', color: 'from-slate-900 to-cyan-700' },
                  { id: 'emerald_teal', name: 'Emerald & Teal', color: 'from-emerald-950 to-teal-600' },
                  { id: 'modern_indigo', name: 'Deep Indigo', color: 'from-indigo-950 to-violet-600' },
                  { id: 'monochrome', name: 'Monochrome', color: 'from-zinc-900 to-zinc-600' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id as PdfPalette)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                      palette === p.id
                        ? 'border-rose-500 text-white bg-slate-950 ring-1 ring-rose-500'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200 bg-slate-950/60'
                    }`}
                  >
                    <div className={`w-full h-3 rounded-lg bg-gradient-to-r ${p.color}`} />
                    <span className="text-[11px] font-semibold mt-0.5 truncate w-full">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Metadata Details */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>Lead Analyst / Author</span>
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-400" />
                    <span>Organization / Division</span>
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confidentiality Classification</label>
                <select
                  value={confidentiality}
                  onChange={e => setConfidentiality(e.target.value as ConfidentialityLevel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-rose-500 focus:outline-none font-mono"
                >
                  <option value="CONFIDENTIAL">CONFIDENTIAL (Standard)</option>
                  <option value="INTERNAL ONLY">INTERNAL ONLY</option>
                  <option value="STRICTLY CONFIDENTIAL">STRICTLY CONFIDENTIAL</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                  <option value="PUBLIC AUDIT">PUBLIC AUDIT</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Executive Commentary &amp; Findings</label>
                <textarea
                  rows={2}
                  value={executiveNotes}
                  onChange={e => setExecutiveNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:border-rose-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Section Inclusion Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Sections to Include in Document
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={e => setIncludeSummary(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Macro KPIs &amp; Size</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeDescriptive}
                    onChange={e => setIncludeDescriptive(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Descriptive Stats Table</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeCorrelations}
                    onChange={e => setIncludeCorrelations(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Correlation Matrix</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeCategorical}
                    onChange={e => setIncludeCategorical(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Categorical Levels</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeRecommendations}
                    onChange={e => setIncludeRecommendations(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Strategic Next Steps</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={includePrivacyStamp}
                    onChange={e => setIncludePrivacyStamp(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <span>Privacy Audit Stamp</span>
                </label>
              </div>
            </div>

            {/* Refresh Preview Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={refreshPreview}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Update Document Preview</span>
              </button>
            </div>

          </div>

          {/* RIGHT: REAL-TIME DOCUMENT PREVIEW (SANDBOX-SAFE CANVAS SHEET VIEWER) */}
          <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
            
            {/* Canvas Toolbar */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
              <div className="flex items-center gap-2 text-slate-400">
                <FileText className="w-4 h-4 text-rose-400" />
                <span className="font-semibold text-slate-200">Live Document Canvas</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-[11px] text-slate-400">
                  {format.toUpperCase()} {orientation.toUpperCase()} ({totalPages} Pages)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hidden md:inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Sandbox-Safe Canvas
                </span>
              </div>

              {/* Interactive Toolbar Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View mode toggle */}
                <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setViewMode('continuous')}
                    className={`px-2 py-1 rounded-md transition-colors ${viewMode === 'continuous' ? 'bg-slate-800 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    title="Show all pages vertically in continuous document mode"
                  >
                    Continuous
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('single')}
                    className={`px-2 py-1 rounded-md transition-colors ${viewMode === 'single' ? 'bg-slate-800 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    title="View one page at a time"
                  >
                    Paged
                  </button>
                </div>

                {/* Page Navigation in Single View Mode */}
                {viewMode === 'single' && totalPages > 1 && (
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
                    <button
                      type="button"
                      disabled={activePage <= 1}
                      onClick={() => setActivePage(p => Math.max(1, p - 1))}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] text-slate-300 px-1">
                      {activePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={activePage >= totalPages}
                      onClick={() => setActivePage(p => Math.min(totalPages, p + 1))}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
                    className="p-1 rounded text-slate-400 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-300 w-10 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(1.4, Math.round((z + 0.1) * 10) / 10))}
                    className="p-1 rounded text-slate-400 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(0.85)}
                    className="px-1.5 py-0.5 text-[10px] rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    title="Reset Zoom to 85%"
                  >
                    Reset
                  </button>
                </div>

                {/* Open in Clean Tab */}
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                  title="Open generated PDF directly in a new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Open in Tab</span>
                </button>

                {/* Print Dialog */}
                <button
                  type="button"
                  onClick={() => triggerCleanPrint('executive-report-document', docTitle)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                  title="Direct browser print"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            </div>

            {/* Document Preview Viewport with smooth scroll & realistic dark canvas backing */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center bg-slate-950/95 scrollbar-thin scrollbar-thumb-slate-800">
              <DocumentSheetPreview
                dataset={dataset}
                options={currentOptions}
                activePage={activePage}
                onPageChange={setActivePage}
                zoom={zoom}
                viewMode={viewMode}
                setTotalPages={setTotalPages}
              />
            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographically sealed &amp; formatted with jsPDF + autoTable</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Save PDF Dossier</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
