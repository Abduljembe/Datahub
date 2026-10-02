import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileText, 
  Code, 
  Sparkles, 
  Wand2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Trash2, 
  RotateCcw, 
  Database, 
  Table as TableIcon, 
  Sliders, 
  Scissors, 
  Activity, 
  BarChart3, 
  Layers, 
  Filter, 
  Plus, 
  Check, 
  Info,
  Calendar,
  Download,
  Eye,
  FileUp,
  RefreshCw,
  Zap,
  Tag,
  ShieldCheck,
  Share2,
  MessageSquare
} from 'lucide-react';
import { Dataset, ColumnMeta, ColumnDataType } from '../../types';
import { parseCSV, parseExcel, parseJSON, generateColumnsFromData, imputeMissing, filterRows } from '../../utils/dataEngine';
import { computeColumnStats, round } from '../../utils/statistics';
import { DataQualityPanel } from './DataQualityPanel';
import { analyzeDataQuality } from '../../utils/qualityEngine';
import { DEFAULT_QUALITATIVE_DATASET } from '../../data/defaultQualitativeData';

interface UploadCleanStudioProps {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  onSelectDataset: (id: string) => void;
  onCreateDataset: (dataset: Dataset) => void;
  onUpdateDataset: (dataset: Dataset) => void;
  onDeleteDataset: (id: string) => void;
  onNavigateToAnalysis: () => void;
  onNavigateToGrid: () => void;
  onShareDataset?: (dataset: Dataset) => void;
}

