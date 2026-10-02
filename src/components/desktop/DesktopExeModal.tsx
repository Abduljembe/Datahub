import React, { useState } from 'react';
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
  Globe
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface DesktopExeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopExeModal: React.FC<DesktopExeModalProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const { isInstallable, isInstalled, isWindows, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'download' | 'pwa' | 'electron' | 'offline'>('download');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden ${
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
                <h2 className="text-base sm:text-lg font-bold">DataHub Desktop & Windows .EXE Studio</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Windows x64 / x86
                </span>
                {isInstalled && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Running in App Mode
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Run DataHub as a native standalone Windows application with offline storage, desktop shortcuts & zero browser chrome
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
          <button
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'download'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FolderDown className="w-4 h-4" />
            Instant Windows Launchers (.bat / .vbs)
          </button>

          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'pwa'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Laptop className="w-4 h-4" />
            1-Click Native Desktop App Install
          </button>

          <button
            onClick={() => setActiveTab('electron')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'electron'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Build Standalone .EXE (Electron & Inno)
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'offline'
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Offline Mode & Keyboard Shortcuts
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
          
          {/* TAB 1: INSTANT WINDOWS LAUNCHERS */}
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
                  Download ready-to-run Windows launcher scripts that instantly open DataHub in Microsoft Edge / Google Chrome's native <strong>App Mode</strong>. The app runs in an isolated desktop window with its own icon, window controls, and full taskbar presence without standard browser URL navigation bars.
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

              {/* Turn Bat into real .EXE in 1 Click */}
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                  How to convert into a standalone .EXE file:
                </h4>
                <ol className="text-xs space-y-2 list-decimal list-inside text-slate-300">
                  <li>
                    <strong>Method 1 (Bat To Exe Converter)</strong>: Download free open-source <em>Bat To Exe Converter</em> or <em>Advanced BAT to EXE</em>, select the downloaded <code className="text-indigo-400">DataHub-Launcher.bat</code>, attach <code className="text-indigo-400">favicon.ico</code>, and click <strong>Compile to .EXE</strong>.
                  </li>
                  <li>
                    <strong>Method 2 (PowerShell Compiling)</strong>: Use PS2EXE module: <code className="text-indigo-400">Invoke-PS2EXE .\Create-DataHub-Desktop-Shortcut.ps1 .\DataHub.exe</code>.
                  </li>
                  <li>
                    <strong>Method 3 (Inno Setup Installer)</strong>: Open <code className="text-indigo-400">desktop/installer.iss</code> with Inno Setup 6 and click <strong>Build</strong> to produce <code className="text-emerald-400 font-bold">DataHub-Windows-Setup-v1.0.0.exe</code>.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: PWA NATIVE DESKTOP INSTALL */}
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

              {/* Platform Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="font-bold text-xs flex items-center gap-2 text-blue-400 mb-2">
                    <Monitor className="w-4 h-4" />
                    Microsoft Edge (Windows 10 / 11)
                  </h4>
                  <ol className="text-xs space-y-1.5 list-decimal list-inside text-slate-300">
                    <li>Click the <strong>Settings and more (...)</strong> button in top-right.</li>
                    <li>Select <strong>Apps</strong> &gt; <strong>Install DataHub</strong>.</li>
                    <li>Check <em>Pin to taskbar</em> and <em>Create Desktop shortcut</em>.</li>
                  </ol>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="font-bold text-xs flex items-center gap-2 text-cyan-400 mb-2">
                    <Globe className="w-4 h-4" />
                    Google Chrome
                  </h4>
                  <ol className="text-xs space-y-1.5 list-decimal list-inside text-slate-300">
                    <li>Click the <strong>Install icon (⊕)</strong> on the right side of the address bar.</li>
                    <li>Or click <strong>⋮ (Menu)</strong> &gt; <strong>Cast, save, and share</strong> &gt; <strong>Install page as app...</strong></li>
                    <li>A native Windows shortcut and standalone window will be created.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ELECTRON & INNO SETUP BUILDER */}
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

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-slate-300">Step 3: Output Executables Generated</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs space-y-1.5 text-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>dist-electron/DataHub-Portable-1.0.0.exe</span>
                    <span className="text-[10px] text-slate-400">(Portable single-file .exe)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>dist-electron/DataHub-Setup-1.0.0.exe</span>
                    <span className="text-[10px] text-slate-400">(Official NSIS installer .exe)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OFFLINE MODE & SHORTCUTS */}
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
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Quick Reload Workspace</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-200 border border-slate-700">Ctrl + R</kbd>
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
            <span>Compatible with Windows 11, 10, 8.1 & Windows Server (64-bit & 32-bit)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBat}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              Download .BAT Launcher
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
