import { 
  ColumnDataType, 
  ColumnMeta, 
  ColumnStats, 
  CorrelationResult, 
  RegressionResult, 
  HypothesisTestResult, 
  ClusterResult,
  ZScoreAnomalyPoint,
  AnomalyColumnSummary,
  AnomalyDetectionResult
} from '../types';

/**
 * Robust numerical parser helper
 */
export function parseNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[$,%]/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Computes complete column-level summary and distribution statistics
 */
export function computeColumnStats(data: Record<string, any>[], column: ColumnMeta): ColumnStats {
  const values = data.map(row => row[column.name]);
  const totalCount = values.length;
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const nullCount = totalCount - nonNullValues.length;
  const nullPercentage = totalCount > 0 ? (nullCount / totalCount) * 100 : 0;
  
  const uniqueSet = new Set(nonNullValues);
  const uniqueCount = uniqueSet.size;

  const stats: ColumnStats = {
    columnName: column.name,
    dataType: column.type,
    totalCount,
    nullCount,
    nullPercentage,
    uniqueCount,
  };

  if (column.type === 'number') {
    const numValues: number[] = [];
    for (const v of nonNullValues) {
      const n = parseNumber(v);
      if (n !== null) numValues.push(n);
    }

    if (numValues.length > 0) {
      numValues.sort((a, b) => a - b);
      const n = numValues.length;
      const sum = numValues.reduce((acc, curr) => acc + curr, 0);
      const mean = sum / n;
      const min = numValues[0];
      const max = numValues[n - 1];

      // Median & Quartiles
      const median = getPercentile(numValues, 50);
      const q1 = getPercentile(numValues, 25);
      const q3 = getPercentile(numValues, 75);
      const iqr = q3 - q1;

      // Variance & StdDev
      const squaredDiffs = numValues.map(v => Math.pow(v - mean, 2));
      const variance = n > 1 ? squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1) : 0;
      const stdDev = Math.sqrt(variance);

      // Skewness and Kurtosis
      let skewness = 0;
      let kurtosis = 0;
      if (n > 2 && stdDev > 0) {
        const m3 = numValues.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / n;
        const m4 = numValues.reduce((acc, v) => acc + Math.pow(v - mean, 4), 0) / n;
        skewness = m3 / Math.pow(stdDev, 3);
        kurtosis = (m4 / Math.pow(stdDev, 4)) - 3; // Excess kurtosis
      }

      // Outlier detection using 1.5 * IQR rule
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;
      const outliers = numValues.filter(v => v < lowerFence || v > upperFence);

      // Mode
      const freqMap = new Map<number, number>();
      let maxFreq = 0;
      let modeVal: number = numValues[0];
      for (const val of numValues) {
        const count = (freqMap.get(val) || 0) + 1;
        freqMap.set(val, count);
        if (count > maxFreq) {
          maxFreq = count;
          modeVal = val;
        }
      }

      // Histogram bins (Sturges' formula or Freedman-Diaconis)
      const binCount = Math.max(5, Math.min(15, Math.round(1 + 3.322 * Math.log10(n))));
      const binWidth = (max - min) / (binCount || 1);
      const histogram: { bin: string; count: number; min: number; max: number }[] = [];

      if (binWidth > 0) {
        for (let i = 0; i < binCount; i++) {
          const bMin = min + i * binWidth;
          const bMax = i === binCount - 1 ? max : min + (i + 1) * binWidth;
          histogram.push({
            bin: `${round(bMin, 1)} - ${round(bMax, 1)}`,
            count: 0,
            min: bMin,
            max: bMax,
          });
        }

        for (const val of numValues) {
          for (let i = 0; i < histogram.length; i++) {
            const b = histogram[i];
            if (val >= b.min && (i === histogram.length - 1 ? val <= b.max : val < b.max)) {
              b.count++;
              break;
            }
          }
        }
      }

      stats.sum = sum;
      stats.mean = round(mean, 2);
      stats.min = min;
      stats.max = max;
      stats.median = round(median, 2);
      stats.q1 = round(q1, 2);
      stats.q25 = round(q1, 2);
      stats.q3 = round(q3, 2);
      stats.q75 = round(q3, 2);
      stats.iqr = round(iqr, 2);
      stats.variance = round(variance, 2);
      stats.stdDev = round(stdDev, 2);
      stats.skewness = round(skewness, 3);
      stats.kurtosis = round(kurtosis, 3);
      stats.outliersCount = outliers.length;
      stats.mode = modeVal;
      stats.histogram = histogram;
      stats.histogramBins = histogram;
    }

  } else {
    // Categorical frequencies
    const freqMap = new Map<string, number>();
    for (const v of nonNullValues) {
      const strVal = String(v);
      freqMap.set(strVal, (freqMap.get(strVal) || 0) + 1);
    }

    const sortedEntries = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]);
    const topValues = sortedEntries.slice(0, 10).map(([value, count]) => ({
      value,
      count,
      percentage: totalCount > 0 ? round((count / totalCount) * 100, 1) : 0,
    }));

    stats.topValues = topValues;
    if (topValues.length > 0) {
      stats.mode = topValues[0].value;
    }
  }

  return stats;
}

