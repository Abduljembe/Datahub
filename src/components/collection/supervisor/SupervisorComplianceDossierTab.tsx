// Official Supervisor Compliance Sign-Off, Cryptographic Certificate & Provenance Tab
import React, { useState } from 'react';
import {
  Award,
  FileCheck,
  ShieldCheck,
  Download,
  Printer,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  Sparkles,
  QrCode,
  FileText
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { SupervisorSubmission } from '../../../utils/supervisorEngine';
import { SupervisorSession } from '../../../utils/supervisorAuthEngine';
import {
  ComplianceCertificate,
  ProvenanceLogEntry,
  buildComplianceCertificate,
  getStoredProvenanceTrail,
  recordProvenanceAction
} from '../../../utils/supervisorComplianceEngine';

interface SupervisorComplianceDossierTabProps {
  submissions: SupervisorSubmission[];
  supervisorSession: SupervisorSession;
}

export const SupervisorComplianceDossierTab: React.FC<SupervisorComplianceDossierTabProps> = ({
  submissions,
  supervisorSession
}) => {
  const { isDark } = useTheme();

  const [certificate, setCertificate] = useState<ComplianceCertificate>(() => 
    buildComplianceCertificate(submissions, supervisorSession)
  );
  const [provenanceTrail, setProvenanceTrail] = useState<ProvenanceLogEntry[]>(() => getStoredProvenanceTrail());
  const [remarks, setRemarks] = useState(certificate.signOffRemarks);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleGenerateFreshCertificate = () => {
    const cert = buildComplianceCertificate(submissions, supervisorSession, remarks);
    setCertificate(cert);
    recordProvenanceAction(
      'SUPERVISOR_APPROVE',
      'FLEET-BATCH-SIGN-OFF',
      supervisorSession.name,
      supervisorSession.badgeId,
      `Issued compliance certificate ${cert.certificateId} with ${cert.metrics.approvedRatePct}% approval rating.`
    );
    setProvenanceTrail(getStoredProvenanceTrail());
    showToast('Cryptographic compliance certificate generated & signed.');
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleCopyDigest = () => {
    navigator.clipboard.writeText(certificate.cryptographicDigest);
    showToast('Cryptographic SHA-256 digest copied to clipboard.');
  };

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-emerald-400 border border-emerald-500/40 shadow-xl flex items-center gap-2 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Actions */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      } shadow-md`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>Supervisor Compliance & Regulatory Sign-Off Dossier</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {certificate.verificationStatus}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Cryptographically signed certificate with tamper-proof provenance log and field quality verification seals.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateFreshCertificate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate & Sign Certificate</span>
          </button>

          <button
            onClick={handlePrintCertificate}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDark ? 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF Export</span>
          </button>
        </div>
      </div>

      {/* Grid: Certificate Preview + Provenance Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Certificate Display (2 cols) */}
        <div className={`lg:col-span-2 p-8 rounded-3xl border relative overflow-hidden ${
          isDark ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-indigo-500/30' : 'bg-white border-slate-300 text-slate-900'
        } shadow-2xl space-y-6`}>
          
          {/* Certificate Header Stamp */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-indigo-400" />
                <span className="font-serif text-xl font-black tracking-wider uppercase">
                  DataHub Certified Audit Dossier
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Official Verification Certificate: {certificate.certificateId}
              </p>
            </div>

            {/* Official Stamp Badge */}
            <div className="p-3 rounded-2xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/40 text-center">
              <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-widest block">
                OFFICIAL SEAL
              </span>
              <span className="text-xs font-black text-emerald-400 uppercase">
                {certificate.verificationStatus}
              </span>
            </div>
          </div>

          {/* Campaign & Certifying Officer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Operations Campaign</span>
              <p className="font-bold text-sm">{certificate.campaignTitle}</p>
              <span className="text-slate-400 font-mono">Issued: {new Date(certificate.generatedAt).toLocaleString()}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Certifying Lead Supervisor</span>
              <p className="font-bold text-sm text-indigo-400">{certificate.certifyingOfficer.name}</p>
              <p className="text-slate-400 font-mono">
                Badge: {certificate.certifyingOfficer.badgeId} • {certificate.certifyingOfficer.role}
              </p>
            </div>
          </div>

          {/* Quantitative Audit Verification Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Submissions Reviewed</span>
              <p className="text-xl font-black text-white mt-1">{certificate.metrics.totalSubmissionsReviewed}</p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Approval Rating</span>
              <p className="text-xl font-black text-emerald-400 mt-1">{certificate.metrics.approvedRatePct}%</p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Geofence Compliance</span>
              <p className="text-xl font-black text-indigo-400 mt-1">{certificate.metrics.geofenceCompliancePct}%</p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Mean Quality Index</span>
              <p className="text-xl font-black text-purple-400 mt-1">{certificate.metrics.avgQualityScore}/100</p>
            </div>
          </div>

          {/* Regulatory Standards Compliance Accordion */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Enforced Data Governance & Quality Standards
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {certificate.regulatoryFrameworks.map((framework, fIdx) => (
                <div
                  key={fIdx}
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono text-[11px]">{framework}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Remarks Input */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Supervisor Certification Attestation
            </span>
            <p className={`p-3 rounded-xl text-xs italic border ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              "{certificate.signOffRemarks}"
            </p>
          </div>

          {/* Cryptographic Digest & QR Hash Seal */}
          <div className="pt-4 border-t border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Cryptographic Audit Digest (Immutable Blockchain-Style Hash)
              </span>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 break-all">
                  {certificate.cryptographicDigest}
                </code>
                <button
                  onClick={handleCopyDigest}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Copy Digest"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div className="text-[10px] font-mono text-slate-400">
                <span>DIGITALLY SIGNED BY</span>
                <p className="font-bold text-white">{certificate.certifyingOfficer.name}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400">
                <QrCode className="w-8 h-8" />
              </div>
            </div>
          </div>

        </div>

        {/* Right: Tamper-Proof Provenance Audit Trail */}
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-md`}>
          
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Immutable Provenance Trail</span>
            </h4>
            <span className="text-[10px] font-mono text-emerald-400">AUDIT LOG ACTIVE</span>
          </div>

          <p className="text-xs text-slate-400">
            Chronological audit log tracking every automated pipeline transformation, supervisor override, and rejection event.
          </p>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {provenanceTrail.map(log => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold ${
                    log.action === 'SUPERVISOR_APPROVE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : log.action === 'AUTO_CLEAN'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-slate-300 text-[11px] pt-1">{log.details}</p>

                <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-1">
                  <span>Actor: {log.actor}</span>
                  <span className="text-indigo-400">[{log.actorBadge}]</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
