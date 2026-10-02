import React, { useState, useMemo } from 'react';
import {
  Compass,
  Layers,
  Sparkles,
  Sliders,
  Table,
  BarChart3,
  CheckCircle2,
  Download,
  Info,
  RefreshCw,
  PlusCircle,
  Eye,
  Crosshair,
  ArrowUpRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { Dataset } from '../../types';
import { executePCA, PCAResult } from '../../utils/pcaClusteringEngine';
import { generateColumnsFromData } from '../../utils/dataEngine';

interface DimensionalityReductionStudioProps {
  dataset: Dataset;
  onUpdateDataset?: (updated: Dataset) => void;
  onCreateDataset?: (newDataset: Dataset) => void;
}

export const DimensionalityReductionStudio: React.FC<DimensionalityReductionStudioProps> = ({
  dataset,
  onUpdateDataset,
  onCreateDataset,
}) => {
  // Numeric columns available
  const numericColumns = useMemo(() => {
    return dataset.columns.filter(c => c.type === 'number').map(c => c.name);
  }, [dataset]);

  const categoricalColumns = useMemo(() => {
    return dataset.columns.filter(c => c.type === 'string').map(c => c.name);
  }, [dataset]);

  // Settings state
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => numericColumns.slice(0, 8));
  const [kClusters, setKClusters] = useState<number>(3);
  const [labelColumn, setLabelColumn] = useState<string>(() => categoricalColumns[0] || '');
  const [showBiplotVectors, setShowBiplotVectors] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'scatter' | 'scree' | 'centroids' | 'loadings'>('scatter');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Compute PCA & Clustering
  const pcaResult: PCAResult | null = useMemo(() => {
    if (selectedFeatures.length < 2) return null;
    return executePCA(dataset, selectedFeatures, kClusters, labelColumn);
  }, [dataset, selectedFeatures, kClusters, labelColumn]);

  // Scatter plot bounds and scaling
  const scatterBounds = useMemo(() => {
    if (!pcaResult || pcaResult.points.length === 0) {
      return { minX: -5, maxX: 5, minY: -5, maxY: 5 };
    }
    const xs = pcaResult.points.map(p => p.pc1);
    const ys = pcaResult.points.map(p => p.pc2);

    const pad = 0.5;
    return {
      minX: Math.min(...xs) - pad,
      maxX: Math.max(...xs) + pad,
      minY: Math.min(...ys) - pad,
      maxY: Math.max(...ys) + pad,
    };
  }, [pcaResult]);

  // Toggle feature selection
  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      if (selectedFeatures.length > 2) {
        setSelectedFeatures(prev => prev.filter(f => f !== feat));
      }
    } else {
      setSelectedFeatures(prev => [...prev, feat]);
    }
  };

  // Append PCA & Cluster Columns into Dataset
  const handleAppendToDataset = () => {
    if (!pcaResult) return;

    const enrichedRows = dataset.data.map((row, idx) => {
      const pcaPoint = pcaResult.points.find(p => p.rowIndex === idx);
      if (pcaPoint) {
        return {
          ...row,
          pca_cluster: pcaResult.clusters[pcaPoint.cluster]?.name || `Cluster ${pcaPoint.cluster + 1}`,
          pca_cluster_id: pcaPoint.cluster,
          pca_score_pc1: pcaPoint.pc1,
          pca_score_pc2: pcaPoint.pc2,
        };
      }
      return row;
    });

    const newCols = generateColumnsFromData(enrichedRows);

    if (onUpdateDataset) {
      onUpdateDataset({
        ...dataset,
        data: enrichedRows,
        columns: newCols,
        updatedAt: new Date().toISOString(),
      });
      setStatusMessage('PCA cluster IDs and PC1/PC2 coordinates added to active dataset!');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Create New Clustered Dataset
  const handleCreateClusteredDataset = () => {
    if (!pcaResult || !onCreateDataset) return;

    const enrichedRows = dataset.data.map((row, idx) => {
      const pcaPoint = pcaResult.points.find(p => p.rowIndex === idx);
      return {
        ...row,
        pca_cluster: pcaResult.clusters[pcaPoint ? pcaPoint.cluster : 0]?.name || 'Cluster A',
        pca_cluster_id: pcaPoint ? pcaPoint.cluster : 0,
        pca_score_pc1: pcaPoint ? pcaPoint.pc1 : 0,
        pca_score_pc2: pcaPoint ? pcaPoint.pc2 : 0,
      };
    });

    const newDs: Dataset = {
      id: `ds_pca_${Date.now()}`,
      name: `${dataset.name} (PCA Clustered k=${kClusters})`,
      description: `Segmented into ${kClusters} clusters via Principal Component Analysis`,
      sourceType: 'manual',
      data: enrichedRows,
      columns: generateColumnsFromData(enrichedRows),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateDataset(newDs);
    setStatusMessage(`Created new dataset with ${kClusters} segmented clusters!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  if (numericColumns.length < 2) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <Compass className="w-10 h-10 mx-auto text-slate-600" />
        <h3 className="text-sm font-bold text-white">Insufficient Numeric Features</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Dimensionality reduction requires at least 2 numerical columns to calculate variance eigenvalues and spatial projections.
        </p>
      </div>
    );
  }

  // SVG dimensions for scatter plot
  const svgWidth = 650;
  const svgHeight = 420;
  const margin = { top: 30, right: 30, bottom: 45, left: 55 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const scaleX = (val: number) => {
    return margin.left + ((val - scatterBounds.minX) / (scatterBounds.maxX - scatterBounds.minX || 1)) * plotWidth;
  };

  const scaleY = (val: number) => {
    return margin.top + plotHeight - ((val - scatterBounds.minY) / (scatterBounds.maxY - scatterBounds.minY || 1)) * plotHeight;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER & CONTROL BANNER */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Compass className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Dimensionality Reduction & Clustering (PCA + K-Means)
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Project multi-dimensional feature spaces onto 2D principal axes ($PC_1$ vs $PC_2$), uncover natural clustering segments, and inspect feature vector loadings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onUpdateDataset && (
              <button
                onClick={handleAppendToDataset}
                disabled={!pcaResult}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
                title="Add cluster ID and PC coordinates to current dataset"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Append Clusters to Dataset</span>
              </button>
            )}

            {onCreateDataset && (
              <button
                onClick={handleCreateClusteredDataset}
                disabled={!pcaResult}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export as New Dataset</span>
              </button>
            )}
          </div>
        </div>

        {/* Action / Status Alert */}
        {statusMessage && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Feature Checkboxes & Clustering Parameters */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Feature selection checklist */}
          <div className="lg:col-span-2 space-y-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Active Dimensional Features ({selectedFeatures.length}/{numericColumns.length})
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {numericColumns.map(col => {
                const isSelected = selectedFeatures.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => toggleFeature(col)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-semibold'
                        : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          </div>

          {/* K-Means Clusters Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Clusters (k = {kClusters})
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400">{kClusters} Groups</span>
            </div>
            <input
              type="range"
              min="2"
              max="6"
              step="1"
              value={kClusters}
              onChange={e => setKClusters(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>k=2</span>
              <span>k=4</span>
              <span>k=6</span>
            </div>
          </div>

          {/* Data Label Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Point Hover Label
            </label>
            <select
              value={labelColumn}
              onChange={e => setLabelColumn(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Row Index</option>
              {dataset.columns.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <div className="flex items-center justify-between pt-1">
              <label className="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBiplotVectors}
                  onChange={e => setShowBiplotVectors(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-600"
                />
                <span>Show Biplot Vectors</span>
              </label>
            </div>
          </div>

        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-800/80 pt-3">
          <button
            onClick={() => setActiveTab('scatter')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'scatter'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>2D PCA Scatter Biplot</span>
          </button>

          <button
            onClick={() => setActiveTab('scree')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'scree'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Explained Variance Scree Plot</span>
          </button>

          <button
            onClick={() => setActiveTab('centroids')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'centroids'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cluster Centroid Profiles</span>
          </button>

          <button
            onClick={() => setActiveTab('loadings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'loadings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-slate-950/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Feature Loadings Table</span>
          </button>
        </div>
      </div>

      {/* STATISTICAL SUMMARY CHIPS */}
      {pcaResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PC1 Variance</span>
            <div className="text-lg font-extrabold text-indigo-400 font-mono">
              {pcaResult.explainedVariance[0]}%
            </div>
            <span className="text-[10px] text-slate-500">First principal axis</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PC2 Variance</span>
            <div className="text-lg font-extrabold text-cyan-400 font-mono">
              {pcaResult.explainedVariance[1] || 0}%
            </div>
            <span className="text-[10px] text-slate-500">Second principal axis</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cumulative (2D)</span>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">
              {pcaResult.cumulativeVariance[1] || pcaResult.cumulativeVariance[0]}%
            </div>
            <span className="text-[10px] text-slate-500">Total variance retained</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cluster Count</span>
            <div className="text-lg font-extrabold text-amber-400 font-mono">
              {pcaResult.clusters.length} Segments
            </div>
            <span className="text-[10px] text-slate-500">{pcaResult.points.length} points classified</span>
          </div>
        </div>
      )}

      {/* TAB 1: INTERACTIVE 2D PCA SCATTER BIPLOT */}
      {activeTab === 'scatter' && pcaResult && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main SVG Scatter Biplot */}
          <div className="lg:col-span-3 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-indigo-400" />
                <span>PC1 ({pcaResult.explainedVariance[0]}%) vs PC2 ({pcaResult.explainedVariance[1]}%) Biplot</span>
              </h3>
              <div className="flex items-center gap-3 text-xs">
                {pcaResult.clusters.map(cl => (
                  <div key={cl.id} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cl.color }} />
                    <span className="text-slate-300 font-medium">{cl.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SVG Visualizer */}
            <div className="w-full bg-slate-950 rounded-2xl border border-slate-800/80 p-2 overflow-x-auto flex justify-center">
              <svg width={svgWidth} height={svgHeight} className="overflow-visible select-none">
                
                {/* Axis Grid lines */}
                <line
                  x1={margin.left}
                  y1={scaleY(0)}
                  x2={margin.left + plotWidth}
                  y2={scaleY(0)}
                  stroke="#334155"
                  strokeDasharray="4,4"
                />
                <line
                  x1={scaleX(0)}
                  y1={margin.top}
                  x2={scaleX(0)}
                  y2={margin.top + plotHeight}
                  stroke="#334155"
                  strokeDasharray="4,4"
                />

                {/* X Axis & Label */}
                <line
                  x1={margin.left}
                  y1={margin.top + plotHeight}
                  x2={margin.left + plotWidth}
                  y2={margin.top + plotHeight}
                  stroke="#475569"
                />
                <text
                  x={margin.left + plotWidth / 2}
                  y={svgHeight - 10}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  Principal Component 1 ({pcaResult.explainedVariance[0]}% variance)
                </text>

                {/* Y Axis & Label */}
                <line
                  x1={margin.left}
                  y1={margin.top}
                  x2={margin.left}
                  y2={margin.top + plotHeight}
                  stroke="#475569"
                />
                <text
                  x={15}
                  y={margin.top + plotHeight / 2}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="600"
                  transform={`rotate(-90 15 ${margin.top + plotHeight / 2})`}
                >
                  Principal Component 2 ({pcaResult.explainedVariance[1]}% variance)
                </text>

                {/* Data Points */}
                {pcaResult.points.map(pt => {
                  const cx = scaleX(pt.pc1);
                  const cy = scaleY(pt.pc2);
                  const color = pcaResult.clusters[pt.cluster]?.color || '#6366f1';

                  return (
                    <g key={pt.id} className="cursor-pointer group">
                      <circle
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        fill={color}
                        opacity="0.8"
                        className="transition-all hover:r-7 hover:opacity-100 hover:stroke-white hover:stroke-2"
                      >
                        <title>{`${pt.label}\nPC1: ${pt.pc1}\nPC2: ${pt.pc2}\nCluster: ${pcaResult.clusters[pt.cluster]?.name}`}</title>
                      </circle>
                    </g>
                  );
                })}

                {/* Biplot Feature Loadings Eigenvector Rays */}
                {showBiplotVectors && pcaResult.loadings.map((load, idx) => {
                  const vectorScale = Math.min(plotWidth, plotHeight) * 0.35;
                  const centerX = scaleX(0);
                  const centerY = scaleY(0);
                  const targetX = centerX + load.pc1 * vectorScale;
                  const targetY = centerY - load.pc2 * vectorScale;

                  return (
                    <g key={load.feature} opacity="0.9">
                      <line
                        x1={centerX}
                        y1={centerY}
                        x2={targetX}
                        y2={targetY}
                        stroke="#f59e0b"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                      <circle cx={targetX} cy={targetY} r="2.5" fill="#f59e0b" />
                      <text
                        x={targetX + (load.pc1 >= 0 ? 5 : -5)}
                        y={targetY + (load.pc2 >= 0 ? -5 : 12)}
                        fill="#fbbf24"
                        fontSize="9.5"
                        fontWeight="bold"
                        textAnchor={load.pc1 >= 0 ? 'start' : 'end'}
                      >
                        {load.feature}
                      </text>
                    </g>
                  );
                })}

              </svg>
            </div>
          </div>

          {/* Clusters Breakdown Sidebar */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Cluster Distributions
              </h4>
              <div className="space-y-3">
                {pcaResult.clusters.map(cl => (
                  <div key={cl.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cl.color }} />
                        <span className="font-bold text-white">{cl.name}</span>
                      </div>
                      <span className="font-mono text-slate-300">{cl.count} rows</span>
                    </div>

                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${cl.percentage}%`, backgroundColor: cl.color }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Proportion</span>
                      <span>{cl.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Biplot Interpretation</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Yellow vectors indicate the directional influence of original variables. Points aligned in the direction of a vector exhibit high values in that feature.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: EXPLAINED VARIANCE SCREE PLOT */}
      {activeTab === 'scree' && pcaResult && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span>Eigenvalue Scree Plot & Cumulative Variance Explained</span>
            </h3>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              Total Variance Retained: {pcaResult.cumulativeVariance[pcaResult.cumulativeVariance.length - 1]}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pcaResult.explainedVariance.map((varPct, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Principal Component #{i + 1}</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                    PC{i + 1}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Individual Variance:</span>
                    <span className="font-bold text-white font-mono">{varPct}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${varPct}%` }} />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Cumulative Total:</span>
                    <span className="font-bold text-emerald-400 font-mono">{pcaResult.cumulativeVariance[i]}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pcaResult.cumulativeVariance[i]}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CLUSTER CENTROID PROFILES */}
      {activeTab === 'centroids' && pcaResult && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Cluster Centroid Means by Feature</span>
            </h3>
            <span className="text-xs text-slate-400">
              Average metric values characteristic of each segment
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="p-3">Cluster</th>
                  <th className="p-3">Size / %</th>
                  {selectedFeatures.map(feat => (
                    <th key={feat} className="p-3">{feat}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pcaResult.clusters.map(cl => (
                  <tr key={cl.id} className="hover:bg-slate-800/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cl.color }} />
                        <span className="font-bold text-white">{cl.name}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {cl.count} ({cl.percentage}%)
                    </td>
                    {selectedFeatures.map(feat => (
                      <td key={feat} className="p-3 font-mono text-cyan-300">
                        {cl.centroid[feat] !== undefined ? cl.centroid[feat] : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FEATURE LOADINGS IMPORTANCE */}
      {activeTab === 'loadings' && pcaResult && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Feature Loadings (Eigenvector Weights)</span>
            </h3>
            <span className="text-xs text-slate-400">
              Measures relative contribution of each variable to principal dimensions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="p-3">Feature Name</th>
                  <th className="p-3">Overall Importance</th>
                  <th className="p-3">PC1 Loading</th>
                  <th className="p-3">PC2 Loading</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pcaResult.loadings.map(load => (
                  <tr key={load.feature} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-white">{load.feature}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                            style={{ width: `${Math.min(100, load.importance * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-cyan-300">{load.importance}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      <span className={load.pc1 >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {load.pc1 >= 0 ? `+${load.pc1}` : load.pc1}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      <span className={load.pc2 >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {load.pc2 >= 0 ? `+${load.pc2}` : load.pc2}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
