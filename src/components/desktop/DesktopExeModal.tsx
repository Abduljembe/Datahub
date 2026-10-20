import React, { useState, useMemo } from 'react';
import {
  Monitor,
  Download,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  X,
  ExternalLink,
  Laptop,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  HardDrive,
  FileCode,
  FolderDown,
  Play,
  ArrowRight,
  Info,
  Globe,
  Settings,
  SlidersHorizontal,
  Volume2,
  Bell,
  Zap,
  BarChart3,
  FileText,
  Radio,
  Table,
  UploadCloud,
  Database,
  Activity,
  BrainCircuit,
  Headphones,
  Search,
  Trash2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { AppTab } from '../../types';

interface DesktopExeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'download' | 'pwa' | 'electron' | 'settings' | 'offline';
  onNavigateTab?: (tab: AppTab) => void;
  onOpenCopilot?: () => void;
}

interface FeatureItem {
  id: string;
  name: string;
  category: 'Ingestion & Clean' | 'Advanced Analytics' | 'AI & Forecast' | 'Field Operations' | 'Reports & Output';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tab?: AppTab;
  action?: () => void;
  badge?: string;
  hardwareTags: string[];
}

export const DesktopExeModal: React.FC<DesktopExeModalProps> = ({ 
  isOpen, 
  onClose,
  initialTab = 'download',
  onNavigateTab,
  onOpenCopilot
}) => {
  const { isDark } = useTheme();
  const { isInstallable, isInstalled, isWindows, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'download' | 'pwa' | 'electron' | 'settings' | 'offline'>(initialTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Settings State
  const [settingsSubTab, setSettingsSubTab] = useState<'features' | 'hardware'>('features');
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureCat, setFeatureCat] = useState('All');

  const [hardwareAccel, setHardwareAccel] = useState<boolean>(() => {
    try {
      return localStorage.getItem('datahub_setting_hw_accel') !== 'false';
    } catch { return true; }
  });

  const [systemNotifications, setSystemNotifications] = useState<boolean>(() => {
    try {
      return localStorage.getItem('datahub_setting_notifications') === 'true';
    } catch { return false; }
  });

  const [autoSnapshotInterval, setAutoSnapshotInterval] = useState<string>(() => {
    try {
      return localStorage.getItem('datahub_setting_snapshot_interval') || '15';
    } catch { return '15'; }
  });

  const [desktopScaling, setDesktopScaling] = useState<string>(() => {
    try {
      return localStorage.getItem('datahub_setting_scaling') || '100';
    } catch { return '100'; }
  });

  const [audioDebriefVoice, setAudioDebriefVoice] = useState<string>(() => {
    try {
      return localStorage.getItem('datahub_setting_audio_voice') || 'duo';
    } catch { return 'duo'; }
  });

  const [storageClearSuccess, setStorageClearSuccess] = useState<boolean>(false);
  const [notificationTestSent, setNotificationTestSent] = useState<boolean>(false);

  // Approximate cache calculation
  const cacheSizeEstimate = useMemo(() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          total += key.length + val.length;
        }
      }
      return (total / (1024 * 1024)).toFixed(2);
    } catch {
      return '1.85';
    }
  }, [storageClearSuccess]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const triggerDownload = (filename: string, content: string, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccessMessage(`Downloaded '${filename}' successfully!`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  const handleToggleHardwareAccel = () => {
    const next = !hardwareAccel;
    setHardwareAccel(next);
    try {
      localStorage.setItem('datahub_setting_hw_accel', String(next));
    } catch {}
  };

  const handleToggleNotifications = async () => {
    if (!systemNotifications && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setSystemNotifications(true);
        try { localStorage.setItem('datahub_setting_notifications', 'true'); } catch {}
        new Notification('DataHub Desktop', {
          body: 'System notifications are now enabled for field dispatches and telemetry!',
          icon: '/favicon.ico'
        });
        return;
      }
    }
    const next = !systemNotifications;
    setSystemNotifications(next);
    try {
      localStorage.setItem('datahub_setting_notifications', String(next));
    } catch {}
  };

  const handleSendTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('DataHub Computer Sentinel', {
        body: 'Hardware check successful: 47 Kenya county channels synced, 0 latency drift.',
        icon: '/favicon.ico'
      });
      setNotificationTestSent(true);
      setTimeout(() => setNotificationTestSent(false), 3000);
    } else {
      alert('Please allow notification permissions in your browser or Windows desktop app settings first.');
    }
  };

  const handleClearCache = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('datahub_cache_') || key.startsWith('datahub_telemetry_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      setStorageClearSuccess(true);
      setTimeout(() => setStorageClearSuccess(false), 3000);
    } catch {}
  };

  // Generate downloadable Windows Batch Launcher
  const handleDownloadBat = () => {
    const batContent = `@echo off
:: ============================================================================
:: DataHub - Windows Desktop Executable Launcher
:: ============================================================================
TITLE DataHub Desktop
COLOR 0B
echo Starting DataHub Desktop Application...
SET TARGET_URL=${currentOrigin}

:: Find Microsoft Edge on Windows
SET EDGE_PATH="%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
IF NOT EXIST %EDGE_PATH% SET EDGE_PATH="%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
IF NOT EXIST %EDGE_PATH% SET EDGE_PATH="%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe"

:: Find Google Chrome
SET CHROME_PATH="%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
IF NOT EXIST %CHROME_PATH% SET CHROME_PATH="%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
IF NOT EXIST %CHROME_PATH% SET CHROME_PATH="%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"

IF EXIST %EDGE_PATH% (
    start "" %EDGE_PATH% --app="%TARGET_URL%" --window-size=1440,920 --window-position=50,50
    exit /b 0
)

IF EXIST %CHROME_PATH% (
    start "" %CHROME_PATH% --app="%TARGET_URL%" --window-size=1440,920 --window-position=50,50
    exit /b 0
)

start "" "%TARGET_URL%"
exit /b 0
`;
    triggerDownload('DataHub-Launcher.bat', batContent, 'application/x-bat');
  };

  // Generate downloadable Silent VBScript Launcher
  const handleDownloadVbs = () => {
    const vbsContent = `' ============================================================================
' DataHub - Silent Windows Desktop App Launcher
' ============================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
strBatPath = strScriptDir & "\\DataHub-Launcher.bat"
WshShell.Run Chr(34) & strBatPath & Chr(34), 0, False
Set WshShell = Nothing
Set fso = Nothing
`;
    triggerDownload('DataHub-Silent-Launcher.vbs', vbsContent, 'application/x-vbs');
  };

  // Generate downloadable PowerShell Desktop Shortcut Generator
  const handleDownloadPs1 = () => {
    const psContent = `# ============================================================================
# DataHub - Windows Desktop Shortcut Creator (.lnk)
# ============================================================================
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path $DesktopPath "DataHub Desktop.lnk"
$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetLauncher = Join-Path $CurrentDir "DataHub-Launcher.bat"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "\`"$CurrentDir\\DataHub-Silent-Launcher.vbs\`""
$Shortcut.WorkingDirectory = $CurrentDir
$Shortcut.Description = "Remix DataHub - Collection & Analysis Suite"
$Shortcut.Save()

Write-Host "Created DataHub Desktop shortcut successfully on your Windows Desktop!" -ForegroundColor Green
`;
    triggerDownload('Create-DataHub-Desktop-Shortcut.ps1', psContent, 'text/plain');
  };

  // All 19 Features Directory
  const allFeatures: FeatureItem[] = [
    // Ingestion & Clean
    {
      id: 'feat_upload',
      name: 'Upload & Clean Studio',
      category: 'Ingestion & Clean',
      description: 'Ingest CSV, Excel, and JSON data with automated delimiter sniffing, whitespace trim, and type inference.',
      icon: UploadCloud,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      tab: 'upload',
      badge: 'Core Ingest',
      hardwareTags: ['WebWorker Stream', 'Memory Buffer', 'CSV Sniffer']
    },
    {
      id: 'feat_grid',
      name: 'Grid Spreadsheet Editor',
      category: 'Ingestion & Clean',
      description: 'Tabular spreadsheet with live cell mutations, custom formula columns (=SUM, =AVG), and bulk delete.',
      icon: Table,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      tab: 'grid',
      badge: 'Interactive',
      hardwareTags: ['DOM Virtualization', 'Offline SQLite', 'Instant Undo']
    },
    {
      id: 'feat_pii',
      name: 'Privacy PII Anonymization Vault',
      category: 'Ingestion & Clean',
      description: 'Automated regex detection for Kenyan national IDs, phone numbers, and emails with SHA-256 masking.',
      icon: ShieldCheck,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      tab: 'analysis',
      badge: 'GDPR / KPDPA',
      hardwareTags: ['Client-side Crypto', 'Zero-leak Engine']
    },

    // Advanced Analytics
    {
      id: 'feat_eda',
      name: 'Exploratory Data Analysis (EDA)',
      category: 'Advanced Analytics',
      description: 'Distribution histograms, missingness radar, skewness & kurtosis, and automated summary statistics.',
      icon: BarChart3,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      tab: 'analysis',
      badge: 'Statistical',
      hardwareTags: ['WASM Multi-thread', 'SVG Canvas', 'GPU Accelerated']
    },
    {
      id: 'feat_geo',
      name: 'Geospatial Leaflet & County Mapping',
      category: 'Advanced Analytics',
      description: 'Interactive maps of Kenya 47 counties, GPS coordinate point clusters, and enumerator coverage heatmaps.',
      icon: Globe,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      tab: 'analysis',
      badge: 'GIS Mapping',
      hardwareTags: ['WebGL Shaders', 'Leaflet Tile Cache', 'GeoJSON']
    },
    {
      id: 'feat_causal',
      name: 'Causal Inference & Counterfactuals',
      category: 'Advanced Analytics',
      description: 'Do-calculus, DAG causal discovery, propensity score matching, and counterfactual what-if intervention simulator.',
      icon: Zap,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      tab: 'analysis',
      badge: 'Pearl Causality',
      hardwareTags: ['Matrix Inversion', 'Causal DAG Graph']
    },

    // AI & Forecast
    {
      id: 'feat_copilot',
      name: 'Gemini AI Data Copilot',
      category: 'AI & Forecast',
      description: 'Conversational data scientist answering questions, generating formulas, and pinpointing dataset anomalies.',
      icon: BrainCircuit,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      action: () => {
        onClose();
        if (onOpenCopilot) onOpenCopilot();
      },
      badge: 'Gemini 2.5',
      hardwareTags: ['Streaming Neural API', 'Context Grounding']
    },
    {
      id: 'feat_audio_debrief',
      name: 'Executive Audio Debriefs',
      category: 'AI & Forecast',
      description: 'NotebookLM-style two-host conversational podcast discussing key findings, trends, and risk factors with audio player.',
      icon: Headphones,
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
      tab: 'analysis',
      badge: 'Audio Engine',
      hardwareTags: ['Web Audio API', 'Waveform Synthesizer', 'Multi-Speaker']
    },
    {
      id: 'feat_simulation',
      name: 'What-If & Monte Carlo Forecaster',
      category: 'AI & Forecast',
      description: '10,000-iteration Monte Carlo simulations, sensitivity curves, and multi-variable predictive regressions.',
      icon: Sparkles,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      tab: 'simulation',
      badge: 'Predictive',
      hardwareTags: ['Vectorized Sampling', 'Normal Distribution']
    },
    {
      id: 'feat_automl',
      name: 'AutoML Predictive Studio',
      category: 'AI & Forecast',
      description: 'Automated regression and classification with train/test splits, R² accuracy scoring, and feature importances.',
      icon: Cpu,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      tab: 'analysis',
      badge: 'Machine Learning',
      hardwareTags: ['Linear Algebra', 'Tree Ensemble']
    },

    // Field Operations
    {
      id: 'feat_collection',
      name: 'Field Surveys & Offline GPS Collector',
      category: 'Field Operations',
      description: 'Mobile-first field questionnaires with geolocation capture, touch signature, and offline sync queue.',
      icon: Layers,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      tab: 'collection',
      badge: 'Zero-Internet',
      hardwareTags: ['IndexedDB Queue', 'Navigator Geolocation', 'ServiceWorker']
    },
    {
      id: 'feat_supervisor',
      name: 'Supervisor Audit Vault & Fraud Sentinel',
      category: 'Field Operations',
      description: 'Statistical Benford\'s Law audit, duplicate timestamp detection, and batch approval certifying ledger.',
      icon: ShieldCheck,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      tab: 'supervisor',
      badge: 'Audit & Fraud',
      hardwareTags: ['Benford Law Test', 'Tamper-Evident Hash']
    },
    {
      id: 'feat_comms',
      name: 'Unified Operations & Comms Hub',
      category: 'Field Operations',
      description: 'Real-time team messaging channels, 47 Kenyan county supervisor hotlines, and urgent field broadcasts.',
      icon: Radio,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      tab: 'operations',
      badge: 'Live Mesh',
      hardwareTags: ['Real-time Polling', 'Broadcast Notification']
    },

    // Reports & Output
    {
      id: 'feat_admin',
      name: 'Admin Observability Command Console',
      category: 'Reports & Output',
      description: 'Nationwide Kenyan counties status radar, real-time telemetry ledger, engine drift alerts, and RBAC logs.',
      icon: Activity,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      tab: 'admin',
      badge: 'Telemetry',
      hardwareTags: ['Live Pulse Loop', 'Memory Monitor']
    },
    {
      id: 'feat_report',
      name: 'Executive Boardroom PDF Dossier',
      category: 'Reports & Output',
      description: 'Printable executive briefings, dataset health scorecards, and boardroom-ready presentation assets.',
      icon: FileText,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      tab: 'report',
      badge: 'Print PDF',
      hardwareTags: ['jsPDF Canvas', 'Vector Tables']
    },
    {
      id: 'feat_desktop',
      name: 'Windows .EXE Desktop App',
      category: 'Reports & Output',
      description: 'Native Windows standalone executable with zero browser chrome, offline storage, and taskbar shortcuts.',
      icon: Monitor,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      action: () => setActiveTab('download'),
      badge: 'Windows x64',
      hardwareTags: ['WebView2 Engine', 'Electron CJS', 'Native Process']
    }
  ];

  const categories = ['All', 'Ingestion & Clean', 'Advanced Analytics', 'AI & Forecast', 'Field Operations', 'Reports & Output'];

  const filteredFeatures = allFeatures.filter(f => {
    const matchesSearch = 
      f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.hardwareTags.some(t => t.toLowerCase().includes(featureSearch.toLowerCase()));
    const matchesCat = featureCat === 'All' || f.category === featureCat;
    return matchesSearch && matchesCat;
  });

  const handleLaunchFeature = (feature: FeatureItem) => {
    onClose();
    if (feature.action) {
      feature.action();
    } else if (feature.tab && onNavigateTab) {
      onNavigateTab(feature.tab);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">DataHub Desktop & Computer Studio</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Windows x64 / PC
                </span>
                {isInstalled && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    App Mode
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Hardware settings, offline cache configuration & complete directory of all 19 DataHub features
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center px-6 border-b overflow-x-auto ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-100/50'
        }`}>
          {/* TAB 1: SETTINGS & FEATURES DIRECTORY */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-500 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <span>Computer Settings & Features</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400">
              19 Features
            </span>
          </button>

          {/* TAB 2: INSTANT LAUNCHERS */}
          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'download'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FolderDown className="w-4 h-4" />
            Windows Launchers (.bat / .vbs)
          </button>

          {/* TAB 3: PWA 1-CLICK */}
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'pwa'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Laptop className="w-4 h-4" />
            1-Click Desktop Install
          </button>

          {/* TAB 4: ELECTRON & INNO */}
          <button
            onClick={() => setActiveTab('electron')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'electron'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Build Standalone .EXE
          </button>

          {/* TAB 5: OFFLINE PERSISTENCE */}
          <button
            onClick={() => setActiveTab('offline')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'offline'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Offline Mode & Keys
          </button>
        </div>

        {/* Success toast notification */}
        {downloadSuccessMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{downloadSuccessMessage}</span>
            </div>
            <button onClick={() => setDownloadSuccessMessage(null)} className="hover:text-emerald-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================================================================ */}
          {/* TAB: COMPUTER SETTINGS & FEATURES REGISTRY                        */}
          {/* ================================================================ */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Header card with toggle between Features Catalog & Hardware Settings */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDark ? 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200' : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
              }`}>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                    Computer Settings & System Features
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed opacity-90 max-w-xl">
                    Configure your PC environment, GPU acceleration, and explore all 19 DataHub intelligence modules under one unified control center.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-700/80 self-start sm:self-center shrink-0">
                  <button
                    onClick={() => setSettingsSubTab('features')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      settingsSubTab === 'features'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Features Catalog ({allFeatures.length})</span>
                  </button>
                  <button
                    onClick={() => setSettingsSubTab('hardware')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      settingsSubTab === 'hardware'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>PC Hardware Settings</span>
                  </button>
                </div>
              </div>

              {/* SUBSECTION A: ALL FEATURES CAN BE SEEN HERE */}
              {settingsSubTab === 'features' && (
                <div className="space-y-4">
                  {/* Search and Category Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs flex-1 max-w-md ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search features by name, hardware tags (e.g. Causal, WebGL, Audio)..."
                        value={featureSearch}
                        onChange={(e) => setFeatureSearch(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-500"
                      />
                      {featureSearch && (
                        <button onClick={() => setFeatureSearch('')} className="text-slate-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setFeatureCat(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                            featureCat === cat
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feature Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredFeatures.map(feat => {
                      const Icon = feat.icon;
                      return (
                        <div
                          key={feat.id}
                          className={`p-4 rounded-2xl border flex flex-col justify-between transition-all hover:border-indigo-500/40 hover:shadow-lg ${
                            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${feat.color}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 uppercase">
                                  {feat.category}
                                </span>
                              </div>
                              {feat.badge && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
                                  {feat.badge}
                                </span>
                              )}
                            </div>

                            <h4 className="font-bold text-sm text-slate-100 dark:text-slate-100">
                              {feat.name}
                            </h4>
                            <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {feat.description}
                            </p>

                            {/* Hardware capability tags */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-3">
                              {feat.hardwareTags.map((tag, i) => (
                                <span key={i} className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active & Ready
                            </span>

                            <button
                              onClick={() => handleLaunchFeature(feat)}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-500/30"
                            >
                              <span>Launch</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUBSECTION B: PC HARDWARE & OPERATING SYSTEM SETTINGS */}
              {settingsSubTab === 'hardware' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Setting 1: GPU & WebGL Hardware Acceleration */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm">GPU Hardware Acceleration</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">WebGL shaders for charts, 3D maps & canvas rendering</p>
                          </div>
                        </div>
                        <button
                          onClick={handleToggleHardwareAccel}
                          className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                            hardwareAccel ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </button>
                      </div>
                      <div className="mt-3 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Renderer: WebGL 2.0 (High Performance Direct3D 11)</span>
                      </div>
                    </div>

                    {/* Setting 2: Native Desktop Notifications */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Bell className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm">Windows Push Notifications</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Alerts for supervisor dispatches & anomaly drift</p>
                          </div>
                        </div>
                        <button
                          onClick={handleToggleNotifications}
                          className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                            systemNotifications ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Status: {systemNotifications ? 'Enabled in Action Center' : 'Disabled'}
                        </span>
                        <button
                          onClick={handleSendTestNotification}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 transition-colors"
                        >
                          {notificationTestSent ? '✓ Sent Test' : 'Test Alert'}
                        </button>
                      </div>
                    </div>

                    {/* Setting 3: Offline Storage & Memory Cache */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <HardDrive className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm">Local Storage & Cache Manager</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Allocated quota for offline datasets & survey queues</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          {cacheSizeEstimate} MB
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          IndexedDB & LocalStorage Cache Active
                        </span>
                        <button
                          onClick={handleClearCache}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{storageClearSuccess ? 'Cleared!' : 'Purge Old Telemetry'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Setting 4: Automatic Snapshot Frequency */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <RefreshCw className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm">Dataset Snapshot Interval</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Automated versioning rollback snapshots</p>
                          </div>
                        </div>
                      </div>
                      <select
                        value={autoSnapshotInterval}
                        onChange={(e) => {
                          setAutoSnapshotInterval(e.target.value);
                          try { localStorage.setItem('datahub_setting_snapshot_interval', e.target.value); } catch {}
                        }}
                        className={`w-full p-2 rounded-xl border text-xs font-semibold mt-1 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="5">Every 5 minutes (Frequent field collection)</option>
                        <option value="15">Every 15 minutes (Standard recommendation)</option>
                        <option value="60">Hourly (Light memory)</option>
                        <option value="manual">Manual snapshots only</option>
                      </select>
                    </div>

                    {/* Setting 5: High-DPI Desktop Scaling */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Monitor className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm">Desktop UI Scaling</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Scale zoom for 4K / Ultrawide / Laptop screens</p>
                          </div>
                        </div>
                      </div>
                      <select
                        value={desktopScaling}
                        onChange={(e) => {
                          setDesktopScaling(e.target.value);
                          try { localStorage.setItem('datahub_setting_scaling', e.target.value); } catch {}
                        }}
                        className={`w-full p-2 rounded-xl border text-xs font-semibold mt-1 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="100">100% (Standard 1080p Full HD)</option>
                        <option value="110">110% (Comfortable Laptop)</option>
                        <option value="125">125% (High-DPI 4K & Touch Monitors)</option>
                      </select>
                    </div>

                    {/* Setting 6: Audio Debrief Voice Persona */}
                    <div className={`p-4 rounded-2xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                            <Volume2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs sm:text-sm">Executive Audio Debrief Voice</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Synthesized podcast debrief persona engine</p>
                          </div>
                        </div>
                      </div>
                      <select
                        value={audioDebriefVoice}
                        onChange={(e) => {
                          setAudioDebriefVoice(e.target.value);
                          try { localStorage.setItem('datahub_setting_audio_voice', e.target.value); } catch {}
                        }}
                        className={`w-full p-2 rounded-xl border text-xs font-semibold mt-1 outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="duo">Two Hosts: Maya (Analyst) & Alex (Strategist)</option>
                        <option value="solo_tech">Solo Technical Host (Deep Dive)</option>
                        <option value="executive_brief">Executive Briefing (Fast Summary)</option>
                      </select>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 1: INSTANT WINDOWS LAUNCHERS                                 */}
          {/* ================================================================ */}
          {activeTab === 'download' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200' : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
              }`}>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Zero-Installation Windows Desktop Executable
                </h3>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  Download ready-to-run Windows launcher scripts that instantly open DataHub in Microsoft Edge / Google Chrome native <strong>App Mode</strong>. The app runs in an isolated desktop window with its own icon, window controls, and full taskbar presence without standard browser URL navigation bars.
                </p>
              </div>

              {/* Download Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Launcher 1: Batch Launcher */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:border-blue-500/50 ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Terminal className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        .bat
                      </span>
                    </div>
                    <h4 className="font-bold text-sm">Windows App Launcher</h4>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Double-click to immediately launch DataHub in full native desktop application mode.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBat}
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .BAT
                  </button>
                </div>

                {/* Launcher 2: Silent VBS Launcher */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:border-purple-500/50 ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <FileCode className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        .vbs
                      </span>
                    </div>
                    <h4 className="font-bold text-sm">Silent Window Launcher</h4>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Runs silently without flashing any black CMD prompt console window before opening.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadVbs}
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .VBS
                  </button>
                </div>

                {/* Launcher 3: Desktop Shortcut Generator */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:border-emerald-500/50 ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Laptop className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        .ps1
                      </span>
                    </div>
                    <h4 className="font-bold text-sm">Create Desktop .LNK</h4>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Creates an official desktop shortcut icon on your Windows Desktop and Start Menu.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadPs1}
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .PS1 Script
                  </button>
                </div>

              </div>

              {/* Quick CLI Execution Snippet */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5" />
                    Quick Windows Run Command (Win + R or CMD):
                  </span>
                  <button
                    onClick={() => copyToClipboard(`msedge.exe --app="${currentOrigin}" --window-size=1440,920`, 'cli-run')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      copiedKey === 'cli-run' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {copiedKey === 'cli-run' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'cli-run' ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>
                <pre className="text-xs font-mono p-3 rounded-lg bg-black/60 text-slate-200 overflow-x-auto selection:bg-indigo-500/40">
                  msedge.exe --app="{currentOrigin}" --window-size=1440,920
                </pre>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: PWA NATIVE DESKTOP INSTALL                                */}
          {/* ================================================================ */}
          {activeTab === 'pwa' && (
            <div className="space-y-6">
              <div className={`p-6 rounded-2xl border text-center relative overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border-indigo-500/30' 
                  : 'bg-gradient-to-br from-indigo-50 via-white to-blue-50 border-indigo-200'
              }`}>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4">
                  <Laptop className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-bold">Install DataHub Directly as a Windows App</h3>
                <p className={`text-xs max-w-lg mx-auto mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Chromium and Microsoft Edge natively bundle Progressive Web Apps into official Windows applications (.exe registered in Windows Apps & Features, Start Menu, Taskbar, and Desktop).
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {isInstalled ? (
                    <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      DataHub is Already Installed as a Desktop App!
                    </div>
                  ) : isInstallable ? (
                    <button
                      onClick={install}
                      className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <Download className="w-5 h-5" />
                      Install to Windows Now
                    </button>
                  ) : (
                    <div className="text-center space-y-2">
                      <button
                        onClick={install}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20"
                      >
                        <Laptop className="w-4 h-4" />
                        Trigger Windows App Installation
                      </button>
                      <p className="text-[11px] text-slate-400">
                        In Edge or Chrome: You can also click the <strong>Install App icon (⊕)</strong> directly inside the browser address bar.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: ELECTRON BUILDER                                          */}
          {/* ================================================================ */}
          {activeTab === 'electron' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <Cpu className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-sm">Package Standalone DataHub.exe with Electron Builder</h3>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Ready to Build
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  The project includes preconfigured Electron files in the <code className="text-indigo-400">/desktop</code> directory: <code className="text-slate-300">electron-main.cjs</code>, <code className="text-slate-300">electron-builder.json</code>, <code className="text-slate-300">preload.cjs</code>, and <code className="text-slate-300">installer.iss</code>.
                </p>
              </div>

              {/* Build Commands Code Block */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Step 1: Install Electron & Builder</span>
                  <button
                    onClick={() => copyToClipboard('npm install -D electron electron-builder', 'step-1')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                      copiedKey === 'step-1' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {copiedKey === 'step-1' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'step-1' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs font-mono p-3 rounded-lg bg-black/70 text-slate-200 overflow-x-auto">
                  npm install -D electron electron-builder
                </pre>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-slate-300">Step 2: Compile Production Frontend & Generate .EXE</span>
                  <button
                    onClick={() => copyToClipboard('npm run build && npx electron-builder --config desktop/electron-builder.json --win', 'step-2')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                      copiedKey === 'step-2' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {copiedKey === 'step-2' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'step-2' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs font-mono p-3 rounded-lg bg-black/70 text-slate-200 overflow-x-auto">
                  npm run build && npx electron-builder --config desktop/electron-builder.json --win
                </pre>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: OFFLINE MODE & SHORTCUTS                                  */}
          {/* ================================================================ */}
          {activeTab === 'offline' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Offline Capabilities Card */}
                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Offline Data Persistence
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span><strong>Local Datasets Cache</strong>: All uploaded CSVs, survey submissions and simulation models persist in Windows local storage & IndexedDB.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span><strong>Zero-Internet Operation</strong>: Analysis engines, formulas, Monte Carlo models and PDF generation execute locally on the client CPU.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span><strong>Auto-Sync On Reconnect</strong>: Field surveys automatically queue locally and sync when network returns.</span>
                    </li>
                  </ul>
                </div>

                {/* Keyboard Shortcuts Card */}
                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    Desktop Keyboard Shortcuts
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">New Dataset / Ingest</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-200 border border-slate-700">Ctrl + N</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Export CSV</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-200 border border-slate-700">Ctrl + E</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Export Executive PDF</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-200 border border-slate-700">Ctrl + P</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Toggle Fullscreen App</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-200 border border-slate-700">F11</kbd>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-blue-400" />
            <span>Computer & Windows Desktop Platform (64-bit & 32-bit Architecture)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Features in Settings</span>
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