export const UploadCleanStudio: React.FC<UploadCleanStudioProps> = ({
  datasets,
  activeDataset,
  onSelectDataset,
  onCreateDataset,
  onUpdateDataset,
  onDeleteDataset,
  onNavigateToAnalysis,
  onNavigateToGrid,
  onShareDataset,
}) => {
  // Ingestion Mode: File Upload vs Raw Paste vs Manage Uploaded vs Qualitative Transcripts
  const [ingestMode, setIngestMode] = useState<'upload' | 'paste' | 'qualitative' | 'library'>('upload');
  
  // File upload state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  
  // Paste state
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteDelimiter, setPasteDelimiter] = useState<',' | '\t' | ';' | '|' | 'json'>(',');

  // Qualitative Ingestion State
  const [qualitativeText, setQualitativeText] = useState<string>('');
  const [qualitativeFormat, setQualitativeFormat] = useState<'paragraphs' | 'speakers' | 'lines' | 'json'>('paragraphs');

  // Multi-sheet Excel support
  const [excelSheets, setExcelSheets] = useState<Record<string, { data: Record<string, any>[]; columns: ColumnMeta[] }> | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Working data state during upload & clean phase
  const [rawUploadedData, setRawUploadedData] = useState<Record<string, any>[] | null>(null);
  const [workingData, setWorkingData] = useState<Record<string, any>[] | null>(null);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [datasetTitle, setDatasetTitle] = useState<string>('');
  const [datasetDesc, setDatasetDesc] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Active sub-step in the upload workflow
  const [cleanStep, setCleanStep] = useState<'quality' | 'preview' | 'clean' | 'transform'>('quality');

  // Interactive Cleaning Controls
  const [selectedImputeCol, setSelectedImputeCol] = useState<string>('');
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'zero' | 'custom'>('mean');
  const [customImputeVal, setCustomImputeVal] = useState<string>('');

  // Formula column generator
  const [formulaColName, setFormulaColName] = useState<string>('');
  const [formulaBaseCol, setFormulaBaseCol] = useState<string>('');
  const [formulaOp, setFormulaOp] = useState<'+' | '-' | '*' | '/' | 'log'>('*');
  const [formulaFactor, setFormulaFactor] = useState<string>('1.1');

  // Text transformer
  const [textColTarget, setTextColTarget] = useState<string>('');
  const [textTransformOp, setTextTransformOp] = useState<'trim' | 'upper' | 'lower' | 'title' | 'clean_special'>('trim');

  // Column type override
  const [editingColType, setEditingColType] = useState<{ colId: string; type: ColumnDataType } | null>(null);

  // Filter user-uploaded datasets
  const uploadedDatasets = useMemo(() => {
    return datasets.filter(d => 
      d.sourceType === 'csv' || 
      d.sourceType === 'excel' || 
      d.sourceType === 'json' || 
      d.sourceType === 'manual' ||
      d.id.startsWith('ds_upload_') ||
      d.id.startsWith('ds_user_')
    );
  }, [datasets]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Process raw text or file into records and schema
  const ingestRawRecords = (data: Record<string, any>[], cols: ColumnMeta[], defaultName: string, format: string) => {
    if (!data || data.length === 0) {
      setErrorMessage('No valid data records could be extracted from this source.');
      return;
    }
    setRawUploadedData(data);
    setWorkingData(data);
    setColumns(cols);
    setDatasetTitle(defaultName || `Custom Dataset ${new Date().toLocaleDateString()}`);
    setDatasetDesc(`User-uploaded ${format.toUpperCase()} dataset with ${data.length} records and ${cols.length} variables.`);
    setErrorMessage(null);
    setCleanStep('preview');
    if (cols.length > 0) {
      setSelectedImputeCol(cols[0].name);
      setTextColTarget(cols.find(c => c.type === 'string' || c.type === 'category')?.name || cols[0].name);
      setFormulaBaseCol(cols.find(c => c.type === 'number')?.name || cols[0].name);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setFileName(file.name);
    setFileSizeStr((file.size / 1024).toFixed(1) + ' KB');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    setFileFormat(ext);
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    try {
      if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        const text = await file.text();
        const { data, columns: cols } = parseCSV(text);
        setExcelSheets(null);
        ingestRawRecords(data, cols, baseName, ext);
        showToast(`Successfully parsed ${data.length.toLocaleString()} rows from ${file.name}`);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const { sheets } = parseExcel(buffer);
        const sheetNames = Object.keys(sheets);
        if (sheetNames.length === 0) throw new Error('No valid sheets found in Excel workbook.');
        setExcelSheets(sheets);
        setSelectedSheet(sheetNames[0]);
        const initialSheet = sheets[sheetNames[0]];
        ingestRawRecords(initialSheet.data, initialSheet.columns, `${baseName} (${sheetNames[0]})`, 'Excel');
        showToast(`Loaded Excel workbook with ${sheetNames.length} sheet(s)`);
      } else if (ext === 'json') {
        const text = await file.text();
        const { data, columns: cols } = parseJSON(text);
        setExcelSheets(null);
        ingestRawRecords(data, cols, baseName, 'JSON');
        showToast(`Parsed ${data.length.toLocaleString()} JSON records`);
      } else {
        throw new Error(`Unsupported file type (.${ext}). Please upload CSV, Excel (.xlsx/.xls), or JSON.`);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || 'Failed to read or parse file structure.');
      setWorkingData(null);
      setRawUploadedData(null);
    }
  };

  const handleSheetSwitch = (sheetName: string) => {
    if (!excelSheets || !excelSheets[sheetName]) return;
    setSelectedSheet(sheetName);
    const sheetData = excelSheets[sheetName];
    setRawUploadedData(sheetData.data);
    setWorkingData(sheetData.data);
    setColumns(sheetData.columns);
    setDatasetTitle(prev => prev.includes('(') ? prev.replace(/\(.*\)/, `(${sheetName})`) : `${prev} (${sheetName})`);
    showToast(`Switched to sheet '${sheetName}' (${sheetData.data.length} rows)`);
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) {
      setErrorMessage('Please paste some tabular data or JSON content.');
      return;
    }
    setErrorMessage(null);
    try {
      if (pasteDelimiter === 'json') {
        const { data, columns: cols } = parseJSON(pasteText);
        ingestRawRecords(data, cols, 'Pasted JSON Dataset', 'json');
        showToast(`Parsed ${data.length} JSON objects.`);
      } else {
        const { data, columns: cols } = parseCSV(pasteText);
        ingestRawRecords(data, cols, 'Pasted Tabular Dataset', 'tsv/csv');
        showToast(`Parsed ${data.length} tabular records.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse pasted data. Please check formatting.');
    }
  };

  const handleProcessQualitative = () => {
    if (!qualitativeText.trim()) {
      setErrorMessage('Please paste some qualitative text, interview responses, or transcripts.');
      return;
    }
    setErrorMessage(null);
    try {
      const raw = qualitativeText.trim();
      const records: Record<string, any>[] = [];

      if (qualitativeFormat === 'speakers') {
        const lines = raw.split(/\r?\n/);
        let currentSpeaker = 'Participant 1';
        let currentText = '';
        let respIndex = 1;

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          const speakerMatch = trimmed.match(/^(\[?([A-Za-z0-9_\s]{2,25})\]?):\s*(.*)$/);
          if (speakerMatch) {
            if (currentText) {
              records.push({
                response_id: `QUAL-${String(respIndex).padStart(3, '0')}`,
                speaker: currentSpeaker,
                qualitative_text: currentText.trim(),
                word_count: currentText.trim().split(/\s+/).length,
                char_count: currentText.trim().length,
              });
              respIndex++;
            }
            currentSpeaker = speakerMatch[2].trim();
            currentText = speakerMatch[3] || '';
          } else {
            currentText += (currentText ? ' ' : '') + trimmed;
          }
        });

        if (currentText) {
          records.push({
            response_id: `QUAL-${String(respIndex).padStart(3, '0')}`,
            speaker: currentSpeaker,
            qualitative_text: currentText.trim(),
            word_count: currentText.trim().split(/\s+/).length,
            char_count: currentText.trim().length,
          });
        }
      } else if (qualitativeFormat === 'paragraphs') {
        const paragraphs = raw.split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
        paragraphs.forEach((p, idx) => {
          records.push({
            response_id: `RESP-${String(idx + 1).padStart(3, '0')}`,
            participant_id: `P-${idx + 1}`,
            feedback_text: p,
            word_count: p.split(/\s+/).length,
            char_count: p.length,
          });
        });
      } else if (qualitativeFormat === 'lines') {
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        lines.forEach((l, idx) => {
          records.push({
            response_id: `RESP-${String(idx + 1).padStart(3, '0')}`,
            feedback_text: l,
            word_count: l.split(/\s+/).length,
            char_count: l.length,
          });
        });
      } else {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item, idx) => {
            if (typeof item === 'string') {
              records.push({
                response_id: `RESP-${String(idx + 1).padStart(3, '0')}`,
                feedback_text: item,
                word_count: item.split(/\s+/).length,
                char_count: item.length,
              });
            } else if (typeof item === 'object' && item !== null) {
              records.push(item);
            }
          });
        }
      }

      if (records.length === 0) {
        throw new Error('No valid qualitative text blocks found. Please check input text.');
      }

      const cols = generateColumnsFromData(records);
      ingestRawRecords(records, cols, 'Qualitative Research Ingestion', 'manual');
      showToast(`Parsed ${records.length} qualitative text responses! Ready for thematic coding.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse qualitative text.');
    }
  };

  const handleLoadQualitativeSample = () => {
    ingestRawRecords(
      DEFAULT_QUALITATIVE_DATASET.data,
      DEFAULT_QUALITATIVE_DATASET.columns,
      DEFAULT_QUALITATIVE_DATASET.name,
      'manual'
    );
    showToast('Loaded 18 Rich Qualitative User Research Responses!');
  };

  // ================= DATA CLEANING OPERATIONS =================

  // 1. One-Click Magic Auto-Clean
  const handleAutoCleanAll = () => {
    if (!workingData) return;
    const initialRows = workingData.length;
    
    // Deduplicate
    const seen = new Set<string>();
    const deduplicated: Record<string, any>[] = [];
    workingData.forEach(row => {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(row);
      }
    });

    // Clean text strings & standardize nulls
    const cleaned = deduplicated.map(row => {
      const newRow: Record<string, any> = {};
      Object.entries(row).forEach(([k, v]) => {
        if (v === null || v === undefined) {
          newRow[k] = null;
        } else if (typeof v === 'string') {
          const trimmed = v.trim();
          if (['null', 'NULL', 'n/a', 'N/A', 'NaN', 'undefined', '-', '?'].includes(trimmed)) {
            newRow[k] = null;
          } else {
            newRow[k] = trimmed;
          }
        } else {
          newRow[k] = v;
        }
      });
      return newRow;
    });

    // Refresh columns
    const updatedCols = generateColumnsFromData(cleaned);
    setWorkingData(cleaned);
    setColumns(updatedCols);
    const dupsRemoved = initialRows - cleaned.length;
    showToast(`⚡ Auto-Cleaned: Removed ${dupsRemoved} duplicates & standardized nulls across ${cleaned.length} rows.`);
  };

  // 2. Remove Duplicates
  const handleRemoveDuplicates = () => {
    if (!workingData) return;
    const initialRows = workingData.length;
    const seen = new Set<string>();
    const cleaned = workingData.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const removed = initialRows - cleaned.length;
    setWorkingData(cleaned);
    showToast(`🧹 Deduplication complete: Removed ${removed} identical rows.`);
  };

  // 3. Drop all rows with null values
  const handleDropNullRows = () => {
    if (!workingData) return;
    const initialRows = workingData.length;
    const cleaned = workingData.filter(row => {
      return Object.values(row).every(v => v !== null && v !== undefined && v !== '');
    });
    const dropped = initialRows - cleaned.length;
    setWorkingData(cleaned);
    setColumns(generateColumnsFromData(cleaned));
    showToast(`🩹 Dropped ${dropped} incomplete rows.`);
  };

  // 4. Impute missing values
  const handleApplyImputation = () => {
    if (!workingData || !selectedImputeCol) return;
    const cleaned = imputeMissing(
      workingData,
      selectedImputeCol,
      imputeStrategy,
      imputeStrategy === 'custom' ? customImputeVal : undefined
    );
    setWorkingData(cleaned);
    setColumns(generateColumnsFromData(cleaned));
    showToast(`🎯 Imputed missing values for '${selectedImputeCol}' via ${imputeStrategy.toUpperCase()}`);
  };

  // 5. Text Transformation
  const handleApplyTextTransform = () => {
    if (!workingData || !textColTarget) return;
    const cleaned = workingData.map(row => {
      const val = row[textColTarget];
      if (typeof val !== 'string') return row;
      let transformed = val;
      if (textTransformOp === 'trim') transformed = val.trim();
      else if (textTransformOp === 'upper') transformed = val.toUpperCase();
      else if (textTransformOp === 'lower') transformed = val.toLowerCase();
      else if (textTransformOp === 'title') transformed = val.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      else if (textTransformOp === 'clean_special') transformed = val.replace(/[^\w\s-]/gi, '').trim();
      return { ...row, [textColTarget]: transformed };
    });
    setWorkingData(cleaned);
    showToast(`🔤 Transformed text in '${textColTarget}' using ${textTransformOp}`);
  };

  // 6. Feature Engineering / Math formula
  const handleCreateFormula = () => {
    if (!workingData || !formulaColName.trim() || !formulaBaseCol) return;
    const newColKey = formulaColName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const factor = Number(formulaFactor) || 1;

    const cleaned = workingData.map(row => {
      const base = Number(row[formulaBaseCol]) || 0;
      let res = 0;
      if (formulaOp === '+') res = base + factor;
      else if (formulaOp === '-') res = base - factor;
      else if (formulaOp === '*') res = base * factor;
      else if (formulaOp === '/') res = factor !== 0 ? base / factor : 0;
      else if (formulaOp === 'log') res = base > 0 ? Math.log(base) : 0;
      return {
        ...row,
        [newColKey]: round(res, 3),
      };
    });

    setWorkingData(cleaned);
    setColumns(generateColumnsFromData(cleaned));
    setFormulaColName('');
    showToast(`➕ Generated new calculated variable '${newColKey}'`);
  };

  // 7. Drop specific column
  const handleDropColumn = (colName: string) => {
    if (!workingData) return;
    const cleaned = workingData.map(row => {
      const copy = { ...row };
      delete copy[colName];
      return copy;
    });
    setWorkingData(cleaned);
    setColumns(columns.filter(c => c.name !== colName));
    showToast(`🗑️ Removed column '${colName}'`);
  };

  // 8. Override column data type
  const handleUpdateColumnType = (colId: string, newType: ColumnDataType) => {
    if (!workingData) return;
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, type: newType } : c));
    setEditingColType(null);
    showToast(`Updated column type to ${newType}`);
  };

  // 9. Reset working changes back to original upload
  const handleResetToOriginal = () => {
    if (!rawUploadedData) return;
    setWorkingData(rawUploadedData);
    setColumns(generateColumnsFromData(rawUploadedData));
    showToast('Reset data back to original uploaded state.');
  };

  // ================= SAVE & LAUNCH WORKFLOWS =================
  const handleSaveAndLaunchAnalysis = () => {
    if (!workingData || workingData.length === 0) return;

    const newDataset: Dataset = {
      id: `ds_upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: datasetTitle.trim() || `Uploaded Dataset (${fileName || 'Custom'})`,
      description: datasetDesc.trim() || `User-imported dataset with ${workingData.length} records and ${columns.length} columns.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: (fileFormat === 'xlsx' || fileFormat === 'xls' ? 'excel' : fileFormat === 'json' ? 'json' : 'csv') as any,
      columns: columns,
      data: workingData,
    };

    onCreateDataset(newDataset);
    showToast(`🚀 Dataset '${newDataset.name}' activated! Launching Analysis Hub...`);
    setTimeout(() => {
      onNavigateToAnalysis();
    }, 400);
  };

  const handleSaveAndLaunchGrid = () => {
    if (!workingData || workingData.length === 0) return;

    const newDataset: Dataset = {
      id: `ds_upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: datasetTitle.trim() || `Uploaded Dataset (${fileName || 'Custom'})`,
      description: datasetDesc.trim() || `User-imported dataset with ${workingData.length} records.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceType: (fileFormat === 'xlsx' || fileFormat === 'xls' ? 'excel' : fileFormat === 'json' ? 'json' : 'csv') as any,
      columns: columns,
      data: workingData,
    };

    onCreateDataset(newDataset);
    showToast(`📊 Opening '${newDataset.name}' in Grid Editor...`);
    setTimeout(() => {
      onNavigateToGrid();
    }, 400);
  };

  // Calculate quick summary metrics for working data
  const dataMetrics = useMemo(() => {
    if (!workingData || workingData.length === 0) return null;
    const totalCells = workingData.length * columns.length;
    let nullCells = 0;
    workingData.forEach(row => {
      columns.forEach(col => {
        const v = row[col.name];
        if (v === null || v === undefined || v === '') nullCells++;
      });
    });
    const completeness = totalCells > 0 ? ((totalCells - nullCells) / totalCells) * 100 : 100;
    const numCols = columns.filter(c => c.type === 'number').length;
    const catCols = columns.filter(c => c.type === 'category' || c.type === 'string').length;

    return {
      rowCount: workingData.length,
      colCount: columns.length,
      nullCells,
      completeness: round(completeness, 1),
      numCols,
      catCols,
    };
  }, [workingData, columns]);

  // Live Data Quality Report
  const qualityReport = useMemo(() => {
    return analyzeDataQuality(workingData || [], columns);
  }, [workingData, columns]);

  const handleQualityCleanup = (cleanedData: Record<string, any>[], updatedCols: ColumnMeta[], message: string) => {
    setWorkingData(cleanedData);
    setColumns(updatedCols);
    showToast(message);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-900/90 text-white border border-indigo-500/50 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Main Mode Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Upload, Clean & Analyze Custom Data</h2>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Direct Ingestion
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Upload your own CSV, Excel spreadsheets, or JSON files. Clean and normalize missing values, deduplicate records, engineer features, and immediately execute comprehensive statistical and visual analyses on your data.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setIngestMode('upload')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                ingestMode === 'upload'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>File Upload</span>
            </button>
            <button
              onClick={() => setIngestMode('paste')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                ingestMode === 'paste'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Paste Data</span>
            </button>
            <button
              onClick={() => setIngestMode('qualitative')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                ingestMode === 'qualitative'
                  ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-rose-300/80 hover:text-rose-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
              <span>Qualitative & Transcripts</span>
            </button>
            <button
              onClick={() => setIngestMode('library')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                ingestMode === 'library'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>My Uploads ({uploadedDatasets.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ================= INGEST MODE 1: FILE UPLOAD ================= */}
      {ingestMode === 'upload' && !workingData && (
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 ${
              dragActive
                ? 'border-indigo-500 bg-indigo-950/20 scale-[1.01]'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json,.tsv,.txt"
              className="hidden"
              onChange={handleFileInputChange}
            />
            
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4 shadow-xl shadow-indigo-600/10">
              <UploadCloud className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Drop your custom data file here, or <span className="text-indigo-400 underline decoration-indigo-500/50">browse files</span>
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              Supported formats: Comma-Separated Values (<span className="text-slate-300 font-mono">.csv</span>), Microsoft Excel (<span className="text-slate-300 font-mono">.xlsx, .xls</span>), Tab-Separated (<span className="text-slate-300 font-mono">.tsv</span>), or Structured JSON (<span className="text-slate-300 font-mono">.json</span>).
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multi-Sheet Excel</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto Delimiter & Quotes</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Smart Type Inference</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
                <Wand2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Pre-Analysis Cleaning Suite</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= INGEST MODE 2: PASTE RAW DATA ================= */}
      {ingestMode === 'paste' && !workingData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Paste Table Data or JSON
              </h3>
              <p className="text-xs text-slate-400">
                Paste tabular records copied directly from Google Sheets, Excel, or formatted JSON arrays.
              </p>
            </div>

            {/* Delimiter Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Format:</span>
              <select
                value={pasteDelimiter}
                onChange={e => setPasteDelimiter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value=",">CSV (Comma-Separated)</option>
                <option value="&#9;">TSV (Tab-Separated / Excel / Sheets)</option>
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
                <option value="json">JSON Array</option>
              </select>
            </div>
          </div>

          <textarea
            rows={10}
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={
              pasteDelimiter === 'json'
                ? `[\n  { "customer_id": 101, "age": 29, "spending_score": 85, "churned": false },\n  { "customer_id": 102, "age": 42, "spending_score": 42, "churned": true }\n]`
                : `customer_id,age,annual_income,spending_score,segment\n1,19,15000,39,Budget\n2,21,15000,81,Impulse\n3,20,16000,6,Budget\n4,23,16000,77,Impulse\n5,31,17000,40,Standard`
            }
            className="w-full font-mono text-xs p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setPasteText('')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleProcessPaste}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Process & Inspect</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= INGEST MODE 3: QUALITATIVE TRANSCRIPTS & OPEN-ENDED TEXT ================= */}
      {ingestMode === 'qualitative' && !workingData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-rose-400" />
                Ingest Qualitative Transcripts, Open-Ended Surveys & Feedback
              </h3>
              <p className="text-xs text-slate-400">
                Paste raw interview transcripts, user stories, customer reviews, or support notes for thematic coding and qualitative synthesis.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Structure:</span>
              <select
                value={qualitativeFormat}
                onChange={e => setQualitativeFormat(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-rose-500 font-medium"
              >
                <option value="paragraphs">Paragraphs (Blank Line Separated)</option>
                <option value="speakers">Speaker Turns ("Speaker: Text")</option>
                <option value="lines">One Response Per Line</option>
                <option value="json">JSON Array of Quotes/Objects</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-200">
              <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Need test data? Load our verified qualitative customer feedback study with 18 authentic responses.</span>
            </div>
            <button
              onClick={handleLoadQualitativeSample}
              className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 font-bold transition-all shrink-0"
            >
              Load Qualitative Study Sample
            </button>
          </div>

          <textarea
            rows={10}
            value={qualitativeText}
            onChange={e => setQualitativeText(e.target.value)}
            placeholder={
              qualitativeFormat === 'speakers'
                ? `Participant 1: The automated cleaning recipes saved our team dozens of hours.\n\nInterviewer: How did the interface feel to navigate?\n\nParticipant 1: Extremely intuitive, though I wish search was faster.`
                : qualitativeFormat === 'lines'
                ? `Customer support resolved our issue within minutes.\nThe mobile app crashes frequently during large file uploads.\nGreat visual dashboards, would love dark mode by default.\nnone`
                : `The automated data transformation recipes saved our engineering team dozens of manual hours. The interface is intuitive, fast, and extremely reliable for our weekly pipeline runs.\n\nThe dashboard feels slow and unresponsive when rendering large pivot tables over 50,000 rows. It freezes the browser tab and causes major frustration.\n\nI love how clean the visual design is. It would be amazing if we could export interactive PDF dossiers directly with custom client logos.`
            }
            className="w-full font-mono text-xs p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setQualitativeText('')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleProcessQualitative}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Parse into Qualitative Dataset</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= INGEST MODE 3: MY UPLOADED DATASETS LIBRARY ================= */}
      {ingestMode === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">My Uploaded Datasets Library</h3>
              <p className="text-xs text-slate-400">All custom data files previously imported into your session.</p>
            </div>
            <button
              onClick={() => setIngestMode('upload')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New File</span>
            </button>
          </div>

          {uploadedDatasets.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Database className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No custom data uploaded yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You are currently viewing pre-loaded benchmark datasets. Click below to upload your own CSV or Excel data.
              </p>
              <button
                onClick={() => setIngestMode('upload')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-2 mt-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload My Data Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedDatasets.map(ds => {
                const isActive = activeDataset?.id === ds.id;
                return (
                  <div
                    key={ds.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      isActive
                        ? 'bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-950/40'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white line-clamp-1">{ds.name}</h4>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.2 rounded bg-slate-800 text-slate-300">
                              {ds.sourceType}
                            </span>
                          </div>
                        </div>
                        {isActive && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2">{ds.description}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                        <span>{ds.data.length.toLocaleString()} rows</span>
                        <span>•</span>
                        <span>{ds.columns.length} columns</span>
                        <span>•</span>
                        <span>{new Date(ds.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            onSelectDataset(ds.id);
                            onNavigateToAnalysis();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold transition-all shadow-sm"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Analyze</span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectDataset(ds.id);
                            onNavigateToGrid();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                        >
                          <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Grid</span>
                        </button>
                        {onShareDataset && (
                          <button
                            onClick={() => onShareDataset(ds)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-colors"
                            title="Share this dataset with co-workers"
                          >
                            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Share</span>
                          </button>
                        )}
                      </div>

                      {datasets.length > 1 && (
                        <button
                          onClick={() => onDeleteDataset(ds.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Delete Dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= WORKSPACE: ACTIVE UPLOADED DATA INSPECTOR & CLEANING STUDIO ================= */}
      {workingData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Stage Bar with Metrics & Multi-Sheet Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={datasetTitle}
                    onChange={e => setDatasetTitle(e.target.value)}
                    className="text-lg font-bold text-white bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 max-w-md w-full"
                    placeholder="Dataset Name..."
                  />
                  <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                    {fileFormat.toUpperCase() || 'CUSTOM'}
                  </span>
                </div>
                <input
                  type="text"
                  value={datasetDesc}
                  onChange={e => setDatasetDesc(e.target.value)}
                  className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-slate-800 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-full max-w-xl"
                  placeholder="Add an optional description for this custom dataset..."
                />
              </div>

              {/* Excel Multi-Sheet Switcher */}
              {excelSheets && Object.keys(excelSheets).length > 1 && (
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">Sheet:</span>
                  <select
                    value={selectedSheet}
                    onChange={e => handleSheetSwitch(e.target.value)}
                    className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                  >
                    {Object.keys(excelSheets).map(sheet => (
                      <option key={sheet} value={sheet} className="bg-slate-900 text-white">
                        {sheet} ({excelSheets[sheet].data.length} rows)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons: Reset, Share or Launch */}
              <div className="flex items-center gap-2.5 shrink-0">
                {onShareDataset && workingData && (
                  <button
                    onClick={() => {
                      const tempDataset: Dataset = {
                        id: activeDataset?.id || `ds_${Date.now()}`,
                        name: datasetTitle || 'Working Dataset',
                        description: datasetDesc || 'Cleaned and prepared custom dataset',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        sourceType: (fileFormat as any) || 'csv',
                        columns: columns,
                        data: workingData
                      };
                      onShareDataset(tempDataset);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
                    title="Share this cleaned working dataset with co-workers"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Share with Team</span>
                  </button>
                )}
                <button
                  onClick={handleResetToOriginal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                  title="Revert all cleaning changes back to uploaded raw file"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={() => {
                    setWorkingData(null);
                    setRawUploadedData(null);
                    setExcelSheets(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Different</span>
                </button>
                <button
                  onClick={handleSaveAndLaunchAnalysis}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Save & Analyze Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Metrics KPI Ribbons */}
            {dataMetrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                
                {/* Health & Score Pill */}
                <button
                  onClick={() => setCleanStep('quality')}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 transition-all text-left group cursor-pointer"
                  title="Click to view full Data Quality Diagnostic"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-teal-400" />
                      Quality Score
                    </span>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      Grade {qualityReport.grade}
                    </span>
                  </div>
                  <span className={`text-base font-bold ${qualityReport.gradeColor} group-hover:scale-105 transition-transform block`}>
                    {qualityReport.score}%
                  </span>
                </button>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Rows / Records</span>
                  <span className="text-base font-bold text-white">{dataMetrics.rowCount.toLocaleString()}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Features / Columns</span>
                  <span className="text-base font-bold text-indigo-400">{dataMetrics.colCount} cols</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Duplicates</span>
                  <span className={`text-base font-bold ${qualityReport.duplicateRowCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {qualityReport.duplicateRowCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Completeness</span>
                  <span className={`text-base font-bold ${qualityReport.completenessScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {qualityReport.completenessScore}%
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase">Missing Cells</span>
                  <span className={`text-base font-bold ${qualityReport.totalMissingCells === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {qualityReport.totalMissingCells.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-Step Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => setCleanStep('quality')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  cleanStep === 'quality'
                    ? 'bg-gradient-to-r from-indigo-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Data Quality Summary ({qualityReport.score}%)</span>
                {qualityReport.issues.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30">
                    {qualityReport.issues.length} {qualityReport.issues.length === 1 ? 'issue' : 'issues'}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCleanStep('preview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  cleanStep === 'preview'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>1. Data Preview & Schema ({columns.length} cols)</span>
              </button>
              <button
                onClick={() => setCleanStep('clean')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  cleanStep === 'clean'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>2. Clean & Preprocess (Impute / Deduplicate)</span>
              </button>
              <button
                onClick={() => setCleanStep('transform')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  cleanStep === 'transform'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>3. Feature Engineering & Math Formulas</span>
              </button>
            </div>

          </div>

          {/* ================= STEP 0: DATA QUALITY & HEALTH DIAGNOSTIC PANEL ================= */}
          {cleanStep === 'quality' && (
            <DataQualityPanel
              data={workingData}
              columns={columns}
              onApplyCleanup={handleQualityCleanup}
              onNavigateToPreview={() => setCleanStep('preview')}
            />
          )}

          {/* ================= STEP 1: PREVIEW & SCHEMA INSPECTOR ================= */}
          {cleanStep === 'preview' && (
            <div className="space-y-6">
              
              {/* Quick Auto-Clean Callout Bar */}
              <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-cyan-950/60 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Instant Data Sanitization</h4>
                    <p className="text-[11px] text-slate-400">One-click removal of duplicates, string whitespace trimming, and null standardization.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoCleanAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ 1-Click Auto Clean</span>
                  </button>
                  <button
                    onClick={handleRemoveDuplicates}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Scissors className="w-3.5 h-3.5 text-teal-400" />
                    <span>Deduplicate</span>
                  </button>
                  <button
                    onClick={handleDropNullRows}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Drop Nulls</span>
                  </button>
                </div>
              </div>

              {/* Column Schema Configuration Cards */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Detected Columns & Data Types ({columns.length})
                    </h3>
                    <p className="text-xs text-slate-400">Verify detected data types or override them before statistical execution.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {columns.map(col => {
                    const sample = col.sampleValues?.slice(0, 2).map(v => String(v)).join(', ');
                    return (
                      <div
                        key={col.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate" title={col.name}>{col.name}</span>
                            <button
                              onClick={() => handleDropColumn(col.name)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                              title="Drop column"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <select
                              value={col.type}
                              onChange={e => handleUpdateColumnType(col.id, e.target.value as ColumnDataType)}
                              className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="number">number</option>
                              <option value="string">string</option>
                              <option value="category">category</option>
                              <option value="date">date</option>
                              <option value="boolean">boolean</option>
                            </select>
                            {col.nullable && (
                              <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                                Has Nulls
                              </span>
                            )}
                          </div>
                        </div>

                        {sample && (
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            Ex: <span className="text-slate-400">{sample}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabular Data Preview Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">First 15 Rows Preview</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Showing 1–{Math.min(15, workingData.length)} of {workingData.length.toLocaleString()} records
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[420px] no-scrollbar">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-slate-950/90 text-slate-300 sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold text-slate-500 w-12 text-center">#</th>
                        {columns.map(c => (
                          <th key={c.id} className="py-2.5 px-4 font-semibold text-slate-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{c.name}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-indigo-300 font-normal">
                                {c.type}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {workingData.slice(0, 15).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 text-slate-500 text-center">{idx + 1}</td>
                          {columns.map(c => {
                            const val = row[c.name];
                            const isNull = val === null || val === undefined || val === '';
                            return (
                              <td key={c.id} className="py-2 px-4 whitespace-nowrap">
                                {isNull ? (
                                  <span className="text-[10px] text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded italic">
                                    null
                                  </span>
                                ) : (
                                  <span className="text-slate-300">{String(val)}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ================= STEP 2: CLEANING & IMPUTATION TOOLBAR ================= */}
          {cleanStep === 'clean' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Missing Value Imputation */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Missing Value Imputation</h4>
                      <p className="text-xs text-slate-400">Fill empty cells with statistical heuristics.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Target Feature</label>
                      <select
                        value={selectedImputeCol}
                        onChange={e => setSelectedImputeCol(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {columns.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.name} ({c.type}) {c.nullable ? '⚠️ has missing' : '✓ full'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Imputation Strategy</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['mean', 'median', 'mode', 'zero', 'custom'] as const).map(strat => (
                          <button
                            key={strat}
                            type="button"
                            onClick={() => setImputeStrategy(strat)}
                            className={`py-1.5 px-3 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                              imputeStrategy === strat
                                ? 'bg-teal-600 text-white font-bold shadow-sm'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {strat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {imputeStrategy === 'custom' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Custom Value</label>
                        <input
                          type="text"
                          value={customImputeVal}
                          onChange={e => setCustomImputeVal(e.target.value)}
                          placeholder="e.g. Unknown, N/A, or 0"
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    )}

                    <button
                      onClick={handleApplyImputation}
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply Imputation</span>
                    </button>
                  </div>
                </div>

                {/* 2. Text Normalization & Trimming */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Text Normalization</h4>
                      <p className="text-xs text-slate-400">Clean strings, strip punctuation, adjust casing.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Text Column</label>
                      <select
                        value={textColTarget}
                        onChange={e => setTextColTarget(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        {columns.filter(c => c.type === 'string' || c.type === 'category').map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Transformation</label>
                      <select
                        value={textTransformOp}
                        onChange={e => setTextTransformOp(e.target.value as any)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="trim">Trim Leading & Trailing Whitespace</option>
                        <option value="lower">lowercase (all characters)</option>
                        <option value="upper">UPPERCASE (all characters)</option>
                        <option value="title">Title Case (Capitalize Each Word)</option>
                        <option value="clean_special">Remove Special Characters / Symbols</option>
                      </select>
                    </div>

                    <button
                      onClick={handleApplyTextTransform}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 mt-4"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Execute Text Transform</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ================= STEP 3: FEATURE ENGINEERING & FORMULA COLUMNS ================= */}
          {cleanStep === 'transform' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Calculated Variable Generator
                </h3>
                <p className="text-xs text-slate-400">Engineer new mathematical features from existing numerical columns.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">New Variable Name</label>
                  <input
                    type="text"
                    placeholder="e.g. revenue_adj"
                    value={formulaColName}
                    onChange={e => setFormulaColName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Column</label>
                  <select
                    value={formulaBaseCol}
                    onChange={e => setFormulaBaseCol(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {columns.filter(c => c.type === 'number').map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Operation & Factor</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={formulaOp}
                      onChange={e => setFormulaOp(e.target.value as any)}
                      className="px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
                    >
                      <option value="*">Multiply (*)</option>
                      <option value="/">Divide (/)</option>
                      <option value="+">Add (+)</option>
                      <option value="-">Subtract (-)</option>
                      <option value="log">Natural Log ln()</option>
                    </select>
                    {formulaOp !== 'log' && (
                      <input
                        type="number"
                        step="any"
                        value={formulaFactor}
                        onChange={e => setFormulaFactor(e.target.value)}
                        className="w-20 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <button
                    onClick={handleCreateFormula}
                    className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Column</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Launch Action Bar */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-cyan-950/70 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Ready for Deep Statistical Analysis?</h4>
                <p className="text-xs text-slate-400">Save this cleaned custom dataset and immediately access EDA, Anomaly Detection, Hypothesis Testing & Visualization Studios.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSaveAndLaunchGrid}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                <TableIcon className="w-4 h-4 text-emerald-400" />
                <span>Open in Grid</span>
              </button>
              <button
                onClick={handleSaveAndLaunchAnalysis}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze Dataset Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
