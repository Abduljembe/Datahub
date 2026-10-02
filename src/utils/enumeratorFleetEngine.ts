// Live Enumerator Fleet & Field Location Engine

export interface BreadcrumbPoint {
  lat: number;
  lng: number;
  timestamp: string;
  activity: string;
  surveyId?: string;
}

export interface FieldSubmissionPin {
  id: string;
  title: string;
  timestamp: string;
  lat: number;
  lng: number;
}

export interface EnumeratorAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  lat: number;
  lng: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number; // km/h
  heading?: number; // degrees
  batteryLevel?: number; // percentage
  isCharging?: boolean;
  status: 'collecting' | 'transit' | 'idle' | 'offline' | 'sos';
  campaign: string;
  assignedZone: string;
  surveysCollectedToday: number;
  lastActive: string;
  lastAddress?: string;
  notes?: string;
  history: BreadcrumbPoint[];
  recentSubmissions?: FieldSubmissionPin[];
  // Supervisor Approval & Registration Architecture
  approvalStatus: 'approved' | 'pending_approval' | 'rejected' | 'suspended';
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: string; // Supervisor badge or name
  rejectionReason?: string;
  badgeNumber?: string;
  deviceHardwareId?: string;
  accessPin?: string;
  assignedSupervisorId?: string;
}

export interface GeofenceZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  color: string;
  assignedAgents: string[];
}

export const DEFAULT_GEOFENCES: GeofenceZone[] = [];

export const INITIAL_DEFAULT_FLEET: EnumeratorAgent[] = [];

const LOCAL_STORAGE_KEY = 'datahub_enumerator_fleet_cache';

function getLocalFleet(): EnumeratorAgent[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return [];
}

function saveLocalFleet(fleet: EnumeratorAgent[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fleet));
  } catch (e) {
    // Ignore storage quota error
  }
}

/**
 * Calculate Great-Circle Distance between two coordinates using Haversine formula in kilometers
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(3));
}

/**
 * Checks if an agent is inside their designated geofence
 */
export function isAgentInsideGeofence(agentLat: number, agentLng: number, zone: GeofenceZone): boolean {
  const dist = calculateDistanceKm(agentLat, agentLng, zone.centerLat, zone.centerLng);
  return dist <= zone.radiusKm;
}

/**
 * Fetch all active enumerator locations from server with resilient local fallback
 */
export async function fetchEnumeratorFleet(): Promise<{
  totalAgents: number;
  activeCollecting: number;
  inTransit: number;
  idle: number;
  sosAlerts: number;
  fleet: EnumeratorAgent[];
}> {
  try {
    const res = await fetch('/api/enumerator/fleet', {
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.fleet)) {
        saveLocalFleet(data.fleet);
        return data;
      }
    }
  } catch {
    // Graceful fallback to local cache
  }

  const localList = getLocalFleet();
  return {
    totalAgents: localList.length,
    activeCollecting: localList.filter(a => a.status === 'collecting').length,
    inTransit: localList.filter(a => a.status === 'transit').length,
    idle: localList.filter(a => a.status === 'idle' || a.status === 'offline').length,
    sosAlerts: localList.filter(a => a.status === 'sos').length,
    fleet: localList,
  };
}

/**
 * Transmit live GPS location beacon from an enumerator device
 */
