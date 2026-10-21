import React, { useState } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Table,
  Terminal,
  BarChart3,
  TrendingUp,
  QrCode,
  ShieldCheck,
  FileText,
  Users,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Database,
  Plus,
  Sparkles,
  Presentation,
  Compass,
  Monitor,
  LogOut,
  Moon,
  Sun,
  Radio,
  Layers,
  ChevronDown,
  X
} from 'lucide-react';
import { AppTab, Dataset, UserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { AppLogo } from './AppLogo';

interface SidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  datasets: Dataset[];
  activeDataset: Dataset | null;
  onSelectDataset: (id: string) => void;
  onOpenNewDataset: () => void;
  currentUser: UserProfile | null;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onLogout?: () => void;
  onOpenCopilot?: () => void;
  onOpenTour?: () => void;
  onOpenSlideDeck?: () => void;
  onOpenDesktopExe?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  id: AppTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  datasets,
  activeDataset,
  onSelectDataset,
  onOpenNewDataset,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenCopilot,
  onOpenTour,
  onOpenSlideDeck,
  onOpenDesktopExe,
  isOpenMobile,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [datasetDropdownOpen, setDatasetDropdownOpen] = useState(false);

  const navGroups: NavGroup[] = [
    {
      group: 'OVERVIEW',
      items: [
        {
          id: 'dashboard',
          label: 'Executive Overview',
          shortLabel: 'Overview',
          icon: LayoutDashboard,
          description: 'High-level KPIs, data health score & executive telemetry'
        }
      ]
    },
    {
      group: 'DATA PIPELINE',
      items: [
        {
          id: 'upload',
          label: 'Ingestion & Clean',
          shortLabel: 'Ingest',
          icon: UploadCloud,
          badge: 'Zero Egress',
          description: 'Import CSV, Excel, JSON with automated cleaning'
        },
        {
          id: 'grid',
          label: 'Spreadsheet Grid',
          shortLabel: 'Grid',
          icon: Table,
          badge: 'Inline Edit',
          description: 'High-density tabular viewer with real-time formula tools'
        },
        {
          id: 'analyst',
          label: 'Analyst Workbench',
          shortLabel: 'Workbench',
          icon: Terminal,
          badge: 'PRO Code',
          description: 'Automated insights, schema dictionary & Python/SQL/R codegen'
        }
      ]
    },
    {
      group: 'ANALYTICS & AI',
      items: [
        {
          id: 'analysis',
          label: 'Visual Analytics & EDA',
          shortLabel: 'Analytics',
          icon: BarChart3,
          description: 'Interactive Recharts, correlation matrix & hypothesis testing'
        },
        {
          id: 'simulation',
          label: 'What-If Forecaster',
          shortLabel: 'Forecast',
          icon: TrendingUp,
          badge: 'Monte Carlo',
          description: 'Driver elasticity perturbations & scenario modeling'
        }
      ]
    },
    {
      group: 'FIELD & OPERATIONS',
      items: [
        {
          id: 'collection',
          label: 'Field Surveys & QR',
          shortLabel: 'Surveys',
          icon: QrCode,
          description: 'Public mobile questionnaires, QR code kiosk & audio debriefs'
        },
        {
          id: 'operations',
          label: 'Supervisor Operations',
          shortLabel: 'Ops Vault',
          icon: ShieldCheck,
          badge: 'PIN Auth',
          description: 'Enumerator GPS tracking, fraud shield & quota dispatch'
        }
      ]
    },
    {
      group: 'GOVERNANCE & REPORTS',
      items: [
        {
          id: 'report',
          label: 'Reports & Slide Deck',
          shortLabel: 'Reports',
          icon: FileText,
          description: 'Boardroom dossier generator & presentation slides'
        },
        {
          id: 'team',
          label: 'Team & Collaborators',
          shortLabel: 'Team',
          icon: Users,
          description: 'Workspace members, role-based access & shared datasets'
        },
        {
          id: 'admin',
          label: 'Admin & Telemetry',
          shortLabel: 'Admin',
          icon: Cpu,
          badge: 'RBAC',
          description: 'System diagnostics, audit trail & zero-cloud-egress logs'
        }
      ]
    }
  ];

  const handleSelectNav = (tab: AppTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out ${
          isDark ? 'bg-slate-950 border-slate-800/80 text-slate-100' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl'
        } ${
          // Desktop width
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          // Mobile transform
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header: Brand Mark & Collapse Toggle */}
        <div className={`h-16 flex items-center border-b border-slate-800/80 px-4 shrink-0 justify-between ${
          isCollapsed ? 'lg:justify-center lg:px-2' : ''
        }`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/30 shrink-0">
              RD
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="min-w-0">
                <span className="font-black text-sm tracking-tight text-white block truncate">
                  Remix DataHub
                </span>
                <span className="text-[10px] font-mono text-cyan-400 block tracking-wider uppercase">
                  Enterprise Suite
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse button */}
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
              isCollapsed ? 'mt-1' : ''
            }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Active Dataset Selector Card */}
        {(!isCollapsed || isOpenMobile) ? (
          <div className="p-3 border-b border-slate-800/80 shrink-0 bg-slate-900/60">
            <div className="relative">
              <button
                onClick={() => setDatasetDropdownOpen(!datasetDropdownOpen)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-left flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {activeDataset?.name || 'Select Dataset'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                      {activeDataset ? `${activeDataset.data.length.toLocaleString()} rows · ${activeDataset.columns.length} cols` : 'No dataset'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${datasetDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dataset Dropdown Menu */}
              {datasetDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50 text-xs animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Available Studies</span>
                    <button
                      onClick={() => {
                        onOpenNewDataset();
                        setDatasetDropdownOpen(false);
                      }}
                      className="text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New</span>
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {datasets.map(d => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onSelectDataset(d.id);
                          setDatasetDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                          activeDataset?.id === d.id
                            ? 'bg-indigo-600/30 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="truncate pr-2">{d.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{d.data.length}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 border-b border-slate-800/80 flex justify-center shrink-0">
            <button
              onClick={() => onSelectTab('upload')}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 hover:text-white hover:border-slate-700 transition-colors"
              title={activeDataset ? `${activeDataset.name} (${activeDataset.data.length} rows)` : 'Datasets'}
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Nav Items List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 select-none scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map(group => (
            <div key={group.group} className="space-y-1">
              {(!isCollapsed || isOpenMobile) && (
                <div className="px-2.5 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  {group.group}
                </div>
              )}

              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full text-left rounded-xl flex items-center gap-3 transition-all group ${
                      isCollapsed && !isOpenMobile ? 'justify-center p-2.5' : 'px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold shadow-md shadow-indigo-600/30'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                    title={isCollapsed ? `${item.label}: ${item.description}` : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'
                    }`} />

                    {(!isCollapsed || isOpenMobile) && (
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-xs truncate">{item.label}</span>
                        {item.badge && (
                          <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Quick Tools Launch Island (AI Copilot & Slide Deck) */}
        {(!isCollapsed || isOpenMobile) && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 space-y-1.5 shrink-0">
            {onOpenCopilot && (
              <button
                onClick={onOpenCopilot}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-800/60 hover:to-indigo-800/60 border border-purple-500/30 text-purple-200 text-xs font-bold flex items-center justify-between transition-all group shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span>AI Copilot</span>
                </div>
                <span className="text-[10px] font-mono px-1 rounded bg-purple-500/20 text-purple-300">Prompt</span>
              </button>
            )}

            {onOpenSlideDeck && (
              <button
                onClick={onOpenSlideDeck}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-amber-300 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Presentation className="w-3.5 h-3.5 text-amber-400" />
                  <span>Slide Deck</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Exec</span>
              </button>
            )}
          </div>
        )}

        {/* Sidebar Footer: User Status, Theme & Tour */}
        <div className={`p-3 border-t border-slate-800/80 shrink-0 flex items-center justify-between ${
          isCollapsed && !isOpenMobile ? 'flex-col gap-3 py-3' : ''
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'DA'}
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">
                  {currentUser?.name || 'Data Analyst'}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
            </button>

            {(!isCollapsed || isOpenMobile) && onOpenTour && (
              <button
                onClick={onOpenTour}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Interactive Workspace Tour"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}

            {(!isCollapsed || isOpenMobile) && onLogout && currentUser && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </aside>
    </>
  );
};
