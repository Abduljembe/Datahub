import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Building,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  X,
  MapPin,
  Clock,
  UserCheck,
  TrendingUp,
  FileText,
  Presentation,
  Terminal,
  Zap,
  Lock,
  Radio,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Dataset, AppTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { simulateFieldToSupervisorToAdminFlow } from '../../utils/countySupervisorEngine';

interface FieldToBoardroomTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset | null;
  onAppendRowsToActive: (newRows: Record<string, any>[]) => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenSlideDeck?: () => void;
  onOpenCopilot?: () => void;
}

export const FieldToBoardroomTourModal: React.FC<FieldToBoardroomTourModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onAppendRowsToActive,
  onNavigateTab,
  onOpenSlideDeck,
  onOpenCopilot
}) => {
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [simulatedBatch, setSimulatedBatch] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIsPlayingAuto(false);
      // Generate a fresh simulated batch
      const sim = simulateFieldToSupervisorToAdminFlow('Nairobi');
      setSimulatedBatch(sim);
    }
  }, [isOpen]);

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAuto && currentStep < 4) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 3500);
    } else if (isPlayingAuto && currentStep === 4) {
      setIsPlayingAuto(false);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {}
    }
    return () => clearTimeout(timer);
  }, [isPlayingAuto, currentStep]);

  if (!isOpen) return null;

  const handleExecuteAdminIngest = () => {
    if (simulatedBatch && simulatedBatch.flatData) {
      onAppendRowsToActive(simulatedBatch.flatData);
    }
    setCurrentStep(4);
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {}
  };

  const steps = [
    {
      num: 1,
      role: 'Field Enumerator',
      title: 'Mobile Survey & Geolocation Capture',
      icon: Smartphone,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/30',
      description: 'Field officer captures live survey entries, GPS coordinates, respondent consent, and audio debriefs in real time.'
    },
    {
      num: 2,
      role: 'Lead Field Supervisor',
      title: 'Fraud Shield Audit & Quality Standardization',
      icon: ShieldCheck,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/30',
      description: 'Supervisor audits duplicate submissions, validates GPS geofences, executes cleaning recipes, and generates signed batch dispatch.'
    },
    {
      num: 3,
      role: 'Central Office Admin',
      title: 'County Dispatch Ingestion & Governance',
      icon: Building,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10 border-indigo-500/30',
      description: 'Central platform authority reviews regional quota fulfillment and ingests certified records into the live study dataset.'
    },
    {
      num: 4,
      role: 'Executive Intelligence',
      title: 'AI Synthesis & Boardroom Presentation',
      icon: Sparkles,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      description: 'Gemini Copilot analyzes variance drivers, trends, and compiles an executive presentation slide deck for decision-makers.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`px-6 py-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight text-white">
                  60-Second "Field-to-Boardroom" Simulator
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Interactive Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Watch raw field respondent data travel from an enumerator's smartphone to executive boardroom slides.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlayingAuto(!isPlayingAuto)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isPlayingAuto
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isPlayingAuto ? 'animate-spin' : ''}`} />
              <span>{isPlayingAuto ? 'Auto Playing...' : 'Auto Run Pipeline'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Stepper Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between gap-2 overflow-x-auto">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isActive = currentStep === st.num;
            const isCompleted = currentStep > st.num;

            return (
              <React.Fragment key={st.num}>
                <button
                  onClick={() => {
                    setIsPlayingAuto(false);
                    setCurrentStep(st.num);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isActive
                      ? `${st.bgColor} ${st.color} font-bold shadow-xs`
                      : isCompleted
                      ? 'text-emerald-400 bg-slate-900'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.num}
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="block text-[10px] uppercase font-mono opacity-70">{st.role}</span>
                    <span className="block text-xs font-bold truncate max-w-[140px]">{st.title}</span>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-700 shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Active Stage Simulation Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STAGE 1: ENUMERATOR */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-cyan-400 mt-1 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-cyan-200">
                    Stage 1: Frontline Field Data Capture
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Field enumerator <strong>Farhan Malik (Badge #EN-402)</strong> is conducting survey interviews in <strong>Nairobi County (Westlands Sub-County)</strong>.
                  </p>
                </div>
              </div>

              {/* Simulated Device Screen Mockup */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900 max-w-xl mx-auto shadow-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    GPS Signal Locked: -1.2864, 36.8172 (±2.8m accuracy)
                  </span>
                  <span>11:42 AM</span>
                </div>

                <div className="space-y-2 text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Respondent ID:</span>
                    <span className="font-bold text-white">RESP-88419 (Household #204)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-cyan-300 font-bold">Agricultural Commodities & Retail</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Reported Monthly Revenue:</span>
                    <span className="text-emerald-400 font-bold">KES 38,500.00</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400">Satisfaction Score:</span>
                    <span className="text-amber-400 font-bold">4.8 / 5.0 (High Confidence)</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between">
                  <span>Cryptographic Hash Signed: sha256:d8a2...3f1</span>
                  <span className="font-bold">STATUS: QUEUED</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-600/25 transition-all"
                >
                  <span>Transmit to Field Supervisor Queue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: SUPERVISOR */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-400 mt-1 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-purple-200">
                    Stage 2: Regional Supervisor Fraud Shield & Auto-Clean
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Lead Supervisor <strong>Dr. Elena Rostova (County Lead)</strong> reviews the incoming batch, checks GPS speed anomaly limits, runs automated cleaning recipes, and generates the cryptographic dispatch.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>GPS Geofence Match</span>
                  </div>
                  <p className="text-[11px] text-slate-400">All submissions verified within allocated Westlands sub-county boundaries.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fraud Shield Passed</span>
                  </div>
                  <p className="text-[11px] text-slate-400">0 duplicate respondent IDs; enumerator transit velocity: 14 km/h (normal range).</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cleaning Recipe Applied</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Currency strings stripped, timestamps standardized, and outliers winsorized.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">Supervisor Digital Sign-off:</span>
                <p className="text-slate-300 italic">
                  "Batch certified: 5 live surveys completed by Farhan Malik. Geofence verified, audio consent affirmed, quality score: 98.4%. Dispatched to Central Admin."
                </p>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
                >
                  <span>Dispatch Verified Batch to Central Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: ADMIN INGESTION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
                <Building className="w-5 h-5 text-indigo-400 mt-1 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-indigo-200">
                    Stage 3: Central Office Admin Ingestion
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Central Admin inspects incoming dispatches across all 47 counties. Ingesting this batch merges the certified records directly into the active research dataset.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800 pb-2">
                  <span>Batch Dispatch ID: #DISPATCH-NRB-2026-088</span>
                  <span className="text-emerald-400 font-bold">READY FOR INGESTION</span>
                </div>

                <div className="flex items-center justify-between text-xs text-white">
                  <span>Target Dataset:</span>
                  <span className="font-bold text-cyan-400">{dataset?.name || 'Default Research Study'}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-white">
                  <span>Incoming Certified Records:</span>
                  <span className="font-bold text-emerald-400">+5 Verified Field Responses</span>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={handleExecuteAdminIngest}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ingest Into Master Study Dataset</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: EXECUTIVE AI & SLIDE DECK */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 mt-1 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-amber-200">
                    Stage 4: Executive Synthesis & Boardroom Presentation
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Data ingestion complete! The full field-to-boardroom lifecycle has finished. Gemini AI has processed statistical variance drivers, and the executive slide deck is compiled.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1">
                      <Presentation className="w-4 h-4" />
                      <span>Executive Slide Deck</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Auto-generated boardroom presentation with KPI scorecards, regional breakdowns, and strategic action plans.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenSlideDeck) onOpenSlideDeck();
                    }}
                    className="mt-3 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Launch Executive Slide Deck</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
                      <Sparkles className="w-4 h-4" />
                      <span>Gemini Statistical Copilot</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Query your live dataset in natural language, uncover correlation drivers, and generate clean reports.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenCopilot) onOpenCopilot();
                    }}
                    className="mt-3 py-2 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Ask Gemini Copilot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Return to Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-3.5 border-t flex items-center justify-between shrink-0 text-xs ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <span>Step {currentStep} of 4: {steps[currentStep - 1].title}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(1)}
              className="text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restart Tour</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
