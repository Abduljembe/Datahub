import React, { useState, useEffect, useMemo } from 'react';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileText,
  Printer,
  Sparkles,
  Quote,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  X,
  Layers,
  ArrowRight,
  Download
} from 'lucide-react';
import { Dataset } from '../../types';
import {
  generateExecutiveSlideDeck,
  ExecutiveDeck,
  ExecutiveSlide
} from '../../utils/slideDeckEngine';

interface ExecutiveSlideDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
}

export const ExecutiveSlideDeckModal: React.FC<ExecutiveSlideDeckModalProps> = ({
  isOpen,
  onClose,
  dataset,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState<boolean>(false);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);

  const deck: ExecutiveDeck = useMemo(() => {
    return generateExecutiveSlideDeck(dataset);
  }, [dataset]);

  const currentSlide: ExecutiveSlide = deck.slides[currentSlideIndex] || deck.slides[0];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlideIndex((prev) => Math.min(deck.slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deck.slides.length, isFullscreen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-slate-950 text-white ${
        isFullscreen ? 'p-0' : 'p-4 md:p-8 bg-slate-950/90 backdrop-blur-md'
      }`}
    >
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Presentation Header Bar (hidden in print) */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-md">
              <Presentation className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{deck.deckTitle}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  {deck.datasetName}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Slide {currentSlideIndex + 1} of {deck.totalSlides} · {deck.generatedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                showSpeakerNotes
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Speaker Notes</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Deck</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Presentation Stage */}
        <div className="flex-1 flex overflow-hidden">
          {/* Thumbnails Sidebar */}
          <div className="w-48 border-r border-slate-800 bg-slate-950/60 p-3 overflow-y-auto space-y-2 hidden md:block print:hidden">
            {deck.slides.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`p-2.5 rounded-xl cursor-pointer border text-left transition-all ${
                  idx === currentSlideIndex
                    ? 'bg-amber-950/40 border-amber-500/50 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="text-[10px] font-mono text-slate-500 mb-0.5">SLIDE {idx + 1}</div>
                <div className="text-xs font-bold truncate">{s.title}</div>
              </div>
            ))}
          </div>

          {/* Active Slide Canvas */}
          <div className="flex-1 flex flex-col justify-between p-8 md:p-12 overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
            <div className="space-y-6 max-w-5xl mx-auto w-full">
              {/* Slide Header */}
              <div className="space-y-1.5 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    {currentSlide.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400">Slide {currentSlide.slideNumber}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {currentSlide.title}
                </h1>
                <p className="text-sm text-slate-400 font-medium">{currentSlide.subtitle}</p>
              </div>

              {/* Metrics Row if present */}
              {currentSlide.metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {currentSlide.metrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-1 shadow-lg"
                    >
                      <div className="text-xs text-slate-400">{m.label}</div>
                      <div
                        className={`text-2xl font-black ${
                          m.tone === 'positive'
                            ? 'text-emerald-400'
                            : m.tone === 'negative'
                            ? 'text-rose-400'
                            : m.tone === 'accent'
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}
                      >
                        {m.value}
                      </div>
                      {m.subtext && <div className="text-[10px] text-slate-500">{m.subtext}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Spotlight Quote if present */}
              {currentSlide.verbatimQuote && (
                <div className="bg-gradient-to-r from-amber-950/30 to-purple-950/20 border border-amber-500/30 rounded-2xl p-6 relative">
                  <Quote className="w-8 h-8 text-amber-400/40 absolute top-4 right-4" />
                  <p className="text-sm md:text-base text-amber-100 italic leading-relaxed font-serif mb-4">
                    "{currentSlide.verbatimQuote.quote}"
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white">{currentSlide.verbatimQuote.speaker}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-amber-400 font-medium">{currentSlide.verbatimQuote.cohort}</span>
                  </div>
                </div>
              )}

              {/* Bullet Points */}
              {currentSlide.bullets && (
                <div className="space-y-3 pt-2">
                  {currentSlide.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
                      <span className="leading-relaxed">{bullet}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Table Data if present */}
              {currentSlide.tableData && (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-lg">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                        {currentSlide.tableData.headers.map((h, i) => (
                          <th key={i} className="p-3 font-bold text-slate-300">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSlide.tableData.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-3 text-slate-300">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recommendations Roadmap Table */}
              {currentSlide.recommendations && (
                <div className="space-y-3">
                  {currentSlide.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              rec.priority === 'Critical'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {rec.priority}
                          </span>
                          <h4 className="text-xs font-bold text-white">{rec.action}</h4>
                        </div>
                        <p className="text-xs text-slate-400">{rec.impact}</p>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono font-bold shrink-0">
                        {rec.timeline}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slide Footer */}
            <div className="pt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 max-w-5xl mx-auto w-full">
              <span>{deck.deckTitle} · Confidential</span>
              <span>
                {currentSlideIndex + 1} / {deck.totalSlides}
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Speaker Notes Drawer */}
        {showSpeakerNotes && (
          <div className="p-4 bg-amber-950/20 border-t border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-3 print:hidden">
            <FileText className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">Presenter's Script Notes:</span>
              <p className="leading-relaxed">{currentSlide.speakerNotes}</p>
            </div>
          </div>
        )}

        {/* Presentation Controls Bar (Bottom) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between print:hidden">
          <button
            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentSlideIndex === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-30 transition-colors flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1.5">
            {deck.slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentSlideIndex ? 'bg-amber-400 w-6' : 'bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentSlideIndex((prev) => Math.min(deck.slides.length - 1, prev + 1))}
            disabled={currentSlideIndex === deck.slides.length - 1}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-xs font-bold disabled:opacity-30 transition-all flex items-center gap-1.5 shadow-md"
          >
            <span>Next Slide</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
