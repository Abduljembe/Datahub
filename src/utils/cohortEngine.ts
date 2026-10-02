// Cohort Comparison & Longitudinal Wave-over-Wave Analysis Engine

export interface CohortMetricStats {
  column: string;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  sampleSize: number;
}

export interface CohortProfile {
  cohortName: string;
  sampleSize: number;
  percentageOfTotal: number;
  numericMetrics: Record<string, CohortMetricStats>;
  categoricalDistributions: Record<string, Record<string, number>>;
  sentimentBreakdown?: {
    positive: number;
    neutral: number;
    negative: number;
    averageScore: number; // -1 to +1
  };
}

export interface LongitudinalWave {
  waveId: string;
  label: string;
  timestamp?: string;
  sampleCount: number;
  metricAverages: Record<string, number>;
  sentimentScore: number;
  dominantThemes?: string[];
  deltasVsPrevious?: {
    sampleDelta: number;
    metricDeltas: Record<string, { delta: number; percentChange: number }>;
    sentimentDelta: number;
  };
}

export interface CohortSignificanceTest {
  metric: string;
  cohortA: string;
  cohortB: string;
  meanA: number;
  meanB: number;
  delta: number;
  percentDiff: number;
  tStatistic: number;
  pValue: number;
  isSignificant: boolean; // p < 0.05
  cohensD: number; // effect size
  interpretation: string;
}

export interface CohortAnalysisReport {
  segmentColumn: string;
  cohorts: CohortProfile[];
  totalSample: number;
  significanceTests: CohortSignificanceTest[];
  longitudinalWaves: LongitudinalWave[];
  isLongitudinal: boolean;
  waveColumn?: string;
}

// ---------------- Helper Stats ----------------

