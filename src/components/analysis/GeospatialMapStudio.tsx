import React, { useState, useMemo, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Layers,
  Compass,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  Radio,
  RefreshCw,
  Navigation,
  Globe,
  Flame,
  Search,
  CheckCircle2,
  Table,
  Eye,
  SlidersHorizontal,
  Route,
  Zap,
  Tag,
  Crosshair,
  Share2,
  FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dataset, ColumnMeta } from '../../types';
import { parseNumber } from '../../utils/statistics';
import { exportToCSV } from '../../utils/dataEngine';
import { createDatasetSnapshot } from '../../utils/versionEngine';

interface GeospatialMapStudioProps {
  dataset: Dataset;
  onCreateDataset?: (newDataset: Dataset) => void;
  onUpdateDataset?: (updated: Dataset) => void;
  isDark?: boolean;
}

interface GeoPoint {
  id: string | number;
  rowIndex: number;
  lat: number;
  lng: number;
  metricVal?: number | null;
  categoryVal?: string;
  originalRow: Record<string, any>;
}

type TileStyle = 'streets' | 'satellite' | 'dark' | 'light';

const BASEMAP_TILES: Record<TileStyle, { name: string; url: string; maxZoom: number; attribution: string }> = {
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
    attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics'
  },
  dark: {
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '&copy; CARTO'
  },
  light: {
    name: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '&copy; CARTO'
  }
};

