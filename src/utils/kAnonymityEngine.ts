import { Dataset, ColumnMeta } from '../types';
import { createDatasetSnapshot } from './versionEngine';

export interface QuasiIdentifierCandidate {
  column: string;
  type: string;
  cardinality: number;
  distinctRatio: number;
  isLikelyQI: boolean;
  category: 'demographic' | 'geographic' | 'temporal' | 'socioeconomic' | 'other';
  recommendedGeneralization: 'binning_10' | 'binning_5' | 'zip_3digit' | 'year_only' | 'top_k_grouping' | 'none';
}

export interface EquivalenceClass {
  id: string;
  qiValues: Record<string, any>;
  size: number;
  rowIndices: number[];
  riskLevel: 'critical' | 'high' | 'moderate' | 'safe';
  sensitiveDistribution?: Record<string, number>;
  distinctSensitiveCount?: number;
}

export interface KAnonymityReport {
  timestamp: string;
  datasetName: string;
  totalRecords: number;
  selectedQIs: string[];
  sensitiveColumn?: string;
  
  // Metrics
  minK: number;
  averageK: number;
  medianK: number;
  targetK: number;
  satisfiesTargetK: boolean;
  
  // Distribution
  uniqueRecordsCount: number; // k = 1
  uniqueRecordsPercentage: number;
  highRiskCount: number; // k = 2..4
  highRiskPercentage: number;
  safeRecordsCount: number; // k >= targetK
  safeRecordsPercentage: number;
  
  // Classes
  totalEquivalenceClasses: number;
  vulnerableClasses: EquivalenceClass[];
  sampleEquivalenceClasses: EquivalenceClass[];
  
  // l-Diversity
  minLDiversity?: number;
  avgLDiversity?: number;
  
  // Re-identification score (0 - 100)
  reidentificationRiskScore: number;
  riskRating: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
}

export interface GeneralizationRule {
  column: string;
  method: 'binning_10' | 'binning_5' | 'zip_3digit' | 'year_only' | 'top_k_grouping' | 'suppress_outliers';
  customBinSize?: number;
  topK?: number;
}

const QI_COLUMN_PATTERNS = {
  demographic: ['age', 'gender', 'sex', 'race', 'ethnicity', 'marital', 'nationality', 'citizenship'],
  geographic: ['zip', 'zipcode', 'postal', 'city', 'state', 'county', 'country', 'region', 'area', 'lat', 'lon', 'location'],
  temporal: ['year', 'dob', 'birth', 'date', 'admission', 'hire_date', 'graduation', 'timestamp'],
  socioeconomic: ['education', 'degree', 'occupation', 'job', 'title', 'industry', 'department', 'income_bracket', 'salary_band'],
};

/**
 * Automatically inspects dataset columns to recommend Quasi-Identifiers
 */
