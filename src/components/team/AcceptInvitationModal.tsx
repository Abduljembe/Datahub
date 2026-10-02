import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Mail, 
  Briefcase, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  KeyRound, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Camera,
  X
} from 'lucide-react';
import { UserProfile, CoworkerInvitation } from '../../types';
import { acceptCoworkerInvitation, getInvitationByToken } from '../../utils/teamData';

interface AcceptInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteToken: string;
  onAcceptSuccess: (user: UserProfile) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

export const AcceptInvitationModal: React.FC<AcceptInvitationModalProps> = ({
  isOpen,
  onClose,
  inviteToken,
  onAcceptSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState(inviteToken);
  const [loading, setLoading] = useState(false);
  const [fetchingInvite, setFetchingInvite] = useState(false);
  const [invitation, setInvitation] = useState<CoworkerInvitation | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Profile Setup fields
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_PRESETS[0]);
  const [customAvatar, setCustomAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [skills, setSkills] = useState('');
  const [statusMessage, setStatusMessage] = useState('Joined the workspace · ready to analyze data');
  const [isAccepted, setIsAccepted] = useState(false);

  // Synchronize when token changes
  useEffect(() => {
    if (inviteToken) {
      setTokenInput(inviteToken);
      loadInvitation(inviteToken);
    }
  }, [inviteToken, isOpen]);

  const loadInvitation = async (tok: string) => {
    if (!tok.trim()) return;
    setFetchingInvite(true);
    setFetchError(null);

    try {
      // 1. Try server endpoint first
      const res = await fetch(`/api/team/invitation/${encodeURIComponent(tok.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.invitation) {
          setInvitation(data.invitation);
          setFullName(data.invitation.name || '');
          setSkills(Array.isArray(data.invitation.skills) ? data.invitation.skills.join(', ') : '');
          setFetchingInvite(false);
          return;
        }
      }
    } catch {
      // server offline or fallback
    }

    // 2. Check local storage fallback
    const local = getInvitationByToken(tok);
    if (local) {
      setInvitation(local);
      setFullName(local.name || '');
      setSkills(Array.isArray(local.skills) ? local.skills.join(', ') : '');
      setFetchingInvite(false);
      return;
    }

    setFetchError('Invitation token not found or already expired. Please verify your token.');
    setFetchingInvite(false);
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      loadInvitation(tokenInput.trim());
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    setLoading(true);
    const activeAvatar = customAvatar.trim() || avatarUrl;

    try {
      // 1. Send accept to server
      try {
        await fetch('/api/team/accept-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: invitation.token,
            name: fullName.trim() || invitation.name,
            avatarUrl: activeAvatar,
            password,
            skills: skills.split(',').map(s => s.trim()).filter(Boolean),
          }),
        });
      } catch (err) {
        console.warn('Server sync error on invite accept:', err);
      }

      // 2. Complete locally
      const result = acceptCoworkerInvitation(invitation.token, {
        name: fullName.trim() || invitation.name,
        avatarUrl: activeAvatar,
        password,
      });

      if (result) {
        setIsAccepted(true);
        setTimeout(() => {
          onAcceptSuccess(result.userProfile);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative my-8">
        
        {/* Header gradient banner */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase backdrop-blur-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Official Team Invitation
            </span>
          </div>

          <h2 className="text-xl font-bold tracking-tight">Join DataHub Workspace</h2>
          <p className="text-xs text-white/80 mt-1">
            Accept your invitation, set up your real profile, and begin collaborating.
          </p>
        </div>

        {/* Token Input Form if token wasn't provided or failed */}
        {!invitation && (
          <div className="p-6 space-y-4 text-xs">
            {fetchError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{fetchError}</span>
              </div>
            )}

            <form onSubmit={handleManualTokenSubmit} className="space-y-3">
              <label className="font-semibold text-slate-300 block">
                Enter Invitation Token or Code from your email:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. inv_ab12cd34_174000..."
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={fetchingInvite}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {fetchingInvite ? 'Checking...' : 'Verify'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Check your inbox for the invitation email containing your unique access link or code.
              </p>
            </form>
          </div>
        )}

        {/* Invitation Details & Acceptance Form */}
        {invitation && (
          <div className="p-6 space-y-5 text-xs">
            
            {/* Inviter Info Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">
                  Invited By
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {invitation.workspaceName || 'DataHub Analytics Enterprise'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
                  {invitation.inviterName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{invitation.inviterName}</h4>
                  <p className="text-slate-400 text-[11px]">
                    {invitation.inviterRole} · {invitation.inviterEmail}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Role: <strong>{invitation.role}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Dept: <strong>{invitation.department}</strong></span>
                </div>
              </div>

              {invitation.customMessage && (
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 italic text-[11px]">
                  "{invitation.customMessage}"
                </div>
              )}
            </div>

            {/* Profile Setup Form */}
            <form onSubmit={handleAcceptSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Your Full Name</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Real Colleague Identity
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Your Email Address</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 font-mono">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{invitation.email}</span>
                  <span className="ml-auto text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                    Verified
                  </span>
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Choose Profile Photo</span>
                  <span className="text-[10px] text-slate-500">Pick preset or customize</span>
                </label>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((p, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setAvatarUrl(p);
                        setCustomAvatar('');
                      }}
                      className={`relative w-10 h-10 rounded-xl overflow-hidden ring-2 transition-all shrink-0 ${
                        avatarUrl === p && !customAvatar ? 'ring-indigo-500 scale-105' : 'ring-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={p} alt="Preset avatar" className="w-full h-full object-cover" />
                      {avatarUrl === p && !customAvatar && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password / PIN setup */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 flex items-center justify-between">
                  <span>Create Workspace Password or PIN</span>
                  <span className="text-[10px] text-slate-500">Used for signing in later</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter password (e.g. data2026)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pl-8 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Your Analytical Skills (comma-separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                  placeholder="e.g. Time Series, Python, Econometrics, SQL"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || isAccepted}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isAccepted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                      <span>Invitation Accepted! Activating Profile...</span>
                    </>
                  ) : loading ? (
                    <span>Joining Workspace...</span>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Accept Invitation & Join Team</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        )}

      </div>
    </div>
  );
};
