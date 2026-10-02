import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radio,
  MapPin,
  Compass,
  Navigation,
  Battery,
  BatteryCharging,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Play,
  Pause,
  RefreshCw,
  Layers,
  Users,
  Download,
  CheckCircle2,
  AlertTriangle,
  Send,
  Phone,
  Mail,
  Clock,
  Eye,
  Sliders,
  Sparkles,
  Info,
  Maximize2,
  FileSpreadsheet,
  Globe,
  Plus,
  UserPlus,
  Edit3,
  Smartphone,
  QrCode,
  MessageSquare
} from 'lucide-react';
import {
  EnumeratorAgent,
  GeofenceZone,
  DEFAULT_GEOFENCES,
  fetchEnumeratorFleet,
  sendLocationBeacon,
  recordFieldSubmission,
  updateEnumeratorStatus,
  simulateFleetStep,
  resetFleetDeployment,
  calculateDistanceKm,
  isAgentInsideGeofence,
  INITIAL_DEFAULT_FLEET
} from '../../utils/enumeratorFleetEngine';
import {
  FieldAuditRecord,
  getLocalAuditRecords,
  saveLocalAuditRecords,
  computeFleetQualityMetrics,
  FleetQualityMetrics
} from '../../utils/fieldQualityAuditEngine';
import { FieldQualityAuditModal } from './FieldQualityAuditModal';
import { RegisterEnumeratorModal } from './RegisterEnumeratorModal';
import { EditEnumeratorModal } from './EditEnumeratorModal';
import { EnumeratorFieldPortalModal } from './EnumeratorFieldPortalModal';
import { SupervisorDispatchModal } from './SupervisorDispatchModal';
import { Dataset } from '../../types';

interface LiveEnumeratorTrackerProps {
  activeDataset?: Dataset | null;
  onAppendRowsToActive?: (newRows: Record<string, any>[]) => void;
  onCreateDataset?: (newDataset: Dataset) => void;
}

