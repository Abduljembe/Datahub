import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Globe, 
  Activity, 
  Wand2, 
  FileCode2, 
  Table, 
  Sparkles,
  Layers,
  Database,
  Radio,
  Navigation,
  Compass,
  Mic,
  QrCode
} from 'lucide-react';
import { Dataset } from '../../types';
import { FormBuilder } from './FormBuilder';
import { FileImporter } from './FileImporter';
import { ApiCollector } from './ApiCollector';
import { IoTSimulator } from './IoTSimulator';
import { SyntheticDataGenerator } from './SyntheticDataGenerator';
import { WebScraperTool } from './WebScraperTool';
import { GridEditor } from './GridEditor';
import { OfflineFieldCollector } from './OfflineFieldCollector';
import { LiveEnumeratorTracker } from './LiveEnumeratorTracker';
import { AnomalyAlertingStudio } from '../analysis/AnomalyAlertingStudio';
import { VoiceInterviewRecorder } from './VoiceInterviewRecorder';
import { PublicSurveyShareModal } from './PublicSurveyShareModal';

interface CollectionHubProps {
  activeDataset: Dataset | null;
  onUpdateDataset: (dataset: Dataset) => void;
  onCreateDataset: (dataset: Dataset) => void;
  onAppendRowsToActive: (newRows: Record<string, any>[]) => void;
}

type CollectionToolId = 'grid' | 'voice' | 'tracker' | 'alerting' | 'offline' | 'form' | 'file' | 'api' | 'iot' | 'synthetic' | 'scraper';

