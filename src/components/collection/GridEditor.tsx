import React, { useState } from 'react';
import { 
  Table, 
  Plus, 
  Trash2, 
  Search, 
  Save, 
  RotateCcw, 
  Edit3, 
  Check, 
  X, 
  Filter, 
  Download, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Camera,
  History
} from 'lucide-react';
import { Dataset, ColumnMeta, DataType } from '../../types';
import { exportToCSV, exportToExcel } from '../../utils/dataEngine';
import { createDatasetSnapshot } from '../../utils/versionEngine';

interface GridEditorProps {
  dataset: Dataset | null;
  onUpdateDataset: (updated: Dataset) => void;
  onNavigateToAnalysis?: () => void;
  onNavigateToSimulation?: () => void;
  onOpenDatasetModal?: (tab?: 'list' | 'versions') => void;
}

export const GridEditor: React.FC<GridEditorProps> = ({ 
  dataset, 
  onUpdateDataset,
  onNavigateToAnalysis,
  onNavigateToSimulation,
  onOpenDatasetModal
}) => {
  const [data, setData] = useState<Record<string, any>[]>(dataset?.data || []);
  const [columns, setColumns] = useState<ColumnMeta[]>(dataset?.columns || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Editing state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [cellValue, setCellValue] = useState<any>('');
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<DataType>('string');
  const [showAddCol, setShowAddCol] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  // Sync if dataset prop changes
  React.useEffect(() => {
    if (dataset) {
      setData(dataset.data);
      setColumns(dataset.columns);
    } else {
      setData([]);
      setColumns([]);
    }
  }, [dataset?.id, dataset?.updatedAt]);

  if (!dataset) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl my-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          <Table className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Dataset to Edit</h2>
        <p className="text-sm text-slate-400">
          Select or upload a real dataset to view and edit spreadsheet rows, manage data types, and apply transformations.
        </p>
        <div className="pt-2">
          {onOpenDatasetModal && (
            <button
              onClick={() => onOpenDatasetModal('create')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              Create New Dataset
            </button>
          )}
        </div>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setSnapshotToast(msg);
    setTimeout(() => setSnapshotToast(null), 3500);
  };

  const handleCaptureSnapshot = () => {
    const tempDs: Dataset = {
      ...dataset,
      data,
      columns,
      updatedAt: new Date().toISOString(),
    };
    const { updatedDataset, newVersion } = createDatasetSnapshot(tempDs, {
      name: `Grid Edit Checkpoint (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      description: `Manual checkpoint captured from Grid Data Editor.`,
      tag: 'manual_snapshot',
      createdBy: 'Grid Editor',
    });
    onUpdateDataset(updatedDataset);
    showToast(`📸 Snapshot "${newVersion.name}" saved!`);
  };

  // Sync if dataset prop changes
  React.useEffect(() => {
    setData(dataset.data);
    setColumns(dataset.columns);
  }, [dataset.id, dataset.updatedAt]);

  const filteredData = data.filter(row => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some(v => String(v).toLowerCase().includes(term));
  });

  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  const handleCellClick = (rowIndex: number, colName: string, val: any) => {
    const actualIndex = page * pageSize + rowIndex;
    setEditingCell({ rowIndex: actualIndex, colName });
    setCellValue(val ?? '');
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    const updated = [...data];
    const targetCol = columns.find(c => c.name === editingCell.colName);
    let finalVal = cellValue;
    
    if (targetCol?.type === 'number') {
      finalVal = cellValue === '' ? null : Number(cellValue);
    } else if (targetCol?.type === 'boolean') {
      finalVal = String(cellValue).toLowerCase() === 'true';
    }

    updated[editingCell.rowIndex] = {
      ...updated[editingCell.rowIndex],
      [editingCell.colName]: finalVal,
    };

    setData(updated);
    setEditingCell(null);
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    columns.forEach(c => {
      newRow[c.name] = c.type === 'number' ? 0 : '';
    });
    const updated = [newRow, ...data];
    setData(updated);
  };

  const handleDeleteRow = (indexOnPage: number) => {
    const actualIndex = page * pageSize + indexOnPage;
    const updated = data.filter((_, idx) => idx !== actualIndex);
    setData(updated);
  };

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const colKey = newColName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (columns.some(c => c.name === colKey)) return;

    const newCol: ColumnMeta = {
      id: colKey,
      name: colKey,
      type: newColType,
      nullable: true,
    };

    const updatedCols = [...columns, newCol];
    const updatedData = data.map(r => ({
      ...r,
      [colKey]: newColType === 'number' ? 0 : '',
    }));

    setColumns(updatedCols);
    setData(updatedData);
    setNewColName('');
    setShowAddCol(false);
  };

  const handleDeleteColumn = (colName: string) => {
    if (columns.length <= 1) return;
    const updatedCols = columns.filter(c => c.name !== colName);
    const updatedData = data.map(r => {
      const copy = { ...r };
      delete copy[colName];
      return copy;
    });
    setColumns(updatedCols);
    setData(updatedData);
  };

  const handleSaveToDataset = () => {
    onUpdateDataset({
      ...dataset,
      data,
      columns,
      updatedAt: new Date().toISOString(),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4">
      
      {/* Action Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Search & Filter */}
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              placeholder="Search in all cells..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredData.length} of {data.length} records
          </span>
        </div>

        {/* Right: Add Row, Add Column, Snapshot, Save */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddRow}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Row</span>
          </button>

          <button
            onClick={() => setShowAddCol(!showAddCol)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Column</span>
          </button>

          <button
            onClick={handleCaptureSnapshot}
            className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Save a historical snapshot of this grid state right now"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Snapshot Checkpoint</span>
          </button>

          {onOpenDatasetModal && (
            <button
              onClick={() => onOpenDatasetModal('versions')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Open Dataset Versions to inspect, compare, or restore prior snapshots"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Versions</span>
            </button>
          )}

          <button
            onClick={handleSaveToDataset}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            {savedSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Saved to Dataset!' : 'Save Dataset'}</span>
          </button>
        </div>
      </div>

      {snapshotToast && (
        <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{snapshotToast}</span>
        </div>
      )}

      {/* Add Column Popup Drawer */}
      {showAddCol && (
        <form onSubmit={handleAddColumn} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs animate-in fade-in">
          <span className="text-slate-300 font-semibold">New Column:</span>
          <input
            type="text"
            required
            placeholder="column_name"
            value={newColName}
            onChange={e => setNewColName(e.target.value)}
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
          />
          <select
            value={newColType}
            onChange={e => setNewColType(e.target.value as DataType)}
            className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-white font-mono"
          >
            <option value="string">String (Text)</option>
            <option value="number">Number (Float/Int)</option>
            <option value="category">Category (Factor)</option>
            <option value="boolean">Boolean (True/False)</option>
            <option value="date">Date</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowAddCol(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Tabular Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-300 sticky top-0 z-10 border-b border-slate-800 shadow-sm">
              <tr>
                <th className="p-3 w-10 text-slate-500 font-mono text-[10px] text-center">#</th>
                {columns.map(col => (
                  <th key={col.id} className="p-3 font-semibold border-r border-slate-800/80 min-w-[140px]">
                    <div className="flex items-center justify-between group">
                      <div className="space-y-0.5">
                        <p className="font-mono text-white text-xs">{col.name}</p>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {col.type}
                        </span>
                      </div>
                      {columns.length > 1 && (
                        <button
                          onClick={() => handleDeleteColumn(col.name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                          title="Delete column"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-3 w-10 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedData.map((row, rowIdx) => {
                const actualRowIdx = page * pageSize + rowIdx;
                return (
                  <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-2.5 text-center text-slate-500 text-[10px] bg-slate-950/40">
                      {actualRowIdx + 1}
                    </td>

                    {columns.map(col => {
                      const isEditing = editingCell?.rowIndex === actualRowIdx && editingCell.colName === col.name;
                      const val = row[col.name];

                      return (
                        <td
                          key={col.id}
                          onClick={() => !isEditing && handleCellClick(rowIdx, col.name, val)}
                          className={`p-2 border-r border-slate-800/50 cursor-pointer transition-colors max-w-[220px] truncate ${
                            isEditing ? 'bg-indigo-950/60 p-1' : 'hover:bg-indigo-950/20 text-slate-300'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={cellValue}
                                onChange={e => setCellValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveCell();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                onBlur={handleSaveCell}
                                className="w-full px-2 py-1 bg-slate-900 border border-indigo-500 text-white rounded text-xs focus:outline-none"
                              />
                            </div>
                          ) : (
                            <span className={val === null || val === undefined || val === '' ? 'text-slate-600 italic' : ''}>
                              {val === null || val === undefined || val === '' ? 'null' : String(val)}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDeleteRow(rowIdx)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredData.length)} of {filteredData.length} records
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-200">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
