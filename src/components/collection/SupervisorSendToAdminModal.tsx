import React, { useState, useMemo } from 'react';
import {
  Send,
  Building,
  ShieldCheck,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Layers,
  MapPin,
  Sparkles,
  Users,
  AlertCircle,
  Clock,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SupervisorSubmission } from '../../utils/supervisorEngine';
import {
  KENYA_COUNTIES,
  CountyCleanedRecord,
  dispatchCleanedDataToAdmin,
  getStoredCountySupervisors,
  CountyDispatchBatch
} from '../../utils/countySupervisorEngine';
import { SupervisorSession } from '../../utils/supervisorAuthEngine';
import { logTelemetryEvent } from '../../utils/telemetryEngine';

interface SupervisorSendToAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  supervisorSession?: SupervisorSession | null;
  submissions: SupervisorSubmission[];
  onDispatchSuccess?: (batch: CountyDispatchBatch) => void;
}

export const SupervisorSendToAdminModal: React.FC<SupervisorSendToAdminModalProps> = ({
  isOpen,
  onClose,
  supervisorSession,
  submissions,
  onDispatchSuccess
}) => {
  const { isDark } = useTheme();

  // Find eligible cleaned submissions
  const eligibleSubmissions = useMemo(() => {
    return submissions.filter(s => s.stage === 'auto_cleaned' || s.stage === 'supervisor_approved');
  }, [submissions]);

  // Selected records to send
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<string>>(() => {
    return new Set(eligibleSubmissions.map(s => s.id));
  });

  // Target County
  const [selectedCounty, setSelectedCounty] = useState<string>('Nairobi');
  const [batchTitle, setBatchTitle] = useState<string>('');
  const [supervisorSignoff, setSupervisorSignoff] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<CountyDispatchBatch | null>(null);

  // Update selection if eligible submissions change
  React.useEffect(() => {
    if (eligibleSubmissions.length > 0 && selectedSubmissionIds.size === 0) {
      setSelectedSubmissionIds(new Set(eligibleSubmissions.map(s => s.id)));
    }
    if (!batchTitle) {
      setBatchTitle(`${selectedCounty} County Cleaned Field Records Batch`);
    }
  }, [eligibleSubmissions, selectedCounty]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedSubmissionIds.size === eligibleSubmissions.length) {
      setSelectedSubmissionIds(new Set());
    } else {
      setSelectedSubmissionIds(new Set(eligibleSubmissions.map(s => s.id)));
    }
  };

  const toggleSelectId = (id: string) => {
    const next = new Set(selectedSubmissionIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSubmissionIds(next);
  };

  const selectedCount = selectedSubmissionIds.size;

  const handleTransmit = () => {
    if (selectedCount === 0) return;
    setIsSubmitting(true);

    try {
      const selectedSubs = eligibleSubmissions.filter(s => selectedSubmissionIds.has(s.id));
      const countyInfo = KENYA_COUNTIES.find(c => c.name.toLowerCase() === selectedCounty.toLowerCase()) || KENYA_COUNTIES[0];

      // Map SupervisorSubmissions to CountyCleanedRecords
      const countyRecords: CountyCleanedRecord[] = selectedSubs.map((s, idx) => ({
        recordId: `REC-${countyInfo.code}-${s.id.slice(-4)}`,
        submissionCode: s.submissionCode || `SUB-${countyInfo.code}-${1000 + idx}`,
        county: countyInfo.name,
        countyCode: countyInfo.code,
        subCounty: s.assignedZone || countyInfo.subCounties[0] || 'Central Sub-County',
        ward: 'Ward 1',
        enumeratorId: s.enumeratorId,
        enumeratorName: s.enumeratorName,
        collectedAt: s.collectedAt,
        gps: {
          lat: s.gps?.lat || -1.286389,
          lng: s.gps?.lng || 36.817223,
          accuracy: s.gps?.accuracy || 4,
          isInsideZone: s.gps?.isInsideZone,
          locationName: s.gps?.addressDescription
        },
        supervisorId: supervisorSession?.supervisorId || 'sup_nrb_01',
        supervisorName: supervisorSession?.name || 'Dr. Evelyn Vance',
        cleanedAt: s.cleanedAt || new Date().toISOString(),
        qualityScore: s.qualityScore || 96,
        rawData: s.rawData || {},
        cleanedData: s.cleanedData || s.rawData || {},
        cleaningDiffs: s.cleaningDiffs || [],
        supervisorNotes: s.supervisorNotes || supervisorSignoff || 'Certified cleaned by field supervisor.',
        status: 'sent_to_admin'
      }));

      const batch = dispatchCleanedDataToAdmin({
        county: selectedCounty,
        supervisorId: supervisorSession?.supervisorId || 'sup_nrb_01',
        supervisorName: supervisorSession?.name || 'Dr. Evelyn Vance',
        supervisorBadge: supervisorSession?.badgeId || 'DIR-HQ-9901',
        supervisorEmail: supervisorSession?.email || 'supervisor@datahub.io',
        supervisorPhone: '+254 712 345 678',
        title: batchTitle.trim() || `${selectedCounty} Cleaned Data Dossier`,
        records: countyRecords,
        supervisorSignoff: supervisorSignoff.trim() || `Verified and certified ${countyRecords.length} records. Outliers normalized, phone numbers formatted, and coordinates checked against county bounds.`
      });

      logTelemetryEvent({
        module: 'SUPERVISOR',
        action: 'County Data Sent to Admin Office',
        severity: 'SUCCESS',
        user: supervisorSession?.name || 'Supervisor',
        userRole: 'Supervisor',
        details: `Dispatched ${countyRecords.length} cleaned records for ${selectedCounty} County to Admin (Batch ID: ${batch.batchId}).`,
        status: 'COMPLETED'
      });

      setDispatchResult(batch);
      if (onDispatchSuccess) {
        onDispatchSuccess(batch);
      }
    } catch (err) {
      console.error('Error dispatching to admin:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Send Cleaned Data to Admin (Office)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Field to HQ
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Transmit verified, cleaned enumerator submissions from your county directly to Central Office Admin.
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {dispatchResult ? (
            /* Success State */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Data Transmitted to Central Admin Office!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Batch <span className="font-mono text-cyan-300 font-bold">{dispatchResult.batchId}</span> with{' '}
                <span className="text-white font-bold">{dispatchResult.recordCount} cleaned records</span> for{' '}
                <span className="text-indigo-300 font-bold">{dispatchResult.county} County</span> has been sent to the Admin Office.
              </p>

              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Supervisor:</span>
                  <span className="text-white font-semibold">{dispatchResult.supervisorName} ({dispatchResult.supervisorBadge})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">County:</span>
                  <span className="text-white font-semibold">{dispatchResult.county} (Code {dispatchResult.countyCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Average Quality:</span>
                  <span className="text-emerald-400 font-mono font-bold">{dispatchResult.avgQualityScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Enumerators Included:</span>
                  <span className="text-slate-300">{dispatchResult.enumeratorsInvolved.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-amber-300 font-mono font-bold uppercase text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">
                    Sent to Admin (Awaiting Ingestion)
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setDispatchResult(null);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              {/* Supervisor Info Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {supervisorSession?.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <span className="font-semibold text-white">{supervisorSession?.name || 'Dr. Evelyn Vance'}</span>
                    <span className="text-slate-400 text-[11px] block">Badge: {supervisorSession?.badgeId || 'DIR-HQ-9901'} · Field Supervisor</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                  {eligibleSubmissions.length} Cleaned Submissions Ready
                </span>
              </div>

              {/* County Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Target County Jurisdiction</span>
                </label>
                <select
                  value={selectedCounty}
                  onChange={(e) => {
                    setSelectedCounty(e.target.value);
                    setBatchTitle(`${e.target.value} County Cleaned Field Records Batch`);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  {KENYA_COUNTIES.map(c => (
                    <option key={c.code} value={c.name}>
                      {c.name} County (Code {c.code} - {c.region} Region)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Select which county this data was collected from. Admin in the office will see this data organized under this county.
                </p>
              </div>

              {/* Batch Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Dossier / Batch Title</label>
                <input
                  type="text"
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  placeholder="e.g., Nairobi County Urban Agricultural Cleaned Batch"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Submissions List / Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Select Cleaned Records to Dispatch ({selectedCount} / {eligibleSubmissions.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    {selectedSubmissionIds.size === eligibleSubmissions.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {eligibleSubmissions.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    No cleaned submissions found in this session yet. Run the auto-clean recipe first or seed sample records.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950/40">
                    {eligibleSubmissions.map(sub => {
                      const isSelected = selectedSubmissionIds.has(sub.id);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => toggleSelectId(sub.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                            />
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{sub.submissionCode}</span>
                                <span className="text-[10px] text-slate-400">by {sub.enumeratorName}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {sub.assignedZone} · Score: {sub.qualityScore}% · {sub.cleaningDiffs?.length || 0} fixes applied
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            Cleaned
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Supervisor Signoff Remarks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Supervisor Certification & Signoff Notes</label>
                <textarea
                  rows={2}
                  value={supervisorSignoff}
                  onChange={(e) => setSupervisorSignoff(e.target.value)}
                  placeholder="e.g., Audited and standardized all respondent phone numbers, checked GPS locks, verified missing values imputed. Ready for Admin office ingestion."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!dispatchResult && (
          <div className="p-6 border-t border-slate-800 flex items-center justify-between gap-4 bg-slate-950/40">
            <div className="text-xs text-slate-400">
              Sending <strong className="text-white">{selectedCount}</strong> records to Central Office
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleTransmit}
                disabled={selectedCount === 0 || isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Transmitting to Admin...' : 'Send to Admin (Office)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
