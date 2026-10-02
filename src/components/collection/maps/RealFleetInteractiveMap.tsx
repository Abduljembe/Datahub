import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  EnumeratorAgent,
  GeofenceZone,
  FieldSubmissionPin
} from '../../../utils/enumeratorFleetEngine';
import { FieldAuditRecord } from '../../../utils/fieldQualityAuditEngine';
import {
  MapPin,
  Search,
  Navigation,
  Layers,
  Globe,
  Compass,
  Radio,
  Battery,
  BatteryCharging,
  Maximize2,
  Users,
  Sparkles,
  Phone,
  Mail,
  Smartphone,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sliders,
  RefreshCw
} from 'lucide-react';

interface RealFleetInteractiveMapProps {
  fleet: EnumeratorAgent[];
  geofences: GeofenceZone[];
  auditRecords?: FieldAuditRecord[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string | null) => void;
  onLaunchPortal?: (agent: EnumeratorAgent) => void;
  onOpenDispatch?: (agentId: string) => void;
  showBreadcrumbs?: boolean;
  showGeofences?: boolean;
  showSurveyPins?: boolean;
  showHeadingArrows?: boolean;
  height?: string;
  className?: string;
}

type MapLayerStyle = 'streets' | 'satellite' | 'dark' | 'light';

const TILE_CONFIG: Record<MapLayerStyle, { name: string; url: string; maxZoom: number; attribution: string }> = {
  streets: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  },
  satellite: {
    name: 'Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
  },
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '&copy; CARTO'
  },
  light: {
    name: 'Clean Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '&copy; CARTO'
  }
};

