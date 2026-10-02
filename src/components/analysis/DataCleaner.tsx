import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Trash2, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Scissors, 
  Calculator, 
  Sliders, 
  Database,
  ArrowRight,
  RotateCcw,
  Camera,
  History,
  Type,
  Binary,
  Split,
  Layers,
  ArrowDownUp
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import { imputeMissing, filterRows, sortDataset, generateColumnsFromData } from '../../utils/dataEngine';
import { computeColumnStats, round } from '../../utils/statistics';
import { createDatasetSnapshot, getDatasetVersions } from '../../utils/versionEngine';

interface DataCleanerProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
  onOpenVersionsModal?: () => void;
}

export const DataCleaner: React.FC<DataCleanerProps> = ({ dataset, onUpdateDataset, onOpenVersionsModal }) => {
  const [currentData, setCurrentData] = useState<Record<string, any>[]>(dataset.data);
  const [currentColumns, setCurrentColumns] = useState<ColumnMeta[]>(dataset.columns);
  const [appliedRecipes, setAppliedRecipes] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Manual snapshot capture before cleaning
  const handleCapturePreCleanSnapshot = () => {
    const { updatedDataset, newVersion } = createDatasetSnapshot(dataset, {
      name: `Pre-Cleaning State (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      description: `Manual checkpoint captured prior to applying cleaning pipeline.`,
      tag: 'manual_snapshot',
      createdBy: 'Cleaner Studio',
    });
    onUpdateDataset(updatedDataset);
    showToast(`📸 Snapshot "${newVersion.name}" captured! You can safely restore at any time.`);
  };

  // Save Pipeline back to dataset with automated version checkpoint
  const handleCommitPipeline = () => {
    const recipeText = appliedRecipes.length > 0 ? `Applied recipes: ${appliedRecipes.join('; ')}` : 'Cleaned dataset state.';
    
    // Save to dataset and capture a new snapshot version
    const tempUpdated: Dataset = {
      ...dataset,
      data: currentData,
      columns: currentColumns,
      updatedAt: new Date().toISOString(),
    };

    const { updatedDataset, newVersion } = createDatasetSnapshot(tempUpdated, {
      name: `Cleaned (${appliedRecipes.length} recipes applied)`,
      description: recipeText,
      tag: 'cleaned',
      createdBy: 'Data Cleaner',
    });

    onUpdateDataset(updatedDataset);
    showToast(`Committed pipeline & saved version snapshot "${newVersion.name}"!`);
  };

  // Operation state
  const [imputeCol, setImputeCol] = useState(dataset.columns[0]?.name || '');
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'zero' | 'custom'>('mean');
  const [customImputeVal, setCustomImputeVal] = useState('');

  // Filter state
  const [filterCol, setFilterCol] = useState(dataset.columns[0]?.name || '');
  const [filterOp, setFilterOp] = useState<'equals' | 'greater_than' | 'less_than' | 'contains' | 'is_not_null'>('is_not_null');
  const [filterVal, setFilterVal] = useState('');

  // Math column formula
  const [newFormulaCol, setNewFormulaCol] = useState('');
  const [formulaLeftCol, setFormulaLeftCol] = useState(dataset.columns.find(c => c.type === 'number')?.name || '');
  const [formulaOp, setFormulaOp] = useState<'+' | '-' | '*' | '/' | 'log'>('*');
  const [formulaRightVal, setFormulaRightVal] = useState('1.1');

  // Text Transform State
  const [textCol, setTextCol] = useState(dataset.columns.find(c => c.type === 'string' || c.type === 'category')?.name || dataset.columns[0]?.name || '');
  const [textAction, setTextAction] = useState<'trim' | 'lowercase' | 'uppercase' | 'capitalize' | 'strip_numbers' | 'strip_symbols'>('trim');

  // One-Hot Encoding State
  const [encodeCol, setEncodeCol] = useState(dataset.columns.find(c => c.type === 'string' || c.type === 'category')?.name || dataset.columns[0]?.name || '');
  const [encodeMaxCategories, setEncodeMaxCategories] = useState(6);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 1. Impute missing values
  const handleApplyImpute = () => {
    const updated = imputeMissing(
      currentData,
      imputeCol,
      imputeStrategy,
      imputeStrategy === 'custom' ? customImputeVal : undefined
    );
    setCurrentData(updated);
    setAppliedRecipes(prev => [...prev, `Imputed column '${imputeCol}' using ${imputeStrategy}`]);
    showToast(`Imputed missing values for '${imputeCol}'`);
  };

  // 2. Drop all rows with nulls
  const handleDropAllNulls = () => {
    const initialCount = currentData.length;
    const cleaned = currentData.filter(row => {
      return Object.values(row).every(v => v !== null && v !== undefined && v !== '');
    });
    const dropped = initialCount - cleaned.length;
    setCurrentData(cleaned);
    setAppliedRecipes(prev => [...prev, `Dropped ${dropped} rows with null values`]);
    showToast(`Removed ${dropped} incomplete rows.`);
  };

  // 3. Remove duplicate rows
  const handleRemoveDuplicates = () => {
    const initialCount = currentData.length;
    const seen = new Set<string>();
    const cleaned: Record<string, any>[] = [];

    currentData.forEach(row => {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(row);
      }
    });

    const dropped = initialCount - cleaned.length;
    setCurrentData(cleaned);
    setAppliedRecipes(prev => [...prev, `Deduplicated ${dropped} duplicate rows`]);
    showToast(`Removed ${dropped} duplicate rows.`);
  };

  // 4. Apply Row Filter
  const handleApplyFilter = () => {
    const cleaned = filterRows(currentData, [{
      column: filterCol,
      operator: filterOp,
      value: filterVal,
    }]);
    const dropped = currentData.length - cleaned.length;
    setCurrentData(cleaned);
    setAppliedRecipes(prev => [...prev, `Filtered rows where ${filterCol} ${filterOp} ${filterVal}`]);
    showToast(`Applied filter. Kept ${cleaned.length} rows (removed ${dropped}).`);
  };

  // 5. Feature Engineering: Formula Math column
  const handleCreateFormulaColumn = () => {
    if (!newFormulaCol.trim() || !formulaLeftCol) return;
    const colName = newFormulaCol.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const factor = Number(formulaRightVal) || 1;

    const updated = currentData.map(row => {
      const base = Number(row[formulaLeftCol]) || 0;
      let calculated = 0;
      if (formulaOp === '+') calculated = base + factor;
      else if (formulaOp === '-') calculated = base - factor;
      else if (formulaOp === '*') calculated = base * factor;
      else if (formulaOp === '/') calculated = factor !== 0 ? base / factor : 0;
      else if (formulaOp === 'log') calculated = base > 0 ? Math.log(base) : 0;

      return {
        ...row,
        [colName]: round(calculated, 3),
      };
    });

    const newCols: ColumnMeta[] = [
      ...currentColumns,
      { id: colName, name: colName, type: 'number', nullable: true },
    ];

    setCurrentData(updated);
    setCurrentColumns(newCols);
    setAppliedRecipes(prev => [...prev, `Generated formula column '${colName}' = ${formulaLeftCol} ${formulaOp} ${formulaRightVal}`]);
    setNewFormulaCol('');
    showToast(`Created new calculated feature: ${colName}`);
  };

  // 6. Winsorize Outliers (Cap at 3 standard deviations)
  const handleWinsorizeOutliers = (numColName: string) => {
    const colMeta = currentColumns.find(c => c.name === numColName);
    if (!colMeta || colMeta.type !== 'number') return;
    const stats = computeColumnStats(currentData, colMeta);
    if (!stats.mean || !stats.stdDev) return;

    const lowerBound = stats.mean - 3 * stats.stdDev;
    const upperBound = stats.mean + 3 * stats.stdDev;
    let cappedCount = 0;

    const updated = currentData.map(row => {
      let val = Number(row[numColName]);
      if (!isNaN(val)) {
        if (val > upperBound) {
          val = round(upperBound, 2);
          cappedCount++;
        } else if (val < lowerBound) {
          val = round(lowerBound, 2);
          cappedCount++;
        }
      }
      return { ...row, [numColName]: val };
    });

    setCurrentData(updated);
    setAppliedRecipes(prev => [...prev, `Winsorized ${cappedCount} outliers in '${numColName}' (3σ bound)`]);
    showToast(`Winsorized ${cappedCount} outliers in ${numColName}`);
  };

  // 7. Text Standardization & Sanitization
  const handleApplyTextTransform = () => {
    if (!textCol) return;
    let modifiedCount = 0;
    const updated = currentData.map(row => {
      const val = row[textCol];
      if (typeof val === 'string') {
        let transformed = val;
        if (textAction === 'trim') transformed = val.trim().replace(/\s+/g, ' ');
        else if (textAction === 'lowercase') transformed = val.toLowerCase().trim();
        else if (textAction === 'uppercase') transformed = val.toUpperCase().trim();
        else if (textAction === 'capitalize') transformed = val.toLowerCase().replace(/\b\w/g, char => char.toUpperCase()).trim();
        else if (textAction === 'strip_numbers') transformed = val.replace(/[0-9]/g, '').trim();
        else if (textAction === 'strip_symbols') transformed = val.replace(/[^a-zA-Z0-9\s]/g, '').trim();

        if (transformed !== val) modifiedCount++;
        return { ...row, [textCol]: transformed };
      }
      return row;
    });

    setCurrentData(updated);
    setAppliedRecipes(prev => [...prev, `Standardized '${textCol}' text: applied ${textAction} (${modifiedCount} cells modified)`]);
    showToast(`Applied ${textAction} to '${textCol}' (${modifiedCount} cells modified)`);
  };

  // 8. One-Hot Encoding (Categorical to Dummy Variables)
  const handleApplyOneHotEncoding = () => {
    if (!encodeCol) return;
    const colMeta = currentColumns.find(c => c.name === encodeCol);
    if (!colMeta) return;

    // Get frequencies
    const freq: Record<string, number> = {};
    currentData.forEach(row => {
      const v = String(row[encodeCol] ?? 'Missing');
      freq[v] = (freq[v] || 0) + 1;
    });

    const topCategories = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, encodeMaxCategories)
      .map(([cat]) => cat);

    if (topCategories.length === 0) return;

    const newDummyCols: ColumnMeta[] = topCategories.map(cat => {
      const sanitizedCat = cat.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const dummyColName = `${encodeCol}_${sanitizedCat}`;
      return {
        id: dummyColName,
        name: dummyColName,
        type: 'number',
        nullable: false,
      };
    });

    const updated = currentData.map(row => {
      const rowVal = String(row[encodeCol] ?? 'Missing');
      const dummyFields: Record<string, number> = {};
      topCategories.forEach(cat => {
        const sanitizedCat = cat.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const dummyColName = `${encodeCol}_${sanitizedCat}`;
        dummyFields[dummyColName] = rowVal === cat ? 1 : 0;
      });
      return {
        ...row,
        ...dummyFields,
      };
    });

    setCurrentData(updated);
    setCurrentColumns([...currentColumns, ...newDummyCols]);
    setAppliedRecipes(prev => [...prev, `One-hot encoded '${encodeCol}' into ${topCategories.length} dummy columns`]);
    showToast(`Created ${topCategories.length} one-hot dummy features for '${encodeCol}'`);
  };

  // Reset to original
  const handleReset = () => {
    setCurrentData(dataset.data);
    setCurrentColumns(dataset.columns);
    setAppliedRecipes([]);
    showToast('Reset data to current dataset state.');
  };

  const numberColumns = currentColumns.filter(c => c.type === 'number');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            Data Preprocessing & Cleaning Studio
          </h2>
          <p className="text-xs text-slate-400">Apply cleaning recipes (imputation, deduplication, outlier clipping, feature math) and preview transformations live.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCapturePreCleanSnapshot}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Save a snapshot of the current state right now before applying recipes"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Capture Checkpoint</span>
          </button>

          {onOpenVersionsModal && (
            <button
              onClick={onOpenVersionsModal}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Open Dataset Versions to view, compare, or restore prior snapshots"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Version History</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleCommitPipeline}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Commit Cleaned Pipeline ({currentData.length} rows)</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 4 Specialized Cleaning Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* RECIPE 1: Missing Value Imputer */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              1. Missing Value Imputation
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Fill NaN / null</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Column</label>
              <select
                value={imputeCol}
                onChange={e => setImputeCol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {currentColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Imputation Strategy</label>
              <select
                value={imputeStrategy}
                onChange={e => setImputeStrategy(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                <option value="mean">Mean (Arithmetic Average for numeric)</option>
                <option value="median">Median (50th Percentile - robust to outliers)</option>
                <option value="mode">Mode (Most frequent value / categorical)</option>
                <option value="zero">Fill with Zero (0)</option>
                <option value="custom">Custom Literal Value</option>
              </select>
            </div>

            {imputeStrategy === 'custom' && (
              <div>
                <label className="text-slate-400 block mb-1">Custom Fill Value</label>
                <input
                  type="text"
                  value={customImputeVal}
                  onChange={e => setCustomImputeVal(e.target.value)}
                  placeholder="e.g. Unknown or 0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApplyImpute}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
              >
                Apply Imputation
              </button>
              <button
                onClick={handleDropAllNulls}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-300 text-slate-300 font-semibold transition-colors text-[11px]"
                title="Drop all rows with any null value"
              >
                Drop All Null Rows
              </button>
            </div>
          </div>
        </div>

        {/* RECIPE 2: Quick Deduplication & Outlier Winsorization */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              2. Deduplication & Outlier Clipping
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Clean anomalies</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Remove Exact Duplicate Rows</p>
                <p className="text-[11px] text-slate-400">Scans all rows and drops exact replica records.</p>
              </div>
              <button
                onClick={handleRemoveDuplicates}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shrink-0"
              >
                Deduplicate
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div>
                <p className="font-semibold text-white">Outlier Winsorization (3-Sigma Cap)</p>
                <p className="text-[11px] text-slate-400">Clamps extreme anomalies to μ ± 3σ boundary.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  id="winsorize-select"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs"
                >
                  {numberColumns.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const sel = (document.getElementById('winsorize-select') as HTMLSelectElement)?.value;
                    if (sel) handleWinsorizeOutliers(sel);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                >
                  Cap Outliers
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RECIPE 3: Row Filtering & Slicing */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              3. Conditional Row Filter
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Subset data</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Column</label>
                <select
                  value={filterCol}
                  onChange={e => setFilterCol(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                >
                  {currentColumns.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Condition</label>
                <select
                  value={filterOp}
                  onChange={e => setFilterOp(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                >
                  <option value="is_not_null">Is Not Null</option>
                  <option value="greater_than">&gt; Greater Than</option>
                  <option value="less_than">&lt; Less Than</option>
                  <option value="equals">= Equals</option>
                  <option value="contains">Contains String</option>
                </select>
              </div>
            </div>

            {filterOp !== 'is_not_null' && (
              <div>
                <label className="text-slate-400 block mb-1">Comparison Value</label>
                <input
                  type="text"
                  value={filterVal}
                  onChange={e => setFilterVal(e.target.value)}
                  placeholder="e.g. 50 or Active"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            )}

            <button
              onClick={handleApplyFilter}
              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
            >
              Apply Filter & Slice Rows
            </button>
          </div>
        </div>

        {/* RECIPE 4: Feature Engineering & Math Formula */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              4. Feature Math & Engineering
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Create column</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">New Column Name</label>
              <input
                type="text"
                value={newFormulaCol}
                onChange={e => setNewFormulaCol(e.target.value)}
                placeholder="e.g. revenue_adjusted or log_price"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Source Column</label>
                <select
                  value={formulaLeftCol}
                  onChange={e => setFormulaLeftCol(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                >
                  {numberColumns.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Operator</label>
                <select
                  value={formulaOp}
                  onChange={e => setFormulaOp(e.target.value as any)}
                  className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                >
                  <option value="*">* Multiply</option>
                  <option value="/">/ Divide</option>
                  <option value="+">+ Add</option>
                  <option value="-">- Subtract</option>
                  <option value="log">Natural Log ln(x)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Factor / Const</label>
                <input
                  type="number"
                  step="any"
                  value={formulaRightVal}
                  onChange={e => setFormulaRightVal(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                />
              </div>
            </div>

            <button
              onClick={handleCreateFormulaColumn}
              disabled={!newFormulaCol.trim()}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              Generate Engineered Column
            </button>
          </div>
        </div>

        {/* RECIPE 5: Text Standardization & Sanitization */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-emerald-400" />
              5. Text Standardization & Sanitization
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Normalize text</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target String Column</label>
              <select
                value={textCol}
                onChange={e => setTextCol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {currentColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Transformation Rule</label>
              <select
                value={textAction}
                onChange={e => setTextAction(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                <option value="trim">Trim Whitespace & Double Spaces</option>
                <option value="lowercase">Convert to lowercase</option>
                <option value="uppercase">Convert to UPPERCASE</option>
                <option value="capitalize">Title / Capitalize Each Word</option>
                <option value="strip_numbers">Strip Numbers (Remove Digits)</option>
                <option value="strip_symbols">Strip Special Characters & Symbols</option>
              </select>
            </div>

            <button
              onClick={handleApplyTextTransform}
              disabled={!textCol}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              Apply Text Cleaning
            </button>
          </div>
        </div>

        {/* RECIPE 6: One-Hot Categorical Encoding */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Binary className="w-3.5 h-3.5 text-cyan-400" />
              6. One-Hot Dummy Feature Encoding
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">ML Ready</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Categorical Column to Encode</label>
              <select
                value={encodeCol}
                onChange={e => setEncodeCol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {currentColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Max Top Categories to Expand</label>
              <select
                value={encodeMaxCategories}
                onChange={e => setEncodeMaxCategories(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                <option value={3}>Top 3 Categories</option>
                <option value={5}>Top 5 Categories</option>
                <option value={8}>Top 8 Categories</option>
                <option value={12}>Top 12 Categories</option>
              </select>
            </div>

            <button
              onClick={handleApplyOneHotEncoding}
              disabled={!encodeCol}
              className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              Generate One-Hot Columns
            </button>
          </div>
        </div>

      </div>

      {/* Pipeline Audit Log & Live Transformed Preview */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Live Data Preview ({currentData.length} records, {currentColumns.length} features)</h3>
          </div>

          {appliedRecipes.length > 0 && (
            <span className="text-xs text-indigo-400 font-mono">
              {appliedRecipes.length} step(s) applied
            </span>
          )}
        </div>

        {appliedRecipes.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap gap-2 text-[11px]">
            {appliedRecipes.map((r, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-500/30 text-indigo-300 font-mono">
                {i + 1}. {r}
              </span>
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2.5 w-8 text-slate-600">#</th>
                {currentColumns.map(col => (
                  <th key={col.id} className="p-2.5 font-semibold text-slate-200">{col.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {currentData.slice(0, 8).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-2.5 text-slate-600 text-[10px]">{idx + 1}</td>
                  {currentColumns.map(col => (
                    <td key={col.id} className="p-2.5 text-slate-300 truncate max-w-xs text-[11px]">
                      {String(row[col.name] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
