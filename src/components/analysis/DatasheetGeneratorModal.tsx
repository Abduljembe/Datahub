import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  BookOpen, 
  Database,
  Layers,
  Edit3
} from 'lucide-react';
import { Dataset } from '../../types';
import { 
  generateDefaultDatasheet, 
  exportDatasheetToMarkdown, 
  DatasheetMetadata 
} from '../../utils/datasheetEngine';

interface DatasheetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
}

export const DatasheetGeneratorModal: React.FC<DatasheetGeneratorModalProps> = ({
  isOpen,
  onClose,
  dataset,
}) => {
  const initialDatasheet = useMemo(() => generateDefaultDatasheet(dataset), [dataset]);
  const [datasheet, setDatasheet] = useState<DatasheetMetadata>(initialDatasheet);
  const [activeSection, setActiveSection] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFieldChange = (field: keyof DatasheetMetadata, value: string) => {
    setDatasheet(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyMarkdown = () => {
    const md = exportDatasheetToMarkdown(datasheet);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadMarkdown = () => {
    const md = exportDatasheetToMarkdown(datasheet);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DATASHEET_${dataset.name.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage('📥 Exported DATASHEET.md');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(datasheet, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `datasheet_${dataset.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToastMessage('📥 Exported datasheet.json');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Datasheet for Datasets Generator</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Gebru et al. (2021) Standard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audited provenance, composition, data hygiene & ethical boundaries for {dataset.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-800 bg-slate-950 px-4 shrink-0 text-xs font-medium">
          {[
            { id: 1, label: '1. Motivation' },
            { id: 2, label: '2. Composition' },
            { id: 3, label: '3. Collection' },
            { id: 4, label: '4. Preprocessing' },
            { id: 5, label: '5. Uses & Limits' },
            { id: 6, label: '6. Maintenance' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeSection === tab.id
                  ? 'border-cyan-500 text-cyan-400 font-bold bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {activeSection === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Dataset Title</label>
                <input
                  type="text"
                  value={datasheet.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Purpose & Motivation</label>
                <textarea
                  rows={3}
                  value={datasheet.purposeAndMotivation}
                  onChange={(e) => handleFieldChange('purposeAndMotivation', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Creators & Organization</label>
                  <input
                    type="text"
                    value={datasheet.organization}
                    onChange={(e) => handleFieldChange('organization', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Funding Grant / Project</label>
                  <input
                    type="text"
                    value={datasheet.fundingGrant}
                    onChange={(e) => handleFieldChange('fundingGrant', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Total Instances</span>
                  <span className="text-lg font-black text-cyan-400 font-mono">{datasheet.instanceCount}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Attributes</span>
                  <span className="text-lg font-black text-indigo-400 font-mono">{datasheet.attributeCount}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 col-span-2">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Missingness Audit</span>
                  <span className="text-xs font-semibold text-slate-300 truncate block mt-1">{datasheet.missingDataSummary}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Instance Representation</label>
                <textarea
                  rows={2}
                  value={datasheet.instanceRepresentation}
                  onChange={(e) => handleFieldChange('instanceRepresentation', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Confidential & Sensitive Features</label>
                <input
                  type="text"
                  value={datasheet.confidentialOrSensitiveAttributes}
                  onChange={(e) => handleFieldChange('confidentialOrSensitiveAttributes', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>
          )}

          {activeSection === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Collection Mechanism</label>
                <textarea
                  rows={2}
                  value={datasheet.collectionMechanism}
                  onChange={(e) => handleFieldChange('collectionMechanism', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Sampling Strategy</label>
                <input
                  type="text"
                  value={datasheet.samplingStrategy}
                  onChange={(e) => handleFieldChange('samplingStrategy', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Participant Consent & Ethics Notice</label>
                <textarea
                  rows={2}
                  value={datasheet.participantConsentNotice}
                  onChange={(e) => handleFieldChange('participantConsentNotice', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>
            </div>
          )}

          {activeSection === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Preprocessing & Cleaning Steps</label>
                <textarea
                  rows={2}
                  value={datasheet.preprocessingSteps}
                  onChange={(e) => handleFieldChange('preprocessingSteps', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Anonymization & Privacy Guards</label>
                <textarea
                  rows={2}
                  value={datasheet.anonymizationTechniques}
                  onChange={(e) => handleFieldChange('anonymizationTechniques', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>
            </div>
          )}

          {activeSection === 5 && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Recommended Analytical Tasks</label>
                <textarea
                  rows={2}
                  value={datasheet.recommendedTasks}
                  onChange={(e) => handleFieldChange('recommendedTasks', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-rose-400 font-bold block mb-1">Prohibited & Discouraged Uses</label>
                <textarea
                  rows={2}
                  value={datasheet.prohibitedOrDiscouragedUses}
                  onChange={(e) => handleFieldChange('prohibitedOrDiscouragedUses', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-amber-400 font-bold block mb-1">Known Biases & Population Limitations</label>
                <textarea
                  rows={2}
                  value={datasheet.biasesOrLimitations}
                  onChange={(e) => handleFieldChange('biasesOrLimitations', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs"
                />
              </div>
            </div>
          )}

          {activeSection === 6 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">License</label>
                  <input
                    type="text"
                    value={datasheet.license}
                    onChange={(e) => handleFieldChange('license', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Contact Email</label>
                  <input
                    type="text"
                    value={datasheet.contactEmail}
                    onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Retention Policy</label>
                <input
                  type="text"
                  value={datasheet.retentionPolicy}
                  onChange={(e) => handleFieldChange('retentionPolicy', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 text-xs">
          <button
            onClick={handleDownloadJson}
            className="text-slate-400 hover:text-white font-semibold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Raw JSON</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
