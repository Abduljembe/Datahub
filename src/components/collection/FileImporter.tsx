import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileSpreadsheet, 
  Code, 
  Clipboard, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  Table as TableIcon
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import { parseCSV, parseExcel, parseJSON, generateColumnsFromData } from '../../utils/dataEngine';

interface FileImporterProps {
  onImportComplete: (dataset: Dataset) => void;
  activeDataset: Dataset | null;
  onAppendToActive: (newRows: Record<string, any>[]) => void;
}

export const FileImporter: React.FC<FileImporterProps> = ({
  onImportComplete,
  activeDataset,
  onAppendToActive,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'json' | 'tsv'>('csv');
  const [datasetName, setDatasetName] = useState('');
  
  // Preview state
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null);
  const [previewColumns, setPreviewColumns] = useState<ColumnMeta[]>([]);
  const [excelSheets, setExcelSheets] = useState<Record<string, { data: Record<string, any>[]; columns: ColumnMeta[] }> | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importTarget, setImportTarget] = useState<'new' | 'append'>('new');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    setDatasetName(fileName);

    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text();
        const { data, columns } = parseCSV(text);
        if (data.length === 0) throw new Error('No valid tabular rows found in CSV file.');
        setPreviewData(data);
        setPreviewColumns(columns);
        setExcelSheets(null);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const { sheets } = parseExcel(buffer);
        const sheetNames = Object.keys(sheets);
        if (sheetNames.length === 0) throw new Error('No valid sheets found in Excel file.');
        
        setExcelSheets(sheets);
        setSelectedSheet(sheetNames[0]);
        setPreviewData(sheets[sheetNames[0]].data);
        setPreviewColumns(sheets[sheetNames[0]].columns);
      } else if (ext === 'json') {
        const text = await file.text();
        const { data, columns } = parseJSON(text);
        if (data.length === 0) throw new Error('No valid array records found in JSON file.');
        setPreviewData(data);
        setPreviewColumns(columns);
        setExcelSheets(null);
      } else {
        throw new Error('Unsupported file extension. Please upload .csv, .xlsx, .xls, or .json.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file.');
      setPreviewData(null);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!excelSheets || !excelSheets[sheetName]) return;
    setSelectedSheet(sheetName);
    setPreviewData(excelSheets[sheetName].data);
    setPreviewColumns(excelSheets[sheetName].columns);
  };

  const handleProcessPaste = () => {
    if (!pasteContent.trim()) return;
    setErrorMsg(null);

    try {
      if (pasteFormat === 'csv') {
        const { data, columns } = parseCSV(pasteContent);
        if (data.length === 0) throw new Error('No rows parsed from CSV text.');
        setPreviewData(data);
        setPreviewColumns(columns);
      } else if (pasteFormat === 'tsv') {
        // Replace tabs with commas or let PapaParse handle
        const { data, columns } = parseCSV(pasteContent);
        setPreviewData(data);
        setPreviewColumns(columns);
      } else if (pasteFormat === 'json') {
        const { data, columns } = parseJSON(pasteContent);
        if (data.length === 0) throw new Error('No objects found in JSON text.');
        setPreviewData(data);
        setPreviewColumns(columns);
      }
      setDatasetName('Pasted Data ' + new Date().toLocaleTimeString());
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid data format.');
      setPreviewData(null);
    }
  };

  const handleConfirmImport = () => {
    if (!previewData || previewData.length === 0) return;

    if (importTarget === 'append' && activeDataset) {
      onAppendToActive(previewData);
      setPreviewData(null);
      return;
    }

    const newDataset: Dataset = {
      id: 'ds_' + Date.now(),
      name: datasetName.trim() || 'Imported Dataset',
      description: `Imported with ${previewData.length} records and ${previewColumns.length} columns.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: 'csv',
      columns: previewColumns,
      data: previewData,
    };

    onImportComplete(newDataset);
    setPreviewData(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Structured File & Clipboard Importer
        </h2>
        <p className="text-xs text-slate-400">Import datasets from standard formats (CSV, multi-sheet Excel .xlsx, JSON arrays) or paste raw tabular data directly.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'upload'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload File (CSV / XLSX / JSON)</span>
        </button>
        <button
          onClick={() => setActiveTab('paste')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'paste'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clipboard className="w-4 h-4" />
          <span>Paste Clipboard / Raw Text</span>
        </button>
      </div>

      {/* Mode 1: File Upload */}
      {activeTab === 'upload' && !previewData && (
        <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/40 rounded-2xl p-12 text-center transition-all group">
          <input
            type="file"
            id="file-importer-input"
            accept=".csv, .xlsx, .xls, .json, .txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="file-importer-input" className="cursor-pointer space-y-4 block">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Click or drag & drop files here to parse</p>
              <p className="text-xs text-slate-400 mt-1">Supports CSV, Excel (.xlsx, .xls), JSON, TSV</p>
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 pt-2">
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-slate-400" /> Auto delimiter detect</span>
              <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> Multi-sheet support</span>
              <span className="flex items-center gap-1"><Code className="w-3.5 h-3.5 text-slate-400" /> Auto schema inference</span>
            </div>
          </label>
        </div>
      )}

      {/* Mode 2: Paste Raw Text */}
      {activeTab === 'paste' && !previewData && (
        <div className="space-y-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200">Select Input Format</label>
            <div className="flex gap-2">
              {(['csv', 'tsv', 'json'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setPasteFormat(fmt)}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase ${
                    pasteFormat === fmt
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={8}
            value={pasteContent}
            onChange={e => setPasteContent(e.target.value)}
            placeholder={
              pasteFormat === 'json'
                ? '[\n  { "name": "Item 1", "score": 95, "category": "A" },\n  { "name": "Item 2", "score": 82, "category": "B" }\n]'
                : 'name,score,category\nItem 1,95,A\nItem 2,82,B'
            }
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={handleProcessPaste}
            disabled={!pasteContent.trim()}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Parse & Preview Tabular Data</span>
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PREVIEW & IMPORT CONFIRMATION */}
      {previewData && (
        <div className="space-y-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Parsed {previewData.length} records ({previewColumns.length} columns)
              </h3>
              <p className="text-xs text-slate-400">Review schema and sample rows before loading into the platform.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewData(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel / Re-upload
              </button>

              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <span>Complete Import</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Excel Sheet Picker if multiple sheets */}
          {excelSheets && Object.keys(excelSheets).length > 1 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">Select Worksheet:</span>
              <div className="flex gap-2">
                {Object.keys(excelSheets).map(sheet => (
                  <button
                    key={sheet}
                    onClick={() => handleSheetChange(sheet)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      selectedSheet === sheet
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sheet} ({excelSheets[sheet].data.length} rows)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Import Destination Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Target Action</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="importTarget"
                    checked={importTarget === 'new'}
                    onChange={() => setImportTarget('new')}
                    className="text-emerald-600 focus:ring-0"
                  />
                  <span>Create as New Dataset</span>
                </label>
                {activeDataset && (
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTarget === 'append'}
                      onChange={() => setImportTarget('append')}
                      className="text-emerald-600 focus:ring-0"
                    />
                    <span>Append to Active ({activeDataset.name})</span>
                  </label>
                )}
              </div>
            </div>

            {importTarget === 'new' && (
              <div>
                <label className="text-slate-400 block mb-1">Dataset Name</label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={e => setDatasetName(e.target.value)}
                  placeholder="e.g. Sales Report Q3"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-2.5 font-mono text-[10px] text-slate-500 w-10">#</th>
                  {previewColumns.map(col => (
                    <th key={col.id} className="p-2.5 font-semibold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{col.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {col.type}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {previewData.slice(0, 8).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-mono text-[10px] text-slate-500">{idx + 1}</td>
                    {previewColumns.map(col => (
                      <td key={col.id} className="p-2.5 text-slate-300 truncate max-w-xs font-mono text-[11px]">
                        {String(row[col.name] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 8 && (
            <p className="text-[11px] text-slate-500 text-center">
              Showing preview of first 8 of {previewData.length} total parsed records
            </p>
          )}
        </div>
      )}

    </div>
  );
};