function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function round(val: number, decimals: number = 2): number {
  if (isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Calculates Pearson Correlation Matrix for all numeric columns
 */
export function computeCorrelationMatrix(data: Record<string, any>[], columns: ColumnMeta[]): CorrelationResult {
  const numericCols = columns.filter(c => c.type === 'number').map(c => c.name);
  const matrix: number[][] = [];
  const pValues: number[][] = [];

  for (let i = 0; i < numericCols.length; i++) {
    matrix[i] = [];
    pValues[i] = [];
    for (let j = 0; j < numericCols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        pValues[i][j] = 0;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i];
        pValues[i][j] = pValues[j][i];
      } else {
        const col1 = numericCols[i];
        const col2 = numericCols[j];
        const pairs: [number, number][] = [];

        for (const row of data) {
          const v1 = parseNumber(row[col1]);
          const v2 = parseNumber(row[col2]);
          if (v1 !== null && v2 !== null) {
            pairs.push([v1, v2]);
          }
        }

        const r = calculatePearson(pairs);
        const p = calculateCorrelationPValue(r, pairs.length);
        matrix[i][j] = round(r, 3);
        pValues[i][j] = round(p, 4);
      }
    }
  }

  return {
    columns: numericCols,
    matrix,
    pValues,
  };
}

function calculatePearson(pairs: [number, number][]): number {
  const n = pairs.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const [x, y] of pairs) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

function calculateCorrelationPValue(r: number, n: number): number {
  if (n <= 2 || Math.abs(r) >= 1) return 0;
  const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r));
  // Student's t two-tailed p-value approximation
  const df = n - 2;
  return round(approximateTPValue(t, df), 4);
}

/**
 * Computes Ordinary Least Squares Linear Regression
 */
