import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Trash2,
  Save,
  Shield,
  Phone,
  Mail,
  Layers,
  Compass,
  AlertTriangle,
  Radio,
  CheckCircle2,
  MapPin,
  Globe,
  Map as MapIcon
} from 'lucide-react';
import { EnumeratorAgent, updateEnumeratorProfile, deleteEnumeratorAgent } from '../../utils/enumeratorFleetEngine';
import { RealMapLocationPicker } from './maps/RealMapLocationPicker';

interface EditEnumeratorModalProps {
  isOpen: boolean;
  agent: EnumeratorAgent | null;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: (agentId: string) => void;
}

export const EditEnumeratorModal: React.FC<EditEnumeratorModalProps> = ({
  isOpen,
  agent,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [campaign, setCampaign] = useState('');
  const [assignedZone, setAssignedZone] = useState('');
  const [status, setStatus] = useState<EnumeratorAgent['status']>('collecting');
  const [lat, setLat] = useState<number>(37.7749);
  const [lng, setLng] = useState<number>(-122.4194);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setEmail(agent.email || '');
      setPhone(agent.phone || '');
      setRole(agent.role);
      setCampaign(agent.campaign);
      setAssignedZone(agent.assignedZone);
      setStatus(agent.status);
      setLat(agent.lat || 37.7749);
      setLng(agent.lng || -122.4194);
      setNotes(agent.notes || '');
      setConfirmDelete(false);
      setErrorMsg(null);
    }
  }, [agent]);

  if (!isOpen || !agent) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await updateEnumeratorProfile({
        id: agent.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: role.trim(),
        campaign: campaign.trim(),
        assignedZone: assignedZone.trim(),
        status,
        notes: notes.trim(),
      });

      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update enumerator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteEnumeratorAgent(agent.id);
      onDeleted(agent.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete enumerator');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Enumerator Profile</h3>
              <p className="text-xs text-slate-400">Modify deployment details or re-assign campaigns for {agent.name}.</p>
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
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Phone / WhatsApp</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Email & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300">Operational Role</label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Campaign & Assigned Zone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Assigned Campaign</span>
              </label>
              <input
                type="text"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Assigned Geofence Zone</span>
              </label>
              <input
                type="text"
                value={assignedZone}
                onChange={e => setAssignedZone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Operational Status */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Operational Status</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'collecting', label: 'Collecting', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
                { id: 'transit', label: 'Transit', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' },
                { id: 'idle', label: 'Idle / Break', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                { id: 'sos', label: 'SOS Alert', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
              ].map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setStatus(s.id as any)}
                  className={`py-2 rounded-xl font-bold border text-center transition-all ${
                    status === s.id
                      ? s.color + ' ring-1 ring-white/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Field Supervisor Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Delete Danger Zone */}
          <div className="pt-3 border-t border-slate-800/80">
            {confirmDelete ? (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-rose-300 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Permanently remove this enumerator?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Remove'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove this enumerator from fleet</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors shadow-lg shadow-cyan-600/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
