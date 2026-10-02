import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Sliders, 
  Filter, 
  Download, 
  Scissors, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Database, 
  Layers, 
  Eye, 
  Search, 
  RefreshCw, 
  Info, 
  FileSpreadsheet, 
  Check, 
  HelpCircle,
  BarChart2,
  Table,
  Zap,
  ArrowUpDown
} from 'lucide-react';
import { Dataset, ColumnMeta, ZScoreAnomalyPoint, AnomalyColumnSummary } from '../../types';
import { computeZScoreAnomalies, round } from '../../utils/statistics';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  ReferenceArea,
  BarChart, 
  Bar, 
  Cell,
  Legend
} from 'recharts';

interface AnomalyDetectorProps {
  dataset: Dataset;
  onUpdateDataset?: (updated: Dataset) => void;
  onCreateDataset?: (newDataset: Dataset) => void;
}

export const AnomalyDetector: React.FC<AnomalyDetectorProps> = ({
  dataset,
  onUpdateDataset,
  onCreateDataset,
}) => {
  // Numeric columns available for detection
  const numericColumns = useMemo(
    () => dataset.columns.filter(col => col.type === 'number'),
    [dataset.columns]
  );

  // Configuration State
  const [selectedColumnNames, setSelectedColumnNames] = useState<string[]>(() => 
    numericColumns.map(c => c.name)
  );
  const [zThreshold, setZThreshold] = useState<number>(3.0);
  const [method, setMethod] = useState<'standard' | 'robust'>('standard');
  const [activeVisualTab, setActiveVisualTab] = useState<'distribution' | 'bivariate' | 'features'>('distribution');
  
  // Visual Inspection state
  const [activeColumnForScatter, setActiveColumnForScatter] = useState<string>(
    numericColumns[0]?.name || ''
  );
  const [bivariateX, setBivariateX] = useState<string>(numericColumns[0]?.name || '');
  const [bivariateY, setBivariateY] = useState<string>(numericColumns[1]?.name || numericColumns[0]?.name || '');

  // Table filtering & search
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'extreme' | 'moderate' | 'mild'>('all');
  const [columnFilter, setColumnFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'high' | 'low'>('all');
  const [selectedRowDetails, setSelectedRowDetails] = useState<ZScoreAnomalyPoint | null>(null);
  
  // Action notifications
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Synchronize column selection if dataset columns change
  React.useEffect(() => {
    const validNames = numericColumns.map(c => c.name);
    setSelectedColumnNames(prev => {
      const filtered = prev.filter(name => validNames.includes(name));
      return filtered.length > 0 ? filtered : validNames;
    });
    if (!validNames.includes(activeColumnForScatter) && validNames.length > 0) {
      setActiveColumnForScatter(validNames[0]);
    }
    if (!validNames.includes(bivariateX) && validNames.length > 0) {
      setBivariateX(validNames[0]);
    }
    if (!validNames.includes(bivariateY) && validNames.length > 1) {
      setBivariateY(validNames[1]);
    }
  }, [numericColumns]);

  // Compute Anomalies
  const anomalyResults = useMemo(() => {
    if (numericColumns.length === 0 || dataset.data.length === 0) {
      return {
        totalRows: dataset.data.length,
        anomalousRowCount: 0,
        anomalousRowIndices: [],
        anomalies: [],
        columnSummaries: {},
        globalZThreshold: zThreshold,
        method,
      };
    }

    return computeZScoreAnomalies(
      dataset.data,
      dataset.columns,
      selectedColumnNames.length > 0 ? selectedColumnNames : undefined,
      zThreshold,
      method
    );
  }, [dataset, selectedColumnNames, zThreshold, method, numericColumns]);

  // Filter anomalies for table
  const filteredAnomalies = useMemo(() => {
    return anomalyResults.anomalies.filter(item => {
      if (columnFilter !== 'all' && item.columnName !== columnFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (directionFilter !== 'all' && item.direction !== directionFilter) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCol = item.columnName.toLowerCase().includes(q);
        const matchesVal = String(item.value).includes(q);
        const matchesRow = String(item.rowIndex + 1).includes(q);
        const matchesRowData = Object.values(item.row).some(v => 
          String(v).toLowerCase().includes(q)
        );
        if (!matchesCol && !matchesVal && !matchesRow && !matchesRowData) return false;
      }
      return true;
    });
  }, [anomalyResults.anomalies, columnFilter, severityFilter, directionFilter, searchQuery]);

  // Scatter plot data for single feature distribution
  const scatterPlotData = useMemo(() => {
    if (!activeColumnForScatter) return [];
    const summary = anomalyResults.columnSummaries[activeColumnForScatter];
    const mean = summary ? (method === 'robust' ? summary.median : summary.mean) : 0;
    const std = summary ? (method === 'robust' ? (summary.mad > 0 ? summary.mad / 0.6745 : 1) : summary.stdDev) : 1;

    return dataset.data.map((row, idx) => {
      const val = Number(row[activeColumnForScatter]);
      if (isNaN(val) || val === null || val === undefined) return null;
      const z = std > 0 ? (val - mean) / std : 0;
      const absZ = Math.abs(z);
      const isOutlier = absZ >= zThreshold;
      const severity = absZ >= 4.0 ? 'extreme' : absZ >= 3.0 ? 'moderate' : absZ >= 2.0 ? 'mild' : 'normal';

      return {
        rowIndex: idx,
        displayIndex: idx + 1,
        value: val,
        zScore: round(z, 2),
        absZScore: round(absZ, 2),
        isOutlier,
        severity,
        row,
      };
    }).filter(Boolean);
  }, [dataset.data, activeColumnForScatter, anomalyResults.columnSummaries, zThreshold, method]);

  // Bivariate Scatter Data
  const bivariatePlotData = useMemo(() => {
    if (!bivariateX || !bivariateY) return [];
    const sumX = anomalyResults.columnSummaries[bivariateX];
    const sumY = anomalyResults.columnSummaries[bivariateY];
    const meanX = sumX ? (method === 'robust' ? sumX.median : sumX.mean) : 0;
    const stdX = sumX ? (method === 'robust' ? (sumX.mad > 0 ? sumX.mad / 0.6745 : 1) : sumX.stdDev) : 1;
    const meanY = sumY ? (method === 'robust' ? sumY.median : sumY.mean) : 0;
    const stdY = sumY ? (method === 'robust' ? (sumY.mad > 0 ? sumY.mad / 0.6745 : 1) : sumY.stdDev) : 1;

    return dataset.data.map((row, idx) => {
      const xVal = Number(row[bivariateX]);
      const yVal = Number(row[bivariateY]);
      if (isNaN(xVal) || isNaN(yVal)) return null;

      const zX = stdX > 0 ? (xVal - meanX) / stdX : 0;
      const zY = stdY > 0 ? (yVal - meanY) / stdY : 0;
      const isOutlierX = Math.abs(zX) >= zThreshold;
      const isOutlierY = Math.abs(zY) >= zThreshold;
      const isOutlier = isOutlierX || isOutlierY;

      return {
        rowIndex: idx,
        displayIndex: idx + 1,
        x: xVal,
        y: yVal,
        zX: round(zX, 2),
        zY: round(zY, 2),
        isOutlier,
        isOutlierX,
        isOutlierY,
        severity: isOutlier ? (Math.max(Math.abs(zX), Math.abs(zY)) >= 4 ? 'extreme' : 'moderate') : 'normal',
        row,
      };
    }).filter(Boolean);
  }, [dataset.data, bivariateX, bivariateY, anomalyResults.columnSummaries, zThreshold, method]);

  // Bar chart of outlier frequency per column
  const columnOutlierStats = useMemo(() => {
    return (Object.values(anomalyResults.columnSummaries) as AnomalyColumnSummary[]).map(col => ({
      name: col.columnName,
      outlierCount: col.outlierCount,
      outlierPercentage: col.outlierPercentage,
      maxZScore: Math.max(Math.abs(col.maxZScore), Math.abs(col.minZScore)),
    })).sort((a, b) => b.outlierCount - a.outlierCount);
  }, [anomalyResults.columnSummaries]);

  // Highest observed Z-score across whole dataset
  const maxOverallZScore = useMemo(() => {
    if (anomalyResults.anomalies.length === 0) return 0;
    const top = anomalyResults.anomalies[0];
    return Math.abs(method === 'robust' ? top.robustZScore : top.zScore);
  }, [anomalyResults.anomalies, method]);

  // Most volatile / anomalous column
  const mostVolatileColumn = useMemo(() => {
    if (columnOutlierStats.length === 0) return 'None';
    return columnOutlierStats[0].name;
  }, [columnOutlierStats]);

  // REMEDIATION 1: Filter & Create Cleaned Dataset
  const handleCreateCleanedDataset = () => {
    if (!onCreateDataset) return;
    const outlierIndices = new Set(anomalyResults.anomalousRowIndices);
    const cleanedRows = dataset.data.filter((_, idx) => !outlierIndices.has(idx));

    const newDataset: Dataset = {
      ...dataset,
      id: 'ds_' + Math.random().toString(36).substring(2, 9),
      name: `${dataset.name} (Outliers Filtered | Z ≥ ${zThreshold})`,
      description: `Cleaned version with ${anomalyResults.anomalousRowCount} anomalous records removed using statistical Z-Score threshold |Z| ≥ ${zThreshold}.`,
      data: cleanedRows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        ...(dataset.history || []),
        {
          id: 'log_' + Date.now(),
          timestamp: new Date().toISOString(),
          operation: 'Statistical Outlier Removal',
          details: `Removed ${anomalyResults.anomalousRowCount} records exceeding |Z-Score| ≥ ${zThreshold} (${method} method).`,
          affectedRowCount: anomalyResults.anomalousRowCount,
        },
      ],
    };

    onCreateDataset(newDataset);
    setActionSuccessMsg(`Created new dataset "${newDataset.name}" with ${anomalyResults.anomalousRowCount} outliers removed.`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  // REMEDIATION 2: Winsorize / Cap Outliers
  const handleWinsorizeOutliers = () => {
    if (!onUpdateDataset) return;
    const updatedData = dataset.data.map(row => {
      const newRow = { ...row };
      for (const colName of selectedColumnNames) {
        const summary = anomalyResults.columnSummaries[colName];
        if (!summary) continue;
        const val = Number(newRow[colName]);
        if (isNaN(val) || val === null) continue;

        const mean = method === 'robust' ? summary.median : summary.mean;
        const std = method === 'robust' ? (summary.mad > 0 ? summary.mad / 0.6745 : 1) : summary.stdDev;
        const z = std > 0 ? (val - mean) / std : 0;

        if (Math.abs(z) > zThreshold) {
          const sign = z >= 0 ? 1 : -1;
          const cappedVal = mean + sign * zThreshold * std;
          newRow[colName] = round(cappedVal, 4);
        }
      }
      return newRow;
    });

    const updatedDataset: Dataset = {
      ...dataset,
      data: updatedData,
      updatedAt: new Date().toISOString(),
      history: [
        ...(dataset.history || []),
        {
          id: 'log_' + Date.now(),
          timestamp: new Date().toISOString(),
          operation: 'Z-Score Outlier Winsorization',
          details: `Winsorized/capped values exceeding |Z| > ${zThreshold} across ${selectedColumnNames.length} numeric columns.`,
          affectedRowCount: anomalyResults.anomalousRowCount,
        },
      ],
    };

    onUpdateDataset(updatedDataset);
    setActionSuccessMsg(`Successfully winsorized outlier values capped at ±${zThreshold}σ.`);
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  // REMEDIATION 3: Append Anomaly Metadata Columns (is_anomaly & max_zscore)
  const handleAppendAnomalyColumns = () => {
    if (!onUpdateDataset) return;
    const outlierIndices = new Set(anomalyResults.anomalousRowIndices);
    
    // Compute max Z-score for each row
    const updatedData = dataset.data.map((row, idx) => {
      let maxRowZ = 0;
      for (const colName of selectedColumnNames) {
        const summary = anomalyResults.columnSummaries[colName];
        if (!summary) continue;
        const val = Number(row[colName]);
        if (isNaN(val) || val === null) continue;
        const mean = method === 'robust' ? summary.median : summary.mean;
        const std = method === 'robust' ? (summary.mad > 0 ? summary.mad / 0.6745 : 1) : summary.stdDev;
        const z = std > 0 ? Math.abs((val - mean) / std) : 0;
        if (z > maxRowZ) maxRowZ = z;
      }

      return {
        ...row,
        is_anomaly: outlierIndices.has(idx),
        anomaly_zscore: round(maxRowZ, 2),
      };
    });

    const updatedColumns: ColumnMeta[] = [...dataset.columns];
    if (!updatedColumns.find(c => c.name === 'is_anomaly')) {
      updatedColumns.push({
        id: 'col_' + Date.now() + '_1',
        name: 'is_anomaly',
        type: 'boolean',
        nullable: false,
        description: `Automated flag indicating if row exceeds |Z| ≥ ${zThreshold}`,
      });
    }
    if (!updatedColumns.find(c => c.name === 'anomaly_zscore')) {
      updatedColumns.push({
        id: 'col_' + Date.now() + '_2',
        name: 'anomaly_zscore',
        type: 'number',
        nullable: false,
        description: 'Maximum absolute statistical Z-score observed across features',
      });
    }

    const updatedDataset: Dataset = {
      ...dataset,
      columns: updatedColumns,
      data: updatedData,
      updatedAt: new Date().toISOString(),
      history: [
        ...(dataset.history || []),
        {
          id: 'log_' + Date.now(),
          timestamp: new Date().toISOString(),
          operation: 'Appended Anomaly Audit Tags',
          details: `Appended is_anomaly & anomaly_zscore columns based on threshold |Z| ≥ ${zThreshold}.`,
        },
      ],
    };

    onUpdateDataset(updatedDataset);
    setActionSuccessMsg('Appended `is_anomaly` and `anomaly_zscore` columns to the dataset.');
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  // REMEDIATION 4: Export Anomalies CSV
  const handleExportAnomaliesCSV = () => {
    if (anomalyResults.anomalies.length === 0) return;
    
    const headers = ['Row_Index', 'Column_Name', 'Observed_Value', 'Mean_or_Median', 'StdDev_or_MAD', 'Z_Score', 'Severity', 'Direction', 'Explanation'];
    const rows = anomalyResults.anomalies.map(a => [
      a.rowIndex + 1,
      `"${a.columnName}"`,
      a.value,
      a.mean,
      a.stdDev,
      a.zScore,
      a.severity,
      a.direction,
      `"${a.explanation || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${dataset.name.replace(/\s+/g, '_')}_anomalies_zscore_${zThreshold}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (numericColumns.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-white">No Numeric Features Detected</h3>
          <p className="text-xs text-slate-400">
            Statistical Z-Score anomaly detection requires quantitative/numeric columns. Please transform or cast column data types in the Data Cleaner or import a dataset containing numeric metrics.
          </p>
        </div>
      </div>
    );
  }

  const activeSummary = anomalyResults.columnSummaries[activeColumnForScatter];
  const activeMean = activeSummary ? (method === 'robust' ? activeSummary.median : activeSummary.mean) : 0;
  const activeStd = activeSummary ? (method === 'robust' ? (activeSummary.mad > 0 ? activeSummary.mad / 0.6745 : 1) : activeSummary.stdDev) : 1;

  return (
    <div className="space-y-6">
      
      {/* SUCCESS ACTION BANNER */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs text-emerald-400 hover:text-emerald-200 underline font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP CONFIGURATION & STATISTICAL CONTROL PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        {/* Module Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Statistical Z-Score Anomaly Detector</h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Automated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Detects, highlights, and mitigates statistical outliers in <span className="text-slate-200 font-semibold">{dataset.name}</span> using standard standard-deviation and robust MAD Z-scores.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCreateCleanedDataset}
              disabled={anomalyResults.anomalousRowCount === 0}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-teal-600/20"
              title="Clone dataset with anomalous records removed"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Filter Clean Dataset</span>
            </button>

            <button
              onClick={handleWinsorizeOutliers}
              disabled={anomalyResults.anomalousRowCount === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
              title="Cap extreme values at the chosen Z-score threshold"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Winsorize (Cap ±{zThreshold}σ)</span>
            </button>

            <button
              onClick={handleAppendAnomalyColumns}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
              title="Append `is_anomaly` & `anomaly_zscore` columns"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tag Anomaly Flags</span>
            </button>

            <button
              onClick={handleExportAnomaliesCSV}
              disabled={anomalyResults.anomalies.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
              title="Export anomalies to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Statistical Parameters Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Method Selection */}
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Detection Algorithm
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Formula</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('standard')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  method === 'standard'
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Standard Gaussian</span>
                  {method === 'standard' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">Z = (x - μ) / σ</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('robust')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  method === 'robust'
                    ? 'bg-rose-950/60 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Robust MAD Z-Score</span>
                  {method === 'robust' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1">0.6745·(x - Med) / MAD</span>
              </button>
            </div>
          </div>

          {/* Threshold Slider & Presets */}
          <div className="md:col-span-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Anomaly Sensitivity Threshold (|Z| ≥ {zThreshold}σ)</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                ±{zThreshold.toFixed(1)} σ
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              <input
                type="range"
                min="1.5"
                max="5.0"
                step="0.1"
                value={zThreshold}
                onChange={e => setZThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />

              {/* Threshold Preset Chips */}
              <div className="flex items-center justify-between gap-1 text-[10px]">
                {[
                  { val: 2.0, label: '2.0σ (95.4%)', desc: 'Mild' },
                  { val: 2.5, label: '2.5σ (98.8%)', desc: 'Moderate' },
                  { val: 3.0, label: '3.0σ (99.7%)', desc: 'Standard' },
                  { val: 3.5, label: '3.5σ (99.95%)', desc: 'Strict' },
                  { val: 4.0, label: '4.0σ (99.99%)', desc: 'Extreme' },
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setZThreshold(p.val)}
                    className={`px-2 py-1 rounded-lg border transition-all ${
                      zThreshold === p.val
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {p.val}σ
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feature Scope Multi-Select */}
          <div className="md:col-span-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audited Features ({selectedColumnNames.length}/{numericColumns.length})</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (selectedColumnNames.length === numericColumns.length) {
                    setSelectedColumnNames([numericColumns[0]?.name].filter(Boolean));
                  } else {
                    setSelectedColumnNames(numericColumns.map(c => c.name));
                  }
                }}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {selectedColumnNames.length === numericColumns.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 rounded-xl bg-slate-950 border border-slate-800">
              {numericColumns.map(col => {
                const isSelected = selectedColumnNames.includes(col.name);
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (selectedColumnNames.length > 1) {
                          setSelectedColumnNames(selectedColumnNames.filter(n => n !== col.name));
                        }
                      } else {
                        setSelectedColumnNames([...selectedColumnNames, col.name]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                      isSelected
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-400'
                    }`}
                  >
                    <span>{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* EXECUTIVE ANOMALY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Anomalous Rows */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Anomalous Records</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">
                {anomalyResults.anomalousRowCount.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">
                / {dataset.data.length.toLocaleString()} rows
              </span>
            </div>
            <p className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
              <span>{round((anomalyResults.anomalousRowCount / (dataset.data.length || 1)) * 100, 1)}% anomaly rate</span>
              <span>(Z ≥ {zThreshold}σ)</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Outlier Cell Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Outlier Deviations</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">
                {anomalyResults.anomalies.length.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">incidents</span>
            </div>
            <p className="text-[11px] text-amber-400 font-semibold">
              Across {selectedColumnNames.length} monitored features
            </p>
          </div>
        </div>

        {/* Card 3: Max Peak Z-Score Observed */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Peak Z-Score Magnitude</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-purple-400">
                {maxOverallZScore > 0 ? `+${maxOverallZScore.toFixed(2)}σ` : '0.00σ'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {anomalyResults.anomalies[0] 
                ? `On ${anomalyResults.anomalies[0].columnName} (Val: ${anomalyResults.anomalies[0].value.toLocaleString()})`
                : 'No extreme deviations'}
            </p>
          </div>
        </div>

        {/* Card 4: Most Volatile Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Most Volatile Feature</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white truncate max-w-[180px]">
                {mostVolatileColumn}
              </span>
            </div>
            <p className="text-[11px] text-cyan-400 font-semibold">
              {columnOutlierStats[0] ? `${columnOutlierStats[0].outlierCount} outliers (${columnOutlierStats[0].outlierPercentage}%)` : 'None'}
            </p>
          </div>
        </div>

      </div>

      {/* VISUAL INSPECTION STUDIO */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Visual Outlier Inspection &amp; Distribution Curve
            </h3>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setActiveVisualTab('distribution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVisualTab === 'distribution'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1D Distribution (Z-Band)
            </button>

            <button
              onClick={() => setActiveVisualTab('bivariate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVisualTab === 'bivariate'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2D Bivariate Scatter
            </button>

            <button
              onClick={() => setActiveVisualTab('features')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeVisualTab === 'features'
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Feature Anomaly Matrix
            </button>
          </div>
        </div>

        {/* TAB 1: 1D Single Feature Z-Band Scatter */}
        {activeVisualTab === 'distribution' && (
          <div className="space-y-4">
            
            {/* Feature selector for 1D chart */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Active Feature:</span>
                <select
                  value={activeColumnForScatter}
                  onChange={e => setActiveColumnForScatter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {numericColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {activeSummary && (
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>{method === 'robust' ? 'Median' : 'Mean'}: <strong className="text-white">{round(activeMean, 2)}</strong></span>
                  <span>•</span>
                  <span>{method === 'robust' ? 'MAD' : 'StdDev'}: <strong className="text-white">{round(activeStd, 2)}</strong></span>
                  <span>•</span>
                  <span>Outliers: <strong className="text-rose-400">{activeSummary.outlierCount}</strong> ({activeSummary.outlierPercentage}%)</span>
                </div>
              )}
            </div>

            {/* Scatter & Z-Band Chart */}
            <div className="h-80 w-full rounded-2xl bg-slate-950 p-4 border border-slate-800 relative">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis 
                    type="number" 
                    dataKey="displayIndex" 
                    name="Row Index" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={val => `#${val}`}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="zScore" 
                    name="Z-Score" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={val => `${val}σ`}
                    domain={[-Math.max(5, Math.ceil(zThreshold + 1)), Math.max(5, Math.ceil(zThreshold + 1))]}
                  />
                  
                  {/* Reference Areas & Lines for Z-Score Bands */}
                  <ReferenceLine y={0} stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: 'Mean (0σ)', fill: '#38bdf8', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={zThreshold} stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" label={{ value: `+${zThreshold}σ Threshold`, fill: '#f43f5e', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={-zThreshold} stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" label={{ value: `-${zThreshold}σ Threshold`, fill: '#f43f5e', fontSize: 10, position: 'right' }} />

                  {/* Mild warning zones */}
                  {zThreshold > 2.0 && (
                    <>
                      <ReferenceLine y={2.0} stroke="#f59e0b" strokeWidth={1} strokeDasharray="2 2" />
                      <ReferenceLine y={-2.0} stroke="#f59e0b" strokeWidth={1} strokeDasharray="2 2" />
                    </>
                  )}

                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs space-y-1.5 max-w-xs">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-bold text-white">Record #{d.displayIndex}</span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              d.isOutlier ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {d.isOutlier ? 'ANOMALY' : 'NORMAL'}
                            </span>
                          </div>
                          <div className="space-y-0.5 font-mono text-[11px]">
                            <p className="text-slate-300">Value: <strong className="text-white">{d.value.toLocaleString()}</strong></p>
                            <p className="text-slate-300">Z-Score: <strong className={d.zScore >= 0 ? 'text-rose-400' : 'text-cyan-400'}>{d.zScore > 0 ? `+${d.zScore}` : d.zScore}σ</strong></p>
                            <p className="text-slate-400">Deviation: {round(d.value - activeMean, 2)} from {method === 'robust' ? 'median' : 'mean'}</p>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Scatter name="Data Points" data={scatterPlotData}>
                    {scatterPlotData.map((entry: any, index: number) => {
                      let fill = '#10b981'; // Green for normal
                      if (entry.severity === 'extreme') fill = '#f43f5e'; // Crimson for severe
                      else if (entry.severity === 'moderate') fill = '#e11d48'; // Red for standard outlier
                      else if (entry.severity === 'mild') fill = '#f59e0b'; // Amber for mild warning
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={fill} 
                          opacity={entry.isOutlier ? 1.0 : 0.45}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Visual Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 pt-1 font-sans">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Normal (&lt; 2σ)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span>Mild Warning (2σ - {zThreshold}σ)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span>Anomaly Outlier (≥ {zThreshold}σ)</span>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: 2D Bivariate Scatter */}
        {activeVisualTab === 'bivariate' && (
          <div className="space-y-4">
            
            {/* Feature X and Y pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 shrink-0">X-Axis Feature:</span>
                <select
                  value={bivariateX}
                  onChange={e => setBivariateX(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {numericColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 shrink-0">Y-Axis Feature:</span>
                <select
                  value={bivariateY}
                  onChange={e => setBivariateY(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {numericColumns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bivariate Scatter Chart */}
            <div className="h-80 w-full rounded-2xl bg-slate-950 p-4 border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name={bivariateX} 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={val => typeof val === 'number' ? val.toLocaleString() : val}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name={bivariateY} 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={val => typeof val === 'number' ? val.toLocaleString() : val}
                  />
                  
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs space-y-1.5 max-w-xs">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-bold text-white">Record #{d.displayIndex}</span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              d.isOutlier ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {d.isOutlier ? 'ANOMALY' : 'NORMAL'}
                            </span>
                          </div>
                          <div className="space-y-0.5 font-mono text-[11px]">
                            <p className="text-slate-300">{bivariateX}: <strong className="text-white">{d.x.toLocaleString()}</strong> ({d.zX > 0 ? `+${d.zX}` : d.zX}σ)</p>
                            <p className="text-slate-300">{bivariateY}: <strong className="text-white">{d.y.toLocaleString()}</strong> ({d.zY > 0 ? `+${d.zY}` : d.zY}σ)</p>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Scatter name="Points" data={bivariatePlotData}>
                    {bivariatePlotData.map((entry: any, index: number) => (
                      <Cell 
                        key={`biv-${index}`} 
                        fill={entry.isOutlier ? '#f43f5e' : '#38bdf8'} 
                        opacity={entry.isOutlier ? 1.0 : 0.5}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

        {/* TAB 3: Feature Anomaly Breakdown Matrix */}
        {activeVisualTab === 'features' && (
          <div className="space-y-4">
            <div className="h-72 w-full rounded-2xl bg-slate-950 p-4 border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={columnOutlierStats} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={val => `${val}`} />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-xl text-xs space-y-1 font-mono">
                          <p className="font-bold text-white">{d.name}</p>
                          <p className="text-rose-400">Outliers: {d.outlierCount} rows ({d.outlierPercentage}%)</p>
                          <p className="text-purple-400">Peak |Z|: {d.maxZScore.toFixed(2)}σ</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="outlierCount" fill="#f43f5e" radius={[6, 6, 0, 0]} name="Outlier Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* DETAILED ANOMALIES INSPECTION TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        
        {/* Table Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Table className="w-4 h-4 text-cyan-400" />
              Detected Outlier Register ({filteredAnomalies.length} / {anomalyResults.anomalies.length} Flagged)
            </h3>
            <p className="text-xs text-slate-400">
              Each row highlights a specific attribute exceeding the statistical rejection boundary.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search values, rows..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 w-40 sm:w-48"
              />
            </div>

            {/* Column Filter */}
            <select
              value={columnFilter}
              onChange={e => setColumnFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Features</option>
              {selectedColumnNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Severities</option>
              <option value="extreme">Extreme (≥ 4.0σ)</option>
              <option value="moderate">Moderate (3.0σ - 3.9σ)</option>
              <option value="mild">Mild (&lt; 3.0σ)</option>
            </select>

            {/* Direction Filter */}
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Both Tails</option>
              <option value="high">High Outliers (+Z)</option>
              <option value="low">Low Outliers (-Z)</option>
            </select>

          </div>
        </div>

        {/* Table Content */}
        {filteredAnomalies.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-2 bg-slate-950 rounded-2xl border border-slate-800/80">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
            <p className="text-white font-bold text-sm">No Statistical Anomalies Match Your Filter</p>
            <p className="text-slate-400">All evaluated data points sit comfortably within the ±{zThreshold}σ acceptance envelope.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Row #</th>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">Observed Value</th>
                  <th className="px-4 py-3">Expected (μ / Med)</th>
                  <th className="px-4 py-3">Deviation (Δ)</th>
                  <th className="px-4 py-3">Z-Score</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Diagnostic Explanation</th>
                  <th className="px-4 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredAnomalies.slice(0, 100).map((anomaly, idx) => {
                  const zVal = method === 'robust' ? anomaly.robustZScore : anomaly.zScore;
                  return (
                    <tr 
                      key={`${anomaly.rowIndex}-${anomaly.columnName}-${idx}`}
                      className="hover:bg-slate-900/60 transition-colors group cursor-pointer"
                      onClick={() => setSelectedRowDetails(anomaly)}
                    >
                      {/* Row Index */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-300">
                        #{anomaly.rowIndex + 1}
                      </td>

                      {/* Feature Name */}
                      <td className="px-4 py-3 font-bold text-white">
                        {anomaly.columnName}
                      </td>

                      {/* Observed Value */}
                      <td className="px-4 py-3 font-mono font-bold text-rose-400">
                        {anomaly.value.toLocaleString()}
                      </td>

                      {/* Mean / Median */}
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {anomaly.mean.toLocaleString()}
                      </td>

                      {/* Deviation */}
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {anomaly.deviation > 0 ? `+${round(anomaly.deviation, 2)}` : round(anomaly.deviation, 2)}
                      </td>

                      {/* Z-Score Badge */}
                      <td className="px-4 py-3 font-mono">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          Math.abs(zVal) >= 4.0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : Math.abs(zVal) >= 3.0
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {zVal > 0 ? `+${zVal.toFixed(2)}σ` : `${zVal.toFixed(2)}σ`}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3 uppercase font-mono text-[10px] font-bold">
                        <span className={
                          anomaly.severity === 'extreme' ? 'text-rose-400' :
                          anomaly.severity === 'moderate' ? 'text-red-400' : 'text-amber-400'
                        }>
                          {anomaly.severity}
                        </span>
                      </td>

                      {/* Plain-English Explanation */}
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {anomaly.explanation}
                      </td>

                      {/* Inspect Button */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRowDetails(anomaly);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Row</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredAnomalies.length > 100 && (
          <p className="text-center text-xs text-slate-500 font-mono">
            Showing top 100 anomalies sorted by highest statistical absolute Z-score.
          </p>
        )}

      </div>

      {/* ROW INSPECTION MODAL DRAWER */}
      {selectedRowDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    Record #{selectedRowDetails.rowIndex + 1} Outlier Audit
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Flagged feature: <strong className="text-white">{selectedRowDetails.columnName}</strong> ({selectedRowDetails.zScore > 0 ? `+${selectedRowDetails.zScore}` : selectedRowDetails.zScore}σ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRowDetails(null)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Modal Body: Complete Row Fields */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Statistical Diagnostic Box */}
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 text-xs space-y-2">
                <p className="font-bold text-rose-300 text-sm">Statistical Diagnosis</p>
                <p className="text-rose-200/90">{selectedRowDetails.explanation}</p>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-900/40 font-mono text-[11px]">
                  <div>
                    <span className="text-rose-400 block text-[10px]">Observed</span>
                    <strong className="text-white">{selectedRowDetails.value.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-rose-400 block text-[10px]">Baseline Mean</span>
                    <strong className="text-white">{selectedRowDetails.mean.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-rose-400 block text-[10px]">Z-Score</span>
                    <strong className="text-white">{selectedRowDetails.zScore > 0 ? `+${selectedRowDetails.zScore}` : selectedRowDetails.zScore}σ</strong>
                  </div>
                </div>
              </div>

              {/* Complete Record Attributes */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
                  Complete Record Attributes
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(selectedRowDetails.row).map(([key, val]) => {
                    const isFlagged = key === selectedRowDetails.columnName;
                    return (
                      <div 
                        key={key} 
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                          isFlagged
                            ? 'bg-rose-950/50 border-rose-500/50 ring-1 ring-rose-500/40'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{key}</span>
                        <span className={`font-bold mt-0.5 truncate ${isFlagged ? 'text-rose-300' : 'text-white'}`}>
                          {val !== null && val !== undefined ? String(val) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
              <button
                onClick={() => setSelectedRowDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
