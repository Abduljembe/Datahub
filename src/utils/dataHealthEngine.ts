import { Dataset, ColumnMeta, DataHealthReport, DataHealthIssue, DataHealthCleanAction } from '../types';
import { parseNumber, round, computeColumnStats, computeZScoreAnomalies } from './statistics';
import { imputeMissing } from './dataEngine';
import { createDatasetSnapshot } from './versionEngine';

export interface GroundTruthHealthStats {
  rowCount: number;
  columnCount: number;
  totalCells: number;
  totalNulls: number;
  completenessRate: number;
  duplicateRowCount: number;
  duplicateRate: number;
  duplicateIndices: number[];
  duplicateSample: Record<string, any>[];
  totalOutliers: number;
  missingByColumn: Array<{
    column: string;
    type: string;
    nullCount: number;
    nullPct: number;
    sampleIndices: number[];
  }>;
  outliersByColumn: Array<{
    column: string;
    outlierCount: number;
    outlierPct: number;
    mean: number;
    stdDev: number;
    median: number;
    mad: number;
    lowerBound: number;
    upperBound: number;
    extremeMin: number;
    extremeMax: number;
    outlierIndices: number[];
  }>;
  baselineScore: number;
}

/**
 * Computes exact ground-truth mathematical statistics for the dataset's hygiene
 */
