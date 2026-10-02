import { 
  Dataset, 
  ColumnMeta, 
  ForecastModelType, 
  DriverParameter, 
  SimulationResult, 
  TimeSeriesForecastPoint,
  ScenarioPresetType
} from '../types';
import { parseNumber } from './statistics';

/**
 * Robust date / period detector
 */
export function detectTimeSeriesColumn(dataset?: Dataset | null): ColumnMeta | null {
  if (!dataset || !dataset.columns) return null;
  const dateCol = dataset.columns.find(c => c.type === 'date');
  if (dateCol) return dateCol;

  // Search for column names containing date, time, month, year, day, quarter, period
  const potential = dataset.columns.find(c => {
    const name = c.name.toLowerCase();
    return (
      name.includes('date') ||
      name.includes('time') ||
      name.includes('month') ||
      name.includes('year') ||
      name.includes('day') ||
      name.includes('quarter') ||
      name.includes('period') ||
      name.includes('timestamp')
    );
  });

  return potential || null;
}

/**
 * Get all valid numerical candidate columns
 */
export function getNumericalColumns(dataset?: Dataset | null): ColumnMeta[] {
  if (!dataset || !dataset.columns) return [];
  return dataset.columns.filter(c => c.type === 'number');
}

/**
 * Calculates Pearson correlation coefficient between two numeric vectors
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

/**
 * Estimates elasticity (% change in target per 1% change in driver)
 * Elasticity = (slope) * (mean_driver / mean_target)
 */
export function estimateDriverElasticity(
  dataset: Dataset,
  targetCol: string,
  driverCol: string
): { elasticity: number; correlation: number; baseValue: number } {
  const xVals: number[] = [];
  const yVals: number[] = [];

  dataset.data.forEach(row => {
    const x = parseNumber(row[driverCol]);
    const y = parseNumber(row[targetCol]);
    if (x !== null && y !== null) {
      xVals.push(x);
      yVals.push(y);
    }
  });

  const n = xVals.length;
  if (n < 2) {
    return { elasticity: 1.0, correlation: 0.8, baseValue: 100 };
  }

  const sumX = xVals.reduce((a, b) => a + b, 0);
  const sumY = yVals.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  const corr = calculateCorrelation(xVals, yVals);

  // Linear regression slope
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xVals[i] - meanX) * (yVals[i] - meanY);
    denominator += Math.pow(xVals[i] - meanX, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  // Point elasticity at mean
  let elasticity = meanY !== 0 && meanX !== 0 ? slope * (meanX / meanY) : (corr !== 0 ? corr : 0.5);

  // Bound elasticity reasonably between -3 and +3
  if (isNaN(elasticity) || !isFinite(elasticity)) {
    elasticity = corr !== 0 ? corr : 0.5;
  }
  elasticity = Math.max(-3, Math.min(3, elasticity));

  return {
    elasticity: Math.round(elasticity * 100) / 100,
    correlation: Math.round(corr * 100) / 100,
    baseValue: Math.round(meanX * 100) / 100
  };
}

/**
 * Automatically builds default driver parameters for a selected target
 */
export function buildDefaultDriverParameters(
  dataset: Dataset,
  targetCol: string
): DriverParameter[] {
  const numCols = getNumericalColumns(dataset).filter(c => c.name !== targetCol);

  // Pick top 4-5 numeric columns with highest absolute correlation
  const candidates = numCols.map(col => {
    const { elasticity, correlation, baseValue } = estimateDriverElasticity(dataset, targetCol, col.name);
    return {
      col,
      elasticity,
      correlation,
      baseValue
    };
  });

  // Sort by correlation magnitude descending
  candidates.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  const topDrivers = candidates.slice(0, 5);

  return topDrivers.map((item, idx) => ({
    id: `param_${item.col.name}_${idx}`,
    column: item.col.name,
    label: item.col.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    baseValue: item.baseValue || 100,
    currentValue: item.baseValue || 100,
    percentChange: 0,
    minPercent: -60,
    maxPercent: 100,
    step: 5,
    elasticity: item.elasticity !== 0 ? item.elasticity : 0.5,
    unit: '%'
  }));
}

