import React, { useState } from 'react';
import { 
  BarChart3, 
  Wand2, 
  Activity, 
  PieChart as PieIcon, 
  Grid, 
  Terminal, 
  Sparkles, 
  FileText,
  Layers,
  ChevronRight,
  ShieldAlert,
  UploadCloud,
  Compass,
  Globe,
  HeartPulse,
  MessageSquare,
  Sparkles as SparklesIcon,
  Sliders
} from 'lucide-react';
import { Dataset } from '../../types';
import { EdaProfiler } from './EdaProfiler';
import { DataCleaner } from './DataCleaner';
import { DataHealthView } from './DataHealthView';
import { StatisticalSuite } from './StatisticalSuite';
import { AnomalyDetector } from './AnomalyDetector';
import { ChartStudio } from './ChartStudio';
import { PivotStudio } from './PivotStudio';
import { SqlQueryRunner } from './SqlQueryRunner';
import { AiAnalyst } from './AiAnalyst';
import { ReportExporter } from './ReportExporter';
import { DimensionalityReductionStudio } from './DimensionalityReductionStudio';
import { GeospatialMapStudio } from './GeospatialMapStudio';
import { AnomalyAlertingStudio } from './AnomalyAlertingStudio';
import { QualitativeAnalysisStudio } from './QualitativeAnalysisStudio';
import { AutoMLPredictiveStudio } from './AutoMLPredictiveStudio';
import { CohortLongitudinalStudio } from './CohortLongitudinalStudio';
import { ExecutiveSlideDeckModal } from './ExecutiveSlideDeckModal';
import { PrivacyMaskingStudio } from './PrivacyMaskingStudio';
import { CausalInferenceStudio } from './CausalInferenceStudio';
import { AudioDebriefStudio } from './AudioDebriefStudio';
import { GoalSeekOptimizerStudio } from './GoalSeekOptimizerStudio';
import { AiCouncilDebateStudio } from './AiCouncilDebateStudio';
import { ScrollytellingStudio } from './ScrollytellingStudio';
import { DriftPipelineSimulator } from './DriftPipelineSimulator';
import { 
  BrainCircuit, 
  Users as UsersIcon, 
  Presentation, 
  ShieldCheck,
  GitBranch,
  Headphones,
  Target,
  Flame,
  BookOpen,
  GitPullRequest
} from 'lucide-react';

interface AnalysisHubProps {
  dataset: Dataset | null;
  availableDatasets?: Dataset[];
  onUpdateDataset: (updated: Dataset) => void;
  onCreateDataset: (newDataset: Dataset) => void;
  onOpenUploadStudio?: () => void;
  onOpenDatasetModal?: (tab?: 'list' | 'versions') => void;
  initialTool?: AnalysisToolType;
}

export type AnalysisToolType = 
  | 'causal_whatif'
  | 'audio_debrief'
  | 'goal_optimizer'
  | 'ai_council'
  | 'scrollytelling'
  | 'drift_pipeline'
  | 'privacy_masking'
  | 'data_health'
  | 'qualitative'
  | 'automl'
  | 'cohort_wave'
  | 'slide_deck'
  | 'eda' 
  | 'cleaner' 
  | 'anomaly'
  | 'anomaly_alerting'
  | 'stats' 
  | 'pca'
  | 'geo_map'
  | 'charts' 
  | 'pivot' 
  | 'sql' 
  | 'ai_analyst' 
  | 'report';

