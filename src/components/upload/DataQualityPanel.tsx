import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Trash2, 
  Wand2, 
  Layers, 
  Sliders, 
  Scissors, 
  RefreshCw, 
  ArrowRight, 
  Info,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Zap,
  HelpCircle,
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { ColumnMeta, ColumnDataType } from '../../types';
import { 
  DataQualityReport, 
  DataQualityIssue, 
  ColumnQualityReport, 
  analyzeDataQuality,
  executeQualityCleanup 
} from '../../utils/qualityEngine';

interface DataQualityPanelProps {
  data: Record<string, any>[];
  columns: ColumnMeta[];
  onApplyCleanup: (cleanedData: Record<string, any>[], updatedColumns: ColumnMeta[], message: string) => void;
  onNavigateToPreview?: () => void;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  data,
  columns,
  onApplyCleanup,
  onNavigateToPreview,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'missing' | 'duplicate' | 'type_inconsistency'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedColumnDetail, setSelectedColumnDetail] = useState<string | null>(null);

  // Compute live quality diagnostics
  const report: DataQualityReport = useMemo(() => {
    return analyzeDataQuality(data, columns);
  }, [data, columns]);

  // Filter issues based on user selection
  const filteredIssues = useMemo(() => {
    return report.issues.filter(issue => {
      if (filterCategory !== 'all' && issue.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          issue.title.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          (issue.columnName && issue.columnName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [report.issues, filterCategory, searchQuery]);

  const handleExecuteFix = (issue: DataQualityIssue) => {
    const { cleanedData, updatedColumns, message } = executeQualityCleanup(
      data,
      columns,
      issue.fixActionType,
      issue.fixPayload
    );
    onApplyCleanup(cleanedData, updatedColumns, message);
  };

  const handleAutoFixAll = () => {
    const { cleanedData, updatedColumns, message } = executeQualityCleanup(
      data,
      columns,
      'autofix_all'
    );
    onApplyCleanup(cleanedData, updatedColumns, message);
  };

  const handleFixColumn = (colReport: ColumnQualityReport) => {
    if (colReport.inferredSuggestedType && colReport.inferredSuggestedType !== colReport.detectedType) {
      const { cleanedData, updatedColumns, message } = executeQualityCleanup(
        data,
        columns,
        'cast_col_type',
        { column: colReport.columnName, targetType: colReport.inferredSuggestedType }
      );
      onApplyCleanup(cleanedData, updatedColumns, message);
    } else if (colReport.nullCount > 0) {
      const { cleanedData, updatedColumns, message } = executeQualityCleanup(
        data,
        columns,
        'impute_col',
        { column: colReport.columnName }
      );
      onApplyCleanup(cleanedData, updatedColumns, message);
    } else if (colReport.hasWhitespaceIssues) {
      const { cleanedData, updatedColumns, message } = executeQualityCleanup(
        data,
        columns,
        'trim_whitespace',
        { column: colReport.columnName }
      );
      onApplyCleanup(cleanedData, updatedColumns, message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. TOP QUALITY OVERVIEW HERO CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Quality Score & Grade */}
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shadow-inner shrink-0">
              <span className={`text-2xl font-black tracking-tight ${report.gradeColor}`}>
                {report.score}
              </span>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                GRADE {report.grade}
              </span>
              <div 
                className="absolute inset-0 rounded-2xl border-2 border-indigo-500/30 pointer-events-none"
                style={{
                  clipPath: `inset(${100 - report.score}% 0 0 0)`
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-white tracking-tight">Data Quality & Health Diagnostic</h3>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  report.score >= 85 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : report.score >= 65
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}>
                  {report.score >= 85 ? 'Production Ready' : report.score >= 65 ? 'Needs Cleaning' : 'Critical Issues'}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                Automated heuristic evaluation across <span className="text-white font-medium">{report.rowCount.toLocaleString()} records</span> and <span className="text-white font-medium">{report.colCount} features</span>. {report.issues.length === 0 ? 'No major structural defects detected.' : `${report.issues.length} actionable health optimizations identified.`}
              </p>
            </div>
          </div>

          {/* Master 1-Click Auto Fix Action */}
          {report.issues.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleAutoFixAll}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-teal-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-xl shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" style={{ animationDuration: '4s' }} />
                <span>⚡ 1-Click Auto-Fix All Issues</span>
              </button>
            </div>
          )}

        </div>

        {/* 3 Core Quality Pillars Progress / KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          
          {/* Pillar 1: Completeness */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                Data Completeness
              </span>
              <span className={`text-xs font-mono font-bold ${report.completenessScore >= 90 ? 'text-teal-400' : 'text-amber-400'}`}>
                {report.completenessScore}%
              </span>
            </div>
            
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${report.completenessScore}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{report.totalMissingCells.toLocaleString()} empty cells</span>
              <span>{report.incompleteRowCount.toLocaleString()} rows affected</span>
            </div>
          </div>

          {/* Pillar 2: Uniqueness */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Record Uniqueness
              </span>
              <span className={`text-xs font-mono font-bold ${report.uniquenessScore >= 95 ? 'text-indigo-400' : 'text-rose-400'}`}>
                {report.uniquenessScore}%
              </span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${report.uniquenessScore}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{report.duplicateRowCount.toLocaleString()} duplicate rows</span>
              <span>{report.duplicatePercentage}% duplicate rate</span>
            </div>
          </div>

          {/* Pillar 3: Consistency */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Schema Consistency
              </span>
              <span className={`text-xs font-mono font-bold ${report.consistencyScore >= 90 ? 'text-cyan-400' : 'text-amber-400'}`}>
                {report.consistencyScore}%
              </span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-teal-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${report.consistencyScore}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{report.typeInconsistencyCount} type warnings</span>
              <span>{report.colCount} validated cols</span>
            </div>
          </div>

        </div>

      </div>

      {/* 2. IDENTIFIED ISSUES & ONE-CLICK CLEANUP SUGGESTIONS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-cyan-400" />
              Identified Issues & One-Click Cleanup Actions ({report.issues.length})
            </h4>
            <p className="text-xs text-slate-400">
              Targeted remediation workflows tailored to your dataset's specific anomalies.
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0 overflow-x-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterCategory === 'all'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({report.issues.length})
            </button>
            <button
              onClick={() => setFilterCategory('missing')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterCategory === 'missing'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Missing Values
            </button>
            <button
              onClick={() => setFilterCategory('duplicate')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterCategory === 'duplicate'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Duplicates
            </button>
            <button
              onClick={() => setFilterCategory('type_inconsistency')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterCategory === 'type_inconsistency'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Type Inconsistencies
            </button>
          </div>
        </div>

        {/* Issue Cards Stream */}
        {filteredIssues.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h5 className="text-sm font-bold text-white">No issues found in this category!</h5>
            <p className="text-xs text-slate-400">
              Your dataset satisfies all quality checks for this criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIssues.map(issue => {
              const isHigh = issue.severity === 'high';
              const isMed = issue.severity === 'medium';

              return (
                <div
                  key={issue.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 bg-slate-950/90 ${
                    isHigh
                      ? 'border-rose-500/40 hover:border-rose-500/60 shadow-md shadow-rose-950/20'
                      : isMed
                      ? 'border-amber-500/40 hover:border-amber-500/60'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {issue.category === 'missing' && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {issue.category === 'duplicate' && (
                          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                            <Scissors className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {issue.category === 'type_inconsistency' && (
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {issue.category === 'whitespace_casing' && (
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <Sliders className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <h5 className="text-xs font-bold text-white line-clamp-1">{issue.title}</h5>
                          {issue.columnName && (
                            <span className="text-[10px] font-mono text-indigo-300">
                              Column: {issue.columnName}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        isHigh
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isMed
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {issue.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {issue.description}
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span><strong className="text-white">Recommended:</strong> {issue.suggestedFix}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-mono text-slate-500">
                      Impacts {issue.affectedCount.toLocaleString()} items ({issue.affectedPercentage}%)
                    </span>

                    <button
                      onClick={() => handleExecuteFix(issue)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Apply Fix</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 3. COLUMN-BY-COLUMN HEALTH & DATA TYPE AUDIT MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              Column-by-Column Data Health Matrix ({report.columnReports.length} Features)
            </h4>
            <p className="text-xs text-slate-400">
              Detailed missingness, unique counts, and type fidelity per variable.
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search column..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500 w-44"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold text-slate-400">Column Name</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">Active Type</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">Type Health</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">Missing Rate</th>
                <th className="py-2.5 px-3 font-semibold text-slate-400">Unique Values</th>
                <th className="py-2.5 px-3.5 font-semibold text-right text-slate-400">Quick Clean Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {report.columnReports
                .filter(col => !searchQuery || col.columnName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(col => {
                  const hasTypeIssue = col.inferredSuggestedType && col.inferredSuggestedType !== col.detectedType;
                  const hasMissing = col.nullCount > 0;
                  const isClean = !hasTypeIssue && !hasMissing && !col.hasWhitespaceIssues && !col.hasMixedTypes;

                  return (
                    <tr key={col.columnName} className="hover:bg-slate-800/40 transition-colors">
                      {/* Column Name */}
                      <td className="py-2.5 px-3.5 font-bold text-white">
                        {col.columnName}
                      </td>

                      {/* Active Type */}
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-normal">
                          {col.detectedType}
                        </span>
                      </td>

                      {/* Type Health / Suggested Type */}
                      <td className="py-2.5 px-3">
                        {hasTypeIssue ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Suggest: {col.inferredSuggestedType}
                            </span>
                          </div>
                        ) : col.hasMixedTypes ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Mixed Data
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Valid
                          </span>
                        )}
                      </td>

                      {/* Missing Rate */}
                      <td className="py-2.5 px-3">
                        {hasMissing ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            col.nullPercentage >= 20 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {col.nullCount} ({col.nullPercentage}%)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">0% (Full)</span>
                        )}
                      </td>

                      {/* Unique Count */}
                      <td className="py-2.5 px-3 text-slate-300">
                        {col.uniqueCount.toLocaleString()}
                      </td>

                      {/* Quick Clean Action */}
                      <td className="py-2.5 px-3.5 text-right">
                        {isClean ? (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Clean
                          </span>
                        ) : (
                          <button
                            onClick={() => handleFixColumn(col)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-[10px] font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>
                              {hasTypeIssue ? `Cast to ${col.inferredSuggestedType}` : hasMissing ? 'Impute' : 'Trim'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
