import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  Users,
  Search,
  CheckCircle2,
  Database,
  BarChart3,
  Table,
  Code,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MoreVertical,
  Plus,
  Pin,
  ExternalLink,
  Bot,
  Zap,
  Clock,
  Filter,
  Check
} from 'lucide-react';
import { 
  Dataset, 
  UserProfile, 
  Coworker, 
  ChatThread, 
  ChatMessage, 
  ChatDataAttachment 
} from '../../types';
import { 
  INITIAL_CHAT_CHANNELS, 
  INITIAL_DIRECT_THREADS, 
  INITIAL_MESSAGES_BY_THREAD,
  generateCoworkerChatResponse
} from '../../utils/teamChatEngine';
import { INITIAL_COWORKERS } from '../../utils/teamData';

interface TeamMessengerProps {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  currentUser?: UserProfile | null;
  onSelectDataset?: (id: string) => void;
  onNavigateToTab?: (tab: 'upload' | 'analysis' | 'grid' | 'simulation' | 'collection' | 'report' | 'team') => void;
  onOpenShareModal?: (dataset: Dataset) => void;
}

export const TeamMessenger: React.FC<TeamMessengerProps> = ({
  datasets,
  activeDataset,
  currentUser,
  onSelectDataset,
  onNavigateToTab,
  onOpenShareModal
}) => {
  // State for channels and DM threads
  const [channels, setChannels] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem('datahub_chat_channels');
      return saved ? JSON.parse(saved) : INITIAL_CHAT_CHANNELS;
    } catch {
      return INITIAL_CHAT_CHANNELS;
    }
  });

  const [directThreads, setDirectThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem('datahub_chat_dms');
      return saved ? JSON.parse(saved) : INITIAL_DIRECT_THREADS;
    } catch {
      return INITIAL_DIRECT_THREADS;
    }
  });

  const [activeThreadId, setActiveThreadId] = useState<string>('chan_general');
  const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem('datahub_chat_messages');
      return saved ? JSON.parse(saved) : INITIAL_MESSAGES_BY_THREAD;
    } catch {
      return INITIAL_MESSAGES_BY_THREAD;
    }
  });

  // Composer State
  const [inputText, setInputText] = useState<string>('');
  const [isAttachingData, setIsAttachingData] = useState<boolean>(false);
  const [selectedDatasetToAttach, setSelectedDatasetToAttach] = useState<Dataset | null>(activeDataset);
  const [attachmentType, setAttachmentType] = useState<'dataset' | 'data_slice' | 'forecast_scenario' | 'sql_query'>('dataset');
  const [attachmentNote, setAttachmentNote] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCoworkerTyping, setIsCoworkerTyping] = useState<boolean>(false);
  const [typingCoworkerName, setTypingCoworkerName] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesByThread, activeThreadId, isCoworkerTyping]);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('datahub_chat_messages', JSON.stringify(messagesByThread));
      localStorage.setItem('datahub_chat_channels', JSON.stringify(channels));
      localStorage.setItem('datahub_chat_dms', JSON.stringify(directThreads));
    } catch (e) {
      console.warn(e);
    }
  }, [messagesByThread, channels, directThreads]);

  // Find active thread object
  const activeThread = [...channels, ...directThreads].find(t => t.id === activeThreadId) || channels[0];
  const currentMessages = messagesByThread[activeThreadId] || [];

  // Find corresponding coworker if it's a DM thread
  const activeCoworker: Coworker | undefined = INITIAL_COWORKERS.find(
    c => `dm_${c.id}` === activeThreadId
  );

  // Send message handler
  const handleSendMessage = () => {
    if (!inputText.trim() && !selectedDatasetToAttach && !isAttachingData) return;

    let newAttachments: ChatDataAttachment[] | undefined = undefined;

    if (isAttachingData && selectedDatasetToAttach) {
      newAttachments = [
        {
          id: `att_${Date.now()}`,
          type: attachmentType,
          datasetId: selectedDatasetToAttach.id,
          datasetName: selectedDatasetToAttach.name,
          title: attachmentNote.trim() || `${selectedDatasetToAttach.name} Data Share`,
          description: `${selectedDatasetToAttach.data.length.toLocaleString()} rows • ${selectedDatasetToAttach.columns.length} columns`,
          rowCount: selectedDatasetToAttach.data.length,
          columnCount: selectedDatasetToAttach.columns.length,
          columns: selectedDatasetToAttach.columns,
          dataPreview: selectedDatasetToAttach.data.slice(0, 4),
          sqlQuery: attachmentType === 'sql_query' ? `SELECT * FROM ${selectedDatasetToAttach.name.toLowerCase().replace(/\\s+/g, '_')} LIMIT 50;` : undefined
        }
      ];
    }

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      senderId: 'current_user',
      senderName: currentUser?.name || 'Lead Data Analyst (You)',
      senderAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      senderRole: currentUser?.role || 'Lead Analyst',
      senderDepartment: 'Analytics & Strategy',
      text: inputText.trim(),
      timestamp: 'Just now',
      attachments: newAttachments
    };

    const updatedThreadMsgs = [...(messagesByThread[activeThreadId] || []), userMsg];
    setMessagesByThread(prev => ({
      ...prev,
      [activeThreadId]: updatedThreadMsgs
    }));

    const textSent = inputText;
    const attachedDs = isAttachingData ? selectedDatasetToAttach : null;

    setInputText('');
    setIsAttachingData(false);
    setAttachmentNote('');

    // Trigger realistic simulated coworker response
    triggerSimulatedCoworkerResponse(activeThreadId, textSent, attachedDs);
  };

  const triggerSimulatedCoworkerResponse = (
    threadId: string,
    userText: string,
    attachedDs: Dataset | null
  ) => {
    let replyingCoworker: Coworker | undefined;

    if (threadId.startsWith('dm_')) {
      const cwId = threadId.replace('dm_', '');
      replyingCoworker = INITIAL_COWORKERS.find(c => c.id === cwId);
    } else {
      // In a channel, select a relevant coworker (e.g. Dr. Elena or Sarah Chen)
      const randIdx = Math.floor(Math.random() * 3);
      replyingCoworker = INITIAL_COWORKERS[randIdx] || INITIAL_COWORKERS[0];
    }

    if (!replyingCoworker) return;

    // Show typing indicator after a short delay
    setTimeout(() => {
      setIsCoworkerTyping(true);
      setTypingCoworkerName(replyingCoworker?.name || 'Coworker');
    }, 900);

    // Deliver reply after 2.4 seconds
    setTimeout(() => {
      setIsCoworkerTyping(false);
      const generated = generateCoworkerChatResponse(replyingCoworker!, userText, attachedDs);

      const coworkerMsg: ChatMessage = {
        id: `msg_cw_${Date.now()}`,
        senderId: replyingCoworker!.id,
        senderName: replyingCoworker!.name,
        senderAvatar: replyingCoworker!.avatarUrl,
        senderRole: replyingCoworker!.role,
        senderDepartment: replyingCoworker!.department,
        text: generated.text,
        timestamp: 'Just now',
        attachments: generated.attachment ? [generated.attachment] : undefined
      };

      setMessagesByThread(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), coworkerMsg]
      }));

    }, 2800);
  };

  // Add emoji reaction
  const handleToggleReaction = (msgId: string, emoji: string) => {
    setMessagesByThread(prev => {
      const current = prev[activeThreadId] || [];
      const updated = current.map(msg => {
        if (msg.id === msgId) {
          const reactions = msg.reactions || [];
          const existing = reactions.find(r => r.emoji === emoji);
          let newReactions;
          if (existing) {
            if (existing.users.includes('me')) {
              newReactions = reactions
                .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, users: r.users.filter(u => u !== 'me') } : r)
                .filter(r => r.count > 0);
            } else {
              newReactions = reactions.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, users: [...r.users, 'me'] } : r);
            }
          } else {
            newReactions = [...reactions, { emoji, count: 1, users: ['me'] }];
          }
          return { ...msg, reactions: newReactions };
        }
        return msg;
      });
      return { ...prev, [activeThreadId]: updated };
    });
  };

  // Quick Action: Open attached dataset in Grid Editor / Analysis
  const handleOpenAttachedData = (att: ChatDataAttachment, destination: 'grid' | 'analysis' | 'simulation') => {
    if (att.datasetId && onSelectDataset) {
      onSelectDataset(att.datasetId);
    }
    if (onNavigateToTab) {
      onNavigateToTab(destination);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[780px]">
      
      {/* LEFT SIDEBAR: CHANNELS & DIRECT MESSAGES (Col 1) */}
      <div className="w-full md:w-80 bg-slate-950 border-r border-slate-800/90 flex flex-col shrink-0">
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Team Chat & Exchange</h3>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {INITIAL_COWORKERS.filter(c => c.status === 'online').length} Colleagues Online
                </span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rooms or colleagues..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Channels & DM Lists */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          
          {/* SECTION: Team Channels */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 flex items-center justify-between">
              <span>Team Channels</span>
              <span className="text-[9px] font-mono text-slate-600">{channels.length}</span>
            </div>

            {channels
              .filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(chan => {
                const isActive = activeThreadId === chan.id;
                return (
                  <button
                    key={chan.id}
                    onClick={() => setActiveThreadId(chan.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-mono text-xs font-bold text-indigo-400">#</span>
                      <span className="text-xs font-medium truncate">{chan.name.replace('# ', '')}</span>
                    </div>
                    {chan.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                        {chan.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* SECTION: Direct Messages with Colleagues */}
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 flex items-center justify-between">
              <span>Direct Messages</span>
              <span className="text-[9px] font-mono text-slate-600">{directThreads.length}</span>
            </div>

            {directThreads
              .filter(dm => dm.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(dm => {
                const isActive = activeThreadId === dm.id;
                const cw = INITIAL_COWORKERS.find(c => `dm_${c.id}` === dm.id);

                return (
                  <button
                    key={dm.id}
                    onClick={() => setActiveThreadId(dm.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="relative shrink-0">
                        <img
                          src={dm.avatarUrl}
                          alt={dm.name}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-slate-950 ${
                            cw?.status === 'online'
                              ? 'bg-emerald-400'
                              : cw?.status === 'analyzing'
                              ? 'bg-cyan-400'
                              : 'bg-amber-400'
                          }`}
                        />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-white truncate">{dm.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{cw?.role}</div>
                      </div>
                    </div>

                    {dm.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[9px] font-bold">
                        {dm.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

        </div>

        {/* Current User Profile Snapshot at bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center gap-2.5">
          <img
            src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
            alt="You"
            className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700"
          />
          <div className="truncate">
            <div className="text-xs font-bold text-white truncate">{currentUser?.name || 'Lead Data Analyst'}</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected & Sharing
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT MAIN PANEL: ACTIVE CHAT ROOM & DATA EXCHANGE COMPOSER (Col 2) */}
      <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
        
        {/* Chat Thread Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {activeThread.type === 'channel' ? (
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-base">
                #
              </div>
            ) : (
              <div className="relative">
                <img
                  src={activeThread.avatarUrl}
                  alt={activeThread.name}
                  className="w-9 h-9 rounded-xl object-cover ring-1 ring-indigo-500/30"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">{activeThread.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                  {activeThread.type === 'channel' ? 'Public Room' : '1:1 Direct Line'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-md">
                {activeThread.topic || 'Share datasets, formulas, and exchange real-time feedback.'}
              </p>
            </div>
          </div>

          {/* Quick Action: Attach Dataset to Chat */}
          <div className="flex items-center gap-2">
            <button
              id="attach-active-dataset-btn"
              onClick={() => {
                setIsAttachingData(true);
                setSelectedDatasetToAttach(activeDataset);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Share Active Dataset</span>
            </button>
          </div>
        </div>

        {/* MESSAGES SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-700" />
              <div>
                <h4 className="text-sm font-bold text-slate-300">No Messages in this thread yet</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Start the conversation by typing a question or attaching a dataset below!
                </p>
              </div>
            </div>
          ) : (
            currentMessages.map(msg => {
              const isMe = msg.senderId === 'current_user' || msg.senderName.includes('(You)');

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Sender Avatar */}
                  <img
                    src={msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-xl object-cover shrink-0 ring-1 ring-slate-800"
                  />

                  {/* Message Bubble Container */}
                  <div className={`space-y-1.5 max-w-xl ${isMe ? 'items-end' : 'items-start'}`}>
                    
                    {/* Header info */}
                    <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-bold text-slate-200">{msg.senderName}</span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    {/* Text Body */}
                    {msg.text && (
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md'
                            : 'bg-slate-950 text-slate-200 border border-slate-800/90 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}

                    {/* DATA ATTACHMENT CARD BUBBLE */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {msg.attachments.map(att => (
                          <div
                            key={att.id}
                            className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-3 shadow-lg hover:border-indigo-500/60 transition-all max-w-md"
                          >
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                                  <Database className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-white">{att.title}</h5>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {att.rowCount?.toLocaleString()} rows • {att.columnCount} columns
                                  </span>
                                </div>
                              </div>
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                Attached Data
                              </span>
                            </div>

                            {/* Data Snapshot Mini-Table Preview */}
                            {att.dataPreview && att.dataPreview.length > 0 && (
                              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70 p-1">
                                <table className="w-full text-[10px] text-slate-300">
                                  <thead>
                                    <tr className="border-b border-slate-800 text-slate-500 font-mono">
                                      {Object.keys(att.dataPreview[0]).slice(0, 4).map(k => (
                                        <th key={k} className="p-1 text-left">{k}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {att.dataPreview.map((row, rIdx) => (
                                      <tr key={rIdx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                        {Object.keys(row).slice(0, 4).map(k => (
                                          <td key={k} className="p-1 truncate max-w-[80px]">
                                            {String(row[k])}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* SQL Query Snippet if attached */}
                            {att.sqlQuery && (
                              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-amber-300">
                                {att.sqlQuery}
                              </div>
                            )}

                            {/* Interactive Quick Actions on the Attached Dataset */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                onClick={() => handleOpenAttachedData(att, 'grid')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30 transition-all"
                              >
                                <Table className="w-3 h-3" />
                                <span>Open in Grid</span>
                              </button>

                              <button
                                onClick={() => handleOpenAttachedData(att, 'analysis')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30 transition-all"
                              >
                                <BarChart3 className="w-3 h-3" />
                                <span>Statistical Suite</span>
                              </button>

                              <button
                                onClick={() => handleOpenAttachedData(att, 'simulation')}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-[10px] font-semibold border border-amber-500/30 transition-all"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>What-If Forecast</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reactions Bar */}
                    <div className="flex items-center gap-1 pt-1">
                      {msg.reactions?.map((rx, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleToggleReaction(msg.id, rx.emoji)}
                          className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all ${
                            rx.users.includes('me')
                              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{rx.emoji}</span>
                          <span className="font-mono">{rx.count}</span>
                        </button>
                      ))}

                      <button
                        onClick={() => handleToggleReaction(msg.id, '👍')}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white text-xs px-1 transition-opacity"
                        title="React 👍"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '🔥')}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white text-xs px-1 transition-opacity"
                        title="React 🔥"
                      >
                        🔥
                      </button>
                      <button
                        onClick={() => handleToggleReaction(msg.id, '🚀')}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white text-xs px-1 transition-opacity"
                        title="React 🚀"
                      >
                        🚀
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isCoworkerTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span><strong>{typingCoworkerName}</strong> is reviewing and typing a response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ATTACHMENT TRAY (IF ATTACHING DATASET) */}
        {isAttachingData && (
          <div className="p-3 bg-slate-950 border-t border-indigo-500/30 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs text-indigo-300">
              <span className="font-bold flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                Attach Live Dataset or Slice
              </span>
              <button
                onClick={() => setIsAttachingData(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Dataset Picker */}
              <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 block">Dataset:</span>
                <select
                  value={selectedDatasetToAttach?.id || ''}
                  onChange={e => {
                    const ds = datasets.find(d => d.id === e.target.value);
                    if (ds) setSelectedDatasetToAttach(ds);
                  }}
                  className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
                >
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id} className="bg-slate-900 text-white">
                      {ds.name} ({ds.data.length} rows)
                    </option>
                  ))}
                </select>
              </div>

              {/* Share Mode */}
              <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 block">Attachment Format:</span>
                <select
                  value={attachmentType}
                  onChange={e => setAttachmentType(e.target.value as any)}
                  className="w-full bg-transparent text-indigo-300 font-medium focus:outline-none cursor-pointer text-xs"
                >
                  <option value="dataset" className="bg-slate-900 text-white">Full Dataset Snapshot</option>
                  <option value="data_slice" className="bg-slate-900 text-white">Sample Data Slice (Top Rows)</option>
                  <option value="sql_query" className="bg-slate-900 text-white">SQL Query & Schema</option>
                </select>
              </div>

              {/* Note / Context input */}
              <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 block">Description Note:</span>
                <input
                  type="text"
                  placeholder="e.g. Q3 Cohort Churn Slice..."
                  value={attachmentNote}
                  onChange={e => setAttachmentNote(e.target.value)}
                  className="w-full bg-transparent text-white focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* MESSAGE COMPOSER INPUT */}
        <div className="p-3 md:p-4 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
          
          {/* Attach Button */}
          <button
            onClick={() => {
              setIsAttachingData(prev => !prev);
              if (!selectedDatasetToAttach) setSelectedDatasetToAttach(activeDataset);
            }}
            className={`p-2.5 rounded-xl transition-all border ${
              isAttachingData
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
            title="Attach a dataset or snapshot to this message"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              activeCoworker
                ? `Message ${activeCoworker.name} (ask for statistical review, forecasting advice, or query help)...`
                : `Message ${activeThread.name}...`
            }
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
          />

          {/* Send Button */}
          <button
            id="chat-send-btn"
            onClick={handleSendMessage}
            disabled={!inputText.trim() && !isAttachingData}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

    </div>
  );
};
