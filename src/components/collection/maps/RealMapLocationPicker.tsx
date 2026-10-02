import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  Navigation,
  Layers,
  Globe,
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sliders
} from 'lucide-react';

// Fix standard Leaflet default marker icon path issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface RealMapLocationPickerProps {
  initialLat: number;
  initialLng: number;
  assignedZoneName?: string;
  radiusKm?: number;
  onLocationSelect: (lat: number, lng: number, address?: string, countryCity?: string) => void;
  height?: string;
  className?: string;
}

type TileLayerType = 'streets' | 'satellite' | 'dark' | 'light';

const TILE_SERVERS: Record<TileLayerType, { name: string; url: string; attribution: string; maxZoom: number }> = {
  streets: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  },
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20
  },
  light: {
    name: 'Clean Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20
  }
};

const GLOBAL_PRESET_HUBS = [
  { name: 'Nairobi, Kenya', lat: -1.286389, lng: 36.817223 },
  { name: 'Dar es Salaam, Tanzania', lat: -6.792354, lng: 39.208328 },
  { name: 'Lagos, Nigeria', lat: 6.524379, lng: 3.379206 },
  { name: 'Johannesburg, South Africa', lat: -26.204103, lng: 28.047305 },
  { name: 'San Francisco, USA', lat: 37.774929, lng: -122.419416 },
  { name: 'New York, USA', lat: 40.712776, lng: -74.005974 },
  { name: 'London, UK', lat: 51.507351, lng: -0.127758 },
  { name: 'Tokyo, Japan', lat: 35.676192, lng: 139.650311 },
  { name: 'Mumbai, India', lat: 19.075984, lng: 72.877656 }
];

