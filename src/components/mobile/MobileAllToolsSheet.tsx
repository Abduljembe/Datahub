import React, { useState } from 'react';
import {
  X,
  Search,
  Sparkles,
  UploadCloud,
  BarChart3,
  Table,
  Layers,
  FileText,
  Users,
  ShieldCheck,
  Activity,
  Radio,
  Monitor,
  BrainCircuit,
  Headphones,
  Compass,
  Flame,
  ArrowRight,
  ShieldAlert,
  HardDrive,
  LayoutDashboard
} from 'lucide-react';
import { AppTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface MobileAllToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: AppTab) => void;
  onOpenDesktopExe?: () => void;
  onOpenCopilot?: () => void;
  onOpenTour?: () => void;
}

interface ToolItem {
  id: string;
  name: string;
  category: 'Collect & Ingest' | 'Analysis & AI' | 'Fleet & Field Ops' | 'Reports & System';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  tab?: AppTab;
  action?: () => void;
  badge?: string;
}

export const MobileAllToolsSheet: React.FC<MobileAllToolsSheetProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenDesktopExe,
  onOpenCopilot,
  onOpenTour
}) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const tools: ToolItem[] = [
    {
      id: 'dashboard',
      name: 'All-in-One Dashboard',
      category: 'Analysis & AI',
      icon: LayoutDashboard,
      description: 'Unified command center: live metrics, analysis, grid, forecast & all features in one place',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      tab: 'dashboard',
      badge: 'All-in-One'
    },
    // Collect & Ingest
    {
      id: 'upload',
      name: 'Upload & Clean',
      category: 'Collect & Ingest',
      icon: UploadCloud,
      description: 'Upload CSV, Excel, JSON and run automated data quality cleaner',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      tab: 'upload',
      badge: 'Core'
    },
    {
      id: 'collection',
      name: 'Field Surveys & GPS',
      category: 'Collect & Ingest',
      icon: Layers,
      description: 'Offline mobile surveys, geolocation logging & enumerator forms',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      tab: 'collection',
      badge: 'Offline'
    },
    {
      id: 'grid',
      name: 'Grid Spreadsheet Editor',
      category: 'Collect & Ingest',
      icon: Table,
      description: 'Touch-optimized tabular cell editor and formula manager',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      tab: 'grid'
    },

    // Analysis & AI
    {
      id: 'analysis',
      name: 'Data Analysis Suite',
      category: 'Analysis & AI',
      icon: BarChart3,
      description: 'EDA profiler, statistical ANOVA, charts & correlation matrix',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      tab: 'analysis',
      badge: '24 Tools'
    },
    {
      id: 'simulation',
      name: 'What-If & Forecasting',
      category: 'Analysis & AI',
      icon: Sparkles,
      description: 'Monte Carlo models, sensitivity curves & scenario regressions',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      tab: 'simulation'
    },
    {
      id: 'copilot',
      name: 'Gemini AI Data Copilot',
      category: 'Analysis & AI',
      icon: BrainCircuit,
      description: 'Natural language dataset queries, formula writer & automated insights',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      action: () => {
        onClose();
        if (onOpenCopilot) onOpenCopilot();
      },
      badge: 'Gemini'
    },

    // Fleet & Field Ops
    {
      id: 'operations',
      name: 'Comms & Operations Hub',
      category: 'Fleet & Field Ops',
      icon: Radio,
      description: 'Team chat, 47 Kenyan county supervisors & emergency broadcasts',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      tab: 'operations',
      badge: 'Live'
    },
    {
      id: 'supervisor',
      name: 'Supervisor Audit Vault',
      category: 'Fleet & Field Ops',
      icon: ShieldCheck,
      description: 'Verify field batches, audit enumerators & catch GPS spoofing',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      tab: 'supervisor'
    },
    {
      id: 'team',
      name: 'Team & Collaboration',
      category: 'Fleet & Field Ops',
      icon: Users,
      description: 'Workspace members, roles, invitations & activity log',
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      tab: 'team'
    },

    // Reports & System
    {
      id: 'admin',
      name: 'Admin Command Console',
      category: 'Reports & System',
      icon: Activity,
      description: 'Real-time telemetry, memory usage, drift alerts & audit logs',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      tab: 'admin'
    },
    {
      id: 'report',
      name: 'Executive Boardroom Dossier',
      category: 'Reports & System',
      icon: FileText,
      description: 'Export printable executive briefing PDF & health grade scorecard',
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      tab: 'report',
      badge: 'PDF'
    },
    {
      id: 'desktop_exe',
      name: 'Windows .EXE & Desktop App',
      category: 'Reports & System',
      icon: Monitor,
      description: 'Download .BAT launcher, desktop shortcut script & 1-click install',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      action: () => {
        onClose();
        if (onOpenDesktopExe) onOpenDesktopExe();
      },
      badge: 'Win x64'
    }
  ];

  const categories = ['All', 'Collect & Ingest', 'Analysis & AI', 'Fleet & Field Ops', 'Reports & System'];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleToolClick = (tool: ToolItem) => {
    onClose();
    if (tool.action) {
      tool.action();
    } else if (tool.tab) {
      onSelectTab(tool.tab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Background touch to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-Up Bottom Sheet */}
      <div 
        className={`w-full max-h-[88vh] flex flex-col rounded-t-3xl border-t shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250 ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Grab Handle */}
        <div className="pt-3 pb-2 flex justify-center cursor-pointer" onClick={onClose}>
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
        </div>

        {/* Sheet Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
              <span>All Workspace Tools</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-mono font-semibold">
                {tools.length} Tools
              </span>
            </h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Tap any tool to launch immediately on your phone
            </p>
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

        {/* Search Bar */}
        <div className="px-5 pb-3">
          <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs ${
            isDark ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search tools (e.g., AutoML, Survey, PDF)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills (horizontal scroll) */}
        <div className="px-5 pb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[34px] ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tools List */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2.5">
          {filteredTools.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No tools matching &ldquo;{searchQuery}&rdquo; found.
            </div>
          ) : (
            filteredTools.map(tool => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool)}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center gap-3.5 transition-all active:scale-[0.98] min-h-[56px] ${
                    isDark 
                      ? 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700' 
                      : 'bg-slate-50 border-slate-200/90 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${tool.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm truncate">
                        {tool.name}
                      </span>
                      {tool.badge && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold uppercase ${
                          tool.badge === 'Gemini' ? 'bg-purple-500/20 text-purple-400' :
                          tool.badge === 'Live' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] line-clamp-1 mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {tool.description}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