export async function sendLocationBeacon(payload: Partial<EnumeratorAgent> & { lat: number; lng: number }): Promise<boolean> {
  // Always update local cache immediately
  const localList = getLocalFleet();
  const agentId = payload.id || `enum_${payload.name?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'device'}`;
  const now = new Date().toISOString();
  
  const existingIdx = localList.findIndex(a => a.id === agentId);
  const existing = existingIdx >= 0 ? localList[existingIdx] : null;
  const history = existing?.history ? [...existing.history] : [];
  
  history.push({
    lat: payload.lat,
    lng: payload.lng,
    timestamp: now,
    activity: 'Live GPS Location Broadcast'
  });
  if (history.length > 50) history.shift();

  const updatedAgent: EnumeratorAgent = {
    id: agentId,
    name: payload.name || existing?.name || 'Field Enumerator',
    email: payload.email || existing?.email || `${agentId}@datahub-field.org`,
    phone: payload.phone || existing?.phone,
    role: payload.role || existing?.role || 'Field Enumerator',
    lat: payload.lat,
    lng: payload.lng,
    accuracy: payload.accuracy ?? (existing?.accuracy || 5),
    altitude: payload.altitude ?? existing?.altitude ?? null,
    speed: payload.speed ?? existing?.speed ?? 0,
    heading: payload.heading ?? existing?.heading ?? 0,
    batteryLevel: payload.batteryLevel ?? existing?.batteryLevel ?? 90,
    isCharging: payload.isCharging ?? existing?.isCharging ?? false,
    status: payload.status || existing?.status || 'collecting',
    campaign: payload.campaign || existing?.campaign || 'Field Campaign',
    assignedZone: payload.assignedZone || existing?.assignedZone || 'Sector Active',
    surveysCollectedToday: existing?.surveysCollectedToday || 0,
    lastActive: now,
    approvalStatus: payload.approvalStatus || existing?.approvalStatus || 'approved',
    registeredAt: existing?.registeredAt || now,
    approvedAt: existing?.approvedAt || (existing?.approvalStatus === 'approved' ? now : undefined),
    approvedBy: existing?.approvedBy,
    rejectionReason: existing?.rejectionReason,
    badgeNumber: existing?.badgeNumber,
    deviceHardwareId: existing?.deviceHardwareId,
    accessPin: existing?.accessPin,
    notes: payload.notes || existing?.notes,
    history,
    recentSubmissions: existing?.recentSubmissions || []
  };

  if (existingIdx >= 0) {
    localList[existingIdx] = updatedAgent;
  } else {
    localList.push(updatedAgent);
  }
  saveLocalFleet(localList);

  try {
    await fetch('/api/enumerator/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Log a new survey record pin from the field
 */
export async function recordFieldSubmission(enumeratorId: string, title: string, lat?: number, lng?: number, recordId?: string): Promise<boolean> {
  const localList = getLocalFleet();
  const agent = localList.find(a => a.id === enumeratorId);
  if (agent) {
    agent.surveysCollectedToday = (agent.surveysCollectedToday || 0) + 1;
    agent.lastActive = new Date().toISOString();
    const subLat = lat ?? agent.lat;
    const subLng = lng ?? agent.lng;
    
    if (!agent.recentSubmissions) agent.recentSubmissions = [];
    agent.recentSubmissions.unshift({
      id: recordId || `sub_${Date.now()}`,
      title,
      timestamp: new Date().toISOString(),
      lat: subLat,
      lng: subLng
    });
    if (agent.recentSubmissions.length > 20) agent.recentSubmissions.pop();

    agent.history.push({
      lat: subLat,
      lng: subLng,
      timestamp: new Date().toISOString(),
      activity: `Submitted survey: ${title}`,
      surveyId: recordId
    });
    saveLocalFleet(localList);
  }

  try {
    await fetch('/api/enumerator/submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enumeratorId, title, lat, lng, recordId }),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Update enumerator status (SOS alert, transit, break)
 */
export async function updateEnumeratorStatus(enumeratorId: string, status: EnumeratorAgent['status'], notes?: string): Promise<boolean> {
  const localList = getLocalFleet();
  const agent = localList.find(a => a.id === enumeratorId);
  if (agent) {
    agent.status = status;
    if (notes) agent.notes = notes;
    agent.lastActive = new Date().toISOString();
    saveLocalFleet(localList);
  }

  try {
    await fetch('/api/enumerator/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enumeratorId, status, notes }),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Step simulator for real-time fleet movement demo
 */
export async function simulateFleetStep(): Promise<EnumeratorAgent[]> {
  try {
    const res = await fetch('/api/enumerator/simulate-step', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.fleet && Array.isArray(data.fleet)) {
        saveLocalFleet(data.fleet);
        return data.fleet;
      }
    }
  } catch {
    // Perform local simulation step if network is busy/offline
  }

  const list = getLocalFleet();
  list.forEach(agent => {
    const deltaLat = (Math.random() - 0.48) * 0.0012;
    const deltaLng = (Math.random() - 0.48) * 0.0012;

    agent.lat = Number((agent.lat + deltaLat).toFixed(6));
    agent.lng = Number((agent.lng + deltaLng).toFixed(6));
    agent.speed = agent.status === 'transit' ? Math.round(15 + Math.random() * 15) : Math.round(2 + Math.random() * 3);
    agent.heading = Math.round(Math.random() * 360);
    agent.batteryLevel = Math.max(5, (agent.batteryLevel || 80) - (Math.random() > 0.8 ? 1 : 0));
    agent.lastActive = new Date().toISOString();

    agent.history.push({
      lat: agent.lat,
      lng: agent.lng,
      timestamp: new Date().toISOString(),
      activity: agent.status === 'collecting' ? 'Active Field Surveying' : 'Traveling between clusters'
    });
    if (agent.history.length > 50) agent.history.shift();
  });
  saveLocalFleet(list);
  return list;
}

/**
 * Approve an enumerator to grant them sign-in access and offline field tokens
 */
export async function approveEnumerator(id: string, supervisorName = 'Lead Field Supervisor'): Promise<boolean> {
  const localList = getLocalFleet();
  const agent = localList.find(a => a.id === id);
  if (agent) {
    agent.approvalStatus = 'approved';
    agent.approvedAt = new Date().toISOString();
    agent.approvedBy = supervisorName;
    if (!agent.badgeNumber || agent.badgeNumber.startsWith('PENDING')) {
      agent.badgeNumber = `ENUM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    agent.notes = `Approved & authorized by ${supervisorName} on ${new Date().toLocaleDateString()}`;
    agent.history.push({
      lat: agent.lat,
      lng: agent.lng,
      timestamp: new Date().toISOString(),
      activity: `Authorized & Activated by Supervisor (${supervisorName})`
    });
    saveLocalFleet(localList);
  }

  try {
    await fetch('/api/enumerator/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, supervisorName }),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Reject an enumerator application with a reason
 */
export async function rejectEnumerator(id: string, reason: string, supervisorName = 'Lead Field Supervisor'): Promise<boolean> {
  const localList = getLocalFleet();
  const agent = localList.find(a => a.id === id);
  if (agent) {
    agent.approvalStatus = 'rejected';
    agent.rejectionReason = reason;
    agent.approvedBy = supervisorName;
    agent.status = 'offline';
    agent.notes = `Rejected by ${supervisorName}: ${reason}`;
    agent.history.push({
      lat: agent.lat,
      lng: agent.lng,
      timestamp: new Date().toISOString(),
      activity: `Application Rejected: ${reason}`
    });
    saveLocalFleet(localList);
  }

  try {
    await fetch('/api/enumerator/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reason, supervisorName }),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Suspend an active enumerator's sign-in access
 */
export async function suspendEnumerator(id: string, reason: string, supervisorName = 'Lead Field Supervisor'): Promise<boolean> {
  const localList = getLocalFleet();
  const agent = localList.find(a => a.id === id);
  if (agent) {
    agent.approvalStatus = 'suspended';
    agent.rejectionReason = reason;
    agent.status = 'offline';
    agent.notes = `Suspended by ${supervisorName}: ${reason}`;
    agent.history.push({
      lat: agent.lat,
      lng: agent.lng,
      timestamp: new Date().toISOString(),
      activity: `Credentials Suspended: ${reason}`
    });
    saveLocalFleet(localList);
  }

  try {
    await fetch('/api/enumerator/suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reason, supervisorName }),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Reinstate a suspended or rejected enumerator
 */
export async function reinstateEnumerator(id: string, supervisorName = 'Lead Field Supervisor'): Promise<boolean> {
  const localList = getLocalFleet();
  const agent = localList.find(a => a.id === id);
  if (agent) {
    agent.approvalStatus = 'approved';
    agent.rejectionReason = undefined;
    agent.approvedAt = new Date().toISOString();
    agent.approvedBy = supervisorName;
    agent.status = 'idle';
    agent.notes = `Reinstated & reactivated by ${supervisorName}`;
    agent.history.push({
      lat: agent.lat,
      lng: agent.lng,
      timestamp: new Date().toISOString(),
      activity: `Reinstated by Supervisor (${supervisorName})`
    });
    saveLocalFleet(localList);
  }

  try {
    await fetch('/api/enumerator/reinstate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, supervisorName }),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Check enumerator sign-in and approval status by email, badge ID, phone, or name
 */
export function checkEnumeratorApprovalStatus(query: string): {
  agent: EnumeratorAgent | null;
  status: 'approved' | 'pending_approval' | 'rejected' | 'suspended' | 'not_registered';
  reason?: string;
} {
  const localList = getLocalFleet();
  const q = query.trim().toLowerCase();
  if (!q) {
    return { agent: null, status: 'not_registered' };
  }

  const match = localList.find(a => 
    a.email?.toLowerCase() === q ||
    a.id?.toLowerCase() === q ||
    a.badgeNumber?.toLowerCase() === q ||
    a.phone?.replace(/[^0-9]/g, '') === q.replace(/[^0-9]/g, '') ||
    a.name?.toLowerCase() === q
  );

  if (!match) {
    return { agent: null, status: 'not_registered' };
  }

  return {
    agent: match,
    status: match.approvalStatus || 'approved',
    reason: match.rejectionReason,
  };
}

/**
 * Submit hiring application as a new enumerator (waiting for Supervisor Vault review)
 */
export async function submitEnumeratorHiringApplication(data: {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  campaign?: string;
  assignedZone?: string;
  deviceHardwareId?: string;
  notes?: string;
}): Promise<EnumeratorAgent> {
  const cleanId = `enum_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const randomPin = Math.floor(1000 + Math.random() * 9000).toString();

  const newApplicant: EnumeratorAgent = {
    id: cleanId,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone?.trim() || '',
    role: data.role?.trim() || 'Field Enumerator',
    lat: 37.7749 + (Math.random() - 0.5) * 0.02,
    lng: -122.4194 + (Math.random() - 0.5) * 0.02,
    accuracy: 5,
    altitude: 40,
    speed: 0,
    heading: 0,
    batteryLevel: 100,
    isCharging: false,
    status: 'idle',
    campaign: data.campaign?.trim() || 'Global Field Data Collection',
    assignedZone: data.assignedZone?.trim() || 'General Field Zone',
    surveysCollectedToday: 0,
    lastActive: now,
    lastAddress: 'Recruitment & Onboarding Portal',
    notes: data.notes || 'Hired enumerator registration submitted. Awaiting supervisor vetting.',
    approvalStatus: 'pending_approval',
    registeredAt: now,
    badgeNumber: `PENDING-APP-${Math.floor(100 + Math.random() * 900)}`,
    deviceHardwareId: data.deviceHardwareId || `DEV-MBL-${Math.floor(1000 + Math.random() * 9000)}`,
    accessPin: randomPin,
    history: [
      {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: now,
        activity: 'Hiring Application & Profile Submitted for Supervisor Review'
      }
    ],
    recentSubmissions: []
  };

  const localList = getLocalFleet();
  localList.unshift(newApplicant);
  saveLocalFleet(localList);

  try {
    await fetch('/api/enumerator/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newApplicant),
    });
  } catch {}

  return newApplicant;
}

/**
 * Register a new real field enumerator
 */
export async function registerNewEnumerator(data: {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  campaign?: string;
  assignedZone?: string;
  lat?: number;
  lng?: number;
  status?: EnumeratorAgent['status'];
  approvalStatus?: EnumeratorAgent['approvalStatus'];
  notes?: string;
  approvedBy?: string;
}): Promise<EnumeratorAgent | null> {
  const cleanId = `enum_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const isApproved = data.approvalStatus === 'approved' || !data.approvalStatus;

  const newAgent: EnumeratorAgent = {
    id: cleanId,
    name: data.name.trim(),
    email: data.email?.trim() || `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@datahub-field.org`,
    phone: data.phone?.trim() || '',
    role: data.role?.trim() || 'Field Enumerator',
    lat: data.lat ?? 37.7749,
    lng: data.lng ?? -122.4194,
    accuracy: 5,
    altitude: null,
    speed: 0,
    heading: 0,
    batteryLevel: 100,
    isCharging: false,
    status: data.status || 'idle',
    campaign: data.campaign?.trim() || 'Field Data Collection',
    assignedZone: data.assignedZone?.trim() || 'General Field Zone',
    surveysCollectedToday: 0,
    lastActive: now,
    lastAddress: `${data.assignedZone || 'Field Zone'} - Base Station`,
    notes: data.notes || '',
    approvalStatus: data.approvalStatus || 'approved',
    registeredAt: now,
    approvedAt: isApproved ? now : undefined,
    approvedBy: isApproved ? (data.approvedBy || 'Supervisor Vault Roster') : undefined,
    badgeNumber: isApproved ? `ENUM-2026-${Math.floor(1000 + Math.random() * 9000)}` : `PENDING-APP-${Math.floor(100 + Math.random() * 900)}`,
    deviceHardwareId: `DEV-TAB-${Math.floor(1000 + Math.random() * 9000)}`,
    accessPin: Math.floor(1000 + Math.random() * 9000).toString(),
    history: [
      {
        lat: data.lat ?? 37.7749,
        lng: data.lng ?? -122.4194,
        timestamp: now,
        activity: isApproved ? 'Registered & Approved into Fleet' : 'Registered as Pending Applicant'
      }
    ],
    recentSubmissions: []
  };

  const localList = getLocalFleet();
  localList.unshift(newAgent);
  saveLocalFleet(localList);

  try {
    const res = await fetch('/api/enumerator/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const respData = await res.json();
      if (respData.fleet) {
        saveLocalFleet(respData.fleet);
      }
      return respData.agent || newAgent;
    }
  } catch {
    // Keep local version
  }

  return newAgent;
}

/**
 * Update an existing enumerator's profile
 */
export async function updateEnumeratorProfile(data: {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  campaign?: string;
  assignedZone?: string;
  status?: EnumeratorAgent['status'];
  notes?: string;
}): Promise<boolean> {
  const localList = getLocalFleet();
  const agent = localList.find(a => a.id === data.id);
  if (agent) {
    if (data.name) agent.name = data.name;
    if (data.email) agent.email = data.email;
    if (data.phone !== undefined) agent.phone = data.phone;
    if (data.role) agent.role = data.role;
    if (data.campaign) agent.campaign = data.campaign;
    if (data.assignedZone) agent.assignedZone = data.assignedZone;
    if (data.status) agent.status = data.status;
    if (data.notes !== undefined) agent.notes = data.notes;
    agent.lastActive = new Date().toISOString();
    saveLocalFleet(localList);
  }

  try {
    await fetch('/api/enumerator/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Delete / Remove an enumerator from fleet
 */
export async function deleteEnumeratorAgent(id: string): Promise<boolean> {
  const localList = getLocalFleet().filter(a => a.id !== id);
  saveLocalFleet(localList);

  try {
    await fetch(`/api/enumerator/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Dispatch instruction or alert to enumerators
 */
export async function sendSupervisorDispatchMessage(params: {
  targetAgentId?: string;
  message: string;
  priority?: 'normal' | 'urgent' | 'alert';
  broadcastAll?: boolean;
}): Promise<boolean> {
  const localList = getLocalFleet();
  const now = new Date().toISOString();

  if (params.broadcastAll) {
    localList.forEach(agent => {
      agent.notes = `[DISPATCH - ${new Date().toLocaleTimeString()}]: ${params.message}`;
      agent.history.push({
        lat: agent.lat,
        lng: agent.lng,
        timestamp: now,
        activity: `Supervisor Broadcast: ${params.message}`
      });
    });
  } else if (params.targetAgentId) {
    const agent = localList.find(a => a.id === params.targetAgentId);
    if (agent) {
      agent.notes = `[DISPATCH - ${new Date().toLocaleTimeString()}]: ${params.message}`;
      agent.history.push({
        lat: agent.lat,
        lng: agent.lng,
        timestamp: now,
        activity: `Supervisor Instruction: ${params.message}`
      });
    }
  }
  saveLocalFleet(localList);

  try {
    await fetch('/api/enumerator/dispatch-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return true;
  } catch {
    return true;
  }
}

/**
 * Reset fleet to default regional layout
 */
export async function resetFleetDeployment(): Promise<EnumeratorAgent[]> {
  try {
    const res = await fetch('/api/enumerator/reset-fleet', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.fleet) {
        saveLocalFleet(data.fleet);
        return data.fleet;
      }
    }
  } catch {
    // Reset local cache
  }

  saveLocalFleet(INITIAL_DEFAULT_FLEET);
  return INITIAL_DEFAULT_FLEET;
}

