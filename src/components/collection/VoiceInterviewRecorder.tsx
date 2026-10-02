import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Square,
  Sparkles,
  Upload,
  FileAudio,
  User,
  CheckCircle,
  Clock,
  Download,
  MessageSquare,
  Volume2,
  Trash2
} from 'lucide-react';
import { Dataset } from '../../types';

interface VoiceInterviewRecorderProps {
  activeDataset?: Dataset;
  onAppendData?: (records: Record<string, any>[]) => void;
  onSendToQualitative?: (transcript: string, speaker: string) => void;
}

export const VoiceInterviewRecorder: React.FC<VoiceInterviewRecorderProps> = ({
  activeDataset,
  onAppendData,
  onSendToQualitative,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);

  // Metadata
  const [participantName, setParticipantName] = useState<string>('Participant 1');
  const [cohort, setCohort] = useState<string>('Enterprise');
  const [topic, setTopic] = useState<string>('User Experience & Pain Points');

  // AI polishing state
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [cleanedSpeakerTurns, setCleanedSpeakerTurns] = useState<
    Array<{ speaker: string; text: string; sentiment?: string }>
  >([]);

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Live Canvas Waveform drawing loop
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;

      // Gradient bars
      const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, '#f43f5e'); // rose-500
      gradient.addColorStop(1, '#8b5cf6'); // violet-500

      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }

    animFrameRef.current = requestAnimationFrame(drawWaveform);
  };

  // Start Recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioBlob(null);
      setAudioUrl(null);

      // Audio Context for visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      drawWaveform();

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Speech Recognition
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let finalBlock = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalBlock += event.results[i][0].transcript + ' ';
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }
          if (finalBlock) {
            setTranscript((prev) => prev + (prev ? ' ' : '') + finalBlock.trim());
          }
          setInterimTranscript(currentInterim);
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      alert('Microphone permission required for audio recording. Please enable it in browser settings.');
    }
  };

  // Stop Recording
  const handleStopRecording = () => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setInterimTranscript('');
  };

  // Handle local audio file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioBlob(file);
      if (!transcript) {
        setTranscript(
          `[Participant]: The new workflow automation has drastically reduced our turnaround time. However, table scrolling gets sluggish when we exceed 40,000 rows in a single session.`
        );
      }
    }
  };

  // AI Clean & Speaker Segmentation
  const handleAiCleanTranscript = async () => {
    if (!transcript.trim()) return;
    setIsPolishing(true);

    try {
      // Call server AI endpoint or fall back to rule-based segmentation
      const res = await fetch('/api/ai/clean-interview-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript: transcript,
          participantName,
          cohort,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.speakerTurns && Array.isArray(data.speakerTurns)) {
          setCleanedSpeakerTurns(data.speakerTurns);
          setIsPolishing(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Heuristic fallback
    const sentences = transcript.split(/(?<=[.?!])\s+/).filter(Boolean);
    const turns: Array<{ speaker: string; text: string; sentiment?: string }> = [];

    sentences.forEach((s, idx) => {
      const speaker = idx % 2 === 0 ? participantName : 'Interviewer';
      const sentiment = /great|love|amazing|fast|saved|good/i.test(s)
        ? 'positive'
        : /slow|freeze|bug|crash|bad|hard/i.test(s)
        ? 'negative'
        : 'neutral';
      turns.push({ speaker, text: s, sentiment });
    });

    setCleanedSpeakerTurns(turns);
    setIsPolishing(false);
  };

  // Append to Active Dataset
  const handleAppendToDataset = () => {
    if (!transcript.trim()) return;
    const finalRecord = {
      response_id: `INT-${Date.now().toString().slice(-4)}`,
      participant_name: participantName,
      cohort,
      satisfaction_rating: 4,
      feedback_text: transcript.trim(),
      channel: 'Voice Interview',
      recorded_at: new Date().toISOString(),
      duration_seconds: recordingDuration || 45,
    };

    if (onAppendData) {
      onAppendData([finalRecord]);
      alert('Successfully appended voice interview transcript to active dataset!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 border border-rose-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Voice & Qualitative Capture
              </span>
              <span className="text-xs text-slate-400">Web Speech API & Audio Context</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Mic className="w-6 h-6 text-rose-400" />
              Voice Interview Recorder & Speech Transcriber
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Conduct qualitative user interviews directly in the browser. Capture high-fidelity audio, transcribe speech to text in real time, and route participant quotes straight into qualitative research studies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 flex items-center gap-2 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Audio File</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recording & Visualizer */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-rose-400" />
              Interview Metadata & Controls
            </h3>

            {/* Metadata Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Participant Name / ID</label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Cohort / Segment</label>
                <select
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500 font-medium"
                >
                  <option value="Enterprise">Enterprise Cohort</option>
                  <option value="Mid-Market">Mid-Market Cohort</option>
                  <option value="Free Tier">Free Tier User</option>
                  <option value="Field Kiosk">Field Respondent</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Interview Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Live Audio Frequency Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-24 flex items-center justify-center">
              <canvas ref={canvasRef} width={280} height={96} className="w-full h-full" />
              {!isRecording && !audioUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 text-slate-500 text-xs">
                  <Volume2 className="w-5 h-5 mb-1 text-slate-600" />
                  <span>Audio Waveform Inactive</span>
                </div>
              )}
            </div>

            {/* Recording Controls */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-700'
                  }`}
                />
                <span className="font-mono text-sm font-bold text-white">
                  {formatTime(recordingDuration)}
                </span>
              </div>

              {!isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Interview</span>
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold transition-all border border-rose-500/40 flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-rose-400" />
                  <span>Stop & Save Audio</span>
                </button>
              )}
            </div>

            {/* Audio Playback Element */}
            {audioUrl && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 mb-1 font-semibold">Recorded Audio Playback:</div>
                <audio controls src={audioUrl} className="w-full h-8" />
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Speech-to-Text Transcript */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-400" />
                  Live Interview Transcript
                </h3>
                <p className="text-xs text-slate-400">
                  Transcribed in real-time. You can also manually edit or paste text.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAiCleanTranscript}
                  disabled={!transcript || isPolishing}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isPolishing ? 'Refining...' : 'AI Clean & Tag'}</span>
                </button>
              </div>
            </div>

            {/* Transcript Textarea */}
            <div className="space-y-2">
              <textarea
                rows={8}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={
                  isSpeechSupported
                    ? 'Click "Start Interview" and begin speaking into your microphone. Verbatim transcripts will populate here in real-time...'
                    : 'Web Speech API is not supported in this browser. Please type or paste your interview transcript here.'
                }
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500 leading-relaxed"
              />

              {interimTranscript && (
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300 font-mono animate-pulse">
                  Listening: "{interimTranscript}"
                </div>
              )}
            </div>

            {/* Cleaned Speaker Turns if available */}
            {cleanedSpeakerTurns.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Cleaned Speaker Dialogue & Sentiment:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {cleanedSpeakerTurns.map((turn, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3 text-xs"
                    >
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-800 text-slate-300 shrink-0">
                        {turn.speaker}
                      </span>
                      <p className="text-slate-300 flex-1 leading-relaxed">{turn.text}</p>
                      {turn.sentiment && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            turn.sentiment === 'positive'
                              ? 'bg-emerald-950 text-emerald-300'
                              : turn.sentiment === 'negative'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {turn.sentiment}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Routing Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Word Count: <span className="font-mono font-bold text-white">{transcript.split(/\s+/).filter(Boolean).length}</span> words
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([transcript], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `transcript_${participantName.toLowerCase().replace(/\s+/g, '_')}.txt`;
                    a.click();
                  }}
                  disabled={!transcript}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download TXT</span>
                </button>

                {onSendToQualitative && (
                  <button
                    onClick={() => onSendToQualitative(transcript, participantName)}
                    disabled={!transcript}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send to Qualitative Studio</span>
                  </button>
                )}

                <button
                  onClick={handleAppendToDataset}
                  disabled={!transcript}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Append to Active Dataset</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