export const GeospatialMapStudio: React.FC<GeospatialMapStudioProps> = ({
  dataset,
  onCreateDataset,
  onUpdateDataset,
  isDark = true,
}) => {
  // Map Container & Instance References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.Polygon | null>(null);

  // Candidate coordinate columns
  const latColCandidates = useMemo(() => {
    return dataset.columns.filter(c => 
      /^(lat|latitude|lat_deg|y|gps_lat|coord_y|start_lat|location_lat)$/i.test(c.name) ||
      (c.type === 'number' && dataset.data.some(r => {
        const v = parseNumber(r[c.name]);
        return v !== null && v >= -90 && v <= 90;
      }))
    ).map(c => c.name);
  }, [dataset]);

  const lngColCandidates = useMemo(() => {
    return dataset.columns.filter(c => 
      /^(lng|lon|longitude|long|x|gps_lon|gps_lng|coord_x|start_lng|location_lng)$/i.test(c.name) ||
      (c.type === 'number' && dataset.data.some(r => {
        const v = parseNumber(r[c.name]);
        return v !== null && v >= -180 && v <= 180;
      }))
    ).map(c => c.name);
  }, [dataset]);

  const numericCols = useMemo(() => dataset.columns.filter(c => c.type === 'number').map(c => c.name), [dataset]);
  const categoryCols = useMemo(() => dataset.columns.filter(c => c.type === 'string').map(c => c.name), [dataset]);

  // Selected state
  const [selectedLatCol, setSelectedLatCol] = useState<string>(() => latColCandidates[0] || '');
  const [selectedLngCol, setSelectedLngCol] = useState<string>(() => lngColCandidates[0] || '');
  const [colorByMetric, setColorByMetric] = useState<string>(() => numericCols.find(c => !latColCandidates.includes(c) && !lngColCandidates.includes(c)) || '');
  const [colorByCategory, setColorByCategory] = useState<string>(() => categoryCols[0] || '');
  const [colorMode, setColorMode] = useState<'metric' | 'category' | 'single'>('metric');
  const [activeTileStyle, setActiveTileStyle] = useState<TileStyle>('dark');

  // Layer visual toggles
  const [showRouteTrail, setShowRouteTrail] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showConvexHull, setShowConvexHull] = useState<boolean>(false);
  const [pointRadius, setPointRadius] = useState<number>(7);
  const [markerOpacity, setMarkerOpacity] = useState<number>(0.85);

  // Filter & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [metricMinThreshold, setMetricMinThreshold] = useState<number | ''>('');
  const [metricMaxThreshold, setMetricMaxThreshold] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected marker inspector & active feedback
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Extract valid GPS Points
  const allGeoPoints: GeoPoint[] = useMemo(() => {
    if (!selectedLatCol || !selectedLngCol) return [];

    const pts: GeoPoint[] = [];
    for (let i = 0; i < dataset.data.length; i++) {
      const row = dataset.data[i];
      const lat = parseNumber(row[selectedLatCol]);
      const lng = parseNumber(row[selectedLngCol]);

      if (lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const metricVal = colorByMetric ? parseNumber(row[colorByMetric]) : null;
        const categoryVal = colorByCategory ? String(row[colorByCategory] ?? '') : undefined;

        pts.push({
          id: `pt_${i}`,
          rowIndex: i,
          lat,
          lng,
          metricVal,
          categoryVal,
          originalRow: row,
        });
      }
    }
    return pts;
  }, [dataset, selectedLatCol, selectedLngCol, colorByMetric, colorByCategory]);

  // Metric Range for color scaling
  const metricRange = useMemo(() => {
    const vals = allGeoPoints.map(p => p.metricVal).filter((v): v is number => v !== null && v !== undefined);
    if (vals.length === 0) return { min: 0, max: 100 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [allGeoPoints]);

  // Category unique palette
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(allGeoPoints.map(p => p.categoryVal).filter(Boolean))) as string[];
  }, [allGeoPoints]);

  const categoryColorMap = useMemo(() => {
    const palette = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#3b82f6'];
    const map: Record<string, string> = {};
    uniqueCategories.forEach((cat, i) => {
      map[cat] = palette[i % palette.length];
    });
    return map;
  }, [uniqueCategories]);

  // Filtered Points
  const filteredGeoPoints: GeoPoint[] = useMemo(() => {
    return allGeoPoints.filter(p => {
      // Category filter
      if (categoryFilter !== 'all' && p.categoryVal !== categoryFilter) {
        return false;
      }
      // Min Metric
      if (metricMinThreshold !== '' && p.metricVal !== null && p.metricVal !== undefined && p.metricVal < metricMinThreshold) {
        return false;
      }
      // Max Metric
      if (metricMaxThreshold !== '' && p.metricVal !== null && p.metricVal !== undefined && p.metricVal > metricMaxThreshold) {
        return false;
      }
      // Search query across row values
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = Object.values(p.originalRow).some(val => String(val).toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [allGeoPoints, categoryFilter, metricMinThreshold, metricMaxThreshold, searchQuery]);

  // Get color for marker
  const getPointColor = (pt: GeoPoint) => {
    if (colorMode === 'category' && pt.categoryVal) {
      return categoryColorMap[pt.categoryVal] || '#6366f1';
    }
    if (colorMode === 'metric' && pt.metricVal !== null && pt.metricVal !== undefined) {
      const span = metricRange.max - metricRange.min || 1;
      const ratio = Math.max(0, Math.min(1, (pt.metricVal - metricRange.min) / span));
      if (ratio < 0.33) return '#06b6d4'; // Cyan
      if (ratio < 0.66) return '#f59e0b'; // Amber
      return '#f43f5e'; // Rose
    }
    return '#6366f1';
  };

  // Compute Convex Hull (Bounding Polygon)
  const convexHullPoints = useMemo(() => {
    if (filteredGeoPoints.length < 3) return [];
    
    // Monotone chain algorithm for 2D convex hull
    const pts = filteredGeoPoints.map(p => ({ x: p.lng, y: p.lat }));
    pts.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

    const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    };

    const lower: { x: number; y: number }[] = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: { x: number; y: number }[] = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }

    upper.pop();
    lower.pop();
    return lower.concat(upper).map(p => [p.y, p.x] as [number, number]);
  }, [filteredGeoPoints]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let centerLat = 37.7749;
    let centerLng = -122.4194;
    let initialZoom = 12;

    if (allGeoPoints.length > 0) {
      centerLat = allGeoPoints.reduce((acc, p) => acc + p.lat, 0) / allGeoPoints.length;
      centerLng = allGeoPoints.reduce((acc, p) => acc + p.lng, 0) / allGeoPoints.length;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Tile Layer
    const tileConf = BASEMAP_TILES[activeTileStyle];
    const tileLayer = L.tileLayer(tileConf.url, {
      maxZoom: tileConf.maxZoom,
      attribution: tileConf.attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups
    markersLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Initial fit bounds if points exist
    if (allGeoPoints.length > 0) {
      const groupBounds = L.latLngBounds(allGeoPoints.map(p => [p.lat, p.lng]));
      map.fitBounds(groupBounds, { padding: [50, 50], maxZoom: 15 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Tiles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const tileConf = BASEMAP_TILES[activeTileStyle];
    tileLayerRef.current.setUrl(tileConf.url);
  }, [activeTileStyle]);

  // Render Markers, Heatmap, Trails, Hull on Filtered Points Change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    // Clear existing layers
    markersLayerRef.current.clearLayers();

    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.clearLayers();
    }
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (boundaryLayerRef.current) {
      boundaryLayerRef.current.remove();
      boundaryLayerRef.current = null;
    }

    // 1. Draw Heatmap Halo Circles
    if (showHeatmap && heatmapLayerRef.current) {
      filteredGeoPoints.forEach(p => {
        const circle = L.circle([p.lat, p.lng], {
          radius: 350,
          fillColor: '#f43f5e',
          fillOpacity: 0.22,
          color: '#f59e0b',
          weight: 1,
          opacity: 0.35,
        });
        circle.addTo(heatmapLayerRef.current!);
      });
    }

    // 2. Draw Route Trail Line
    if (showRouteTrail && filteredGeoPoints.length > 1) {
      const latlngs = filteredGeoPoints.map(p => [p.lat, p.lng] as [number, number]);
      const poly = L.polyline(latlngs, {
        color: '#06b6d4',
        weight: 3,
        dashArray: '5, 5',
        opacity: 0.8,
      }).addTo(mapInstanceRef.current);
      routeLayerRef.current = poly;
    }

    // 3. Draw Spatial Convex Hull Boundary
    if (showConvexHull && convexHullPoints.length >= 3) {
      const poly = L.polygon(convexHullPoints, {
        color: '#8b5cf6',
        fillColor: '#8b5cf6',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(mapInstanceRef.current);
      boundaryLayerRef.current = poly;
    }

    // 4. Render Markers
    filteredGeoPoints.forEach(p => {
      const color = getPointColor(p);
      const isSelected = selectedPoint?.id === p.id;

      const marker = L.circleMarker([p.lat, p.lng], {
        radius: isSelected ? pointRadius + 3 : pointRadius,
        fillColor: color,
        fillOpacity: markerOpacity,
        color: isSelected ? '#ffffff' : '#0f172a',
        weight: isSelected ? 3 : 1.5,
      });

      // Bind Rich Interactive Popup
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 170px;">
          <div style="font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>📍 Record #${p.rowIndex + 1}</span>
            <span style="font-size: 10px; color: #64748b;">${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</span>
          </div>
          ${p.metricVal !== null && p.metricVal !== undefined ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #64748b;">${colorByMetric}:</span> 
              <strong style="color: #0284c7;">${p.metricVal}</strong>
            </div>
          ` : ''}
          ${p.categoryVal ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #64748b;">${colorByCategory}:</span> 
              <strong style="color: #7c3aed;">${p.categoryVal}</strong>
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedPoint(p);
      });

      marker.addTo(markersLayerRef.current!);
    });

  }, [
    filteredGeoPoints, 
    colorMode, 
    colorByMetric, 
    colorByCategory, 
    showHeatmap, 
    showRouteTrail, 
    showConvexHull, 
    pointRadius, 
    markerOpacity, 
    selectedPoint?.id,
    convexHullPoints
  ]);

  // Fit view to current points
  const handleFitBounds = () => {
    if (!mapInstanceRef.current || filteredGeoPoints.length === 0) return;
    const groupBounds = L.latLngBounds(filteredGeoPoints.map(p => [p.lat, p.lng]));
    mapInstanceRef.current.fitBounds(groupBounds, { padding: [50, 50], maxZoom: 16 });
    showToast(`✓ View centered on ${filteredGeoPoints.length} geocoded records`);
  };

  // Export GeoJSON
  const handleExportGeoJSON = () => {
    if (filteredGeoPoints.length === 0) return;
    const geojson = {
      type: 'FeatureCollection',
      features: filteredGeoPoints.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat],
        },
        properties: {
          id: p.id,
          rowIndex: p.rowIndex,
          ...p.originalRow,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name.replace(/\s+/g, '_')}_spatial_features.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ Exported ${filteredGeoPoints.length} points as GeoJSON`);
  };

  // Export Filtered Records as New Dataset
  const handleCreateDatasetFromPoints = () => {
    if (!onCreateDataset || filteredGeoPoints.length === 0) return;

    const newRows = filteredGeoPoints.map(p => p.originalRow);
    const newDataset: Dataset = {
      id: `ds_geo_${Date.now()}`,
      name: `${dataset.name} (Geo Spatial Selection)`,
      description: `Geospatial subset filtered from ${dataset.name}. Contains ${filteredGeoPoints.length} location records.`,
      sourceType: 'manual',
      columns: [...dataset.columns],
      data: newRows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateDataset(newDataset);
    confetti({ particleCount: 40, spread: 60 });
    showToast(`✓ Created new dataset '${newDataset.name}' with ${newRows.length} rows!`);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 p-6 bg-slate-950 overflow-y-auto' : ''}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg animate-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* HEADER & CONTROL RIBBON */}
      <div className={`p-5 rounded-3xl border shadow-xl space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 shrink-0">
              <Globe className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Interactive GIS & Field Operations Spatial Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  Leaflet Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Visualize GPS telemetry, field route trails, cluster heatmaps, and convex bounding zones directly on top of real basemap tiles.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleFitBounds}
              disabled={filteredGeoPoints.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-cyan-800 border-slate-300'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>Center ({filteredGeoPoints.length})</span>
            </button>

            <button
              onClick={handleExportGeoJSON}
              disabled={filteredGeoPoints.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export GeoJSON</span>
            </button>

            {onCreateDataset && (
              <button
                onClick={handleCreateDatasetFromPoints}
                disabled={filteredGeoPoints.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all disabled:opacity-40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Save as Sub-Dataset</span>
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Spatial Axis Mapping Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          
          {/* Latitude Column */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Latitude (Y-Coord)
            </label>
            <select
              value={selectedLatCol}
              onChange={e => setSelectedLatCol(e.target.value)}
              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="">Select Latitude Column...</option>
              {dataset.columns.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          {/* Longitude Column */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Longitude (X-Coord)
            </label>
            <select
              value={selectedLngCol}
              onChange={e => setSelectedLngCol(e.target.value)}
              className={`w-full px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="">Select Longitude Column...</option>
              {dataset.columns.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          {/* Color Mode & Variable */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Color Markers By
            </label>
            <div className="flex gap-2">
              <select
                value={colorMode}
                onChange={e => setColorMode(e.target.value as any)}
                className={`w-1/2 px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="metric">Metric Heat</option>
                <option value="category">Category</option>
                <option value="single">Uniform</option>
              </select>

              {colorMode === 'metric' && (
                <select
                  value={colorByMetric}
                  onChange={e => setColorByMetric(e.target.value)}
                  className={`w-1/2 px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="">None</option>
                  {numericCols.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {colorMode === 'category' && (
                <select
                  value={colorByCategory}
                  onChange={e => setColorByCategory(e.target.value)}
                  className={`w-1/2 px-2.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  {categoryCols.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Basemap Tile Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Basemap Cartography
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(BASEMAP_TILES) as TileStyle[]).map(style => (
                <button
                  key={style}
                  onClick={() => setActiveTileStyle(style)}
                  className={`py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider border transition-all ${
                    activeTileStyle === style
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Dynamic Filters & Layer Overlays */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
          
          {/* Overlays Toggles */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300">
              <input
                type="checkbox"
                checked={showRouteTrail}
                onChange={e => setShowRouteTrail(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-cyan-500"
              />
              <Route className="w-3.5 h-3.5 text-cyan-400" />
              <span>Route Trail</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={e => setShowHeatmap(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-rose-500"
              />
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              <span>Density Heatmap</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300">
              <input
                type="checkbox"
                checked={showConvexHull}
                onChange={e => setShowConvexHull(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-purple-500"
              />
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Convex Boundary</span>
            </label>
          </div>

          {/* Search Input Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search geo records..."
                className={`pl-8 pr-3 py-1 rounded-xl border text-xs focus:outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            {uniqueCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className={`px-2.5 py-1 rounded-xl border text-xs ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>

        </div>

      </div>

      {/* MAP STAGE & LOCATION INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Leaflet Map Stage */}
        <div className="lg:col-span-3 p-4 rounded-3xl border bg-slate-950 border-slate-800 shadow-2xl relative flex flex-col">
          
          <div
            ref={mapContainerRef}
            className="w-full rounded-2xl overflow-hidden border border-slate-800"
            style={{ minHeight: isFullscreen ? '72vh' : '520px', height: '100%' }}
          />

          {allGeoPoints.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xs rounded-3xl">
              <div className="text-center p-8 max-w-md space-y-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
                <MapPin className="w-10 h-10 text-cyan-400 mx-auto animate-bounce" />
                <h3 className="text-base font-bold text-white">No Coordinates Selected</h3>
                <p className="text-xs text-slate-400">
                  Please pick numerical Latitude and Longitude columns in the configuration ribbon above, or collect coordinates in the Offline Field Collector.
                </p>
              </div>
            </div>
          )}

          {/* Bottom telemetry overlay */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {filteredGeoPoints.length} of {allGeoPoints.length} points active
              </span>
              <span>•</span>
              <span className="font-mono text-[11px]">
                Lat col: <strong className="text-cyan-300">{selectedLatCol || 'None'}</strong> | Lng col: <strong className="text-cyan-300">{selectedLngCol || 'None'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Marker Radius:</span>
              <input
                type="range"
                min="4"
                max="14"
                value={pointRadius}
                onChange={e => setPointRadius(Number(e.target.value))}
                className="w-20 accent-cyan-500 h-1.5"
              />
            </div>
          </div>

        </div>

        {/* Selected Location Inspector Sidebar */}
        <div className="space-y-4">
          
          <div className={`p-5 rounded-3xl border space-y-4 shadow-xl ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Selected Record</span>
              </span>
              {selectedPoint && (
                <button
                  onClick={() => setSelectedPoint(null)}
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </h4>

            {selectedPoint ? (
              <div className="space-y-3 text-xs">
                
                {/* Coordinates Pill */}
                <div className={`p-3.5 rounded-2xl border space-y-2 font-mono ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                }`}>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Record Index:</span>
                    <span className="text-white font-bold">#{selectedPoint.rowIndex + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latitude:</span>
                    <span className="text-emerald-400 font-bold">{selectedPoint.lat}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Longitude:</span>
                    <span className="text-emerald-400 font-bold">{selectedPoint.lng}°</span>
                  </div>
                  {selectedPoint.metricVal !== null && selectedPoint.metricVal !== undefined && (
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-400">{colorByMetric}:</span>
                      <span className="text-cyan-400 font-bold">{selectedPoint.metricVal}</span>
                    </div>
                  )}
                  {selectedPoint.categoryVal && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{colorByCategory}:</span>
                      <span className="text-purple-400 font-bold">{selectedPoint.categoryVal}</span>
                    </div>
                  )}
                </div>

                {/* All Attributes Inspector */}
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                    Full Record Attributes:
                  </span>
                  <div className={`p-3 rounded-2xl border max-h-56 overflow-y-auto space-y-1 text-[11px] font-mono ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}>
                    {Object.entries(selectedPoint.originalRow).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-800/40 pb-1">
                        <span className="text-slate-500 truncate max-w-[100px]">{k}:</span>
                        <span className="text-cyan-300 truncate max-w-[130px]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <MapPin className="w-6 h-6 mx-auto text-slate-700" />
                <p className="text-xs">Click any map marker to inspect its full dataset attributes.</p>
              </div>
            )}
          </div>

          {/* Color Scale Legend */}
          {colorMode === 'metric' && colorByMetric && (
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {colorByMetric} Heat Scale
              </span>
              <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500" />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>Min: {metricRange.min}</span>
                <span>Max: {metricRange.max}</span>
              </div>
            </div>
          )}

          {colorMode === 'category' && colorByCategory && (
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {colorByCategory} Legend
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {Object.entries(categoryColorMap).map(([cat, col]) => (
                  <div key={cat} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col }} />
                    <span className="text-slate-300 truncate">{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
