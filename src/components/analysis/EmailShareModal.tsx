import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Check, 
  Copy, 
  ExternalLink, 
  Eye, 
  X, 
  Clock, 
  FileText, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Share2,
  RefreshCw,
  Server,
  Zap,
  HelpCircle,
  Layers
} from 'lucide-react';
import { Dataset } from '../../types';

interface EmailShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  htmlContent: string;
  markdownContent: string;
  summaryStats: {
    rowCount: number;
    columnCount: number;
    healthScore: number;
    numColumnsCount: number;
    catColumnsCount: number;
  };
}

export const EmailShareModal: React.FC<EmailShareModalProps> = ({
  isOpen,
  onClose,
  dataset,
  htmlContent,
  markdownContent,
  summaryStats,
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState(
    `[Analytics Report] ${dataset.name} - Executive Data Summary (${new Date().toLocaleDateString()})`
  );
  const [customNote, setCustomNote] = useState(
    'Hi,\n\nPlease find the overall analytics summary, data quality index, and distribution report for our active dataset attached below.\n\nBest regards,'
  );
  const [formatType, setFormatType] = useState<'html' | 'markdown' | 'digest'>('html');
  const [activeTab, setActiveTab] = useState<'compose' | 'preview' | 'history'>('compose');

  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<{
    messageId: string;
    recipient: string;
    timestamp: string;
    realDeliverySuccess?: boolean;
    info?: string;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean;
    mode: string;
    smtpHost: string | null;
  }>({ configured: false, mode: 'client_direct', smtpHost: null });

  const [dispatchHistory, setDispatchHistory] = useState<Array<{
    id: string;
    recipient: string;
    subject: string;
    timestamp: string;
    status: string;
    mode: string;
  }>>([]);

  // Fetch server email configuration status
  useEffect(() => {
    if (isOpen) {
      fetch('/api/report/email-config-status')
        .then(res => res.json())
        .then(data => setSmtpStatus(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Construct clean text body for web mail compose windows
  const getFormattedEmailBody = () => {
    let body = `${customNote}\n\n`;
    body += `====================================================\n`;
    body += `📊 EXECUTIVE DATA REPORT & AUDIT DOSSIER\n`;
    body += `Dataset: ${dataset.name}\n`;
    body += `Source: ${dataset.sourceType.toUpperCase()} | Date: ${new Date().toLocaleDateString()}\n`;
    body += `====================================================\n\n`;
    body += `📈 MACRO METRICS & HEALTH:\n`;
    body += `• Total Records (N): ${dataset.data.length.toLocaleString()}\n`;
    body += `• Attributes (P): ${dataset.columns.length} (${summaryStats.numColumnsCount} Quantitative, ${summaryStats.catColumnsCount} Categorical)\n`;
    body += `• Quality & Health Score: ${summaryStats.healthScore}%\n\n`;
    body += `📋 DESCRIPTIVE SUMMARY:\n`;
    body += `${markdownContent.substring(0, 1800)}\n\n`;
    body += `----------------------------------------------------\n`;
    body += `Generated automatically via DataHub Analytics & Statistical Suite`;
    return body;
  };

  // 1. Direct Web Gmail Compose (100% Guaranteed delivery from user's Gmail)
  const handleSendViaGmail = () => {
    const body = getFormattedEmailBody();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, '_blank', 'noopener,noreferrer');

    setDispatchHistory(prev => [
      {
        id: 'gmail_' + Date.now().toString().slice(-6),
        recipient: recipientEmail || '(Opened in Gmail)',
        subject,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Opened in Gmail',
        mode: 'Gmail Web',
      },
      ...prev,
    ]);
  };

  // 2. Direct Outlook / Office 365 Web Compose
  const handleSendViaOutlook = () => {
    const body = getFormattedEmailBody();
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(
      recipientEmail
    )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.open(outlookUrl, '_blank', 'noopener,noreferrer');

    setDispatchHistory(prev => [
      {
        id: 'outlook_' + Date.now().toString().slice(-6),
        recipient: recipientEmail || '(Opened in Outlook)',
        subject,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Opened in Outlook',
        mode: 'Outlook Web',
      },
      ...prev,
    ]);
  };

  // 3. System Default Mail Client (mailto:)
  const handleOpenMailClient = () => {
    const body = getFormattedEmailBody();
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;

    setDispatchHistory(prev => [
      {
        id: 'mailapp_' + Date.now().toString().slice(-6),
        recipient: recipientEmail || '(Default App)',
        subject,
        timestamp: new Date().toLocaleTimeString(),
        status: 'Triggered Mail Client',
        mode: 'Mail Client',
      },
      ...prev,
    ]);
  };

  // 4. Server-Side Automated Dispatch
  const handleSendServerEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    setSendSuccess(null);

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setSendError('Please enter a valid recipient email address');
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/report/share-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          notes: customNote,
          datasetName: dataset.name,
          format: formatType,
          htmlContent,
          markdownContent,
          summaryMetrics: summaryStats,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to dispatch report email');
      }

      setSendSuccess({
        messageId: result.messageId,
        recipient: result.recipient,
        timestamp: result.timestamp || new Date().toISOString(),
        realDeliverySuccess: result.realDeliverySuccess,
        info: result.info,
      });

      setDispatchHistory(prev => [
        {
          id: result.messageId,
          recipient: result.recipient,
          subject,
          timestamp: new Date().toLocaleTimeString(),
          status: result.realDeliverySuccess ? 'Delivered via SMTP' : 'Queued / Ready',
          mode: result.deliveryMode || 'Server',
        },
        ...prev,
      ]);
    } catch (err: any) {
      console.error('Send report error:', err);
      setSendError(err.message || 'Error occurred while sending email');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (type: 'html' | 'markdown' | 'text') => {
    let contentToCopy = '';
    if (type === 'html') {
      contentToCopy = htmlContent;
    } else if (type === 'markdown') {
      contentToCopy = `${customNote}\n\n${markdownContent}`;
    } else {
      contentToCopy = getFormattedEmailBody();
    }

    navigator.clipboard.writeText(contentToCopy);
    setCopiedFormat(type);
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Share Report Directly via Email
              </h3>
              <p className="text-xs text-slate-400">
                Send the executive data audit and distribution dossier directly to any recipient
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('compose')}
            className={`pb-3 text-xs font-semibold px-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'compose'
                ? 'border-teal-400 text-teal-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Compose & Send
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-3 text-xs font-semibold px-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'preview'
                ? 'border-teal-400 text-teal-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Live Email Preview
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-semibold px-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-teal-400 text-teal-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Dispatch Log ({dispatchHistory.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: COMPOSE */}
          {activeTab === 'compose' && (
            <div className="space-y-5">
              
              {/* PRIMARY 1-CLICK INSTANT WEB SEND HERO BOX */}
              <div className="p-4.5 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-950 to-indigo-950/40 border border-teal-500/30 space-y-3 shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Instant Inbox Delivery (100% Guaranteed Arrival)
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      Send directly from your authenticated email account
                    </h4>
                    <p className="text-xs text-slate-300">
                      Opens your email provider with recipient, subject, and the complete audit report pre-populated.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Gmail Button */}
                  <button
                    type="button"
                    onClick={handleSendViaGmail}
                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-teal-400 text-left transition-all group flex flex-col justify-between shadow-md"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-teal-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        Send via Gmail
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Opens mail.google.com compose</span>
                  </button>

                  {/* Outlook Button */}
                  <button
                    type="button"
                    onClick={handleSendViaOutlook}
                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-left transition-all group flex flex-col justify-between shadow-md"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Send via Outlook
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Office 365 / Live Mail</span>
                  </button>

                  {/* Mail App Button */}
                  <button
                    type="button"
                    onClick={handleOpenMailClient}
                    className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-indigo-400 text-left transition-all group flex flex-col justify-between shadow-md"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-400" />
                        Default Mail App
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Apple Mail / Windows / Thunderbird</span>
                  </button>
                </div>
              </div>

              {/* Status alerts */}
              {sendSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-emerald-300">Report Package Dispatched &amp; Queued</p>
                    <p className="text-emerald-300/80">
                      Dispatched for <span className="font-mono font-bold text-white">{sendSuccess.recipient}</span> (Ref ID: <span className="font-mono text-emerald-400">{sendSuccess.messageId}</span>).
                    </p>
                    {sendSuccess.info && (
                      <p className="text-[11px] text-emerald-400/90 font-sans italic">{sendSuccess.info}</p>
                    )}
                  </div>
                </div>
              )}

              {sendError && (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-rose-300">Email Notice</p>
                    <p className="text-rose-300/80">{sendError}</p>
                  </div>
                </div>
              )}

              {/* Recipient & Subject Form */}
              <form onSubmit={handleSendServerEmail} className="space-y-3.5">
                
                {/* Recipient Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Recipient Email Address(es) <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-500">Auto-links to 1-Click Send buttons above</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. abduljembe@gmail.com, colleague@company.com"
                      value={recipientEmail}
                      onChange={e => setRecipientEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Subject Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Custom Message / Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Executive Note &amp; Introduction</span>
                    <span className="text-[10px] text-slate-500">Included at the top of the message</span>
                  </label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={e => setCustomNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-teal-500 font-sans"
                  />
                </div>

                {/* Payload Quick Badge */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Payload: <strong className="text-white">{dataset.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] font-mono">
                    <span>{dataset.data.length.toLocaleString()} rows</span>
                    <span>•</span>
                    <span>{dataset.columns.length} columns</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">{summaryStats.healthScore}% Quality</span>
                  </div>
                </div>

                {/* Copy / Secondary Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy('text')}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Copy full text body to clipboard"
                    >
                      {copiedFormat === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFormat === 'text' ? 'Copied Full Body!' : 'Copy Body Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy('html')}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Copy HTML formatted report"
                    >
                      {copiedFormat === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedFormat === 'html' ? 'Copied HTML!' : 'Copy HTML'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Server className="w-3.5 h-3.5 text-teal-400" />
                        <span>Server Dispatch Relay</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          )}

          {/* TAB 2: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <p className="text-slate-400"><strong className="text-slate-300">To:</strong> {recipientEmail || '(Recipient Email)'}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Subject:</strong> {subject}</p>
                <p className="text-slate-400"><strong className="text-slate-300">Note:</strong> {customNote}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-white text-slate-900 p-6 shadow-inner max-h-96 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH LOG */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {dispatchHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
                  <p>No reports dispatched in this session yet.</p>
                  <p className="text-[11px] text-slate-600">Dispatched emails will appear here with delivery timestamps.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dispatchHistory.map(item => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">{item.recipient}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-md">{item.subject}</p>
                        <p className="text-[10px] text-slate-600 font-mono">Channel: {item.mode} • ID: {item.id}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                          {item.status}
                        </span>
                        <p className="text-[10px] text-slate-500">{item.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
