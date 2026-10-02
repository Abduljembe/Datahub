import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Link2,
  Copy,
  Check,
  Download,
  Printer,
  Smartphone,
  ExternalLink,
  Sparkles,
  Share2,
  Sliders,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Dataset } from '../../types';

interface PublicSurveyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset?: Dataset;
  formTitle?: string;
  onRespondentSubmit?: (submission: Record<string, any>) => void;
}

export const PublicSurveyShareModal: React.FC<PublicSurveyShareModalProps> = ({
  isOpen,
  onClose,
  dataset,
  formTitle = 'Customer Experience & Feedback Study',
  onRespondentSubmit,
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [qrDarkColor, setQrDarkColor] = useState<string>('#0f172a');
  const [qrLightColor, setQrLightColor] = useState<string>('#ffffff');
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);
  const [surveySlug, setSurveySlug] = useState<string>(() => {
    return (dataset?.name || 'cx_study')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 24);
  });

  // Test submission state in respondent simulator
  const [testParticipant, setTestParticipant] = useState<string>('Alex Johnson');
  const [testRating, setTestRating] = useState<number>(5);
  const [testFeedback, setTestFeedback] = useState<string>(
    'The survey experience was seamless and took less than 45 seconds to submit.'
  );
  const [testSubmitted, setTestSubmitted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Computed public survey link
  const surveyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?survey=${surveySlug}${isKioskMode ? '&mode=kiosk' : ''}`
    : `https://datahub.app/survey/${surveySlug}`;

  // Render QR code to canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        surveyUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: qrDarkColor,
            light: qrLightColor,
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [isOpen, surveyUrl, qrDarkColor, qrLightColor]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="${surveyUrl}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `qrcode_${surveySlug}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrintPoster = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrDataUrl = canvasRef.current?.toDataURL('image/png') || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Survey Poster - ${formTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
            }
            .poster {
              max-width: 500px;
              margin: 0 auto;
              border: 3px solid #e2e8f0;
              border-radius: 24px;
              padding: 40px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }
            h1 { font-size: 26px; margin-bottom: 8px; color: #1e293b; }
            p { color: #64748b; font-size: 15px; margin-bottom: 24px; }
            img { width: 240px; height: 240px; margin: 10px 0; }
            .badge {
              display: inline-block;
              background: #e0e7ff;
              color: #4338ca;
              font-weight: bold;
              padding: 6px 14px;
              border-radius: 9999px;
              font-size: 13px;
              margin-bottom: 16px;
            }
            .url { font-family: monospace; font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="poster">
            <span class="badge">Scan & Respond</span>
            <h1>${formTitle}</h1>
            <p>Your voice directly shapes our product and services. Point your phone camera at the QR code below to begin.</p>
            <img src="${qrDataUrl}" alt="Survey QR Code" />
            <div class="url">${surveyUrl}</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleTestSubmit = () => {
    if (!testParticipant || !testFeedback) return;
    setTestSubmitted(true);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });

    if (onRespondentSubmit) {
      onRespondentSubmit({
        response_id: `RESP-LIVE-${Date.now().toString().slice(-4)}`,
        participant_name: testParticipant,
        cohort: 'Live Public Respondent',
        satisfaction_rating: testRating,
        feedback_text: testFeedback,
        channel: 'QR Scan / Public Link',
        submitted_at: new Date().toISOString(),
      });
    }

    setTimeout(() => {
      setTestSubmitted(false);
      setTestFeedback('');
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Public Survey Link & QR Generator</h3>
              <p className="text-xs text-slate-400">
                Share surveys with respondents anywhere via scan or link.
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

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: QR Code Canvas & Flyer Actions */}
            <div className="flex flex-col items-center bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                <canvas ref={canvasRef} className="rounded-lg" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadQR}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={handlePrintPoster}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Poster</span>
                </button>
              </div>
            </div>

            {/* Right: Link & Kiosk Settings */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Direct Respondent URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={surveyUrl}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shrink-0 flex items-center gap-1"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-200 font-semibold">Kiosk Auto-Reset Mode</div>
                    <div className="text-slate-500 text-[11px]">
                      Auto-clears and loops form after submission for field tablets
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isKioskMode}
                    onChange={(e) => setIsKioskMode(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Custom Survey Slug</label>
                  <input
                    type="text"
                    value={surveySlug}
                    onChange={(e) => setSurveySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <button
                    onClick={handleCopyEmbed}
                    className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <span>{copiedEmbed ? 'Embed Code Copied!' : 'Copy <iframe> Embed Code'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Respondent Simulator */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                Live Test Respondent Simulator
              </span>
              <span className="text-[11px] text-slate-400">Direct Ingestion Pipeline</span>
            </div>

            {testSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-center text-xs space-y-1">
                <div className="font-bold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Submission Received & Synced!
                </div>
                <div className="text-emerald-400/80 text-[11px]">
                  Appended directly to active dataset. Ready for another response.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={testParticipant}
                    onChange={(e) => setTestParticipant(e.target.value)}
                    placeholder="Participant Name"
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                  />
                  <select
                    value={testRating}
                    onChange={(e) => setTestRating(parseInt(e.target.value))}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-medium"
                  >
                    <option value={5}>5 Stars - Highly Satisfied</option>
                    <option value={4}>4 Stars - Satisfied</option>
                    <option value={3}>3 Stars - Neutral</option>
                    <option value={2}>2 Stars - Dissatisfied</option>
                    <option value={1}>1 Star - Critical Issue</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={testFeedback}
                  onChange={(e) => setTestFeedback(e.target.value)}
                  placeholder="Feedback verbatim..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
                />
                <button
                  onClick={handleTestSubmit}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow"
                >
                  Simulate Live Respondent Submission
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
