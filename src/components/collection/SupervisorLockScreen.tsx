import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Key,
  Fingerprint,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Users,
  Radio,
  Sparkles,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Clock,
  ChevronRight,
  FileKey,
  Layers,
  Award
} from 'lucide-react';
import {
  SupervisorSession,
  SupervisorAccount,
  DEFAULT_SUPERVISOR_ACCOUNTS,
  getStoredSupervisorAccounts,
  authenticateWithPassword,
  authenticateWithPin,
  authenticateWithEmergencyRecovery,
  getLockoutState,
  MASTER_EMERGENCY_RECOVERY_KEY
} from '../../utils/supervisorAuthEngine';
import { useTheme } from '../../context/ThemeContext';

interface SupervisorLockScreenProps {
  onUnlockSuccess: (session: SupervisorSession) => void;
  onCancel?: () => void;
}

type AuthMode = 'passkey' | 'pin' | 'quick_badges' | 'emergency';

export const SupervisorLockScreen: React.FC<SupervisorLockScreenProps> = ({
  onUnlockSuccess,
  onCancel
}) => {
  const { isDark } = useTheme();

  const [authMode, setAuthMode] = useState<AuthMode>('passkey');
  
  // Passkey form
  const [identifier, setIdentifier] = useState('supervisor@datahub.io');
  const [passkey, setPasskey] = useState('SupervisorHQ2026!');
  const [showPasskey, setShowPasskey] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // PIN form
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pinIndex, setPinIndex] = useState(0);

  // Emergency form
  const [emergencyPhrase, setEmergencyPhrase] = useState('');

  // Status & Lockout
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);
  const [accounts, setAccounts] = useState<SupervisorAccount[]>(() => getStoredSupervisorAccounts());

  // Check lockout on mount & interval
  useEffect(() => {
    const checkLockout = () => {
      const state = getLockoutState();
      if (state.lockedUntil && state.lockedUntil > Date.now()) {
        setLockoutCountdown(Math.ceil((state.lockedUntil - Date.now()) / 1000));
      } else {
        setLockoutCountdown(0);
      }
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePasswordLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    if (!identifier.trim() || !passkey.trim()) {
      setErrorMsg('Please enter your supervisor official email or badge ID and confidential passkey.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = authenticateWithPassword(identifier, passkey, rememberMe);
      setIsLoading(false);
      if (res.success && res.session) {
        onUnlockSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Authentication failed. Please verify credentials.');
      }
    }, 450);
  };

  const handlePinSubmit = (pinVal: string) => {
    setErrorMsg(null);
    if (pinVal.length < 4) {
      setErrorMsg('Please enter the complete 4-digit supervisor PIN.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = authenticateWithPin(pinVal, rememberMe);
      setIsLoading(false);
      if (res.success && res.session) {
        onUnlockSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Incorrect security PIN.');
        setPinDigits(['', '', '', '']);
        setPinIndex(0);
      }
    }, 400);
  };

  const handlePinDigitClick = (num: string) => {
    if (lockoutCountdown > 0) return;
    const nextDigits = [...pinDigits];
    const targetIdx = nextDigits.findIndex(d => d === '');
    if (targetIdx !== -1) {
      nextDigits[targetIdx] = num;
      setPinDigits(nextDigits);
      if (targetIdx === 3) {
        // Complete
        handlePinSubmit(nextDigits.join(''));
      }
    }
  };

  const handlePinBackspace = () => {
    const nextDigits = [...pinDigits];
    for (let i = 3; i >= 0; i--) {
      if (nextDigits[i] !== '') {
        nextDigits[i] = '';
        setPinDigits(nextDigits);
        break;
      }
    }
  };

  const handleQuickBadgeSelect = (acc: SupervisorAccount) => {
    setIdentifier(acc.email);
    setPasskey(acc.secretPasskey);
    setAuthMode('passkey');
    setErrorMsg(null);
  };

  const handleEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!emergencyPhrase.trim()) {
      setErrorMsg('Please enter the supervisor master emergency override pass-phrase.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = authenticateWithEmergencyRecovery(emergencyPhrase, rememberMe);
      setIsLoading(false);
      if (res.success && res.session) {
        onUnlockSuccess(res.session);
      } else {
        setErrorMsg(res.error || 'Invalid emergency override phrase.');
      }
    }, 500);
  };

  return (
    <div className={`min-h-[80vh] flex items-center justify-center p-4 md:p-8 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${
        isDark ? 'bg-slate-900/95 border-indigo-900/40 shadow-indigo-950/40' : 'bg-white/95 border-slate-200 shadow-xl'
      }`}>
        {/* Top Security Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border-b border-indigo-500/20 px-6 py-6 text-white">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <ShieldCheck className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    Restricted Area
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    Supervisor Protocol v3.8
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
                  Supervisor Operations Vault
                </h2>
              </div>
            </div>

            {onCancel && (
              <button
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Exit Vault
              </button>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-2.5 max-w-xl">
            This module houses central field enumerator fleet controls, raw ingestion streams, quality validation pipelines, and master dataset ingestion. Authorized supervisory credentials required.
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className={`grid grid-cols-4 border-b text-xs font-semibold ${
          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-100/60'
        }`}>
          <button
            onClick={() => { setAuthMode('passkey'); setErrorMsg(null); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              authMode === 'passkey'
                ? 'border-indigo-600 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Passkey</span> Login
          </button>
          
          <button
            onClick={() => { setAuthMode('pin'); setErrorMsg(null); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              authMode === 'pin'
                ? 'border-indigo-600 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>4-Digit PIN</span>
          </button>

          <button
            onClick={() => { setAuthMode('quick_badges'); setErrorMsg(null); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              authMode === 'quick_badges'
                ? 'border-indigo-600 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Supervisor</span> Badges
          </button>

          <button
            onClick={() => { setAuthMode('emergency'); setErrorMsg(null); }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              authMode === 'emergency'
                ? 'border-indigo-600 text-indigo-500 bg-indigo-500/5 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileKey className="w-3.5 h-3.5" />
            <span>Override</span>
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Lockout Warning Banner */}
          {lockoutCountdown > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-start gap-3 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-rose-200 text-sm">Security Lockout Engaged</p>
                <p className="mt-0.5">Too many failed login attempts recorded. System is temporarily locked for anti-brute-force defense.</p>
                <div className="mt-2 font-mono font-bold text-rose-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Lockout expires in: {lockoutCountdown} seconds</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && lockoutCountdown === 0 && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE 1: PASSKEY / CREDENTIAL LOGIN */}
          {authMode === 'passkey' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-300">
                  Supervisor Official Email or Badge ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    disabled={lockoutCountdown > 0 || isLoading}
                    placeholder="e.g. supervisor@datahub.io or DIR-HQ-9901"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all outline-none ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                    }`}
                  />
                  <Users className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Confidential Supervisor Passkey
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasskey(!showPasskey)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    {showPasskey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPasskey ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasskey ? 'text' : 'password'}
                    value={passkey}
                    onChange={e => setPasskey(e.target.value)}
                    disabled={lockoutCountdown > 0 || isLoading}
                    placeholder="Enter supervisor passkey"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all outline-none ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white focus:border-indigo-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-600'
                    }`}
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                  <span>Keep vault session active on this device</span>
                </label>

                <button
                  type="button"
                  onClick={() => setAuthMode('emergency')}
                  className="text-slate-400 hover:text-indigo-400 text-xs transition-colors"
                >
                  Forgot passkey?
                </button>
              </div>

              <button
                type="submit"
                disabled={lockoutCountdown > 0 || isLoading}
                className={`w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                  lockoutCountdown > 0
                    ? 'bg-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Supervisory Identity...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Authenticate & Access Supervisor Vault</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 2: QUICK 4-DIGIT SECURITY PIN */}
          {authMode === 'pin' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-xs text-slate-400">
                  Enter your registered 4-digit supervisor terminal PIN for instant access
                </p>
                
                {/* Visual PIN Dots / Digits */}
                <div className="flex items-center justify-center gap-3 my-4">
                  {pinDigits.map((digit, idx) => (
                    <div
                      key={idx}
                      className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-mono font-bold transition-all ${
                        digit !== ''
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md shadow-indigo-500/20 scale-105'
                          : isDark ? 'border-slate-700 bg-slate-800/80 text-slate-500' : 'border-slate-300 bg-slate-100 text-slate-400'
                      }`}
                    >
                      {digit ? '•' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dialpad */}
              <div className="max-w-xs mx-auto grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    disabled={lockoutCountdown > 0 || isLoading}
                    onClick={() => handlePinDigitClick(num)}
                    className={`py-3.5 rounded-xl font-mono text-lg font-bold transition-all active:scale-95 ${
                      isDark
                        ? 'bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700/60'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={lockoutCountdown > 0 || isLoading}
                  onClick={() => setPinDigits(['', '', '', ''])}
                  className={`py-3.5 rounded-xl font-semibold text-xs transition-all active:scale-95 ${
                    isDark ? 'bg-slate-800/40 hover:bg-slate-800 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Clear
                </button>

                <button
                  type="button"
                  disabled={lockoutCountdown > 0 || isLoading}
                  onClick={() => handlePinDigitClick('0')}
                  className={`py-3.5 rounded-xl font-mono text-lg font-bold transition-all active:scale-95 ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-white border border-slate-700/60'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                  }`}
                >
                  0
                </button>

                <button
                  type="button"
                  disabled={lockoutCountdown > 0 || isLoading}
                  onClick={handlePinBackspace}
                  className={`py-3.5 rounded-xl font-semibold text-xs transition-all active:scale-95 ${
                    isDark ? 'bg-slate-800/40 hover:bg-slate-800 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  ⌫ Del
                </button>
              </div>

              <div className="text-center">
                <span className="text-[11px] text-slate-400">
                  Default Lead Supervisor PIN: <code className="text-indigo-400 font-mono font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">9922</code> (Chief) or <code className="text-indigo-400 font-mono font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">7733</code> (Auditor)
                </span>
              </div>
            </div>
          )}

          {/* MODE 3: PRE-COMMISSIONED SUPERVISOR BADGES (QUICK-AUTHENTICATE) */}
          {authMode === 'quick_badges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Select an authorized supervisory profile to auto-fill verified credentials:
                </p>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  3 Registered Badges
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {accounts.map(acc => (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      isDark ? 'bg-slate-800/50 border-slate-700/80 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${acc.avatarGradient} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                        {acc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{acc.name}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {acc.badgeId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{acc.role}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{acc.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleQuickBadgeSelect(acc)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                      >
                        <span>Select & Autofill</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODE 4: EMERGENCY BYPASS */}
          {authMode === 'emergency' && (
            <form onSubmit={handleEmergencySubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-200">HQ Master Emergency Override</p>
                  <p className="mt-0.5">Use this channel only if you have lost access to your primary supervisor credentials. All emergency sessions are logged to the security audit trail.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-300">
                  Master Emergency Recovery Phrase / Token
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={emergencyPhrase}
                    onChange={e => setEmergencyPhrase(e.target.value)}
                    placeholder="Enter emergency recovery token (e.g. SUPERVISOR-2026-HQ)"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono transition-all outline-none ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-white focus:border-amber-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
                    }`}
                  />
                  <FileKey className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Demo Master Key: <code className="text-amber-400 font-mono font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">SUPERVISOR-2026-HQ</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={lockoutCountdown > 0 || isLoading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Emergency Token...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Execute Emergency Vault Access</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Security Badges */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-indigo-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                AES-256 Encrypted Stream
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enumerator Fleet Gate active
              </span>
            </div>

            <div className="text-slate-400 font-mono">
              Terminal: HQ-CENTRAL-01
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