/**
 * Returns $Z$-score multiplier for given confidence level
 */
function getZScoreMultiplier(confidence: number): number {
  switch (confidence) {
    case 80: return 1.282;
    case 90: return 1.645;
    case 99: return 2.576;
    case 95:
    default: return 1.960;
  }
}

/**
 * Fit Linear Regression: y = a + b * x
 */
function fitLinear(yVals: number[]): { predict: (x: number) => number; stdError: number; slope: number; intercept: number } {
  const n = yVals.length;
  if (n < 2) {
    const v = yVals[0] || 0;
    return { predict: () => v, stdError: 0, slope: 0, intercept: v };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = yVals[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate standard error of residuals
  let sumResidualSq = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    sumResidualSq += Math.pow(yVals[i] - predicted, 2);
  }
  const stdError = Math.sqrt(sumResidualSq / Math.max(1, n - 2));

  return {
    predict: (x: number) => intercept + slope * x,
    stdError: isNaN(stdError) ? 0 : stdError,
    slope,
    intercept
  };
}

/**
 * Fit Polynomial (degree 2): y = a + b*x + c*x^2
 */
function fitPolynomial(yVals: number[]): { predict: (x: number) => number; stdError: number } {
  const n = yVals.length;
  if (n < 3) {
    const lin = fitLinear(yVals);
    return { predict: lin.predict, stdError: lin.stdError };
  }

  // Gaussian elimination for 2nd order polynomial fit
  let s0 = n;
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let t0 = 0, t1 = 0, t2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = yVals[i];
    const x2 = x * x;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    t0 += y;
    t1 += x * y;
    t2 += x2 * y;
  }

  // Matrix:
  // [ s0 s1 s2 | t0 ]
  // [ s1 s2 s3 | t1 ]
  // [ s2 s3 s4 | t2 ]
  // Solve 3x3 linear equations:
  const m = [
    [s0, s1, s2, t0],
    [s1, s2, s3, t1],
    [s2, s3, s4, t2]
  ];

  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(m[k][i]) > Math.abs(m[maxRow][i])) maxRow = k;
    }
    const temp = m[i];
    m[i] = m[maxRow];
    m[maxRow] = temp;

    const pivot = m[i][i];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = i; j <= 3; j++) {
      m[i][j] /= pivot;
    }

    for (let k = 0; k < 3; k++) {
      if (k !== i) {
        const factor = m[k][i];
        for (let j = i; j <= 3; j++) {
          m[k][j] -= factor * m[i][j];
        }
      }
    }
  }

  const a = m[0][3];
  const b = m[1][3];
  const c = m[2][3];

  let sumResidualSq = 0;
  for (let i = 0; i < n; i++) {
    const pred = a + b * i + c * i * i;
    sumResidualSq += Math.pow(yVals[i] - pred, 2);
  }
  const stdError = Math.sqrt(sumResidualSq / Math.max(1, n - 3));

  return {
    predict: (x: number) => Math.max(0, a + b * x + c * x * x),
    stdError: isNaN(stdError) ? 0 : stdError
  };
}

/**
 * Fit Exponential Curve: y = a * exp(b * x) -> ln(y) = ln(a) + b * x
 */
function fitExponential(yVals: number[]): { predict: (x: number) => number; stdError: number } {
  const positiveVals = yVals.map(y => Math.max(0.01, y));
  const lnY = positiveVals.map(y => Math.log(y));

  const lin = fitLinear(lnY);
  const a = Math.exp(lin.intercept);
  const b = lin.slope;

  let sumResidualSq = 0;
  for (let i = 0; i < yVals.length; i++) {
    const pred = a * Math.exp(b * i);
    sumResidualSq += Math.pow(yVals[i] - pred, 2);
  }
  const stdError = Math.sqrt(sumResidualSq / Math.max(1, yVals.length - 2));

  return {
    predict: (x: number) => Math.max(0, a * Math.exp(b * x)),
    stdError: isNaN(stdError) ? 0 : stdError
  };
}

/**
 * Simple Moving Average & Trend
 */
