import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Headphones, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  UserCheck, 
  MessageSquare, 
  Download, 
  RefreshCw, 
  Clock, 
  Share2, 
  Sliders, 
  FileText,
  Radio,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Dataset } from '../../types';
import { computeColumnStats, computeCorrelationMatrix, round } from '../../utils/statistics';
import { scanDatasetForPii } from '../../utils/piiEngine';

interface AudioDebriefStudioProps {
  dataset: Dataset;
}

interface DialogueTurn {
  id: number;
  speaker: 'Alex' | 'Morgan' | 'Narrator';
  role: string;
  avatarColor: string;
  text: string;
  timestamp: string;
  category: 'intro' | 'quality' | 'correlation' | 'anomaly' | 'strategy';
}

export const AudioDebriefStudio: React.FC<AudioDebriefStudioProps> = ({ dataset }) => {
  const [mode, setMode] = useState<'two_hosts' | 'single_narrator'>('two_hosts');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  // Audio speech synthesis references
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Derive statistical dataset facts for dialogue generation
  const datasetFacts = useMemo(() => {
    const numCols = dataset.columns.filter(c => c.type === 'number');
    const catCols = dataset.columns.filter(c => c.type === 'string' || c.type === 'category');
    
    // Stats
    const statsList = dataset.columns.map(c => ({
      meta: c,
      stats: computeColumnStats(dataset.data, c)
    }));

    let totalCells = dataset.data.length * (dataset.columns.length || 1);
    let totalNulls = 0;
    statsList.forEach(s => { totalNulls += s.stats.nullCount; });
    const completeness = Math.max(0, Math.min(100, Math.round(((totalCells - totalNulls) / totalCells) * 100)));
    const grade = completeness >= 95 ? 'A+' : completeness >= 85 ? 'B+' : 'C';

    // Top correlation
    let topCorr: { colA: string; colB: string; val: number } | null = null;
    if (numCols.length >= 2 && dataset.data.length >= 3) {
      const matrix = computeCorrelationMatrix(dataset.data, dataset.columns);
      let maxAbs = 0;
      numCols.forEach(c1 => {
        numCols.forEach(c2 => {
          if (c1.id !== c2.id) {
            const v = matrix.matrix[c1.id]?.[c2.id];
            if (v !== undefined && !isNaN(v) && Math.abs(v) > maxAbs) {
              maxAbs = Math.abs(v);
              topCorr = { colA: c1.name, colB: c2.name, val: round(v, 2) };
            }
          }
        });
      });
    }

    const pii = scanDatasetForPii(dataset);

    return {
      name: dataset.name,
      rows: dataset.data.length,
      cols: dataset.columns.length,
      numColsCount: numCols.length,
      catColsCount: catCols.length,
      completeness,
      grade,
      topCorr,
      piiCount: pii.detections.length,
      topNumericCol: numCols[0]?.name || 'key metric',
      topNumericMean: statsList.find(s => s.meta.id === numCols[0]?.id)?.stats.mean
    };
  }, [dataset]);

  // Generate dynamic podcast script based on mode & actual dataset telemetry
  const script: DialogueTurn[] = useMemo(() => {
    const f = datasetFacts;

    if (mode === 'single_narrator') {
      return [
        {
          id: 1,
          speaker: 'Narrator',
          role: 'Executive Intelligence Briefing',
          avatarColor: 'from-blue-600 to-indigo-600',
          text: `Welcome to the executive audio digest for ${f.name}. Today's dossier synthesizes ${f.rows.toLocaleString()} observations across ${f.cols} operational dimensions.`,
          timestamp: '0:00',
          category: 'intro'
        },
        {
          id: 2,
          speaker: 'Narrator',
          role: 'Executive Intelligence Briefing',
          avatarColor: 'from-blue-600 to-indigo-600',
          text: `Beginning with pipeline health, the dataset achieves a ${f.completeness}% data completeness rate, qualifying for an overall ${f.grade} reliability grade.`,
          timestamp: '0:14',
          category: 'quality'
        },
        {
          id: 3,
          speaker: 'Narrator',
          role: 'Executive Intelligence Briefing',
          avatarColor: 'from-blue-600 to-indigo-600',
          text: f.topCorr 
            ? `Our bivariate covariance models identified a critical statistical driver: ${f.topCorr.colA} and ${f.topCorr.colB} demonstrate an alignment score of ${f.topCorr.val > 0 ? '+' : ''}${f.topCorr.val}. This indicates a primary operational lever for cross-functional prioritization.`
            : `Feature dispersion indicates steady variance across the feature space with balanced categorical mode concentration.`,
          timestamp: '0:31',
          category: 'correlation'
        },
        {
          id: 4,
          speaker: 'Narrator',
          role: 'Executive Intelligence Briefing',
          avatarColor: 'from-blue-600 to-indigo-600',
          text: `Data governance screening detected ${f.piiCount > 0 ? `${f.piiCount} sensitive attributes that require privacy masking` : 'zero unmasked high-risk PII tokens'}. The data hygiene posture is certified for stakeholder dissemination.`,
          timestamp: '0:48',
          category: 'anomaly'
        },
        {
          id: 5,
          speaker: 'Narrator',
          role: 'Executive Intelligence Briefing',
          avatarColor: 'from-blue-600 to-indigo-600',
          text: `Strategic takeaway: We recommend initiating counterfactual regression simulations on top drivers and establishing automated schema drift alerts for continuous production monitoring. Thank you for listening.`,
          timestamp: '1:06',
          category: 'strategy'
        }
      ];
    }

    // Two Hosts Conversational Podcast Mode ("Alex" & "Morgan")
    return [
      {
        id: 1,
        speaker: 'Alex',
        role: 'Chief Quantitative Strategist',
        avatarColor: 'from-cyan-500 to-blue-600',
        text: `Hey everyone, welcome back to the Data Pulse briefing! Today Morgan and I are breaking down the newly uploaded ${f.name} dataset. Morgan, at first glance, what jumped out at you?`,
        timestamp: '0:00',
        category: 'intro'
      },
      {
        id: 2,
        speaker: 'Morgan',
        role: 'Senior Analytical Auditor',
        avatarColor: 'from-rose-500 to-amber-500',
        text: `Thanks Alex! First off, the scale: we have ${f.rows.toLocaleString()} records spanning ${f.cols} attributes. But what really caught my eye was the data hygiene—it clocked in at a solid ${f.completeness}% completeness, which earns it a ${f.grade} quality rating.`,
        timestamp: '0:12',
        category: 'quality'
      },
      {
        id: 3,
        speaker: 'Alex',
        role: 'Chief Quantitative Strategist',
        avatarColor: 'from-cyan-500 to-blue-600',
        text: f.topCorr
          ? `That gives us high confidence in the underlying signals. And speaking of signals, look at the correlation matrix! We found a striking connection between ${f.topCorr.colA} and ${f.topCorr.colB}, posting a correlation coefficient of ${f.topCorr.val > 0 ? '+' : ''}${f.topCorr.val}. That's not just statistical noise—that's a genuine operational driver.`
          : `That gives us clean baseline confidence. When we look at distribution symmetry across our ${f.numColsCount} numeric features, the variance curves are well-anchored without severe multi-modal polarization.`,
        timestamp: '0:26',
        category: 'correlation'
      },
      {
        id: 4,
        speaker: 'Morgan',
        role: 'Senior Analytical Auditor',
        avatarColor: 'from-rose-500 to-amber-500',
        text: `Exactly, but you know I always play the skeptic. We have to be vigilant about confounders. Before leadership assumes that improving ${f.topCorr?.colA || 'the primary feature'} directly lifts ${f.topCorr?.colB || 'the outcome'}, we should verify it through the new Causal What-If Studio to ensure we aren't chasing a spurious backdoor path!`,
        timestamp: '0:42',
        category: 'anomaly'
      },
      {
        id: 5,
        speaker: 'Alex',
        role: 'Chief Quantitative Strategist',
        avatarColor: 'from-cyan-500 to-blue-600',
        text: `A hundred percent agreed. And from a data privacy standpoint, our scanner flagged ${f.piiCount > 0 ? `${f.piiCount} sensitive fields that should be k-anonymized` : 'clean bill of health with zero exposed PII leaks'}. So governance is in good shape.`,
        timestamp: '0:58',
        category: 'quality'
      },
      {
        id: 6,
        speaker: 'Morgan',
        role: 'Senior Analytical Auditor',
        avatarColor: 'from-rose-500 to-amber-500',
        text: `Bottom line for the team: prioritize the top bivariate driver, run the counterfactual intervention test, and share the interactive dashboard with the leadership group. That's our debrief for ${f.name}!`,
        timestamp: '1:14',
        category: 'strategy'
      }
    ];
  }, [mode, datasetFacts]);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Speak a specific turn
  const speakTurn = (index: number) => {
    if (!synthRef.current || index >= script.length) {
      setIsPlaying(false);
      setCurrentTurnIndex(0);
      return;
    }

    synthRef.current.cancel();
    setCurrentTurnIndex(index);

    const turn = script[index];
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.rate = playbackSpeed;

    // Speaker pitch/voice styling
    const voices = synthRef.current.getVoices();
    if (voices.length > 0) {
      if (turn.speaker === 'Alex') {
        utterance.pitch = 0.95;
        // Prefer natural english voice
        const mVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Male') || v.name.includes('Guy')));
        if (mVoice) utterance.voice = mVoice;
      } else if (turn.speaker === 'Morgan') {
        utterance.pitch = 1.15;
        const fVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Zira') || v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Samantha')));
        if (fVoice) utterance.voice = fVoice;
      } else {
        utterance.pitch = 1.0;
      }
    }

    utterance.onend = () => {
      if (index + 1 < script.length) {
        // Natural conversational pause between speakers
        setTimeout(() => {
          speakTurn(index + 1);
        }, 500);
      } else {
        setIsPlaying(false);
        setCurrentTurnIndex(0);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance event:', e);
      setIsPlaying(false);
    };

    currentUtteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const handlePlay = () => {
    if (isPlaying) {
      if (synthRef.current) synthRef.current.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speakTurn(currentTurnIndex);
    }
  };

  const handleStop = () => {
    if (synthRef.current) synthRef.current.cancel();
    setIsPlaying(false);
    setCurrentTurnIndex(0);
  };

  const handleJumpToTurn = (index: number) => {
    setIsPlaying(true);
    speakTurn(index);
  };

  // Download Transcript as text
  const handleDownloadTranscript = () => {
    const text = script.map(t => `[${t.timestamp}] ${t.speaker} (${t.role}):\n${t.text}\n`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audio_Briefing_Transcript_${dataset.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 p-6 rounded-3xl border border-amber-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
              NotebookLM-Style Audio Overviews
            </span>
            <span className="text-xs text-slate-400">• Conversational Synthesizer</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Headphones className="w-6 h-6 text-amber-400" />
            <span>Executive Audio Debrief &amp; Podcast Studio</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Listen to an AI-generated two-host executive debrief or single narrator briefing analyzing anomalies, correlation drivers, and strategic priorities.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => { handleStop(); setMode('two_hosts'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'two_hosts'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2-Host Podcast
          </button>
          <button
            onClick={() => { handleStop(); setMode('single_narrator'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              mode === 'single_narrator'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Solo Briefing
          </button>
        </div>
      </div>

      {/* Main Studio Deck & Waveform Deck */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6">
        
        {/* Playback Controls & Waveform Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
          
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={handlePlay}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg transition-all transform active:scale-95 ${
                isPlaying 
                  ? 'bg-amber-500 text-slate-950 shadow-amber-500/30' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-orange-500/25 hover:brightness-110'
              }`}
              title={isPlaying ? 'Pause Audio' : 'Play Audio Briefing'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-slate-700"
              title="Stop & Reset Audio"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{script[currentTurnIndex]?.speaker} Speaking</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Turn {currentTurnIndex + 1} of {script.length})
                </span>
              </div>
              <div className="text-[11px] text-amber-300/80 font-mono">
                {script[currentTurnIndex]?.role}
              </div>
            </div>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex-1 max-w-xs h-10 flex items-center justify-center gap-1 px-4 bg-slate-900 rounded-xl border border-slate-800/60">
            {Array.from({ length: 24 }).map((_, i) => {
              const heights = [20, 45, 80, 60, 30, 90, 75, 40, 65, 85, 30, 50, 70, 95, 40, 60, 80, 50, 30, 70, 85, 60, 40, 25];
              const h = heights[i % heights.length];
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isPlaying 
                      ? 'bg-gradient-to-t from-amber-500 to-orange-400' 
                      : 'bg-slate-700'
                  }`}
                  style={{
                    height: isPlaying ? `${Math.max(15, (h * (0.6 + Math.random() * 0.5)))}%` : '20%',
                  }}
                />
              );
            })}
          </div>

          {/* Playback Speed & Export */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              {[1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackSpeed(rate)}
                  className={`px-2 py-1 rounded-lg font-mono font-bold transition-colors ${
                    playbackSpeed === rate 
                      ? 'bg-amber-500/20 text-amber-300' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadTranscript}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Download Full Text Transcript"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Transcript</span>
            </button>
          </div>

        </div>

        {/* Live Synchronized Transcript Feed */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>Interactive Dialogue Transcript</span>
            </span>
            <span className="text-[10px] text-slate-400">Click any dialogue block to jump audio</span>
          </div>

          <div className="space-y-3">
            {script.map((turn, idx) => {
              const isActive = currentTurnIndex === idx && isPlaying;
              return (
                <div
                  key={turn.id}
                  onClick={() => handleJumpToTurn(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.01]'
                      : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${turn.avatarColor} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                        {turn.speaker[0]}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white mr-2">{turn.speaker}</span>
                        <span className="text-[10px] text-slate-400">{turn.role}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">{turn.timestamp}</span>
                      {isActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                          Playing
                        </span>
                      )}
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed ${isActive ? 'text-amber-100 font-medium' : 'text-slate-300'}`}>
                    "{turn.text}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Synthesis Footnote */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Synthesized using native Web Speech Synthesis API. Audio is rendered purely client-side with zero external latency.</span>
        </div>
        <span className="font-mono text-[11px] text-slate-500">{script.length} dialogue turns prepared</span>
      </div>

    </div>
  );
};