export function detectQuasiIdentifiers(dataset: Dataset): QuasiIdentifierCandidate[] {
  const rowCount = dataset.data.length;
  if (rowCount === 0) return [];

  return dataset.columns.map(col => {
    const colNameLower = col.name.toLowerCase();
    
    // Compute cardinality
    const distinctValues = new Set();
    dataset.data.forEach(row => {
      const val = row[col.name];
      if (val !== null && val !== undefined && val !== '') {
        distinctValues.add(String(val));
      }
    });

    const cardinality = distinctValues.size;
    const distinctRatio = cardinality / rowCount;

    let category: QuasiIdentifierCandidate['category'] = 'other';
    let isLikelyQI = false;
    let recommendedGeneralization: QuasiIdentifierCandidate['recommendedGeneralization'] = 'none';

    if (QI_COLUMN_PATTERNS.demographic.some(p => colNameLower.includes(p))) {
      category = 'demographic';
      isLikelyQI = true;
      recommendedGeneralization = col.type === 'number' || colNameLower.includes('age') ? 'binning_10' : 'none';
    } else if (QI_COLUMN_PATTERNS.geographic.some(p => colNameLower.includes(p))) {
      category = 'geographic';
      isLikelyQI = true;
      recommendedGeneralization = colNameLower.includes('zip') || colNameLower.includes('postal') ? 'zip_3digit' : 'top_k_grouping';
    } else if (QI_COLUMN_PATTERNS.temporal.some(p => colNameLower.includes(p))) {
      category = 'temporal';
      isLikelyQI = true;
      recommendedGeneralization = 'year_only';
    } else if (QI_COLUMN_PATTERNS.socioeconomic.some(p => colNameLower.includes(p))) {
      category = 'socioeconomic';
      isLikelyQI = true;
      recommendedGeneralization = cardinality > 10 ? 'top_k_grouping' : 'none';
    } else if (cardinality >= 2 && cardinality < rowCount * 0.5 && !col.name.toLowerCase().includes('id')) {
      // Moderate cardinality non-ID column
      category = 'other';
      isLikelyQI = distinctRatio < 0.2;
    }

    return {
      column: col.name,
      type: col.type,
      cardinality,
      distinctRatio,
      isLikelyQI,
      category,
      recommendedGeneralization,
    };
  });
}

/**
 * Computes exact k-Anonymity and l-Diversity metrics for given Quasi-Identifiers
 */
