import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  ScatterChart, 
  Scatter, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  LineChart as LineIcon, 
  PieChart as PieIcon, 
  Activity, 
  Layers, 
  Download, 
  Sliders, 
  Palette,
  Sparkles
} from 'lucide-react';
import { Dataset, AggregationType } from '../../types';
import { round } from '../../utils/statistics';

interface ChartStudioProps {
  dataset: Dataset;
}

type ChartType = 'bar' | 'stacked_bar' | 'line' | 'area' | 'pie' | 'donut' | 'radar' | 'scatter';

const COLOR_PALETTES: Record<string, string[]> = {
  modern: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
  emerald: ['#10b981', '#059669', '#34d399', '#6ee7b7', '#047857', '#a7f3d0'],
  sunset: ['#f43f5e', '#fb923c', '#f59e0b', '#e11d48', '#d97706', '#be123c'],
  cyber: ['#00f5d4', '#7b2cbf', '#f72585', '#4cc9f0', '#7209b7', '#3f37c9'],
};

export const ChartStudio: React.FC<ChartStudioProps> = ({ dataset }) => {
  const numberColumns = useMemo(() => dataset.columns.filter(c => c.type === 'number'), [dataset.columns]);
  const allColumns = dataset.columns;

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xColumn, setXColumn] = useState(
    dataset.columns.find(c => c.type === 'category' || c.type === 'string')?.name || dataset.columns[0]?.name || ''
  );
  const [yColumn, setYColumn] = useState(numberColumns[0]?.name || dataset.columns[0]?.name || '');
  const [aggregation, setAggregation] = useState<AggregationType>('mean');
  const [paletteKey, setPaletteKey] = useState<string>('modern');
  const [topLimit, setTopLimit] = useState<number>(10);
  const [sortBy, setSortBy] = useState<'val_desc' | 'val_asc' | 'alpha'>('val_desc');

  const colors = COLOR_PALETTES[paletteKey] || COLOR_PALETTES.modern;

  // Process data for charts
  const processedData = useMemo(() => {
    if (!xColumn || !yColumn) return [];

    const groups: Record<string, number[]> = {};
    dataset.data.forEach(row => {
      const key = String(row[xColumn] ?? 'Unknown');
      const val = Number(row[yColumn]);
      if (!groups[key]) groups[key] = [];
      if (!isNaN(val)) groups[key].push(val);
    });

    let result = Object.entries(groups).map(([label, vals]) => {
      let aggregatedVal = 0;
      if (vals.length > 0) {
        if (aggregation === 'sum') aggregatedVal = vals.reduce((a, b) => a + b, 0);
        else if (aggregation === 'mean') aggregatedVal = vals.reduce((a, b) => a + b, 0) / vals.length;
        else if (aggregation === 'count') aggregatedVal = vals.length;
        else if (aggregation === 'min') aggregatedVal = Math.min(...vals);
        else if (aggregation === 'max') aggregatedVal = Math.max(...vals);
      }
      return {
        name: label,
        value: round(aggregatedVal, 2),
        count: vals.length,
      };
    });

    if (sortBy === 'val_desc') result.sort((a, b) => b.value - a.value);
    else if (sortBy === 'val_asc') result.sort((a, b) => a.value - b.value);
    else if (sortBy === 'alpha') result.sort((a, b) => a.name.localeCompare(b.name));

    if (topLimit > 0) {
      result = result.slice(0, topLimit);
    }

    return result;
  }, [dataset.data, xColumn, yColumn, aggregation, sortBy, topLimit]);

  return (
    <div className="space-y-6">
      
      {/* Visual Chart Type Ribbon */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Select Visual Grammar / Chart Type
          </span>
          <span className="text-xs text-indigo-400 font-mono">
            {processedData.length} data bins plotted
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { type: 'bar', label: 'Bar Chart', icon: BarChart3 },
            { type: 'line', label: 'Line Series', icon: LineIcon },
            { type: 'area', label: 'Area Fill', icon: Activity },
            { type: 'pie', label: 'Pie Chart', icon: PieIcon },
            { type: 'donut', label: 'Donut Ring', icon: PieIcon },
            { type: 'radar', label: 'Radar Spider', icon: Layers },
            { type: 'scatter', label: 'Scatter Dot', icon: Activity },
          ].map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setChartType(type as ChartType)}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                chartType === type
                  ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-950/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio: Left Config Panel, Right Big Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Dimension & Metric Config */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Axis & Dimension Mapping
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">X-Axis Category / Dimension</label>
              <select
                value={xColumn}
                onChange={e => setXColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {allColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Y-Axis Numerical Metric</label>
              <select
                value={yColumn}
                onChange={e => setYColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {numberColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Aggregation</label>
                <select
                  value={aggregation}
                  onChange={e => setAggregation(e.target.value as AggregationType)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                >
                  <option value="mean">Mean (Average)</option>
                  <option value="sum">Sum (Total)</option>
                  <option value="count">Count (Frequency)</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Max Bins</label>
                <select
                  value={topLimit}
                  onChange={e => setTopLimit(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                >
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                  <option value={50}>Top 50</option>
                  <option value={0}>All Categories</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Sort Order</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                >
                  <option value="val_desc">Value (High to Low)</option>
                  <option value="val_asc">Value (Low to High)</option>
                  <option value="alpha">Alphabetical</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Palette</label>
                <select
                  value={paletteKey}
                  onChange={e => setPaletteKey(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-[11px]"
                >
                  <option value="modern">Indigo Neon</option>
                  <option value="emerald">Emerald Sea</option>
                  <option value="sunset">Sunset Flame</option>
                  <option value="cyber">Cyberpunk</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Main Interactive Chart Viewport */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white font-mono capitalize">
                {aggregation} of {yColumn} by {xColumn}
              </h3>
              <p className="text-xs text-slate-400">Interactive live chart canvas</p>
            </div>
          </div>

          <div className="h-96 w-full bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center">
            {processedData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* 1. Bar Chart */}
                {chartType === 'bar' ? (
                  <BarChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="value" name={yColumn} fill={colors[0]} radius={[4, 4, 0, 0]}>
                      {processedData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={3} dot={{ r: 4, fill: colors[0] }} />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.25} />
                  </AreaChart>
                ) : chartType === 'pie' || chartType === 'donut' ? (
                  <PieChart>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Pie
                      data={processedData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={chartType === 'donut' ? 65 : 0}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {processedData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                ) : chartType === 'radar' ? (
                  <RadarChart cx="50%" cy="50%" outerRadius={110} data={processedData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <PolarRadiusAxis stroke="#64748b" fontSize={9} />
                    <Radar name={yColumn} dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.4} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  </RadarChart>
                ) : (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis dataKey="value" stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                    <Scatter name={yColumn} data={processedData} fill={colors[0]} />
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No data points to display with selected dimensions.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