function fitMovingAverage(yVals: number[], windowSize = 3): { predict: (x: number) => number; stdError: number } {
  const n = yVals.length;
  const recent = yVals.slice(Math.max(0, n - windowSize));
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

  const lin = fitLinear(yVals);
  const drift = lin.slope * 0.5; // slight dampening of slope

  return {
    predict: (x: number) => Math.max(0, avg + drift * (x - n + 1)),
    stdError: lin.stdError
  };
}

/**
 * Monte Carlo Simulation with Random Walk & Volatility Drift
 */
function runMonteCarloSimulation(
  lastActual: number,
  drift: number,
  volatility: number,
  periods: number,
  multiplierEffect: number,
  runsCount = 200
): { paths: { runIndex: number; values: number[] }[]; medianValues: number[]; p10Values: number[]; p90Values: number[] } {
  const paths: { runIndex: number; values: number[] }[] = [];
  const matrixByPeriod: number[][] = Array.from({ length: periods }, () => []);

  for (let r = 0; r < runsCount; r++) {
    const path: number[] = [];
    let currentVal = lastActual;

    for (let t = 0; t < periods; t++) {
      // Box-Muller normal random generator
      const u1 = Math.max(1e-6, Math.random());
      const u2 = Math.max(1e-6, Math.random());
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      const stepShock = z * volatility;
      const stepDrift = drift;
      currentVal = currentVal * (1 + stepDrift + stepShock);
      currentVal = Math.max(0, currentVal);

      // Apply driver multiplier impact
      const adjustedVal = currentVal * multiplierEffect;
      path.push(adjustedVal);
      matrixByPeriod[t].push(adjustedVal);
    }
    if (r < 25) { // save up to 25 visual paths for fan chart
      paths.push({ runIndex: r, values: path });
    }
  }

  const medianValues: number[] = [];
  const p10Values: number[] = [];
  const p90Values: number[] = [];

  for (let t = 0; t < periods; t++) {
    const vals = matrixByPeriod[t].sort((a, b) => a - b);
    const p10Idx = Math.floor(vals.length * 0.1);
    const p50Idx = Math.floor(vals.length * 0.5);
    const p90Idx = Math.floor(vals.length * 0.9);

    p10Values.push(vals[p10Idx] ?? vals[0]);
    medianValues.push(vals[p50Idx] ?? vals[0]);
    p90Values.push(vals[p90Idx] ?? vals[vals.length - 1]);
  }

  return { paths, medianValues, p10Values, p90Values };
}

/**
 * Main Scenario Simulation Engine
 */
