// Live Field Tactical Radar & GPS Breadcrumb Trail Map Component
import React, { useState, useMemo } from 'react';
import {
  Compass,
  Radio,
  MapPin,
  Layers,
  Battery,
  Zap,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { EnumeratorAgent, GeofenceZone, DEFAULT_GEOFENCES } from '../../../utils/enumeratorFleetEngine';
import { SupervisorSubmission } from '../../../utils/supervisorEngine';
import {
  generateFleetTacticalTracks,
  calculateTacticalBounds,
  EnumeratorTacticalTrack,
  GpsBreadcrumbPoint
} from '../../../utils/supervisorTacticalRadarEngine';

interface SupervisorTacticalRadarTabProps {
  fleet: EnumeratorAgent[];
  submissions: SupervisorSubmission[];
  onInspectSubmission?: (sub: SupervisorSubmission) => void;
}

export const SupervisorTacticalRadarTab: React.FC<SupervisorTacticalRadarTabProps> = ({
  fleet,
  submissions,
  onInspectSubmission
}) => {
  const { isDark } = useTheme();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(fleet[0]?.id || null);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showSubmissionPins, setShowSubmissionPins] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedWaypoint, setSelectedWaypoint] = useState<GpsBreadcrumbPoint | null>(null);

  // Compute tracks & radar bounds
  const tracks = useMemo(() => generateFleetTacticalTracks(fleet, submissions), [fleet, submissions]);
  const bounds = useMemo(() => calculateTacticalBounds(tracks, DEFAULT_GEOFENCES), [tracks]);

  // Selected agent track
  const activeTrack = tracks.find(t => t.enumeratorId === selectedAgentId) || tracks[0];

  // Helper to map lat/lng to SVG 1000x700 canvas
  const canvasW = 900;
  const canvasH = 560;
  const padding = 50;

  const projectCoords = (lat: number, lng: number) => {
    const latSpan = bounds.maxLat - bounds.minLat || 0.01;
    const lngSpan = bounds.maxLng - bounds.minLng || 0.01;

    // Invert lat because SVG y increases downwards
    const x = padding + ((lng - bounds.minLng) / lngSpan) * (canvasW - padding * 2);
    const y = padding + ((bounds.maxLat - lat) / latSpan) * (canvasH - padding * 2);

    return { x, y };
  };

  return (
    <div className="space-y-6">
      
      {/* Tactical Radar Top Bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      } shadow-md`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>Live Field Tactical Radar</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE GPS TELEMETRY
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Tracking {fleet.length} active field enumerators, {submissions.length} submission coordinates, and breadcrumb route vectors.
            </p>
          </div>
        </div>

        {/* Radar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showBreadcrumbs
                ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Trails: {showBreadcrumbs ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showGeofences
                ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Geofences: {showGeofences ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowSubmissionPins(!showSubmissionPins)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showSubmissionPins
                ? 'bg-purple-600/30 border-purple-500/40 text-purple-300'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Survey Pins</span>
          </button>

          <div className="flex items-center gap-1 border rounded-xl px-1.5 py-1 bg-slate-950/60 border-slate-800">
            <button
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.2))}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Canvas + Telemetry Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Radar Viewport (2 cols on lg) */}
        <div className={`lg:col-span-2 rounded-2xl border p-4 overflow-hidden relative ${
          isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-900 border-slate-800 text-white'
        } shadow-xl flex flex-col items-center justify-center min-h-[500px]`}>
          
          {/* Radar HUD Overlay */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>SECTOR RADAR: ACTIVE (WGS-84 GRID)</span>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] font-mono text-slate-300">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span>Flagged</span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="w-full overflow-auto flex items-center justify-center">
            <svg
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              className="w-full max-h-[520px] transition-transform duration-300 select-none"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <defs>
                {/* Tactical grid background */}
                <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(79, 70, 229, 0.12)" strokeWidth="1" />
                </pattern>
                
                {/* Concentric radar rings glow */}
                <radialGradient id="radarCenterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.15)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                </radialGradient>
              </defs>

              {/* Background */}
              <rect width={canvasW} height={canvasH} fill="#050814" />
              <rect width={canvasW} height={canvasH} fill="url(#radarGrid)" />

              {/* Concentric Sweep Circles */}
              <circle cx={canvasW / 2} cy={canvasH / 2} r="140" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx={canvasW / 2} cy={canvasH / 2} r="240" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" strokeDasharray="6 6" />
              <circle cx={canvasW / 2} cy={canvasH / 2} r="340" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="1" />

              {/* Crosshair Axes */}
              <line x1={0} y1={canvasH / 2} x2={canvasW} y2={canvasH / 2} stroke="rgba(79, 70, 229, 0.2)" strokeWidth="1" />
              <line x1={canvasW / 2} y1={0} x2={canvasW / 2} y2={canvasH} stroke="rgba(79, 70, 229, 0.2)" strokeWidth="1" />

              {/* Geofence Perimeter Rings */}
              {showGeofences && DEFAULT_GEOFENCES.map((zone, zIdx) => {
                const zCenter = projectCoords(zone.centerLat, zone.centerLng);
                const rPixels = Math.max(50, (zone.radiusKm / 3) * 120);

                return (
                  <g key={zone.id}>
                    <circle
                      cx={zCenter.x}
                      cy={zCenter.y}
                      r={rPixels}
                      fill="rgba(99, 102, 241, 0.08)"
                      stroke="rgba(99, 102, 241, 0.5)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                    <text
                      x={zCenter.x}
                      y={zCenter.y - rPixels - 6}
                      textAnchor="middle"
                      fill="#818cf8"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {zone.name} ({zone.radiusKm} km)
                    </text>
                  </g>
                );
              })}

              {/* Breadcrumb Trails */}
              {showBreadcrumbs && tracks.map(track => {
                const isSelected = track.enumeratorId === selectedAgentId;
                if (!isSelected && selectedAgentId) return null; // Dim or hide others if one selected

                const points = track.breadcrumbs.map(b => projectCoords(b.lat, b.lng));
                const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

                return (
                  <g key={`trail_${track.enumeratorId}`}>
                    {/* Path line */}
                    <polyline
                      points={polylineStr}
                      fill="none"
                      stroke={isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      strokeDasharray={isSelected ? 'none' : '3 3'}
                    />

                    {/* Historical Waypoints */}
                    {track.breadcrumbs.map((b, bIdx) => {
                      const bp = projectCoords(b.lat, b.lng);
                      return (
                        <circle
                          key={b.id}
                          cx={bp.x}
                          cy={bp.y}
                          r={bIdx === track.breadcrumbs.length - 1 ? 5 : 3.5}
                          fill={b.eventType === 'survey_submitted' ? '#a855f7' : '#38bdf8'}
                          stroke="#050814"
                          strokeWidth="1.5"
                          className="cursor-pointer hover:r-6 transition-all"
                          onClick={() => setSelectedWaypoint(b)}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Submission Pins */}
              {showSubmissionPins && submissions.map(sub => {
                const sp = projectCoords(sub.gps.lat, sub.gps.lng);
                const isApproved = sub.stage === 'supervisor_approved' || sub.stage === 'ingested';
                const isFlagged = (sub.flags && sub.flags.length > 0) || sub.qualityScore < 70;

                const pinColor = isFlagged ? '#f43f5e' : isApproved ? '#10b981' : '#f59e0b';

                return (
                  <g
                    key={sub.id}
                    className="cursor-pointer transition-transform hover:scale-125"
                    onClick={() => onInspectSubmission && onInspectSubmission(sub)}
                  >
                    <circle cx={sp.x} cy={sp.y} r="4.5" fill={pinColor} stroke="#ffffff" strokeWidth="1" />
                  </g>
                );
              })}

              {/* Active Enumerator Live Beacon Markers */}
              {tracks.map(track => {
                const cp = projectCoords(track.currentLat, track.currentLng);
                const isSelected = track.enumeratorId === selectedAgentId;

                return (
                  <g
                    key={`agent_${track.enumeratorId}`}
                    className="cursor-pointer"
                    onClick={() => setSelectedAgentId(track.enumeratorId)}
                  >
                    {/* Pulsing ring */}
                    <circle
                      cx={cp.x}
                      cy={cp.y}
                      r={isSelected ? 16 : 10}
                      fill="none"
                      stroke={isSelected ? '#34d399' : '#818cf8'}
                      strokeWidth="1.5"
                      opacity="0.7"
                    />

                    {/* Inner beacon dot */}
                    <circle
                      cx={cp.x}
                      cy={cp.y}
                      r={isSelected ? 6 : 4.5}
                      fill={track.isInsideZone ? '#10b981' : '#f43f5e'}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />

                    {/* Agent Name Tag */}
                    <rect
                      x={cp.x - 45}
                      y={cp.y + 10}
                      width="90"
                      height="16"
                      rx="4"
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={isSelected ? '#34d399' : '#334155'}
                      strokeWidth="1"
                    />
                    <text
                      x={cp.x}
                      y={cp.y + 22}
                      textAnchor="middle"
                      fill={isSelected ? '#34d399' : '#f1f5f9'}
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {track.enumeratorName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom GPS Coordinates Bar */}
          <div className="w-full mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div>BOUNDS: [{bounds.minLat.toFixed(4)}, {bounds.minLng.toFixed(4)}] to [{bounds.maxLat.toFixed(4)}, {bounds.maxLng.toFixed(4)}]</div>
            <div>RADAR CENTER: ({bounds.centerLat.toFixed(4)}°, {bounds.centerLng.toFixed(4)}°)</div>
          </div>
        </div>

        {/* Right: Selected Agent Telemetry & Breadcrumb Inspector */}
        <div className={`p-5 rounded-2xl border space-y-5 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-md`}>
          
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Telemetry & Waypoint Dossier</span>
            </h4>
            <span className="text-xs font-mono text-slate-400">
              Agent #{activeTrack?.enumeratorId}
            </span>
          </div>

          {/* Agent Selector Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Select Field Agent to Track</label>
            <select
              value={selectedAgentId || ''}
              onChange={e => setSelectedAgentId(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              {fleet.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} — {agent.role} ({agent.assignedZone})
                </option>
              ))}
            </select>
          </div>

          {activeTrack && (
            <div className="space-y-4">
              
              {/* Agent Status Card */}
              <div className={`p-3.5 rounded-xl border ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              } space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{activeTrack.enumeratorName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTrack.isInsideZone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {activeTrack.isInsideZone ? 'GEOFENCE COMPLIANT' : 'OUT OF ZONE BREACH'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Current GPS:</span>
                    <p className="font-mono font-bold text-indigo-400">
                      {activeTrack.currentLat.toFixed(5)}°, {activeTrack.currentLng.toFixed(5)}°
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Est. Distance Walked:</span>
                    <p className="font-mono font-bold text-emerald-400">
                      {activeTrack.totalDistanceWalkedKm} km
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Device Battery:</span>
                    <p className="font-mono font-bold flex items-center gap-1 text-slate-200">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{activeTrack.batteryLevel}%</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">GPS Accuracy:</span>
                    <p className="font-mono font-bold text-blue-400">
                      ±{activeTrack.accuracy}m (RTK Lock)
                    </p>
                  </div>
                </div>
              </div>

              {/* Waypoints & Breadcrumb List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Today's Breadcrumb Waypoints
                  </label>
                  <span className="text-[10px] font-mono text-indigo-400">
                    {activeTrack.breadcrumbs.length} recorded
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {activeTrack.breadcrumbs.map((bc, idx) => (
                    <div
                      key={bc.id}
                      onClick={() => setSelectedWaypoint(bc)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedWaypoint?.id === bc.id
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                          : isDark ? 'bg-slate-950/40 hover:bg-slate-950 border-slate-800' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{bc.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(bc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                        <span>({bc.lat.toFixed(4)}, {bc.lng.toFixed(4)})</span>
                        <span className="text-emerald-400">Speed: {bc.speedKmh} km/h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
