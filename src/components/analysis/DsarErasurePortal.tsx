import React, { useState } from 'react';
import { 
  Trash2, 
  Search, 
  FileText, 
  ShieldCheck, 
  AlertOctagon, 
  CheckCircle2, 
  Download, 
  Lock, 
  Copy,
  Info
} from 'lucide-react';
import { Dataset } from '../../types';
import { 
  searchSubjectRecords, 
  generateDsarDossier, 
  executeSubjectErasure, 
  DsarSearchResult, 
  ErasureReceipt 
} from '../../utils/dsarErasureEngine';

interface DsarErasurePortalProps {
  dataset: Dataset;
  onUpdateDataset: (updated: Dataset) => void;
}

export const DsarErasurePortal: React.FC<DsarErasurePortalProps> = ({
  dataset,
  onUpdateDataset,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<DsarSearchResult | null>(null);
  const [erasureMethod, setErasureMethod] = useState<'irreversible_purge' | 'cryptographic_tombstone'>('irreversible_purge');
  const [erasureReceipt, setErasureReceipt] = useState<ErasureReceipt | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    const res = searchSubjectRecords(dataset, searchQuery);
    setSearchResult(res);
    setErasureReceipt(null);
  };

  const handleDownloadDossier = () => {
    if (!searchResult || searchResult.totalMatches === 0) return;
    const dossierJson = generateDsarDossier(searchResult, dataset);
    const blob = new Blob([dossierJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DSAR_Dossier_${searchResult.searchQuery.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage('📄 DSAR Subject Access Dossier exported successfully.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleConfirmErasure = () => {
    if (!searchResult || searchResult.totalMatches === 0) return;
    
    const { updatedDataset, receipt } = executeSubjectErasure(dataset, searchResult, erasureMethod);
    onUpdateDataset(updatedDataset);
    setErasureReceipt(receipt);
    setShowConfirmModal(false);
    setSearchResult(null);
    setSearchQuery('');
    setToastMessage(`🗑️ Executed ${receipt.destructionMethod}. ${receipt.recordsPurgedCount} record(s) expunged.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  GDPR Right to Erasure & DSAR Access Portal
                </h2>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  Article 15 & 17
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute Subject Access Requests (DSAR) and irreversible cryptographic erasure across the operational dataset with signed audit certificates.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 pt-2 border-t border-slate-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by respondent ID, email, phone, name, or subject identifier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <span>Search Records</span>
          </button>
        </form>

        {toastMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Search Result & Actions */}
      {searchResult && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Found {searchResult.totalMatches} Matching Record(s)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  for query &ldquo;{searchResult.searchQuery}&rdquo;
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review data subject records below before exporting a dossier or executing permanent deletion.
              </p>
            </div>

            {searchResult.totalMatches > 0 && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleDownloadDossier}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export DSAR Dossier (JSON)</span>
                </button>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Execute Right to Erasure</span>
                </button>
              </div>
            )}
          </div>

          {/* Records Table */}
          {searchResult.totalMatches > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-sans">
                    <th className="p-3 font-semibold">Row #</th>
                    <th className="p-3 font-semibold">Matched Column</th>
                    <th className="p-3 font-semibold">Matched Value</th>
                    <th className="p-3 font-semibold">Record Snapshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {searchResult.matches.map((match, i) => (
                    <tr key={i} className="hover:bg-slate-900/40">
                      <td className="p-3 text-slate-400">#{match.rowIndex + 1}</td>
                      <td className="p-3 text-rose-400 font-semibold font-sans">{match.matchedColumn}</td>
                      <td className="p-3 text-white font-bold">{match.matchedValue}</td>
                      <td className="p-3 text-slate-400 max-w-md truncate text-[11px]">
                        {JSON.stringify(match.fullRecord)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              No matching records found for this data subject in the current dataset.
            </div>
          )}
        </div>
      )}

      {/* Destruction / Erasure Certificate */}
      {erasureReceipt && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cryptographic Certificate of Erasure</h3>
              <p className="text-xs text-slate-400">Receipt ID: {erasureReceipt.receiptId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Subject Query</span>
              <span className="text-white font-bold">{erasureReceipt.subjectQuery}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Records Purged</span>
              <span className="text-rose-400 font-bold">{erasureReceipt.recordsPurgedCount} rows</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block uppercase font-sans">Verification Hash</span>
              <span className="text-emerald-400 font-bold truncate block">{erasureReceipt.verificationHash}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
            Legal Attestation: {erasureReceipt.legalAttestation.gdprArticle17} Verified execution timestamp: {erasureReceipt.timestamp}.
          </p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && searchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertOctagon className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Confirm Right to Erasure Execution</h3>
            </div>

            <p className="text-xs text-slate-300">
              You are about to expunge <strong>{searchResult.totalMatches} record(s)</strong> associated with <strong>&ldquo;{searchResult.searchQuery}&rdquo;</strong>. A version history snapshot will be recorded before deletion.
            </p>

            <div className="space-y-2 text-xs">
              <label className="text-slate-400 font-semibold block">Destruction Method:</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="erasureMethod"
                    value="irreversible_purge"
                    checked={erasureMethod === 'irreversible_purge'}
                    onChange={() => setErasureMethod('irreversible_purge')}
                    className="text-rose-500"
                  />
                  <div>
                    <span className="text-white font-semibold block">Irreversible Purge</span>
                    <span className="text-[10px] text-slate-500">Completely deletes the matched rows from the dataset.</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="erasureMethod"
                    value="cryptographic_tombstone"
                    checked={erasureMethod === 'cryptographic_tombstone'}
                    onChange={() => setErasureMethod('cryptographic_tombstone')}
                    className="text-rose-500"
                  />
                  <div>
                    <span className="text-white font-semibold block">Cryptographic Tombstone</span>
                    <span className="text-[10px] text-slate-500">Overwrites all attributes with [TOMBSTONED_SUBJECT_ERASED].</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmErasure}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Erase Records</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