export function computeGroundTruthHealthStats(dataset: Dataset): GroundTruthHealthStats {
  const data = dataset.data || [];
  const columns = dataset.columns || [];
  const rowCount = data.length;
  const colCount = columns.length;
  const totalCells = rowCount * colCount;

  if (rowCount === 0 || colCount === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      totalCells: 0,
      totalNulls: 0,
      completenessRate: 100,
      duplicateRowCount: 0,
      duplicateRate: 0,
      duplicateIndices: [],
      duplicateSample: [],
      totalOutliers: 0,
      missingByColumn: [],
      outliersByColumn: [],
      baselineScore: 100,
    };
  }

  // 1. Missing Values per Column
  let totalNulls = 0;
  const missingByColumn: GroundTruthHealthStats['missingByColumn'] = [];

  columns.forEach(col => {
    let nullCount = 0;
    const sampleIndices: number[] = [];

    data.forEach((row, idx) => {
      const val = row[col.name];
      if (val === null || val === undefined || val === '') {
        nullCount++;
        if (sampleIndices.length < 5) sampleIndices.push(idx);
      }
    });

    totalNulls += nullCount;
    if (nullCount > 0) {
      missingByColumn.push({
        column: col.name,
        type: col.type,
        nullCount,
        nullPct: round((nullCount / rowCount) * 100, 1),
        sampleIndices,
      });
    }
  });

  const completenessRate = totalCells > 0 ? round(((totalCells - totalNulls) / totalCells) * 100, 1) : 100;

  // 2. Duplicate Rows Detection
  const seenRows = new Map<string, number>();
  const duplicateIndices: number[] = [];
  const duplicateSample: Record<string, any>[] = [];

  data.forEach((row, idx) => {
    const serialized = JSON.stringify(row);
    if (seenRows.has(serialized)) {
      duplicateIndices.push(idx);
      if (duplicateSample.length < 6) {
        duplicateSample.push(row);
      }
    } else {
      seenRows.set(serialized, idx);
    }
  });

  const duplicateRowCount = duplicateIndices.length;
  const duplicateRate = round((duplicateRowCount / rowCount) * 100, 1);

  // 3. Statistical Outliers per Numeric Column (Z-Score > 2.8 and IQR bounds)
  const numericCols = columns.filter(c => c.type === 'number');
  const outliersByColumn: GroundTruthHealthStats['outliersByColumn'] = [];
  let totalOutliers = 0;

  numericCols.forEach(col => {
    const rawVals: number[] = [];
    data.forEach(row => {
      const parsed = parseNumber(row[col.name]);
      if (parsed !== null && !isNaN(parsed)) {
        rawVals.push(parsed);
      }
    });

    if (rawVals.length >= 4) {
      const n = rawVals.length;
      const mean = rawVals.reduce((a, b) => a + b, 0) / n;
      const variance = rawVals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1 || 1);
      const stdDev = Math.sqrt(variance);

      // Median & MAD for robust checks
      const sorted = [...rawVals].sort((a, b) => a - b);
      const median = sorted[Math.floor(n / 2)];
      const absDevs = sorted.map(v => Math.abs(v - median)).sort((a, b) => a - b);
      const mad = absDevs[Math.floor(n / 2)] || 1;

      // Bound: 3 standard deviations
      const lowerBound = round(mean - 3 * stdDev, 2);
      const upperBound = round(mean + 3 * stdDev, 2);

      const outlierIndices: number[] = [];
      let extremeMin = Infinity;
      let extremeMax = -Infinity;

      data.forEach((row, idx) => {
        const parsed = parseNumber(row[col.name]);
        if (parsed !== null && !isNaN(parsed)) {
          if (parsed < lowerBound || parsed > upperBound) {
            outlierIndices.push(idx);
            if (parsed < extremeMin) extremeMin = parsed;
            if (parsed > extremeMax) extremeMax = parsed;
          }
        }
      });

      if (outlierIndices.length > 0) {
        totalOutliers += outlierIndices.length;
        outliersByColumn.push({
          column: col.name,
          outlierCount: outlierIndices.length,
          outlierPct: round((outlierIndices.length / rowCount) * 100, 1),
          mean: round(mean, 2),
          stdDev: round(stdDev, 2),
          median: round(median, 2),
          mad: round(mad, 2),
          lowerBound,
          upperBound,
          extremeMin: extremeMin === Infinity ? lowerBound : round(extremeMin, 2),
          extremeMax: extremeMax === -Infinity ? upperBound : round(extremeMax, 2),
          outlierIndices,
        });
      }
    }
  });

  // Calculate baseline Health Score (0 - 100)
  // Deduct points for null rate, duplicate rate, and outlier rate
  let score = 100;
  score -= Math.min(45, (100 - completenessRate) * 1.5);
  score -= Math.min(30, duplicateRate * 2.5);
  const outlierRate = rowCount > 0 ? (totalOutliers / (rowCount * Math.max(1, numericCols.length))) * 100 : 0;
  score -= Math.min(25, outlierRate * 3.0);
  const baselineScore = Math.max(15, Math.min(100, Math.round(score)));

  return {
    rowCount,
    columnCount: colCount,
    totalCells,
    totalNulls,
    completenessRate,
    duplicateRowCount,
    duplicateRate,
    duplicateIndices,
    duplicateSample,
    totalOutliers,
    missingByColumn,
    outliersByColumn,
    baselineScore,
  };
}

/**
 * Builds a comprehensive deterministic DataHealthReport using ground truth statistics
 */