export const RealFleetInteractiveMap: React.FC<RealFleetInteractiveMapProps> = ({
  fleet,
  geofences,
  auditRecords = [],
  selectedAgentId,
  onSelectAgent,
  onLaunchPortal,
  onOpenDispatch,
  showBreadcrumbs = true,
  showGeofences = true,
  showSurveyPins = true,
  showHeadingArrows = true,
  height = '560px',
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups for dynamic rendering
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const breadcrumbsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const geofencesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const surveyPinsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayerStyle, setActiveLayerStyle] = useState<MapLayerStyle>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>('all');

  // Selected agent object
  const selectedAgent = useMemo(() => {
    return fleet.find(a => a.id === selectedAgentId) || null;
  }, [fleet, selectedAgentId]);

  // Initial Map Mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Calculate center based on fleet or fallback to default
    let centerLat = 37.7749;
    let centerLng = -122.4194;
    let initialZoom = 13;

    if (fleet.length > 0) {
      const avgLat = fleet.reduce((acc, a) => acc + a.lat, 0) / fleet.length;
      const avgLng = fleet.reduce((acc, a) => acc + a.lng, 0) / fleet.length;
      if (!isNaN(avgLat) && !isNaN(avgLng)) {
        centerLat = avgLat;
        centerLng = avgLng;
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    // Add base tile layer
    const conf = TILE_CONFIG[activeLayerStyle];
    const tileLayer = L.tileLayer(conf.url, {
      maxZoom: conf.maxZoom,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Initialize feature layer groups
    geofencesLayerGroupRef.current = L.layerGroup().addTo(map);
    breadcrumbsLayerGroupRef.current = L.layerGroup().addTo(map);
    surveyPinsLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Deselect agent when clicking empty map area
    map.on('click', (e: L.LeafletMouseEvent) => {
      // Check if target was a marker or the map canvas itself
      const target = (e.originalEvent as any).target;
      if (target && (target.classList?.contains('leaflet-container') || target.tagName === 'svg' || target.tagName === 'path')) {
        onSelectAgent(null);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Tile Layer Style
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const conf = TILE_CONFIG[activeLayerStyle];
    const newTileLayer = L.tileLayer(conf.url, {
      maxZoom: conf.maxZoom,
      subdomains: ['a', 'b', 'c']
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [activeLayerStyle]);

  // Render Geofences Layer
  useEffect(() => {
    if (!geofencesLayerGroupRef.current) return;
    geofencesLayerGroupRef.current.clearLayers();

    if (!showGeofences) return;

    geofences.forEach(zone => {
      const circle = L.circle([zone.centerLat, zone.centerLng], {
        radius: zone.radiusKm * 1000,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6, 6'
      });

      circle.bindTooltip(`
        <div style="font-family: inherit; font-size: 11px; font-weight: bold; color: ${zone.color};">
          ${zone.name} (${zone.radiusKm} km radius)
        </div>
      `, { permanent: false, direction: 'top', className: 'tactical-zone-tooltip' });

      geofencesLayerGroupRef.current?.addLayer(circle);
    });
  }, [geofences, showGeofences]);

  // Render Breadcrumb Trails Layer
  useEffect(() => {
    if (!breadcrumbsLayerGroupRef.current) return;
    breadcrumbsLayerGroupRef.current.clearLayers();

    if (!showBreadcrumbs) return;

    fleet.forEach(agent => {
      if (!agent.history || agent.history.length < 2) return;
      const isSelected = selectedAgentId === agent.id;

      const latLngs: [number, number][] = agent.history.map(pt => [pt.lat, pt.lng]);
      const trailColor =
        agent.status === 'collecting' ? '#10b981' :
        agent.status === 'transit' ? '#06b6d4' :
        agent.status === 'sos' ? '#f43f5e' :
        agent.status === 'idle' ? '#f59e0b' : '#64748b';

      const polyline = L.polyline(latLngs, {
        color: trailColor,
        weight: isSelected ? 3.5 : 2,
        opacity: isSelected ? 0.9 : 0.5,
        dashArray: '4, 4',
        lineCap: 'round'
      });

      breadcrumbsLayerGroupRef.current?.addLayer(polyline);

      // Add small dots for historical checkpoints
      agent.history.forEach((pt, idx) => {
        const dot = L.circleMarker([pt.lat, pt.lng], {
          radius: isSelected ? 3.5 : 2,
          fillColor: trailColor,
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.85
        });

        dot.bindTooltip(`
          <div style="font-family: inherit; font-size: 10px;">
            <strong>${agent.name}</strong><br/>
            ${pt.activity}<br/>
            <span style="color: #94a3b8;">${new Date(pt.timestamp).toLocaleTimeString()}</span>
          </div>
        `, { direction: 'top' });

        breadcrumbsLayerGroupRef.current?.addLayer(dot);
      });
    });
  }, [fleet, selectedAgentId, showBreadcrumbs]);

  // Render Survey Submission Hotspots Pins Layer
  useEffect(() => {
    if (!surveyPinsLayerGroupRef.current) return;
    surveyPinsLayerGroupRef.current.clearLayers();

    if (!showSurveyPins) return;

    fleet.forEach(agent => {
      agent.recentSubmissions?.forEach(sub => {
        const isAuditFlagged = auditRecords.some(r => r.submissionId === sub.id && r.status === 'flagged');

        const pinIcon = L.divIcon({
          className: 'custom-survey-pin',
          html: `
            <div style="
              width: 18px;
              height: 18px;
              background: ${isAuditFlagged ? '#f43f5e' : '#10b981'};
              border: 2px solid #ffffff;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              transform: rotate(45deg);
            ">
              <div style="
                width: 6px;
                height: 6px;
                background: #ffffff;
                border-radius: 1px;
              "></div>
            </div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        const marker = L.marker([sub.lat, sub.lng], { icon: pinIcon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; padding: 4px; min-width: 180px;">
            <div style="font-weight: bold; color: #0f172a; margin-bottom: 2px;">
              ${sub.title}
            </div>
            <div style="color: #64748b; font-size: 10px; margin-bottom: 4px;">
              Agent: ${agent.name} (${agent.badgeNumber || 'Field Agent'})
            </div>
            <div style="color: #94a3b8; font-size: 9px;">
              ${new Date(sub.timestamp).toLocaleString()}
            </div>
            ${isAuditFlagged ? '<div style="color: #e11d48; font-weight: bold; margin-top: 4px; font-size: 10px;">⚠️ AI Audit Anomaly Detected</div>' : '<div style="color: #059669; font-weight: bold; margin-top: 4px; font-size: 10px;">✓ Verified Field Record</div>'}
          </div>
        `);

        surveyPinsLayerGroupRef.current?.addLayer(marker);
      });
    });
  }, [fleet, auditRecords, showSurveyPins]);

  // Render Real Field Enumerator Markers Layer
  useEffect(() => {
    if (!markersLayerGroupRef.current) return;
    markersLayerGroupRef.current.clearLayers();

    const filteredFleet = fleet.filter(a => {
      if (activeFilterStatus === 'all') return true;
      return a.status === activeFilterStatus;
    });

    filteredFleet.forEach(agent => {
      const isSelected = selectedAgentId === agent.id;
      const statusColor =
        agent.status === 'collecting' ? '#10b981' :
        agent.status === 'transit' ? '#06b6d4' :
        agent.status === 'sos' ? '#f43f5e' :
        agent.status === 'idle' ? '#f59e0b' : '#64748b';

      const initials = agent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const battery = agent.batteryLevel ?? 80;
      const heading = agent.heading ?? 0;

      // Custom animated enumerator marker icon
      const markerHtml = `
        <div style="
          position: relative;
          width: ${isSelected ? '52px' : '44px'};
          height: ${isSelected ? '52px' : '44px'};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          cursor: pointer;
        ">
          <!-- Pulse Ring for Active / SOS agents -->
          ${agent.status === 'collecting' || agent.status === 'sos' ? `
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              background: ${agent.status === 'sos' ? 'rgba(244,63,94,0.35)' : 'rgba(16,185,129,0.3)'};
              border-radius: 50%;
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          ` : ''}

          <!-- Heading Orientation Arrow -->
          ${showHeadingArrows && agent.heading !== undefined ? `
            <div style="
              position: absolute;
              top: -6px;
              width: 0;
              height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-bottom: 9px solid ${statusColor};
              transform: rotate(${heading}deg);
              transform-origin: 50% 28px;
            "></div>
          ` : ''}

          <!-- Main Core Pin Badge -->
          <div style="
            width: ${isSelected ? '40px' : '34px'};
            height: ${isSelected ? '40px' : '34px'};
            background: #0f172a;
            border: 2.5px solid ${isSelected ? '#ffffff' : statusColor};
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? '12px' : '11px'};
            font-weight: 800;
            color: #ffffff;
            z-index: 2;
          ">
            ${initials}
          </div>

          <!-- Battery Pill Tag -->
          <div style="
            position: absolute;
            bottom: -6px;
            background: #020617;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 0 4px;
            font-size: 8px;
            font-family: monospace;
            font-weight: bold;
            color: ${battery < 20 ? '#f43f5e' : battery < 50 ? '#f59e0b' : '#34d399'};
            box-shadow: 0 2px 4px rgba(0,0,0,0.5);
            z-index: 3;
            white-space: nowrap;
          ">
            ${battery}%
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-enumerator-live-pin',
        html: markerHtml,
        iconSize: [isSelected ? 52 : 44, isSelected ? 52 : 44],
        iconAnchor: [isSelected ? 26 : 22, isSelected ? 26 : 22]
      });

      const marker = L.marker([agent.lat, agent.lng], { icon: customIcon });

      // Click on marker
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectAgent(agent.id);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([agent.lat, agent.lng], Math.max(mapInstanceRef.current.getZoom(), 14), {
            duration: 1.0
          });
        }
      });

      // Tooltip on hover
      marker.bindTooltip(`
        <div style="font-family: inherit; font-size: 11px; padding: 2px;">
          <div style="font-weight: bold; color: #ffffff;">${agent.name}</div>
          <div style="font-size: 10px; color: ${statusColor}; font-weight: 600;">
            ${agent.status.toUpperCase()} &bull; ${agent.speed ?? 0} km/h
          </div>
          <div style="font-size: 9px; color: #94a3b8;">${agent.assignedZone}</div>
        </div>
      `, { direction: 'top', className: 'tactical-marker-tooltip' });

      markersLayerGroupRef.current?.addLayer(marker);
    });
  }, [fleet, selectedAgentId, activeFilterStatus, showHeadingArrows]);

  // Center or Fly to Selected Agent
  const handleCenterOnAgent = (agent: EnumeratorAgent) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([agent.lat, agent.lng], 15, { duration: 1.2 });
    }
    onSelectAgent(agent.id);
  };

  // Fit All Fleet Bounds
  const handleFitFleetBounds = () => {
    if (!mapInstanceRef.current || fleet.length === 0) return;

    const bounds = L.latLngBounds(fleet.map(a => [a.lat, a.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  };

  // Real Search Global Address / City
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchFeedback('Locating real place on globe...');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 13, { duration: 1.5 });
          }
          setSearchFeedback(`Jumped to: ${data[0].display_name.split(',')[0]}`);
          setTimeout(() => setSearchFeedback(null), 4000);
        } else {
          setSearchFeedback('Location not found. Try adding country/city.');
        }
      }
    } catch {
      setSearchFeedback('Search failed (offline mode active).');
    } finally {
      setIsSearching(false);
    }
  };

  // Locate Supervisor / Browser GPS
  const handleLocateSupervisor = () => {
    if (!('geolocation' in navigator)) {
      setSearchFeedback('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setSearchFeedback('Acquiring your browser GPS...');

    navigator.geolocation.getCurrentPosition(
      pos => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
        }
        setSearchFeedback('Centered on your real device location.');
        setTimeout(() => setSearchFeedback(null), 4000);
      },
      err => {
        setIsLocating(false);
        setSearchFeedback(`GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      
      {/* Top Map Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
        
        {/* Real Address Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchLocation()}
            placeholder="Search real city, road, or territory to focus map..."
            className="w-full pl-9 pr-18 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => handleSearchLocation()}
            disabled={isSearching}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition-all disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
          </button>
        </div>

        {/* Action Controls & Tile Selector */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase hidden lg:inline">Filter:</span>
            <select
              value={activeFilterStatus}
              onChange={e => setActiveFilterStatus(e.target.value)}
              className="px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold"
            >
              <option value="all">All Agents ({fleet.length})</option>
              <option value="collecting">Active Collecting ({fleet.filter(a => a.status === 'collecting').length})</option>
              <option value="transit">In Transit ({fleet.filter(a => a.status === 'transit').length})</option>
              <option value="idle">Idle / Break ({fleet.filter(a => a.status === 'idle').length})</option>
              <option value="sos">SOS Alerts ({fleet.filter(a => a.status === 'sos').length})</option>
            </select>
          </div>

          {/* Fit All Fleet */}
          <button
            type="button"
            onClick={handleFitFleetBounds}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
            title="Auto-fit camera to enclose entire field fleet"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Fit All</span>
          </button>

          {/* Locate Me */}
          <button
            type="button"
            onClick={handleLocateSupervisor}
            disabled={isLocating}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-colors"
            title="Center on my device GPS"
          >
            <Navigation className={`w-3.5 h-3.5 text-cyan-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">My GPS</span>
          </button>

          {/* Map Layer Mode Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            {(['streets', 'satellite', 'dark', 'light'] as MapLayerStyle[]).map(style => (
              <button
                key={style}
                type="button"
                onClick={() => setActiveLayerStyle(style)}
                className={`px-2 py-0.8 rounded-lg text-[10px] font-bold capitalize transition-all ${
                  activeLayerStyle === style
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {style === 'streets' ? 'Street' : style === 'satellite' ? 'Satellite' : style === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Search Feedback Message */}
      {searchFeedback && (
        <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>{searchFeedback}</span>
        </div>
      )}

      {/* Real Map Stage */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
        
        {/* Leaflet DOM Node */}
        <div
          ref={mapContainerRef}
          style={{ height, width: '100%' }}
          className="z-0 select-none"
        />

        {/* Floating Map Zoom & Reset Controls */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition-colors text-base font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition-colors text-base font-bold"
            title="Zoom Out"
          >
            -
          </button>
          <button
            type="button"
            onClick={handleFitFleetBounds}
            className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-indigo-400 flex items-center justify-center hover:bg-slate-800 transition-colors text-xs"
            title="Reset to Fleet Center"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Floating Live Telemetry Strip */}
        <div className="absolute left-4 bottom-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-xs text-slate-300 flex items-center gap-3 shadow-xl pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">Live Real-World GPS Map</span>
            </div>
            <span className="text-slate-500 font-mono">|</span>
            <span className="text-slate-400">{fleet.length} Enumerators Synced</span>
          </div>

          {/* Active Legend */}
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300 shadow-xl pointer-events-auto">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Collecting</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> In Transit</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Idle</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> SOS / Flag</span>
          </div>

        </div>

        {/* Selected Enumerator Floating Dossier Card */}
        {selectedAgent && (
          <div className="absolute left-4 top-4 z-20 w-80 max-w-[calc(100%-2rem)] rounded-3xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl p-4 space-y-3 text-white animate-in slide-in-from-left-4">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                  selectedAgent.status === 'collecting' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  selectedAgent.status === 'transit' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                  selectedAgent.status === 'sos' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {selectedAgent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-bold truncate">{selectedAgent.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span>{selectedAgent.badgeNumber || 'FIELD-AGENT'}</span>
                    <span>&bull;</span>
                    <span className="uppercase text-indigo-300 font-bold">{selectedAgent.status}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectAgent(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[9px] text-slate-500">SPEED</div>
                <div className="text-xs font-bold text-cyan-400">{selectedAgent.speed ?? 0} km/h</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[9px] text-slate-500">BATTERY</div>
                <div className="text-xs font-bold text-emerald-400">{selectedAgent.batteryLevel ?? 85}%</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[9px] text-slate-500">SURVEYS</div>
                <div className="text-xs font-bold text-indigo-400">{selectedAgent.surveysCollectedToday ?? 0}</div>
              </div>
            </div>

            {/* Address & Zone */}
            <div className="text-xs space-y-1 text-slate-300">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{selectedAgent.assignedZone}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono bg-slate-950 p-2 rounded-xl border border-slate-800 truncate">
                LAT: {selectedAgent.lat.toFixed(6)}, LNG: {selectedAgent.lng.toFixed(6)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onLaunchPortal && (
                <button
                  type="button"
                  onClick={() => onLaunchPortal(selectedAgent)}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Field Portal</span>
                </button>
              )}
              {onOpenDispatch && (
                <button
                  type="button"
                  onClick={() => onOpenDispatch(selectedAgent.id)}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dispatch</span>
                </button>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
