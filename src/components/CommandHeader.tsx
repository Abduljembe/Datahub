import React, { useState } from 'react';
import {
  Menu,
  Sparkles,
  History,
  Share2,
  Download,
  Presentation,
  QrCode,
  Compass,
  Monitor,
  ChevronRight,
  Database,
  UploadCloud,
  FileSpreadsheet,
  Code
} from 'lucide-react';
import { AppTab, Dataset, UserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { exportToCSV, exportToExcel, exportToJSON } from '../utils/dataEngine';
import { getDatasetVersions } from '../utils/versionEngine';

interface CommandHeaderProps {
  activeTab: AppTab;
  activeDataset: Dataset | null;
  onOpenMobileSidebar: () => void;
  onOpenCopilot: () => void;
  onOpenSnapshots: () => void;
  onOpenShare: () => void;
  onOpenSlideDeck: () => void;
  onOpenQrSurvey: () => void;
  onOpenTour: () => void;
  onOpenDesktopExe: () => void;
  onNavigateTab: (tab: AppTab) => void;
  currentUser: UserProfile | null;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  activeTab,
  activeDataset,
  onOpenMobileSidebar,
  onOpenCopilot,
  onOpenSnapshots,
  onOpenShare,
  onOpenSlideDeck,
  onOpenQrSurvey,
  onOpenTour,
  onOpenDesktopExe,
  onNavigateTab
}) => {
  const { isDark } = useTheme();
  const [exportOpen, setExportOpen] = useState(false);

  // Tab Breadcrumb Labels
  const tabMetadata: Record<AppTab, { domain: string; title: string }> = {
    dashboard: { domain: 'Workspace', title: 'Executive Overview' },
    upload: { domain: 'Data Pipeline', title: 'Ingestion & Auto-Clean' },
    grid: { domain: 'Data Pipeline', title: 'Tabular Spreadsheet Grid' },
    analyst: { domain: 'Data Pipeline', title: 'Data Analyst Workbench' },
    analysis: { domain: 'Analytics & AI', title: 'Visual Analytics & EDA' },
    simulation: { domain: 'Analytics & AI', title: 'What-If Scenario Forecaster' },
    collection: { domain: 'Field Operations', title: 'Field Surveys & QR Kiosk' },
    operations: { domain: 'Field Operations', title: 'Supervisor Operations Center' },
    report: { domain: 'Governance', title: 'Executive Reports & Dossiers' },
    team: { domain: 'Governance', title: 'Team & Access Permissions' },
    admin: { domain: 'Governance', title: 'System Telemetry & Diagnostics' },
    supervisor: { domain: 'Field Operations', title: 'Supervisor Vault' }
  };

  const meta = tabMetadata[activeTab] || { domain: 'Workspace', title: 'Data Studio' };
  const snapshotCount = activeDataset ? getDatasetVersions(activeDataset).length : 0;

  return (
    <header className={`h-16 border-b sticky top-0 z-30 transition-colors backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 ${
      isDark ? 'bg-slate-950/80 border-slate-800/80 text-white' : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Left: Mobile Sidebar Trigger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="text-slate-400 font-semibold hidden sm:inline">{meta.domain}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
          <h1 className="font-bold text-sm tracking-tight truncate text-white">
            {meta.title}
          </h1>

          {activeDataset && (
            <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-slate-800">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
                <Database className="w-3 h-3 text-cyan-400" />
                <span className="font-bold text-white truncate max-w-[140px]">{activeDataset.name}</span>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-400">{activeDataset.data.length.toLocaleString()} rows</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* AI Copilot Button */}
        {activeDataset && (
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/25"
            title="Ask AI questions or generate SQL/filters"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>
        )}

        {/* Snapshots Version History */}
        {activeDataset && (
          <button
            onClick={onOpenSnapshots}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-cyan-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-cyan-700'
            }`}
            title="Dataset snapshot history"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Snapshots</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
              {snapshotCount}
            </span>
          </button>
        )}

        {/* Co-worker Share */}
        {activeDataset && (
          <button
            onClick={onOpenShare}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-indigo-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-indigo-700'
            }`}
            title="Share dataset slice with team"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Share</span>
          </button>
        )}

        {/* Slide Deck */}
        {activeDataset && (
          <button
            onClick={onOpenSlideDeck}
            className={`hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-amber-700'
            }`}
            title="Generate executive presentation slides"
          >
            <Presentation className="w-3.5 h-3.5 text-amber-400" />
            <span>Slides</span>
          </button>
        )}

        {/* Export Dropdown */}
        {activeDataset && (
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className={`p-2 rounded-xl border text-xs transition-colors flex items-center justify-center ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Export Dataset"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>

            {exportOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 animate-in fade-in text-xs"
                onMouseLeave={() => setExportOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 border-b border-slate-800">
                  Export Dataset
                </div>
                <button
                  onClick={() => {
                    exportToCSV(activeDataset);
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download as CSV</span>
                </button>
                <button
                  onClick={() => {
                    exportToExcel(activeDataset);
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download as Excel</span>
                </button>
                <button
                  onClick={() => {
                    exportToJSON(activeDataset);
                    setExportOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <Code className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download as JSON</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tour Guide Button */}
        <button
          onClick={onOpenTour}
          className={`p-2 rounded-xl border text-xs transition-colors hidden sm:flex items-center justify-center ${
            isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
          }`}
          title="Interactive Product Tour"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </header>
  );
};
