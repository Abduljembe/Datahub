import React from 'react';
import { X, Copy, Check, Trash2, Edit3, Share2, Tag, Calendar, Hash, FileText } from 'lucide-react';
import { Dataset } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface MobileRecordInspectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  record: Record<string, any> | null;
  dataset: Dataset | null;
  rowIndex?: number;
}

export const MobileRecordInspectorSheet: React.FC<MobileRecordInspectorSheetProps> = ({
  isOpen,
  onClose,
  record,
  dataset,
  rowIndex
}) => {
  const { isDark } = useTheme();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen || !record) return null;

  const handleCopy = (value: any, key: string) => {
    navigator.clipboard.writeText(String(value ?? ''));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const columns = dataset?.columns || Object.keys(record).map(key => ({ id: key, name: key, type: 'string' as const, nullable: true }));

  // Pick title for record
  const primaryKey = columns[0]?.name || Object.keys(record)[0] || 'Record';
  const primaryVal = record[primaryKey] || `Record #${(rowIndex ?? 0) + 1}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex-1" onClick={onClose} />

      <div 
        className={`w-full max-h-[85vh] flex flex-col rounded-t-3xl border-t shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250 ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Grab Handle */}
        <div className="pt-3 pb-2 flex justify-center cursor-pointer" onClick={onClose}>
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-bold uppercase">
                Row #{typeof rowIndex === 'number' ? rowIndex + 1 : '—'}
              </span>
              <span className="text-xs text-slate-400">
                {dataset?.name || 'Dataset Record'}
              </span>
            </div>
            <h3 className="font-bold text-base mt-0.5 truncate max-w-[280px]">
              {String(primaryVal)}
            </h3>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column Details List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {columns.map(col => {
            const rawVal = record[col.name];
            const displayVal = rawVal === null || rawVal === undefined ? '— (null)' : String(rawVal);
            const isCopied = copiedKey === col.name;

            return (
              <div 
                key={col.id || col.name}
                className={`p-3 rounded-2xl border transition-colors ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <div className="flex items-center gap-1.5 font-mono text-slate-400">
                    {col.type === 'number' ? <Hash className="w-3 h-3 text-cyan-400" /> :
                     col.type === 'date' ? <Calendar className="w-3 h-3 text-emerald-400" /> :
                     <Tag className="w-3 h-3 text-indigo-400" />}
                    <span className="font-semibold text-slate-300">{col.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {col.type}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className={`text-xs sm:text-sm font-medium break-all select-all ${
                    rawVal === null || rawVal === undefined ? 'text-slate-500 italic' : ''
                  }`}>
                    {displayVal}
                  </span>

                  <button
                    onClick={() => handleCopy(rawVal, col.name)}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                      isCopied 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-600'
                    }`}
                    title="Copy value"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Bar */}
        <div className={`p-4 border-t flex items-center justify-between gap-2 ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-xs text-slate-400 font-mono">
            {columns.length} columns inspected
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