export const RealMapLocationPicker: React.FC<RealMapLocationPickerProps> = ({
  initialLat,
  initialLng,
  assignedZoneName = 'Assigned Field Zone',
  radiusKm = 2.5,
  onLocationSelect,
  height = '320px',
  className = ''
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  const [currentLat, setCurrentLat] = useState<number>(initialLat || 37.7749);
  const [currentLng, setCurrentLng] = useState<number>(initialLng || -122.4194);
  const [activeLayer, setActiveLayer] = useState<TileLayerType>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const lat = initialLat || 37.7749;
    const lng = initialLng || -122.4194;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // Custom tactical marker icon
    const customIcon = L.divIcon({
      className: 'custom-enumerator-pin',
      html: `
        <div style="
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            position: absolute;
            width: 38px;
            height: 38px;
            background: rgba(99, 102, 241, 0.25);
            border-radius: 50%;
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #4f46e5, #06b6d4);
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    // Add Tile Layer
    const tileConf = TILE_SERVERS[activeLayer];
    const tileLayer = L.tileLayer(tileConf.url, {
      maxZoom: tileConf.maxZoom,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);
    activeTileLayerRef.current = tileLayer;

    // Add Draggable Marker
    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: true
    }).addTo(map);
    markerRef.current = marker;

    // Add Geofence Radius Circle
    const circle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: '#6366f1',
      fillColor: '#6366f1',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '5, 5'
    }).addTo(map);
    circleRef.current = circle;

    // Marker drag end event
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updateSelectedPosition(pos.lat, pos.lng, true);
    });

    // Map click event
    map.on('click', (e: L.LeafletMouseEvent) => {
      updateSelectedPosition(e.latlng.lat, e.latlng.lng, true);
    });

    mapInstanceRef.current = map;

    // Initial reverse geocode
    reverseGeocode(lat, lng);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (activeTileLayerRef.current) {
      mapInstanceRef.current.removeLayer(activeTileLayerRef.current);
    }
    const tileConf = TILE_SERVERS[activeLayer];
    const newTileLayer = L.tileLayer(tileConf.url, {
      maxZoom: tileConf.maxZoom,
      subdomains: ['a', 'b', 'c']
    }).addTo(mapInstanceRef.current);
    activeTileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Update Circle Radius
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radiusKm * 1000);
    }
  }, [radiusKm]);

  // Update selected position helper
  const updateSelectedPosition = (lat: number, lng: number, shouldReverse = true) => {
    setCurrentLat(lat);
    setCurrentLng(lng);

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
    }

    if (shouldReverse) {
      reverseGeocode(lat, lng);
    } else {
      onLocationSelect(lat, lng, resolvedAddress);
    }
  };

  // Reverse Geocoding using OpenStreetMap Nominatim API
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setLocationStatus('Resolving real address...');
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        const display = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const cityOrCountry = data.address?.city || data.address?.town || data.address?.county || data.address?.country || '';
        setResolvedAddress(display);
        setLocationStatus(null);
        onLocationSelect(lat, lng, display, cityOrCountry);
        return;
      }
    } catch {
      // Offline fallback
    }
    setLocationStatus(null);
    onLocationSelect(lat, lng);
  };

  // Search Address / Place using OpenStreetMap Nominatim API
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowSearchResults(true);
    setLocationStatus('Searching real map locations...');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          setLocationStatus('No locations found for this query.');
        } else {
          setLocationStatus(null);
        }
      }
    } catch {
      setLocationStatus('Could not complete search (offline mode active).');
    } finally {
      setIsSearching(false);
    }
  };

  // Select Search Result
  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
    }

    updateSelectedPosition(lat, lng, false);
    setResolvedAddress(result.display_name);
    setShowSearchResults(false);
    setSearchQuery('');
    onLocationSelect(lat, lng, result.display_name);
  };

  // Quick Preset Jump
  const handleJumpToPreset = (hub: { name: string; lat: number; lng: number }) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([hub.lat, hub.lng], 13, { duration: 1.2 });
    }
    updateSelectedPosition(hub.lat, hub.lng, true);
  };

  // Acquire Real GPS
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingUser(true);
    setLocationStatus('Acquiring real GPS satellite fix...');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setIsLocatingUser(false);
        setLocationStatus(`GPS acquired (${pos.coords.accuracy ? Math.round(pos.coords.accuracy) + 'm accuracy' : 'High Precision'})`);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
        }
        updateSelectedPosition(lat, lng, true);

        setTimeout(() => setLocationStatus(null), 4000);
      },
      err => {
        setIsLocatingUser(false);
        setLocationStatus(`GPS acquisition error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      
      {/* Top Search & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        
        {/* Real Address Search Box */}
        <div className="relative flex-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (!showSearchResults && e.target.value.length > 2) setShowSearchResults(true);
              }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search real address, street, district, or city worldwide..."
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
            />
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold text-white transition-all disabled:opacity-50 flex items-center gap-1"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Search</span>}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800 max-h-48 overflow-y-auto animate-in fade-in">
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:bg-indigo-600/20 hover:text-white flex items-start gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-2 leading-relaxed">{res.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons: Locate Me & Tile Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocatingUser}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all"
            title="Use current real browser GPS location"
          >
            <Navigation className={`w-3.5 h-3.5 text-emerald-400 ${isLocatingUser ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Use My Real GPS</span>
          </button>

          {/* Tile Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5">
            {(['streets', 'satellite', 'dark'] as TileLayerType[]).map(layer => (
              <button
                key={layer}
                type="button"
                onClick={() => setActiveLayer(layer)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                  activeLayer === layer
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {layer === 'streets' ? 'Streets' : layer === 'satellite' ? 'Satellite' : 'Tactical'}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* Global Presets Pill Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
        <span className="text-slate-500 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Globe className="w-3 h-3 text-indigo-400" />
          <span>Quick Hubs:</span>
        </span>
        {GLOBAL_PRESET_HUBS.map(hub => (
          <button
            key={hub.name}
            type="button"
            onClick={() => handleJumpToPreset(hub)}
            className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 shrink-0 transition-colors"
          >
            {hub.name.split(',')[0]}
          </button>
        ))}
      </div>

      {/* Real Map Stage Container */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
        
        {/* Leaflet Stage */}
        <div
          ref={mapContainerRef}
          style={{ height, width: '100%' }}
          className="z-0 relative select-none"
        />

        {/* Floating Zoom & Center Overlay */}
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 shadow-lg">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-7 h-7 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition-colors text-sm font-bold"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-7 h-7 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition-colors text-sm font-bold"
            title="Zoom Out"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([currentLat, currentLng], 14);
              }
            }}
            className="w-7 h-7 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-cyan-300 flex items-center justify-center hover:bg-slate-800 transition-colors text-xs"
            title="Center Pin"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Map Drag / Click Guidance Banner */}
        <div className="absolute left-3 bottom-3 z-10 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2 shadow-lg">
          <MapPin className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
          <span>Click map or drag the pin to set precise field station</span>
        </div>

      </div>

      {/* Location Status Message */}
      {locationStatus && (
        <div className="text-[11px] text-cyan-300 flex items-center gap-1.5 animate-in fade-in">
          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
          <span>{locationStatus}</span>
        </div>
      )}

      {/* Selected Coordinates & Address Readout Bar */}
      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Station Address:</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {assignedZoneName}
            </span>
          </div>
          <p className="text-slate-200 font-medium truncate text-xs">
            {resolvedAddress || `${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
          <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1">LAT:</span>
            <span className="text-emerald-400 font-bold">{currentLat.toFixed(6)}</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500 mr-1">LNG:</span>
            <span className="text-cyan-400 font-bold">{currentLng.toFixed(6)}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
