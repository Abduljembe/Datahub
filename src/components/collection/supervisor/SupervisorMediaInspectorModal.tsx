// Multimedia & Audio / Geotagged Photo Verification Inspector Modal
import React, { useState, useEffect } from 'react';
import {
  Mic,
  Camera,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileAudio,
  Image,
  MapPin,
  Clock,
  ShieldCheck,
  Download,
  Eye,
  Maximize2
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { SupervisorSubmission } from '../../../utils/supervisorEngine';

interface SupervisorMediaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: SupervisorSubmission | null;
  onApproveMedia?: (submissionId: string) => void;
  onRejectMedia?: (submissionId: string, reason: string) => void;
}

export const SupervisorMediaInspectorModal: React.FC<SupervisorMediaInspectorModalProps> = ({
  isOpen,
  onClose,
  submission,
  onApproveMedia,
  onRejectMedia
}) => {
  const { isDark } = useTheme();

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Simulated audio playback progress loop
  useEffect(() => {
    let timer: any;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 5;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio]);

  if (!isOpen || !submission) return null;

  // Mock EXIF and media details
  const mediaPhotos = [
    {
      id: 'photo_1',
      title: 'Farmer Crop Canopy & Soil Plot #A1',
      type: 'On-Site Plot Verification',
      url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&auto=format&fit=crop&q=80',
      exif: {
        camera: 'Samsung Galaxy Tab Active4 Pro',
        focalLength: '26mm f/1.8',
        iso: 100,
        exposure: '1/450s',
        gpsLat: submission.gps?.lat || 37.7749,
        gpsLng: submission.gps?.lng || -122.4194,
        capturedAt: submission.collectedAt,
        gpsMatch: true
      }
    },
    {
      id: 'photo_2',
      title: 'Household Homestead Perimeter Entrance',
      type: 'Dwelling Verification',
      url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
      exif: {
        camera: 'Samsung Galaxy Tab Active4 Pro',
        focalLength: '26mm f/1.8',
        iso: 125,
        exposure: '1/320s',
        gpsLat: (submission.gps?.lat || 37.7749) + 0.0001,
        gpsLng: (submission.gps?.lng || -122.4194) + 0.0001,
        capturedAt: submission.collectedAt,
        gpsMatch: true
      }
    }
  ];

  const currentPhoto = mediaPhotos[selectedPhotoIndex] || mediaPhotos[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border overflow-hidden flex flex-col shadow-2xl ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Multimedia & Biometric Evidence Inspector</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300">
                  {submission.submissionCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Enumerator: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{submission.enumeratorName}</strong> • Campaign: {submission.campaign}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Audio Snippet Verification Player */}
          <div className={`p-5 rounded-2xl border ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          } space-y-4`}>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-400" />
                <h4 className="text-sm font-bold">Ambient Interview Audio Recording (15.4s)</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                VERIFIED VOICE DETECTED
              </span>
            </div>

            {/* Audio Waveform & Player */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="w-12 h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg transition-all"
              >
                {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1.5">
                <div className="h-8 flex items-center gap-1">
                  {[40, 65, 80, 45, 90, 75, 30, 85, 95, 60, 50, 70, 85, 40, 60, 75, 90, 65, 50, 80, 45, 60, 30, 20].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-200 ${
                        (i / 24) * 100 <= audioProgress ? 'bg-purple-500' : isDark ? 'bg-slate-800' : 'bg-slate-300'
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>00:{(Math.round((audioProgress / 100) * 15)).toString().padStart(2, '0')}</span>
                  <span>00:15 / 44.1kHz AAC HQ</span>
                </div>
              </div>
            </div>

            {/* Automatic AI Speech-to-Text snippet */}
            <div className={`p-3 rounded-xl text-xs border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Transcript Confidence (94% Match with Questionnaire):
              </span>
              <p className="text-slate-300 italic">
                "...Farmer confirmed last season harvest was thirty-five bags of maize and soil testing kit was applied on the northern quadrant..."
              </p>
            </div>

          </div>

          {/* Geotagged Photo & EXIF Metadata Inspector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Photo Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Geotagged Photo Proof</h4>
                <div className="flex gap-1.5">
                  {mediaPhotos.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        selectedPhotoIndex === idx
                          ? 'bg-purple-600 text-white'
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Photo #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-video group">
                <img
                  src={currentPhoto.url}
                  alt={currentPhoto.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                  <div>
                    <span className="text-xs font-bold text-white block">{currentPhoto.title}</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      EXIF Geotag Integrity Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* EXIF Metadata Table */}
            <div className={`p-4 rounded-2xl border space-y-3 ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span>EXIF Telemetry & Sensor Audit</span>
              </h4>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Capture Device:</span>
                  <span className="font-bold">{currentPhoto.exif.camera}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Optics:</span>
                  <span>{currentPhoto.exif.focalLength} • ISO {currentPhoto.exif.iso}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">EXIF GPS Coordinates:</span>
                  <span className="text-indigo-400 font-bold">
                    {currentPhoto.exif.gpsLat.toFixed(5)}°, {currentPhoto.exif.gpsLng.toFixed(5)}°
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">GPS Timestamp Match:</span>
                  <span className="text-emerald-400 font-bold">100% Sync with Form Submission</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Tamper Status:</span>
                  <span className="text-emerald-400 font-bold">No Retouching / Original Sensor Raw</span>
                </div>
              </div>

              <div className="pt-2">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Geotag aligns perfectly with assigned field perimeter (Zone A).</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="text-xs text-slate-400">
            Audit ID: <span className="font-mono text-indigo-400">MEDIA-AUDIT-{submission.id}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (onApproveMedia) onApproveMedia(submission.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Pass Multimedia Evidence</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