export const AnalysisHub: React.FC<AnalysisHubProps> = ({
  dataset,
  availableDatasets = [],
  onUpdateDataset,
  onCreateDataset,
  onOpenUploadStudio,
  onOpenDatasetModal,
  initialTool = 'qualitative',
}) => {
  const [activeTool, setActiveTool] = useState<AnalysisToolType>(initialTool);
  const [paradigmFilter, setParadigmFilter] = useState<'all' | 'innovative' | 'qualitative' | 'quantitative'>('all');

  if (!dataset) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl my-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
          <UploadCloud className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Active Dataset for Analysis</h2>
        <p className="text-sm text-slate-400">
          Upload a CSV, Excel, or JSON file, or gather field submissions to start analyzing patterns, detecting anomalies, and running statistical tests.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          {onOpenUploadStudio && (
            <button
              onClick={onOpenUploadStudio}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              Upload Dataset
            </button>
          )}
          {onOpenDatasetModal && (
            <button
              onClick={() => onOpenDatasetModal('create')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
            >
              Create New Schema
            </button>
          )}
        </div>
      </div>
    );
  }

  const tools = [
    {
      id: 'causal_whatif',
      name: 'Causal & What-If',
      description: 'Directed Acyclic Graph (DAG), backdoor confounder conditioning & counterfactual simulation',
      icon: GitBranch,
      badge: 'Causal Inference',
      accentColor: 'cyan',
      category: 'innovative',
    },
    {
      id: 'audio_debrief',
      name: 'Audio Debrief & Podcast',
      description: 'NotebookLM-style dual-host audio debrief, anomaly debate & interactive speech transcript',
      icon: Headphones,
      badge: 'Audio Podcast',
      accentColor: 'amber',
      category: 'innovative',
    },
    {
      id: 'goal_optimizer',
      name: 'Target Finder & Goals',
      description: 'Reverse prescriptive optimization: specify desired KPI goal and solve for exact lever deltas',
      icon: Target,
      badge: 'Prescriptive ML',
      accentColor: 'emerald',
      category: 'innovative',
    },
    {
      id: 'ai_council',
      name: 'Adversarial AI Council',
      description: 'Growth Strategist vs Skeptical Risk Auditor vs Methodologist multi-agent contrarian debate',
      icon: Flame,
      badge: 'Red Team',
      accentColor: 'rose',
      category: 'innovative',
    },
    {
      id: 'scrollytelling',
      name: 'Scrollytelling Story',
      description: 'Interactive NYT-style narrative presentation with step-by-step chart transitions & presenter mode',
      icon: BookOpen,
      badge: 'Scrollytelling',
      accentColor: 'blue',
      category: 'innovative',
    },
    {
      id: 'drift_pipeline',
      name: 'Drift & Self-Healing',
      description: 'Simulate streaming batches, Kolmogorov-Smirnov & PSI drift tests, and auto-generate healing code',
      icon: GitPullRequest,
      badge: 'Living Pipeline',
      accentColor: 'teal',
      category: 'innovative',
    },
    {
      id: 'qualitative',
      name: 'Qualitative & Text',
      description: 'Thematic coding, sentiment & emotion analysis, n-grams & narrative synthesis',
      icon: MessageSquare,
      badge: 'Qualitative',
      accentColor: 'rose',
      category: 'qualitative',
    },
    {
      id: 'automl',
      name: 'AutoML & Predictive',
      description: 'Client-side Logistic, Decision Tree, Ridge & K-Means modeling with live what-if simulation',
      icon: BrainCircuit,
      badge: 'Predictive ML',
      accentColor: 'violet',
      category: 'quantitative',
    },
    {
      id: 'cohort_wave',
      name: 'Cohort & Longitudinal',
      description: 'Demographic segment comparison, Welch t-tests, Cohen d effect sizes & wave tracking',
      icon: UsersIcon,
      badge: 'Cohort Intel',
      accentColor: 'cyan',
      category: 'both',
    },
    {
      id: 'slide_deck',
      name: 'Executive Slide Deck',
      description: 'Interactive C-suite presentation slides, key signals, verbatim spotlight & printable deck',
      icon: Presentation,
      badge: 'Briefing',
      accentColor: 'amber',
      category: 'both',
    },
    {
      id: 'privacy_masking',
      name: 'Privacy & Governance',
      description: 'PII masking, k-anonymity quasi-identifier risk, synthetic digital twins, GDPR right to erasure & Gebru datasheets',
      icon: ShieldCheck,
      badge: 'Privacy Suite',
      accentColor: 'emerald',
      category: 'both',
    },
    {
      id: 'data_health',
      name: 'Data Health',
      description: 'Gemini AI quality audit: detect outliers, missing values & duplicates with 1-click clean suggestions',
      icon: HeartPulse,
      badge: 'Health Audit',
      accentColor: 'emerald',
      category: 'both',
    },
    {
      id: 'ai_analyst',
      name: 'AI Data Scientist',
      description: 'Natural language dataset Q&A, pattern discovery & strategic advice',
      icon: Sparkles,
      badge: 'Gemini AI',
      accentColor: 'rose',
      category: 'both',
    },
    {
      id: 'report',
      name: 'Dashboard & Report',
      description: 'Interactive visual dashboard, executive KPIs, presentation mode & exportable dossier',
      icon: FileText,
      badge: 'Dashboard',
      accentColor: 'blue',
      category: 'both',
    },
    {
      id: 'eda',
      name: 'EDA & Profiler',
      description: 'Health scoring, completeness, feature distributions & skewness',
      icon: BarChart3,
      badge: 'Profile',
      accentColor: 'indigo',
      category: 'quantitative',
    },
    {
      id: 'cleaner',
      name: 'Cleaning & Prep',
      description: 'Impute missing values, deduplicate, outlier winsorization & math',
      icon: Wand2,
      badge: 'Transform',
      accentColor: 'teal',
      category: 'both',
    },
    {
      id: 'anomaly',
      name: 'Anomaly Detection',
      description: 'Highlight and mitigate statistical outliers via Z-scores and MAD',
      icon: ShieldAlert,
      badge: 'Z-Score',
      accentColor: 'rose',
      category: 'quantitative',
    },
    {
      id: 'anomaly_alerting',
      name: 'Anomaly Alerting',
      description: 'Real-time Z-score statistical threshold alerts & browser notifications',
      icon: ShieldAlert,
      badge: 'Live Alerts',
      accentColor: 'rose',
      category: 'quantitative',
    },
    {
      id: 'stats',
      name: 'Statistical Inference',
      description: 'Linear regression, correlation matrix, hypothesis tests & K-means',
      icon: Activity,
      badge: 'Inference',
      accentColor: 'cyan',
      category: 'quantitative',
    },
    {
      id: 'pca',
      name: 'PCA & Clustering',
      description: '2D/3D projection, eigenvalue scree plots, loadings biplot & K-Means',
      icon: Compass,
      badge: 'Dim Reduct',
      accentColor: 'indigo',
      category: 'quantitative',
    },
    {
      id: 'geo_map',
      name: 'Geospatial GIS Map',
      description: 'Interactive coordinates mapper, heatmaps & GPS field route trails',
      icon: Globe,
      badge: 'GIS Maps',
      accentColor: 'emerald',
      category: 'both',
    },
    {
      id: 'charts',
      name: 'Chart Studio',
      description: 'Bar, line, area, scatter, pie/donut, radar & visual aggregations',
      icon: PieIcon,
      badge: 'Viz Studio',
      accentColor: 'purple',
      category: 'both',
    },
    {
      id: 'pivot',
      name: 'Pivot Engine',
      description: 'Multi-dimensional cross-tabulation with row/col grand totals',
      icon: Grid,
      badge: 'Cross-Tab',
      accentColor: 'amber',
      category: 'quantitative',
    },
    {
      id: 'sql',
      name: 'SQL Console',
      description: 'Execute in-memory SQL with SELECT, WHERE, GROUP BY & ORDER BY',
      icon: Terminal,
      badge: 'SQL Engine',
      accentColor: 'emerald',
      category: 'quantitative',
    },
  ];

  const visibleTools = tools.filter(t => {
    if (paradigmFilter === 'all') return true;
    if (paradigmFilter === 'innovative') return t.category === 'innovative';
    if (paradigmFilter === 'qualitative') return t.category === 'qualitative' || t.category === 'both';
    if (paradigmFilter === 'quantitative') return t.category === 'quantitative' || t.category === 'both';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Paradigm Filter & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Research Suite:</span>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 flex-wrap">
            <button
              onClick={() => setParadigmFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                paradigmFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Research ({tools.length})
            </button>
            <button
              onClick={() => setParadigmFilter('innovative')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                paradigmFilter === 'innovative'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold shadow-sm'
                  : 'text-amber-300/80 hover:text-amber-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Innovative &amp; Prescriptive (6)</span>
            </button>
            <button
              onClick={() => setParadigmFilter('qualitative')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                paradigmFilter === 'qualitative'
                  ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold shadow-sm'
                  : 'text-rose-300/80 hover:text-rose-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Qualitative &amp; Text</span>
            </button>
            <button
              onClick={() => setParadigmFilter('quantitative')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                paradigmFilter === 'quantitative'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold shadow-sm'
                  : 'text-cyan-300/80 hover:text-cyan-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Quantitative &amp; Stats</span>
            </button>
          </div>
        </div>

        {onOpenUploadStudio && (
          <button
            onClick={onOpenUploadStudio}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold whitespace-nowrap transition-all shrink-0 shadow-sm"
            title="Upload and analyze your own custom dataset"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Own Dataset</span>
          </button>
        )}
      </div>

      {/* Top Analysis Sub-Navigation Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-lg flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 flex-1">
          {visibleTools.map(tool => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as AnalysisToolType)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tool.name}</span>
                {tool.badge && (
                  <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Analysis Workspace */}
      <div className="animate-in fade-in duration-200">
        {activeTool === 'causal_whatif' && (
          <CausalInferenceStudio
            dataset={dataset}
            onCreateDataset={onCreateDataset}
          />
        )}
        {activeTool === 'audio_debrief' && (
          <AudioDebriefStudio
            dataset={dataset}
          />
        )}
        {activeTool === 'goal_optimizer' && (
          <GoalSeekOptimizerStudio
            dataset={dataset}
            onCreateDataset={onCreateDataset}
          />
        )}
        {activeTool === 'ai_council' && (
          <AiCouncilDebateStudio
            dataset={dataset}
          />
        )}
        {activeTool === 'scrollytelling' && (
          <ScrollytellingStudio
            dataset={dataset}
          />
        )}
        {activeTool === 'drift_pipeline' && (
          <DriftPipelineSimulator
            dataset={dataset}
          />
        )}
        {activeTool === 'qualitative' && (
          <QualitativeAnalysisStudio
            dataset={dataset}
            onUpdateDataset={onUpdateDataset}
            onCreateDataset={onCreateDataset}
          />
        )}
        {activeTool === 'automl' && (
          <AutoMLPredictiveStudio
            dataset={dataset}
            onUpdateDataset={onUpdateDataset}
          />
        )}
        {activeTool === 'cohort_wave' && (
          <CohortLongitudinalStudio
            dataset={dataset}
          />
        )}
        {activeTool === 'slide_deck' && (
          <ExecutiveSlideDeckModal
            isOpen={true}
            onClose={() => setActiveTool('report')}
            dataset={dataset}
          />
        )}
        {activeTool === 'privacy_masking' && (
          <PrivacyMaskingStudio
            dataset={dataset}
            onUpdateDataset={onUpdateDataset}
            onAddDataset={onCreateDataset}
          />
        )}
        {activeTool === 'data_health' && (
          <DataHealthView 
            dataset={dataset} 
            onUpdateDataset={onUpdateDataset} 
            onOpenVersionsModal={() => onOpenDatasetModal?.('versions')}
          />
        )}
        {activeTool === 'eda' && <EdaProfiler dataset={dataset} />}
        {activeTool === 'cleaner' && (
          <DataCleaner 
            dataset={dataset} 
            onUpdateDataset={onUpdateDataset} 
            onOpenVersionsModal={() => onOpenDatasetModal?.('versions')}
          />
        )}
        {activeTool === 'anomaly' && (
          <AnomalyDetector 
            dataset={dataset} 
            onUpdateDataset={onUpdateDataset} 
            onCreateDataset={onCreateDataset} 
          />
        )}
        {activeTool === 'anomaly_alerting' && (
          <AnomalyAlertingStudio
            dataset={dataset}
            availableDatasets={availableDatasets.length > 0 ? availableDatasets : [dataset]}
            onUpdateDataset={onUpdateDataset}
            onCreateDataset={onCreateDataset}
          />
        )}
        {activeTool === 'stats' && <StatisticalSuite dataset={dataset} />}
        {activeTool === 'pca' && (
          <DimensionalityReductionStudio
            dataset={dataset}
            onUpdateDataset={onUpdateDataset}
            onCreateDataset={onCreateDataset}
          />
        )}
        {activeTool === 'geo_map' && (
          <GeospatialMapStudio
            dataset={dataset}
            onCreateDataset={onCreateDataset}
            onUpdateDataset={onUpdateDataset}
          />
        )}
        {activeTool === 'charts' && <ChartStudio dataset={dataset} />}
        {activeTool === 'pivot' && <PivotStudio dataset={dataset} />}
        {activeTool === 'sql' && (
          <SqlQueryRunner
            dataset={dataset}
            onCreateDatasetFromQuery={onCreateDataset}
          />
        )}
        {activeTool === 'ai_analyst' && (
          <AiAnalyst 
            dataset={dataset} 
            onUpdateDataset={onUpdateDataset}
            onNavigateTool={(tool) => setActiveTool(tool)}
          />
        )}
        {activeTool === 'report' && <ReportExporter dataset={dataset} />}
      </div>

    </div>
  );
};