export function computeLinearRegression(
  data: Record<string, any>[],
  xCol: string,
  yCol: string
): RegressionResult | null {
  const pairs: { x: number; y: number }[] = [];
  for (const row of data) {
    const x = parseNumber(row[xCol]);
    const y = parseNumber(row[yCol]);
    if (x !== null && y !== null) {
      pairs.push({ x, y });
    }
  }

  const n = pairs.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of pairs) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const xMean = sumX / n;
  const yMean = sumY / n;
  const denominator = sumX2 - n * xMean * xMean;

  if (denominator === 0) return null;

  const slope = (sumXY - n * xMean * yMean) / denominator;
  const intercept = yMean - slope * xMean;

  // Residuals and R-squared
  let ssTot = 0;
  let ssRes = 0;
  const points = pairs.map(p => {
    const predicted = slope * p.x + intercept;
    const residual = p.y - predicted;
    ssTot += Math.pow(p.y - yMean, 2);
    ssRes += Math.pow(residual, 2);
    return {
      x: p.x,
      y: p.y,
      predicted: round(predicted, 2),
      residual: round(residual, 2),
    };
  });

  const r2 = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;
  const r = Math.sign(slope) * Math.sqrt(r2);
  const df = n - 2;
  const stdError = df > 0 ? Math.sqrt(ssRes / df) : 0;
  const fStatistic = df > 0 && ssRes > 0 ? ((ssTot - ssRes) / 1) / (ssRes / df) : 0;
  const tStat = stdError > 0 && denominator > 0 ? slope / (stdError / Math.sqrt(denominator)) : 0;
  const pValue = approximateTPValue(Math.abs(tStat), df);

  const sign = intercept >= 0 ? '+' : '-';
  const equation = `Y = ${round(slope, 3)} * X ${sign} ${round(Math.abs(intercept), 3)}`;

  return {
    independentVar: xCol,
    dependentVar: yCol,
    slope: round(slope, 4),
    intercept: round(intercept, 4),
    r2: round(r2, 4),
    r: round(r, 4),
    stdError: round(stdError, 4),
    pValue: round(pValue, 4),
    fStatistic: round(fStatistic, 2),
    equation,
    points,
  };
}

/**
 * Independent Two-Sample T-Test
 */
export function computeTwoSampleTTest(
  data: Record<string, any>[],
  numericCol: string,
  groupCol: string
): HypothesisTestResult | null {
  const groups: Record<string, number[]> = {};

  for (const row of data) {
    const groupVal = String(row[groupCol] || '');
    const num = parseNumber(row[numericCol]);
    if (groupVal && num !== null) {
      if (!groups[groupVal]) groups[groupVal] = [];
      groups[groupVal].push(num);
    }
  }

  const groupKeys = Object.keys(groups);
  if (groupKeys.length < 2) return null;

  const g1Name = groupKeys[0];
  const g2Name = groupKeys[1];
  const sample1 = groups[g1Name];
  const sample2 = groups[g2Name];

  const n1 = sample1.length;
  const n2 = sample2.length;
  if (n1 < 2 || n2 < 2) return null;

  const mean1 = sample1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = sample2.reduce((a, b) => a + b, 0) / n2;

  const var1 = sample1.reduce((acc, v) => acc + Math.pow(v - mean1, 2), 0) / (n1 - 1);
  const var2 = sample2.reduce((acc, v) => acc + Math.pow(v - mean2, 2), 0) / (n2 - 1);

  // Welch's t-test (unequal variances assumed)
  const se = Math.sqrt(var1 / n1 + var2 / n2);
  if (se === 0) return null;

  const tStat = (mean1 - mean2) / se;
  // Welch-Satterthwaite degrees of freedom
  const numDf = Math.pow(var1 / n1 + var2 / n2, 2);
  const denomDf = (Math.pow(var1 / n1, 2) / (n1 - 1)) + (Math.pow(var2 / n2, 2) / (n2 - 1));
  const df = denomDf > 0 ? Math.round(numDf / denomDf) : n1 + n2 - 2;

  const pVal = approximateTPValue(Math.abs(tStat), df);
  const isSig = pVal < 0.05;

  return {
    testType: 't-test',
    title: `Two-Sample T-Test (${g1Name} vs ${g2Name})`,
    variable1: numericCol,
    variable2: groupCol,
    statisticName: 't-Statistic',
    statisticValue: round(tStat, 3),
    degreesOfFreedom: df,
    pValue: round(pVal, 4),
    alpha: 0.05,
    isSignificant: isSig,
    conclusion: isSig
      ? `Statistically significant difference between ${g1Name} (Mean: ${round(mean1, 2)}) and ${g2Name} (Mean: ${round(mean2, 2)}) at α = 0.05 (p = ${round(pVal, 4)}).`
      : `No statistically significant difference between ${g1Name} (Mean: ${round(mean1, 2)}) and ${g2Name} (Mean: ${round(mean2, 2)}) at α = 0.05 (p = ${round(pVal, 4)}).`,
    details: {
      group1: { name: g1Name, mean: round(mean1, 2), n: n1, variance: round(var1, 2) },
      group2: { name: g2Name, mean: round(mean2, 2), n: n2, variance: round(var2, 2) },
      stdError: round(se, 3),
    }
  };
}

