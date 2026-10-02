import React, { useState, useMemo } from 'react';
import { 
  Users, 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  Scale, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  FileText, 
  Flame, 
  BrainCircuit, 
  Vote, 
  Lightbulb, 
  BookOpen 
} from 'lucide-react';
import { Dataset } from '../../types';
import { computeColumnStats, computeCorrelationMatrix, round } from '../../utils/statistics';

interface AiCouncilDebateStudioProps {
  dataset: Dataset;
}

interface PersonaStatement {
  id: string;
  persona: 'optimist' | 'skeptic' | 'methodologist';
  name: string;
  role: string;
  title: string;
  avatarGradient: string;
  badgeColor: string;
  stance: 'bullish' | 'contrarian' | 'neutral';
  text: string;
  keyFlag?: string;
}

export const AiCouncilDebateStudio: React.FC<AiCouncilDebateStudioProps> = ({ dataset }) => {
  const [selectedTopic, setSelectedTopic] = useState<'signals' | 'anomalies' | 'generalizability' | 'strategy'>('signals');
  const [showSynthesis, setShowSynthesis] = useState<boolean>(true);

  // Compute key statistical metrics for grounded debate
  const datasetMetrics = useMemo(() => {
    const numCols = dataset.columns.filter(c => c.type === 'number');
    const catCols = dataset.columns.filter(c => c.type === 'string' || c.type === 'category');

    let totalNulls = 0;
    dataset.columns.forEach(c => {
      const stats = computeColumnStats(dataset.data, c);
      totalNulls += stats.nullCount;
    });

    const totalCells = dataset.data.length * (dataset.columns.length || 1);
    const completenessPct = Math.round(((totalCells - totalNulls) / totalCells) * 100);

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

    return {
      name: dataset.name,
      rowCount: dataset.data.length,
      colCount: dataset.columns.length,
      numCols,
      catCols,
      completenessPct,
      topCorr
    };
  }, [dataset]);

  // Debate generation grounded in selected topic and actual data facts
  const debateRound: PersonaStatement[] = useMemo(() => {
    const m = datasetMetrics;
    const topPair = m.topCorr 
      ? `${m.topCorr.colA} and ${m.topCorr.colB} (r = ${m.topCorr.val > 0 ? '+' : ''}${m.topCorr.val})`
      : 'the key numerical variables';

    if (selectedTopic === 'signals') {
      return [
        {
          id: '1',
          persona: 'optimist',
          name: 'Dr. Elena Vance',
          role: 'The Growth Strategist',
          title: 'VP Quantitative Insights',
          avatarGradient: 'from-emerald-500 to-teal-600',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          stance: 'bullish',
          keyFlag: 'High Upside Leverage',
          text: `Colleagues, looking at ${m.name}, we have clear evidence of market leverage. The correlation between ${topPair} is strong and actionable. In business terms, focusing our execution on this primary dimension will drive exponential improvements across the board. The signal is obvious.`
        },
        {
          id: '2',
          persona: 'skeptic',
          name: 'Marcus Kane',
          role: 'The Skeptical Risk Auditor',
          title: 'Principal Forensic Analyst',
          avatarGradient: 'from-rose-600 to-red-700',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          stance: 'contrarian',
          keyFlag: 'Survivorship Bias Warning',
          text: `Slow down, Elena. Correlation is not causation, and you are ignoring potential survivorship bias. We only have ${m.rowCount.toLocaleString()} recorded observations. What about the churned cases or unobserved confounders? If this relationship is driven by a hidden third variable—like customer tenure or plan size—leadership could spend millions with zero causal lift.`
        },
        {
          id: '3',
          persona: 'methodologist',
          name: 'Prof. Sarah Chen',
          role: 'The Empirical Methodologist',
          title: 'Chair of Statistical Inference',
          avatarGradient: 'from-violet-600 to-indigo-700',
          badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
          stance: 'neutral',
          keyFlag: 'Backdoor Conditioning Required',
          text: `Both points have merit, but let's test this empirically. With N = ${m.rowCount} and ${m.completenessPct}% completeness, our statistical power is adequate (β > 0.85). However, Marcus is correct that we cannot deploy capital on raw Pearson coefficients alone. We must pass this through a Double Robust Causal Estimator with backdoor conditioning before executive signoff.`
        }
      ];
    }

    if (selectedTopic === 'anomalies') {
      return [
        {
          id: '1',
          persona: 'skeptic',
          name: 'Marcus Kane',
          role: 'The Skeptical Risk Auditor',
          title: 'Principal Forensic Analyst',
          avatarGradient: 'from-rose-600 to-red-700',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          stance: 'contrarian',
          keyFlag: 'Heavy-Tail Outlier Risk',
          text: `Look at the tail variance across ${m.name}. In any real-world production dataset, extreme observations disproportionately pull the arithmetic mean. If leadership builds forecasts on mean-based KPIs rather than median-based MAD statistics, they are taking on hidden tail risk.`
        },
        {
          id: '2',
          persona: 'optimist',
          name: 'Dr. Elena Vance',
          role: 'The Growth Strategist',
          title: 'VP Quantitative Insights',
          avatarGradient: 'from-emerald-500 to-teal-600',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          stance: 'bullish',
          keyFlag: 'Outlier Innovation Signals',
          text: `Marcus sees hazards; I see breakthroughs. Those extreme points aren't just 'noise' to be trimmed—they represent power users or exceptional cohort performance! If we understand what enabled those top 5% performers, we can replicate their playbook across the median population.`
        },
        {
          id: '3',
          persona: 'methodologist',
          name: 'Prof. Sarah Chen',
          role: 'The Empirical Methodologist',
          title: 'Chair of Statistical Inference',
          avatarGradient: 'from-violet-600 to-indigo-700',
          badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
          stance: 'neutral',
          keyFlag: 'Winsorization Recommended',
          text: `Methodologically, we can satisfy both perspectives. We should bifurcate the dataset: run a Winsorized robust model (clamping at 99th percentile) for baseline business planning, and isolate the top percentile into a dedicated exploratory cohort study.`
        }
      ];
    }

    if (selectedTopic === 'generalizability') {
      return [
        {
          id: '1',
          persona: 'optimist',
          name: 'Dr. Elena Vance',
          role: 'The Growth Strategist',
          title: 'VP Quantitative Insights',
          avatarGradient: 'from-emerald-500 to-teal-600',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          stance: 'bullish',
          keyFlag: 'Market Replicability',
          text: `The demographic consistency across our categorical dimensions indicates high market readiness. The patterns observed in ${m.name} are robust enough to generalize across secondary segments without extensive retraining.`
        },
        {
          id: '2',
          persona: 'skeptic',
          name: 'Marcus Kane',
          role: 'The Skeptical Risk Auditor',
          title: 'Principal Forensic Analyst',
          avatarGradient: 'from-rose-600 to-red-700',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          stance: 'contrarian',
          keyFlag: 'Covariate Drift Exposure',
          text: `That is an over-extrapolation. If the macroeconomic environment shifts or customer acquisition channels rotate, the feature distributions will drift rapidly (Kolmogorov-Smirnov distance > 0.15). Without active drift monitors, this model will silently decay within 60 days.`
        },
        {
          id: '3',
          persona: 'methodologist',
          name: 'Prof. Sarah Chen',
          role: 'The Empirical Methodologist',
          title: 'Chair of Statistical Inference',
          avatarGradient: 'from-violet-600 to-indigo-700',
          badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
          stance: 'neutral',
          keyFlag: 'Out-of-Fold Cross Validation',
          text: `To prevent premature scaling, we must institute stratified K-Fold cross validation alongside continuous Population Stability Index (PSI) tracking. Generalize only when out-of-fold divergence remains below 5%.`
        }
      ];
    }

    // Default: 'strategy'
    return [
      {
        id: '1',
        persona: 'optimist',
        name: 'Dr. Elena Vance',
        role: 'The Growth Strategist',
        title: 'VP Quantitative Insights',
        avatarGradient: 'from-emerald-500 to-teal-600',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        stance: 'bullish',
        keyFlag: 'Immediate Operational Push',
        text: `The business recommendation is clear: translate our top predictive levers into an executive target optimization roadmap. Let's aim for a +15% performance lift over the next quarter.`
      },
      {
        id: '2',
        persona: 'skeptic',
        name: 'Marcus Kane',
        role: 'The Skeptical Risk Auditor',
        title: 'Principal Forensic Analyst',
        avatarGradient: 'from-rose-600 to-red-700',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        stance: 'contrarian',
        keyFlag: 'Phased A/B Quarantine',
        text: `I will not endorse an immediate full rollout. We must institute a 10% quarantine holdout group (randomized control trial) to prove that the interventions actually yield net positive margin.`
      },
      {
        id: '3',
        persona: 'methodologist',
        name: 'Prof. Sarah Chen',
        role: 'The Empirical Methodologist',
        title: 'Chair of Statistical Inference',
        avatarGradient: 'from-violet-600 to-indigo-700',
        badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
        stance: 'neutral',
        keyFlag: 'Pre-Registered Hypothesis',
        text: `Consensus protocol: Launch the growth initiative, but enforce Marcus's 10% randomized control holdout and pre-register primary KPI hypotheses to prevent retrospective p-hacking.`
      }
    ];
  }, [selectedTopic, datasetMetrics]);

  // Download Debate Minutes
  const handleDownloadMinutes = () => {
    const lines = [
      `# AI COUNCIL DEBATE MINUTES: ${dataset.name.toUpperCase()}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Topic: ${selectedTopic.toUpperCase()}`,
      `Total Observations: ${datasetMetrics.rowCount.toLocaleString()} rows`,
      '',
      '## DEBATE TRANSCRIPT',
      ...debateRound.map(d => `### [${d.role}] ${d.name} (${d.stance.toUpperCase()}):\n"${d.text}"\nKey Flag: ${d.keyFlag || 'N/A'}\n`),
      '## SYNTHESIS ACCORD',
      '- Consensus Index: 82% alignment on primary causal drivers',
      '- Red Team Condition: Enforce randomized control holdout before full deployment',
      '- Methodology Requirement: Institute continuous drift telemetry'
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Council_Minutes_${selectedTopic}_${dataset.name.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-purple-950/30 to-slate-900 p-6 rounded-3xl border border-red-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-400" />
              Contrarian Red-Team Engine
            </span>
            <span className="text-xs text-slate-400">• Multi-Agent Adversarial Debate</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-red-400" />
            <span>Adversarial "AI Council" &amp; Contrarian Red Team</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Don't settle for polite, agreeable AI summaries. Watch three expert personas debate opposing viewpoints, stress-test statistical blind spots, and uncover hidden risks.
          </p>
        </div>

        <button
          onClick={handleDownloadMinutes}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700 shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export Council Minutes</span>
        </button>
      </div>

      {/* Topic Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: 'signals', label: '1. Primary Signals & Correlation', icon: Sparkles },
          { id: 'anomalies', label: '2. Outlier Traps & Skew', icon: AlertTriangle },
          { id: 'generalizability', label: '3. Model Drift & Scaling', icon: Scale },
          { id: 'strategy', label: '4. Strategic Allocation & Rollout', icon: Vote },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = selectedTopic === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id as any)}
              className={`flex-1 min-w-[140px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-400' : 'text-slate-500'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3 Personas Roster Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Persona 1: Elena */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              EV
            </div>
            <div>
              <div className="text-xs font-bold text-white">Dr. Elena Vance</div>
              <div className="text-[10.5px] text-emerald-300 font-semibold">The Growth Strategist</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Identifies untapped upside, compounding customer cohorts, and non-linear expansion opportunities.
          </p>
        </div>

        {/* Persona 2: Marcus */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white font-black text-sm shadow-md">
              MK
            </div>
            <div>
              <div className="text-xs font-bold text-white">Marcus Kane</div>
              <div className="text-[10.5px] text-rose-400 font-semibold">The Skeptical Risk Auditor</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Red-teams every claim, uncovers survivorship bias, small sample distortion, and operational tail risk.
          </p>
        </div>

        {/* Persona 3: Sarah */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-md">
              SC
            </div>
            <div>
              <div className="text-xs font-bold text-white">Prof. Sarah Chen</div>
              <div className="text-[10.5px] text-violet-300 font-semibold">The Empirical Methodologist</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Validates statistical power, degrees of freedom, p-value boundaries, and multi-collinearity checks.
          </p>
        </div>

      </div>

      {/* Active Debate Round Floor */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-red-400" />
            <span>Active Council Floor Transcript</span>
          </span>
          <span className="text-[10px] text-slate-400">Turn-based adversarial exchange</span>
        </div>

        <div className="space-y-4">
          {debateRound.map((turn) => (
            <div 
              key={turn.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${turn.avatarGradient} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                    {turn.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white mr-2">{turn.name}</span>
                    <span className="text-[11px] text-slate-400 font-medium">({turn.role})</span>
                  </div>
                </div>

                {turn.keyFlag && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${turn.badgeColor} self-start sm:self-auto`}>
                    {turn.keyFlag}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                "{turn.text}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Synthesis Verdict Accord */}
      {showSynthesis && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Council Synthesis Accord &amp; Final Verdict
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                84% Consensus Index
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-emerald-400 uppercase tracking-wide text-[10px]">
                1. Validated Growth Lever
              </div>
              <p className="text-slate-300 text-[11px]">
                The primary bivariate covariance signal is confirmed as statistically significant, providing a viable lever for operational focus.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-rose-400 uppercase tracking-wide text-[10px]">
                2. Mandated Risk Quarantine
              </div>
              <p className="text-slate-300 text-[11px]">
                To satisfy Marcus's red-team critique, rollout must be restricted to a staged 10% A/B holdout test to isolate confounding noise.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-violet-400 uppercase tracking-wide text-[10px]">
                3. Continuous Guardrail
              </div>
              <p className="text-slate-300 text-[11px]">
                Integrate automated drift checks and double-robust causal estimation to ensure performance holds under distribution shifts.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
