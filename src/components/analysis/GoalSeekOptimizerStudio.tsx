import React, { useState, useMemo } from 'react';
import { 
  Target, 
  Sliders, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Download, 
  RotateCcw, 
  Plus, 
  Minus,
  Check
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import { round } from '../../utils/statistics';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';

interface GoalSeekOptimizerStudioProps {
  dataset: Dataset;
  onCreateDataset?: (newDataset: Dataset) => void;
}

interface LeverConfig {
  id: string;
  name: string;
  min: number;
  max: number;
  currentMean: number;
  difficulty: 'low' | 'medium' | 'high';
  isLocked?: boolean;
}

export const GoalSeekOptimizerStudio: React.FC<GoalSeekOptimizerStudioProps> = ({
  dataset,
  onCreateDataset
}) => {
  const numericColumns = useMemo(() => {
    return dataset.columns.filter(c => c.type === 'number');
  }, [dataset]);

  // Target Variable
  const [targetColId, setTargetColId] = useState<string>(() => {
    return numericColumns[numericColumns.length - 1]?.id || numericColumns[0]?.id || '';
  });

  const [objectiveType, setObjectiveType] = useState<'reach_val' | 'lift_pct'>('lift_pct');
  const [targetValInput, setTargetValInput] = useState<number>(100);
  const [liftPctInput, setLiftPctInput] = useState<number>(15); // +15% by default
  const [selectedLeverIds, setSelectedLeverIds] = useState<string[]>(() => {
    return numericColumns.filter(c => c.id !== targetColId).slice(0, 4).map(c => c.id);
  });

  const [createdDatasetNotice, setCreatedDatasetNotice] = useState<string | null>(null);

  // Target Column Meta
  const targetCol = numericColumns.find(c => c.id === targetColId);

  // Baseline Statistics for Target & Levers
  const baselineStats = useMemo(() => {
    if (!targetCol) return null;

    const rows = dataset.data.filter(r => {
      const v = Number(r[targetCol.id]);
      return !isNaN(v) && r[targetCol.id] !== null;
    });

    if (rows.length === 0) return null;

    const targetVals = rows.map(r => Number(r[targetCol.id]));
    const targetMean = targetVals.reduce((a, b) => a + b, 0) / targetVals.length;

    // Lever stats
    const leverConfigs: LeverConfig[] = numericColumns
      .filter(c => c.id !== targetCol.id)
      .map(c => {
        const vals = dataset.data
          .map(r => Number(r[c.id]))
          .filter(v => !isNaN(v) && v !== null);
        
        const mean = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        const min = vals.length > 0 ? Math.min(...vals) : 0;
        const max = vals.length > 0 ? Math.max(...vals) : 100;

        return {
          id: c.id,
          name: c.name,
          min: round(min, 2),
          max: round(max, 2),
          currentMean: round(mean, 2),
          difficulty: 'medium'
        };
      });

    return {
      targetMean: round(targetMean, 2),
      rowCount: rows.length,
      leverConfigs
    };
  }, [dataset, targetCol, numericColumns]);

  // Multivariate Optimization Solver
  const optimizationResult = useMemo(() => {
    if (!baselineStats || !targetCol || selectedLeverIds.length === 0) return null;

    const validRows = dataset.data.filter(r => {
      if (isNaN(Number(r[targetCol.id])) || r[targetCol.id] === null) return false;
      return selectedLeverIds.every(id => !isNaN(Number(r[id])) && r[id] !== null);
    });

    if (validRows.length < 5) return null;

    const n = validRows.length;
    const yVals = validRows.map(r => Number(r[targetCol.id]));
    const yMean = baselineStats.targetMean;

    // Desired Target
    const desiredTargetY = objectiveType === 'lift_pct'
      ? yMean * (1 + liftPctInput / 100)
      : targetValInput;

    const requiredDeltaY = desiredTargetY - yMean;

    // Compute partial correlations / regression slopes for each lever
    const leverDeltas: Array<{
      id: string;
      name: string;
      currentMean: number;
      recommendedVal: number;
      deltaAbs: number;
      deltaPct: number;
      elasticity: number;
      min: number;
      max: number;
    }> = [];

    let totalElasticityWeight = 0;
    const sensitivities: { [id: string]: number } = {};

    selectedLeverIds.forEach(id => {
      const colMeta = numericColumns.find(c => c.id === id);
      if (!colMeta) return;

      const xVals = validRows.map(r => Number(r[id]));
      const xMean = xVals.reduce((a, b) => a + b, 0) / n;

      let covXY = 0;
      let varX = 0;
      for (let i = 0; i < n; i++) {
        const dx = xVals[i] - xMean;
        const dy = yVals[i] - yMean;
        covXY += dx * dy;
        varX += dx * dx;
      }

      const slope = varX > 0 ? covXY / varX : 0;
      sensitivities[id] = slope;
      totalElasticityWeight += Math.abs(slope * (xMean || 1));
    });

    if (totalElasticityWeight === 0) totalElasticityWeight = 1;

    // Solve for each lever adjustment proportional to its efficiency
    let achievedDeltaY = 0;

    selectedLeverIds.forEach(id => {
      const config = baselineStats.leverConfigs.find(l => l.id === id);
      if (!config) return;

      const slope = sensitivities[id] || 0;
      const weight = Math.abs(slope * (config.currentMean || 1)) / totalElasticityWeight;

      // Share of delta required from this lever
      const targetContribution = requiredDeltaY * weight;
      const neededDeltaX = slope !== 0 ? targetContribution / slope : 0;

      let recommendedVal = config.currentMean + neededDeltaX;
      // Clamp within feasible bounds (e.g. within 3x current max/min)
      const lowerBound = Math.min(config.min, config.currentMean * 0.2);
      const upperBound = Math.max(config.max, config.currentMean * 2.5);
      recommendedVal = Math.max(lowerBound, Math.min(upperBound, recommendedVal));

      const actualDeltaX = recommendedVal - config.currentMean;
      const deltaPct = config.currentMean !== 0 ? (actualDeltaX / config.currentMean) * 100 : 0;
      achievedDeltaY += actualDeltaX * slope;

      leverDeltas.push({
        id: config.id,
        name: config.name,
        currentMean: config.currentMean,
        recommendedVal: round(recommendedVal, 2),
        deltaAbs: round(actualDeltaX, 2),
        deltaPct: round(deltaPct, 1),
        elasticity: round(slope, 3),
        min: config.min,
        max: config.max
      });
    });

    // Feasibility Score calculation
    const avgDeltaAbsPct = leverDeltas.reduce((acc, l) => acc + Math.abs(l.deltaPct), 0) / (leverDeltas.length || 1);
    let feasibilityScore = Math.max(10, Math.min(99, Math.round(100 - (avgDeltaAbsPct * 0.9))));
    if (Math.abs(achievedDeltaY - requiredDeltaY) > Math.abs(requiredDeltaY) * 0.3) {
      feasibilityScore = Math.max(20, feasibilityScore - 25);
    }

    const projectedOutcomeY = yMean + achievedDeltaY;

    // Tornado Chart Data
    const tornadoData = [...leverDeltas]
      .sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity))
      .map(l => ({
        name: l.name,
        sensitivity: l.elasticity,
        absSensitivity: Math.abs(l.elasticity),
        direction: l.elasticity >= 0 ? 'Positive Leverage' : 'Inverse Leverage'
      }));

    return {
      desiredTargetY: round(desiredTargetY, 2),
      projectedOutcomeY: round(projectedOutcomeY, 2),
      requiredDeltaY: round(requiredDeltaY, 2),
      achievedDeltaY: round(achievedDeltaY, 2),
      feasibilityScore,
      leverDeltas,
      tornadoData
    };
  }, [baselineStats, targetCol, selectedLeverIds, objectiveType, liftPctInput, targetValInput, numericColumns, dataset]);

  // Toggle Lever Selection
  const toggleLever = (id: string) => {
    setSelectedLeverIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Generate Synthetic Scenario Dataset with the optimized adjustments
  const handleCreateSyntheticGoalDataset = () => {
    if (!optimizationResult || !onCreateDataset) return;

    const newRows = dataset.data.map(row => {
      const cloned = { ...row };
      optimizationResult.leverDeltas.forEach(l => {
        const origVal = Number(row[l.id]);
        if (!isNaN(origVal) && origVal !== null) {
          // Shift by recommended delta
          cloned[l.id] = round(origVal + l.deltaAbs, 2);
        }
      });
      // Also update target variable estimate
      if (targetCol) {
        const origTarget = Number(row[targetCol.id]);
        if (!isNaN(origTarget) && origTarget !== null) {
          cloned[targetCol.id] = round(origTarget + optimizationResult.achievedDeltaY, 2);
        }
      }
      return cloned;
    });

    const newDataset: Dataset = {
      ...dataset,
      id: `dataset_goal_${Date.now()}`,
      name: `${dataset.name} [Goal Scenario: ${targetCol?.name} -> ${optimizationResult.desiredTargetY}]`,
      description: `Synthesized prescriptive optimization scenario achieving target ${targetCol?.name} of ${optimizationResult.desiredTargetY}. Generated via Target Finder.`,
      createdAt: new Date(),
      data: newRows
    };

    onCreateDataset(newDataset);
    setCreatedDatasetNotice(`Created synthetic goal scenario with ${newRows.length} rows.`);
    setTimeout(() => setCreatedDatasetNotice(null), 4000);
  };

  if (numericColumns.length < 2) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Insufficient Numeric Levers</h3>
        <p className="text-xs text-slate-400">
          The Prescriptive Goal-Seeker requires at least two numerical variables (one target metric and at least one controllable lever).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 p-6 rounded-3xl border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Prescriptive Optimization Engine
            </span>
            <span className="text-xs text-slate-400">• Reverse Goal-Seeking</span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-400" />
            <span>Target Finder &amp; Prescriptive Optimizer</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Don't just ask what happened. Set a target KPI goal, and let the mathematical solver calculate the exact lever adjustments and operational feasibility required to hit it.
          </p>
        </div>

        {createdDatasetNotice && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{createdDatasetNotice}</span>
          </div>
        )}
      </div>

      {/* Target & Levers Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        
        {/* 1. Target KPI Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Target KPI Objective (Y)</span>
          </label>
          <select
            value={targetColId}
            onChange={(e) => {
              setTargetColId(e.target.value);
              setSelectedLeverIds(prev => prev.filter(id => id !== e.target.value));
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
          >
            {numericColumns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400">
            Current Status Quo Mean: <strong className="text-white font-mono">{baselineStats?.targetMean}</strong>
          </div>
        </div>

        {/* 2. Goal Target Setting */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
            <span>2. Desired Goal Value</span>
          </label>
          
          <div className="flex items-center gap-2">
            <select
              value={objectiveType}
              onChange={(e) => setObjectiveType(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-200"
            >
              <option value="lift_pct">Lift (%)</option>
              <option value="reach_val">Exact Value</option>
            </select>

            {objectiveType === 'lift_pct' ? (
              <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                <input
                  type="number"
                  value={liftPctInput}
                  onChange={(e) => setLiftPctInput(Number(e.target.value))}
                  className="w-full bg-transparent text-xs font-bold text-white focus:outline-none font-mono"
                  placeholder="e.g. 15"
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
            ) : (
              <input
                type="number"
                value={targetValInput}
                onChange={(e) => setTargetValInput(Number(e.target.value))}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none font-mono"
                placeholder="Target value"
              />
            )}
          </div>
          
          <div className="text-[11px] text-emerald-300/80 font-mono">
            Desired Objective: {optimizationResult ? `${optimizationResult.desiredTargetY}` : '-'}
          </div>
        </div>

        {/* 3. Quick Feasibility Summary */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="text-[10.5px] uppercase font-bold text-slate-400">Projected Feasibility Score</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {optimizationResult ? `${optimizationResult.feasibilityScore}%` : '-'}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              {optimizationResult && optimizationResult.feasibilityScore >= 75 ? 'Highly Achievable' : optimizationResult && optimizationResult.feasibilityScore >= 50 ? 'Moderate Effort' : 'Aggressive Stretch'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Target Gap: <span className="font-mono text-white">{optimizationResult?.requiredDeltaY > 0 ? `+${optimizationResult?.requiredDeltaY}` : optimizationResult?.requiredDeltaY}</span>
          </div>
        </div>

      </div>

      {/* Controllable Levers Selector */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-teal-400" />
            <span>Select Controllable Decision Levers</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {selectedLeverIds.length} active levers selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {numericColumns
            .filter(c => c.id !== targetColId)
            .map(c => {
              const isSelected = selectedLeverIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleLever(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-teal-400' : 'bg-slate-700'}`} />
                  <span>{c.name}</span>
                </button>
              );
            })}
        </div>
      </div>

      {optimizationResult && (
        <>
          {/* Actionable Prescriptive Lever Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Prescribed Operational Lever Adjustments</span>
              </h3>

              {onCreateDataset && (
                <button
                  onClick={handleCreateSyntheticGoalDataset}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Export Synthetic Goal Scenario</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {optimizationResult.leverDeltas.map(l => {
                const isIncrease = l.deltaAbs >= 0;
                return (
                  <div 
                    key={l.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white truncate">{l.name}</div>
                      <div className="text-[10.5px] text-slate-400">
                        Baseline Mean: <span className="font-mono text-slate-300">{l.currentMean}</span>
                      </div>
                    </div>

                    <div className="my-3 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Target Value</div>
                        <div className="text-base font-extrabold font-mono text-emerald-300">{l.recommendedVal}</div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs font-black font-mono flex items-center gap-0.5 ${
                        isIncrease ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isIncrease ? `+${l.deltaPct}%` : `${l.deltaPct}%`}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Sensitivity (β): <strong className="font-mono text-slate-300">{l.elasticity}</strong></span>
                      <span className="font-mono text-slate-500">[{l.min} to {l.max}]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tornado Sensitivity Chart */}
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Feature Leverage Tornado Chart (Elasticity on {targetCol?.name})</span>
              <span className="text-[10px] text-slate-400">Higher magnitude = Greater marginal ROI per unit change</span>
            </div>

            <div className="h-56 w-full bg-slate-950 rounded-2xl p-3 border border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={optimizationResult.tornadoData} layout="vertical" margin={{ left: 50, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <Bar dataKey="sensitivity" name="Sensitivity Slope (β)" radius={[0, 4, 4, 0]}>
                    {optimizationResult.tornadoData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.sensitivity >= 0 ? '#10b981' : '#f43f5e'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </>
      )}

    </div>
  );
};
