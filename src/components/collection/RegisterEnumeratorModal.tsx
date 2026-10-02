import React, { useState } from 'react';
import {
  X,
  UserPlus,
  MapPin,
  Compass,
  Phone,
  Mail,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  Navigation,
  Globe,
  Radio,
  Map as MapIcon
} from 'lucide-react';
import { EnumeratorAgent, registerNewEnumerator } from '../../utils/enumeratorFleetEngine';
import { RealMapLocationPicker } from './maps/RealMapLocationPicker';

interface RegisterEnumeratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (newAgent: EnumeratorAgent) => void;
}

const ROLE_PRESETS = [
  'Field Enumerator',
  'Senior Agricultural Assessor',
  'Clinical Health Surveyor',
  'Urban Infrastructure Auditor',
  'Household Demographer',
  'Field Operations Lead',
  'Quality Control Spot-Checker'
];

const CAMPAIGN_PRESETS = [
  'Global Crop Yield & Soil Audit',
  'Community Health & Maternal Survey',
  'Municipal Water Grid Audit',
  'Household Census 2026',
  'National Socio-Economic Baseline Study',
  'Post-Disaster Damage Assessment'
];

const ZONE_PRESETS = [
  'Sector A (Valley West)',
  'Sector B (Metro Central)',
  'Sector C (South District)',
  'Sector D (East Foothills)',
  'Zone North (Agricultural Belt)',
  'Zone South (Coastal Corridor)'
];

export const RegisterEnumeratorModal: React.FC<RegisterEnumeratorModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(ROLE_PRESETS[0]);
  const [customRole, setCustomRole] = useState('');
  const [campaign, setCampaign] = useState(CAMPAIGN_PRESETS[0]);
  const [customCampaign, setCustomCampaign] = useState('');
  const [assignedZone, setAssignedZone] = useState(ZONE_PRESETS[0]);
  const [customZone, setCustomZone] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<EnumeratorAgent['approvalStatus']>('approved');
  const [lat, setLat] = useState('37.7749');
  const [lng, setLng] = useState('-122.4194');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAcquireCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation is not available on this device.');
      return;
    }

    setIsLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      err => {
        console.error('Geolocation error:', err);
        setErrorMsg(`Could not fetch GPS: ${err.message}`);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter the full name of the enumerator.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const finalRole = role === 'custom' ? (customRole || 'Field Enumerator') : role;
      const finalCampaign = campaign === 'custom' ? (customCampaign || 'Field Survey Campaign') : campaign;
      const finalZone = assignedZone === 'custom' ? (customZone || 'General Zone') : assignedZone;

      const registered = await registerNewEnumerator({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: finalRole,
        campaign: finalCampaign,
        assignedZone: finalZone,
        lat: parseFloat(lat) || 37.7749,
        lng: parseFloat(lng) || -122.4194,
        status: 'idle',
        approvalStatus: approvalStatus,
        notes: notes.trim() || undefined,
        approvedBy: approvalStatus === 'approved' ? 'Lead Supervisor Vault' : undefined,
      });

      if (registered) {
        onRegistered(registered);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register enumerator');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Register Real Field Enumerator</h3>
              <p className="text-xs text-slate-400">Add an actual field agent or team member to the live GPS tracking and dispatch system.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Grace Wanjiru"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Phone / WhatsApp</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +254 712 345 678"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Email & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. grace.wanjiru@organization.org"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Operational Role</span>
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {ROLE_PRESETS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="custom">+ Custom Role...</option>
              </select>
            </div>
          </div>

          {role === 'custom' && (
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Custom Role Title</label>
              <input
                type="text"
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="e.g. Drone Environmental Surveyor"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Assigned Campaign & Geofence Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Assigned Campaign</span>
              </label>
              <select
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {CAMPAIGN_PRESETS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="custom">+ Custom Campaign...</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Assigned Geofence Zone</span>
              </label>
              <select
                value={assignedZone}
                onChange={e => setAssignedZone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              >
                {ZONE_PRESETS.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
                <option value="custom">+ Custom Zone...</option>
              </select>
            </div>
          </div>

          {(campaign === 'custom' || assignedZone === 'custom') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {campaign === 'custom' && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Custom Campaign Name</label>
                  <input
                    type="text"
                    value={customCampaign}
                    onChange={e => setCustomCampaign(e.target.value)}
                    placeholder="e.g. Kenya Wildlife Tracking 2026"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
              {assignedZone === 'custom' && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Custom Zone Name</label>
                  <input
                    type="text"
                    value={customZone}
                    onChange={e => setCustomZone(e.target.value)}
                    placeholder="e.g. Sector E (Rift Valley)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Interactive Real Map Location Picker */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span>Station Base Location (Real-World Map)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>LIVE GIS TILES</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Pinpoint where this enumerator will be deployed. Search any address, click on the map, or acquire your device GPS.
            </p>

            <RealMapLocationPicker
              initialLat={parseFloat(lat) || 37.7749}
              initialLng={parseFloat(lng) || -122.4194}
              assignedZoneName={assignedZone === 'custom' ? customZone : assignedZone}
              onLocationSelect={(newLat, newLng, address, cityCountry) => {
                setLat(newLat.toFixed(6));
                setLng(newLng.toFixed(6));
                if (address && assignedZone === 'custom' && !customZone) {
                  setCustomZone(cityCountry || address.split(',')[0]);
                }
              }}
              height="280px"
            />
          </div>

          {/* Supervisor Authorization Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Supervisor Vault Authorization & Sign-In Status</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono">GATE CONTROL</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setApprovalStatus('approved')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  approvalStatus === 'approved'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Authorize & Activate</span>
                  {approvalStatus === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <span className="text-[10px] text-slate-400">Allows immediate sign-in to web & mobile field data tools.</span>
              </button>

              <button
                type="button"
                onClick={() => setApprovalStatus('pending_approval')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  approvalStatus === 'pending_approval'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Queue as Pending</span>
                  {approvalStatus === 'pending_approval' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-slate-400">Requires supervisor vetting before sign-in is unlocked.</span>
              </button>
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Field Notes / Equipment / Vehicle ID</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Equipped with Garmin InReach, assigned to Motorcycle Unit #4, targeted 25 households/day."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Enumerator'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