function computeMean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function computeMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeStd(nums: number[], mean: number): number {
  if (nums.length <= 1) return 0;
  const variance = nums.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

// Welch's t-test approximation
function calculateTTest(groupA: number[], groupB: number[]): { t: number; p: number; d: number } {
  const nA = groupA.length;
  const nB = groupB.length;
  if (nA < 2 || nB < 2) return { t: 0, p: 1, d: 0 };

  const meanA = computeMean(groupA);
  const meanB = computeMean(groupB);
  const stdA = computeStd(groupA, meanA);
  const stdB = computeStd(groupB, meanB);

  const seDiff = Math.sqrt((stdA * stdA) / nA + (stdB * stdB) / nB);
  if (seDiff === 0) return { t: 0, p: 1, d: 0 };

  const t = (meanA - meanB) / seDiff;

  // Degrees of freedom (Welch-Satterthwaite)
  const dfNum = Math.pow((stdA * stdA) / nA + (stdB * stdB) / nB, 2);
  const dfDen =
    Math.pow((stdA * stdA) / nA, 2) / (nA - 1) +
    Math.pow((stdB * stdB) / nB, 2) / (nB - 1);
  const df = dfDen > 0 ? dfNum / dfDen : Math.min(nA, nB) - 1;

  // Approximate two-tailed p-value using standard normal / t approximation
  const absT = Math.abs(t);
  let p = 2 * (1 - standardNormalCDF(absT));
  if (df < 30) {
    p = Math.min(1, p * (1 + 1 / (4 * Math.max(1, df))));
  }
  p = Math.max(0.0001, Math.min(1, Math.round(p * 10000) / 10000));

  // Pooled Cohen's d effect size
  const pooledStd = Math.sqrt(((nA - 1) * stdA * stdA + (nB - 1) * stdB * stdB) / (nA + nB - 2)) || 1;
  const d = Math.round(((meanA - meanB) / pooledStd) * 100) / 100;

  return { t: Math.round(t * 100) / 100, p, d };
}

function standardNormalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

// ---------------- Cohort Profiler Engine ----------------

export function analyzeCohorts(
  data: Record<string, any>[],
  segmentCol: string,
  numericMetricCols: string[],
  categoricalCols: string[] = [],
  waveCol?: string
): CohortAnalysisReport {
  const totalSample = data.length;
  if (totalSample === 0) {
    return {
      segmentColumn: segmentCol,
      cohorts: [],
      totalSample: 0,
      significanceTests: [],
      longitudinalWaves: [],
      isLongitudinal: false,
    };
  }

  // Group by cohort segment
  const cohortGroups: Record<string, Record<string, any>[]> = {};
  data.forEach((row) => {
    const rawVal = row[segmentCol];
    const segment = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
      ? String(rawVal).trim()
      : 'Unassigned';
    if (!cohortGroups[segment]) cohortGroups[segment] = [];
    cohortGroups[segment].push(row);
  });

  const cohorts: CohortProfile[] = Object.entries(cohortGroups)
    .map(([cohortName, rows]) => {
      const sampleSize = rows.length;
      const percentageOfTotal = Math.round((sampleSize / totalSample) * 1000) / 10;

      // Numeric metrics
      const numericMetrics: Record<string, CohortMetricStats> = {};
      numericMetricCols.forEach((col) => {
        const nums = rows
          .map((r) => Number(r[col]))
          .filter((v) => !isNaN(v) && v !== null && v !== undefined);
        const mean = computeMean(nums);
        const median = computeMedian(nums);
        const std = computeStd(nums, mean);
        const min = nums.length > 0 ? Math.min(...nums) : 0;
        const max = nums.length > 0 ? Math.max(...nums) : 0;

        numericMetrics[col] = {
          column: col,
          mean: Math.round(mean * 100) / 100,
          median: Math.round(median * 100) / 100,
          std: Math.round(std * 100) / 100,
          min: Math.round(min * 100) / 100,
          max: Math.round(max * 100) / 100,
          sampleSize: nums.length,
        };
      });

      // Categorical distributions
      const categoricalDistributions: Record<string, Record<string, number>> = {};
      categoricalCols.forEach((col) => {
        const counts: Record<string, number> = {};
        rows.forEach((r) => {
          const val = String(r[col] || 'Other');
          counts[val] = (counts[val] || 0) + 1;
        });
        categoricalDistributions[col] = counts;
      });

      // Sentiment inference if text/sentiment column exists
      let sentimentBreakdown: CohortProfile['sentimentBreakdown'] = undefined;
      let totalSentimentScore = 0;
      let sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      let counted = 0;

      rows.forEach((r) => {
        // If explicit rating (e.g. 1-5 scale)
        const rating = Number(r['satisfaction_rating'] || r['rating'] || r['score']);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
          counted++;
          if (rating >= 4) {
            sentimentCounts.positive++;
            totalSentimentScore += 1;
          } else if (rating === 3) {
            sentimentCounts.neutral++;
            totalSentimentScore += 0;
          } else {
            sentimentCounts.negative++;
            totalSentimentScore -= 1;
          }
        }
      });

      if (counted > 0) {
        sentimentBreakdown = {
          positive: Math.round((sentimentCounts.positive / counted) * 100),
          neutral: Math.round((sentimentCounts.neutral / counted) * 100),
          negative: Math.round((sentimentCounts.negative / counted) * 100),
          averageScore: Math.round((totalSentimentScore / counted) * 100) / 100,
        };
      }

      return {
        cohortName,
        sampleSize,
        percentageOfTotal,
        numericMetrics,
        categoricalDistributions,
        sentimentBreakdown,
      };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);

  // Pairwise Statistical Significance Tests between top cohorts
  const significanceTests: CohortSignificanceTest[] = [];
  if (cohorts.length >= 2) {
    const cohortNames = cohorts.slice(0, 4).map((c) => c.cohortName);
    for (let i = 0; i < cohortNames.length; i++) {
      for (let j = i + 1; j < cohortNames.length; j++) {
        const nameA = cohortNames[i];
        const nameB = cohortNames[j];
        const rowsA = cohortGroups[nameA] || [];
        const rowsB = cohortGroups[nameB] || [];

        numericMetricCols.forEach((col) => {
          const valsA = rowsA.map((r) => Number(r[col])).filter((v) => !isNaN(v));
          const valsB = rowsB.map((r) => Number(r[col])).filter((v) => !isNaN(v));

          if (valsA.length >= 3 && valsB.length >= 3) {
            const { t, p, d } = calculateTTest(valsA, valsB);
            const meanA = Math.round(computeMean(valsA) * 100) / 100;
            const meanB = Math.round(computeMean(valsB) * 100) / 100;
            const delta = Math.round((meanA - meanB) * 100) / 100;
            const percentDiff = meanB !== 0 ? Math.round((delta / Math.abs(meanB)) * 1000) / 10 : 0;
            const isSignificant = p < 0.05;

            let interpretation = `No statistically significant difference (p = ${p})`;
            if (isSignificant) {
              const effectDesc = Math.abs(d) >= 0.8 ? 'large' : Math.abs(d) >= 0.5 ? 'moderate' : 'small';
              interpretation = `${nameA} is significantly ${delta > 0 ? 'higher' : 'lower'} than ${nameB} (p = ${p}, ${effectDesc} effect size d = ${d})`;
            }

            significanceTests.push({
              metric: col,
              cohortA: nameA,
              cohortB: nameB,
              meanA,
              meanB,
              delta,
              percentDiff,
              tStatistic: t,
              pValue: p,
              isSignificant,
              cohensD: d,
              interpretation,
            });
          }
        });
      }
    }
  }

  // Longitudinal Wave-over-Wave analysis if temporal waveCol exists or can be inferred
  const longitudinalWaves: LongitudinalWave[] = [];
  let isLongitudinal = false;
  let detectedWaveCol = waveCol;

  if (!detectedWaveCol) {
    const candidateCols = Object.keys(data[0] || {}).filter((c) =>
      /date|time|created|wave|quarter|month|year|period|cohort/i.test(c)
    );
    if (candidateCols.length > 0) {
      detectedWaveCol = candidateCols[0];
    }
  }

  if (detectedWaveCol) {
    const waveGroups: Record<string, Record<string, any>[]> = {};
    data.forEach((row) => {
      let rawVal = row[detectedWaveCol!];
      let waveKey = String(rawVal || 'Wave 1');

      // If date string, group by month/quarter
      if (typeof rawVal === 'string' && !isNaN(Date.parse(rawVal))) {
        const d = new Date(rawVal);
        waveKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!waveGroups[waveKey]) waveGroups[waveKey] = [];
      waveGroups[waveKey].push(row);
    });

    const sortedWaveKeys = Object.keys(waveGroups).sort();
    if (sortedWaveKeys.length >= 2) {
      isLongitudinal = true;
      let prevWave: LongitudinalWave | null = null;

      sortedWaveKeys.forEach((wKey, idx) => {
        const rows = waveGroups[wKey];
        const sampleCount = rows.length;

        const metricAverages: Record<string, number> = {};
        numericMetricCols.forEach((col) => {
          const nums = rows.map((r) => Number(r[col])).filter((v) => !isNaN(v));
          metricAverages[col] = Math.round(computeMean(nums) * 100) / 100;
        });

        // Sentiment
        const ratings = rows.map((r) => Number(r['satisfaction_rating'] || r['rating'] || 3)).filter((v) => !isNaN(v));
        const avgSentiment = ratings.length > 0 ? Math.round(computeMean(ratings) * 100) / 100 : 3;

        let deltasVsPrevious: LongitudinalWave['deltasVsPrevious'] = undefined;
        if (prevWave) {
          const sampleDelta = sampleCount - prevWave.sampleCount;
          const metricDeltas: Record<string, { delta: number; percentChange: number }> = {};
          numericMetricCols.forEach((col) => {
            const curVal = metricAverages[col] || 0;
            const prevVal = prevWave!.metricAverages[col] || 0;
            const delta = Math.round((curVal - prevVal) * 100) / 100;
            const percentChange = prevVal !== 0 ? Math.round((delta / Math.abs(prevVal)) * 1000) / 10 : 0;
            metricDeltas[col] = { delta, percentChange };
          });
          const sentimentDelta = Math.round((avgSentiment - prevWave.sentimentScore) * 100) / 100;

          deltasVsPrevious = { sampleDelta, metricDeltas, sentimentDelta };
        }

        const waveItem: LongitudinalWave = {
          waveId: `wave_${idx + 1}`,
          label: wKey,
          sampleCount,
          metricAverages,
          sentimentScore: avgSentiment,
          deltasVsPrevious,
        };

        longitudinalWaves.push(waveItem);
        prevWave = waveItem;
      });
    }
  }

  return {
    segmentColumn: segmentCol,
    cohorts,
    totalSample,
    significanceTests,
    longitudinalWaves,
    isLongitudinal,
    waveColumn: detectedWaveCol,
  };
}
