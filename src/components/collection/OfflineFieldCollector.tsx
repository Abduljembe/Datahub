import React, { useState, useEffect, useRef } from 'react';
import {
  Wifi,
  WifiOff,
  MapPin,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Download,
  Plus,
  Compass,
  FileSpreadsheet,
  Layers,
  Database,
  Eye,
  X,
  Sparkles,
  ShieldCheck,
  Radio,
  Clock
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import {
  FieldOfflineRecord,
  FieldGPSLocation,
  getOfflineQueue,
  saveOfflineRecord,
  deleteOfflineRecord,
  clearSyncedRecords,
  getCurrentGPSLocation,
  compressImageFile,
  exportQueueToGeoJSON,
  transformOfflineRecordsToRows
} from '../../utils/offlineEngine';
import { generateColumnsFromData, exportToCSV } from '../../utils/dataEngine';
import { sendLocationBeacon, recordFieldSubmission, DEFAULT_GEOFENCES } from '../../utils/enumeratorFleetEngine';
import {
  auditSubmissionLocally,
  getLocalAuditRecords,
  saveLocalAuditRecords
} from '../../utils/fieldQualityAuditEngine';

interface OfflineFieldCollectorProps {
  activeDataset: Dataset | null;
  onAppendRowsToActive: (newRows: Record<string, any>[]) => void;
  onCreateDataset: (dataset: Dataset) => void;
  onOpenLiveTracker?: () => void;
}

export const OfflineFieldCollector: React.FC<OfflineFieldCollectorProps> = ({
  activeDataset,
  onAppendRowsToActive,
  onCreateDataset,
  onOpenLiveTracker
}) => {
  // Network detection & offline simulation
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);

  // Live Location Sharing Beacon to Admin
  const [isSharingLocation, setIsSharingLocation] = useState<boolean>(false);
  const [beaconStatus, setBeaconStatus] = useState<string | null>(null);
  const liveWatchRef = useRef<number | null>(null);

  // Queue state
  const [queue, setQueue] = useState<FieldOfflineRecord[]>(() => getOfflineQueue());
  const [selectedRecord, setSelectedRecord] = useState<FieldOfflineRecord | null>(null);

  // Active form data
  const [agentName, setAgentName] = useState<string>('Field Agent 01');
  const [notes, setNotes] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  
  // GPS state
  const [gpsLocation, setGpsLocation] = useState<FieldGPSLocation | null>(null);
  const [isFetchingGPS, setIsFetchingGPS] = useState<boolean>(false);
  const [autoCaptureGPS, setAutoCaptureGPS] = useState<boolean>(true);

  // Photos state
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'form' | 'outbox' | 'templates'>('form');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Effective network state
  const effectiveOnline = isOnline && !simulateOffline;

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch initial GPS if auto-capture enabled
  useEffect(() => {
    if (autoCaptureGPS && !gpsLocation) {
      handleGetGPS();
    }
  }, [autoCaptureGPS]);

  // Handle GPS location capture
  const handleGetGPS = async () => {
    setIsFetchingGPS(true);
    try {
      const loc = await getCurrentGPSLocation();
      setGpsLocation(loc);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingGPS(false);
    }
  };

  // Handle photo file selection and compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingPhoto(true);
    try {
      const newPhotos: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i]);
        newPhotos.push(compressed);
      }
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Photo compression error:', err);
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove a photo
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Live location broadcast to Admin / Supervisor
  const toggleLocationSharing = () => {
    if (isSharingLocation) {
      if (liveWatchRef.current !== null) {
        navigator.geolocation.clearWatch(liveWatchRef.current);
        liveWatchRef.current = null;
      }
      setIsSharingLocation(false);
      setBeaconStatus('Live location beacon deactivated.');
      setTimeout(() => setBeaconStatus(null), 3500);
    } else {
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      setBeaconStatus('Broadcasting live coordinates to Supervisor Fleet Radar...');
      const watchId = navigator.geolocation.watchPosition(
        async pos => {
          const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;
          setGpsLocation({
            latitude,
            longitude,
            accuracy,
            altitude: altitude || undefined,
            timestamp: new Date().toISOString()
          });

          if (effectiveOnline) {
            const agentId = `enum_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'field_agent'}`;
            await sendLocationBeacon({
              id: agentId,
              name: agentName || 'Field Agent',
              role: 'Active Field Collector',
              lat: latitude,
              lng: longitude,
              accuracy: Math.round(accuracy),
              altitude: altitude ? Math.round(altitude) : null,
              speed: speed ? Math.round(speed * 3.6) : 0,
              heading: heading ? Math.round(heading) : 0,
              status: 'collecting',
              campaign: activeDataset?.name || 'Field Survey Campaign',
              assignedZone: 'Active Sector'
            });
            setBeaconStatus(`Live GPS stream active: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (±${Math.round(accuracy)}m)`);
          }
        },
        err => {
          console.error('GPS Watch error:', err);
          setBeaconStatus(`GPS Signal Error: ${err.message}`);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );

      liveWatchRef.current = watchId;
      setIsSharingLocation(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveWatchRef.current !== null) {
        navigator.geolocation.clearWatch(liveWatchRef.current);
      }
    };
  }, []);

  // Form interview dwell-timer
  const formStartTimeRef = useRef<number>(Date.now());
  const [elapsedInterviewSeconds, setElapsedInterviewSeconds] = useState<number>(0);

  useEffect(() => {
    formStartTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedInterviewSeconds(Math.floor((Date.now() - formStartTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Save new field record locally to offline queue
  const handleSubmitFieldRecord = (e: React.FormEvent) => {
    e.preventDefault();

    const dwellTime = Math.max(12, Math.floor((Date.now() - formStartTimeRef.current) / 1000));

    const newRecord: FieldOfflineRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      datasetId: activeDataset?.id || 'field_collection_default',
      datasetName: activeDataset?.name || 'Field Surveys & Observations',
      createdAt: new Date().toISOString(),
      agentName: agentName.trim() || 'Anonymous Agent',
      notes: notes.trim(),
      gps: gpsLocation,
      photos: [...photos],
      data: { ...formValues },
      status: 'queued'
    };

    const updatedQueue = saveOfflineRecord(newRecord);
    setQueue(updatedQueue);

    // Run Local AI Supervisor Audit and save to Supervisor Quality Queue
    if (gpsLocation) {
      const agentId = `enum_${agentName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'field_agent'}`;
      const auditResult = auditSubmissionLocally({
        submissionId: newRecord.id,
        agent: {
          id: agentId,
          name: agentName || 'Field Agent',
          email: `${agentId}@datahub-field.org`,
          role: 'Active Field Collector',
          lat: gpsLocation.latitude,
          lng: gpsLocation.longitude,
          accuracy: gpsLocation.accuracy,
          status: 'collecting',
          campaign: activeDataset?.name || 'Field Survey Campaign',
          assignedZone: 'Zone A (North Research Valley)',
          surveysCollectedToday: 1,
          lastActive: new Date().toISOString(),
          approvalStatus: 'approved',
          registeredAt: new Date().toISOString(),
          history: []
        },
        lat: gpsLocation.latitude,
        lng: gpsLocation.longitude,
        accuracy: gpsLocation.accuracy,
        dwellTimeSeconds: dwellTime,
        data: formValues,
        photos: photos,
        geofences: DEFAULT_GEOFENCES
      });

      const currentAudits = getLocalAuditRecords();
      saveLocalAuditRecords([auditResult, ...currentAudits]);

      // If online & has GPS, broadcast submission pin to Admin Radar
      if (effectiveOnline) {
        recordFieldSubmission(
          agentId,
          `${activeDataset?.name || 'Field Survey'} (Record #${newRecord.id.slice(-4)})`,
          gpsLocation.latitude,
          gpsLocation.longitude,
          newRecord.id
        ).catch(() => {});
      }
    }

    // Reset form timer & values for next record
    formStartTimeRef.current = Date.now();
    setElapsedInterviewSeconds(0);
    setFormValues({});
    setNotes('');
    setPhotos([]);
    if (autoCaptureGPS) {
      handleGetGPS();
    }

    setSyncStatus('Record saved & audited locally! Ready for supervisor review.');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  // Batch Sync Queued Records to Active Dataset
  const handleSyncToDataset = () => {
    const queued = queue.filter(r => r.status === 'queued');
    if (queued.length === 0) return;

    const rows = transformOfflineRecordsToRows(queued);

    if (activeDataset) {
      onAppendRowsToActive(rows);
    } else {
      // Create new dataset with these rows
      const generatedCols = generateColumnsFromData(rows);

      const newDs: Dataset = {
        id: `ds_field_${Date.now()}`,
        name: 'Field Surveys & GPS Data',
        description: `Imported from ${queued.length} offline field records`,
        sourceType: 'manual',
        data: rows,
        columns: generatedCols,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onCreateDataset(newDs);
    }

    // Mark records as synced
    const updated = queue.map(r => r.status === 'queued' ? { ...r, status: 'synced' as const, syncedAt: new Date().toISOString() } : r);
    localStorage.setItem('datahub_field_offline_queue', JSON.stringify(updated));
    setQueue(updated);

    setSyncStatus(`Successfully synced ${queued.length} field records into the dataset!`);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  // Delete a record
  const handleDeleteRecord = (id: string) => {
    const updated = deleteOfflineRecord(id);
    setQueue(updated);
    if (selectedRecord?.id === id) setSelectedRecord(null);
  };

  // Load Preset Field Templates
  const handleLoadPreset = (presetName: string) => {
    if (presetName === 'agri') {
      setNotes('Crop inspection: slight moisture deficit observed on plot B.');
      setFormValues({
        plot_id: 'PLOT-402',
        crop_type: 'Soybean',
        soil_ph: 6.8,
        moisture_pct: 22.4,
        pest_infestation: 'None',
        estimated_yield_kg: 320
      });
    } else if (presetName === 'clinical') {
      setNotes('Routine patient community screening visit.');
      setFormValues({
        patient_id: 'PT-8912',
        blood_pressure_systolic: 124,
        blood_pressure_diastolic: 82,
        blood_glucose_mg: 98,
        symptom_severity: 'Mild',
        treatment_adherence_pct: 95
      });
    } else if (presetName === 'asset') {
      setNotes('Bridge joint structural review: no critical hairline fractures.');
      setFormValues({
        asset_id: 'BR-North-14',
        structural_integrity_score: 9.2,
        corrosion_level: 'Low',
        vibration_hz: 14.5,
        maintenance_required: false
      });
    }
    setActiveTab('form');
  };

  const queuedCount = queue.filter(r => r.status === 'queued').length;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER & NETWORK STATUS */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Radio className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Offline Field Collector & GPS Mobile Kiosk
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Collect observations, survey responses, GPS coordinates, and photos completely offline during remote fieldwork.
            </p>
          </div>

          {/* Network Indicator & Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${
                effectiveOnline
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              {effectiveOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span>Online (Live Sync Ready)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Offline Mode (Storing Locally)</span>
                </>
              )}
            </div>

            <button
              onClick={() => setSimulateOffline(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                simulateOffline
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
              title="Simulate network disconnection to test offline collection flow"
            >
              {simulateOffline ? 'Disable Simulation' : 'Simulate Offline Mode'}
            </button>
          </div>
        </div>

        {/* Sub-tabs Ribbon */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('form')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'form'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Collect New Record</span>
            </button>

            <button
              onClick={() => setActiveTab('outbox')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'outbox'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Offline Outbox</span>
              {queuedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                  {queuedCount} Queued
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'templates'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-950/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Field Templates</span>
            </button>
          </div>

          {queuedCount > 0 && (
            <button
              onClick={handleSyncToDataset}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync {queuedCount} Queued to Dataset</span>
            </button>
          )}
        </div>
      </div>

      {/* SYNC NOTIFICATION BANNER */}
      {syncStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* TAB 1: FIELD ENTRY FORM */}
      {activeTab === 'form' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Field Form */}
          <form onSubmit={handleSubmitFieldRecord} className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <span>Field Record Information</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Target: {activeDataset?.name || 'Local Store'}
                </span>
              </div>

              {/* AI Field Supervisor Live Pacing Bar */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <div>
                    <span className="text-slate-400">Interview Dwell Time: </span>
                    <span className="font-mono font-bold text-white">{Math.floor(elapsedInterviewSeconds / 60)}m {elapsedInterviewSeconds % 60}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Pacing: </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      elapsedInterviewSeconds < 20
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {elapsedInterviewSeconds < 20 ? 'Speed Warning (<20s)' : 'Standard Pacing'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Audit Active</span>
                  </div>
                </div>
              </div>

              {/* Agent & Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Field Agent / Enumerator ID</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={e => setAgentName(e.target.value)}
                    required
                    placeholder="e.g. Field Agent 01, Dr. Jane"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Observation Notes / Field Log</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Weather conditions, unusual readings..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Dynamic Columns from Active Dataset Schema or Custom Values */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-200 block uppercase tracking-wider text-[11px]">
                  Dataset Variables & Measurements
                </label>

                {activeDataset ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeDataset.columns.map(col => (
                      <div key={col.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-slate-300 capitalize">
                            {col.name.replace(/_/g, ' ')}
                          </label>
                          <span className="text-[10px] font-mono text-slate-500">{col.type}</span>
                        </div>
                        <input
                          type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                          step={col.type === 'number' ? 'any' : undefined}
                          value={formValues[col.name] ?? ''}
                          onChange={e => {
                            const val = col.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                            setFormValues(prev => ({ ...prev, [col.name]: val }));
                          }}
                          placeholder={`Enter ${col.name}...`}
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      You don't have an active dataset selected yet. Add key-value measurements below or load a template:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['sample_id', 'measurement_val', 'condition_rating', 'location_code'].map(field => (
                        <div key={field} className="space-y-1">
                          <label className="text-xs font-medium text-slate-300 capitalize">{field.replace(/_/g, ' ')}</label>
                          <input
                            type="text"
                            value={formValues[field] ?? ''}
                            onChange={e => setFormValues(prev => ({ ...prev, [field]: e.target.value }))}
                            placeholder={`Enter ${field}...`}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Photos Capture Section */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Field Photos & Evidence ({photos.length})</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Capture / Upload Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                {isCompressingPhoto && (
                  <div className="text-xs text-cyan-400 animate-pulse flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Compressing image for offline storage...</span>
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {photos.map((src, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-video bg-slate-950">
                        <img src={src} alt={`Capture ${i+1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(i)}
                          className="absolute top-1 right-1 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Record to Local Outbox</span>
                </button>
              </div>

            </div>
          </form>

          {/* GPS HUD & Geolocation Sidebar */}
          <div className="space-y-6">
            
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>GPS Geolocation Tag</span>
                </h4>
                <button
                  onClick={handleGetGPS}
                  disabled={isFetchingGPS}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  title="Refresh GPS position"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGPS ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {gpsLocation ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Latitude:</span>
                      <span className="font-mono font-bold text-emerald-400">{gpsLocation.latitude}°</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Longitude:</span>
                      <span className="font-mono font-bold text-emerald-400">{gpsLocation.longitude}°</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Accuracy:</span>
                      <span className="font-mono text-cyan-400">±{gpsLocation.accuracy} meters</span>
                    </div>
                    {gpsLocation.altitude && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Altitude:</span>
                        <span className="font-mono text-slate-300">{gpsLocation.altitude} m</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Coordinates will be auto-attached to this submission.</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 space-y-2">
                  <MapPin className="w-6 h-6 mx-auto text-slate-600" />
                  <p className="text-xs">GPS position pending...</p>
                  <button
                    onClick={handleGetGPS}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Acquire GPS Coordinates
                  </button>
                </div>
              )}

              {/* LIVE LOCATION SHARING BEACON (FOR ADMIN/SUPERVISOR TRACKING) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${isSharingLocation ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-white">Live Location Sharing</div>
                      <div className="text-[10px] text-slate-400">Stream GPS to Admin Radar</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleLocationSharing}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                      isSharingLocation
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    {isSharingLocation ? 'Active (ON)' : 'Share (OFF)'}
                  </button>
                </div>

                {beaconStatus && (
                  <p className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-800/40">
                    {beaconStatus}
                  </p>
                )}

                {onOpenLiveTracker && (
                  <button
                    type="button"
                    onClick={onOpenLiveTracker}
                    className="w-full py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open Admin Fleet Radar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>Auto-refresh GPS on submission</span>
                <input
                  type="checkbox"
                  checked={autoCaptureGPS}
                  onChange={e => setAutoCaptureGPS(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                />
              </div>
            </div>

            {/* Quick Outbox Summary Card */}
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Local Queue Status</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                  {queue.length} Total Records
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pending Sync:</span>
                <span className="font-bold text-amber-400 font-mono">{queuedCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Already Synced:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {queue.filter(r => r.status === 'synced').length}
                </span>
              </div>
              {queuedCount > 0 && (
                <button
                  onClick={() => setActiveTab('outbox')}
                  className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  View Outbox Queue →
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: OUTBOX QUEUE & SYNC MANAGER */}
      {activeTab === 'outbox' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Offline Stored Queue ({queue.length} Records)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Submissions cached in your local browser sandbox ready for export or batch sync.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportQueueToGeoJSON(queue)}
                  disabled={queue.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  title="Export offline coordinates as GeoJSON for GIS mapping"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export GeoJSON</span>
                </button>

                <button
                  onClick={() => {
                    const rows = transformOfflineRecordsToRows(queue);
                    const dummyDs: Dataset = {
                      id: 'offline_queue',
                      name: 'offline_field_queue',
                      description: 'Offline Field Collection Queue',
                      sourceType: 'manual',
                      data: rows,
                      columns: generateColumnsFromData(rows),
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    exportToCSV(dummyDs, 'offline_field_queue');
                  }}
                  disabled={queue.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => {
                    const updated = clearSyncedRecords();
                    setQueue(updated);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Synced</span>
                </button>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Layers className="w-10 h-10 mx-auto text-slate-700" />
                <p className="text-sm font-semibold text-slate-300">No field records in offline queue</p>
                <p className="text-xs text-slate-500">Collect records using the form tab above or import a field template.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Agent</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">GPS Location</th>
                      <th className="p-3">Photos</th>
                      <th className="p-3">Measurements</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {queue.map(record => (
                      <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              record.status === 'synced'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {record.status === 'synced' ? 'Synced' : 'Queued'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-white">{record.agentName}</td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {record.gps ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {record.gps.latitude.toFixed(4)}, {record.gps.longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                        <td className="p-3">
                          {record.photos.length > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono">
                              {record.photos.length} Photo{record.photos.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 truncate max-w-xs">
                          {Object.entries(record.data).map(([k, v]) => `${k}: ${v}`).join(', ') || record.notes || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                              title="Inspect Record"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs border border-rose-500/20"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* Record Inspection Modal / Drawer */}
          {selectedRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
              <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-white text-sm">Record Details ({selectedRecord.id})</h4>
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Agent:</span>
                    <span className="text-white font-semibold">{selectedRecord.agentName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Captured At:</span>
                    <span className="text-slate-200 font-mono">{selectedRecord.createdAt}</span>
                  </div>
                  {selectedRecord.notes && (
                    <div className="p-2.5 rounded-xl bg-slate-950 text-slate-300 border border-slate-800">
                      <strong>Notes:</strong> {selectedRecord.notes}
                    </div>
                  )}

                  <div className="space-y-1 pt-2">
                    <span className="font-bold text-slate-300">Data Values:</span>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                      {JSON.stringify(selectedRecord.data, null, 2)}
                    </pre>
                  </div>

                  {selectedRecord.photos.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="font-bold text-slate-300">Attached Photos:</span>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRecord.photos.map((img, i) => (
                          <img key={i} src={img} alt="Capture" className="rounded-xl border border-slate-800 object-cover aspect-video" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FIELD TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
            <div className="space-y-2">
              <span className="text-2xl">🌾</span>
              <h4 className="font-bold text-sm text-white">Agricultural Soil & Yield Inspection</h4>
              <p className="text-xs text-slate-400">
                Track soil pH, moisture percentage, crop type, pest levels, and estimated harvest yield with GPS boundary tagging.
              </p>
            </div>
            <button
              onClick={() => handleLoadPreset('agri')}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              Load Agriculture Form
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
            <div className="space-y-2">
              <span className="text-2xl">🔬</span>
              <h4 className="font-bold text-sm text-white">Clinical & Community Health Survey</h4>
              <p className="text-xs text-slate-400">
                Record patient vital signs, blood glucose, blood pressure, symptom progression, and treatment compliance offline.
              </p>
            </div>
            <button
              onClick={() => handleLoadPreset('clinical')}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              Load Clinical Survey
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between hover:border-indigo-500/50 transition-all">
            <div className="space-y-2">
              <span className="text-2xl">🏗️</span>
              <h4 className="font-bold text-sm text-white">Infrastructure & Asset Audit</h4>
              <p className="text-xs text-slate-400">
                Inspect physical assets, bridge joints, pipelines, structural integrity scores, and attach evidence photos.
              </p>
            </div>
            <button
              onClick={() => handleLoadPreset('asset')}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
            >
              Load Asset Inspection
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
