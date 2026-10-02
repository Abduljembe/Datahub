import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  Sliders,
  RotateCcw,
  Save,
  Share2,
  Download,
  AlertCircle,
  BarChart2,
  Calendar,
  Layers,
  HelpCircle,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  FileSpreadsheet,
  Shuffle,
  ShieldAlert,
  Percent,
  Check,
  FileText,
  Copy
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import { 
  Dataset, 
  DriverParameter, 
  ForecastModelType, 
  ScenarioPresetType, 
  SimulationResult, 
  SavedScenario, 
  UserProfile 
} from '../../types';
import { 
  getNumericalColumns, 
  buildDefaultDriverParameters, 
  runScenarioSimulation, 
  applyScenarioPreset,
  estimateDriverElasticity
} from '../../utils/forecastEngine';
import { exportToCSV, exportToJSON } from '../../utils/dataEngine';

interface ScenarioSimulatorProps {
  dataset: Dataset | null;
  currentUser?: UserProfile | null;
  onNavigateToTab?: (tab: 'upload' | 'analysis' | 'grid' | 'collection' | 'report' | 'team') => void;
  onOpenShareModal?: (ds?: Dataset) => void;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  dataset,
  currentUser,
  onNavigateToTab,
  onOpenShareModal
}) => {
  // Numerical target selection
  const numColumns = useMemo(() => getNumericalColumns(dataset), [dataset]);
  const [targetColumn, setTargetColumn] = useState<string>(() => {
    // Pick revenue, sales, profit, amount, price, or first numeric column
    const priority = numColumns.find(c => {
      const n = c.name.toLowerCase();
      return n.includes('rev') || n.includes('sale') || n.includes('profit') || n.includes('amount') || n.includes('cost') || n.includes('score');
    });
    return priority ? priority.name : (numColumns[0]?.name || '');
  });

  // Forecasting parameters
  const [modelType, setModelType] = useState<ForecastModelType>('linear');
  const [horizonPeriods, setHorizonPeriods] = useState<number>(6);
  const [confidenceLevel, setConfidenceLevel] = useState<number>(95);
  const [activePreset, setActivePreset] = useState<ScenarioPresetType>('base');

  // Dynamic Driver Parameters State
  const [parameters, setParameters] = useState<DriverParameter[]>([]);
  const [activeViewTab, setActiveViewTab] = useState<'forecast' | 'sensitivity' | 'table' | 'monte_carlo'>('forecast');

  // Add Driver Parameter Modal State
  const [isAddDriverOpen, setIsAddDriverOpen] = useState<boolean>(false);
  const [selectedNewDriverCol, setSelectedNewDriverCol] = useState<string>('');

  // Saved Scenarios in localStorage
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => {
    try {
      const saved = localStorage.getItem('datahub_saved_scenarios');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [scenarioNameInput, setScenarioNameInput] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Initialize or re-build parameters when dataset or targetColumn changes
  useEffect(() => {
    if (!targetColumn) return;
    const defaultParams = buildDefaultDriverParameters(dataset, targetColumn);
    setParameters(defaultParams);
    setActivePreset('base');
  }, [dataset, targetColumn]);

  // Handle Target Column Change
  const handleTargetChange = (newTarget: string) => {
    setTargetColumn(newTarget);
  };

  // Run Real-Time Simulation Calculation
  const simulation: SimulationResult | null = useMemo(() => {
    if (!targetColumn || numColumns.length === 0) return null;
    return runScenarioSimulation(
      dataset,
      targetColumn,
      parameters,
      modelType,
      horizonPeriods,
      confidenceLevel
    );
  }, [dataset, targetColumn, parameters, modelType, horizonPeriods, confidenceLevel, numColumns.length]);

  // Update a single driver parameter percent change
  const handleUpdateParamPercent = (paramId: string, newPercent: number) => {
    setActivePreset('custom');
    setParameters(prev =>
      prev.map(p => {
        if (p.id === paramId) {
          const clamped = Math.max(p.minPercent, Math.min(p.maxPercent, newPercent));
          const calculatedVal = p.baseValue * (1 + clamped / 100);
          return {
            ...p,
            percentChange: clamped,
            currentValue: Math.round(calculatedVal * 100) / 100
          };
        }
        return p;
      })
    );
  };

  // Preset Selection
  const handleSelectPreset = (preset: ScenarioPresetType) => {
    setActivePreset(preset);
    const updated = applyScenarioPreset(parameters, preset);
    setParameters(updated);
  };

  // Reset all parameters to 0% shift
  const handleResetParameters = () => {
    handleSelectPreset('base');
  };

  // Add custom driver parameter
  const handleAddCustomDriver = () => {
    if (!selectedNewDriverCol) return;
    const existing = parameters.find(p => p.column === selectedNewDriverCol);
    if (existing) {
      setIsAddDriverOpen(false);
      return;
    }

    const { elasticity, baseValue } = estimateDriverElasticity(dataset, targetColumn, selectedNewDriverCol);
    const newParam: DriverParameter = {
      id: `param_${selectedNewDriverCol}_${Date.now()}`,
      column: selectedNewDriverCol,
      label: selectedNewDriverCol.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      baseValue: baseValue || 100,
      currentValue: baseValue || 100,
      percentChange: 0,
      minPercent: -60,
      maxPercent: 100,
      step: 5,
      elasticity: elasticity || 0.5,
      unit: '%'
    };

    setParameters(prev => [...prev, newParam]);
    setSelectedNewDriverCol('');
    setIsAddDriverOpen(false);
  };

  // Remove parameter
  const handleRemoveParameter = (id: string) => {
    setParameters(prev => prev.filter(p => p.id !== id));
  };

  // Save Scenario Handler
  const handleSaveScenario = () => {
    if (!scenarioNameInput.trim() || !simulation) return;
    const newScenario: SavedScenario = {
      id: `scen_${Date.now()}`,
      name: scenarioNameInput.trim(),
      description: `${simulation.modelType.toUpperCase()} forecast over ${horizonPeriods} periods with ${parameters.length} driver parameters.`,
      datasetId: dataset.id,
      datasetName: dataset.name,
      targetColumn,
      modelType,
      horizonPeriods,
      confidenceLevel,
      parameters: [...parameters],
      createdAt: new Date().toISOString(),
      author: currentUser?.name || 'Lead Analyst',
      simulatedTotalDiffPercent: simulation.deltaKpis.totalPercentDiff
    };

    const updatedList = [newScenario, ...savedScenarios.slice(0, 19)];
    setSavedScenarios(updatedList);
    try {
      localStorage.setItem('datahub_saved_scenarios', JSON.stringify(updatedList));
    } catch (e) {
      console.warn(e);
    }

    // Trigger local broadcast event so other tabs/team hub can reflect saved simulations
    try {
      const event = new CustomEvent('team_data_updated', {
        detail: {
          type: 'forecast_simulation',
          datasetId: dataset.id,
          scenarioName: newScenario.name
        }
      });
      window.dispatchEvent(event);
    } catch {}

    setScenarioNameInput('');
    setIsSaveModalOpen(false);
    setSaveSuccessNotice(`Scenario "${newScenario.name}" saved successfully!`);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  // Load Saved Scenario
  const handleLoadScenario = (sc: SavedScenario) => {
    setTargetColumn(sc.targetColumn);
    setModelType(sc.modelType);
    setHorizonPeriods(sc.horizonPeriods);
    setConfidenceLevel(sc.confidenceLevel);
    setParameters(sc.parameters);
    setActivePreset('custom');
    setSaveSuccessNotice(`Loaded scenario: ${sc.name}`);
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  // Delete Saved Scenario
  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    try {
      localStorage.setItem('datahub_saved_scenarios', JSON.stringify(updated));
    } catch {}
  };

  // Export Scenario Results as CSV
  const handleExportCSV = () => {
    if (!simulation) return;
    const rows = simulation.timeSeriesData.map(p => ({
      Period: p.periodLabel,
      Is_Projected: p.isProjected ? 'YES' : 'NO',
      Actual_Historical: p.actual ?? '',
      Baseline_Forecast: p.baselineForecast,
      Simulated_Forecast: p.simulatedForecast,
      Net_Variance_Percent: p.deltaPercent,
      Lower_Confidence_Bound: p.lowerConfidence,
      Upper_Confidence_Bound: p.upperConfidence
    }));

    const mockDataset: Dataset = {
      ...dataset,
      name: `${dataset.name}_Scenario_${simulation.targetLabel}`,
      data: rows,
      columns: Object.keys(rows[0] || {}).map(k => ({
        id: k,
        name: k,
        type: typeof (rows[0] as any)[k] === 'number' ? 'number' : 'string',
        nullable: true
      }))
    };
    exportToCSV(mockDataset);
  };

  // Available non-driver columns to add
  const availableCandidateColumns = useMemo(() => {
    return numColumns.filter(c => c.name !== targetColumn && !parameters.some(p => p.column === c.name));
  }, [numColumns, targetColumn, parameters]);

  if (!targetColumn || numColumns.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Numerical Target Features Found</h2>
        <p className="text-sm text-slate-400">
          The active dataset does not have sufficient numeric columns to model what-if scenarios or forecast projections. Upload a dataset with numeric metrics or visit the Grid Editor to convert column types.
        </p>
        <button
          onClick={() => onNavigateToTab && onNavigateToTab('upload')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg"
        >
          Upload New Dataset
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Toast Notice */}
      {saveSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
          <button onClick={() => setSaveSuccessNotice(null)} className="text-emerald-400 hover:text-white">
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* HEADER: Title & Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  What-If Scenario Modeling & Predictive Forecasting
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Interactive Sandbox
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Perturb driver variables in real-time, test elasticities, and project trajectory with confidence intervals.
                </p>
              </div>
            </div>
          </div>

          {/* Top Control Bar: Target Selector, Model, Horizon & Save */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Target Column Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Target:</span>
              <select
                id="scenario-target-col-select"
                value={targetColumn}
                onChange={e => handleTargetChange(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {numColumns.map(col => (
                  <option key={col.id || col.name} value={col.name} className="bg-slate-900 text-white">
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Model Type */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Model:</span>
              <select
                id="scenario-model-type-select"
                value={modelType}
                onChange={e => setModelType(e.target.value as ForecastModelType)}
                className="bg-transparent text-indigo-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value="linear" className="bg-slate-900 text-white">Linear Trend</option>
                <option value="polynomial" className="bg-slate-900 text-white">Polynomial (Curve)</option>
                <option value="exponential" className="bg-slate-900 text-white">Exponential Growth</option>
                <option value="moving_average" className="bg-slate-900 text-white">Moving Average</option>
                <option value="monte_carlo" className="bg-slate-900 text-white">Monte Carlo (Stochastic)</option>
              </select>
            </div>

            {/* Horizon Periods */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Horizon:</span>
              <select
                id="scenario-horizon-select"
                value={horizonPeriods}
                onChange={e => setHorizonPeriods(Number(e.target.value))}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value={3} className="bg-slate-900 text-white">+3 Periods</option>
                <option value={6} className="bg-slate-900 text-white">+6 Periods</option>
                <option value={12} className="bg-slate-900 text-white">+12 Periods</option>
                <option value={24} className="bg-slate-900 text-white">+24 Periods</option>
              </select>
            </div>

            {/* Confidence Interval */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">CI:</span>
              <select
                id="scenario-confidence-select"
                value={confidenceLevel}
                onChange={e => setConfidenceLevel(Number(e.target.value))}
                className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
              >
                <option value={80} className="bg-slate-900 text-white">80% Interval</option>
                <option value={90} className="bg-slate-900 text-white">90% Interval</option>
                <option value={95} className="bg-slate-900 text-white">95% Interval</option>
                <option value={99} className="bg-slate-900 text-white">99% Interval</option>
              </select>
            </div>

            {/* Action: Save Scenario */}
            <button
              id="save-scenario-btn"
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
              title="Save current scenario simulation"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Scenario</span>
            </button>

            {/* Action: Share to Coworkers */}
            {onOpenShareModal && (
              <button
                id="share-scenario-btn"
                onClick={() => onOpenShareModal(dataset)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition-all"
                title="Share active model with team"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Share</span>
              </button>
            )}

            {/* Action: Export CSV */}
            <button
              id="export-scenario-csv-btn"
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-all"
              title="Export Scenario Projection Data (CSV)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* SCENARIO PRESETS BAR */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Scenario Presets:
            </span>

            <button
              id="preset-base-btn"
              onClick={() => handleSelectPreset('base')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                activePreset === 'base'
                  ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span>⚖️ Base Case (0% Drift)</span>
            </button>

            <button
              id="preset-bull-btn"
              onClick={() => handleSelectPreset('bull_growth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                activePreset === 'bull_growth'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-emerald-400'
              }`}
            >
              <span>🚀 Bull Growth (+25% Volume)</span>
            </button>

            <button
              id="preset-stress-btn"
              onClick={() => handleSelectPreset('stress_test')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                activePreset === 'stress_test'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-rose-400'
              }`}
            >
              <span>🛡️ Stress Test (-20% Demand)</span>
            </button>

            <button
              id="preset-cost-opt-btn"
              onClick={() => handleSelectPreset('cost_optimization')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                activePreset === 'cost_optimization'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-cyan-400'
              }`}
            >
              <span>✂️ Cost Optimization</span>
            </button>

            <button
              id="preset-marketing-btn"
              onClick={() => handleSelectPreset('marketing_scale')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border ${
                activePreset === 'marketing_scale'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-purple-400'
              }`}
            >
              <span>📈 Marketing Scale (+40%)</span>
            </button>
          </div>

          <button
            onClick={handleResetParameters}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 transition-all"
            title="Reset all driver parameters to baseline"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Sliders</span>
          </button>

        </div>

      </div>

      {/* KPI DELTA CARDS: BASELINE VS SIMULATED */}
      {simulation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Projected Total Metric */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Projected Horizon Total</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                +{horizonPeriods} Periods
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {simulation.simulatedKpis.total.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 line-through">
                {simulation.baselineKpis.total.toLocaleString()}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                  simulation.deltaKpis.totalPercentDiff > 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : simulation.deltaKpis.totalPercentDiff < 0
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {simulation.deltaKpis.totalPercentDiff > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : simulation.deltaKpis.totalPercentDiff < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                {simulation.deltaKpis.totalPercentDiff > 0 ? '+' : ''}
                {simulation.deltaKpis.totalPercentDiff.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400">
                ({simulation.deltaKpis.totalDiff > 0 ? '+' : ''}
                {simulation.deltaKpis.totalDiff.toLocaleString()} variance)
              </span>
            </div>
          </div>

          {/* Card 2: Projected Mean / Run-rate */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Projected Mean / Run-rate</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-300">
                {simulation.simulatedKpis.mean.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">
                per period
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Baseline Mean:</span>
              <span className="font-mono font-bold text-slate-300">
                {simulation.baselineKpis.mean.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 3: Simulated Growth Trajectory */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Simulated Horizon Growth</span>
              <Percent className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${
                simulation.simulatedKpis.growthRatePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {simulation.simulatedKpis.growthRatePercent > 0 ? '+' : ''}
                {simulation.simulatedKpis.growthRatePercent.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500">
                vs last actual
              </span>
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Baseline Growth:</span>
              <span className="font-mono font-bold text-slate-300">
                {simulation.baselineKpis.growthRatePercent > 0 ? '+' : ''}
                {simulation.baselineKpis.growthRatePercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Card 4: Confidence Interval / Volatility */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">{confidenceLevel}% Confidence Band</span>
              <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                ± Margin
              </span>
            </div>
            <div className="text-xs space-y-1.5 font-mono pt-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Upper Limit:</span>
                <span className="font-bold text-emerald-400">
                  {simulation.simulatedKpis.max.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-500">Lower Limit:</span>
                <span className="font-bold text-amber-400">
                  {simulation.simulatedKpis.min.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full w-full opacity-80" />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* MAIN BODY: PARAMETER SLIDERS (LEFT) & VISUAL FORECAST ENGINE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DYNAMIC DRIVER PARAMETER SLIDERS (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">Driver Variables & Sliders</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                  {parameters.length} active
                </span>
              </div>

              {availableCandidateColumns.length > 0 && (
                <button
                  id="add-driver-param-btn"
                  onClick={() => setIsAddDriverOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Driver</span>
                </button>
              )}
            </div>

            {parameters.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No driver parameters configured. Click "Add Driver" to select variable drivers.
              </div>
            ) : (
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                {parameters.map(param => {
                  const isPositive = param.percentChange > 0;
                  const isNegative = param.percentChange < 0;
                  
                  return (
                    <div
                      key={param.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3 shadow-sm"
                    >
                      {/* Driver Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{param.label}</span>
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                              title={`Historical Elasticity: 1% change causes ~${(param.elasticity).toFixed(2)}% shift in target`}
                            >
                              e = {param.elasticity.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            Base: {param.baseValue.toLocaleString()} → Current: {param.currentValue.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border ${
                              isPositive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isNegative
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {isPositive ? '+' : ''}{param.percentChange}%
                          </span>

                          <button
                            onClick={() => handleRemoveParameter(param.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remove driver"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Slider Input */}
                      <div className="space-y-1.5">
                        <input
                          type="range"
                          min={param.minPercent}
                          max={param.maxPercent}
                          step={param.step}
                          value={param.percentChange}
                          onChange={e => handleUpdateParamPercent(param.id, Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>{param.minPercent}%</span>
                          <span className="text-slate-400">0%</span>
                          <span>+{param.maxPercent}%</span>
                        </div>
                      </div>

                      {/* Step Increment Quick Buttons */}
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-900">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateParamPercent(param.id, param.percentChange - 10)}
                            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            -10%
                          </button>
                          <button
                            onClick={() => handleUpdateParamPercent(param.id, param.percentChange - 5)}
                            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            -5%
                          </button>
                        </div>

                        <button
                          onClick={() => handleUpdateParamPercent(param.id, 0)}
                          className="text-[10px] text-slate-500 hover:text-slate-300"
                        >
                          Reset
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateParamPercent(param.id, param.percentChange + 5)}
                            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            +5%
                          </button>
                          <button
                            onClick={() => handleUpdateParamPercent(param.id, param.percentChange + 10)}
                            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            +10%
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* SAVED SCENARIOS ACCORDION / DRAWER */}
          {savedScenarios.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5 text-indigo-400" />
                  Saved Scenario Library ({savedScenarios.length})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Click to load</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedScenarios.map(sc => (
                  <div
                    key={sc.id}
                    onClick={() => handleLoadScenario(sc)}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                          {sc.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                            sc.simulatedTotalDiffPercent >= 0
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {sc.simulatedTotalDiffPercent > 0 ? '+' : ''}
                          {sc.simulatedTotalDiffPercent.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {sc.modelType.toUpperCase()} • {new Date(sc.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteScenario(sc.id, e)}
                      className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete saved scenario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: INTERACTIVE VISUALIZATIONS & PROJECTIONS (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            
            {/* Chart Sub-Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  id="tab-chart-forecast-btn"
                  onClick={() => setActiveViewTab('forecast')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeViewTab === 'forecast'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Trajectory Forecast
                </button>
                <button
                  id="tab-chart-sensitivity-btn"
                  onClick={() => setActiveViewTab('sensitivity')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeViewTab === 'sensitivity'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Driver Sensitivity
                </button>
                <button
                  id="tab-chart-monte-btn"
                  onClick={() => setActiveViewTab('monte_carlo')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeViewTab === 'monte_carlo'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Probabilistic Fan
                </button>
                <button
                  id="tab-chart-table-btn"
                  onClick={() => setActiveViewTab('table')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    activeViewTab === 'table'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Step Breakdown
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  Actual
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  Simulated
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  Baseline
                </span>
              </div>
            </div>

            {/* TAB 1: MAIN FORECAST & CONFIDENCE INTERVAL CHART */}
            {activeViewTab === 'forecast' && simulation && (
              <div className="space-y-4">
                <div className="h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={simulation.timeSeriesData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="simulatedArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      
                      <XAxis
                        dataKey="periodLabel"
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        domain={['auto', 'auto']}
                      />

                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#f8fafc'
                        }}
                        formatter={(val: any, name: any) => {
                          if (val === null || val === undefined) return ['--', name];
                          const formatted = typeof val === 'number' ? val.toLocaleString() : val;
                          if (name === 'simulatedForecast') return [formatted, 'Simulated Projection'];
                          if (name === 'baselineForecast') return [formatted, 'Baseline Forecast'];
                          if (name === 'actual') return [formatted, 'Actual Value'];
                          if (name === 'upperConfidence') return [formatted, `Upper Bound (${confidenceLevel}%)`];
                          if (name === 'lowerConfidence') return [formatted, `Lower Bound (${confidenceLevel}%)`];
                          return [formatted, name];
                        }}
                      />

                      {/* Confidence Interval Shaded Band */}
                      <Area
                        type="monotone"
                        dataKey="upperConfidence"
                        stroke="none"
                        fill="url(#confidenceBand)"
                        isAnimationActive={false}
                      />

                      {/* Baseline Counterfactual (Dotted Gray) */}
                      <Line
                        type="monotone"
                        dataKey="baselineForecast"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                        isAnimationActive={false}
                      />

                      {/* Historical Actuals (Solid Cyan) */}
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#06b6d4' }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />

                      {/* Simulated Projection (Solid Emerald) */}
                      <Line
                        type="monotone"
                        dataKey="simulatedForecast"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 3.5, fill: '#10b981' }}
                        isAnimationActive={false}
                      />

                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>
                      Model: <strong>{modelType.toUpperCase()}</strong> with <strong>+{horizonPeriods} periods</strong> forward projection.
                    </span>
                  </div>
                  <span className="font-mono text-slate-500">
                    Target: {simulation.targetLabel}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 2: DRIVER SENSITIVITY TORNADO / BAR MATRIX */}
            {activeViewTab === 'sensitivity' && simulation && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400">
                  Relative impact of each adjusted parameter on the projected <strong>{simulation.targetLabel}</strong>:
                </div>

                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={simulation.parameterSensitivities}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
                      <YAxis type="category" dataKey="paramName" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#f8fafc'
                        }}
                        formatter={(val: any) => [`${val > 0 ? '+' : ''}${val}%`, 'Impact on Target']}
                      />
                      <ReferenceLine x={0} stroke="#475569" />
                      <Bar dataKey="estimatedImpactPercent" radius={[0, 6, 6, 0]}>
                        {simulation.parameterSensitivities.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.estimatedImpactPercent >= 0 ? '#10b981' : '#f43f5e'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 3: MONTE CARLO PROBABILISTIC FAN */}
            {activeViewTab === 'monte_carlo' && simulation && simulation.monteCarloSummary && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Stochastic distribution based on <strong>300 simulation iterations</strong> with historical volatility:
                  </span>
                  <span className="font-mono text-cyan-400">
                    Volatility: ±{simulation.monteCarloSummary.volatilityPercent}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">P10 (Pessimistic)</span>
                    <span className="text-sm font-bold text-amber-400">
                      {simulation.monteCarloSummary.p10Outcome.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">P50 (Median Expected)</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {simulation.monteCarloSummary.medianOutcome.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">P90 (Optimistic)</span>
                    <span className="text-sm font-bold text-cyan-400">
                      {simulation.monteCarloSummary.p90Outcome.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={simulation.timeSeriesData.filter(p => p.isProjected)}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#020617',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#f8fafc'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="upperConfidence"
                        stroke="#06b6d4"
                        fill="#06b6d4"
                        fillOpacity={0.15}
                        name="Upper Confidence (95%)"
                      />
                      <Line
                        type="monotone"
                        dataKey="simulatedForecast"
                        stroke="#10b981"
                        strokeWidth={3}
                        name="Expected Outcome"
                      />
                      <Line
                        type="monotone"
                        dataKey="lowerConfidence"
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        name="Lower Confidence (95%)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TAB 4: STEP BREAKDOWN TABLE */}
            {activeViewTab === 'table' && simulation && (
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Actual</th>
                      <th className="py-2.5 px-3">Baseline</th>
                      <th className="py-2.5 px-3">Simulated</th>
                      <th className="py-2.5 px-3">Variance</th>
                      <th className="py-2.5 px-3">Confidence Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {simulation.timeSeriesData.map((pt, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          pt.isProjected ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-semibold text-white">{pt.periodLabel}</td>
                        <td className="py-2 px-3">
                          {pt.isProjected ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              PROJECTED
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              HISTORICAL
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-cyan-400 font-bold">
                          {pt.actual !== null && pt.actual !== undefined ? pt.actual.toLocaleString() : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {pt.baselineForecast.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-emerald-400 font-bold">
                          {pt.simulatedForecast.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-bold">
                          {pt.isProjected ? (
                            <span
                              className={
                                pt.deltaPercent > 0
                                  ? 'text-emerald-400'
                                  : pt.deltaPercent < 0
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }
                            >
                              {pt.deltaPercent > 0 ? '+' : ''}{pt.deltaPercent}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">
                          [{pt.lowerConfidence.toLocaleString()} ... {pt.upperConfidence.toLocaleString()}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* AUTOMATED AI SCENARIO INSIGHTS */}
          {simulation && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Automated Scenario Synthesis & Key Drivers
                </h4>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                {simulation.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <div
                      className="leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: insight
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL: ADD DRIVER VARIABLE */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Attach New Driver Variable
              </h3>
              <button onClick={() => setIsAddDriverOpen(false)} className="text-slate-400 hover:text-white">
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select a numerical column from <strong>{dataset.name}</strong> to attach as an adjustable slider. The engine will automatically compute its sensitivity elasticity to <strong>{targetColumn}</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Candidate Column:</label>
              <select
                id="add-candidate-driver-select"
                value={selectedNewDriverCol}
                onChange={e => setSelectedNewDriverCol(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose a Feature --</option>
                {availableCandidateColumns.map(col => (
                  <option key={col.id || col.name} value={col.name}>
                    {col.name} ({col.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddDriverOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-add-driver-btn"
                disabled={!selectedNewDriverCol}
                onClick={handleAddCustomDriver}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow"
              >
                Attach Driver
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: SAVE SCENARIO */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-emerald-400" />
                Save Scenario Snapshot
              </h3>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-slate-400 hover:text-white">
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Save your current parameter configuration, target metric, and forecast trajectory for future access or team review.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Scenario Name:</label>
              <input
                type="text"
                id="save-scenario-name-input"
                value={scenarioNameInput}
                onChange={e => setScenarioNameInput(e.target.value)}
                placeholder="e.g., Q4 2026 Aggressive Expansion (+25%)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Target: <strong>{targetColumn}</strong></div>
              <div>Model: <strong>{modelType.toUpperCase()}</strong> (+{horizonPeriods} periods)</div>
              <div>Net Shift: <strong>{simulation?.deltaKpis.totalPercentDiff.toFixed(1)}%</strong></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-save-scenario-btn"
                disabled={!scenarioNameInput.trim()}
                onClick={handleSaveScenario}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow"
              >
                Save Scenario
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
