import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  Navigation,
  Battery,
  BatteryCharging,
  Send,
  MapPin,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Volume2,
  Copy,
  Check,
  Radio,
  QrCode,
  Sparkles,
  Compass,
  AlertTriangle
} from 'lucide-react';
import {
  EnumeratorAgent,
  sendLocationBeacon,
  recordFieldSubmission,
  updateEnumeratorStatus
} from '../../utils/enumeratorFleetEngine';
import { ingestEnumeratorSubmissionToVault } from '../../utils/supervisorEngine';

interface EnumeratorFieldPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: EnumeratorAgent;
  onSubmissionsUpdated?: () => void;
}

export const EnumeratorFieldPortalModal: React.FC<EnumeratorFieldPortalModalProps> = ({
  isOpen,
  onClose,
  agent,
  onSubmissionsUpdated,
}) => {
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [currentLat, setCurrentLat] = useState<number>(agent.lat);
  const [currentLng, setCurrentLng] = useState<number>(agent.lng);
  const [accuracy, setAccuracy] = useState<number>(agent.accuracy || 4);
  const [speed, setSpeed] = useState<number>(agent.speed || 0);
  const [batteryLevel, setBatteryLevel] = useState<number>(agent.batteryLevel || 88);
  const [isSosActive, setIsSosActive] = useState(agent.status === 'sos');
  const [lastBeaconTime, setLastBeaconTime] = useState<string | null>(null);
  
  // Field Form Submission State
  const [surveyTitle, setSurveyTitle] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [surveyNotes, setSurveyNotes] = useState('');
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const beaconIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Link for direct mobile access
  const directMobileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?mode=field_collector&enum_id=${agent.id}&name=${encodeURIComponent(agent.name)}`
    : '';

  useEffect(() => {
    if (isOpen) {
      setCurrentLat(agent.lat);
      setCurrentLng(agent.lng);
      setIsSosActive(agent.status === 'sos');
      setSurveyTitle(`Household Assessment #${Math.floor(100 + Math.random() * 900)}`);
      setHouseholdId(`HH-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [isOpen, agent]);

  // Clean up GPS watch on unmount or close
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (beaconIntervalRef.current) {
        clearInterval(beaconIntervalRef.current);
        beaconIntervalRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  // Toggle Live Mobile Device GPS Transmission
  const toggleGpsBroadcast = () => {
    if (isGpsActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (beaconIntervalRef.current) {
        clearInterval(beaconIntervalRef.current);
        beaconIntervalRef.current = null;
      }
      setIsGpsActive(false);
    } else {
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported in this browser environment.');
        return;
      }

      setIsGpsActive(true);

      // Start watching live position
      const wid = navigator.geolocation.watchPosition(
        async pos => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy);
          const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
          const alt = pos.coords.altitude ? Math.round(pos.coords.altitude) : null;
          const hdg = pos.coords.heading ? Math.round(pos.coords.heading) : 0;

          setCurrentLat(lat);
          setCurrentLng(lng);
          setAccuracy(acc);
          setSpeed(spd);

          await sendLocationBeacon({
            id: agent.id,
            name: agent.name,
            email: agent.email,
            role: agent.role,
            campaign: agent.campaign,
            assignedZone: agent.assignedZone,
            lat,
            lng,
            accuracy: acc,
            altitude: alt,
            speed: spd,
            heading: hdg,
            batteryLevel,
            status: isSosActive ? 'sos' : 'collecting'
          });

          setLastBeaconTime(new Date().toLocaleTimeString());
          onSubmissionsUpdated?.();
        },
        err => {
          console.warn('Geolocation watch error:', err);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );

      watchIdRef.current = wid;

      // Periodic safety beacon every 6 seconds
      beaconIntervalRef.current = setInterval(async () => {
        await sendLocationBeacon({
          id: agent.id,
          name: agent.name,
          lat: currentLat,
          lng: currentLng,
          accuracy,
          speed,
          batteryLevel,
          status: isSosActive ? 'sos' : 'collecting'
        });
        setLastBeaconTime(new Date().toLocaleTimeString());
        onSubmissionsUpdated?.();
      }, 6000);
    }
  };

  // Submit survey pin from mobile field portal
  const handleLogSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyTitle.trim()) return;

    setIsSubmittingSurvey(true);
    try {
      const recordTitle = `${surveyTitle.trim()} (${householdId || 'Direct Field'})`;
      await recordFieldSubmission(agent.id, recordTitle, currentLat, currentLng);
      
      // Ingest directly into Central Supervisor Vault
      ingestEnumeratorSubmissionToVault(
        { ...agent, lat: currentLat, lng: currentLng, accuracy },
        {
          survey_title: surveyTitle.trim(),
          respondent_id: householdId || `HH-${Math.floor(1000 + Math.random() * 9000)}`,
          observations: surveyNotes || 'Standard field interview conducted',
          verification_status: 'field_collected',
          battery_pct: batteryLevel
        },
        280, // dwell time seconds
        1
      );

      setSubmissionSuccessMsg(`Survey logged and transmitted to Supervisor Vault at ${currentLat.toFixed(5)}°, ${currentLng.toFixed(5)}°!`);
      setSurveyTitle(`Household Assessment #${Math.floor(100 + Math.random() * 900)}`);
      setHouseholdId(`HH-${Math.floor(1000 + Math.random() * 9000)}`);
      setSurveyNotes('');
      onSubmissionsUpdated?.();

      setTimeout(() => setSubmissionSuccessMsg(null), 4000);
    } finally {
      setIsSubmittingSurvey(false);
    }
  };

  // Toggle SOS Panic Beacon
  const toggleSos = async () => {
    const nextSos = !isSosActive;
    setIsSosActive(nextSos);
    await updateEnumeratorStatus(agent.id, nextSos ? 'sos' : 'collecting', nextSos ? 'Emergency SOS triggered from Mobile Field Device' : 'Cleared emergency alert');
    onSubmissionsUpdated?.();
  };

  const copyMobileLink = () => {
    navigator.clipboard.writeText(directMobileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Mobile Device Header Shell */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Mobile Field Officer Portal (Live Device)</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowQr(!showQr)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs"
              title="Show QR Code for phone scan"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Mobile Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          
          {/* Direct Share Link Ribbon */}
          <div className="p-2.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-2 text-[11px]">
            <span className="text-indigo-300 truncate">Open on real mobile smartphone:</span>
            <button
              onClick={copyMobileLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* QR Code Expansion */}
          {showQr && (
            <div className="p-4 rounded-2xl bg-white text-slate-900 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-36 h-36 mx-auto bg-slate-100 rounded-xl border-2 border-slate-300 flex items-center justify-center p-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(directMobileUrl)}`}
                  alt="QR code for mobile field collector"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[11px] font-bold text-slate-800">Scan with your Phone Camera</p>
              <p className="text-[10px] text-slate-600">Opens the live GPS enumerator transmitter directly on any iOS or Android phone.</p>
            </div>
          )}

          {/* Live Device Telemetry HUD */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Navigation className={`w-3.5 h-3.5 ${isGpsActive ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} />
                <span>Live Satellite Beacon</span>
              </span>
              <button
                onClick={toggleGpsBroadcast}
                className={`px-3 py-1 rounded-full font-bold text-[10px] transition-all border ${
                  isGpsActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                }`}
              >
                {isGpsActive ? 'Transmitting Live' : 'Start GPS Broadcast'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500">Coordinates</div>
                <div className="text-white font-bold">{currentLat.toFixed(4)}°, {currentLng.toFixed(4)}°</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500">Accuracy & Speed</div>
                <div className="text-cyan-300 font-bold">±{accuracy}m • {speed} km/h</div>
              </div>
            </div>

            {lastBeaconTime && (
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>Last beacon transmitted:</span>
                <span className="font-mono text-emerald-400 font-bold">{lastBeaconTime}</span>
              </div>
            )}
          </div>

          {/* Supervisor Instructions & Direct Dispatch Notice */}
          {agent.notes && (
            <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1 text-[11px] text-indigo-400">
                <Radio className="w-3.5 h-3.5" />
                <span>Supervisor Dispatch Message:</span>
              </div>
              <p className="text-[11px] font-medium">{agent.notes}</p>
            </div>
          )}

          {/* Instant Field Survey Logger Form */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Log Field Survey Record</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-mono">
                {agent.surveysCollectedToday} Today
              </span>
            </div>

            {submissionSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submissionSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogSurvey} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Survey Title / Questionnaire Name</label>
                <input
                  type="text"
                  required
                  value={surveyTitle}
                  onChange={e => setSurveyTitle(e.target.value)}
                  placeholder="e.g. Household Crop Yield & Soil Audit"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Household / Unit ID</label>
                  <input
                    type="text"
                    value={householdId}
                    onChange={e => setHouseholdId(e.target.value)}
                    placeholder="e.g. HH-409"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Assigned Zone</label>
                  <input
                    type="text"
                    disabled
                    value={agent.assignedZone}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs truncate"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingSurvey}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmittingSurvey ? 'Submitting Pin...' : 'Submit Field Record & GPS Pin'}</span>
              </button>
            </form>
          </div>

          {/* Emergency Panic SOS Button */}
          <div className="pt-1">
            <button
              onClick={toggleSos}
              className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                isSosActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isSosActive ? 'Cancel / Resolve Emergency SOS' : '🚨 EMERGENCY SOS PANIC BEACON'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