export function buildHeuristicHealthReport(dataset: Dataset, stats?: GroundTruthHealthStats): DataHealthReport {
  const s = stats || computeGroundTruthHealthStats(dataset);
  const issues: DataHealthIssue[] = [];

  // 1. Missing Value Issues
  s.missingByColumn.forEach(colInfo => {
    const isNum = colInfo.type === 'number';
    const isCritical = colInfo.nullPct >= 20;
    const isWarning = colInfo.nullPct >= 5;
    const severity = isCritical ? 'critical' : isWarning ? 'warning' : 'info';

    const cleanStrategy = isNum ? 'median' : 'mode';
    const actionLabel = isNum 
      ? `One-Click Clean: Impute with Median` 
      : `One-Click Clean: Impute with Most Frequent`;

    const sampleRows = dataset.data.filter(r => r[colInfo.column] === null || r[colInfo.column] === undefined || r[colInfo.column] === '').slice(0, 3);

    issues.push({
      id: `issue_missing_${colInfo.column}`,
      category: 'missing_values',
      severity,
      column: colInfo.column,
      title: `Missing Values in '${colInfo.column}'`,
      affectedCount: colInfo.nullCount,
      affectedPercentage: colInfo.nullPct,
      metricsSummary: `${colInfo.nullCount} missing cells (${colInfo.nullPct}% of column)`,
      aiExplanation: `Empty cells in '${colInfo.column}' reduce sample power and can distort aggregated summaries, correlation coefficients, or machine learning pipelines.`,
      aiRecommendation: isNum
        ? `Impute missing numerical values using the column median to preserve central tendency without distortion from extreme values.`
        : `Impute missing categorical values using the mode (most common value) or drop incomplete records.`,
      suggestedAction: {
        type: 'impute',
        label: actionLabel,
        column: colInfo.column,
        strategy: cleanStrategy,
        description: `Fill ${colInfo.nullCount} missing cells in '${colInfo.column}' with the ${cleanStrategy}.`,
      },
      alternativeActions: [
        {
          type: 'drop_rows',
          label: `Drop Incomplete Rows (${colInfo.nullCount} rows)`,
          column: colInfo.column,
          strategy: 'drop',
          description: `Filter out and delete all rows where '${colInfo.column}' is empty.`,
        },
        ...(isNum ? [{
          type: 'impute' as const,
          label: `Impute with Mean`,
          column: colInfo.column,
          strategy: 'mean' as const,
          description: `Fill missing cells with arithmetic mean.`,
        }] : [{
          type: 'impute' as const,
          label: `Fill with 'Unknown'`,
          column: colInfo.column,
          strategy: 'custom' as const,
          fillValue: 'Unknown',
          description: `Replace empty text with explicit label 'Unknown'.`,
        }]),
      ],
      sampleRows,
      resolved: false,
    });
  });

  // 2. Duplicate Row Issue
  if (s.duplicateRowCount > 0) {
    const isCritical = s.duplicateRate >= 10;
    const isWarning = s.duplicateRate >= 2;
    const severity = isCritical ? 'critical' : isWarning ? 'warning' : 'info';

    issues.push({
      id: `issue_duplicates`,
      category: 'duplicate_rows',
      severity,
      title: `Duplicate Rows Detected`,
      affectedCount: s.duplicateRowCount,
      affectedPercentage: s.duplicateRate,
      metricsSummary: `${s.duplicateRowCount} identical records (${s.duplicateRate}% redundancy)`,
      aiExplanation: `Redundant duplicate rows artificially inflate sample sizes, bias frequency counts, and lead to overfitting in downstream analysis.`,
      aiRecommendation: `Deduplicate the dataset by keeping the first occurrence of each distinct record.`,
      suggestedAction: {
        type: 'remove_duplicates',
        label: `One-Click Clean: Remove ${s.duplicateRowCount} Duplicate Rows`,
        description: `Permanently remove identical duplicate rows and retain unique entries only.`,
      },
      sampleRows: s.duplicateSample,
      resolved: false,
    });
  }

  // 3. Outlier Issues
  s.outliersByColumn.forEach(outlierInfo => {
    const isCritical = outlierInfo.outlierPct >= 8;
    const isWarning = outlierInfo.outlierPct >= 2;
    const severity = isCritical ? 'critical' : isWarning ? 'warning' : 'info';

    const sampleRows = dataset.data.filter(r => {
      const v = parseNumber(r[outlierInfo.column]);
      return v !== null && (v < outlierInfo.lowerBound || v > outlierInfo.upperBound);
    }).slice(0, 3);

    issues.push({
      id: `issue_outlier_${outlierInfo.column}`,
      category: 'outliers',
      severity,
      column: outlierInfo.column,
      title: `Statistical Outliers in '${outlierInfo.column}'`,
      affectedCount: outlierInfo.outlierCount,
      affectedPercentage: outlierInfo.outlierPct,
      metricsSummary: `${outlierInfo.outlierCount} extreme points beyond 3σ (range: [${outlierInfo.extremeMin} to ${outlierInfo.extremeMax}])`,
      aiExplanation: `Extreme values outside [${outlierInfo.lowerBound}, ${outlierInfo.upperBound}] inflate column variance (σ=${outlierInfo.stdDev}) and can skew regression coefficients or mean estimates.`,
      aiRecommendation: `Apply Winsorization to cap extreme outlier values at 3 standard deviations [${outlierInfo.lowerBound}, ${outlierInfo.upperBound}] while retaining the observation rows.`,
      suggestedAction: {
        type: 'winsorize',
        label: `One-Click Clean: Winsorize Outliers (Cap at 3σ)`,
        column: outlierInfo.column,
        strategy: 'winsorize_3std',
        lowerBound: outlierInfo.lowerBound,
        upperBound: outlierInfo.upperBound,
        description: `Clamp ${outlierInfo.outlierCount} values to within safe statistical bounds [${outlierInfo.lowerBound}, ${outlierInfo.upperBound}].`,
      },
      alternativeActions: [
        {
          type: 'trim_outliers',
          label: `Filter Outlier Rows (${outlierInfo.outlierCount} rows)`,
          column: outlierInfo.column,
          lowerBound: outlierInfo.lowerBound,
          upperBound: outlierInfo.upperBound,
          description: `Exclude rows where '${outlierInfo.column}' is outside the 3σ range.`,
        },
      ],
      sampleRows,
      resolved: false,
    });
  });

  const score = s.baselineScore;
  const grade = score >= 93 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
  const status = score >= 88 ? 'Optimal' : score >= 72 ? 'Good' : score >= 50 ? 'Needs Attention' : 'Critical Quality Risk';

  const keyRisks: string[] = [];
  if (s.totalNulls > 0) keyRisks.push(`Incomplete records detected across ${s.missingByColumn.length} column(s).`);
  if (s.duplicateRowCount > 0) keyRisks.push(`${s.duplicateRowCount} duplicate row(s) risk inflating counts and sample variance.`);
  if (s.totalOutliers > 0) keyRisks.push(`${s.totalOutliers} extreme statistical outlier(s) exceed 3 standard deviations.`);
  if (keyRisks.length === 0) keyRisks.push('Dataset is highly clean with 100% completeness and no detected structural duplicates or 3σ outliers.');

  const executiveSummary = issues.length === 0
    ? `The dataset '${dataset.name}' demonstrates outstanding data health with zero missing values, no duplicate records, and stable statistical variance across all features.`
    : `Data health scan detected ${issues.length} actionable quality concern(s) spanning ${s.missingByColumn.length} missing feature(s), ${s.duplicateRowCount} duplicate row(s), and ${s.totalOutliers} extreme outlier point(s). One-Click Clean routines are recommended to ensure analytical rigor.`;

  return {
    overallScore: score,
    grade,
    status,
    executiveSummary,
    keyRisks,
    totalCells: s.totalCells,
    totalNulls: s.totalNulls,
    duplicateRowCount: s.duplicateRowCount,
    totalOutliers: s.totalOutliers,
    issues,
    scannedAt: new Date().toISOString(),
    isAiGenerated: false,
    modelUsed: 'DataHub Embedded Statistical Engine',
  };
}