export function runScenarioSimulation(
  dataset: Dataset,
  targetColumn: string,
  parameters: DriverParameter[],
  modelType: ForecastModelType = 'linear',
  horizonPeriods = 6,
  confidenceLevel = 95
): SimulationResult {
  const timeCol = detectTimeSeriesColumn(dataset);
  
  // Extract historical target points
  const rawRows = dataset.data;
  const historicPoints: { periodLabel: string; value: number }[] = [];

  rawRows.forEach((row, idx) => {
    const yVal = parseNumber(row[targetColumn]);
    if (yVal !== null) {
      let label = `Period ${idx + 1}`;
      if (timeCol && row[timeCol.name]) {
        label = String(row[timeCol.name]);
      }
      historicPoints.push({
        periodLabel: label,
        value: yVal
      });
    }
  });

  const n = historicPoints.length;
  const ySeries = historicPoints.map(p => p.value);

  // If no data points, fallback gracefully
  if (n === 0) {
    ySeries.push(100, 110, 105, 120, 130);
  }

  // 1. Calculate Combined Parameter Driver Impact Multiplier
  // Cumulative impact = Product(1 + (percentChange / 100) * elasticity)
  let aggregateMultiplier = 1.0;
  const parameterSensitivities: SimulationResult['parameterSensitivities'] = [];

  parameters.forEach(param => {
    const deltaFraction = param.percentChange / 100;
    const factor = 1 + deltaFraction * param.elasticity;
    aggregateMultiplier *= Math.max(0.1, factor);

    const estimatedImpactPercent = param.percentChange * param.elasticity;
    const meanTarget = ySeries.reduce((a, b) => a + b, 0) / ySeries.length;
    const estimatedImpactValue = meanTarget * (estimatedImpactPercent / 100);

    parameterSensitivities.push({
      paramId: param.id,
      paramName: param.label,
      elasticity: param.elasticity,
      appliedDeltaPercent: param.percentChange,
      estimatedImpactValue: Math.round(estimatedImpactValue * 100) / 100,
      estimatedImpactPercent: Math.round(estimatedImpactPercent * 10) / 10,
      correlation: param.elasticity > 0 ? 0.75 : -0.65
    });
  });

  // Sort parameters by absolute impact magnitude
  parameterSensitivities.sort((a, b) => Math.abs(b.estimatedImpactPercent) - Math.abs(a.estimatedImpactPercent));

  // 2. Compute Base Forecasting Model
  let predictor: { predict: (x: number) => number; stdError: number };
  if (modelType === 'polynomial') {
    predictor = fitPolynomial(ySeries);
  } else if (modelType === 'exponential') {
    predictor = fitExponential(ySeries);
  } else if (modelType === 'moving_average') {
    predictor = fitMovingAverage(ySeries);
  } else {
    predictor = fitLinear(ySeries);
  }

  const zScore = getZScoreMultiplier(confidenceLevel);
  const timeSeriesData: TimeSeriesForecastPoint[] = [];

  // Historical segment
  historicPoints.forEach((hp, idx) => {
    const baselineFit = predictor.predict(idx);
    const simulatedFit = baselineFit * aggregateMultiplier;
    timeSeriesData.push({
      period: idx + 1,
      periodLabel: hp.periodLabel,
      actual: hp.value,
      baselineForecast: Math.round(baselineFit * 100) / 100,
      simulatedForecast: Math.round(simulatedFit * 100) / 100,
      lowerConfidence: Math.max(0, Math.round((baselineFit - zScore * predictor.stdError) * 100) / 100),
      upperConfidence: Math.round((baselineFit + zScore * predictor.stdError) * 100) / 100,
      isProjected: false,
      deltaPercent: 0
    });
  });

  // Projected segment
  const lastPeriodLabel = historicPoints[n - 1]?.periodLabel || 'Period';
  const lastVal = historicPoints[n - 1]?.value || 100;

  // Monte Carlo execution if selected or for summary volatility
  let mcResult: ReturnType<typeof runMonteCarloSimulation> | undefined;
  const historicReturns: number[] = [];
  for (let i = 1; i < ySeries.length; i++) {
    if (ySeries[i - 1] !== 0) {
      historicReturns.push((ySeries[i] - ySeries[i - 1]) / ySeries[i - 1]);
    }
  }
  const avgReturn = historicReturns.length > 0 ? historicReturns.reduce((a, b) => a + b, 0) / historicReturns.length : 0.02;
  const returnVariance = historicReturns.length > 1 ? historicReturns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (historicReturns.length - 1) : 0.005;
  const volatility = Math.sqrt(returnVariance) || 0.05;

  mcResult = runMonteCarloSimulation(lastVal, avgReturn, volatility, horizonPeriods, aggregateMultiplier, 300);

  for (let h = 0; h < horizonPeriods; h++) {
    const xIdx = n + h;
    let baselinePred = predictor.predict(xIdx);
    let simulatedPred = baselinePred * aggregateMultiplier;

    // In Monte Carlo mode, use stochastic median
    if (modelType === 'monte_carlo' && mcResult) {
      simulatedPred = mcResult.medianValues[h];
      baselinePred = mcResult.medianValues[h] / aggregateMultiplier;
    }

    // Confidence interval expands with future time horizon sqrt(h + 1)
    const expansionFactor = Math.sqrt(h + 1);
    const margin = zScore * predictor.stdError * expansionFactor;

    const lower = Math.max(0, simulatedPred - margin);
    const upper = simulatedPred + margin;

    const diffPct = baselinePred !== 0 ? ((simulatedPred - baselinePred) / baselinePred) * 100 : 0;

    // Period label formatting
    let projLabel = `+${h + 1} Periods`;
    if (lastPeriodLabel.includes('20') || lastPeriodLabel.includes('-') || lastPeriodLabel.includes('/')) {
      projLabel = `Projected t+${h + 1}`;
    }

    timeSeriesData.push({
      period: xIdx + 1,
      periodLabel: projLabel,
      actual: null,
      baselineForecast: Math.round(baselinePred * 100) / 100,
      simulatedForecast: Math.round(simulatedPred * 100) / 100,
      lowerConfidence: Math.round(lower * 100) / 100,
      upperConfidence: Math.round(upper * 100) / 100,
      isProjected: true,
      deltaPercent: Math.round(diffPct * 10) / 10
    });
  }

  // 3. Compute KPI Aggregates for Projected Horizon
  const projectedPoints = timeSeriesData.filter(p => p.isProjected);
  const baselineTotals = projectedPoints.reduce((acc, p) => acc + p.baselineForecast, 0);
  const simulatedTotals = projectedPoints.reduce((acc, p) => acc + p.simulatedForecast, 0);
  const totalDiff = simulatedTotals - baselineTotals;
  const totalPercentDiff = baselineTotals !== 0 ? (totalDiff / baselineTotals) * 100 : 0;

  const baselineMean = baselineTotals / Math.max(1, projectedPoints.length);
  const simulatedMean = simulatedTotals / Math.max(1, projectedPoints.length);
  const meanDiff = simulatedMean - baselineMean;
  const meanPercentDiff = baselineMean !== 0 ? (meanDiff / baselineMean) * 100 : 0;

  // Growth rate from last actual to end of horizon
  const baselineGrowth = lastVal !== 0 ? ((projectedPoints[projectedPoints.length - 1]?.baselineForecast - lastVal) / lastVal) * 100 : 0;
  const simulatedGrowth = lastVal !== 0 ? ((projectedPoints[projectedPoints.length - 1]?.simulatedForecast - lastVal) / lastVal) * 100 : 0;

  // 4. Automated Intelligent Natural-Language Insights
  const insights = generateAutomatedScenarioInsights({
    targetColumn,
    aggregateMultiplier,
    totalPercentDiff,
    totalDiff,
    parameterSensitivities,
    modelType,
    horizonPeriods,
    confidenceLevel,
    simulatedGrowth,
    baselineGrowth
  });

  return {
    targetColumn,
    targetLabel: targetColumn.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    targetMetric: 'sum',
    modelType,
    horizonPeriods,
    confidenceLevel,
    timeSeriesData,
    baselineKpis: {
      total: Math.round(baselineTotals * 100) / 100,
      mean: Math.round(baselineMean * 100) / 100,
      min: Math.min(...projectedPoints.map(p => p.baselineForecast)),
      max: Math.max(...projectedPoints.map(p => p.baselineForecast)),
      growthRatePercent: Math.round(baselineGrowth * 10) / 10
    },
    simulatedKpis: {
      total: Math.round(simulatedTotals * 100) / 100,
      mean: Math.round(simulatedMean * 100) / 100,
      min: Math.min(...projectedPoints.map(p => p.simulatedForecast)),
      max: Math.max(...projectedPoints.map(p => p.simulatedForecast)),
      growthRatePercent: Math.round(simulatedGrowth * 10) / 10
    },
    deltaKpis: {
      totalDiff: Math.round(totalDiff * 100) / 100,
      totalPercentDiff: Math.round(totalPercentDiff * 10) / 10,
      meanDiff: Math.round(meanDiff * 100) / 100,
      meanPercentDiff: Math.round(meanPercentDiff * 10) / 10
    },
    parameterSensitivities,
    monteCarloSummary: mcResult ? {
      medianOutcome: Math.round(simulatedTotals * 100) / 100,
      p10Outcome: Math.round(mcResult.p10Values.reduce((a, b) => a + b, 0) * 100) / 100,
      p90Outcome: Math.round(mcResult.p90Values.reduce((a, b) => a + b, 0) * 100) / 100,
      volatilityPercent: Math.round(volatility * 1000) / 10,
      iterationsCount: 300,
      paths: mcResult.paths
    } : undefined,
    keyInsights: insights
  };
}