const COLLECTION_TOOLS: { id: CollectionToolId; label: string; icon: React.ElementType; description: string; tag: string; tagColor: string }[] = [
  {
    id: 'grid',
    label: 'Spreadsheet Grid Editor',
    icon: Table,
    description: 'Direct manual cell editing, column typing, row inserts, and filtering.',
    tag: 'Manual & Quick',
    tagColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'voice',
    label: 'Voice Interview Recorder',
    icon: Mic,
    description: 'Microphone voice recording with real-time speech transcription & speaker sentiment.',
    tag: 'Voice Audio',
    tagColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: 'tracker',
    label: 'Enumerator Live Radar',
    icon: Navigation,
    description: 'Real-time GPS fleet tracking for supervisors to monitor enumerator location, trails, battery & survey pins.',
    tag: 'Live GPS Fleet',
    tagColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    id: 'alerting',
    label: 'Anomaly Alerting Stream',
    icon: Activity,
    description: 'Real-time statistical Z-score threshold outlier monitor & native browser notifications.',
    tag: 'Live Outlier Alerts',
    tagColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: 'offline',
    label: 'Offline Field Collector',
    icon: Radio,
    description: 'Collect field surveys, GPS tags & photos without internet with local outbox sync.',
    tag: 'Offline & GPS',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'form',
    label: 'Survey & Form Builder',
    icon: FileSpreadsheet,
    description: 'Design custom forms & live shareable questionnaires that record responses in real-time.',
    tag: 'Human Respondent',
    tagColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 'file',
    label: 'File & Clipboard Importer',
    icon: UploadCloud,
    description: 'Drag & drop CSV, Multi-Sheet Excel (.xlsx), and JSON with auto-schema detection.',
    tag: 'Batch Files',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'api',
    label: 'REST API & Webhooks',
    icon: Globe,
    description: 'Fetch external REST APIs, scheduled live polling, and dedicated incoming HTTP Webhooks.',
    tag: 'Live Cloud Streams',
    tagColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    id: 'iot',
    label: 'IoT Telemetry Streamer',
    icon: Activity,
    description: 'High-frequency time-series sensor simulator with jitter, live oscilloscope & anomalies.',
    tag: 'Hardware Telemetry',
    tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'synthetic',
    label: 'Synthetic Generator (AI)',
    icon: Wand2,
    description: 'Synthesize benchmark datasets using statistical distributions or Gemini natural language.',
    tag: 'AI & Math Model',
    tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: 'scraper',
    label: 'Web Table Scraper',
    icon: FileCode2,
    description: 'Extract tables from Wikipedia or raw HTML markup with automated column parsing.',
    tag: 'Web Extract',
    tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
];

export const CollectionHub: React.FC<CollectionHubProps> = ({
  activeDataset,
  onUpdateDataset,
  onCreateDataset,
  onAppendRowsToActive,
}) => {
  const [activeTool, setActiveTool] = useState<CollectionToolId>('grid');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Collection Tool Selector Ribbon */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Data Collection Suite
            </h1>
            <p className="text-xs text-slate-400">Choose from 8 specialized data ingestion, voice interview & gathering pipelines:</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
              title="Generate printable QR codes and shareable public survey links"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code & Survey Link</span>
            </button>

            {activeDataset && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Target:</span>
                <span className="text-white font-semibold font-mono truncate max-w-[140px]">{activeDataset.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Tool Scroll / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {COLLECTION_TOOLS.map(({ id, label, icon: Icon, tag, tagColor }) => {
            const isSelected = activeTool === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTool(id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900 border-indigo-500/70 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${tagColor}`}>
                      {tag.split(' ')[0]}
                    </span>
                  </div>
                  <p className={`text-xs font-semibold leading-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Public Survey & QR Generator Modal */}
      {isQrModalOpen && (
        <PublicSurveyShareModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          dataset={activeDataset || undefined}
          formTitle={activeDataset ? `${activeDataset.name} - Research Survey` : 'Public Research Survey'}
          onRespondentSubmit={(record) => {
            onAppendRowsToActive([record]);
          }}
        />
      )}

      {/* Active Tool Workspace */}
      <div className="transition-all">
        {activeTool === 'grid' && activeDataset && (
          <GridEditor dataset={activeDataset} onUpdateDataset={onUpdateDataset} />
        )}

        {activeTool === 'voice' && (
          <VoiceInterviewRecorder
            activeDataset={activeDataset || undefined}
            onAppendData={onAppendRowsToActive}
          />
        )}

        {activeTool === 'grid' && !activeDataset && (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
            <Table className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-200">No active dataset selected</p>
            <p className="text-xs">Create or select a dataset from the top navigation to use the spreadsheet grid editor.</p>
          </div>
        )}

        {activeTool === 'tracker' && (
          <LiveEnumeratorTracker
            activeDataset={activeDataset}
            onAppendRowsToActive={onAppendRowsToActive}
            onCreateDataset={onCreateDataset}
          />
        )}

        {activeTool === 'alerting' && (
          <AnomalyAlertingStudio
            dataset={activeDataset || undefined}
            availableDatasets={activeDataset ? [activeDataset] : []}
            onUpdateDataset={onUpdateDataset}
            onCreateDataset={onCreateDataset}
          />
        )}

        {activeTool === 'offline' && (
          <OfflineFieldCollector
            activeDataset={activeDataset}
            onAppendRowsToActive={onAppendRowsToActive}
            onCreateDataset={onCreateDataset}
            onOpenLiveTracker={() => setActiveTool('tracker')}
          />
        )}

        {activeTool === 'form' && activeDataset && (
          <FormBuilder activeDataset={activeDataset} onUpdateDataset={onUpdateDataset} />
        )}

        {activeTool === 'form' && !activeDataset && (
          <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-200">No active dataset selected</p>
            <p className="text-xs">Create or select a dataset to attach a custom response collection form.</p>
          </div>
        )}

        {activeTool === 'file' && (
          <FileImporter
            onImportComplete={onCreateDataset}
            activeDataset={activeDataset}
            onAppendToActive={onAppendRowsToActive}
          />
        )}

        {activeTool === 'api' && (
          <ApiCollector
            onImportComplete={onCreateDataset}
            activeDataset={activeDataset}
            onAppendToActive={onAppendRowsToActive}
          />
        )}

        {activeTool === 'iot' && (
          <IoTSimulator
            onImportComplete={onCreateDataset}
            activeDataset={activeDataset}
            onAppendToActive={onAppendRowsToActive}
          />
        )}

        {activeTool === 'synthetic' && (
          <SyntheticDataGenerator
            onImportComplete={onCreateDataset}
            activeDataset={activeDataset}
            onAppendToActive={onAppendRowsToActive}
          />
        )}

        {activeTool === 'scraper' && (
          <WebScraperTool
            onImportComplete={onCreateDataset}
            activeDataset={activeDataset}
            onAppendToActive={onAppendRowsToActive}
          />
        )}
      </div>

    </div>
  );
};