/**
 * Calls Gemini server endpoint to enrich the health audit with generative AI reasoning
 */
export async function fetchGeminiDataHealthAudit(dataset: Dataset): Promise<DataHealthReport> {
  const groundTruthStats = computeGroundTruthHealthStats(dataset);
  const baselineReport = buildHeuristicHealthReport(dataset, groundTruthStats);

  try {
    const payload = {
      datasetSummary: {
        name: dataset.name,
        rowCount: groundTruthStats.rowCount,
        columnCount: groundTruthStats.columnCount,
        totalCells: groundTruthStats.totalCells,
        totalNulls: groundTruthStats.totalNulls,
        duplicateRowCount: groundTruthStats.duplicateRowCount,
        totalOutliers: groundTruthStats.totalOutliers,
        columns: dataset.columns.map(c => ({
          name: c.name,
          type: c.type,
          nullable: c.nullable,
        })),
        missingByColumn: groundTruthStats.missingByColumn,
        outliersByColumn: groundTruthStats.outliersByColumn,
      },
      stats: groundTruthStats,
    };

    const response = await fetch('/api/gemini/data-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('Gemini Data Health endpoint returned non-200. Using statistical report fallback.');
      return baselineReport;
    }

    const json = await response.json();
    if (!json || !json.report) {
      return baselineReport;
    }

    const aiReport = json.report;

    // Merge AI insights into the ground-truth issues to guarantee mathematical accuracy
    const enrichedIssues = baselineReport.issues.map(baseIssue => {
      const match = aiReport.issues?.find((aiIss: any) => 
        (baseIssue.column && aiIss.column && aiIss.column.toLowerCase() === baseIssue.column.toLowerCase()) ||
        (aiIss.category === baseIssue.category)
      );

      if (match) {
        return {
          ...baseIssue,
          title: match.title || baseIssue.title,
          aiExplanation: match.aiExplanation || baseIssue.aiExplanation,
          aiRecommendation: match.aiRecommendation || baseIssue.aiRecommendation,
          severity: match.severity || baseIssue.severity,
          suggestedAction: {
            ...baseIssue.suggestedAction,
            label: match.suggestedActionLabel || baseIssue.suggestedAction.label,
            description: match.suggestedActionDescription || baseIssue.suggestedAction.description,
          },
        };
      }
      return baseIssue;
    });

    return {
      ...baselineReport,
      overallScore: typeof aiReport.overallScore === 'number' ? Math.max(10, Math.min(100, Math.round(aiReport.overallScore))) : baselineReport.overallScore,
      status: aiReport.status || baselineReport.status,
      executiveSummary: aiReport.executiveSummary || baselineReport.executiveSummary,
      keyRisks: Array.isArray(aiReport.keyRisks) && aiReport.keyRisks.length > 0 ? aiReport.keyRisks : baselineReport.keyRisks,
      issues: enrichedIssues,
      isAiGenerated: true,
      modelUsed: aiReport.modelUsed || 'gemini-3.8-flash',
    };
  } catch (err) {
    console.warn('Gemini Data Health fetch failed, using reliable fallback:', err);
    return baselineReport;
  }
}

