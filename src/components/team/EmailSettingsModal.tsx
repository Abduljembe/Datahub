import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Server, 
  Key, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ExternalLink, 
  RefreshCw, 
  Check, 
  Copy,
  Sparkles,
  ShieldCheck,
  History
} from 'lucide-react';

interface EmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipientEmail?: string;
  onConfigUpdated?: () => void;
}

export function EmailSettingsModal({
  isOpen,
  onClose,
  defaultRecipientEmail = 'abduljembe@gmail.com',
  onConfigUpdated,
}: EmailSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'test' | 'outbox'>('config');
  const [provider, setProvider] = useState<'smtp' | 'resend' | 'none'>('smtp');
  
  // SMTP Fields
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [fromAddress, setFromAddress] = useState('invites@datahub.analytics');
  const [fromName, setFromName] = useState('DataHub Workspace');

  // Resend API Key
  const [resendApiKey, setResendApiKey] = useState('');

  // Status & Testing
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testRecipient, setTestRecipient] = useState(defaultRecipientEmail);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);

  // Outbox / Sent invitations
  const [invitationsList, setInvitationsList] = useState<any[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      fetchOutbox();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/email/config');
      if (res.ok) {
        const data = await res.json();
        if (data.provider && data.provider !== 'none') {
          setProvider(data.provider);
        }
        if (data.smtpHost) setSmtpHost(data.smtpHost);
        if (data.smtpPort) setSmtpPort(data.smtpPort.toString());
        if (data.fromAddress) setFromAddress(data.fromAddress);
        if (data.fromName) setFromName(data.fromName);
        if (data.smtpSecure !== undefined) setSmtpSecure(data.smtpSecure);
      }
    } catch (err) {
      console.warn('Failed to load email config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOutbox = async () => {
    try {
      const res = await fetch('/api/team/invitations');
      if (res.ok) {
        const data = await res.json();
        setInvitationsList(data.invitations || []);
      }
    } catch (err) {
      console.warn('Failed to load invitations:', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          smtpHost,
          smtpPort: parseInt(smtpPort, 10) || 587,
          smtpUser,
          smtpPass,
          smtpSecure,
          resendApiKey,
          fromAddress,
          fromName,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        if (onConfigUpdated) onConfigUpdated();
      }
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testRecipient || !testRecipient.includes('@')) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/email/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testRecipient }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `Live test email successfully delivered to ${testRecipient} via ${data.mode?.toUpperCase()}! Check your inbox.`,
        });
      } else {
        setTestResult({
          success: false,
          message: 'Delivery failed',
          error: data.error || 'Unknown outbound error. Check your credentials or firewall.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Network error',
        error: err.message || 'Failed to communicate with test endpoint.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/90 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Email Dispatch & Outbox Center
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Automated Delivery
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure outbound email delivery (Gmail, Resend, or SMTP) and track dispatched invitations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 gap-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Outbound Email Server</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'test'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Delivery</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('outbox');
              fetchOutbox();
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'outbox'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Workspace Outbox ({invitationsList.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              
              {/* Informational Banner */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-300 text-xs">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Why didn't an automated email arrive yet?</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  In cloud container environments, web servers cannot send unauthenticated emails anonymously over the internet (to protect recipient inboxes like Gmail and Outlook from spam).
                  To have DataHub deliver emails directly into inboxes in the background, connect an authenticated email service below, or use the <strong>1-Click Gmail/Outlook dispatch</strong> built into every invitation.
                </p>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] block">
                  Select Delivery Method:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('smtp');
                      setSmtpHost('smtp.gmail.com');
                      setSmtpPort('587');
                      setSmtpSecure(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'smtp' && smtpHost.includes('gmail')
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Gmail / Google</div>
                    <div className="text-[10px] text-slate-400 mt-1">App Password via TLS 587</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProvider('resend')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'resend'
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Resend API</div>
                    <div className="text-[10px] text-slate-400 mt-1">HTTP-based (Zero port blocks)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProvider('smtp');
                      if (smtpHost.includes('gmail')) setSmtpHost('smtp.sendgrid.net');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      provider === 'smtp' && !smtpHost.includes('gmail')
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Custom SMTP</div>
                    <div className="text-[10px] text-slate-400 mt-1">SendGrid, SES, Mailgun</div>
                  </button>
                </div>
              </div>

              {/* GMAIL / SMTP CONFIG */}
              {provider === 'smtp' && (
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  
                  {smtpHost.includes('gmail') && (
                    <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-[11px] space-y-1">
                      <span className="font-bold block text-indigo-300">💡 Using Gmail App Password:</span>
                      <p className="text-slate-300">
                        1. Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-cyan-400">Google Account Security → 2-Step Verification → App Passwords</a>.
                      </p>
                      <p className="text-slate-300">
                        2. Create an App Password called "DataHub", copy the 16-character code, and paste it below.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">SMTP Host</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={e => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Port</label>
                      <input
                        type="text"
                        value={smtpPort}
                        onChange={e => setSmtpPort(e.target.value)}
                        placeholder="587"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">SMTP Username (Email)</label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={e => setSmtpUser(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">
                      {smtpHost.includes('gmail') ? '16-Character App Password' : 'SMTP Password'}
                    </label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={e => setSmtpPass(e.target.value)}
                      placeholder="•••• •••• •••• ••••"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">From Name</label>
                      <input
                        type="text"
                        value={fromName}
                        onChange={e => setFromName(e.target.value)}
                        placeholder="DataHub Workspace"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">From Address</label>
                      <input
                        type="email"
                        value={fromAddress}
                        onChange={e => setFromAddress(e.target.value)}
                        placeholder="invites@datahub.analytics"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                      {saveSuccess && (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Settings saved successfully!</span>
                        </>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save SMTP Settings</span>
                    </button>
                  </div>
                </form>
              )}

              {/* RESEND CONFIG */}
              {provider === 'resend' && (
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 text-[11px] space-y-1">
                    <span className="font-bold block text-cyan-300">💡 Resend HTTP Email API:</span>
                    <p className="text-slate-300">
                      Resend transmits emails over HTTPS (port 443), making it immune to cloud container port restrictions.
                      Get a free key at <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline font-bold text-cyan-400">resend.com</a> (3,000 free emails/month).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Resend API Key</label>
                    <input
                      type="password"
                      value={resendApiKey}
                      onChange={e => setResendApiKey(e.target.value)}
                      placeholder="re_123456789_abcdefg"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Verified Sender Email</label>
                    <input
                      type="text"
                      value={fromAddress}
                      onChange={e => setFromAddress(e.target.value)}
                      placeholder="onboarding@resend.dev or yourdomain.com"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
                      {saveSuccess && (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Settings saved successfully!</span>
                        </>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-600/30 flex items-center gap-2"
                    >
                      {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Save Resend API Key</span>
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* TAB 2: TEST LIVE EMAIL */}
          {activeTab === 'test' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-slate-300">
                <span className="font-bold text-white text-xs block">Verify Real Outbound Delivery</span>
                <p className="text-[11px] text-slate-400">
                  Send a live test verification email from the DataHub server to your email address to confirm that emails can reach your inbox.
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-300">Recipient Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={isTesting || !testRecipient}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isTesting ? 'Sending...' : 'Send Live Test'}</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-2xl border ${
                  testResult.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.error && (
                    <div className="mt-2 p-2.5 rounded-xl bg-black/40 border border-rose-500/20 font-mono text-[11px] text-rose-300">
                      {testResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WORKSPACE OUTBOX & SENT INVITATIONS */}
          {activeTab === 'outbox' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Dispatched Workspace Invitations:</span>
                <button
                  onClick={fetchOutbox}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Outbox</span>
                </button>
              </div>

              {invitationsList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 text-center text-slate-400 space-y-1">
                  <Mail className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-medium text-slate-300">No invitations dispatched yet.</p>
                  <p className="text-[11px]">Invite a colleague from the Team Directory to generate invitation tokens.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitationsList.map((inv, idx) => (
                    <div
                      key={inv.token || idx}
                      className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{inv.name}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                              {inv.role}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'accepted' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {inv.status === 'accepted' ? 'Accepted Member' : 'Pending Acceptance'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{inv.email}</div>
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono text-right">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                        {/* 1-Click Gmail */}
                        <a
                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(inv.email)}&su=${encodeURIComponent(`[Invitation] You've been invited to join DataHub Workspace`)}&body=${encodeURIComponent(`Hi ${inv.name},\n\nYou have been invited to join DataHub as a ${inv.role}.\nAccept your invitation here:\n${inv.inviteUrl}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Mail className="w-3 h-3 text-red-400" />
                          <span>Send via Gmail</span>
                        </a>

                        {/* Copy Link */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inv.inviteUrl);
                            setCopiedToken(inv.token);
                            setTimeout(() => setCopiedToken(null), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                        >
                          {copiedToken === inv.token ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                          <span>{copiedToken === inv.token ? 'Copied!' : 'Copy Invite Link'}</span>
                        </button>

                        {/* Copy Full Email Text */}
                        <button
                          onClick={() => {
                            const fullMsg = `Subject: [Invitation] Workspace Admin invited you to join DataHub Analytics\n\nHi ${inv.name},\n\nYou have been invited to join the DataHub Analytics Platform as a ${inv.role}.\n\nAccept your invitation and join the workspace:\n${inv.inviteUrl}\n\nToken: ${inv.token}`;
                            navigator.clipboard.writeText(fullMsg);
                            setCopiedToken(`text_${inv.token}`);
                            setTimeout(() => setCopiedToken(null), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                        >
                          {copiedToken === `text_${inv.token}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                          <span>{copiedToken === `text_${inv.token}` ? 'Copied Text!' : 'Copy Email Message'}</span>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>TLS encryption supported for outbound mail</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
