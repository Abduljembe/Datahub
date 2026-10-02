import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  SlidersHorizontal,
  ShieldAlert, 
  Trash2, 
  Wand2, 
  RefreshCw, 
  Sliders, 
  Database, 
  Filter, 
  Layers, 
  Eye, 
  EyeOff, 
  Scissors, 
  Info, 
  History, 
  ArrowRight, 
  Zap,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Award,
  Lock,
  ListChecks,
  Workflow
} from 'lucide-react';
import { Dataset, DataHealthReport, DataHealthIssue, DataHealthCleanAction } from '../../types';
import { 
  computeGroundTruthHealthStats, 
  buildHeuristicHealthReport, 
  fetchGeminiDataHealthAudit, 
  executeCleanAction, 
  executeCleanAll 
} from '../../utils/dataHealthEngine';
import { round } from '../../utils/statistics';
import { DataHealthDiffModal } from './DataHealthDiffModal';
import { DataQualityCertificateModal } from './DataQualityCertificateModal';
import { PiiScannerModal } from './PiiScannerModal';
import { scanDatasetForPii } from '../../utils/piiEngine';
import { DataContractsModal } from './DataContractsModal';
import { loadDatasetContracts, evaluateDatasetContracts } from '../../utils/contractEngine';
import { StressDataGeneratorModal } from './StressDataGeneratorModal';
import { CleaningRecipeModal } from './CleaningRecipeModal';

export type PriorityFilterType = 'all' | 'critical' | 'low_priority';

interface DataHealthViewProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
  onOpenVersionsModal?: () => void;
}