/**
 * Applies a specific One-Click Clean action and creates an automated version checkpoint
 */
export function executeCleanAction(
  dataset: Dataset,
  action: DataHealthCleanAction
): { updatedDataset: Dataset; rowsAffected: number; description: string } {
  let newData = [...dataset.data];
  let rowsAffected = 0;
  let description = '';

  if (action.type === 'remove_duplicates') {
    const initialCount = newData.length;
    const seen = new Set<string>();
    const cleaned: Record<string, any>[] = [];

    newData.forEach(row => {
      const key = JSON.stringify(row);
      if (!seen.has(key)) {
        seen.add(key);
        cleaned.push(row);
      }
    });

    rowsAffected = initialCount - cleaned.length;
    newData = cleaned;
    description = `Removed ${rowsAffected} duplicate row(s). Unique records retained.`;
  } 
  else if (action.type === 'impute' && action.column) {
    const colName = action.column;
    const strategy = action.strategy || 'median';

    newData = imputeMissing(
      newData,
      colName,
      strategy === 'median' || strategy === 'mean' || strategy === 'mode' || strategy === 'zero' || strategy === 'custom' 
        ? strategy 
        : 'median',
      action.fillValue
    );

    // Count how many cells were filled
    dataset.data.forEach(r => {
      const v = r[colName];
      if (v === null || v === undefined || v === '') rowsAffected++;
    });

    description = `Imputed ${rowsAffected} missing value(s) in '${colName}' using ${strategy}.`;
  }
  else if (action.type === 'drop_rows' && action.column) {
    const colName = action.column;
    const initialCount = newData.length;

    newData = newData.filter(r => {
      const v = r[colName];
      return v !== null && v !== undefined && v !== '';
    });

    rowsAffected = initialCount - newData.length;
    description = `Dropped ${rowsAffected} incomplete row(s) with missing values in '${colName}'.`;
  }
  else if (action.type === 'winsorize' && action.column) {
    const colName = action.column;
    const lower = action.lowerBound !== undefined ? action.lowerBound : -Infinity;
    const upper = action.upperBound !== undefined ? action.upperBound : Infinity;

    newData = newData.map(row => {
      const parsed = parseNumber(row[colName]);
      if (parsed !== null && !isNaN(parsed)) {
        if (parsed < lower) {
          rowsAffected++;
          return { ...row, [colName]: lower };
        } else if (parsed > upper) {
          rowsAffected++;
          return { ...row, [colName]: upper };
        }
      }
      return row;
    });

    description = `Winsorized ${rowsAffected} outlier value(s) in '${colName}' to [${lower}, ${upper}].`;
  }
  else if (action.type === 'trim_outliers' && action.column) {
    const colName = action.column;
    const lower = action.lowerBound !== undefined ? action.lowerBound : -Infinity;
    const upper = action.upperBound !== undefined ? action.upperBound : Infinity;
    const initialCount = newData.length;

    newData = newData.filter(row => {
      const parsed = parseNumber(row[colName]);
      if (parsed !== null && !isNaN(parsed)) {
        return parsed >= lower && parsed <= upper;
      }
      return true;
    });

    rowsAffected = initialCount - newData.length;
    description = `Trimmed and removed ${rowsAffected} row(s) with outlier values in '${colName}'.`;
  }

  const baseUpdated: Dataset = {
    ...dataset,
    data: newData,
    updatedAt: new Date().toISOString(),
  };

  const { updatedDataset } = createDatasetSnapshot(baseUpdated, {
    name: `One-Click Clean (${action.type})`,
    description,
    tag: 'cleaned',
    createdBy: 'Data Health AI',
  });

  return {
    updatedDataset,
    rowsAffected,
    description,
  };
}