/**
 * One-Way ANOVA F-Test
 */
export function computeOneWayAnova(
  data: Record<string, any>[],
  numericCol: string,
  groupCol: string
): HypothesisTestResult | null {
  const groups: Record<string, number[]> = {};
  let totalSum = 0;
  let totalN = 0;

  for (const row of data) {
    const groupVal = String(row[groupCol] || '');
    const num = parseNumber(row[numericCol]);
    if (groupVal && num !== null) {
      if (!groups[groupVal]) groups[groupVal] = [];
      groups[groupVal].push(num);
      totalSum += num;
      totalN++;
    }
  }

  const k = Object.keys(groups).length;
  if (k < 2 || totalN <= k) return null;

  const grandMean = totalSum / totalN;

  // Between-group sum of squares (SSB) and Within-group sum of squares (SSW)
  let ssb = 0;
  let ssw = 0;
  const groupStats: Record<string, { count: number; mean: number; stdDev: number }> = {};

  for (const [grp, vals] of Object.entries(groups)) {
    const n_i = vals.length;
    if (n_i === 0) continue;
    const mean_i = vals.reduce((a, b) => a + b, 0) / n_i;
    const var_i = n_i > 1 ? vals.reduce((acc, v) => acc + Math.pow(v - mean_i, 2), 0) / (n_i - 1) : 0;
    
    ssb += n_i * Math.pow(mean_i - grandMean, 2);
    ssw += vals.reduce((acc, v) => acc + Math.pow(v - mean_i, 2), 0);

    groupStats[grp] = {
      count: n_i,
      mean: round(mean_i, 2),
      stdDev: round(Math.sqrt(var_i), 2),
    };
  }

  const dfBetween = k - 1;
  const dfWithin = totalN - k;
  const msb = ssb / dfBetween;
  const msw = ssw / dfWithin;
  const fStat = msw > 0 ? msb / msw : 0;

  const pVal = approximateFPValue(fStat, dfBetween, dfWithin);
  const isSig = pVal < 0.05;

  return {
    testType: 'anova',
    title: `One-Way ANOVA (${numericCol} across ${groupCol})`,
    variable1: numericCol,
    variable2: groupCol,
    statisticName: 'F-Statistic',
    statisticValue: round(fStat, 3),
    degreesOfFreedom: dfBetween,
    pValue: round(pVal, 4),
    alpha: 0.05,
    isSignificant: isSig,
    conclusion: isSig
      ? `Significant group effect found across ${k} categories of "${groupCol}" (F(${dfBetween}, ${dfWithin}) = ${round(fStat, 2)}, p = ${round(pVal, 4)}).`
      : `No significant variance difference across groups of "${groupCol}" (F(${dfBetween}, ${dfWithin}) = ${round(fStat, 2)}, p = ${round(pVal, 4)}).`,
    details: {
      groupCount: k,
      totalObservations: totalN,
      ssb: round(ssb, 2),
      ssw: round(ssw, 2),
      dfBetween,
      dfWithin,
      groupStats,
    }
  };
}

/**
 * Chi-Square Test of Independence
 */
