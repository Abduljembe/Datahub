import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  Copy, 
  Check, 
  Filter, 
  Calculator, 
  Wand2, 
  Terminal, 
  FileText, 
  RefreshCw, 
  ArrowRight,
  Database,
  SlidersHorizontal,
  Download,
  Trash2,
  Table
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dataset, ColumnMeta, DatasetVersion } from '../../types';
import { 
  requestDataCopilotQuery, 
  cleanCopilotText,
  DataCopilotResponse, 
  DataCopilotFilter, 
  DataCopilotComputedColumn, 
  DataCopilotCleaningAction 
} from '../../services/geminiService';
import { createDatasetSnapshot } from '../../utils/versionEngine';

interface AiDataCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset | null;
  onUpdateDataset: (updated: Dataset) => void;
  onNavigateTab?: (tab: string) => void;
  isDark?: boolean;
}

interface CopilotMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  keyTakeaways?: string[];
  suggestedFilter?: DataCopilotFilter | null;
  suggestedComputedColumn?: DataCopilotComputedColumn | null;
  suggestedCleaningAction?: DataCopilotCleaningAction | null;
  suggestedSql?: string;
  followUpQuestions?: string[];
  isAiGenerated?: boolean;
  timestamp: string;
  appliedAction?: string;
}

const QUICK_PROMPTS = [
  { label: 'Key Variance Drivers', prompt: 'What are the top correlation drivers and variance factors in this dataset?' },
  { label: 'Detect Anomalies', prompt: 'Detect statistical anomalies, outliers, and data hygiene problems in my rows.' },
  { label: 'Filter Top Performers', prompt: 'Filter rows to show top quartile high-performance records.' },
  { label: 'Compute Margin / Ratio', prompt: 'Suggest and calculate a useful computed ratio column for this dataset.' },
  { label: 'Executive Memo', prompt: 'Generate an executive narrative brief with strategic recommendations.' }
];

