import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  Compass,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  X,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import {
  FieldAuditRecord,
  AuditFlag,
  FleetQualityMetrics,
  computeFleetQualityMetrics,
  saveLocalAuditRecords,
  runDeepAiSupervisorAudit
} from '../../utils/fieldQualityAuditEngine';

interface FieldQualityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditRecords: FieldAuditRecord[];
  onUpdateRecords: (records: FieldAuditRecord[]) => void;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

export const FieldQualityAuditModal: React.FC<FieldQualityAuditModalProps> = ({
  isOpen,
  onClose,
  auditRecords,
  onUpdateRecords,
  onFocusCoordinates
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(auditRecords[0]?.id || null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRunningAiScan, setIsRunningAiScan] = useState<boolean>(false);
  const [executiveReport, setExecutiveReport] = useState<string | null>(null);
  const [supervisorNoteInput, setSupervisorNoteInput] = useState<string>('');

  if (!isOpen) return null;

  const metrics: FleetQualityMetrics = computeFleetQualityMetrics(auditRecords);

  const filteredRecords = auditRecords.filter(rec => {
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'flagged' && rec.status === 'flagged') ||
      (filterStatus === 'verified' && rec.status === 'verified') ||
      (filterStatus === 'reinterview' && rec.flags.some(f => f.recommendation === 'flag_reinterview')) ||
      (filterStatus === 'pending' && rec.status === 'pending_review');

    const matchesSearch =
      rec.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.submissionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.assignedZone.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const selectedRecord = auditRecords.find(r => r.id === selectedRecordId) || filteredRecords[0] || null;

  // Run Deep AI Audit
  const handleTriggerAiAudit = async () => {
    setIsRunningAiScan(true);
    try {
      const { updatedRecords, executiveReport: report } = await runDeepAiSupervisorAudit(auditRecords);
      onUpdateRecords(updatedRecords);
      saveLocalAuditRecords(updatedRecords);
      setExecutiveReport(report);
    } catch (err) {
      console.error('Deep AI Audit failed:', err);
    } finally {
      setIsRunningAiScan(false);
    }
  };

  // Change submission status
  const handleUpdateStatus = (recordId: string, newStatus: FieldAuditRecord['status']) => {
    const updated = auditRecords.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          status: newStatus,
          reviewedBy: 'Chief Field Supervisor',
          reviewedAt: new Date().toISOString(),
          supervisorNotes: supervisorNoteInput || r.supervisorNotes
        };
      }
      return r;
    });
    onUpdateRecords(updated);
    saveLocalAuditRecords(updated);
    setSupervisorNoteInput('');
  };

  // Export audit dossier to JSON
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ metrics, records: auditRecords }, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `field-supervisor-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">AI Field Supervisor & Quality Audit Center</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Gemini & Geospatial Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated detection of rapid survey clicking, travel velocity anomalies, geofence boundary breaches & data straight-lining.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerAiAudit}
              disabled={isRunningAiScan}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isRunningAiScan ? 'animate-spin' : ''}`} />
              <span>{isRunningAiScan ? 'Running AI Forensic Scan...' : 'Run Deep AI Audit'}</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
              title="Export Audit Dossier JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KPI Metrics Dashboard Bar */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-slate-950 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Fleet Integrity Score</div>
            <div className="text-xl font-mono font-extrabold text-indigo-400 flex items-center gap-1.5 mt-1">
              <span>{metrics.avgQualityScore}</span>
              <span className="text-xs text-slate-400 font-normal">/100</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Clean Pass Rate</div>
            <div className="text-xl font-mono font-extrabold text-emerald-400 mt-1">
              {metrics.cleanPassRate}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Flagged Anomalies</div>
            <div className="text-xl font-mono font-extrabold text-amber-400 mt-1">
              {metrics.flaggedCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Re-Interviews Needed</div>
            <div className="text-xl font-mono font-extrabold text-rose-400 mt-1">
              {metrics.reinterviewRequiredCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Geofence Compliance</div>
            <div className="text-xl font-mono font-extrabold text-cyan-400 mt-1">
              {metrics.geofenceComplianceRate}%
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Avg Dwell Time</div>
            <div className="text-xl font-mono font-extrabold text-white mt-1">
              {Math.floor(metrics.avgDwellTimeSeconds / 60)}m {metrics.avgDwellTimeSeconds % 60}s
            </div>
          </div>
        </div>

        {/* Executive AI Report Summary (if generated) */}
        {executiveReport && (
          <div className="p-4 bg-indigo-950/40 border-b border-indigo-500/30 text-xs text-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gemini AI Field Supervisor Synthesis</span>
              </span>
              <button
                onClick={() => setExecutiveReport(null)}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                Dismiss
              </button>
            </div>
            <div className="whitespace-pre-line text-slate-300 leading-relaxed font-sans">
              {executiveReport}
            </div>
          </div>
        )}

        {/* Main Content: Split Master-Detail */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* Left Column: Submissions Table & Filters (7 cols) */}
          <div className="lg:col-span-7 border-r border-slate-800 flex flex-col min-h-0">
            
            {/* Search & Filter Controls */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by agent, cluster, campaign..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'All Audits' },
                  { id: 'flagged', label: 'Flagged', count: metrics.flaggedCount },
                  { id: 'reinterview', label: 'Re-Interview', count: metrics.reinterviewRequiredCount },
                  { id: 'verified', label: 'Verified', count: metrics.verifiedCount },
                  { id: 'pending', label: 'Pending' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      filterStatus === tab.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-indigo-300">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No field survey audit records matching current filter criteria.
                </div>
              ) : (
                filteredRecords.map(rec => {
                  const isSelected = rec.id === selectedRecord?.id;
                  const isFlagged = rec.flags.length > 0;

                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRecordId(rec.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                          : 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{rec.agentName}</span>
                            <span className="text-[11px] font-mono text-slate-400">({rec.submissionId})</span>
                            {rec.status === 'verified' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Verified</span>
                              </span>
                            )}
                            {rec.status === 'flagged' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Anomaly Flagged</span>
                              </span>
                            )}
                            {rec.status === 'rejected' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                Rejected
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {rec.campaign} • <span className="font-mono">{new Date(rec.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* Quality Score Badge */}
                        <div className="text-right">
                          <div className="text-xs font-mono font-extrabold flex items-center justify-end gap-1">
                            <span className={
                              rec.qualityScore >= 85 ? 'text-emerald-400' :
                              rec.qualityScore >= 65 ? 'text-amber-400' : 'text-rose-400'
                            }>
                              {rec.qualityScore}%
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal">Score</span>
                          </div>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1 ml-auto">
                            <div
                              className={`h-full rounded-full ${
                                rec.qualityScore >= 85 ? 'bg-emerald-500' :
                                rec.qualityScore >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${rec.qualityScore}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Flag Tags */}
                      {isFlagged && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {rec.flags.map(f => (
                            <span
                              key={f.id}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 border ${
                                f.severity === 'high'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{f.title}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Telemetry pill row */}
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2 font-mono">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Dwell: {rec.dwellTimeSeconds}s</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>±{rec.accuracy}m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={rec.isInsideZone ? 'text-emerald-400' : 'text-amber-400'}>
                            {rec.isInsideZone ? '● Inside Zone' : '▲ Out of Zone'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Record Forensic Dossier (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950/70 p-6 overflow-y-auto space-y-6 flex flex-col">
            {selectedRecord ? (
              <>
                {/* Dossier Header */}
                <div className="border-b border-slate-800 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-indigo-400 uppercase tracking-wider">
                      Submission Forensic Dossier
                    </div>
                    {onFocusCoordinates && (
                      <button
                        onClick={() => onFocusCoordinates(selectedRecord.lat, selectedRecord.lng)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Locate on Radar</span>
                      </button>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedRecord.agentName}</h3>
                  <p className="text-xs text-slate-400">
                    {selectedRecord.campaign} • Recorded at {new Date(selectedRecord.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* AI Supervisor Verdict Box */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>AI Supervisor Verdict</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedRecord.aiSupervisorVerdict}
                  </p>
                  {selectedRecord.aiDetailedAssessment && (
                    <p className="text-[11px] text-slate-400 pt-1.5 border-t border-indigo-500/20">
                      {selectedRecord.aiDetailedAssessment}
                    </p>
                  )}
                </div>

                {/* Flags Breakdown */}
                {selectedRecord.flags.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Identified Quality Anomalies ({selectedRecord.flags.length})</span>
                    </div>

                    <div className="space-y-2.5">
                      {selectedRecord.flags.map(f => (
                        <div
                          key={f.id}
                          className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{f.title}</span>
                            <span className="text-[10px] font-mono text-cyan-400">{f.confidence}% Conf</span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {f.description}
                          </p>
                          {f.metricLabel && (
                            <div className="p-2 rounded-xl bg-slate-950 font-mono text-[11px] text-amber-300 flex justify-between">
                              <span>{f.metricLabel}:</span>
                              <span className="font-bold">{f.metricValue}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spatial & Pacing Telemetry Table */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span>Spatial & Interview Telemetry</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase">Dwell Time</div>
                      <div className="text-xs font-mono font-bold text-white mt-0.5">
                        {selectedRecord.dwellTimeSeconds}s ({selectedRecord.questionCount} Questions)
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase">GPS Precision</div>
                      <div className="text-xs font-mono font-bold text-white mt-0.5">
                        ±{selectedRecord.accuracy}m Radius
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase">Coordinates</div>
                      <div className="text-[11px] font-mono text-white mt-0.5">
                        {selectedRecord.lat.toFixed(4)}°, {selectedRecord.lng.toFixed(4)}°
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase">Sector Boundary</div>
                      <div className={`text-xs font-bold mt-0.5 ${selectedRecord.isInsideZone ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedRecord.isInsideZone ? 'Inside Geofence' : `${selectedRecord.distanceFromZoneCenterKm} km Offset`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw Survey Response Data Snapshot */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    <span>Captured Survey Responses</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5">
                    {Object.entries(selectedRecord.dataSnapshot).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-800/60 pb-1">
                        <span className="text-slate-400">{k}:</span>
                        <span className="text-white font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supervisor Review Action Panel */}
                <div className="border-t border-slate-800 pt-4 space-y-3 mt-auto">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Supervisor Audit Decision</label>
                    <input
                      type="text"
                      value={supervisorNoteInput}
                      onChange={e => setSupervisorNoteInput(e.target.value)}
                      placeholder="Add supervisor note (e.g. Conduct spot check on cluster)..."
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedRecord.id, 'verified')}
                      className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify Clean</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedRecord.id, 'flagged')}
                      className="py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-Interview</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedRecord.id, 'rejected')}
                      className="py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Data</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs my-auto">
                Select a submission from the list to view forensic telemetry and AI audit.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
