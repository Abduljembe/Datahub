import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  Download, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy,
  Database,
  Code2
} from 'lucide-react';
import { Dataset, SqlQueryResult } from '../../types';
import { executeSQL } from '../../utils/sqlRunner';
import { generateColumnsFromData } from '../../utils/dataEngine';

interface SqlQueryRunnerProps {
  dataset: Dataset;
  onCreateDatasetFromQuery: (newDataset: Dataset) => void;
}

export const SqlQueryRunner: React.FC<SqlQueryRunnerProps> = ({
  dataset,
  onCreateDatasetFromQuery,
}) => {
  const numCol = dataset.columns.find(c => c.type === 'number')?.name || dataset.columns[0]?.name || 'id';
  const catCol = dataset.columns.find(c => c.type === 'category' || c.type === 'string')?.name || dataset.columns[0]?.name || 'category';

  const defaultQuery = `SELECT ${catCol}, COUNT(*) as record_count, AVG(${numCol}) as avg_${numCol}\nFROM dataset\nGROUP BY ${catCol}\nORDER BY avg_${numCol} DESC\nLIMIT 20;`;

  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState<SqlQueryResult | null>(null);

  const handleRunQuery = () => {
    if (!query.trim()) return;
    const res = executeSQL(query, dataset.data);
    setResult(res);
  };

  const handleCreateDatasetFromResult = () => {
    if (!result || result.data.length === 0) return;
    const columns = generateColumnsFromData(result.data);
    const newDs: Dataset = {
      id: 'ds_sql_' + Date.now(),
      name: `${dataset.name} (SQL View)`,
      description: `Output of SQL Query on ${new Date().toLocaleTimeString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'manual',
      columns,
      data: result.data,
    };
    onCreateDatasetFromQuery(newDs);
  };

  const handleExportCSV = () => {
    if (!result || result.data.length === 0) return;
    const headers = result.columns.join(',');
    const rows = result.data.map(r => result.columns.map(c => `"${String(r[c] ?? '')}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SQL_Export_${Date.now()}.csv`;
    link.click();
  };

  const templates = [
    {
      label: 'Summary by Category',
      sql: `SELECT ${catCol}, COUNT(*) as total_rows, AVG(${numCol}) as mean_${numCol}\nFROM dataset\nGROUP BY ${catCol}\nORDER BY mean_${numCol} DESC;`,
    },
    {
      label: 'Top 10 Outliers',
      sql: `SELECT * FROM dataset\nORDER BY ${numCol} DESC\nLIMIT 10;`,
    },
    {
      label: 'Select All Filtered',
      sql: `SELECT * FROM dataset\nWHERE ${numCol} > 0\nLIMIT 50;`,
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            In-Memory SQL Query Console
          </h2>
          <p className="text-xs text-slate-400">Query your active dataset using SQL syntax with SELECT, WHERE, GROUP BY, aggregates, and ORDER BY.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunQuery}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Execute Query (Ctrl + Enter)</span>
          </button>
        </div>
      </div>

      {/* SQL Editor Area & Syntax Helper */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* SQL Code Box */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              SQL Query Input (Table: <code className="text-emerald-400">dataset</code>)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Available features: {dataset.columns.map(c => c.name).join(', ')}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl">
            <textarea
              rows={7}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.ctrlKey && e.key === 'Enter') handleRunQuery();
              }}
              placeholder="SELECT * FROM dataset WHERE ..."
              className="w-full bg-transparent text-emerald-300 text-xs font-mono focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Quick Query Templates */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Query Templates
          </span>

          <div className="space-y-2">
            {templates.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(t.sql)}
                className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors text-xs"
              >
                <p className="font-semibold text-emerald-300">{t.label}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 line-clamp-1">{t.sql.split('\n')[0]}</p>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Query Result View */}
      {result && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in">
          
          {/* Result Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              {result.error ? (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  <span>SQL Error: {result.error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Query returned {result.rowCount.toLocaleString()} rows in {result.executionTimeMs.toFixed(1)}ms
                  </span>
                </div>
              )}
            </div>

            {!result.error && result.data.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleCreateDatasetFromResult}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Save as Dataset</span>
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          {!result.error && (
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-80">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 w-10 text-slate-600 text-center">#</th>
                    {result.columns.map(col => (
                      <th key={col} className="p-2.5 font-bold text-slate-200">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {result.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-2.5 text-slate-600 text-[10px] text-center">{idx + 1}</td>
                      {result.columns.map(col => (
                        <td key={col} className="p-2.5 text-slate-300 truncate max-w-xs">
                          {String(row[col] ?? 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
