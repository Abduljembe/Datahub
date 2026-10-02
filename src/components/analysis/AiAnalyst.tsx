import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  Filter, 
  Calculator, 
  Wand2, 
  Terminal, 
  FileText, 
  RefreshCw, 
  Copy, 
  Check, 
  ArrowRight,
  Trash2,
  Table
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dataset, ColumnMeta } from '../../types';
import { 
  requestDataCopilotQuery, 
  DataCopilotResponse, 
  DataCopilotFilter, 
  DataCopilotComputedColumn, 
  DataCopilotCleaningAction 
} from '../../services/geminiService';
import { createDatasetSnapshot } from '../../utils/versionEngine';

interface AiAnalystProps {
  dataset: Dataset;
  onUpdateDataset?: (updated: Dataset) => void;
  onNavigateTool?: (toolId: any) => void;
  isDark?: boolean;
}

interface ChatMessage {
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

const PROMPT_SUGGESTIONS = [
  'What are the strongest correlation drivers in this dataset?',
  'Detect statistical anomalies, outliers, or suspicious data patterns.',
  'Filter rows to show high-performance outlier records.',
  'Calculate a computed ratio or profit margin column for this dataset.',
  'Provide a 3-bullet executive summary and tactical next steps.',
];

export const AiAnalyst: React.FC<AiAnalystProps> = ({ 
  dataset, 
  onUpdateDataset,
  onNavigateTool,
  isDark = true 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate initial overview on load or dataset change
  useEffect(() => {
    let isSubscribed = true;

    const generateInitialBrief = async () => {
      setLoading(true);
      try {
        const res = await requestDataCopilotQuery(
          dataset,
          'Provide a comprehensive statistical audit and overview of this dataset, highlighting key distributions, correlations, and business takeaways.',
          []
        );

        if (isSubscribed) {
          const welcomeMsg: ChatMessage = {
            id: 'msg_welcome_' + Date.now(),
            sender: 'ai',
            text: res.narrative,
            keyTakeaways: res.keyTakeaways,
            suggestedFilter: res.suggestedFilter,
            suggestedComputedColumn: res.suggestedComputedColumn,
            suggestedCleaningAction: res.suggestedCleaningAction,
            suggestedSql: res.suggestedSql,
            followUpQuestions: res.followUpQuestions,
            isAiGenerated: res.isAiGenerated,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages([welcomeMsg]);
        }
      } catch (err: any) {
        if (isSubscribed) {
          setMessages([
            {
              id: 'msg_err',
              sender: 'ai',
              text: `### Statistical Summary for ${dataset.name}\n\n- **Rows**: ${dataset.data.length}\n- **Features**: ${dataset.columns.length} columns\n\nAsk me any specific question about your data columns, statistical distributions, or request an automated filter rule!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          ]);
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    generateInitialBrief();

    return () => {
      isSubscribed = false;
    };
  }, [dataset.id]);

  const handleSendMessage = async (promptToSend?: string) => {
    const prompt = (promptToSend || inputPrompt).trim();
    if (!prompt || loading) return;

    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const history = messages.slice(-4).map(m => ({ sender: m.sender, text: m.text }));
      const res = await requestDataCopilotQuery(dataset, prompt, history);

      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        text: res.narrative,
        keyTakeaways: res.keyTakeaways,
        suggestedFilter: res.suggestedFilter,
        suggestedComputedColumn: res.suggestedComputedColumn,
        suggestedCleaningAction: res.suggestedCleaningAction,
        suggestedSql: res.suggestedSql,
        followUpQuestions: res.followUpQuestions,
        isAiGenerated: res.isAiGenerated,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'msg_err_' + Date.now(),
          sender: 'ai',
          text: 'Encountered an issue querying the AI model. Please verify server connectivity or try a different question.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Apply Filter in Place
  const handleApplyFilter = (msgId: string, filterConfig: DataCopilotFilter) => {
    if (!onUpdateDataset) {
      showToast('Dataset updater not available.');
      return;
    }

    try {
      const { column, operator, value } = filterConfig;
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
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, appliedAction: `Filter Applied (${filteredData.length} rows)` } : m));
      confetti({ particleCount: 35, spread: 50 });
      showToast(`✓ Filter applied! Dataset updated to ${filteredData.length} records.`);
    } catch (err: any) {
      showToast(`Error: ${err?.message || err}`);
    }
  };

  // Add Computed Column
  const handleAddComputedColumn = (msgId: string, compCol: DataCopilotComputedColumn) => {
    if (!onUpdateDataset) return;

    try {
      const colName = compCol.name.trim().replace(/\s+/g, '_');
      const exists = dataset.columns.some(c => c.name.toLowerCase() === colName.toLowerCase());
      const finalColName = exists ? `${colName}_ai` : colName;

      const updatedData = dataset.data.map(row => {
        let computedVal: any = null;
        try {
          const evalFn = new Function('row', `try { return ${compCol.jsExpression}; } catch(e) { return null; }`);
          computedVal = evalFn(row);
          if (typeof computedVal === 'number' && !isNaN(computedVal)) {
            computedVal = Math.round(computedVal * 100) / 100;
          }
        } catch {
          computedVal = null;
        }
        return { ...row, [finalColName]: computedVal };
      });

      const newColumnMeta: ColumnMeta = {
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: finalColName,
        type: compCol.targetType || 'number',
        nullable: true,
        description: compCol.description || `Computed formula: ${compCol.formula}`
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
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, appliedAction: `Feature [${finalColName}] Added` } : m));
      confetti({ particleCount: 40, spread: 60 });
      showToast(`✓ Column '${finalColName}' successfully added!`);
    } catch (err: any) {
      showToast(`Error: ${err?.message || err}`);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg animate-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Gemini AI Statistical Copilot & Natural Language Analyst
            </h2>
            <p className="text-xs text-slate-400">
              Ask natural language questions to uncover hidden correlations, detect data hygiene problems, filter rows, and engineer new features.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSendMessage('Run a complete automated statistical health check and suggest optimization strategies.')}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-Analyze Dataset</span>
          </button>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {PROMPT_SUGGESTIONS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-white text-xs text-left transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Lightbulb className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Main Conversation Thread */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl flex flex-col h-[580px]">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {messages.map(msg => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    isAi
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-2xl rounded-2xl p-4.5 space-y-3.5 text-xs leading-relaxed shadow-md ${
                    isAi
                      ? 'bg-slate-950 border border-slate-800 text-slate-200'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] opacity-75 border-b border-white/10 pb-1.5 mb-1">
                    <span className="font-semibold">{isAi ? 'Gemini Copilot' : 'You'}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Text */}
                  <div className="space-y-2 whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Key Takeaways */}
                  {msg.keyTakeaways && msg.keyTakeaways.length > 0 && (
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
                      <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        🎯 Key Takeaways:
                      </div>
                      <ul className="space-y-1">
                        {msg.keyTakeaways.map((point, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5 text-xs opacity-90">
                            <span className="text-cyan-400">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Filter Card */}
                  {msg.suggestedFilter && (
                    <div className="p-3 rounded-xl border border-indigo-500/40 bg-indigo-950/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5" />
                          Parsed Filter:
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
                          {msg.suggestedFilter.column} {msg.suggestedFilter.operator} {String(msg.suggestedFilter.value)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{msg.suggestedFilter.description}</p>
                      {msg.appliedAction ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>{msg.appliedAction}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApplyFilter(msg.id, msg.suggestedFilter!)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <Filter className="w-3.5 h-3.5" />
                          <span>Apply Filter to Dataset</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Suggested Computed Column Card */}
                  {msg.suggestedComputedColumn && (
                    <div className="p-3 rounded-xl border border-teal-500/40 bg-teal-950/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5" />
                          Feature Engineering Recipe:
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-200">
                          {msg.suggestedComputedColumn.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{msg.suggestedComputedColumn.description}</p>
                      {msg.appliedAction ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>{msg.appliedAction}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddComputedColumn(msg.id, msg.suggestedComputedColumn!)}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Add Column '{msg.suggestedComputedColumn.name}' to Dataset</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* SQL Snippet */}
                  {msg.suggestedSql && (
                    <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 font-mono text-[11px] text-emerald-300 overflow-x-auto flex items-center justify-between">
                      <code>{msg.suggestedSql}</code>
                      {onNavigateTool && (
                        <button
                          onClick={() => onNavigateTool('sql')}
                          className="ml-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-sans font-semibold shrink-0"
                        >
                          Run in SQL
                        </button>
                      )}
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested Queries:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followUpQuestions.map((fq, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(fq)}
                            disabled={loading}
                            className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white"
                          >
                            ↳ {fq}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy Button */}
                  {isAi && (
                    <div className="pt-2 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-purple-400 font-mono p-3 bg-purple-950/20 rounded-xl border border-purple-500/20">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Gemini Copilot is analyzing parameters, calculating correlations, and formulating strategic insights...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
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
              placeholder="Ask anything (e.g. 'What are the top 3 drivers of churn?', 'Filter rows where revenue > 50k')..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask Copilot</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