export function computeChiSquareTest(
  data: Record<string, any>[],
  catCol1: string,
  catCol2: string
): HypothesisTestResult | null {
  const contingency: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let totalN = 0;

  for (const row of data) {
    const v1 = String(row[catCol1] || '').trim();
    const v2 = String(row[catCol2] || '').trim();
    if (!v1 || !v2) continue;

    if (!contingency[v1]) contingency[v1] = {};
    contingency[v1][v2] = (contingency[v1][v2] || 0) + 1;
    rowTotals[v1] = (rowTotals[v1] || 0) + 1;
    colTotals[v2] = (colTotals[v2] || 0) + 1;
    totalN++;
  }

  const rows = Object.keys(rowTotals);
  const cols = Object.keys(colTotals);

  if (rows.length < 2 || cols.length < 2 || totalN === 0) return null;

  const df = (rows.length - 1) * (cols.length - 1);
  let chiSquare = 0;

  for (const r of rows) {
    for (const c of cols) {
      const observed = contingency[r]?.[c] || 0;
      const expected = (rowTotals[r] * colTotals[c]) / totalN;
      if (expected > 0) {
        chiSquare += Math.pow(observed - expected, 2) / expected;
      }
    }
  }

  const pVal = approximateChiSquarePValue(chiSquare, df);
  const isSig = pVal < 0.05;

  return {
    testType: 'chi-square',
    title: `Chi-Square Test (${catCol1} vs ${catCol2})`,
    variable1: catCol1,
    variable2: catCol2,
    statisticName: 'χ² Statistic',
    statisticValue: round(chiSquare, 3),
    degreesOfFreedom: df,
    pValue: round(pVal, 4),
    alpha: 0.05,
    isSignificant: isSig,
    conclusion: isSig
      ? `Significant association exists between ${catCol1} and ${catCol2} (χ² = ${round(chiSquare, 2)}, df = ${df}, p = ${round(pVal, 4)}).`
      : `No significant relationship between ${catCol1} and ${catCol2} (χ² = ${round(chiSquare, 2)}, df = ${df}, p = ${round(pVal, 4)}). Variables appear independent.`,
    details: {
      rows,
      cols,
      totalCount: totalN,
      contingencyMatrix: contingency,
    }
  };
}

/**
 * K-Means Clustering
 */
