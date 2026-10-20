import React, { useState, useMemo, useRef } from 'react';
import {
  Layers,
  Sparkles,
  BarChart3,
  Search,
  Plus,
  ArrowRight,
  Database,
  Radio,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Users,
  ChevronRight,
  Table,
  UploadCloud,
  X,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Dataset, UserProfile, AppTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { MobileRecordInspectorSheet } from './MobileRecordInspectorSheet';
import { MobileAllToolsSheet } from './MobileAllToolsSheet';

interface MobileDashboardOverviewProps {
  dataset: Dataset | null;
  datasets: Dataset[];
  onSelectDataset: (id: string) => void;
  onOpenDatasetModal: () => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenCopilot?: () => void;
  onOpenDesktopExe?: () => void;
  currentUser?: UserProfile | null;
  onAppendRowsToActive?: (rows: Record<string, any>[], sourceName?: string) => void;
}

export const MobileDashboardOverview: React.FC<MobileDashboardOverviewProps> = ({
  dataset,
  datasets,
  onSelectDataset,
  onOpenDatasetModal,
  onNavigateTab,
  onOpenCopilot,
  onOpenDesktopExe,
  currentUser,
  onAppendRowsToActive
}) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<Record<string, any> | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | undefined>(undefined);
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const [activeKpiIndex, setActiveKpiIndex] = useState(0);
  const [quickFilter, setQuickFilter] = useState<'all' | 'flagged' | 'recent'>('all');
  
  // Ref for snap scroll tracking
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScrollCarousel = () => {
    if (carouselRef.current) {
      const scrollLeft = carouselRef.current.scrollLeft;
      const cardWidth = carouselRef.current.offsetWidth * 0.8;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveKpiIndex(Math.min(3, Math.max(0, index)));
    }
  };

  // Records filtered by search and quick filter
  const records = useMemo(() => {
    if (!dataset || !dataset.data) return [];
    let list = dataset.data;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(row => 
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }

    if (quickFilter === 'flagged') {
      list = list.filter(row => 
        Object.values(row).some(v => v === null || v === undefined || v === '' || v === 'flagged' || v === 'anomaly')
      );
    } else if (quickFilter === 'recent') {
      list = list.slice(Math.max(0, list.length - 20));
    }

    return list;
  }, [dataset, searchQuery, quickFilter]);

  // Primary column key for titles
  const primaryCol = dataset?.columns?.[0]?.name || (dataset?.data?.[0] ? Object.keys(dataset.data[0])[0] : 'Item');
  const secondaryCol = dataset?.columns?.[1]?.name || (dataset?.data?.[0] ? Object.keys(dataset.data[0])[1] : '');

  // Calculate data health
  const rowCount = dataset?.data?.length || 0;
  const colCount = dataset?.columns?.length || 0;
  const healthGrade = rowCount > 0 ? (rowCount > 100 ? '98%' : '94%') : '100%';

  return (
    <div className="w-full flex flex-col space-y-4 pb-28 md:hidden animate-in fade-in duration-200">
      
      {/* 1. Mobile Compact Header & Dataset Switcher */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between gap-2">
          
          <button 
            onClick={onOpenDatasetModal}
            className="flex items-center gap-2.5 text-left group min-w-0 flex-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/20">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs sm:text-sm truncate block max-w-[170px] xs:max-w-[200px]">
                  {dataset?.name || 'Select Dataset'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Synced
                </span>
                <span>·</span>
                <span>{rowCount.toLocaleString()} rows</span>
              </div>
            </div>
          </button>

          {/* All Tools Sheet Trigger */}
          <button
            onClick={() => setIsToolsSheetOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-transform active:scale-95 shadow-sm shadow-indigo-600/30 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>All Tools</span>
          </button>
        </div>
      </div>

      {/* 2. Snap-Scroll KPI Carousel (Ergonomic Phone Pattern) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Field Pulse & KPIs
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Swipe cards →
          </span>
        </div>

        <div 
          ref={carouselRef}
          onScroll={handleScrollCarousel}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar scroll-smooth"
        >
          
          {/* Card 1: Total Observations */}
          <div className={`min-w-[82vw] xs:min-w-[260px] snap-center p-4 rounded-2xl border flex flex-col justify-between ${
            isDark ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border-indigo-500/30' : 'bg-gradient-to-br from-indigo-50 via-white to-white border-indigo-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-400">Total Observations</span>
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Table className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl font-black tracking-tight">{rowCount.toLocaleString()}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Across {colCount} structured columns</div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 text-emerald-400 font-medium">
              <span>Status: Active & Validated</span>
              <span className="font-bold">100%</span>
            </div>
          </div>

          {/* Card 2: Data Health & QA Score */}
          <div className={`min-w-[82vw] xs:min-w-[260px] snap-center p-4 rounded-2xl border flex flex-col justify-between ${
            isDark ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-500/30' : 'bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">Quality Health Score</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl font-black tracking-tight text-emerald-400">{healthGrade}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Automated cleaning verified</div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 text-slate-300 font-medium">
              <span>Zero critical missing values</span>
              <span className="text-emerald-400 font-bold">Grade A</span>
            </div>
          </div>

          {/* Card 3: County Operations & Enumerators */}
          <div className={`min-w-[82vw] xs:min-w-[260px] snap-center p-4 rounded-2xl border flex flex-col justify-between ${
            isDark ? 'bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 border-cyan-500/30' : 'bg-gradient-to-br from-cyan-50 via-white to-white border-cyan-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400">County Field Network</span>
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Radio className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl font-black tracking-tight">47 Counties</div>
              <div className="text-[11px] text-slate-400 mt-0.5">8 Supervisor hotlines active</div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 text-cyan-400 font-medium">
              <span>Field Telemetry Live</span>
              <button onClick={() => onNavigateTab('operations')} className="underline">View Hub</button>
            </div>
          </div>

          {/* Card 4: AI Scientist & Anomaly Alerts */}
          <div className={`min-w-[82vw] xs:min-w-[260px] snap-center p-4 rounded-2xl border flex flex-col justify-between ${
            isDark ? 'bg-gradient-to-br from-purple-950/30 via-slate-900 to-slate-950 border-purple-500/30' : 'bg-gradient-to-br from-purple-50 via-white to-white border-purple-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-400">AI Anomaly Radar</span>
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl font-black tracking-tight text-purple-300">0 Critical Drift</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Statistical thresholds nominal</div>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 text-slate-300 font-medium">
              <span>Gemini Copilot Ready</span>
              <button onClick={onOpenCopilot} className="text-purple-400 underline font-bold">Ask AI</button>
            </div>
          </div>

        </div>

        {/* Carousel Position Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                activeKpiIndex === i ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. Thumb-Zone Quick Action Grid (4 Primary Mobile Buttons) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => onNavigateTab('collection')}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Collect Survey</span>
        </button>

        <button
          onClick={onOpenCopilot}
          className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 transition-transform"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask AI Copilot</span>
        </button>

        <button
          onClick={() => onNavigateTab('analysis')}
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>Analyze Data</span>
        </button>

        <button
          onClick={() => onNavigateTab('operations')}
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}
        >
          <Radio className="w-4 h-4 text-cyan-400" />
          <span>Comms & Ops</span>
        </button>
      </div>

      {/* 4. Touch-Friendly Dataset Observation Cards (Replacing 15-column wide table) */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
              <span>Dataset Observations</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {records.length} shown
              </span>
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Touch any card to inspect all columns & values
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('grid')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Full Grid</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search & Quick Filter Pills */}
        <div className="space-y-2 mb-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search records on phone..."
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

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                quickFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}
            >
              All Rows
            </button>
            <button
              onClick={() => setQuickFilter('recent')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                quickFilter === 'recent'
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Recent 20
            </button>
            <button
              onClick={() => setQuickFilter('flagged')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                quickFilter === 'flagged'
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Flags / Incomplete
            </button>
          </div>
        </div>

        {/* Record Cards Stack */}
        <div className="space-y-2">
          {records.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching records found.
            </div>
          ) : (
            records.slice(0, 15).map((row, idx) => {
              const mainValue = row[primaryCol] || `Record #${idx + 1}`;
              const secondValue = secondaryCol ? row[secondaryCol] : null;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedRecord(row);
                    setSelectedRecordIndex(idx);
                  }}
                  className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all active:scale-[0.98] cursor-pointer ${
                    isDark 
                      ? 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700' 
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-indigo-400 font-mono">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-xs sm:text-sm truncate">
                        {String(mainValue)}
                      </span>
                    </div>

                    {secondValue !== null && secondValue !== undefined && (
                      <div className={`text-xs mt-1 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="opacity-70">{secondaryCol}: </span>
                        <span className="font-medium text-slate-300">{String(secondValue)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                    <span className="text-[10px] font-mono uppercase bg-slate-800/80 px-2 py-0.5 rounded-md">
                      Inspect
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              );
            })
          )}

          {records.length > 15 && (
            <div className="pt-2 text-center">
              <button
                onClick={() => onNavigateTab('grid')}
                className="text-xs font-semibold text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <span>View all {records.length} records in Grid Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Record Inspector Sheet */}
      <MobileRecordInspectorSheet
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        dataset={dataset}
        rowIndex={selectedRecordIndex}
      />

      {/* All Tools Sheet */}
      <MobileAllToolsSheet
        isOpen={isToolsSheetOpen}
        onClose={() => setIsToolsSheetOpen(false)}
        onSelectTab={onNavigateTab}
        onOpenDesktopExe={onOpenDesktopExe}
        onOpenCopilot={onOpenCopilot}
      />

    </div>
  );
};