/**
 * Cleans all active issues in one comprehensive pass
 */
export function executeCleanAll(
  dataset: Dataset,
  issues: DataHealthIssue[]
): { updatedDataset: Dataset; totalCleaned: number; summary: string } {
  let currentDataset = dataset;
  let totalCleaned = 0;
  const actionsSummary: string[] = [];

  // Filter pending issues
  const pending = issues.filter(i => !i.resolved);

  // 1. First remove duplicates
  const dupIssue = pending.find(i => i.category === 'duplicate_rows');
  if (dupIssue) {
    const res = executeCleanAction(currentDataset, dupIssue.suggestedAction);
    currentDataset = res.updatedDataset;
    totalCleaned += res.rowsAffected;
    actionsSummary.push(`Removed ${res.rowsAffected} duplicates`);
  }

  // 2. Then impute missing values
  const missingIssues = pending.filter(i => i.category === 'missing_values');
  for (const iss of missingIssues) {
    const res = executeCleanAction(currentDataset, iss.suggestedAction);
    currentDataset = res.updatedDataset;
    totalCleaned += res.rowsAffected;
    actionsSummary.push(`Imputed '${iss.column}' (${res.rowsAffected} cells)`);
  }

  // 3. Finally winsorize outliers
  const outlierIssues = pending.filter(i => i.category === 'outliers');
  for (const iss of outlierIssues) {
    const res = executeCleanAction(currentDataset, iss.suggestedAction);
    currentDataset = res.updatedDataset;
    totalCleaned += res.rowsAffected;
    actionsSummary.push(`Winsorized '${iss.column}' (${res.rowsAffected} values)`);
  }

  const summary = actionsSummary.length > 0 
    ? `One-Click Clean All completed: ${actionsSummary.join(', ')}.` 
    : 'No pending data health issues to clean.';

  return {
    updatedDataset: currentDataset,
    totalCleaned,
    summary,
  };
}