export const LiveEnumeratorTracker: React.FC<LiveEnumeratorTrackerProps> = ({
  activeDataset,
  onAppendRowsToActive,
  onCreateDataset,
}) => {
  // Fleet State
  const [fleet, setFleet] = useState<EnumeratorAgent[]>(() => {
    try {
      const saved = localStorage.getItem('datahub_enumerator_fleet_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [geofences, setGeofences] = useState<GeofenceZone[]>(DEFAULT_GEOFENCES);
  
  // Real Enumerator Management & Modal States
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [editingAgent, setEditingAgent] = useState<EnumeratorAgent | null>(null);
  const [portalAgent, setPortalAgent] = useState<EnumeratorAgent | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [dispatchTargetAgentId, setDispatchTargetAgentId] = useState<string | null>(null);

  // AI Supervisor Quality Audit Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditRecords, setAuditRecords] = useState<FieldAuditRecord[]>(() => getLocalAuditRecords());
  const auditMetrics: FleetQualityMetrics = computeFleetQualityMetrics(auditRecords);

  // Real-time Controls
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(3);
  const [isSimulatingMovement, setIsSimulatingMovement] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Map Visual Layers
  const [showBreadcrumbs, setShowBreadcrumbs] = useState<boolean>(true);
  const [showGeofences, setShowGeofences] = useState<boolean>(true);
  const [showSurveyPins, setShowSurveyPins] = useState<boolean>(true);
  const [showHeadingArrows, setShowHeadingArrows] = useState<boolean>(true);
  
  // Map Viewport (Pan & Zoom)
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredAgent, setHoveredAgent] = useState<EnumeratorAgent | null>(null);

  // Self-Broadcasting Beacon Mode (Test as Enumerator)
  const [isBroadcastingSelf, setIsBroadcastingSelf] = useState<boolean>(false);
  const [myEnumeratorName, setMyEnumeratorName] = useState<string>('My Field Device (Self)');
  const [selfStatusMsg, setSelfStatusMsg] = useState<string | null>(null);
  const watchPositionIdRef = useRef<number | null>(null);

  // Load Fleet Data from Server
  const loadFleet = async () => {
    const data = await fetchEnumeratorFleet();
    if (data.fleet && data.fleet.length > 0) {
      setFleet(data.fleet);
      setLastSyncTime(new Date());
    }
  };

  // Initial Load
  useEffect(() => {
    loadFleet();
  }, []);

  // Periodic Polling
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isLivePolling) {
      interval = setInterval(() => {
        loadFleet();
      }, pollIntervalSec * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLivePolling, pollIntervalSec]);

  // Movement Simulator Loop
  useEffect(() => {
    let simInterval: NodeJS.Timeout | null = null;
    if (isSimulatingMovement) {
      simInterval = setInterval(async () => {
        const updated = await simulateFleetStep();
        if (updated.length > 0) {
          setFleet(updated);
          setLastSyncTime(new Date());
        }
      }, 2500);
    }
    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [isSimulatingMovement]);

  // Selected Agent Object
  const selectedAgent = useMemo(() => {
    return fleet.find(a => a.id === selectedAgentId) || null;
  }, [fleet, selectedAgentId]);

  // Map Bounds Calculation based on fleet and geofences
  const mapBounds = useMemo(() => {
    if (fleet.length === 0) {
      return { minLat: 37.75, maxLat: 37.81, minLng: -122.45, maxLng: -122.38 };
    }

    const allLats = fleet.map(a => a.lat);
    const allLngs = fleet.map(a => a.lng);

    // include geofence centers
    geofences.forEach(g => {
      allLats.push(g.centerLat);
      allLngs.push(g.centerLng);
    });

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const padLat = Math.max((maxLat - minLat) * 0.2, 0.015);
    const padLng = Math.max((maxLng - minLng) * 0.2, 0.015);

    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [fleet, geofences]);

  // SVG Projection
  const mapWidth = 720;
  const mapHeight = 460;

  const projectToCanvas = (lat: number, lng: number) => {
    const latSpan = mapBounds.maxLat - mapBounds.minLat || 1;
    const lngSpan = mapBounds.maxLng - mapBounds.minLng || 1;

    const normX = (lng - mapBounds.minLng) / lngSpan;
    const normY = (mapBounds.maxLat - lat) / latSpan; // Invert for SVG

    const cx = mapWidth / 2;
    const cy = mapHeight / 2;

    const baseScreenX = normX * (mapWidth - 80) + 40;
    const baseScreenY = normY * (mapHeight - 80) + 40;

    const scaledX = cx + (baseScreenX - cx) * zoomLevel + panOffset.x;
    const scaledY = cy + (baseScreenY - cy) * zoomLevel + panOffset.y;

    return { x: scaledX, y: scaledY };
  };

  // Convert distance in km to SVG pixel radius
  const getPixelRadiusFromKm = (km: number) => {
    const lngSpan = mapBounds.maxLng - mapBounds.minLng || 1;
    // rough approximation: 1 deg lng ~ 111 km * cos(lat)
    const kmSpan = lngSpan * 88;
    const basePx = (km / kmSpan) * (mapWidth - 80);
    return Math.max(20, basePx * zoomLevel);
  };

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Center map on specific agent
  const handleFocusAgent = (agent: EnumeratorAgent) => {
    setSelectedAgentId(agent.id);
    const pos = projectToCanvas(agent.lat, agent.lng);
    const deltaX = mapWidth / 2 - pos.x;
    const deltaY = mapHeight / 2 - pos.y;
    setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    setZoomLevel(1.4);
  };

  // Self Geolocation Broadcaster (Test as real enumerator)
  const toggleSelfBroadcasting = () => {
    if (isBroadcastingSelf) {
      if (watchPositionIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
        watchPositionIdRef.current = null;
      }
      setIsBroadcastingSelf(false);
      setSelfStatusMsg('Location beacon deactivated.');
      setTimeout(() => setSelfStatusMsg(null), 3000);
    } else {
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      setSelfStatusMsg('Acquiring live GPS satellite fix...');
      
      const watchId = navigator.geolocation.watchPosition(
        async position => {
          const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
          
          await sendLocationBeacon({
            id: 'enum_self_browser',
            name: myEnumeratorName,
            role: 'Live Field Enumerator (Device)',
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            altitude: altitude ? Math.round(altitude) : null,
            speed: speed ? Math.round(speed * 3.6) : 0,
            heading: heading ? Math.round(heading) : 0,
            status: 'collecting',
            campaign: 'Live Field Operations',
            assignedZone: 'Sector Local'
          });

          loadFleet();
          setSelfStatusMsg(`Broadcasting GPS: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}° (±${Math.round(accuracy)}m)`);
        },
        error => {
          console.error('GPS Watch error:', error);
          setSelfStatusMsg(`GPS Error: ${error.message}. Please check location permissions.`);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );

      watchPositionIdRef.current = watchId;
      setIsBroadcastingSelf(true);
    }
  };

  // Status color helper
  const getStatusColor = (status: EnumeratorAgent['status']) => {
    switch (status) {
      case 'collecting':
        return '#10b981'; // Emerald
      case 'transit':
        return '#06b6d4'; // Cyan
      case 'sos':
        return '#f43f5e'; // Rose
      case 'idle':
      default:
        return '#f59e0b'; // Amber
    }
  };

  // Status Label
  const getStatusBadge = (status: EnumeratorAgent['status']) => {
    switch (status) {
      case 'collecting':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Actively Surveying</span>;
      case 'transit':
        return <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">In Transit</span>;
      case 'sos':
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold animate-pulse">SOS / Assistance</span>;
      case 'idle':
      default:
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">Stationary / Idle</span>;
    }
  };

  // Trigger Survey Simulation for Agent
  const handleSimulateSurveyPin = async (agent: EnumeratorAgent) => {
    await recordFieldSubmission(agent.id, 'Household Crop & Health Survey', agent.lat, agent.lng);
    loadFleet();
  };

  // Change status of agent
  const handleChangeStatus = async (agentId: string, status: EnumeratorAgent['status']) => {
    await updateEnumeratorStatus(agentId, status);
    loadFleet();
  };

  // Reset Fleet
  const handleResetFleet = async () => {
    await resetFleetDeployment();
    loadFleet();
  };

  // Export Dispatch Log to GeoJSON
  const handleExportFleetGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: fleet.map(a => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [a.lng, a.lat],
        },
        properties: {
          id: a.id,
          name: a.name,
          role: a.role,
          status: a.status,
          battery: a.batteryLevel,
          campaign: a.campaign,
          surveysCollectedToday: a.surveysCollectedToday,
          lastActive: a.lastActive,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enumerator_fleet_dispatch_${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & FLEET COMMAND CONTROLS */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Live Enumerator Fleet & Field Location Tracker</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time GPS tracking for field supervisors to monitor enumerator breadcrumbs, battery levels, geofencing, and survey submission pins.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Register Real Field Enumerator Button */}
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 border border-emerald-400/30"
              title="Add a real field team member or enumerator"
            >
              <UserPlus className="w-4 h-4 text-emerald-200" />
              <span>Register Real Enumerator</span>
            </button>

            {/* Supervisor Dispatch Broadcast Button */}
            <button
              onClick={() => {
                setDispatchTargetAgentId(null);
                setIsDispatchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
              title="Broadcast instructions or safety alerts to field team"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Field Dispatch</span>
            </button>

            {/* AI Field Supervisor Quality Audit Center Button */}
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 border border-indigo-400/30"
              title="Open AI Field Supervisor Quality Audit Center"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>AI Quality Audit Center</span>
              {auditMetrics.flaggedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                  {auditMetrics.flaggedCount} Anomaly
                </span>
              )}
            </button>

            {/* Live Movement Simulation Button */}
            <button
              onClick={() => setIsSimulatingMovement(prev => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isSimulatingMovement
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-950/40 animate-pulse'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-850'
              }`}
              title="Simulates real-time footsteps and vehicular transit across field agents"
            >
              {isSimulatingMovement ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isSimulatingMovement ? 'Pause Fleet Sim' : 'Simulate Movement'}</span>
            </button>

            {/* Test as Device (Transmit Self GPS) */}
            <button
              onClick={toggleSelfBroadcasting}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isBroadcastingSelf
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Broadcast your browser's real device GPS to the admin map"
            >
              <Navigation className={`w-3.5 h-3.5 ${isBroadcastingSelf ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isBroadcastingSelf ? 'Stop GPS Broadcast' : 'Transmit My GPS'}</span>
            </button>

            {/* Export Dispatch Logs */}
            <button
              onClick={handleExportFleetGeoJSON}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export</span>
            </button>

            {/* Reset Fleet */}
            <button
              onClick={handleResetFleet}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all"
              title="Reset fleet deployment"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

          </div>
        </div>

        {/* Self-broadcasting message */}
        {selfStatusMsg && (
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>{selfStatusMsg}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Agent: {myEnumeratorName}</span>
          </div>
        )}

        {/* Tactical Filter Ribbon */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          
          {/* Layer toggles */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Map Layers:</span>
            
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showBreadcrumbs}
                onChange={e => setShowBreadcrumbs(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600"
              />
              <span>Breadcrumb Route Trails</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showGeofences}
                onChange={e => setShowGeofences(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-cyan-600"
              />
              <span>Geofence Operational Zones</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSurveyPins}
                onChange={e => setShowSurveyPins(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-emerald-600"
              />
              <span>Survey Submission Hotspots</span>
            </label>
          </div>

          {/* Polling interval */}
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Telemetry Refresh:</span>
            <select
              value={pollIntervalSec}
              onChange={e => setPollIntervalSec(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono"
            >
              <option value={2}>2 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
            </select>
          </div>

        </div>

      </div>

      {/* STATISTICAL METRICS OVERVIEW WITH AI QUALITY INDEX */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Field Agents</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{fleet.length} Active</div>
          <p className="text-[10px] text-slate-500">Live regional team</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Actively Surveying</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">
            {fleet.filter(a => a.status === 'collecting').length} Agents
          </div>
          <p className="text-[10px] text-slate-500">Submitting questionnaires</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Surveys Today</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-400 font-mono">
            {fleet.reduce((sum, a) => sum + (a.surveysCollectedToday || 0), 0)} Records
          </div>
          <p className="text-[10px] text-slate-500">Submissions received</p>
        </div>

        {/* AI Integrity Score Card */}
        <div
          onClick={() => setIsAuditModalOpen(true)}
          className="p-4 rounded-2xl bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-500/30 cursor-pointer transition-all space-y-1 group"
        >
          <div className="flex items-center justify-between text-indigo-300 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">AI Quality Index</span>
            <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-extrabold text-indigo-200 font-mono flex items-center gap-1.5">
            <span>{auditMetrics.avgQualityScore}%</span>
            <span className="text-[11px] font-normal text-slate-400">Avg</span>
          </div>
          <p className="text-[10px] text-cyan-300 font-semibold">{auditMetrics.cleanPassRate}% Clean Pass Rate</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Geofence Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-300 font-mono">
            {geofences.length} Zones
          </div>
          <p className="text-[10px] text-slate-500">{auditMetrics.geofenceComplianceRate}% In-Bounds</p>
        </div>

      </div>

      {/* MAIN RADAR MAP & INSPECTOR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Tactical Map Canvas */}
        <div className="lg:col-span-3 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white">
                Live Spatial Fleet Radar ({fleet.length} Units Active)
              </span>
            </div>

            {/* Map Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 4))}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold font-mono"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.6))}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold font-mono"
                title="Zoom Out"
              >
                -
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                  setPanOffset({ x: 0, y: 0 });
                  setSelectedAgentId(null);
                }}
                className="p-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs"
                title="Reset Map to Regional Center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Radar Stage */}
          <div
            className="w-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden relative select-none cursor-grab active:cursor-grabbing flex justify-center items-center"
            style={{ minHeight: '460px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              width={mapWidth}
              height={mapHeight}
              className="overflow-visible"
            >
              {/* Tactical Background Grid */}
              <defs>
                <pattern id="radarGrid" width="35" height="35" patternUnits="userSpaceOnUse">
                  <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1e293b" strokeWidth="0.75" />
                </pattern>
                
                {/* Radial gradient for beacon ping */}
                <radialGradient id="beaconGlow">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>

              <rect width="100%" height="100%" fill="url(#radarGrid)" />

              {/* GEOFENCE OPERATIONAL ZONES */}
              {showGeofences && geofences.map(zone => {
                const pos = projectToCanvas(zone.centerLat, zone.centerLng);
                const rPx = getPixelRadiusFromKm(zone.radiusKm);

                return (
                  <g key={zone.id}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={rPx}
                      fill={zone.color}
                      fillOpacity="0.07"
                      stroke={zone.color}
                      strokeWidth="1.5"
                      strokeDasharray="6,6"
                    />
                    <text
                      x={pos.x}
                      y={pos.y - rPx - 6}
                      fill={zone.color}
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {zone.name} ({zone.radiusKm} km radius)
                    </text>
                  </g>
                );
              })}

              {/* BREADCRUMB TRAILS FOR ALL AGENTS */}
              {showBreadcrumbs && fleet.map(agent => {
                const isSelected = selectedAgentId === agent.id;
                if (!agent.history || agent.history.length < 2) return null;

                const pathData = agent.history.map((pt, i) => {
                  const pos = projectToCanvas(pt.lat, pt.lng);
                  return `${i === 0 ? 'M' : 'L'} ${pos.x} ${pos.y}`;
                }).join(' ');

                const trailColor = getStatusColor(agent.status);

                return (
                  <g key={`trail_${agent.id}`} opacity={isSelected ? 1 : 0.45}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke={trailColor}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      strokeDasharray="4,4"
                      strokeLinecap="round"
                    />
                    {agent.history.map((pt, idx) => {
                      const pos = projectToCanvas(pt.lat, pt.lng);
                      return (
                        <circle
                          key={`pt_${agent.id}_${idx}`}
                          cx={pos.x}
                          cy={pos.y}
                          r={isSelected ? 3 : 2}
                          fill={trailColor}
                          opacity="0.8"
                        >
                          <title>{`${agent.name}\n${pt.activity}\n${new Date(pt.timestamp).toLocaleTimeString()}`}</title>
                        </circle>
                      );
                    })}
                  </g>
                );
              })}

              {/* SURVEY SUBMISSION HOTSPOTS PINS */}
              {showSurveyPins && fleet.map(agent => (
                agent.recentSubmissions?.map(sub => {
                  const pos = projectToCanvas(sub.lat, sub.lng);
                  const isAuditFlagged = auditRecords.some(r => r.submissionId === sub.id && r.status === 'flagged');

                  return (
                    <g
                      key={`sub_pin_${sub.id}`}
                      className="cursor-pointer group"
                      onClick={e => {
                        e.stopPropagation();
                        setIsAuditModalOpen(true);
                      }}
                    >
                      {/* Flagged Anomaly Radar Ring */}
                      {isAuditFlagged && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="12"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="1.5"
                          className="animate-ping"
                          opacity="0.8"
                        />
                      )}

                      <polygon
                        points={`${pos.x},${pos.y - 8} ${pos.x + 6},${pos.y + 4} ${pos.x - 6},${pos.y + 4}`}
                        fill={isAuditFlagged ? '#f43f5e' : '#fbbf24'}
                        stroke="#020617"
                        strokeWidth="1"
                        className="transition-transform hover:scale-150"
                      />
                      <title>{`Survey Submitted: ${sub.title}\nBy: ${agent.name}\nStatus: ${isAuditFlagged ? 'ANOMALY FLAGGED' : 'Verified'}\nTime: ${new Date(sub.timestamp).toLocaleTimeString()}\nClick to open AI Audit Inspector`}</title>
                    </g>
                  );
                })
              ))}

              {/* ENUMERATOR VEHICLE / AGENT LIVE MARKERS */}
              {fleet.map(agent => {
                const pos = projectToCanvas(agent.lat, agent.lng);
                const color = getStatusColor(agent.status);
                const isSelected = selectedAgentId === agent.id;

                return (
                  <g
                    key={agent.id}
                    className="cursor-pointer"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedAgentId(agent.id);
                    }}
                    onMouseEnter={() => setHoveredAgent(agent)}
                    onMouseLeave={() => setHoveredAgent(null)}
                  >
                    {/* Live Radar Ping Pulse */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="16"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.5"
                      className="animate-ping"
                      opacity="0.6"
                    />

                    {/* Outer selection ring */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="14"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeDasharray="2,2"
                      />
                    )}

                    {/* Central marker circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="9"
                      fill={color}
                      stroke="#020617"
                      strokeWidth="2"
                      className="transition-transform hover:scale-125"
                    />

                    {/* Inner core white dot */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="3.5"
                      fill="#ffffff"
                    />

                    {/* Directional heading vector */}
                    {showHeadingArrows && agent.heading !== undefined && (
                      <line
                        x1={pos.x}
                        y1={pos.y}
                        x2={pos.x + Math.sin((agent.heading * Math.PI) / 180) * 16}
                        y2={pos.y - Math.cos((agent.heading * Math.PI) / 180) * 16}
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Agent Name Tag Badge */}
                    <text
                      x={pos.x}
                      y={pos.y + 18}
                      fill="#f8fafc"
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="select-none pointer-events-none drop-shadow"
                    >
                      {agent.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

            </svg>

            {/* Hover Floating HUD */}
            {hoveredAgent && (
              <div className="absolute top-4 left-4 p-3 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur text-xs space-y-1.5 pointer-events-none z-10 animate-in fade-in">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{hoveredAgent.name}</span>
                  </span>
                  {getStatusBadge(hoveredAgent.status)}
                </div>
                
                <div className="text-[11px] text-slate-300 space-y-0.5 font-mono">
                  <div>GPS: {hoveredAgent.lat.toFixed(4)}°, {hoveredAgent.lng.toFixed(4)}° (±{hoveredAgent.accuracy}m)</div>
                  <div>Speed: {hoveredAgent.speed} km/h • Battery: {hoveredAgent.batteryLevel}%</div>
                  <div>Surveys Today: {hoveredAgent.surveysCollectedToday}</div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ENUMERATOR DOSSIER & ACTIONS DRAWER */}
        <div className="space-y-4">
          
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Enumerator Profile & HUD</span>
            </h3>

            {selectedAgent ? (
              <div className="space-y-3.5 text-xs">
                
                {/* Profile card */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{selectedAgent.name}</h4>
                      <p className="text-[11px] text-slate-400">{selectedAgent.role}</p>
                    </div>
                    {getStatusBadge(selectedAgent.status)}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="text-slate-400">
                      Zone: <span className="text-white">{selectedAgent.assignedZone}</span>
                    </div>
                    <div className="text-slate-400">
                      Surveys: <span className="text-emerald-400 font-bold">{selectedAgent.surveysCollectedToday}</span>
                    </div>
                  </div>

                  {selectedAgent.phone && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/50">
                      <Phone className="w-3 h-3 text-indigo-400" />
                      <span className="text-slate-300 font-mono">{selectedAgent.phone}</span>
                    </div>
                  )}

                  {selectedAgent.notes && (
                    <div className="p-2 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[10px] text-indigo-300">
                      <span className="font-bold">Latest Directive: </span>
                      <span>{selectedAgent.notes}</span>
                    </div>
                  )}
                </div>

                {/* Live Device Diagnostics */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Device Telemetry</span>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Battery Level:</span>
                    </span>
                    <span className="font-mono font-bold text-white">{selectedAgent.batteryLevel}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Speed:</span>
                    </span>
                    <span className="font-mono text-cyan-300">{selectedAgent.speed} km/h</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>GPS Accuracy:</span>
                    </span>
                    <span className="font-mono text-slate-200">±{selectedAgent.accuracy} meters</span>
                  </div>
                </div>

                {/* Operational Command Actions */}
                <div className="space-y-2 pt-1">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Supervisor Controls</span>
                  
                  {/* Open Mobile Portal & Direct Dispatch */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPortalAgent(selectedAgent)}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                      title="Open or share mobile phone collector link & QR code"
                    >
                      <Smartphone className="w-3 h-3 text-indigo-400" />
                      <span>Mobile Portal & QR</span>
                    </button>

                    <button
                      onClick={() => {
                        setDispatchTargetAgentId(selectedAgent.id);
                        setIsDispatchModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Send className="w-3 h-3 text-cyan-400" />
                      <span>Dispatch Directive</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSimulateSurveyPin(selectedAgent)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Log Survey Pin</span>
                    </button>

                    <button
                      onClick={() => handleChangeStatus(selectedAgent.id, selectedAgent.status === 'sos' ? 'collecting' : 'sos')}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 border transition-all ${
                        selectedAgent.status === 'sos'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <ShieldAlert className="w-3 h-3" />
                      <span>{selectedAgent.status === 'sos' ? 'Clear SOS' : 'Trigger SOS'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditingAgent(selectedAgent)}
                      className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      onClick={() => handleFocusAgent(selectedAgent)}
                      className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                    >
                      Center on Radar
                    </button>
                  </div>
                </div>

                {/* Recent Submissions Log */}
                <div className="space-y-1.5 pt-1">
                  <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Today's Survey Pins ({selectedAgent.recentSubmissions?.length || 0})</span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {selectedAgent.recentSubmissions && selectedAgent.recentSubmissions.length > 0 ? (
                      selectedAgent.recentSubmissions.map((sub, i) => (
                        <div key={i} className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[10px] space-y-0.5">
                          <div className="flex justify-between font-semibold text-slate-200">
                            <span>{sub.title}</span>
                            <span className="text-amber-400">{new Date(sub.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-slate-500 font-mono">{sub.lat.toFixed(4)}°, {sub.lng.toFixed(4)}°</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500 text-center py-2">No records logged today yet.</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-700" />
                <p className="text-xs">Click any enumerator marker on the radar or roster below to view their live dossier and route trails.</p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* FLEET ROSTER DATA TABLE */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Active Field Enumerator Fleet Roster ({fleet.length})</span>
            </h3>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Real Person</span>
            </button>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Last Synced: {lastSyncTime.toLocaleTimeString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="p-3">Enumerator Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Assigned Campaign</th>
                <th className="p-3">Live Coordinates</th>
                <th className="p-3">Speed & Battery</th>
                <th className="p-3 text-center">Surveys</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {fleet.map(agent => (
                <tr
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    selectedAgentId === agent.id ? 'bg-indigo-950/20' : ''
                  }`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(agent.status) }} />
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{agent.name}</span>
                          {agent.phone && (
                            <span className="text-[10px] text-slate-400 font-mono">({agent.phone})</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">{agent.role}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-3">{getStatusBadge(agent.status)}</td>
                  
                  <td className="p-3 text-slate-300">
                    <div>{agent.campaign}</div>
                    <div className="text-[10px] text-indigo-400 font-mono">{agent.assignedZone}</div>
                  </td>

                  <td className="p-3 font-mono text-slate-300 text-[11px]">
                    <div>{agent.lat.toFixed(4)}°, {agent.lng.toFixed(4)}°</div>
                    <div className="text-[10px] text-slate-500">±{agent.accuracy}m accuracy</div>
                  </td>

                  <td className="p-3 font-mono text-slate-300">
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400">{agent.speed} km/h</span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Battery className="w-3 h-3" />
                        {agent.batteryLevel}%
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-emerald-400">
                    {agent.surveysCollectedToday}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setPortalAgent(agent)}
                        className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 transition-colors"
                        title="Open Mobile Portal & QR"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingAgent(agent)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Edit Profile"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDispatchTargetAgentId(agent.id);
                          setIsDispatchModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 transition-colors"
                        title="Dispatch Message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFocusAgent(agent)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                      >
                        Track
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Real Enumerator Modal */}
      <RegisterEnumeratorModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onRegistered={newAgent => {
          setFleet(prev => [newAgent, ...prev]);
          setSelectedAgentId(newAgent.id);
          loadFleet();
        }}
      />

      {/* Edit Enumerator Profile Modal */}
      <EditEnumeratorModal
        isOpen={!!editingAgent}
        agent={editingAgent}
        onClose={() => setEditingAgent(null)}
        onUpdated={() => loadFleet()}
        onDeleted={agentId => {
          setFleet(prev => prev.filter(a => a.id !== agentId));
          if (selectedAgentId === agentId) setSelectedAgentId(null);
        }}
      />

      {/* Mobile Field Officer Portal Modal */}
      {portalAgent && (
        <EnumeratorFieldPortalModal
          isOpen={!!portalAgent}
          agent={portalAgent}
          onClose={() => setPortalAgent(null)}
          onSubmissionsUpdated={() => loadFleet()}
        />
      )}

      {/* Supervisor Field Dispatch & Instructions Modal */}
      <SupervisorDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => {
          setIsDispatchModalOpen(false);
          setDispatchTargetAgentId(null);
        }}
        fleet={fleet}
        selectedAgentId={dispatchTargetAgentId}
        onDispatched={() => loadFleet()}
      />

      {/* AI Field Supervisor Quality Audit Center Modal */}
      <FieldQualityAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditRecords={auditRecords}
        onUpdateRecords={updated => setAuditRecords(updated)}
        onFocusCoordinates={(lat, lng) => {
          setIsAuditModalOpen(false);
          const pos = projectToCanvas(lat, lng);
          setPanOffset({
            x: mapWidth / 2 - pos.x,
            y: mapHeight / 2 - pos.y
          });
          setZoomLevel(1.5);
        }}
      />

    </div>
  );
};

