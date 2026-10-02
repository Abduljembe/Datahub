import React, { useState, useMemo } from 'react';
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  History, 
  Database,
  Layers,
  AlertTriangle,
  Minus,
  Check
} from 'lucide-react';
import { Dataset, DatasetVersion } from '../../types';
import { computeGroundTruthHealthStats } from '../../utils/dataHealthEngine';
import { getDatasetVersions, restoreDatasetVersion } from '../../utils/versionEngine';
import { round } from '../../utils/statistics';

interface DataHealthDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const DataHealthDiffModal: React.FC<DataHealthDiffModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
}) => {
  const versions = useMemo(() => getDatasetVersions(dataset), [dataset]);
  
  // Default compare to the previous version or initial baseline
  const [selectedVersionId, setSelectedVersionId] = useState<string>(() => {
    if (versions.length > 1) {
      return versions[1].id;
    }
    return versions[0]?.id || '';
  });

  const selectedVersion = useMemo(() => {
    return versions.find(v => v.id === selectedVersionId) || versions[1] || versions[0];
  }, [versions, selectedVersionId]);

  // Construct dataset object for previous version
  const previousDataset = useMemo<Dataset | null>(() => {
    if (!selectedVersion) return null;
    return {
      ...dataset,
      data: selectedVersion.data,
      columns: selectedVersion.columns,
    };
  }, [dataset, selectedVersion]);

  // Compute stats for current vs previous
  const currentStats = useMemo(() => computeGroundTruthHealthStats(dataset), [dataset]);
  const previousStats = useMemo(() => {
    if (!previousDataset) return currentStats;
    return computeGroundTruthHealthStats(previousDataset);
  }, [previousDataset, currentStats]);

  // Deltas
  const scoreDelta = currentStats.baselineScore - previousStats.baselineScore;
  const nullDelta = currentStats.totalNulls - previousStats.totalNulls;
  const dupDelta = currentStats.duplicateRowCount - previousStats.duplicateRowCount;
  const outlierDelta = currentStats.totalOutliers - previousStats.totalOutliers;
  const rowDelta = currentStats.rowCount - previousStats.rowCount;

  // Identify columns with differences
  const columnDiffs = useMemo(() => {
    if (!previousDataset) return [];
    const diffs: Array<{
      colName: string;
      prevNulls: number;
      currNulls: number;
      prevOutliers: number;
      currOutliers: number;
      changeDescription: string;
    }> = [];

    dataset.columns.forEach(col => {
      const prevColNulls = previousStats.missingByColumn.find(m => m.column === col.name)?.nullCount || 0;
      const currColNulls = currentStats.missingByColumn.find(m => m.column === col.name)?.nullCount || 0;
      const prevColOutliers = previousStats.outliersByColumn.find(o => o.column === col.name)?.outlierCount || 0;
      const currColOutliers = currentStats.outliersByColumn.find(o => o.column === col.name)?.outlierCount || 0;

      if (prevColNulls !== currColNulls || prevColOutliers !== currColOutliers) {
        const changes: string[] = [];
        if (prevColNulls > currColNulls) {
          changes.push(`Imputed ${prevColNulls - currColNulls} missing cells`);
        }
        if (prevColOutliers > currColOutliers) {
          changes.push(`Mitigated ${prevColOutliers - currColOutliers} outliers`);
        }
        diffs.push({
          colName: col.name,
          prevNulls: prevColNulls,
          currNulls: currColNulls,
          prevOutliers: prevColOutliers,
          currOutliers: currColOutliers,
          changeDescription: changes.join(' • ') || 'Distribution adjusted',
        });
      }
    });

    return diffs;
  }, [dataset, previousDataset, currentStats, previousStats]);

  // Sample row diffs (first 10 modified or different rows)
  const rowDiffSamples = useMemo(() => {
    if (!previousDataset) return [];
    const diffRows: Array<{
      index: number;
      changes: Array<{ col: string; prevVal: any; currVal: any }>;
    }> = [];

    const minRows = Math.min(dataset.data.length, previousDataset.data.length);
    for (let i = 0; i < minRows; i++) {
      const currRow = dataset.data[i];
      const prevRow = previousDataset.data[i];
      const cellChanges: Array<{ col: string; prevVal: any; currVal: any }> = [];

      dataset.columns.forEach(c => {
        const pVal = prevRow ? prevRow[c.name] : undefined;
        const cVal = currRow ? currRow[c.name] : undefined;
        if (pVal !== cVal) {
          cellChanges.push({ col: c.name, prevVal: pVal, currVal: cVal });
        }
      });

      if (cellChanges.length > 0) {
        diffRows.push({ index: i, changes: cellChanges });
        if (diffRows.length >= 8) break;
      }
    }

    return diffRows;
  }, [dataset, previousDataset]);

  const handleRevert = () => {
    if (!selectedVersion) return;
    try {
      const { updatedDataset } = restoreDatasetVersion(dataset, selectedVersion.id, 'Data Health Inspector');
      onUpdateDataset(updatedDataset);
      onClose();
    } catch (err) {
      console.error('Failed to rollback version:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Data Quality "Before vs. After" Diff
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Version Inspector
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Inspect mathematical variance, missing cell remediation, and score progress against historical checkpoints.
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Comparison Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div>
              <span className="text-xs font-semibold text-slate-300 block">Compare Live Dataset Against:</span>
              <span className="text-[11px] text-slate-500">Select any saved historical snapshot to verify remediation outcomes</span>
            </div>
            <select
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </option>
              ))}
            </select>
          </div>

          {/* Metric Comparison Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Health Score Diff */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Health Score</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-400">{previousStats.baselineScore}%</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-2xl font-extrabold text-white">{currentStats.baselineScore}%</span>
              </div>
              <div className={`text-xs font-semibold flex items-center gap-1 ${scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scoreDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{scoreDelta >= 0 ? `+${scoreDelta}% Progress` : `${scoreDelta}% Degradation`}</span>
              </div>
            </div>

            {/* Missing Values Diff */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Missing Cells</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-400">{previousStats.totalNulls}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-2xl font-extrabold text-white">{currentStats.totalNulls}</span>
              </div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{nullDelta <= 0 ? `${Math.abs(nullDelta)} cells resolved` : `+${nullDelta} nulls added`}</span>
              </div>
            </div>

            {/* Duplicate Rows Diff */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Duplicate Rows</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-400">{previousStats.duplicateRowCount}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-2xl font-extrabold text-white">{currentStats.duplicateRowCount}</span>
              </div>
              <div className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                <span>{dupDelta <= 0 ? `${Math.abs(dupDelta)} duplicates purged` : `+${dupDelta} duplicates`}</span>
              </div>
            </div>

            {/* Outliers Diff */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outliers (3σ)</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-400">{previousStats.totalOutliers}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-2xl font-extrabold text-white">{currentStats.totalOutliers}</span>
              </div>
              <div className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                <span>{outlierDelta <= 0 ? `${Math.abs(outlierDelta)} points stabilized` : `+${outlierDelta} outliers`}</span>
              </div>
            </div>

          </div>

          {/* Column Remediations Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Column-Level Cleaning Remediations ({columnDiffs.length})
            </h4>

            {columnDiffs.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 text-center">
                No column-level metric modifications detected between these two snapshot states.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {columnDiffs.map(cd => (
                  <div key={cd.colName} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400">{cd.colName}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Remediated
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{cd.changeDescription}</p>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Nulls: {cd.prevNulls} → {cd.currNulls}</span>
                      <span>Outliers: {cd.prevOutliers} → {cd.currOutliers}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sample Row-Level Cell Diffs */}
          {rowDiffSamples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Row-Level Cell Inspector (Sample Rows Modified)
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] uppercase font-mono text-slate-400">
                      <th className="p-2.5">Row #</th>
                      <th className="p-2.5">Feature Column</th>
                      <th className="p-2.5">Before Value</th>
                      <th className="p-2.5"></th>
                      <th className="p-2.5">After Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {rowDiffSamples.map((sample, sIdx) => (
                      <React.Fragment key={sIdx}>
                        {sample.changes.map((ch, chIdx) => (
                          <tr key={`${sIdx}-${chIdx}`} className="hover:bg-slate-900/40">
                            {chIdx === 0 ? (
                              <td className="p-2.5 text-slate-500 font-bold" rowSpan={sample.changes.length}>
                                Row {sample.index + 1}
                              </td>
                            ) : null}
                            <td className="p-2.5 text-indigo-300 font-semibold">{ch.col}</td>
                            <td className="p-2.5 text-rose-400 line-through bg-rose-950/20">
                              {ch.prevVal === null || ch.prevVal === undefined || ch.prevVal === '' ? '<NULL>' : String(ch.prevVal)}
                            </td>
                            <td className="p-2.5 text-slate-500 text-center">
                              <ArrowRight className="w-3.5 h-3.5 mx-auto text-slate-500" />
                            </td>
                            <td className="p-2.5 text-emerald-400 font-bold bg-emerald-950/20">
                              {ch.currVal === null || ch.currVal === undefined || ch.currVal === '' ? '<NULL>' : String(ch.currVal)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>All modifications are safely committed into dataset snapshots.</span>
          </div>

          <div className="flex items-center gap-2">
            {versions.length > 1 && (
              <button
                onClick={handleRevert}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5"
                title="Rollback dataset state to selected version"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert to "{selectedVersion?.name}"</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
            >
              Done Inspecting
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
