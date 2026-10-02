import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Grid, 
  FlaskConical, 
  Network, 
  Activity, 
  HelpCircle, 
  Info,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Dataset } from '../../types';
import { 
  computeLinearRegression, 
  computeCorrelationMatrix, 
  computeTTest, 
  computeANOVA, 
  computeChiSquare, 
  computeKMeans,
  round 
} from '../../utils/statistics';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Line, 
  ComposedChart,
  ZAxis
} from 'recharts';

interface StatisticalSuiteProps {
  dataset: Dataset;
}

type StatTab = 'regression' | 'correlation' | 'hypothesis' | 'clustering' | 'forecasting';

export const StatisticalSuite: React.FC<StatisticalSuiteProps> = ({ dataset }) => {
  const [activeTab, setActiveTab] = useState<StatTab>('regression');

  const numberColumns = useMemo(
    () => dataset.columns.filter(c => c.type === 'number'),
    [dataset.columns]
  );
  const categoryColumns = useMemo(
    () => dataset.columns.filter(c => c.type === 'category' || c.type === 'string'),
    [dataset.columns]
  );
  const dateColumns = useMemo(
    () => dataset.columns.filter(c => c.type === 'date' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('time') || c.name.toLowerCase().includes('day') || c.name.toLowerCase().includes('year')),
    [dataset.columns]
  );

  // 1. Regression State
  const [regXCol, setRegXCol] = useState(numberColumns[0]?.name || '');
  const [regYCol, setRegYCol] = useState(numberColumns[1]?.name || numberColumns[0]?.name || '');

  // 2. Hypothesis Testing State
  const [hypoTestType, setHypoTestType] = useState<'ttest' | 'anova' | 'chisquare'>('ttest');
  const [ttestGroupCol, setTtestGroupCol] = useState(categoryColumns[0]?.name || '');
  const [ttestValCol, setTtestValCol] = useState(numberColumns[0]?.name || '');
  const [anovaGroupCol, setAnovaGroupCol] = useState(categoryColumns[0]?.name || '');
  const [anovaValCol, setAnovaValCol] = useState(numberColumns[0]?.name || '');
  const [chiColA, setChiColA] = useState(categoryColumns[0]?.name || '');
  const [chiColB, setChiColB] = useState(categoryColumns[1]?.name || categoryColumns[0]?.name || '');

  // 3. K-Means Clustering State
  const [clusterXCol, setClusterXCol] = useState(numberColumns[0]?.name || '');
  const [clusterYCol, setClusterYCol] = useState(numberColumns[1]?.name || numberColumns[0]?.name || '');
  const [clusterK, setClusterK] = useState(3);

  // 4. Time Series Forecasting State
  const [forecastDateCol, setForecastDateCol] = useState(dateColumns[0]?.name || dataset.columns[0]?.name || '');
  const [forecastValCol, setForecastValCol] = useState(numberColumns[0]?.name || '');
  const [forecastHorizon, setForecastHorizon] = useState(5);
  const [forecastAlpha, setForecastAlpha] = useState(0.3); // Exponential smoothing factor
  const [forecastModel, setForecastModel] = useState<'linear_trend' | 'exponential_smoothing' | 'moving_average'>('exponential_smoothing');

  // Computed Regression
  const regressionResult = useMemo(() => {
    if (!regXCol || !regYCol || regXCol === regYCol) return null;
    return computeLinearRegression(dataset.data, regXCol, regYCol);
  }, [dataset.data, regXCol, regYCol]);

  // Computed Correlation
  const correlationResult = useMemo(() => {
    return computeCorrelationMatrix(dataset.data, dataset.columns);
  }, [dataset.data, dataset.columns]);

  // Computed Hypothesis Tests
  const tTestResult = useMemo(() => {
    if (hypoTestType !== 'ttest' || !ttestGroupCol || !ttestValCol) return null;
    return computeTTest(dataset.data, ttestGroupCol, ttestValCol);
  }, [hypoTestType, dataset.data, ttestGroupCol, ttestValCol]);

  const anovaResult = useMemo(() => {
    if (hypoTestType !== 'anova' || !anovaGroupCol || !anovaValCol) return null;
    return computeANOVA(dataset.data, anovaGroupCol, anovaValCol);
  }, [hypoTestType, dataset.data, anovaGroupCol, anovaValCol]);

  const chiSquareResult = useMemo(() => {
    if (hypoTestType !== 'chisquare' || !chiColA || !chiColB || chiColA === chiColB) return null;
    return computeChiSquare(dataset.data, chiColA, chiColB);
  }, [hypoTestType, dataset.data, chiColA, chiColB]);

  // Computed K-Means
  const kMeansResult = useMemo(() => {
    if (!clusterXCol || !clusterYCol || clusterXCol === clusterYCol) return null;
    return computeKMeans(dataset.data, clusterXCol, clusterYCol, clusterK);
  }, [dataset.data, clusterXCol, clusterYCol, clusterK]);

  // Computed Time Series Forecasting
  const forecastResult = useMemo(() => {
    if (!forecastValCol || !forecastDateCol) return null;

    // Filter and sort by date/index
    const validRows = dataset.data
      .filter(r => r[forecastValCol] !== null && r[forecastValCol] !== undefined && !isNaN(Number(r[forecastValCol])))
      .map((r, i) => ({
        rawDate: r[forecastDateCol] !== undefined ? String(r[forecastDateCol]) : `T+${i + 1}`,
        val: Number(r[forecastValCol]),
      }));

    if (validRows.length < 3) return null;

    const n = validRows.length;
    const historySeries: { period: string; actual: number; fitted?: number }[] = [];

    // Calculate Fitted Values
    if (forecastModel === 'linear_trend') {
      // OLS against time index t = 0..n-1
      let sumT = 0, sumY = 0, sumTY = 0, sumT2 = 0;
      for (let t = 0; t < n; t++) {
        const y = validRows[t].val;
        sumT += t;
        sumY += y;
        sumTY += t * y;
        sumT2 += t * t;
      }
      const slope = (n * sumTY - sumT * sumY) / (n * sumT2 - sumT * sumT || 1);
      const intercept = (sumY - slope * sumT) / n;

      validRows.forEach((r, t) => {
        historySeries.push({
          period: r.rawDate,
          actual: round(r.val, 2),
          fitted: round(intercept + slope * t, 2),
        });
      });

      // Future Forecast points
      const futurePoints: { period: string; forecast: number; lowerBound: number; upperBound: number }[] = [];
      const residuals = historySeries.map(h => (h.actual - (h.fitted || h.actual)));
      const stdErr = Math.sqrt(residuals.reduce((acc, v) => acc + v * v, 0) / (n - 2 || 1));

      for (let f = 1; f <= forecastHorizon; f++) {
        const tFuture = n - 1 + f;
        const pred = intercept + slope * tFuture;
        const margin = 1.96 * stdErr * Math.sqrt(1 + (1 / n) + Math.pow(tFuture - sumT / n, 2) / (sumT2 - (sumT * sumT) / n || 1));
        futurePoints.push({
          period: `Forecast +${f}`,
          forecast: round(pred, 2),
          lowerBound: round(pred - margin, 2),
          upperBound: round(pred + margin, 2),
        });
      }

      // Compute MAPE and RMSE
      const mape = round((historySeries.reduce((acc, h) => acc + (h.actual !== 0 ? Math.abs((h.actual - (h.fitted || h.actual)) / h.actual) : 0), 0) / n) * 100, 2);
      const rmse = round(stdErr, 2);

      return {
        model: 'Linear Trend OLS',
        slope: round(slope, 3),
        intercept: round(intercept, 2),
        historySeries,
        futurePoints,
        mape,
        rmse,
      };

    } else if (forecastModel === 'moving_average') {
      const windowSize = Math.min(3, Math.floor(n / 2));
      for (let t = 0; t < n; t++) {
        if (t < windowSize - 1) {
          historySeries.push({ period: validRows[t].rawDate, actual: round(validRows[t].val, 2) });
        } else {
          let sum = 0;
          for (let w = 0; w < windowSize; w++) sum += validRows[t - w].val;
          historySeries.push({
            period: validRows[t].rawDate,
            actual: round(validRows[t].val, 2),
            fitted: round(sum / windowSize, 2),
          });
        }
      }

      // Average of last window
      let lastWindowSum = 0;
      for (let w = 0; w < windowSize; w++) lastWindowSum += validRows[n - 1 - w].val;
      const lastAvg = lastWindowSum / windowSize;

      const futurePoints: { period: string; forecast: number; lowerBound: number; upperBound: number }[] = [];
      const diffs = historySeries.filter(h => h.fitted !== undefined).map(h => h.actual - (h.fitted || 0));
      const stdErr = diffs.length > 0 ? Math.sqrt(diffs.reduce((acc, v) => acc + v * v, 0) / diffs.length) : 0;

      for (let f = 1; f <= forecastHorizon; f++) {
        futurePoints.push({
          period: `Forecast +${f}`,
          forecast: round(lastAvg, 2),
          lowerBound: round(lastAvg - 1.96 * stdErr, 2),
          upperBound: round(lastAvg + 1.96 * stdErr, 2),
        });
      }

      return {
        model: `Moving Average (Window ${windowSize})`,
        historySeries,
        futurePoints,
        mape: 0,
        rmse: round(stdErr, 2),
      };

    } else {
      // Single Exponential Smoothing: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
      let smoothed = validRows[0].val;
      historySeries.push({
        period: validRows[0].rawDate,
        actual: round(validRows[0].val, 2),
        fitted: round(smoothed, 2),
      });

      for (let t = 1; t < n; t++) {
        smoothed = forecastAlpha * validRows[t - 1].val + (1 - forecastAlpha) * smoothed;
        historySeries.push({
          period: validRows[t].rawDate,
          actual: round(validRows[t].val, 2),
          fitted: round(smoothed, 2),
        });
      }

      // Final smoothed value for forward projection
      const finalSmoothed = forecastAlpha * validRows[n - 1].val + (1 - forecastAlpha) * smoothed;
      const residuals = historySeries.map(h => (h.actual - (h.fitted || h.actual)));
      const stdErr = Math.sqrt(residuals.reduce((acc, v) => acc + v * v, 0) / (n || 1));

      const futurePoints: { period: string; forecast: number; lowerBound: number; upperBound: number }[] = [];
      for (let f = 1; f <= forecastHorizon; f++) {
        const margin = 1.96 * stdErr * Math.sqrt(f);
        futurePoints.push({
          period: `Forecast +${f}`,
          forecast: round(finalSmoothed, 2),
          lowerBound: round(finalSmoothed - margin, 2),
          upperBound: round(finalSmoothed + margin, 2),
        });
      }

      const mape = round((historySeries.reduce((acc, h) => acc + (h.actual !== 0 ? Math.abs((h.actual - (h.fitted || h.actual)) / h.actual) : 0), 0) / n) * 100, 2);

      return {
        model: `Simple Exponential Smoothing (α = ${forecastAlpha})`,
        historySeries,
        futurePoints,
        mape,
        rmse: round(stdErr, 2),
      };
    }
  }, [dataset.data, forecastValCol, forecastDateCol, forecastHorizon, forecastAlpha, forecastModel]);

  // Scatter chart data for regression
  const regressionChartData = useMemo(() => {
    if (!regressionResult) return [];
    return dataset.data
      .filter(r => r[regXCol] !== null && r[regYCol] !== null)
      .map(r => {
        const x = Number(r[regXCol]);
        const y = Number(r[regYCol]);
        const predY = regressionResult.slope * x + regressionResult.intercept;
        return {
          x,
          y,
          trendY: round(predY, 2),
        };
      })
      .sort((a, b) => a.x - b.x);
  }, [dataset.data, regXCol, regYCol, regressionResult]);

  const CLUSTER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#14b8a6', '#f43f5e'];

  return (
    <div className="space-y-6">
      
      {/* Header & Mode Switcher */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Statistical Inference & Machine Learning Suite
          </h2>
          <p className="text-xs text-slate-400">Perform statistical hypothesis testing, bivariate linear regressions, covariance matrices, and unsupervised clustering.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('regression')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'regression'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Regression (OLS)</span>
          </button>

          <button
            onClick={() => setActiveTab('correlation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'correlation'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Correlation Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('hypothesis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'hypothesis'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Hypothesis Tests</span>
          </button>

          <button
            onClick={() => setActiveTab('clustering')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'clustering'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>K-Means ML</span>
          </button>

          <button
            onClick={() => setActiveTab('forecasting')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'forecasting'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Forecasting & Projections</span>
          </button>
        </div>
      </div>

      {/* 1. LINEAR REGRESSION */}
      {activeTab === 'regression' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Independent Variable (X)</label>
              <select
                value={regXCol}
                onChange={e => setRegXCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {numberColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Dependent Variable (Y)</label>
              <select
                value={regYCol}
                onChange={e => setRegYCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {numberColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {regressionResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left: Regression Summary Metrics */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  OLS Model Estimation
                </h3>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Fitted Linear Model</span>
                  <p className="text-sm font-bold font-mono text-cyan-400">
                    {regressionResult.equation}
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">R-Squared ($R^2$ Goodness of Fit)</span>
                    <span className="font-bold text-white font-mono">{round(regressionResult.rSquared, 4)}</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Pearson Correlation ($r$)</span>
                    <span className="font-bold text-indigo-400 font-mono">{round(regressionResult.r, 4)}</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Slope Coefficient ($m$)</span>
                    <span className="font-bold text-white font-mono">{round(regressionResult.slope, 4)}</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Intercept ($b$)</span>
                    <span className="font-bold text-white font-mono">{round(regressionResult.intercept, 4)}</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Residual Std Error ($S_e$)</span>
                    <span className="font-bold text-slate-300 font-mono">{round(regressionResult.stdError, 4)}</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Statistical Significance (p-value)</span>
                    <span className={`font-bold font-mono ${regressionResult.pValue < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {regressionResult.pValue < 0.0001 ? '< 0.0001' : round(regressionResult.pValue, 4)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-white">Statistical Interpretation:</p>
                  <p>
                    {regressionResult.rSquared > 0.6
                      ? `Strong predictive relationship. ${round(regressionResult.rSquared * 100, 1)}% of variation in ${regYCol} is explained by ${regXCol}.`
                      : regressionResult.rSquared > 0.3
                      ? `Moderate relationship. ${round(regressionResult.rSquared * 100, 1)}% of variance explained.`
                      : `Weak linear dependency. Consider nonlinear features or additional confounding covariates.`}
                  </p>
                </div>
              </div>

              {/* Right 2 Cols: Scatter + Fitted Trendline Chart */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Scatter Observations with Fitted OLS Trendline
                  </span>
                  <span className="text-xs font-mono text-cyan-400">
                    N = {regressionChartData.length} observations
                  </span>
                </div>

                <div className="h-80 w-full bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={regressionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="x" name={regXCol} stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <YAxis dataKey="y" name={regYCol} stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Scatter name="Observation" dataKey="y" fill="#06b6d4" />
                      <Line type="monotone" dataKey="trendY" name="Trendline" stroke="#f43f5e" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
              Please select two distinct numerical columns to compute linear regression.
            </div>
          )}
        </div>
      )}

      {/* 2. CORRELATION MATRIX */}
      {activeTab === 'correlation' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Pearson Bivariate Correlation Matrix (r)</h3>
              <p className="text-xs text-slate-400">Range: -1.0 (perfect negative) to +1.0 (perfect positive linear association).</p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="px-2 py-1 rounded bg-rose-950/80 text-rose-300">-1.0 Negative</span>
              <span className="px-2 py-1 rounded bg-slate-950 text-slate-400">0.0 None</span>
              <span className="px-2 py-1 rounded bg-indigo-950/80 text-indigo-300">+1.0 Positive</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-center text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-left font-mono text-xs">Features</th>
                  {correlationResult.columns.map(col => (
                    <th key={col} className="p-3 font-mono text-[11px] max-w-[120px] truncate">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {correlationResult.columns.map((rowCol, rIdx) => (
                  <tr key={rowCol}>
                    <td className="p-3 text-left font-semibold text-white bg-slate-950/60 border-r border-slate-800 font-mono text-[11px]">
                      {rowCol}
                    </td>
                    {correlationResult.columns.map((_, cIdx) => {
                      const val = correlationResult.matrix[rIdx]?.[cIdx] ?? 0;
                      const isSelf = rIdx === cIdx;
                      
                      let bg = 'bg-slate-950/20 text-slate-400';
                      if (!isSelf) {
                        if (val > 0.6) bg = 'bg-indigo-600/40 text-indigo-200 font-bold';
                        else if (val > 0.3) bg = 'bg-indigo-600/20 text-indigo-300';
                        else if (val < -0.6) bg = 'bg-rose-600/40 text-rose-200 font-bold';
                        else if (val < -0.3) bg = 'bg-rose-600/20 text-rose-300';
                      } else {
                        bg = 'bg-slate-900 text-slate-500';
                      }

                      return (
                        <td key={cIdx} className={`p-3 border-r border-slate-800/40 ${bg}`}>
                          {isSelf ? '1.00' : round(val, 2).toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. HYPOTHESIS TESTING */}
      {activeTab === 'hypothesis' && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setHypoTestType('ttest')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                hypoTestType === 'ttest' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Independent Two-Sample T-Test
            </button>
            <button
              onClick={() => setHypoTestType('anova')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                hypoTestType === 'anova' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              One-Way ANOVA (F-Test)
            </button>
            <button
              onClick={() => setHypoTestType('chisquare')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                hypoTestType === 'chisquare' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Chi-Square (χ²) Test of Independence
            </button>
          </div>

          {/* T-Test Config & Results */}
          {hypoTestType === 'ttest' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Categorical Group Column (2 Levels)</label>
                  <select
                    value={ttestGroupCol}
                    onChange={e => setTtestGroupCol(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  >
                    {categoryColumns.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Numerical Metric Column</label>
                  <select
                    value={ttestValCol}
                    onChange={e => setTtestValCol(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  >
                    {numberColumns.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {tTestResult ? (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-white">Two-Sample T-Test Output</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      tTestResult.isSignificant ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-950 text-slate-400'
                    }`}>
                      {tTestResult.isSignificant ? 'Statistically Significant (p < 0.05)' : 'Fail to Reject Null (p ≥ 0.05)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">t-statistic</span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">{round(tTestResult.tStatistic, 4)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Degrees of Freedom</span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">{tTestResult.df}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">p-value</span>
                      <p className="text-base font-bold text-purple-400 font-mono mt-0.5">{round(tTestResult.pValue, 4)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Group 1 vs Group 2 Mean</span>
                      <p className="text-xs font-bold text-cyan-300 font-mono mt-1">
                        {round(tTestResult.mean1, 2)} vs {round(tTestResult.mean2, 2)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  Selected categorical feature must contain at least 2 distinct factor levels.
                </div>
              )}
            </div>
          )}

          {/* ANOVA Output */}
          {hypoTestType === 'anova' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Group Factor Column</label>
                  <select
                    value={anovaGroupCol}
                    onChange={e => setAnovaGroupCol(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  >
                    {categoryColumns.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Numerical Target Metric</label>
                  <select
                    value={anovaValCol}
                    onChange={e => setAnovaValCol(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  >
                    {numberColumns.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {anovaResult && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-white">One-Way ANOVA Table</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      anovaResult.isSignificant ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-950 text-slate-400'
                    }`}>
                      {anovaResult.isSignificant ? 'Statistically Significant Difference (p < 0.05)' : 'No Significant Difference (p ≥ 0.05)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">F-Statistic</span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">{round(anovaResult.fStatistic, 4)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">p-value</span>
                      <p className="text-base font-bold text-purple-400 font-mono mt-0.5">{round(anovaResult.pValue, 4)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">DF Between / Within</span>
                      <p className="text-xs font-bold text-white font-mono mt-1">{anovaResult.dfBetween} / {anovaResult.dfWithin}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Sum of Squares (Between)</span>
                      <p className="text-xs font-bold text-cyan-300 font-mono mt-1">{round(anovaResult.ssBetween, 2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chi-Square Output */}
          {hypoTestType === 'chisquare' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Categorical Variable A</label>
                  <select
                    value={chiColA}
                    onChange={e => setChiColA(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  >
                    {categoryColumns.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Categorical Variable B</label>
                  <select
                    value={chiColB}
                    onChange={e => setChiColB(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                  >
                    {categoryColumns.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {chiSquareResult && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-white">Chi-Square Independence Test</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      chiSquareResult.isSignificant ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-slate-950 text-slate-400'
                    }`}>
                      {chiSquareResult.isSignificant ? 'Features are Dependent (p < 0.05)' : 'Features are Independent (p ≥ 0.05)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Chi-Square Statistic (χ²)</span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">{round(chiSquareResult.chiSquare, 4)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">Degrees of Freedom</span>
                      <p className="text-base font-bold text-white font-mono mt-0.5">{chiSquareResult.df}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase">p-value</span>
                      <p className="text-base font-bold text-purple-400 font-mono mt-0.5">{round(chiSquareResult.pValue, 4)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. K-MEANS CLUSTERING */}
      {activeTab === 'clustering' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Feature X (Axis)</label>
              <select
                value={clusterXCol}
                onChange={e => setClusterXCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {numberColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Feature Y (Axis)</label>
              <select
                value={clusterYCol}
                onChange={e => setClusterYCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {numberColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Cluster Count (k)</label>
              <select
                value={clusterK}
                onChange={e => setClusterK(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono font-bold"
              >
                {[2, 3, 4, 5, 6].map(k => (
                  <option key={k} value={k}>k = {k} Clusters</option>
                ))}
              </select>
            </div>
          </div>

          {kMeansResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Centroids Table */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Cluster Centroids & Sizes
                </h3>

                <div className="space-y-2">
                  {kMeansResult.centroids.map((c, i) => {
                    const count = kMeansResult.points.filter(p => p.cluster === i).length;
                    const pct = dataset.data.length > 0 ? (count / dataset.data.length) * 100 : 0;
                    return (
                      <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}
                            />
                            <span className="font-bold text-white">Cluster #{i + 1}</span>
                          </div>
                          <span className="text-slate-400 font-mono">{count} pts ({round(pct, 1)}%)</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono pt-1">
                          Centroid: ({round(c.x, 2)}, {round(c.y, 2)})
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cluster Scatter Visualization */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  2D Unsupervised Clustering Scatter Plane
                </span>

                <div className="h-80 w-full bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="x" name={clusterXCol} stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <YAxis dataKey="y" name={clusterYCol} stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      
                      {kMeansResult.centroids.map((_, clusterIdx) => (
                        <Scatter
                          key={clusterIdx}
                          name={`Cluster ${clusterIdx + 1}`}
                          data={kMeansResult.points.filter(p => p.cluster === clusterIdx)}
                          fill={CLUSTER_COLORS[clusterIdx % CLUSTER_COLORS.length]}
                        />
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 5. TIME SERIES FORECASTING & PROJECTIONS */}
      {activeTab === 'forecasting' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Time / Sequence Dimension</label>
              <select
                value={forecastDateCol}
                onChange={e => setForecastDateCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {dataset.columns.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Metric to Forecast (Y)</label>
              <select
                value={forecastValCol}
                onChange={e => setForecastValCol(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                {numberColumns.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Algorithm</label>
              <select
                value={forecastModel}
                onChange={e => setForecastModel(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                <option value="exponential_smoothing">Single Exponential Smoothing</option>
                <option value="linear_trend">Linear Trend Extrapolation (OLS)</option>
                <option value="moving_average">Trailing Moving Average</option>
              </select>
            </div>

            {forecastModel === 'exponential_smoothing' && (
              <div>
                <label className="text-slate-400 block mb-1">Smoothing Factor (α: {forecastAlpha})</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={forecastAlpha}
                  onChange={e => setForecastAlpha(Number(e.target.value))}
                  className="accent-amber-500 w-28 cursor-pointer"
                />
              </div>
            )}

            <div>
              <label className="text-slate-400 block mb-1">Horizon (Future Steps)</label>
              <select
                value={forecastHorizon}
                onChange={e => setForecastHorizon(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              >
                <option value={3}>+3 Periods</option>
                <option value={5}>+5 Periods</option>
                <option value={10}>+10 Periods</option>
                <option value={15}>+15 Periods</option>
              </select>
            </div>
          </div>

          {forecastResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left: Summary Metrics */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Model Diagnostic
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 text-[10px] font-mono">
                    95% Confidence Band
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Model</span>
                  <p className="text-xs font-bold text-amber-400 font-mono">
                    {forecastResult.model}
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Root Mean Square Error (RMSE)</span>
                    <span className="font-bold text-white font-mono">±{forecastResult.rmse}</span>
                  </div>

                  {forecastResult.mape > 0 && (
                    <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400">Mean Abs % Error (MAPE)</span>
                      <span className="font-bold text-amber-400 font-mono">{forecastResult.mape}%</span>
                    </div>
                  )}

                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Historical Observations</span>
                    <span className="font-bold text-cyan-400 font-mono">{forecastResult.historySeries.length} points</span>
                  </div>

                  <div className="flex justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400">Projected Steps</span>
                    <span className="font-bold text-emerald-400 font-mono">+{forecastHorizon} steps</span>
                  </div>
                </div>

                {/* Future Projections Table */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Predicted Future Intervals</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                    {forecastResult.futurePoints.map((pt, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800/60 flex items-center justify-between">
                        <span className="text-slate-400">{pt.period}</span>
                        <div className="text-right">
                          <span className="font-bold text-amber-400">{pt.forecast}</span>
                          <span className="block text-[9px] text-slate-500">[{pt.lowerBound} to {pt.upperBound}]</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Projected Time Series Visualizer */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-amber-400" />
                      Historical Trend & Forward Projections
                    </h3>
                    <p className="text-xs text-slate-400">Actual measurements plotted with projected horizon</p>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Actual
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Forecast
                    </span>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={[
                        ...forecastResult.historySeries.map(h => ({
                          period: h.period,
                          actual: h.actual,
                          fitted: h.fitted,
                        })),
                        ...forecastResult.futurePoints.map(f => ({
                          period: f.period,
                          forecast: f.forecast,
                          upperBound: f.upperBound,
                          lowerBound: f.lowerBound,
                        })),
                      ]}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis 
                        dataKey="period" 
                        stroke="#64748b" 
                        fontSize={10} 
                        angle={-25} 
                        textAnchor="end" 
                        interval="preserveStartEnd"
                      />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#38bdf8" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#38bdf8' }} 
                        name="Actual Value" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="forecast" 
                        stroke="#f59e0b" 
                        strokeWidth={2.5} 
                        strokeDasharray="4 4" 
                        dot={{ r: 4, fill: '#f59e0b' }} 
                        name="Projected Forecast" 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
              Select a valid date/sequence dimension and numerical metric to compute time series forecasting.
            </div>
          )}
        </div>
      )}

    </div>
  );
};