export function computeKMeansClustering(
  data: Record<string, any>[],
  features: string[],
  k: number = 3,
  maxIterations: number = 50
): ClusterResult | null {
  if (features.length < 1 || data.length < k) return null;

  // Extract and normalize numeric vectors
  const rawPoints: number[][] = [];
  const validIndices: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const vec: number[] = [];
    let valid = true;
    for (const f of features) {
      const num = parseNumber(row[f]);
      if (num === null) {
        valid = false;
        break;
      }
      vec.push(num);
    }
    if (valid) {
      rawPoints.push(vec);
      validIndices.push(i);
    }
  }

  if (rawPoints.length < k) return null;

  // Feature min-max normalization
  const mins: number[] = features.map((_, col) => Math.min(...rawPoints.map(p => p[col])));
  const maxs: number[] = features.map((_, col) => Math.max(...rawPoints.map(p => p[col])));
  const ranges: number[] = mins.map((min, idx) => {
    const range = maxs[idx] - min;
    return range === 0 ? 1 : range;
  });

  const normalizedPoints = rawPoints.map(p =>
    p.map((val, idx) => (val - mins[idx]) / ranges[idx])
  );

  // Initialize centroids (k-means++ style)
  const numDims = features.length;
  const centroids: number[][] = [];
  // First centroid random
  centroids.push([...normalizedPoints[Math.floor(Math.random() * normalizedPoints.length)]]);

  while (centroids.length < k) {
    const distances = normalizedPoints.map(p => {
      return Math.min(...centroids.map(c => euclideanDist(p, c)));
    });
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let target = Math.random() * totalDist;
    let selectedIndex = 0;
    for (let i = 0; i < distances.length; i++) {
      target -= distances[i];
      if (target <= 0) {
        selectedIndex = i;
        break;
      }
    }
    centroids.push([...normalizedPoints[selectedIndex]]);
  }

  let assignments = new Array(normalizedPoints.length).fill(0);
  let changed = true;
  let iter = 0;

  while (changed && iter < maxIterations) {
    iter++;
    changed = false;

    // Assign points to nearest centroid
    for (let i = 0; i < normalizedPoints.length; i++) {
      const p = normalizedPoints[i];
      let minDist = Infinity;
      let bestCluster = 0;

      for (let c = 0; c < k; c++) {
        const dist = euclideanDist(p, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    // Recompute centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = normalizedPoints.filter((_, idx) => assignments[idx] === c);
      if (clusterPoints.length > 0) {
        for (let d = 0; d < numDims; d++) {
          centroids[c][d] = clusterPoints.reduce((acc, p) => acc + p[d], 0) / clusterPoints.length;
        }
      }
    }
  }

  // Denormalize centroids for display
  const denormalizedCentroids = centroids.map(c => {
    const record: Record<string, number> = {};
    features.forEach((feat, idx) => {
      record[feat] = round(c[idx] * ranges[idx] + mins[idx], 2);
    });
    return record;
  });

  // Build cluster summaries
  const clusters = [];
  const fullAssignments = new Array(data.length).fill(-1);

  for (let c = 0; c < k; c++) {
    const memberIndices = validIndices.filter((_, idx) => assignments[idx] === c);
    const sampleRows = memberIndices.slice(0, 5).map(idx => data[idx]);

    clusters.push({
      clusterId: c + 1,
      count: memberIndices.length,
      percentage: round((memberIndices.length / validIndices.length) * 100, 1),
      samplePoints: sampleRows,
    });
  }

  validIndices.forEach((dataIdx, idx) => {
    fullAssignments[dataIdx] = assignments[idx] + 1;
  });

  // Calculate approximate silhouette score
  const silhouetteScore = calculateSilhouetteScore(normalizedPoints, assignments, k);

  return {
    k,
    features,
    centroids: denormalizedCentroids,
    clusters,
    pointClusterAssignments: fullAssignments,
    silhouetteScore: round(silhouetteScore, 3),
  };
}

function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

function calculateSilhouetteScore(points: number[][], assignments: number[], k: number): number {
  if (points.length === 0 || k <= 1) return 0;
  let totalScore = 0;
  const sampleSize = Math.min(100, points.length);

  for (let i = 0; i < sampleSize; i++) {
    const currentCluster = assignments[i];
    const sameClusterPoints = points.filter((_, idx) => assignments[idx] === currentCluster && idx !== i);
    
    // a(i) - mean intra-cluster distance
    const a = sameClusterPoints.length > 0
      ? sameClusterPoints.reduce((acc, p) => acc + euclideanDist(points[i], p), 0) / sameClusterPoints.length
      : 0;

    // b(i) - mean nearest-cluster distance
    let minOtherClusterDist = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === currentCluster) continue;
      const otherClusterPoints = points.filter((_, idx) => assignments[idx] === c);
      if (otherClusterPoints.length > 0) {
        const meanDist = otherClusterPoints.reduce((acc, p) => acc + euclideanDist(points[i], p), 0) / otherClusterPoints.length;
        if (meanDist < minOtherClusterDist) minOtherClusterDist = meanDist;
      }
    }

    const b = minOtherClusterDist === Infinity ? 0 : minOtherClusterDist;
    const maxAB = Math.max(a, b);
    if (maxAB > 0) {
      totalScore += (b - a) / maxAB;
    }
  }

  return totalScore / sampleSize;
}

// Statistical probability approximations
function approximateTPValue(t: number, df: number): number {
  if (df <= 0) return 1;
  const x = df / (df + t * t);
  // Incomplete beta function approximation
  return round(Math.max(0.0001, Math.min(1, Math.pow(x, df / 2))), 4);
}

