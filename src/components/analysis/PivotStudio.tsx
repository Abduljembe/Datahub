import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  Download, 
  Layers, 
  Sliders, 
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { Dataset, AggregationType } from '../../types';
import { generatePivotTable } from '../../utils/dataEngine';
import { round } from '../../utils/statistics';

interface PivotStudioProps {
  dataset: Dataset;
}

export const PivotStudio: React.FC<PivotStudioProps> = ({ dataset }) => {
  const categoryColumns = useMemo(
    () => dataset.columns.filter(c => c.type === 'category' || c.type === 'string'),
    [dataset.columns]
  );
  const numberColumns = useMemo(
    () => dataset.columns.filter(c => c.type === 'number'),
    [dataset.columns]
  );

  const [rowField, setRowField] = useState(categoryColumns[0]?.name || dataset.columns[0]?.name || '');
  const [colField, setColField] = useState(categoryColumns[1]?.name || dataset.columns[1]?.name || '');
  const [valField, setValField] = useState(numberColumns[0]?.name || dataset.columns[0]?.name || '');
  const [aggType, setAggType] = useState<AggregationType>('sum');

  // Compute Pivot Table Matrix
  const pivotResult = useMemo(() => {
    if (!rowField || !colField || !valField) return null;
    return generatePivotTable(dataset.data, rowField, colField, valField, aggType);
  }, [dataset.data, rowField, colField, valField, aggType]);

  const handleExportPivotCSV = () => {
    if (!pivotResult) return;
    const headerRow = [rowField, ...pivotResult.colKeys, 'Grand Total'].join(',');
    const rows = pivotResult.rowKeys.map(rKey => {
      const vals = pivotResult.colKeys.map(cKey => pivotResult.matrix[rKey]?.[cKey] ?? 0);
      const rowTotal = pivotResult.rowTotals[rKey] ?? 0;
      return [rKey, ...vals, rowTotal].join(',');
    });
    const colTotalRow = ['Grand Total', ...pivotResult.colKeys.map(cKey => pivotResult.colTotals[cKey] ?? 0), pivotResult.grandTotal].join(',');
    
    const csvContent = [headerRow, ...rows, colTotalRow].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pivot_${dataset.name}_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Pivot Axis Config */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-400" />
              Multi-Dimensional Pivot Table Engine
            </h2>
            <p className="text-xs text-slate-400">Summarize and cross-tabulate complex datasets across categorical dimensions.</p>
          </div>

          <button
            onClick={handleExportPivotCSV}
            disabled={!pivotResult}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Pivot CSV</span>
          </button>
        </div>

        {/* Dimension Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Row Dimension (Vertical)</label>
            <select
              value={rowField}
              onChange={e => setRowField(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            >
              {dataset.columns.map(c => (
                <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Column Dimension (Horizontal)</label>
            <select
              value={colField}
              onChange={e => setColField(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            >
              {dataset.columns.map(c => (
                <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Value / Metric Field</label>
            <select
              value={valField}
              onChange={e => setValField(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            >
              {numberColumns.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Aggregation Function</label>
            <select
              value={aggType}
              onChange={e => setAggType(e.target.value as AggregationType)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
            >
              <option value="sum">SUM (Total)</option>
              <option value="mean">AVERAGE (Mean)</option>
              <option value="count">COUNT (Frequency)</option>
              <option value="min">MIN (Minimum)</option>
              <option value="max">MAX (Maximum)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pivot Table Canvas */}
      {pivotResult && pivotResult.rowKeys.length > 0 ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Cross-Tabulated Matrix: {aggType.toUpperCase()} of {valField}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {pivotResult.rowKeys.length} rows × {pivotResult.colKeys.length} columns
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-right text-xs border-collapse font-mono">
              <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-left font-bold text-white border-r border-slate-800 bg-slate-950/80">
                    {rowField} \ {colField}
                  </th>
                  {pivotResult.colKeys.map(cKey => (
                    <th key={cKey} className="p-3 font-semibold text-slate-300 border-r border-slate-800/80 min-w-[100px]">
                      {cKey}
                    </th>
                  ))}
                  <th className="p-3 font-bold text-indigo-400 bg-indigo-950/30">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pivotResult.rowKeys.map(rKey => {
                  const rowTotal = pivotResult.rowTotals[rKey] ?? 0;
                  return (
                    <tr key={rKey} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-left font-semibold text-white bg-slate-950/50 border-r border-slate-800">
                        {rKey}
                      </td>
                      {pivotResult.colKeys.map(cKey => {
                        const val = pivotResult.matrix[rKey]?.[cKey];
                        return (
                          <td key={cKey} className="p-3 border-r border-slate-800/40 text-slate-300">
                            {val !== undefined ? round(val, 2).toLocaleString() : '-'}
                          </td>
                        );
                      })}
                      <td className="p-3 font-bold text-indigo-300 bg-indigo-950/20">
                        {round(rowTotal, 2).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-950 border-t-2 border-slate-800 font-bold">
                <tr>
                  <td className="p-3 text-left text-indigo-400 border-r border-slate-800">
                    Grand Total
                  </td>
                  {pivotResult.colKeys.map(cKey => {
                    const colTot = pivotResult.colTotals[cKey] ?? 0;
                    return (
                      <td key={cKey} className="p-3 border-r border-slate-800 text-slate-200">
                        {round(colTot, 2).toLocaleString()}
                      </td>
                    );
                  })}
                  <td className="p-3 text-cyan-400 bg-indigo-950/40 font-black">
                    {round(pivotResult.grandTotal, 2).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
          <p className="text-sm font-semibold text-slate-300">Unable to generate pivot table</p>
          <p className="text-xs">Ensure your dataset has sufficient rows and categorical keys.</p>
        </div>
      )}

    </div>
  );
};
