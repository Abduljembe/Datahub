// Live Field Tactical Radar & GPS Breadcrumb Trail Engine
import { EnumeratorAgent, GeofenceZone, DEFAULT_GEOFENCES, calculateDistanceKm } from './enumeratorFleetEngine';
import { SupervisorSubmission } from './supervisorEngine';

export interface GpsBreadcrumbPoint {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  speedKmh?: number;
  batteryPct?: number;
  eventType: 'survey_submitted' | 'transit_beacon' | 'geofence_entry' | 'geofence_exit' | 'idle_pause';
  label?: string;
}

export interface EnumeratorTacticalTrack {
  enumeratorId: string;
  enumeratorName: string;
  role: string;
  status: EnumeratorAgent['status'];
  currentLat: number;
  currentLng: number;
  accuracy: number;
  batteryLevel: number;
  assignedZone: string;
  isInsideZone: boolean;
  totalDistanceWalkedKm: number;
  breadcrumbs: GpsBreadcrumbPoint[];
}

export interface TacticalRadarCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  submissionCount: number;
  approvedCount: number;
  pendingCount: number;
  flaggedCount: number;
  zoneName: string;
  radiusMeters: number;
}

// Generate realistic simulated breadcrumb trails for active fleet
export function generateFleetTacticalTracks(
  fleet: EnumeratorAgent[],
  submissions: SupervisorSubmission[]
): EnumeratorTacticalTrack[] {
  return fleet.map((agent, index) => {
    // Collect all submissions by this agent
    const agentSubs = submissions
      .filter(s => s.enumeratorId === agent.id)
      .sort((a, b) => new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime());

    const baseLat = agent.lat || 37.7749;
    const baseLng = agent.lng || -122.4194;

    // Build breadcrumbs
    const breadcrumbs: GpsBreadcrumbPoint[] = [];

    // Historical trail (5-8 steps)
    const stepCount = 6;
    for (let i = stepCount; i >= 1; i--) {
      const timeOffsetMins = i * 25;
      const angle = (index * 60 + i * 35) * (Math.PI / 180);
      const distOffset = (i * 0.0035);
      const lat = baseLat - Math.sin(angle) * distOffset;
      const lng = baseLng - Math.cos(angle) * distOffset;

      breadcrumbs.push({
        id: `bc_${agent.id}_${i}`,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        accuracy: Math.round(3 + Math.random() * 5),
        timestamp: new Date(Date.now() - timeOffsetMins * 60 * 1000).toISOString(),
        speedKmh: Math.round(3.5 + Math.random() * 4),
        batteryPct: Math.min(100, Math.round(agent.batteryLevel + i * 2.5)),
        eventType: i % 2 === 0 ? 'transit_beacon' : 'survey_submitted',
        label: i % 2 === 0 ? `Waypoint #${stepCount - i + 1}` : `Household Interview #${100 + i}`
      });
    }

    // Add current position
    breadcrumbs.push({
      id: `bc_${agent.id}_current`,
      lat: agent.lat,
      lng: agent.lng,
      accuracy: agent.accuracy || 4.2,
      timestamp: agent.lastActive || new Date().toISOString(),
      speedKmh: agent.status === 'collecting' ? 0 : agent.status === 'transit' ? 18 : 0,
      batteryPct: agent.batteryLevel,
      eventType: agent.status === 'collecting' ? 'survey_submitted' : 'transit_beacon',
      label: `Current Position (${agent.name})`
    });

    // Calculate total walked km
    let totalDist = 0;
    for (let i = 0; i < breadcrumbs.length - 1; i++) {
      totalDist += calculateDistanceKm(breadcrumbs[i].lat, breadcrumbs[i].lng, breadcrumbs[i + 1].lat, breadcrumbs[i + 1].lng);
    }

    const matchedZone = DEFAULT_GEOFENCES.find(g => g.name.toLowerCase() === agent.assignedZone.toLowerCase()) || DEFAULT_GEOFENCES[0];
    const distFromZone = calculateDistanceKm(agent.lat, agent.lng, matchedZone.centerLat, matchedZone.centerLng);
    const isInside = distFromZone <= matchedZone.radiusKm;

    return {
      enumeratorId: agent.id,
      enumeratorName: agent.name,
      role: agent.role,
      status: agent.status,
      currentLat: agent.lat,
      currentLng: agent.lng,
      accuracy: agent.accuracy || 4,
      batteryLevel: agent.batteryLevel,
      assignedZone: agent.assignedZone,
      isInsideZone: isInside,
      totalDistanceWalkedKm: Number(totalDist.toFixed(2)),
      breadcrumbs
    };
  });
}

// Compute geographic bounds to fit radar
export function calculateTacticalBounds(
  tracks: EnumeratorTacticalTrack[],
  zones: GeofenceZone[]
): { minLat: number; maxLat: number; minLng: number; maxLng: number; centerLat: number; centerLng: number } {
  const lats: number[] = [];
  const lngs: number[] = [];

  tracks.forEach(t => {
    lats.push(t.currentLat);
    lngs.push(t.currentLng);
    t.breadcrumbs.forEach(b => {
      lats.push(b.lat);
      lngs.push(b.lng);
    });
  });

  zones.forEach(z => {
    lats.push(z.centerLat);
    lngs.push(z.centerLng);
  });

  if (lats.length === 0) {
    return { minLat: 37.75, maxLat: 37.80, minLng: -122.45, maxLng: -122.38, centerLat: 37.7749, centerLng: -122.4194 };
  }

  const minLat = Math.min(...lats) - 0.008;
  const maxLat = Math.max(...lats) + 0.008;
  const minLng = Math.min(...lngs) - 0.008;
  const maxLng = Math.max(...lngs) + 0.008;

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2
  };
}