function approximateFPValue(f: number, df1: number, df2: number): number {
  if (f <= 0 || df1 <= 0 || df2 <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return round(Math.max(0.0001, Math.min(1, Math.pow(x, df2 / 2))), 4);
}

function approximateChiSquarePValue(chi: number, df: number): number {
  if (chi <= 0 || df <= 0) return 1;
  const k = df / 2;
  const x = chi / 2;
  // Wilson-Hilferty transformation
  const s = Math.sqrt(2 / (9 * df));
  const z = (Math.pow(chi / df, 1 / 3) - (1 - 2 / (9 * df))) / s;
  return round(Math.max(0.0001, Math.min(1, 0.5 * (1 - erf(z / Math.SQRT2)))), 4);
}

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

/**
 * Convenience aliases for Statistical Suite UI
 */
export function computeTTest(data: Record<string, any>[], groupCol: string, valCol: string) {
  const res = computeTwoSampleTTest(data, valCol, groupCol);
  if (!res) return null;
  return {
    tStatistic: res.statisticValue,
    df: res.degreesOfFreedom,
    pValue: res.pValue,
    mean1: res.details?.group1?.mean ?? 0,
    mean2: res.details?.group2?.mean ?? 0,
    isSignificant: res.isSignificant,
    conclusion: res.conclusion,
  };
}

export function computeANOVA(data: Record<string, any>[], groupCol: string, valCol: string) {
  const res = computeOneWayAnova(data, valCol, groupCol);
  if (!res) return null;
  return {
    fStatistic: res.statisticValue,
    pValue: res.pValue,
    dfBetween: res.details?.dfBetween ?? 0,
    dfWithin: res.details?.dfWithin ?? 0,
    ssBetween: res.details?.ssb ?? 0,
    isSignificant: res.isSignificant,
    conclusion: res.conclusion,
  };
}

export function computeChiSquare(data: Record<string, any>[], catColA: string, catColB: string) {
  const res = computeChiSquareTest(data, catColA, catColB);
  if (!res) return null;
  return {
    chiSquare: res.statisticValue,
    df: res.degreesOfFreedom,
    pValue: res.pValue,
    isSignificant: res.isSignificant,
    conclusion: res.conclusion,
  };
}

export function computeKMeans(data: Record<string, any>[], xCol: string, yCol: string, k: number) {
  const res = computeKMeansClustering(data, [xCol, yCol], k);
  if (!res) return null;
  const centroids = res.centroids.map(c => ({
    x: c[xCol] ?? 0,
    y: c[yCol] ?? 0,
  }));
  const points = data.map((row, idx) => ({
    x: Number(row[xCol]) || 0,
    y: Number(row[yCol]) || 0,
    cluster: (res.pointClusterAssignments[idx] ?? 1) - 1,
  }));

  return {
    centroids,
    points,
    silhouetteScore: res.silhouetteScore,
  };
}

/**
 * Computes Median Absolute Deviation (MAD) for robust statistics
 */
export function computeMAD(values: number[], medianVal?: number): number {
  if (values.length === 0) return 0;
  const med = medianVal !== undefined ? medianVal : getPercentile([...values].sort((a, b) => a - b), 50);
  const absoluteDeviations = values.map(v => Math.abs(v - med)).sort((a, b) => a - b);
  return getPercentile(absoluteDeviations, 50);
}

/**
 * Automated Anomaly Detection Engine using Statistical Z-Scores
 * Supports Standard Gaussian Z-score (x - μ) / σ and Robust Z-score (0.6745 * (x - median) / MAD)
 */
export function computeZScoreAnomalies(
  data: Record<string, any>[],
  columns: ColumnMeta[],
  selectedColumnNames?: string[],
  zThreshold: number = 3.0,
  method: 'standard' | 'robust' = 'standard'
): AnomalyDetectionResult {
  const numericColumns = columns.filter(
    col => col.type === 'number' && (!selectedColumnNames || selectedColumnNames.includes(col.name))
  );

  const columnSummaries: Record<string, AnomalyColumnSummary> = {};
  const anomalies: ZScoreAnomalyPoint[] = [];
  const anomalousRowSet = new Set<number>();

  // Precompute parameters for each numeric column
  for (const col of numericColumns) {
    const colName = col.name;
    const validRows: { rowIndex: number; val: number }[] = [];

    for (let i = 0; i < data.length; i++) {
      const num = parseNumber(data[i][colName]);
      if (num !== null) {
        validRows.push({ rowIndex: i, val: num });
      }
    }

    if (validRows.length < 2) continue;

    const valuesOnly = validRows.map(r => r.val).sort((a, b) => a - b);
    const n = valuesOnly.length;
    const sum = valuesOnly.reduce((acc, curr) => acc + curr, 0);
    const mean = sum / n;
    const median = getPercentile(valuesOnly, 50);

    const squaredDiffs = valuesOnly.map(v => Math.pow(v - mean, 2));
    const variance = n > 1 ? squaredDiffs.reduce((a, b) => a + b, 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const mad = computeMAD(valuesOnly, median);

    let maxZ = 0;
    let minZ = 0;
    let outlierCount = 0;

    for (const item of validRows) {
      const val = item.val;
      const deviation = val - mean;
      
      // Standard Z-Score
      const zScore = stdDev > 0 ? deviation / stdDev : 0;
      
      // Robust Z-Score (using 0.6745 consistency factor for normal distribution)
      const robustZScore = mad > 0 ? (0.6745 * (val - median)) / mad : zScore;

      const activeScore = method === 'robust' ? robustZScore : zScore;
      const absScore = Math.abs(activeScore);

      if (activeScore > maxZ) maxZ = activeScore;
      if (activeScore < minZ) minZ = activeScore;

      const isAnomaly = absScore >= zThreshold;

      if (isAnomaly) {
        outlierCount++;
        anomalousRowSet.add(item.rowIndex);

        const severity: 'mild' | 'moderate' | 'extreme' = 
          absScore >= 4.0 ? 'extreme' : absScore >= 3.0 ? 'moderate' : 'mild';

        const direction: 'high' | 'low' = activeScore >= 0 ? 'high' : 'low';

        // Auto-generate statistical explanation
        const explanation = `${colName} (${val.toLocaleString()}) is ${absScore.toFixed(2)}σ ${
          direction === 'high' ? 'above' : 'below'
        } ${method === 'robust' ? `median (${round(median, 2)})` : `mean (${round(mean, 2)})`}`;

        anomalies.push({
          rowIndex: item.rowIndex,
          rowId: data[item.rowIndex]?.id || `row_${item.rowIndex + 1}`,
          columnName: colName,
          value: round(val, 4),
          mean: round(mean, 4),
          stdDev: round(stdDev, 4),
          zScore: round(zScore, 3),
          robustZScore: round(robustZScore, 3),
          deviation: round(deviation, 4),
          direction,
          severity,
          isAnomaly: true,
          row: data[item.rowIndex],
          explanation,
        });
      }
    }

    columnSummaries[colName] = {
      columnName: colName,
      mean: round(mean, 2),
      stdDev: round(stdDev, 2),
      median: round(median, 2),
      mad: round(mad, 2),
      min: valuesOnly[0],
      max: valuesOnly[n - 1],
      outlierCount,
      outlierPercentage: round((outlierCount / data.length) * 100, 1),
      maxZScore: round(maxZ, 2),
      minZScore: round(minZ, 2),
    };
  }

  // Sort anomalies by highest magnitude absolute Z-score
  anomalies.sort((a, b) => {
    const scoreA = Math.abs(method === 'robust' ? a.robustZScore : a.zScore);
    const scoreB = Math.abs(method === 'robust' ? b.robustZScore : b.zScore);
    return scoreB - scoreA;
  });

  return {
    totalRows: data.length,
    anomalousRowCount: anomalousRowSet.size,
    anomalousRowIndices: Array.from(anomalousRowSet).sort((a, b) => a - b),
    anomalies,
    columnSummaries,
    globalZThreshold: zThreshold,
    method,
  };
}