export const AiDataCopilotModal: React.FC<AiDataCopilotModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  onNavigateTab,
  isDark = true,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initialize initial message on open if messages are empty
  useEffect(() => {
    if (isOpen && messages.length === 0 && dataset) {
      const initWelcome: CopilotMessage = {
        id: 'msg_init_' + Date.now(),
        sender: 'ai',
        text: `👋 Welcome to DataHub AI Copilot\n\nI am your AI Statistical & Data Science Partner. I have ingested ${dataset.name} (${dataset.data.length.toLocaleString()} rows, ${dataset.columns.length} columns).\n\nYou can ask me natural language questions about your data, tell me to filter rows, request feature engineering / computed columns, or ask for an executive narrative brief.`,
        keyTakeaways: [
          `Dataset: ${dataset.name}`,
          `${dataset.data.length} observations ready for natural language query`,
          `${dataset.columns.filter(c => c.type === 'number').length} numeric parameters analyzed`
        ],
        followUpQuestions: [
          'What are the strongest correlation drivers in this data?',
          'Filter rows where values are above the average',
          'Calculate a performance ratio index column'
        ],
        isAiGenerated: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([initWelcome]);
    }
  }, [isOpen, dataset?.id]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim();
    if (!promptToSend || loading || !dataset) return;

    const userMessage: CopilotMessage = {
      id: 'msg_u_' + Date.now(),
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputPrompt('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-4).map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const res: DataCopilotResponse = await requestDataCopilotQuery(dataset, promptToSend, historyPayload);

      const aiMessage: CopilotMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: cleanCopilotText(res.narrative),
        keyTakeaways: res.keyTakeaways?.map(cleanCopilotText),
        suggestedFilter: res.suggestedFilter,
        suggestedComputedColumn: res.suggestedComputedColumn,
        suggestedCleaningAction: res.suggestedCleaningAction,
        suggestedSql: res.suggestedSql,
        followUpQuestions: res.followUpQuestions?.map(cleanCopilotText),
        isAiGenerated: res.isAiGenerated,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      const errMsg: CopilotMessage = {
        id: 'msg_err_' + Date.now(),
        sender: 'ai',
        text: `⚠️ Notice\nCould not process the query through the upstream AI model. Please verify server connectivity or try another query.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Action: Execute and Apply Filter to Active Dataset
  const handleApplyFilter = (msgId: string, filterConfig: DataCopilotFilter) => {
    if (!dataset) return;

    try {
      const { column, operator, value } = filterConfig;
      const originalCount = dataset.data.length;

      const filteredData = dataset.data.filter(row => {
        const rowVal = row[column];
        if (rowVal === undefined || rowVal === null) return false;

        if (operator === '>') return Number(rowVal) > Number(value);
        if (operator === '<') return Number(rowVal) < Number(value);
        if (operator === '>=') return Number(rowVal) >= Number(value);
        if (operator === '<=') return Number(rowVal) <= Number(value);
        if (operator === '==') return String(rowVal).toLowerCase() === String(value).toLowerCase();
        if (operator === '!=') return String(rowVal).toLowerCase() !== String(value).toLowerCase();
        if (operator === 'contains') return String(rowVal).toLowerCase().includes(String(value).toLowerCase());
        return true;
      });

      if (filteredData.length === 0) {
        showToast('⚠️ Filter matched 0 rows. Dataset was not modified.');
        return;
      }

      // Create snapshot version
      const { updatedDataset } = createDatasetSnapshot(
        {
          ...dataset,
          data: filteredData,
          updatedAt: new Date().toISOString()
        },
        {
          name: `vFiltered - ${filterConfig.description}`,
          tag: 'filtered',
          createdBy: 'Gemini AI Copilot'
        }
      );

      onUpdateDataset(updatedDataset);

      // Mark message action applied
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, appliedAction: `Filter Applied (${filteredData.length} of ${originalCount} rows)` } : m));

      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      showToast(`✓ Filter applied! Dataset updated to ${filteredData.length} matching rows.`);
    } catch (err: any) {
      showToast(`Failed to apply filter: ${err?.message || err}`);
    }
  };

  // 1-Click Action: Add Computed Column to Dataset
  const handleAddComputedColumn = (msgId: string, compCol: DataCopilotComputedColumn) => {
    if (!dataset) return;

    try {
      const colName = compCol.name.trim().replace(/\s+/g, '_');
      
      // Check if column already exists
      const exists = dataset.columns.some(c => c.name.toLowerCase() === colName.toLowerCase());
      const finalColName = exists ? `${colName}_ai` : colName;

      // Compute values for all rows
      const updatedData = dataset.data.map(row => {
        let computedVal: any = 0;
        try {
          // Safe evaluation using row keys
          const evalFn = new Function('row', `try { return ${compCol.jsExpression}; } catch(e) { return null; }`);
          computedVal = evalFn(row);
          if (typeof computedVal === 'number' && !isNaN(computedVal)) {
            computedVal = Math.round(computedVal * 100) / 100;
          }
        } catch {
          computedVal = null;
        }
        return {
          ...row,
          [finalColName]: computedVal
        };
      });

      const newColumnMeta: ColumnMeta = {
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: finalColName,
        type: compCol.targetType || 'number',
        nullable: true,
        description: compCol.description || `Computed via formula: ${compCol.formula}`
      };

      const { updatedDataset } = createDatasetSnapshot(
        {
          ...dataset,
          columns: [...dataset.columns, newColumnMeta],
          data: updatedData,
          updatedAt: new Date().toISOString()
        },
        {
          name: `vTransformed - Feature: ${finalColName}`,
          tag: 'transformed',
          createdBy: 'Gemini AI Copilot'
        }
      );

      onUpdateDataset(updatedDataset);

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, appliedAction: `Feature [${finalColName}] appended to all rows` } : m));

      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      showToast(`✓ Engineered feature '${finalColName}' successfully added to dataset!`);
    } catch (err: any) {
      showToast(`Failed to compute column: ${err?.message || err}`);
    }
  };

  // 1-Click Action: Execute Data Cleaning
  const handleApplyCleaning = (msgId: string, cleaning: DataCopilotCleaningAction) => {
    if (!dataset) return;

    try {
      const colName = cleaning.column;
      if (!colName) return;

      let updatedData = [...dataset.data];

      if (cleaning.type === 'impute_median') {
        const nums = dataset.data
          .map(r => Number(r[colName]))
          .filter(v => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);

        const median = nums.length > 0 ? nums[Math.floor(nums.length / 2)] : 0;

        updatedData = dataset.data.map(row => {
          const val = row[colName];
          if (val === null || val === undefined || val === '') {
            return { ...row, [colName]: median };
          }
          return row;
        });
      } else if (cleaning.type === 'drop_nulls') {
        updatedData = dataset.data.filter(row => {
          const val = row[colName];
          return val !== null && val !== undefined && val !== '';
        });
      } else if (cleaning.type === 'deduplicate') {
        const seen = new Set();
        updatedData = dataset.data.filter(row => {
          const key = JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      const { updatedDataset } = createDatasetSnapshot(
        {
          ...dataset,
          data: updatedData,
          updatedAt: new Date().toISOString()
        },
        {
          name: `vCleaned - ${cleaning.description}`,
          tag: 'cleaned',
          createdBy: 'Gemini AI Copilot'
        }
      );

      onUpdateDataset(updatedDataset);

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, appliedAction: `Cleaning Action Executed` } : m));

      showToast(`✓ Data cleaning executed successfully!`);
    } catch (err: any) {
      showToast(`Failed to execute cleaning: ${err?.message || err}`);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    const clean = cleanCopilotText(text);
    navigator.clipboard.writeText(clean);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Clean and render Copilot text without ## or ** markdown symbols
  const renderFormattedCopilotText = (rawText: string) => {
    if (!rawText) return null;
    const cleaned = cleanCopilotText(rawText);
    const paragraphs = cleaned.split('\n\n');

    return (
      <div className="space-y-3 font-sans">
        {paragraphs.map((para, pIdx) => {
          const trimmed = para.trim();
          if (!trimmed) return null;

          // Detect if paragraph is a section header (e.g. "1. Correlation Drivers", "Statistical Analysis: ...", "Variance & Dispersion Analysis")
          const isHeader = /^[0-9]+\.\s+[A-Za-z]/.test(trimmed) || 
            (/^[A-Z][A-Za-z0-9\s&—\-:()]{3,70}$/.test(trimmed) && !trimmed.startsWith('•') && !trimmed.includes('. ') && trimmed.length < 65);

          if (isHeader) {
            return (
              <div key={pIdx} className="font-bold text-xs sm:text-sm text-cyan-300 pt-1 tracking-tight">
                {trimmed}
              </div>
            );
          }

          // Detect bullet lists
          if (trimmed.startsWith('•') || trimmed.includes('\n•')) {
            const lines = trimmed.split('\n');
            return (
              <ul key={pIdx} className="space-y-1.5 pl-0.5">
                {lines.map((line, lIdx) => {
                  const cleanLine = line.replace(/^[•\*\-]\s*/, '').trim();
                  if (!cleanLine) return null;
                  return (
                    <li key={lIdx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                      <span className="text-cyan-400 shrink-0 font-bold mt-0.5">•</span>
                      <span>{cleanLine}</span>
                    </li>
                  );
                })}
              </ul>
            );
          }

          return (
            <p key={pIdx} className="leading-relaxed text-xs sm:text-[13px] text-slate-200 whitespace-pre-wrap">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  const handleClearChat = () => {
    if (confirm('Clear Copilot conversation history?')) {
      setMessages([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl h-[92vh] max-h-[860px] rounded-3xl border flex flex-col shadow-2xl overflow-hidden transition-all ${
          isDark 
            ? 'bg-slate-950 border-slate-800 text-slate-100 shadow-purple-950/20' 
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Modal Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
                  Gemini AI Data Copilot
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Natural Language Analyst
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Active Dataset: <strong className={isDark ? 'text-cyan-300' : 'text-cyan-700'}>{dataset?.name || 'None'}</strong></span>
                <span>•</span>
                <span>{dataset?.data.length.toLocaleString()} rows</span>
                <span>•</span>
                <span>{dataset?.columns.length} columns</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              title="Clear Conversation"
              className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-rose-400' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-600'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusNotification && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold px-4 py-2 text-center animate-in slide-in-from-top-2">
            {statusNotification}
          </div>
        )}

        {/* Quick Suggestion Chips */}
        <div className={`px-4 py-2.5 border-b overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0 ${
          isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-100/60 border-slate-200'
        }`}>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-purple-400" />
            Presets:
          </span>
          {QUICK_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.prompt)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isDark
                  ? 'bg-slate-900/90 hover:bg-purple-950/40 border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-purple-200'
                  : 'bg-white hover:bg-purple-50 border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 shadow-2xs'
              }`}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Conversation Thread */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {messages.map(msg => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    isAi
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                      : isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-300 text-slate-800'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Body Card */}
                <div
                  className={`max-w-2xl rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs leading-relaxed shadow-md ${
                    isAi
                      ? isDark 
                        ? 'bg-slate-900/90 border border-slate-800 text-slate-200' 
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-600/20'
                  }`}
                >
                  {/* Message Meta Header */}
                  <div className={`flex items-center justify-between text-[11px] pb-2 border-b ${
                    isAi 
                      ? isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                      : 'border-white/20 text-purple-100'
                  }`}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span>{isAi ? 'Gemini Copilot' : 'You'}</span>
                      {isAi && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md ${
                          msg.isAiGenerated
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {msg.isAiGenerated ? 'Gemini 3.8 Flash' : 'Statistical Heuristic Engine'}
                        </span>
                      )}
                    </div>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Content */}
                  <div className="space-y-2 font-sans text-xs sm:text-[13px] leading-relaxed">
                    {renderFormattedCopilotText(msg.text)}
                  </div>

                  {/* Key Takeaways Bullets */}
                  {msg.keyTakeaways && msg.keyTakeaways.length > 0 && (
                    <div className={`p-3 rounded-xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span>🎯 Key Takeaways:</span>
                      </div>
                      <ul className="space-y-1">
                        {msg.keyTakeaways.map((point, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5 text-xs opacity-90">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Interactive Action 1: Suggested Filter Card */}
                  {msg.suggestedFilter && (
                    <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                          <Filter className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Natural Language Filter Rule:</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                          {msg.suggestedFilter.column} {msg.suggestedFilter.operator} {String(msg.suggestedFilter.value)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {msg.suggestedFilter.description}
                      </p>

                      {msg.appliedAction ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                          <Check className="w-3.5 h-3.5" />
                          <span>{msg.appliedAction}</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApplyFilter(msg.id, msg.suggestedFilter!)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                          >
                            <Filter className="w-3.5 h-3.5" />
                            <span>Apply Filter to Dataset</span>
                          </button>
                          {onNavigateTab && (
                            <button
                              onClick={() => {
                                handleApplyFilter(msg.id, msg.suggestedFilter!);
                                onNavigateTab('grid');
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1"
                            >
                              <Table className="w-3.5 h-3.5 text-cyan-400" />
                              <span>View in Grid</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Action 2: Computed Column Card */}
                  {msg.suggestedComputedColumn && (
                    <div className="p-3.5 rounded-xl border border-teal-500/40 bg-teal-950/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                          <Calculator className="w-3.5 h-3.5 text-teal-400" />
                          <span>Engineered Feature Recipe:</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/30">
                          {msg.suggestedComputedColumn.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {msg.suggestedComputedColumn.description} (Formula: <code className="text-teal-300 bg-teal-950/80 px-1 py-0.5 rounded font-mono">{msg.suggestedComputedColumn.formula}</code>)
                      </p>

                      {msg.appliedAction ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                          <Check className="w-3.5 h-3.5" />
                          <span>{msg.appliedAction}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddComputedColumn(msg.id, msg.suggestedComputedColumn!)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-teal-600/30 flex items-center gap-1.5 transition-all"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Add Column '{msg.suggestedComputedColumn.name}' to Dataset</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Interactive Action 3: Data Cleaning Card */}
                  {msg.suggestedCleaningAction && (
                    <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/30 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Recommended Data Hygiene Fix:</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        {msg.suggestedCleaningAction.description}
                      </p>
                      {msg.appliedAction ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                          <Check className="w-3.5 h-3.5" />
                          <span>{msg.appliedAction}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApplyCleaning(msg.id, msg.suggestedCleaningAction!)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5 transition-all"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Execute Cleaning Action</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* SQL Snippet & Runner Link */}
                  {msg.suggestedSql && (
                    <div className={`p-3 rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          Equivalent SQL Expression:
                        </span>
                        <button
                          onClick={() => handleCopyText(`sql_${msg.id}`, msg.suggestedSql!)}
                          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-sans"
                        >
                          {copiedId === `sql_${msg.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === `sql_${msg.id}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <code className="text-xs font-mono text-emerald-300 block overflow-x-auto py-1">
                        {msg.suggestedSql}
                      </code>
                      {onNavigateTab && (
                        <div className="pt-2 border-t border-slate-800/80 flex justify-end">
                          <button
                            onClick={() => {
                              onNavigateTab('analysis');
                              onClose();
                            }}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                          >
                            <span>Open in SQL Console</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Follow-up Question Chips */}
                  {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Suggested Follow-Up Queries:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followUpQuestions.map((fq, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSendMessage(fq)}
                            disabled={loading}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] text-left transition-all ${
                              isDark
                                ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            <span>↳ {fq}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card Footer: Copy Full Answer */}
                  {isAi && (
                    <div className="pt-1.5 flex justify-end">
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className={`text-[11px] flex items-center gap-1 font-medium transition-colors ${
                          isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? 'Copied to Clipboard' : 'Copy Answer'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs font-mono text-purple-300 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              <span>Gemini AI is analyzing column distributions, evaluating mathematical rules, and formulating strategic insights...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className={`p-4 border-t shrink-0 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              placeholder="Ask anything (e.g. 'Show rows where score > 80', 'Calculate profit margin', 'Summarize key risks')..."
              className={`flex-1 px-4 py-3 rounded-2xl border text-xs sm:text-sm focus:outline-none transition-all ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 shadow-xs'
              }`}
            />
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Copilot</span>
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span>💡 Tip: Ask in plain English to filter rows, build computed columns, or generate executive briefs.</span>
            <span>Esc to close</span>
          </div>
        </div>

      </div>
    </div>
  );
};
