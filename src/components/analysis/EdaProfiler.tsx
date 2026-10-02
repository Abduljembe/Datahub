import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Search, 
  TrendingUp, 
  Hash, 
  Type, 
  Calendar, 
  Sliders,
  Sparkles,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';
import { Dataset, ColumnMeta, ColumnStats } from '../../types';
import { computeColumnStats, round } from '../../utils/statistics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface EdaProfilerProps {
  dataset: Dataset;
}

export const EdaProfiler: React.FC<EdaProfilerProps> = ({ dataset }) => {
  const [selectedColumnName, setSelectedColumnName] = useState<string>(
    dataset.columns.find(c => c.type === 'number')?.name || dataset.columns[0]?.name || ''
  );
  const [filterType, setFilterType] = useState<'all' | 'number' | 'category' | 'string'>('all');

  // Compute stats for all columns
  const allStats: Record<string, ColumnStats> = React.useMemo(() => {
    const map: Record<string, ColumnStats> = {};
    dataset.columns.forEach(col => {
      map[col.name] = computeColumnStats(dataset.data, col);
    });
    return map;
  }, [dataset.data, dataset.columns]);

  // Overall Health Score Calculation
  const healthStats = React.useMemo(() => {
    let totalCells = dataset.data.length * dataset.columns.length;
    let totalNulls = 0;
    Object.values(allStats).forEach(s => {
      totalNulls += s.nullCount;
    });

    const completenessPct = totalCells > 0 ? ((totalCells - totalNulls) / totalCells) * 100 : 100;
    const numCols = dataset.columns.filter(c => c.type === 'number').length;
    const catCols = dataset.columns.filter(c => c.type === 'category' || c.type === 'string').length;
    
    return {
      completenessPct: round(completenessPct, 1),
      totalCells,
      totalNulls,
      numCols,
      catCols,
      healthGrade: completenessPct > 95 ? 'A+' : completenessPct > 85 ? 'B' : completenessPct > 70 ? 'C' : 'Needs Cleaning',
    };
  }, [allStats, dataset.data.length, dataset.columns.length]);

  const filteredColumns = dataset.columns.filter(col => {
    if (filterType === 'all') return true;
    if (filterType === 'number') return col.type === 'number';
    if (filterType === 'category') return col.type === 'category';
    if (filterType === 'string') return col.type === 'string';
    return true;
  });

  const selectedCol = dataset.columns.find(c => c.name === selectedColumnName) || dataset.columns[0];
  const selectedStats = selectedCol ? allStats[selectedCol.name] : null;

  return (
    <div className="space-y-6">
      
      {/* Top Executive Health & Quality Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Data Health Score */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Dataset Health Score</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
              Grade {healthStats.healthGrade}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{healthStats.completenessPct}%</p>
            <span className="text-xs text-emerald-400 font-medium">completeness</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
              style={{ width: `${healthStats.completenessPct}%` }}
            />
          </div>
        </div>

        {/* Card 2: Total Dimension */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400">Matrix Dimensions</span>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-white">{dataset.data.length.toLocaleString()}</p>
            <span className="text-xs text-slate-400">rows × {dataset.columns.length} columns</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            {healthStats.totalCells.toLocaleString()} total data points
          </p>
        </div>

        {/* Card 3: Feature Typing */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400">Feature Taxonomy</span>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-cyan-300">
              <Hash className="w-3.5 h-3.5" />
              <span className="font-bold">{healthStats.numCols}</span>
              <span className="text-slate-400">Numeric</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-purple-300">
              <Type className="w-3.5 h-3.5" />
              <span className="font-bold">{healthStats.catCols}</span>
              <span className="text-slate-400">Categorical</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Auto-classified types</p>
        </div>

        {/* Card 4: Missingness Rate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400">Missing / Null Cells</span>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-black ${healthStats.totalNulls === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {healthStats.totalNulls.toLocaleString()}
            </p>
            <span className="text-xs text-slate-400">null values</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {healthStats.totalNulls === 0 ? 'Zero missing values detected' : 'Available for imputation in Cleaner'}
          </p>
        </div>

      </div>

      {/* Main EDA Workspace: Left Column List, Right Detailed Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Column Explorer */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Features ({dataset.columns.length})</h3>
            <div className="flex gap-1">
              {(['all', 'number', 'category'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors ${
                    filterType === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredColumns.map(col => {
              const stats = allStats[col.name];
              const isSelected = selectedCol?.name === col.name;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedColumnName(col.name)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md shadow-indigo-950/40'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-white truncate font-mono">{col.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {col.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{stats?.uniqueCount} unique</span>
                      {stats?.nullCount > 0 && (
                        <span className="text-amber-400">{stats.nullCount} nulls</span>
                      )}
                    </div>
                  </div>

                  {col.type === 'number' && stats?.mean !== undefined && (
                    <div className="text-right font-mono text-[11px] text-cyan-400 shrink-0">
                      <p className="text-[9px] text-slate-500 uppercase">Mean</p>
                      <p>{round(stats.mean, 1)}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Deep Feature Profile */}
        {selectedCol && selectedStats && (
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header of selected feature */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white font-mono">{selectedCol.name}</h2>
                    <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold font-mono">
                      {selectedCol.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dataset.data.length - selectedStats.nullCount} valid observations ({selectedStats.nullCount} missing)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-400">Cardinality: </span>
                    <span className="font-bold text-white font-mono">{selectedStats.uniqueCount} distinct</span>
                  </div>
                </div>
              </div>

              {/* Numerical Metrics Matrix */}
              {selectedCol.type === 'number' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Mean (μ)</span>
                    <p className="text-base font-bold text-cyan-400 font-mono mt-0.5">{round(selectedStats.mean || 0, 2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Median (Q2)</span>
                    <p className="text-base font-bold text-white font-mono mt-0.5">{round(selectedStats.median || 0, 2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Std Dev (σ)</span>
                    <p className="text-base font-bold text-purple-400 font-mono mt-0.5">{round(selectedStats.stdDev || 0, 2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Min / Max</span>
                    <p className="text-xs font-bold text-white font-mono mt-1">
                      {round(selectedStats.min || 0, 2)} → {round(selectedStats.max || 0, 2)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">25th Pct (Q1)</span>
                    <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">{round(selectedStats.q25 || 0, 2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">75th Pct (Q3)</span>
                    <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">{round(selectedStats.q75 || 0, 2)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Interquartile (IQR)</span>
                    <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
                      {round((selectedStats.q75 || 0) - (selectedStats.q25 || 0), 2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-500 font-semibold">Skewness</span>
                    <p className="text-sm font-bold text-indigo-400 font-mono mt-0.5">
                      {round(selectedStats.skewness || 0, 2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Distribution Bins / Histogram Chart */}
              {selectedStats.histogramBins && selectedStats.histogramBins.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Empirical Frequency Distribution (Histogram)
                  </span>
                  <div className="h-52 w-full bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedStats.histogramBins}>
                        <XAxis dataKey="bin" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top Frequency Categories for String/Category Columns */}
              {selectedStats.topValues && selectedStats.topValues.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Top Categorical Frequency Breakdown
                  </span>
                  <div className="space-y-2">
                    {selectedStats.topValues.map(item => {
                      const pct = dataset.data.length > 0 ? (item.count / dataset.data.length) * 100 : 0;
                      return (
                        <div key={String(item.value)} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-white font-mono">{String(item.value || '(Empty / Null)')}</span>
                            <span className="text-slate-400 font-mono">
                              {item.count} items ({round(pct, 1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