export function computeKAnonymity(
  dataset: Dataset,
  selectedQIs: string[],
  options?: {
    targetK?: number;
    sensitiveColumn?: string;
  }
): KAnonymityReport {
  const targetK = options?.targetK || 5;
  const sensitiveCol = options?.sensitiveColumn;
  const rowCount = dataset.data.length;

  if (rowCount === 0 || selectedQIs.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      datasetName: dataset.name,
      totalRecords: rowCount,
      selectedQIs,
      sensitiveColumn: sensitiveCol,
      minK: 0,
      averageK: 0,
      medianK: 0,
      targetK,
      satisfiesTargetK: false,
      uniqueRecordsCount: 0,
      uniqueRecordsPercentage: 0,
      highRiskCount: 0,
      highRiskPercentage: 0,
      safeRecordsCount: 0,
      safeRecordsPercentage: 0,
      totalEquivalenceClasses: 0,
      vulnerableClasses: [],
      sampleEquivalenceClasses: [],
      reidentificationRiskScore: 0,
      riskRating: 'LOW',
    };
  }

  // Group rows into Equivalence Classes based on selected QIs
  const classMap = new Map<string, { qiValues: Record<string, any>; rowIndices: number[]; sensitiveVals: any[] }>();

  dataset.data.forEach((row, rowIndex) => {
    // Generate composite key
    const keyParts = selectedQIs.map(qi => {
      const v = row[qi];
      return v === null || v === undefined ? '§NULL§' : String(v).trim().toLowerCase();
    });
    const key = keyParts.join(' | ');

    if (!classMap.has(key)) {
      const qiValues: Record<string, any> = {};
      selectedQIs.forEach(qi => {
        qiValues[qi] = row[qi];
      });
      classMap.set(key, { qiValues, rowIndices: [], sensitiveVals: [] });
    }

    const group = classMap.get(key)!;
    group.rowIndices.push(rowIndex);
    if (sensitiveCol && row[sensitiveCol] !== undefined && row[sensitiveCol] !== null) {
      group.sensitiveVals.push(row[sensitiveCol]);
    }
  });

  // Analyze classes
  const classes: EquivalenceClass[] = [];
  let minK = Infinity;
  let uniqueRecordsCount = 0; // k = 1
  let highRiskCount = 0; // k = 2..4
  let safeRecordsCount = 0; // k >= targetK
  let totalLDiversity = 0;
  let minLDiversity = Infinity;

  classMap.forEach((val, id) => {
    const size = val.rowIndices.length;
    if (size < minK) minK = size;

    let riskLevel: EquivalenceClass['riskLevel'] = 'safe';
    if (size === 1) {
      riskLevel = 'critical';
      uniqueRecordsCount += 1;
    } else if (size < targetK) {
      riskLevel = 'high';
      highRiskCount += size;
    } else if (size < targetK * 2) {
      riskLevel = 'moderate';
      safeRecordsCount += size;
    } else {
      riskLevel = 'safe';
      safeRecordsCount += size;
    }

    let distinctSensitiveCount: number | undefined;
    let sensitiveDistribution: Record<string, number> | undefined;

    if (sensitiveCol && val.sensitiveVals.length > 0) {
      sensitiveDistribution = {};
      val.sensitiveVals.forEach(v => {
        const k = String(v);
        sensitiveDistribution![k] = (sensitiveDistribution![k] || 0) + 1;
      });
      distinctSensitiveCount = Object.keys(sensitiveDistribution).length;
      totalLDiversity += distinctSensitiveCount;
      if (distinctSensitiveCount < minLDiversity) {
        minLDiversity = distinctSensitiveCount;
      }
    }

    classes.push({
      id,
      qiValues: val.qiValues,
      size,
      rowIndices: val.rowIndices,
      riskLevel,
      distinctSensitiveCount,
      sensitiveDistribution,
    });
  });

  if (minK === Infinity) minK = 0;
  if (minLDiversity === Infinity) minLDiversity = 0;

  // Sort classes by size ascending (most vulnerable first)
  classes.sort((a, b) => a.size - b.size);

  const totalClasses = classes.length;
  const averageK = totalClasses > 0 ? Number((rowCount / totalClasses).toFixed(2)) : 0;
  
  const classSizes = classes.map(c => c.size);
  const mid = Math.floor(classSizes.length / 2);
  const medianK = classSizes.length % 2 !== 0 
    ? classSizes[mid] 
    : Number(((classSizes[mid - 1] + classSizes[mid]) / 2).toFixed(1));

  const uniqueRecordsPercentage = Number(((uniqueRecordsCount / rowCount) * 100).toFixed(1));
  const highRiskPercentage = Number(((highRiskCount / rowCount) * 100).toFixed(1));
  const safeRecordsPercentage = Number(((safeRecordsCount / rowCount) * 100).toFixed(1));

  // Risk Score: 100 max risk, weighted heavily by unique records (k=1) and k<targetK
  const reidentificationRiskScore = Math.min(
    100,
    Math.round(
      uniqueRecordsPercentage * 0.7 +
      highRiskPercentage * 0.3 +
      (minK < targetK ? 15 : 0)
    )
  );

  let riskRating: KAnonymityReport['riskRating'] = 'LOW';
  if (reidentificationRiskScore >= 60 || uniqueRecordsPercentage > 15) {
    riskRating = 'CRITICAL';
  } else if (reidentificationRiskScore >= 35 || minK < targetK) {
    riskRating = 'HIGH';
  } else if (reidentificationRiskScore >= 15) {
    riskRating = 'MODERATE';
  }

  return {
    timestamp: new Date().toISOString(),
    datasetName: dataset.name,
    totalRecords: rowCount,
    selectedQIs,
    sensitiveColumn: sensitiveCol,
    minK,
    averageK,
    medianK,
    targetK,
    satisfiesTargetK: minK >= targetK,
    uniqueRecordsCount,
    uniqueRecordsPercentage,
    highRiskCount,
    highRiskPercentage,
    safeRecordsCount,
    safeRecordsPercentage,
    totalEquivalenceClasses: totalClasses,
    vulnerableClasses: classes.filter(c => c.size < targetK).slice(0, 20),
    sampleEquivalenceClasses: classes.slice(0, 30),
    minLDiversity: sensitiveCol ? minLDiversity : undefined,
    avgLDiversity: sensitiveCol && totalClasses > 0 ? Number((totalLDiversity / totalClasses).toFixed(1)) : undefined,
    reidentificationRiskScore,
    riskRating,
  };
}

