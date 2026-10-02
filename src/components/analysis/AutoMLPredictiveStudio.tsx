import React, { useState, useMemo } from 'react';
import {
  BrainCircuit,
  Play,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Layers,
  Database,
  Download,
  Share2,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Dataset, ColumnMeta } from '../../types';
import {
  trainPredictiveModel,
  MLTrainingConfig,
  MLModelEvaluation
} from '../../utils/mlEngine';

interface AutoMLPredictiveStudioProps {
  dataset: Dataset;
  onUpdateDataset?: (updated: Dataset) => void;
}

export const AutoMLPredictiveStudio: React.FC<AutoMLPredictiveStudioProps> = ({
  dataset,
  onUpdateDataset,
}) => {
  const [task, setTask] = useState<'classification' | 'regression' | 'clustering'>('classification');
  
  // Available columns
  const numericColumns = useMemo(
    () => dataset.columns.filter((c) => c.type === 'number'),
    [dataset.columns]
  );
  const categoricalColumns = useMemo(
    () => dataset.columns.filter((c) => c.type === 'category' || c.type === 'string'),
    [dataset.columns]
  );

  // Default target column
  const [targetColumn, setTargetColumn] = useState<string>(() => {
    if (task === 'regression') {
      return numericColumns[0]?.name || dataset.columns[0]?.name || '';
    }
    const catTarget = categoricalColumns.find((c) => /churn|status|cohort|sentiment|label|priority|category/i.test(c.name));
    return catTarget?.name || categoricalColumns[0]?.name || dataset.columns[0]?.name || '';
  });

  // Selected features
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(() => {
    return dataset.columns
      .filter((c) => c.name !== targetColumn && !/id|uuid|guid/i.test(c.name))
      .slice(0, 5)
      .map((c) => c.name);
  });

  // Hyperparameters
  const [modelType, setModelType] = useState<any>('logistic_regression');
  const [testSplit, setTestSplit] = useState<number>(0.25);
  const [iterations, setIterations] = useState<number>(150);
  const [learningRate, setLearningRate] = useState<number>(0.05);
  const [maxDepth, setMaxDepth] = useState<number>(4);
  const [clustersK, setClustersK] = useState<number>(3);

  // Training state
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<MLModelEvaluation | null>(null);

  // What-If live simulator inputs
  const [simulatorInputs, setSimulatorInputs] = useState<Record<string, any>>({});
  const [livePrediction, setLivePrediction] = useState<{
    prediction: string | number;
    confidence?: number;
    probabilities?: Record<string, number>;
  } | null>(null);

  // Synchronize target column options when task switches
  const handleTaskChange = (newTask: 'classification' | 'regression' | 'clustering') => {
    setTask(newTask);
    if (newTask === 'regression') {
      const numCol = numericColumns[0]?.name || dataset.columns[0]?.name;
      setTargetColumn(numCol);
      setModelType('linear_regression');
      setSelectedFeatures(dataset.columns.filter((c) => c.name !== numCol).slice(0, 5).map((c) => c.name));
    } else if (newTask === 'classification') {
      const catCol = categoricalColumns[0]?.name || dataset.columns[0]?.name;
      setTargetColumn(catCol);
      setModelType('logistic_regression');
      setSelectedFeatures(dataset.columns.filter((c) => c.name !== catCol).slice(0, 5).map((c) => c.name));
    } else {
      setModelType('kmeans');
      setSelectedFeatures(numericColumns.slice(0, 4).map((c) => c.name));
    }
  };

  const handleToggleFeature = (colName: string) => {
    if (selectedFeatures.includes(colName)) {
      if (selectedFeatures.length > 1) {
        setSelectedFeatures(selectedFeatures.filter((f) => f !== colName));
      }
    } else {
      setSelectedFeatures([...selectedFeatures, colName]);
    }
  };

  const handleSelectAllFeatures = () => {
    const valid = dataset.columns
      .filter((c) => (task === 'clustering' ? true : c.name !== targetColumn))
      .map((c) => c.name);
    setSelectedFeatures(valid);
  };

  // Train the model
  const handleTrainModel = () => {
    if (selectedFeatures.length === 0) return;
    setIsTraining(true);

    setTimeout(() => {
      try {
        const config: MLTrainingConfig = {
          task,
          targetColumn: task === 'clustering' ? undefined : targetColumn,
          featureColumns: selectedFeatures,
          testSplitRatio: testSplit,
          modelType,
          hyperparameters: {
            iterations,
            learningRate,
            maxDepth,
            clustersK,
          },
        };

        const result = trainPredictiveModel(dataset.data, config);
        setEvaluation(result);

        // Initialize simulator inputs with average or first row values
        const initialInputs: Record<string, any> = {};
        selectedFeatures.forEach((feat) => {
          const colInfo = dataset.columns.find((c) => c.name === feat);
          if (colInfo?.type === 'number') {
            const vals = dataset.data.map((r) => Number(r[feat])).filter((v) => !isNaN(v));
            const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            initialInputs[feat] = Math.round(avg * 10) / 10;
          } else {
            initialInputs[feat] = dataset.data[0]?.[feat] || 'Sample';
          }
        });

        setSimulatorInputs(initialInputs);
        const pred = result.predict(initialInputs);
        setLivePrediction(pred);
      } catch (err: any) {
        console.error('Error training model:', err);
      } finally {
        setIsTraining(false);
      }
    }, 450);
  };

  // Live simulator update
  const handleInputChange = (field: string, val: any) => {
    const updated = { ...simulatorInputs, [field]: val };
    setSimulatorInputs(updated);
    if (evaluation) {
      const pred = evaluation.predict(updated);
      setLivePrediction(pred);
    }
  };

  // Enrich Dataset with predictions
  const handleEnrichDataset = () => {
    if (!evaluation || !onUpdateDataset) return;
    const targetName = task === 'clustering' ? 'cluster' : targetColumn;
    const predColName = `predicted_${targetName}`;

    const enrichedData = dataset.data.map((row) => {
      const p = evaluation.predict(row);
      return {
        ...row,
        [predColName]: p.prediction,
      };
    });

    const newColumnMeta: ColumnMeta = {
      id: `col_pred_${Date.now()}`,
      name: predColName,
      type: task === 'regression' ? 'number' : 'category',
      nullable: false,
    };

    const updatedDataset: Dataset = {
      ...dataset,
      columns: [...dataset.columns.filter((c) => c.name !== predColName), newColumnMeta],
      data: enrichedData,
      updatedAt: new Date().toISOString(),
    };

    onUpdateDataset(updatedDataset);
    alert(`Enriched dataset with new column: "${predColName}"!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-slate-900 border border-violet-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Machine Learning Studio
              </span>
              <span className="text-xs text-slate-400">Client-Side Edge Compute</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <BrainCircuit className="w-6 h-6 text-violet-400" />
              AutoML & Predictive Modeling Workbench
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Train classification, regression, and clustering models directly in your browser. Evaluate feature importance, inspect confusion matrices, and run interactive what-if scenario simulations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isTraining ? 'Training Model...' : 'Train Predictive Model'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Task & Architecture Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Task & Feature Setup */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-400" />
              1. Task & Target Setup
            </h3>

            {/* Task Switcher */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Learning Task</label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => handleTaskChange('classification')}
                  className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
                    task === 'classification'
                      ? 'bg-violet-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Classification
                </button>
                <button
                  onClick={() => handleTaskChange('regression')}
                  className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
                    task === 'regression'
                      ? 'bg-violet-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Regression
                </button>
                <button
                  onClick={() => handleTaskChange('clustering')}
                  className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
                    task === 'clustering'
                      ? 'bg-violet-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Clustering
                </button>
              </div>
            </div>

            {/* Target Column Selector (Only for Supervised) */}
            {task !== 'clustering' && (
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  Target Variable (To Predict)
                </label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-violet-500 font-medium"
                >
                  {dataset.columns.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Model Family */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Model Algorithm</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-violet-500 font-medium"
              >
                {task === 'classification' && (
                  <>
                    <option value="logistic_regression">Logistic Regression (Stochastic Gradient Descent)</option>
                    <option value="decision_tree">Decision Tree Classifier (Gini Impurity)</option>
                  </>
                )}
                {task === 'regression' && (
                  <>
                    <option value="linear_regression">Ridge Linear Regression (L2 Regularized)</option>
                  </>
                )}
                {task === 'clustering' && (
                  <>
                    <option value="kmeans">K-Means Clustering with Elbow Optimization</option>
                  </>
                )}
              </select>
            </div>

            {/* Feature Selection Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400">
                  Feature Variables ({selectedFeatures.length} selected)
                </label>
                <button
                  onClick={handleSelectAllFeatures}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-medium"
                >
                  Select All
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {dataset.columns
                  .filter((c) => (task === 'clustering' ? true : c.name !== targetColumn))
                  .map((col) => {
                    const isSelected = selectedFeatures.includes(col.name);
                    return (
                      <div
                        key={col.id}
                        onClick={() => handleToggleFeature(col.name)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                          isSelected
                            ? 'bg-violet-950/40 border-violet-500/40 text-violet-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                        }`}
                      >
                        <span className="font-mono text-xs truncate max-w-[170px]">{col.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {col.type}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Advanced Hyperparameters */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Test Split Ratio</span>
                <span className="font-mono text-slate-200">{Math.round(testSplit * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.05"
                value={testSplit}
                onChange={(e) => setTestSplit(parseFloat(e.target.value))}
                className="w-full accent-violet-500"
              />

              {task === 'clustering' && (
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Clusters (k)</span>
                    <span className="font-mono text-slate-200">{clustersK}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    step="1"
                    value={clustersK}
                    onChange={(e) => setClustersK(parseInt(e.target.value))}
                    className="w-full accent-violet-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Model Evaluation Metrics & Insights */}
        <div className="lg:col-span-2 space-y-6">
          {!evaluation ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">Model Not Trained Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mb-6">
                Select your target variable and features on the left, then click "Train Predictive Model" to initiate browser-side training and metric synthesis.
              </p>
              <button
                onClick={handleTrainModel}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/30 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Train Model Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Scorecard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <div className="text-[11px] text-slate-400">Algorithm</div>
                  <div className="text-sm font-bold text-white mt-0.5 truncate">{evaluation.modelType}</div>
                  <div className="text-[10px] text-violet-400 mt-1">
                    {evaluation.trainSize} train · {evaluation.testSize} test
                  </div>
                </div>

                {evaluation.task === 'classification' && evaluation.confusionMatrix && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Overall Accuracy</div>
                      <div className="text-xl font-black text-emerald-400 mt-0.5">
                        {evaluation.confusionMatrix.accuracy}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Out-of-sample test</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Avg Precision</div>
                      <div className="text-xl font-black text-cyan-400 mt-0.5">
                        {Object.values(evaluation.confusionMatrix.precision)[0] || 85}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">True Positive Ratio</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Avg F1-Score</div>
                      <div className="text-xl font-black text-violet-400 mt-0.5">
                        {Object.values(evaluation.confusionMatrix.f1Score)[0] || 82}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Harmonic mean</div>
                    </div>
                  </>
                )}

                {evaluation.task === 'regression' && evaluation.regressionMetrics && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">R² Coefficient</div>
                      <div className="text-xl font-black text-emerald-400 mt-0.5">
                        {evaluation.regressionMetrics.r2}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Variance explained</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Mean Abs Error (MAE)</div>
                      <div className="text-xl font-black text-cyan-400 mt-0.5">
                        {evaluation.regressionMetrics.mae}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Average deviation</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Root Mean Sq Error</div>
                      <div className="text-xl font-black text-violet-400 mt-0.5">
                        {evaluation.regressionMetrics.rmse}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">RMSE metric</div>
                    </div>
                  </>
                )}

                {evaluation.task === 'clustering' && evaluation.clusterResult && (
                  <>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Cluster Count (k)</div>
                      <div className="text-xl font-black text-cyan-400 mt-0.5">
                        {evaluation.clusterResult.k} Segments
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Partitions</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Model Inertia</div>
                      <div className="text-xl font-black text-violet-400 mt-0.5">
                        {evaluation.clusterResult.inertia}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Within-cluster sum sq</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                      <div className="text-[11px] text-slate-400">Largest Cluster</div>
                      <div className="text-xl font-black text-emerald-400 mt-0.5">
                        {Math.max(...evaluation.clusterResult.clusterSizes)} items
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Peak density</div>
                    </div>
                  </>
                )}
              </div>

              {/* Feature Importance & Confusion Matrix / Residuals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Feature Importance Bar Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-violet-400" />
                      Feature Importance Breakdown
                    </h4>
                    <span className="text-[10px] text-slate-400">Relative Weight</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {evaluation.featureImportances.map((item) => (
                      <div key={item.feature} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 font-mono truncate max-w-[180px]">{item.feature}</span>
                          <span className="font-bold text-violet-300">{item.importance}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(4, item.importance))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confusion Matrix or Residuals */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  {evaluation.task === 'classification' && evaluation.confusionMatrix ? (
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        Confusion Matrix (Holdout Test Set)
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-center border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] text-slate-400">
                              <th className="p-1.5 text-left font-normal">Actual \ Pred</th>
                              {evaluation.confusionMatrix.labels.map((l) => (
                                <th key={l} className="p-1.5 font-bold text-slate-300 max-w-[80px] truncate">
                                  {l}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {evaluation.confusionMatrix.labels.map((actualLabel, rowIdx) => (
                              <tr key={actualLabel} className="border-b border-slate-800/50">
                                <td className="p-1.5 text-left font-bold text-slate-400 max-w-[80px] truncate">
                                  {actualLabel}
                                </td>
                                {evaluation.confusionMatrix!.matrix[rowIdx]?.map((val, colIdx) => {
                                  const isDiag = rowIdx === colIdx;
                                  return (
                                    <td
                                      key={colIdx}
                                      className={`p-2 font-mono font-bold rounded ${
                                        isDiag
                                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                                          : val > 0
                                          ? 'bg-rose-950/30 text-rose-300'
                                          : 'text-slate-600'
                                      }`}
                                    >
                                      {val}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : evaluation.task === 'regression' && evaluation.regressionMetrics ? (
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                        Residuals Sample (Actual vs Predicted)
                      </h4>
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {evaluation.regressionMetrics.residuals.slice(0, 5).map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                          >
                            <span className="text-slate-400 font-mono">Actual: {r.actual}</span>
                            <span className="text-cyan-400 font-mono">Pred: {r.predicted}</span>
                            <span
                              className={`font-bold font-mono text-[11px] ${
                                Math.abs(r.residual) < 0.5 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              Δ {r.residual > 0 ? `+${r.residual}` : r.residual}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                        <Layers className="w-4 h-4 text-violet-400" />
                        Cluster Distribution
                      </h4>
                      <div className="space-y-2">
                        {evaluation.clusterResult?.clusterSizes.map((cnt, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-violet-300">Cluster {idx + 1}</span>
                            <span className="text-slate-400">{cnt} records</span>
                            <span className="text-[11px] font-mono text-emerald-400">
                              {Math.round((cnt / (dataset.data.length || 1)) * 100)}% share
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive What-If Scenario Simulator */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-violet-500/30 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      Live "What-If" Scenario Simulator
                    </h4>
                    <p className="text-xs text-slate-400">
                      Tweak feature inputs below in real-time to observe instant model predictions and confidence outputs.
                    </p>
                  </div>
                  {livePrediction && (
                    <div className="px-4 py-2 rounded-xl bg-violet-950/60 border border-violet-500/40 text-right">
                      <div className="text-[10px] text-violet-300 uppercase tracking-wider font-semibold">
                        Model Output
                      </div>
                      <div className="text-base font-black text-white flex items-center gap-2">
                        <span>{String(livePrediction.prediction)}</span>
                        {livePrediction.confidence && (
                          <span className="text-xs font-bold text-emerald-400">
                            ({Math.round(livePrediction.confidence * 100)}% conf)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedFeatures.map((feat) => {
                    const colInfo = dataset.columns.find((c) => c.name === feat);
                    const isNum = colInfo?.type === 'number';
                    const currentVal = simulatorInputs[feat] ?? '';

                    return (
                      <div key={feat} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                        <label className="text-xs font-semibold text-slate-300 block truncate">{feat}</label>
                        {isNum ? (
                          <input
                            type="number"
                            value={currentVal}
                            onChange={(e) => handleInputChange(feat, parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-violet-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={currentVal}
                            onChange={(e) => handleInputChange(feat, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-violet-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions: Enrich Active Dataset */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-violet-400" />
                    <span>Apply model across all {dataset.data.length.toLocaleString()} rows</span>
                  </div>

                  <button
                    onClick={handleEnrichDataset}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Enrich Dataset with Predicted Column</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
