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
  Code,
  Wand2,
  Play,
  ChevronDown,
  ShieldCheck,
  Smartphone,
  Building2,
  LineChart,
  Check,
  MoreHorizontal
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
  onOpenAutoHeal?: () => void;
  onOpenFieldTour?: () => void;
  onSelectPersonaRole?: (role: UserProfile['role'], tabToSwitch?: AppTab) => void;
  onOpenSecurityShield?: () => void;
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
  onNavigateTab,
  currentUser,
  onOpenAutoHeal,
  onOpenFieldTour,
  onSelectPersonaRole,
  onOpenSecurityShield
}) => {
  const { isDark } = useTheme();
  const [exportOpen, setExportOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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

  // Personas for instant switching
  const PERSONAS: { role: UserProfile['role']; label: string; tab: AppTab; icon: any; color: string }[] = [
    { role: 'Workspace Owner', label: 'Central Admin', tab: 'admin', icon: Building2, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { role: 'Lead Field Supervisor', label: 'Lead Supervisor', tab: 'operations', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { role: 'Field Enumerator', label: 'Field Enumerator', tab: 'collection', icon: Smartphone, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    { role: 'Data Analyst', label: 'Data Analyst', tab: 'analyst', icon: LineChart, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  ];

  const currentPersona = PERSONAS.find(p => p.role === currentUser?.role) || PERSONAS[0];

  return (
    <header className={`h-16 border-b sticky top-0 z-30 transition-colors backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 ${
      isDark ? 'bg-slate-950/80 border-slate-800/80 text-white' : 'bg-white/90 border-slate-200 text-slate-900 shadow-xs'
    }`}>
      {/* Left: Mobile Sidebar Trigger + Breadcrumbs (Strict Overflow Protection) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-hidden shrink">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs min-w-0 overflow-hidden">
          <span className="text-slate-400 font-semibold hidden sm:inline whitespace-nowrap">{meta.domain}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline shrink-0" />
          <h1 className="font-bold text-sm tracking-tight truncate text-white whitespace-nowrap">
            {meta.title}
          </h1>

          {/* Dataset pill displayed safely only on 2xl screens to avoid crushing toolbar buttons */}
          {activeDataset && (
            <div className="hidden 2xl:flex items-center gap-2 ml-3 pl-3 border-l border-slate-800 shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-nowrap">
                <Database className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="font-bold text-white truncate max-w-[130px]">{activeDataset.name}</span>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-400 whitespace-nowrap">{activeDataset.data.length.toLocaleString()} rows</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Role Persona Switcher + Quick Action Buttons (Zero Overlapping) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Role Persona Switcher Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setPersonaOpen(!personaOpen)}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
              isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Switch operational role persona"
          >
            <currentPersona.icon className={`w-3.5 h-3.5 shrink-0 ${currentPersona.color.split(' ')[0]}`} />
            <span className="hidden sm:inline whitespace-nowrap">{currentPersona.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />
          </button>

          {personaOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in"
              onMouseLeave={() => setPersonaOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 border-b border-slate-800/80 mb-1">
                Switch Operational Persona
              </div>
              {PERSONAS.map(p => {
                const isSelected = p.role === currentUser?.role;
                return (
                  <button
                    key={p.role}
                    onClick={() => {
                      if (onSelectPersonaRole) {
                        onSelectPersonaRole(p.role, p.tab);
                      } else {
                        onNavigateTab(p.tab);
                      }
                      setPersonaOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-purple-600/20 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p.icon className={`w-4 h-4 shrink-0 ${p.color.split(' ')[0]}`} />
                      <div>
                        <div>{p.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Jump to {p.tab} view</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Security Shield & Anti-Tamper Button */}
        {onOpenSecurityShield && (
          <button
            onClick={onOpenSecurityShield}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap"
            title="Workstation Security Shield, SHA-256 Anti-Tamper Seals & Audit Log"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">Security</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </button>
        )}

        {/* AI Copilot Button */}
        {activeDataset && (
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/25 shrink-0 whitespace-nowrap"
            title="Ask AI questions or generate SQL/filters"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200 animate-pulse shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">AI Copilot</span>
          </button>
        )}

        {/* 60s Demo (Shown directly on 2xl screens, otherwise neatly tucked in More menu) */}
        {onOpenFieldTour && (
          <button
            onClick={onOpenFieldTour}
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap"
            title="Experience the full 4-stage Field-to-Boardroom pipeline in 60 seconds"
          >
            <Play className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            <span>60s Demo</span>
          </button>
        )}

        {/* Auto-Heal (Shown directly on 2xl screens, otherwise neatly tucked in More menu) */}
        {activeDataset && onOpenAutoHeal && (
          <button
            onClick={onOpenAutoHeal}
            className="hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap"
            title="1-Click Auto-Heal data hygiene and formatting issues"
          >
            <Wand2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Auto-Heal</span>
          </button>
        )}

        {/* Snapshots Version History (Shown on 2xl screens, otherwise in More menu) */}
        {activeDataset && (
          <button
            onClick={onOpenSnapshots}
            className={`hidden 2xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
              isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-cyan-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-cyan-700'
            }`}
            title="Dataset snapshot history"
          >
            <History className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Snapshots</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
              {snapshotCount}
            </span>
          </button>
        )}

        {/* Export Dropdown (Always accessible) */}
        {activeDataset && (
          <div className="relative shrink-0">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className={`p-2 rounded-xl border text-xs transition-colors flex items-center justify-center shrink-0 ${
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

        {/* More Actions Menu (Houses 60s Demo, Auto-Heal, Snapshots, Share, Slides, Tour with ZERO overlap) */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`p-2 rounded-xl border text-xs transition-colors flex items-center justify-center shrink-0 ${
              isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="More Workspace Actions"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-300" />
          </button>

          {moreOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in text-xs"
              onMouseLeave={() => setMoreOpen(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 border-b border-slate-800/80 mb-1">
                Workspace Tools
              </div>

              {onOpenFieldTour && (
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenFieldTour();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-amber-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold">60s Field Demo</div>
                    <div className="text-[10px] text-slate-400 font-normal">End-to-end data pipeline tour</div>
                  </div>
                </button>
              )}

              {activeDataset && onOpenAutoHeal && (
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenAutoHeal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-emerald-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">1-Click Auto-Heal</div>
                    <div className="text-[10px] text-slate-400 font-normal">Standardize dirty data & nulls</div>
                  </div>
                </button>
              )}

              {activeDataset && (
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenSnapshots();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-cyan-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <History className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <div className="font-semibold">Version Snapshots</div>
                      <div className="text-[10px] text-slate-400 font-normal">Timeline history & rollback</div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                    {snapshotCount}
                  </span>
                </button>
              )}

              {activeDataset && (
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenShare();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-indigo-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Share Dataset</div>
                    <div className="text-[10px] text-slate-400 font-normal">Collaborate with coworkers</div>
                  </div>
                </button>
              )}

              {activeDataset && (
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    onOpenSlideDeck();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-amber-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors"
                >
                  <Presentation className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Slide Deck Presentation</div>
                    <div className="text-[10px] text-slate-400 font-normal">Generate executive briefing</div>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setMoreOpen(false);
                  onOpenTour();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors border-t border-slate-800/80 mt-1 pt-1.5"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-semibold">Interactive Product Tour</div>
                  <div className="text-[10px] text-slate-400 font-normal">Guided onboarding walkthrough</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