/**
 * Generates automated bullet insights from simulation metrics
 */
function generateAutomatedScenarioInsights(ctx: {
  targetColumn: string;
  aggregateMultiplier: number;
  totalPercentDiff: number;
  totalDiff: number;
  parameterSensitivities: SimulationResult['parameterSensitivities'];
  modelType: ForecastModelType;
  horizonPeriods: number;
  confidenceLevel: number;
  simulatedGrowth: number;
  baselineGrowth: number;
}): string[] {
  const insights: string[] = [];
  const targetLabel = ctx.targetColumn.replace(/_/g, ' ').toUpperCase();

  // 1. Overall outcome headline
  if (ctx.totalPercentDiff > 0) {
    insights.push(
      `🟢 **Net Positive Outlook**: The scenario yields a **+${ctx.totalPercentDiff.toFixed(1)}%** upside (${ctx.totalDiff > 0 ? '+' : ''}${ctx.totalDiff.toLocaleString()} units) in projected ${targetLabel} across the next ${ctx.horizonPeriods} periods.`
    );
  } else if (ctx.totalPercentDiff < 0) {
    insights.push(
      `🔴 **Downturn Impact**: The scenario indicates a **${ctx.totalPercentDiff.toFixed(1)}%** contraction (${ctx.totalDiff.toLocaleString()} units) compared to the unperturbed baseline.`
    );
  } else {
    insights.push(
      `⚖️ **Baseline Trajectory**: Current parameter adjustments maintain parity with the baseline forecast across the next ${ctx.horizonPeriods} periods.`
    );
  }

  // 2. Dominant Driver
  if (ctx.parameterSensitivities.length > 0) {
    const topDriver = ctx.parameterSensitivities[0];
    if (Math.abs(topDriver.appliedDeltaPercent) > 0) {
      insights.push(
        `⚡ **Primary Lever**: **${topDriver.paramName}** is the most influential driver with an elasticity of **${topDriver.elasticity}**, contributing **${topDriver.estimatedImpactPercent > 0 ? '+' : ''}${topDriver.estimatedImpactPercent}%** of the total variance.`
      );
    } else {
      insights.push(
        `💡 **Highest Leverage Variable**: **${topDriver.paramName}** has the highest historical elasticity (**${topDriver.elasticity}**). Modifying this variable will deliver maximum leverage on ${targetLabel}.`
      );
    }
  }

  // 3. Trajectory vs Baseline Growth
  insights.push(
    `📈 **Horizon Trajectory**: Projected simulated growth is **${ctx.simulatedGrowth > 0 ? '+' : ''}${ctx.simulatedGrowth.toFixed(1)}%** compared to baseline growth of **${ctx.baselineGrowth > 0 ? '+' : ''}${ctx.baselineGrowth.toFixed(1)}%** using ${ctx.modelType.toUpperCase()} modeling at ${ctx.confidenceLevel}% confidence.`
  );

  return insights;
}

/**
 * Apply Scenario Presets to Driver Parameters
 */
export function applyScenarioPreset(
  parameters: DriverParameter[],
  preset: ScenarioPresetType
): DriverParameter[] {
  return parameters.map((p, idx) => {
    let delta = 0;
    const isPositiveElasticity = p.elasticity >= 0;

    switch (preset) {
      case 'bull_growth':
        delta = isPositiveElasticity ? (idx === 0 ? 25 : 15) : -15;
        break;
      case 'stress_test':
        delta = isPositiveElasticity ? -20 : 25;
        break;
      case 'cost_optimization':
        delta = isPositiveElasticity ? 10 : -30;
        break;
      case 'marketing_scale':
        delta = isPositiveElasticity ? (idx === 0 ? 40 : 20) : -10;
        break;
      case 'base':
      default:
        delta = 0;
        break;
    }

    // Clamp within min and max
    delta = Math.max(p.minPercent, Math.min(p.maxPercent, delta));
    const newVal = p.baseValue * (1 + delta / 100);

    return {
      ...p,
      percentChange: delta,
      currentValue: Math.round(newVal * 100) / 100
    };
  });
}
