import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
  Tag,
  BookOpen,
  Layers,
  BarChart2,
  FileText,
  RotateCcw,
  Plus,
  Zap,
  TrendingUp,
  Quote,
  Eye,
  Trash2,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Dataset } from '../../types';
import {
  QualitativeReport,
  QualitativeTheme,
  CodedTextResponse,
  detectQualitativeColumns,
  buildHeuristicQualitativeReport,
  fetchGeminiQualitativeAudit,
} from '../../utils/qualitativeEngine';
import { createDatasetSnapshot } from '../../utils/versionEngine';

interface QualitativeAnalysisStudioProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
  onCreateDataset?: (newDataset: Dataset) => void;
}

export const QualitativeAnalysisStudio: React.FC<QualitativeAnalysisStudioProps> = ({
  dataset,
  onUpdateDataset,
  onCreateDataset,
}) => {
  // Detect available qualitative columns
  const qualColumns = useMemo(() => detectQualitativeColumns(dataset), [dataset]);
  const defaultCol = qualColumns[0]?.name || dataset.columns.find(c => c.type === 'string')?.name || dataset.columns[0]?.name;

  const [selectedCol, setSelectedCol] = useState<string>(defaultCol || '');
  const [report, setReport] = useState<QualitativeReport | null>(null);
  const [activeTab, setActiveTab] = useState<'themes' | 'verbatims' | 'keywords' | 'sentiment' | 'synthesis'>('themes');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative' | 'mixed'>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [hideNonSubstantive, setHideNonSubstantive] = useState<boolean>(false);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [researchGoal, setResearchGoal] = useState<string>('');

  // Synchronize or generate report when selected column or dataset changes
  useEffect(() => {
    if (selectedCol && dataset) {
      const rep = buildHeuristicQualitativeReport(dataset, selectedCol, researchGoal);
      setReport(rep);
    }
  }, [selectedCol, dataset]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleRunAiSynthesis = async () => {
    if (!selectedCol) return;
    setIsLoadingAi(true);
    try {
      const aiReport = await fetchGeminiQualitativeAudit(dataset, selectedCol, researchGoal);
      setReport(aiReport);
      showToast('Gemini AI Qualitative Thematic Synthesis complete!');
    } catch (err) {
      console.error('Failed to run AI qualitative audit:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Filter non-substantive responses from dataset
  const handlePurgeNonSubstantive = () => {
    if (!report || report.nonSubstantiveCount === 0) return;

    const badIndices = new Set(
      report.codedResponses.filter(c => c.isNonSubstantive).map(c => c.rowIndex)
    );

    const filteredData = dataset.data.filter((_, idx) => !badIndices.has(idx));
    const delta = dataset.data.length - filteredData.length;

    const baseUpdated: Dataset = {
      ...dataset,
      data: filteredData,
      updatedAt: new Date().toISOString(),
    };

    const { updatedDataset } = createDatasetSnapshot(baseUpdated, {
      name: `Qualitative Clean: Purged Placeholders (${selectedCol})`,
      description: `Removed ${delta} placeholder or non-substantive response(s) in '${selectedCol}'.`,
      tag: 'cleaned',
      createdBy: 'Qualitative Analysis Studio',
    });

    onUpdateDataset(updatedDataset);
    showToast(`Purged ${delta} placeholder responses! Dataset snapshot saved.`);
  };

  // Enrich dataset with Sentiment and Assigned Theme columns
  const handleEnrichDataset = () => {
    if (!report) return;

    const sentimentColName = `${selectedCol}_sentiment`;
    const themeColName = `${selectedCol}_primary_theme`;

    const enrichedData = dataset.data.map((row, idx) => {
      const coded = report.codedResponses.find(c => c.rowIndex === idx);
      return {
        ...row,
        [sentimentColName]: coded ? coded.sentiment.toUpperCase() : 'NEUTRAL',
        [themeColName]: coded && coded.assignedThemes.length > 0 ? coded.assignedThemes[0] : 'General',
      };
    });

    const newCols = [...dataset.columns];
    if (!newCols.some(c => c.name === sentimentColName)) {
      newCols.push({ id: `col_${Date.now()}_1`, name: sentimentColName, type: 'category', nullable: false });
    }
    if (!newCols.some(c => c.name === themeColName)) {
      newCols.push({ id: `col_${Date.now()}_2`, name: themeColName, type: 'category', nullable: false });
    }

    const baseUpdated: Dataset = {
      ...dataset,
      columns: newCols,
      data: enrichedData,
      updatedAt: new Date().toISOString(),
    };

    const { updatedDataset } = createDatasetSnapshot(baseUpdated, {
      name: `Enrichment: Sentiment & Themes (${selectedCol})`,
      description: `Added categorical qualitative tags '${sentimentColName}' and '${themeColName}' for cross-tabulation and charting.`,
      tag: 'transformed',
      createdBy: 'Qualitative Analysis Studio',
    });

    onUpdateDataset(updatedDataset);
    showToast(`Dataset enriched with 2 qualitative columns for charts & pivots!`);
  };

  // Export Codebook
  const handleExportCodebook = () => {
    if (!report) return;
    const exportData = {
      researchColumn: selectedCol,
      totalAudited: report.totalResponsesAudited,
      substantiveCount: report.substantiveResponsesCount,
      sentimentBreakdown: report.sentiment,
      themes: report.themes,
      topKeywords: report.topWords.slice(0, 20),
      topKeyphrases: report.topBigrams.slice(0, 10),
      executiveSummary: report.executiveSummary,
      keyInsights: report.keyInsights,
      generatedAt: new Date().toISOString(),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `qualitative_codebook_${selectedCol}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported Qualitative Codebook JSON');
  };

  // Filtered responses for Verbatim Explorer
  const filteredVerbatims = useMemo(() => {
    if (!report) return [];
    return report.codedResponses.filter(item => {
      if (hideNonSubstantive && item.isNonSubstantive) return false;
      if (sentimentFilter !== 'all' && item.sentiment !== sentimentFilter) return false;
      if (themeFilter !== 'all' && !item.assignedThemes.includes(themeFilter)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.originalText.toLowerCase().includes(q) || item.dominantEmotion.toLowerCase().includes(q);
      }
      return true;
    });
  }, [report, hideNonSubstantive, sentimentFilter, themeFilter, searchQuery]);

  if (!selectedCol || !report) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl my-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Qualitative Text Columns Detected</h2>
        <p className="text-sm text-slate-400">
          This dataset does not contain string or open-ended text fields. Add a feedback, notes, or narrative response column to conduct thematic analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Success Banner */}
      {successToast && (
        <div className="bg-emerald-600/20 border border-emerald-500/30 px-6 py-3 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header & Column Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Qualitative & Thematic Analysis Studio</h2>
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Mixed-Methods NLP
                </span>
                {report.isAiGenerated && (
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3 text-rose-400" />
                    Gemini 3.8 Flash
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inductive thematic coding, sentiment polarity, keyphrase extraction, and narrative synthesis for open-ended human responses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Column Picker */}
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-slate-400 font-medium">Text Field:</span>
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
              >
                {dataset.columns.filter(c => c.type === 'string' || (c.type as any) === 'text').map(col => (
                  <option key={col.name} value={col.name} className="bg-slate-900 text-white">
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Deep Synthesis Button */}
            <button
              onClick={handleRunAiSynthesis}
              disabled={isLoadingAi}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              title="Run Gemini AI Thematic Coding & Narrative Synthesis"
            >
              {isLoadingAi ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isLoadingAi ? 'Synthesizing...' : 'Gemini AI Thematic Synthesis'}</span>
            </button>

            {/* Export Codebook */}
            <button
              onClick={handleExportCodebook}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700"
              title="Export qualitative themes and sentiment codebook as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Codebook</span>
            </button>
          </div>
        </div>

        {/* Optional Research Objective Input */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider shrink-0">Research Focus:</span>
          <input
            type="text"
            value={researchGoal}
            onChange={(e) => setResearchGoal(e.target.value)}
            placeholder="e.g. Focus on product onboarding friction, feature requests, or customer satisfaction drivers..."
            className="flex-1 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* High-Level Qualitative KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Audited</span>
            <span className="text-xl font-bold text-white mt-1 block">{report.totalResponsesAudited}</span>
            <span className="text-[10px] text-slate-500">verbatim entries</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Substantive</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{report.substantiveResponsesCount}</span>
            <span className="text-[10px] text-emerald-500/80">
              {Math.round((report.substantiveResponsesCount / Math.max(report.totalResponsesAudited, 1)) * 100)}% rich narrative
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Placeholders</span>
              {report.nonSubstantiveCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">Flagged</span>
              )}
            </div>
            <span className={`text-xl font-bold mt-1 block ${report.nonSubstantiveCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {report.nonSubstantiveCount}
            </span>
            {report.nonSubstantiveCount > 0 ? (
              <button
                onClick={handlePurgeNonSubstantive}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
              >
                1-Click Purge
              </button>
            ) : (
              <span className="text-[10px] text-slate-500">0 empty / "n/a"</span>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Word Count</span>
            <span className="text-xl font-bold text-cyan-400 mt-1 block">{report.avgWordCount}</span>
            <span className="text-[10px] text-slate-500">{report.avgCharCount} avg chars</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sentiment Ratio</span>
            <div className="flex items-center gap-1 mt-1.5 text-xs font-bold">
              <span className="text-emerald-400">{report.sentiment.positivePct}% +</span>
              <span className="text-slate-500">/</span>
              <span className="text-rose-400">{report.sentiment.negativePct}% -</span>
            </div>
            <span className="text-[10px] text-slate-400">{report.sentiment.neutralPct}% neutral</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Dominant Emotion</span>
            <span className="text-sm font-bold text-indigo-300 mt-1 block truncate">
              {report.sentiment.dominantEmotion}
            </span>
            <span className="text-[10px] text-slate-500">emotional posture</span>
          </div>
        </div>

        {/* Enrichment Action Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl text-xs">
          <div className="flex items-center gap-2 text-indigo-200">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Mixed-Methods Bridge:</strong> Enrich your dataset with categorical columns <code>{selectedCol}_sentiment</code> and <code>{selectedCol}_primary_theme</code> to run quantitative cross-tabs, correlation tests, and bar charts.
            </span>
          </div>
          <button
            onClick={handleEnrichDataset}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-sm shrink-0"
          >
            Append Categorical Columns
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('themes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'themes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Thematic Codebook ({report.themes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verbatims')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'verbatims'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Quote className="w-4 h-4" />
          <span>Verbatim Explorer ({filteredVerbatims.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('keywords')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'keywords'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Keywords & N-Grams</span>
        </button>

        <button
          onClick={() => setActiveTab('sentiment')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sentiment'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>Sentiment & Emotions</span>
        </button>

        <button
          onClick={() => setActiveTab('synthesis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'synthesis'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Executive Synthesis & Actions</span>
        </button>
      </div>

      {/* TAB 1: THEMATIC CODEBOOK */}
      {activeTab === 'themes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Emergent Thematic Codes</span>
              <span className="text-xs text-slate-400 font-normal">
                (Identified via inductive semantic patterns across participant responses)
              </span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {report.themes.length} Codes Defined
            </span>
          </div>

          {report.themes.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400">No concentrated themes found. Click "Gemini AI Thematic Synthesis" above to discover deep qualitative patterns.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.themes.map((theme, idx) => (
                <div
                  key={theme.id || idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition-all shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{theme.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {theme.prevalencePct}% Prevalence ({theme.count} responses)
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        theme.sentiment === 'positive'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : theme.sentiment === 'negative'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : theme.sentiment === 'mixed'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {theme.sentiment}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    {theme.description}
                  </p>

                  {theme.exampleQuotes && theme.exampleQuotes.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                        Representative Verbatim Quotes:
                      </span>
                      {theme.exampleQuotes.map((quote, qIdx) => (
                        <div
                          key={qIdx}
                          className="text-xs text-slate-400 italic border-l-2 border-indigo-500/50 pl-2.5 py-0.5 bg-slate-950/20 rounded-r-lg"
                        >
                          "{quote}"
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VERBATIM EXPLORER */}
      {activeTab === 'verbatims' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search verbatims or keywords..."
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive Only</option>
                <option value="neutral">Neutral Only</option>
                <option value="negative">Negative Only</option>
                <option value="mixed">Mixed Only</option>
              </select>

              <select
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="all">All Thematic Codes</option>
                {report.themes.map(t => (
                  <option key={t.id} value={t.name.toLowerCase()}>
                    {t.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideNonSubstantive}
                  onChange={(e) => setHideNonSubstantive(e.target.checked)}
                  className="rounded text-indigo-600 bg-slate-900 border-slate-700"
                />
                <span>Hide Placeholders</span>
              </label>
            </div>
          </div>

          {/* Verbatim Cards Grid */}
          {filteredVerbatims.length === 0 ? (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-400">No verbatim responses match your active search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredVerbatims.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                    item.isNonSubstantive
                      ? 'bg-slate-950/40 border-amber-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-500">
                      Row #{item.rowIndex + 1} • {item.wordCount} words
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.isNonSubstantive && (
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.nonSubstantiveReason || 'Placeholder'}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded-full border ${
                          item.sentiment === 'positive'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : item.sentiment === 'negative'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : item.sentiment === 'mixed'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {item.sentiment}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    "{item.originalText}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="italic">{item.dominantEmotion}</span>
                    {item.assignedThemes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.assignedThemes.map((t, tIdx) => (
                          <span key={tIdx} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: KEYWORDS & N-GRAMS */}
      {activeTab === 'keywords' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Unigrams */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Top Keywords (1-Gram)</span>
              <span className="text-[10px] text-slate-500">Stopwords Removed</span>
            </h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {report.topWords.slice(0, 30).map((w, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(w.text);
                    setActiveTab('verbatims');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
                  title="Click to filter verbatims by this keyword"
                >
                  <span>{w.text}</span>
                  <span className="text-[10px] px-1.5 rounded-full bg-indigo-600/30 text-indigo-300 font-bold">
                    {w.value}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Top Bigrams */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Frequent Phrases (2-Gram)</span>
              <span className="text-[10px] text-slate-500">Collocations</span>
            </h4>
            <div className="space-y-1.5 pt-1">
              {report.topBigrams.slice(0, 12).map((b, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSearchQuery(b.phrase);
                    setActiveTab('verbatims');
                  }}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500 cursor-pointer transition-all text-xs"
                >
                  <span className="text-slate-300 font-mono">"{b.phrase}"</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                    {b.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Trigrams */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Tri-Grams (3-Gram)</span>
              <span className="text-[10px] text-slate-500">Narrative Patterns</span>
            </h4>
            <div className="space-y-1.5 pt-1">
              {report.topTrigrams.slice(0, 10).map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSearchQuery(t.phrase);
                    setActiveTab('verbatims');
                  }}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500 cursor-pointer transition-all text-xs"
                >
                  <span className="text-slate-300 font-mono text-[11px]">"{t.phrase}"</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {t.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SENTIMENT & EMOTIONS */}
      {activeTab === 'sentiment' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentiment Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
            <h4 className="text-sm font-bold text-white">Sentiment Polarity Landscape</h4>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Smile className="w-3.5 h-3.5" /> Positive Sentiment
                  </span>
                  <span>{report.sentiment.positivePct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${report.sentiment.positivePct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Meh className="w-3.5 h-3.5" /> Neutral Sentiment
                  </span>
                  <span>{report.sentiment.neutralPct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-slate-500 rounded-full transition-all duration-500"
                    style={{ width: `${report.sentiment.neutralPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Frown className="w-3.5 h-3.5" /> Negative Sentiment
                  </span>
                  <span>{report.sentiment.negativePct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${report.sentiment.negativePct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" /> Mixed / Constructive
                  </span>
                  <span>{report.sentiment.mixedPct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${report.sentiment.mixedPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Granular Emotional Spectrum */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-white">Granular Emotional Spectrum</h4>

            <div className="space-y-2.5">
              {report.sentiment.emotionBreakdown.map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-semibold">{item.emotion}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">{item.count} responses</span>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SYNTHESIS & ACTIONS */}
      {activeTab === 'synthesis' && (
        <div className="space-y-6">
          {/* Executive Narrative */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Executive Qualitative Synthesis
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Audited: {new Date(report.analyzedAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800 font-sans text-justify">
              {report.executiveSummary}
            </p>
          </div>

          {/* Insights & Recommendations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Insights */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Key Qualitative Insights
              </h4>
              <div className="space-y-2">
                {report.keyInsights.map((insight, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Recommendations */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Strategic Next Actions
              </h4>
              <div className="space-y-2">
                {report.recommendedActions.map((action, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