export const DataHealthView: React.FC<DataHealthViewProps> = ({
  dataset,
  onUpdateDataset,
  onOpenVersionsModal,
}) => {
  const [report, setReport] = useState<DataHealthReport>(() => buildHeuristicHealthReport(dataset));
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'missing' | 'duplicates' | 'outliers' | 'resolved'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [lastActionSummary, setLastActionSummary] = useState<string | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isPiiModalOpen, setIsPiiModalOpen] = useState(false);
  const [isContractsModalOpen, setIsContractsModalOpen] = useState(false);
  const [isStressModalOpen, setIsStressModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

  // Compute live ground truth stats
  const groundTruth = useMemo(() => computeGroundTruthHealthStats(dataset), [dataset]);
  const piiScan = useMemo(() => scanDatasetForPii(dataset), [dataset]);
  const contractsReport = useMemo(() => {
    const activeRules = loadDatasetContracts(dataset);
    return evaluateDatasetContracts(dataset, activeRules);
  }, [dataset]);

  // Synchronize base report whenever dataset data changes
  useEffect(() => {
    // If not currently loading AI, refresh heuristic baseline
    if (!isLoadingAi) {
      const updatedReport = buildHeuristicHealthReport(dataset, groundTruth);
      setReport(prev => ({
        ...updatedReport,
        isAiGenerated: prev.isAiGenerated,
        modelUsed: prev.modelUsed,
        executiveSummary: prev.isAiGenerated ? prev.executiveSummary : updatedReport.executiveSummary,
        keyRisks: prev.isAiGenerated ? prev.keyRisks : updatedReport.keyRisks,
      }));
    }
  }, [dataset, groundTruth]);

  // Trigger Gemini Deep Scan
  const handleRunGeminiAudit = async () => {
    setIsLoadingAi(true);
    showToast('Initiating Gemini AI Quality Audit with gemini-3.8-flash...');
    try {
      const aiReport = await fetchGeminiDataHealthAudit(dataset);
      setReport(aiReport);
      showToast(aiReport.isAiGenerated 
        ? 'Gemini Deep Quality Audit completed successfully!' 
        : 'Quality audit completed using embedded statistical engine.'
      );
    } catch (err) {
      console.error('Gemini Audit Error:', err);
      showToast('Completed audit using local statistical engine.');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3800);
  };

  // Execute a One-Click Clean for a single issue
  const handleExecuteOneClickClean = (issue: DataHealthIssue, customAction?: DataHealthCleanAction) => {
    const actionToRun = customAction || issue.suggestedAction;
    const { updatedDataset, rowsAffected, description } = executeCleanAction(dataset, actionToRun);
    
    // Mark issue resolved in local report view
    setReport(prev => ({
      ...prev,
      issues: prev.issues.map(iss => iss.id === issue.id ? { ...iss, resolved: true } : iss),
    }));

    onUpdateDataset(updatedDataset);
    setLastActionSummary(description);
    showToast(`✨ ${description}`);
  };

  // Execute Clean All Issues
  const handleExecuteCleanAll = () => {
    const pendingIssues = report.issues.filter(i => !i.resolved);
    if (pendingIssues.length === 0) {
      showToast('All issues are already clean and resolved!');
      return;
    }

    const { updatedDataset, totalCleaned, summary } = executeCleanAll(dataset, pendingIssues);
    
    // Mark all resolved
    setReport(prev => ({
      ...prev,
      issues: prev.issues.map(iss => ({ ...iss, resolved: true })),
    }));

    onUpdateDataset(updatedDataset);
    setLastActionSummary(summary);
    showToast(`🎉 ${summary}`);
  };

  // Filter issues based on active category tab
  const tabFilteredIssues = useMemo(() => {
    return report.issues.filter(issue => {
      if (activeTab === 'resolved') {
        return issue.resolved;
      }
      if (issue.resolved && activeTab !== 'all') return false;
      if (activeTab === 'missing' && issue.category !== 'missing_values') return false;
      if (activeTab === 'duplicates' && issue.category !== 'duplicate_rows') return false;
      if (activeTab === 'outliers' && issue.category !== 'outliers') return false;
      return !issue.resolved;
    });
  }, [report.issues, activeTab]);

  const totalInTabCount = tabFilteredIssues.length;
  const criticalInTabCount = useMemo(() => tabFilteredIssues.filter(i => i.severity === 'critical').length, [tabFilteredIssues]);
  const lowPriorityInTabCount = useMemo(() => tabFilteredIssues.filter(i => i.severity !== 'critical').length, [tabFilteredIssues]);

  // Filter issues based on priority filter toggle & search query
  const filteredIssues = useMemo(() => {
    return tabFilteredIssues.filter(issue => {
      // Priority Filter Toggle: All vs Only Critical vs Only Low-Priority
      if (priorityFilter === 'critical' && issue.severity !== 'critical') {
        return false;
      }
      if (priorityFilter === 'low_priority' && issue.severity === 'critical') {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchCol = (issue.column || '').toLowerCase().includes(q);
        const matchDesc = issue.aiExplanation.toLowerCase().includes(q);
        if (!matchTitle && !matchCol && !matchDesc) return false;
      }

      return true;
    });
  }, [tabFilteredIssues, priorityFilter, searchQuery]);

  const pendingCount = report.issues.filter(i => !i.resolved).length;
  const missingCount = report.issues.filter(i => !i.resolved && i.category === 'missing_values').length;
  const dupCount = report.issues.filter(i => !i.resolved && i.category === 'duplicate_rows').length;
  const outlierCount = report.issues.filter(i => !i.resolved && i.category === 'outliers').length;
  const resolvedCount = report.issues.filter(i => i.resolved).length;

  // Score color formatting
  const scoreBadgeColor = report.overallScore >= 88 
    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' 
    : report.overallScore >= 70 
    ? 'text-cyan-400 border-cyan-500/30 bg-cyan-950/40'
    : report.overallScore >= 50 
    ? 'text-amber-400 border-amber-500/30 bg-amber-950/40' 
    : 'text-rose-400 border-rose-500/30 bg-rose-950/40';

  const scoreRingGradient = report.overallScore >= 88 
    ? 'from-emerald-500 to-teal-400' 
    : report.overallScore >= 70 
    ? 'from-cyan-500 to-blue-500'
    : report.overallScore >= 50 
    ? 'from-amber-500 to-orange-400' 
    : 'from-rose-500 to-red-600';

  return (
    <div className="space-y-6">
      
      {/* Success Notification Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-800 text-white border border-indigo-500/40 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 animate-pulse" />
          <p className="text-xs font-medium">{successToast}</p>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Data Health & AI Quality Auditor
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Gemini 3.8 Flash
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated AI diagnostic scanner for dataset hygiene. Uses Gemini to pinpoint extreme outliers, missing values, and duplicate rows with instant, reversible <strong>One-Click Clean</strong> remediation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto flex-wrap">
            <button
              onClick={handleRunGeminiAudit}
              disabled={isLoadingAi}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isLoadingAi ? 'animate-spin' : 'text-cyan-200'}`} />
              <span>{isLoadingAi ? 'Scanning with Gemini...' : 'Run Gemini Audit'}</span>
            </button>

            {pendingCount > 0 && (
              <button
                onClick={handleExecuteCleanAll}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                title="Execute all recommended One-Click Clean routines sequentially"
              >
                <Zap className="w-4 h-4 text-emerald-200" />
                <span>Clean All ({pendingCount})</span>
              </button>
            )}

            {/* Before vs After Diff Button */}
            <button
              onClick={() => setIsDiffModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all shadow-sm"
              title="Inspect Before vs. After comparison and cell-level diffs"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Before/After Diff</span>
            </button>

            {/* Quality Certificate Button */}
            <button
              onClick={() => setIsCertificateModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all shadow-sm"
              title="Generate official printable Data Quality & Integrity Certificate"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Certificate</span>
            </button>

            {/* PII Scanner Button */}
            <button
              onClick={() => setIsPiiModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                !piiScan.isClean
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Scan and anonymize Personally Identifiable Information"
            >
              <Lock className={`w-3.5 h-3.5 ${!piiScan.isClean ? 'text-rose-400' : 'text-slate-400'}`} />
              <span>PII Guard</span>
              {!piiScan.isClean && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono font-bold">
                  {piiScan.affectedColumnsCount}
                </span>
              )}
            </button>

            {/* Data Contracts & Validation Rules Button */}
            <button
              onClick={() => setIsContractsModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                contractsReport.failingRulesCount > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Define and enforce validation rules and contracts"
            >
              <ListChecks className={`w-3.5 h-3.5 ${contractsReport.failingRulesCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Contracts</span>
              {contractsReport.failingRulesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-600 text-white font-mono font-bold">
                  {contractsReport.failingRulesCount}
                </span>
              )}
            </button>

            {/* Synthetic Edge-Case & Stress Data Generator Button */}
            <button
              onClick={() => setIsStressModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
              title="Generate synthetic edge-case records and adversarial anomalies to stress-test your pipelines"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Stress Test</span>
            </button>

            {/* Data Cleaning Recipes & Macro Pipelines Button */}
            <button
              onClick={() => setIsRecipeModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all shadow-sm"
              title="Compose, save, and run multi-step data cleaning pipelines"
            >
              <Workflow className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recipes</span>
            </button>

            {onOpenVersionsModal && (
              <button
                onClick={onOpenVersionsModal}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-300 text-xs font-semibold transition-all"
                title="View version snapshots and rollback history"
              >
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Versions</span>
              </button>
            )}
          </div>
        </div>

        {/* Last Action Notice if applicable */}
        {lastActionSummary && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Latest checkpoint: <span className="text-slate-200 font-medium">{lastActionSummary}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDiffModalOpen(true)}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2"
              >
                Inspect Visual Diff
              </button>
              {onOpenVersionsModal && (
                <button 
                  onClick={onOpenVersionsModal}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2"
                >
                  Restore Previous
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* PII & Privacy Risk Warning Banner if sensitive data detected */}
      {!piiScan.isClean && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-300 flex items-center gap-2">
                <span>Privacy Risk Flagged: {piiScan.totalPiiCells} Sensitive Records Detected</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30">
                  {piiScan.complianceRiskLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Columns <span className="font-mono text-slate-300">{piiScan.detections.map(d => `'${d.column}'`).join(', ')}</span> contain unmasked PII records subject to privacy regulations.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPiiModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Open PII Guard</span>
          </button>
        </div>
      )}

      {/* Top Health Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Overall Health Score Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Health Score</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreBadgeColor}`}>
              {report.grade} Grade
            </span>
          </div>
          
          <div className="my-3 flex items-baseline gap-3">
            <div className={`text-4xl font-extrabold bg-gradient-to-r ${scoreRingGradient} bg-clip-text text-transparent`}>
              {report.overallScore}%
            </div>
            <span className="text-xs font-medium text-slate-400">
              {report.status}
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${scoreRingGradient} transition-all duration-700`}
              style={{ width: `${report.overallScore}%` }}
            />
          </div>
        </div>

        {/* Missing Values KPI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Missing Values</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              groundTruth.totalNulls === 0 
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40'
                : 'text-amber-400 border-amber-500/30 bg-amber-950/40'
            }`}>
              {groundTruth.totalNulls === 0 ? '100% Complete' : `${round(100 - groundTruth.completenessRate, 1)}% Empty`}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <div className="text-3xl font-bold text-white">
              {groundTruth.totalNulls.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400">
              cells ({groundTruth.missingByColumn.length} columns)
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Completeness</span>
            <span className="font-semibold text-slate-200">{groundTruth.completenessRate}%</span>
          </div>
        </div>

        {/* Duplicate Rows KPI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Duplicate Rows</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              groundTruth.duplicateRowCount === 0 
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40'
                : 'text-purple-400 border-purple-500/30 bg-purple-950/40'
            }`}>
              {groundTruth.duplicateRowCount === 0 ? 'No Duplicates' : `${groundTruth.duplicateRate}% Duplicated`}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <div className="text-3xl font-bold text-white">
              {groundTruth.duplicateRowCount.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400">
              redundant row(s)
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Unique Row Count</span>
            <span className="font-semibold text-slate-200">
              {(groundTruth.rowCount - groundTruth.duplicateRowCount).toLocaleString()} rows
            </span>
          </div>
        </div>

        {/* Statistical Outliers KPI */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Statistical Outliers</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              groundTruth.totalOutliers === 0 
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40'
                : 'text-rose-400 border-rose-500/30 bg-rose-950/40'
            }`}>
              {groundTruth.totalOutliers === 0 ? 'Normal Range' : `${groundTruth.outliersByColumn.length} Col Flaws`}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <div className="text-3xl font-bold text-white">
              {groundTruth.totalOutliers.toLocaleString()}
            </div>
            <span className="text-xs text-slate-400">
              points beyond 3σ
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tolerance Bound</span>
            <span className="font-semibold text-slate-200">Gaussian 3σ</span>
          </div>
        </div>

      </div>

      {/* Gemini AI Executive Health Assessment Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Gemini Diagnostic Assessment</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Engine: {report.modelUsed || 'gemini-3.8-flash'}
            </span>
            {report.isAiGenerated && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                AI Verified
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {report.executiveSummary}
        </p>

        {report.keyRisks && report.keyRisks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80">
            {report.keyRisks.map((risk, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-slate-300">{risk}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issues Navigation Toolbar & Priority Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg space-y-3">
        
        {/* Top Row: Category Tabs & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>All Issues</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {report.issues.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('missing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'missing'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>Missing Values</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {missingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('duplicates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'duplicates'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>Duplicate Rows</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {dupCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('outliers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'outliers'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>Outliers (3σ)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {outlierCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>Resolved</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {resolvedCount}
              </span>
            </button>
          </div>

          {/* Search Filter */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by column or feature..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Priority Filter Toggle (All Issues vs Only Critical Errors vs Only Low-Priority Inconsistencies) */}
        <div className="pt-2.5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              Priority Filter:
            </span>
            
            {/* 3-Way Segmented Control Toggle */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl flex-wrap gap-1">
              <button
                onClick={() => setPriorityFilter('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  priorityFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>All Issues</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  priorityFilter === 'all' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-300'
                }`}>
                  {totalInTabCount}
                </span>
              </button>

              <button
                onClick={() => setPriorityFilter('critical')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  priorityFilter === 'critical'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <AlertCircle className={`w-3.5 h-3.5 ${priorityFilter === 'critical' ? 'text-white' : 'text-rose-400'}`} />
                <span>Only Critical Errors</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  priorityFilter === 'critical' ? 'bg-rose-700 text-rose-100' : 'bg-slate-800 text-rose-300'
                }`}>
                  {criticalInTabCount}
                </span>
              </button>

              <button
                onClick={() => setPriorityFilter('low_priority')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  priorityFilter === 'low_priority'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <SlidersHorizontal className={`w-3.5 h-3.5 ${priorityFilter === 'low_priority' ? 'text-white' : 'text-amber-400'}`} />
                <span>Only Low-Priority Inconsistencies</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  priorityFilter === 'low_priority' ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-amber-300'
                }`}>
                  {lowPriorityInTabCount}
                </span>
              </button>
            </div>
          </div>

          {/* Active Filter Indicator & Quick Reset */}
          {priorityFilter !== 'all' && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] text-slate-400">
                Filtered: <strong className="text-slate-200">{priorityFilter === 'critical' ? 'Critical Errors' : 'Low-Priority Inconsistencies'}</strong>
              </span>
              <button
                onClick={() => setPriorityFilter('all')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Issues List Container */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {priorityFilter === 'critical' 
                ? 'No Critical Errors Detected' 
                : priorityFilter === 'low_priority' 
                ? 'No Low-Priority Inconsistencies' 
                : 'No Issues in this Category'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {priorityFilter === 'critical'
                ? 'Great news! No severe data integrity failures or critical risks were found under the current view.'
                : priorityFilter === 'low_priority'
                ? 'No low-priority warnings or minor inconsistencies detected under this view.'
                : activeTab === 'resolved' 
                ? 'No cleaned issues recorded yet. Execute any One-Click Clean suggestion to resolve quality flaws.' 
                : 'The dataset has no flagged flaws under this filter. Central tendencies and distributions are clean.'}
            </p>
            {priorityFilter !== 'all' && (
              <div className="pt-2">
                <button
                  onClick={() => setPriorityFilter('all')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Show All Issues</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isExpanded = expandedIssueId === issue.id;
            const isResolved = issue.resolved;

            // Category color tags
            const catBadge = issue.category === 'missing_values' 
              ? { text: 'Missing Values', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
              : issue.category === 'duplicate_rows'
              ? { text: 'Duplicate Rows', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }
              : { text: 'Statistical Outlier', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };

            // Severity color tags
            const sevBadge = issue.severity === 'critical'
              ? 'bg-red-500/20 text-red-300 border-red-500/40'
              : issue.severity === 'warning'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/40';

            return (
              <div 
                key={issue.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all ${
                  isResolved 
                    ? 'border-emerald-500/40 bg-slate-900/60 opacity-80' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  
                  {/* Issue Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${catBadge.bg}`}>
                        {catBadge.text}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sevBadge}`}>
                        {issue.severity}
                      </span>
                      {issue.column && (
                        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {issue.column}
                        </span>
                      )}
                      {isResolved && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {issue.title}
                      <span className="text-xs font-normal text-slate-400">
                        • {issue.metricsSummary}
                      </span>
                    </h4>

                    <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                      <strong className="text-slate-300">Gemini Diagnosis:</strong> {issue.aiExplanation}
                    </p>

                    <div className="text-xs text-indigo-300 bg-indigo-950/20 border border-indigo-500/20 rounded-xl px-3 py-1.5 flex items-center gap-2 max-w-2xl">
                      <Wand2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span><strong>AI Recommendation:</strong> {issue.aiRecommendation}</span>
                    </div>
                  </div>

                  {/* One-Click Clean Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end gap-2 shrink-0 w-full lg:w-auto">
                    
                    {!isResolved ? (
                      <button
                        onClick={() => handleExecuteOneClickClean(issue)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 group"
                        title={issue.suggestedAction.description}
                      >
                        <Wand2 className="w-3.5 h-3.5 text-cyan-200 group-hover:rotate-12 transition-transform" />
                        <span>{issue.suggestedAction.label}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Cleaned & Saved</span>
                      </div>
                    )}

                    {/* Secondary Actions & Inspection */}
                    <div className="flex items-center gap-2">
                      {issue.alternativeActions && issue.alternativeActions.length > 0 && !isResolved && (
                        <div className="flex items-center gap-1.5">
                          {issue.alternativeActions.map((altAction, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => handleExecuteOneClickClean(issue, altAction)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-all"
                              title={altAction.description}
                            >
                              {altAction.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {issue.sampleRows && issue.sampleRows.length > 0 && (
                        <button
                          onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-medium border border-slate-700 flex items-center gap-1 transition-all"
                        >
                          {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{isExpanded ? 'Hide Samples' : 'Inspect Rows'}</span>
                        </button>
                      )}
                    </div>

                  </div>

                </div>

                {/* Inspect Sample Rows Table */}
                {isExpanded && issue.sampleRows && issue.sampleRows.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">Flagged Sample Records Preview:</span>
                      <span>Showing first {issue.sampleRows.length} occurrences</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 max-h-48">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] uppercase font-mono text-slate-400">
                            <th className="p-2">#</th>
                            {dataset.columns.slice(0, 7).map(c => (
                              <th 
                                key={c.name} 
                                className={`p-2 ${c.name === issue.column ? 'text-cyan-400 font-bold bg-cyan-950/20' : ''}`}
                              >
                                {c.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                          {issue.sampleRows.map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/40">
                              <td className="p-2 text-slate-500">{rIdx + 1}</td>
                              {dataset.columns.slice(0, 7).map(c => {
                                const val = r[c.name];
                                const isTarget = c.name === issue.column;
                                const isNull = val === null || val === undefined || val === '';
                                return (
                                  <td 
                                    key={c.name} 
                                    className={`p-2 whitespace-nowrap ${
                                      isTarget 
                                        ? isNull 
                                          ? 'text-amber-400 font-bold bg-amber-950/20' 
                                          : 'text-rose-400 font-bold bg-rose-950/20'
                                        : 'text-slate-300'
                                    }`}
                                  >
                                    {isNull ? '<NULL / EMPTY>' : String(val)}
                                  </td>
                                );
                              })}
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

      {/* Before vs After Diff Inspector Modal */}
      {isDiffModalOpen && (
        <DataHealthDiffModal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          dataset={dataset}
          onUpdateDataset={onUpdateDataset}
        />
      )}

      {/* Data Quality Certificate Modal */}
      {isCertificateModalOpen && (
        <DataQualityCertificateModal
          isOpen={isCertificateModalOpen}
          onClose={() => setIsCertificateModalOpen(false)}
          dataset={dataset}
          report={report}
        />
      )}

      {/* PII & Sensitive Data Scanner Modal */}
      {isPiiModalOpen && (
        <PiiScannerModal
          isOpen={isPiiModalOpen}
          onClose={() => setIsPiiModalOpen(false)}
          dataset={dataset}
          onUpdateDataset={onUpdateDataset}
        />
      )}

      {/* Data Contracts & Expectations Modal */}
      {isContractsModalOpen && (
        <DataContractsModal
          isOpen={isContractsModalOpen}
          onClose={() => setIsContractsModalOpen(false)}
          dataset={dataset}
          onUpdateDataset={onUpdateDataset}
        />
      )}

      {/* Synthetic Edge-Case & Stress Data Generator Modal */}
      {isStressModalOpen && (
        <StressDataGeneratorModal
          isOpen={isStressModalOpen}
          onClose={() => setIsStressModalOpen(false)}
          dataset={dataset}
          onUpdateDataset={onUpdateDataset}
        />
      )}

      {/* Data Cleaning Recipes & Macro Pipelines Modal */}
      {isRecipeModalOpen && (
        <CleaningRecipeModal
          isOpen={isRecipeModalOpen}
          onClose={() => setIsRecipeModalOpen(false)}
          dataset={dataset}
          onUpdateDataset={onUpdateDataset}
          onOpenDiffModal={() => setIsDiffModalOpen(true)}
        />
      )}

    </div>
  );
};