/**
 * Transforms a value according to a generalization rule
 */
export function generalizeValue(val: any, rule: GeneralizationRule): any {
  if (val === null || val === undefined || val === '') return val;

  switch (rule.method) {
    case 'binning_10': {
      const num = Number(val);
      if (isNaN(num)) return val;
      const lower = Math.floor(num / 10) * 10;
      return `[${lower} - ${lower + 9}]`;
    }

    case 'binning_5': {
      const num = Number(val);
      if (isNaN(num)) return val;
      const binSize = rule.customBinSize || 5;
      const lower = Math.floor(num / binSize) * binSize;
      return `[${lower} - ${lower + binSize - 1}]`;
    }

    case 'zip_3digit': {
      const str = String(val).replace(/[^0-9a-zA-Z]/g, '');
      if (str.length >= 3) {
        return `${str.slice(0, 3)}**`;
      }
      return '***';
    }

    case 'year_only': {
      const str = String(val);
      const match = str.match(/(?:19|20)\d{2}/);
      if (match) return match[0];
      return str;
    }

    default:
      return val;
  }
}

/**
 * Applies Generalization rules and optional suppression to achieve k-anonymity
 */
export function applyGeneralizationAndSuppression(
  dataset: Dataset,
  rules: GeneralizationRule[],
  options?: {
    suppressOutliersBelowK?: number;
    quasiIdentifiers?: string[];
  }
): {
  updatedDataset: Dataset;
  generalizedColumnsCount: number;
  suppressedRowsCount: number;
  beforeReport: KAnonymityReport;
  afterReport: KAnonymityReport;
} {
  const selectedQIs = options?.quasiIdentifiers || rules.map(r => r.column);
  const beforeReport = computeKAnonymity(dataset, selectedQIs);

  const ruleMap = new Map<string, GeneralizationRule>();
  rules.forEach(r => ruleMap.set(r.column, r));

  // 1. Generalize values row by row
  let modifiedData = dataset.data.map(row => {
    const newRow = { ...row };
    ruleMap.forEach((rule, colName) => {
      if (newRow[colName] !== undefined) {
        newRow[colName] = generalizeValue(newRow[colName], rule);
      }
    });
    return newRow;
  });

  // 2. Compute interim equivalence classes to identify records that still violate k
  let suppressedRowsCount = 0;
  const suppressK = options?.suppressOutliersBelowK;

  if (suppressK && suppressK > 1) {
    const interimTempDataset: Dataset = { ...dataset, data: modifiedData };
    const interimReport = computeKAnonymity(interimTempDataset, selectedQIs, { targetK: suppressK });

    const suppressRowIndices = new Set<number>();
    interimReport.vulnerableClasses.forEach(c => {
      if (c.size < suppressK) {
        c.rowIndices.forEach(idx => suppressRowIndices.add(idx));
      }
    });

    suppressedRowsCount = suppressRowIndices.size;
    // Replace vulnerable cell values with [SUPPRESSED] rather than deleting entire records to preserve sample size
    modifiedData = modifiedData.map((row, idx) => {
      if (suppressRowIndices.has(idx)) {
        const newRow = { ...row };
        selectedQIs.forEach(qi => {
          newRow[qi] = '[SUPPRESSED]';
        });
        return newRow;
      }
      return row;
    });
  }

  // Create snapshot in version history
  createDatasetSnapshot(dataset, {
    name: 'Generalization & k-Anonymity',
    description: `Generalization Applied (${rules.length} columns generalized, ${suppressedRowsCount} cells suppressed)`,
    tag: 'transformed',
  });

  const updatedDataset: Dataset = {
    ...dataset,
    data: modifiedData,
    updatedAt: new Date().toISOString(),
  };

  const afterReport = computeKAnonymity(updatedDataset, selectedQIs);

  return {
    updatedDataset,
    generalizedColumnsCount: rules.length,
    suppressedRowsCount,
    beforeReport,
    afterReport,
  };
}
