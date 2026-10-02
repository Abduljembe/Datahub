import { Dataset, ColumnMeta } from '../types';
import { createDatasetSnapshot } from './versionEngine';
import { scanDatasetForPii, maskColumnData, maskAllDetections, MaskingStrategy } from './piiEngine';
import { loadDatasetContracts, evaluateDatasetContracts, purgeViolatingRows } from './contractEngine';

function calculateMean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function calculateMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type RecipeStepAction =
  | 'remove_duplicates'
  | 'impute_missing'
  | 'drop_missing'
  | 'winsorize_outliers'
  | 'trim_outliers'
  | 'anonymize_pii'
  | 'enforce_contracts'
  | 'text_clean';

export interface RecipeStep {
  id: string;
  action: RecipeStepAction;
  name: string;
  enabled: boolean;
  column?: string; // specific column or '_all_'
  params: {
    imputeStrategy?: 'mean' | 'median' | 'mode' | 'zero' | 'custom_value';
    fillValue?: any;
    piiStrategy?: 'mask' | 'hash' | 'redact';
    textTransform?: 'trim' | 'lowercase' | 'uppercase' | 'titlecase';
    stdDevThreshold?: number; // e.g. 3.0
  };
  description: string;
}

export interface CleaningRecipe {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean;
  steps: RecipeStep[];
}

export interface StepExecutionResult {
  stepId: string;
  action: RecipeStepAction;
  name: string;
  success: boolean;
  rowsAffected: number;
  cellsModified: number;
  message: string;
}

export interface RecipeExecutionReport {
  recipeId: string;
  recipeName: string;
  totalSteps: number;
  executedSteps: number;
  initialRowCount: number;
  finalRowCount: number;
  rowsModified: number;
  cellsModified: number;
  stepResults: StepExecutionResult[];
  timestamp: string;
}

const STORAGE_KEY = 'remix_saved_cleaning_recipes';

/**
 * Built-in preset recipes
 */
export const PRESET_RECIPES: CleaningRecipe[] = [
  {
    id: 'preset_universal_hygiene',
    name: 'Universal Data Hygiene & Deduplication',
    description: 'De-duplicates identical rows, imputes numeric nulls with median, fills text nulls, and standardizes whitespace.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isPreset: true,
    steps: [
      {
        id: 'step_dedup',
        action: 'remove_duplicates',
        name: 'Remove Exact Duplicate Rows',
        enabled: true,
        params: {},
        description: 'Purges redundant duplicate records across the entire dataset.',
      },
      {
        id: 'step_text_trim',
        action: 'text_clean',
        name: 'Trim Text Whitespace',
        enabled: true,
        column: '_all_',
        params: { textTransform: 'trim' },
        description: 'Trims leading and trailing spaces across all text columns.',
      },
      {
        id: 'step_impute_num',
        action: 'impute_missing',
        name: 'Impute Numeric Missing with Median',
        enabled: true,
        column: '_all_',
        params: { imputeStrategy: 'median' },
        description: 'Fills blank numeric cells with robust column median.',
      },
      {
        id: 'step_winsorize',
        action: 'winsorize_outliers',
        name: 'Cap Extreme Outliers (3σ)',
        enabled: true,
        column: '_all_',
        params: { stdDevThreshold: 3.0 },
        description: 'Clamps extreme numeric spikes at 3 standard deviations.',
      },
    ],
  },
  {
    id: 'preset_privacy_compliance',
    name: 'Privacy Guard & GDPR Compliance',
    description: 'Scans and masks sensitive PII (emails, cards, SSNs), purges duplicates, and removes empty dropouts.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isPreset: true,
    steps: [
      {
        id: 'step_pii_mask',
        action: 'anonymize_pii',
        name: 'Mask Detected PII Columns',
        enabled: true,
        column: '_all_',
        params: { piiStrategy: 'mask' },
        description: 'Applies partial structural masking to all exposed PII attributes.',
      },
      {
        id: 'step_dedup_pii',
        action: 'remove_duplicates',
        name: 'Deduplicate Anonymized Records',
        enabled: true,
        params: {},
        description: 'Removes duplicate identities created after pseudonymization.',
      },
      {
        id: 'step_drop_orphans',
        action: 'drop_missing',
        name: 'Drop Incomplete Records',
        enabled: true,
        column: '_all_',
        params: {},
        description: 'Drops records with critical empty values.',
      },
    ],
  },
  {
    id: 'preset_ml_preprocessing',
    name: 'ML Feature Engineering Preparation',
    description: 'Standardizes numerical features, caps outliers, imputes missing values, and enforces contracts.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isPreset: true,
    steps: [
      {
        id: 'step_ml_dedup',
        action: 'remove_duplicates',
        name: 'Remove Training Duplicates',
        enabled: true,
        params: {},
        description: 'Prevents data leakage and overfitting from repeated rows.',
      },
      {
        id: 'step_ml_impute',
        action: 'impute_missing',
        name: 'Impute Missing with Mean',
        enabled: true,
        column: '_all_',
        params: { imputeStrategy: 'mean' },
        description: 'Replaces NaN values with statistical feature means.',
      },
      {
        id: 'step_ml_winsor',
        action: 'winsorize_outliers',
        name: 'Winsorize Heavy Tails',
        enabled: true,
        column: '_all_',
        params: { stdDevThreshold: 3.0 },
        description: 'Stabilizes gradients by capping extreme distribution tails.',
      },
      {
        id: 'step_ml_contracts',
        action: 'enforce_contracts',
        name: 'Enforce Data Contracts',
        enabled: true,
        params: {},
        description: 'Purges any records that violate defined validation expectations.',
      },
    ],
  },
];

/**
 * Load all recipes (presets + user saved)
 */
export function loadCleaningRecipes(): CleaningRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const userRecipes: CleaningRecipe[] = JSON.parse(raw);
      // Merge user recipes with presets (avoid duplicate IDs)
      const userIds = new Set(userRecipes.map(r => r.id));
      const combined = [...PRESET_RECIPES.filter(p => !userIds.has(p.id)), ...userRecipes];
      return combined;
    }
  } catch (err) {
    console.error('Failed to load cleaning recipes:', err);
  }
  return [...PRESET_RECIPES];
}

/**
 * Save custom recipes
 */
export function saveCleaningRecipes(recipes: CleaningRecipe[]): void {
  try {
    const userOnly = recipes.filter(r => !r.isPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  } catch (err) {
    console.error('Failed to save cleaning recipes:', err);
  }
}

/**
 * Executes a CleaningRecipe sequentially against a dataset
 */
export function executeCleaningRecipe(
  dataset: Dataset,
  recipe: CleaningRecipe
): { updatedDataset: Dataset; report: RecipeExecutionReport } {
  const initialRowCount = dataset.data.length;
  let currentData = [...dataset.data.map(r => ({ ...r }))];
  const stepResults: StepExecutionResult[] = [];
  let totalCellsModified = 0;

  const activeSteps = recipe.steps.filter(s => s.enabled);

  for (const step of activeSteps) {
    let stepRowsAffected = 0;
    let stepCellsModified = 0;
    let message = '';
    let success = true;

    try {
      switch (step.action) {
        case 'remove_duplicates': {
          const seen = new Set<string>();
          const deduped: Record<string, any>[] = [];
          currentData.forEach(row => {
            const key = JSON.stringify(row);
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(row);
            }
          });
          stepRowsAffected = currentData.length - deduped.length;
          currentData = deduped;
          message = `Removed ${stepRowsAffected} duplicate record(s).`;
          break;
        }

        case 'text_clean': {
          const transform = step.params.textTransform || 'trim';
          const targetCols = step.column && step.column !== '_all_'
            ? [step.column]
            : dataset.columns.filter(c => c.type === 'string' || c.type === 'category').map(c => c.name);

          currentData.forEach(row => {
            targetCols.forEach(col => {
              const val = row[col];
              if (typeof val === 'string') {
                let transformed = val;
                if (transform === 'trim') transformed = val.trim();
                else if (transform === 'lowercase') transformed = val.toLowerCase().trim();
                else if (transform === 'uppercase') transformed = val.toUpperCase().trim();
                else if (transform === 'titlecase') {
                  transformed = val.trim().replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
                }

                if (transformed !== val) {
                  row[col] = transformed;
                  stepCellsModified++;
                }
              }
            });
          });
          message = `Cleaned and normalized ${stepCellsModified} text cell(s).`;
          break;
        }

        case 'impute_missing': {
          const strat = step.params.imputeStrategy || 'median';
          const targetCols = step.column && step.column !== '_all_'
            ? [step.column]
            : dataset.columns.filter(c => c.type === 'number').map(c => c.name);

          targetCols.forEach(col => {
            const validNums = currentData
              .map(r => r[col])
              .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
              .map(Number);

            let fill: any = 0;
            if (strat === 'mean' && validNums.length > 0) {
              fill = calculateMean(validNums);
            } else if (strat === 'median' && validNums.length > 0) {
              fill = calculateMedian(validNums);
            } else if (strat === 'zero') {
              fill = 0;
            } else if (strat === 'custom_value') {
              fill = step.params.fillValue ?? 0;
            }

            currentData.forEach(row => {
              const v = row[col];
              if (v === null || v === undefined || v === '' || isNaN(Number(v))) {
                row[col] = fill;
                stepCellsModified++;
              }
            });
          });
          message = `Imputed ${stepCellsModified} missing numeric cell(s) using ${strat}.`;
          break;
        }

        case 'winsorize_outliers': {
          const threshold = step.params.stdDevThreshold || 3.0;
          const targetCols = step.column && step.column !== '_all_'
            ? [step.column]
            : dataset.columns.filter(c => c.type === 'number').map(c => c.name);

          targetCols.forEach(col => {
            const nums = currentData
              .map(r => r[col])
              .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
              .map(Number);

            if (nums.length >= 4) {
              const mean = calculateMean(nums);
              const variance = nums.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / nums.length;
              const stdDev = Math.sqrt(variance);

              if (stdDev > 0) {
                const lower = mean - threshold * stdDev;
                const upper = mean + threshold * stdDev;

                currentData.forEach(row => {
                  const val = Number(row[col]);
                  if (!isNaN(val)) {
                    if (val < lower) {
                      row[col] = Math.round(lower * 100) / 100;
                      stepCellsModified++;
                    } else if (val > upper) {
                      row[col] = Math.round(upper * 100) / 100;
                      stepCellsModified++;
                    }
                  }
                });
              }
            }
          });
          message = `Winsorized ${stepCellsModified} outlier cell(s) at ${threshold}σ bounds.`;
          break;
        }

        case 'trim_outliers': {
          const threshold = step.params.stdDevThreshold || 3.0;
          const targetCols = step.column && step.column !== '_all_'
            ? [step.column]
            : dataset.columns.filter(c => c.type === 'number').map(c => c.name);

          const keepRows: Record<string, any>[] = [];
          const colBounds: Record<string, { lower: number; upper: number }> = {};

          targetCols.forEach(col => {
            const nums = currentData
              .map(r => r[col])
              .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
              .map(Number);
            if (nums.length >= 4) {
              const mean = calculateMean(nums);
              const variance = nums.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / nums.length;
              const stdDev = Math.sqrt(variance);
              if (stdDev > 0) {
                colBounds[col] = {
                  lower: mean - threshold * stdDev,
                  upper: mean + threshold * stdDev,
                };
              }
            }
          });

          currentData.forEach(row => {
            let isOutlier = false;
            for (const col of Object.keys(colBounds)) {
              const b = colBounds[col];
              const val = Number(row[col]);
              if (!isNaN(val) && (val < b.lower || val > b.upper)) {
                isOutlier = true;
                break;
              }
            }
            if (!isOutlier) {
              keepRows.push(row);
            }
          });

          stepRowsAffected = currentData.length - keepRows.length;
          currentData = keepRows;
          message = `Trimmed ${stepRowsAffected} outlier row(s).`;
          break;
        }

        case 'drop_missing': {
          const targetCols = step.column && step.column !== '_all_'
            ? [step.column]
            : dataset.columns.map(c => c.name);

          const filtered = currentData.filter(row => {
            return targetCols.every(col => {
              const val = row[col];
              return val !== null && val !== undefined && val !== '';
            });
          });

          stepRowsAffected = currentData.length - filtered.length;
          currentData = filtered;
          message = `Dropped ${stepRowsAffected} row(s) containing missing cells.`;
          break;
        }

        case 'anonymize_pii': {
          const userStrategy = step.params.piiStrategy || 'mask';
          const maskingStrat: MaskingStrategy = userStrategy === 'hash' 
            ? 'sha256_hash' 
            : userStrategy === 'redact' 
              ? 'full_redaction' 
              : 'partial_mask';

          const piiReport = scanDatasetForPii({ ...dataset, data: currentData });

          if (step.column && step.column !== '_all_') {
            const det = piiReport.detections.find(d => d.column === step.column);
            const piiType = det ? det.type : 'name';
            const res = maskColumnData({ ...dataset, data: currentData }, step.column, piiType, maskingStrat);
            currentData = res.updatedDataset.data;
            stepCellsModified = res.rowsMasked;
            message = `Anonymized PII in column '${step.column}'.`;
          } else {
            const res = maskAllDetections({ ...dataset, data: currentData }, piiReport.detections, maskingStrat);
            currentData = res.updatedDataset.data;
            stepCellsModified = res.totalMasked;
            message = `Anonymized ${piiReport.detections.length} PII column(s).`;
          }
          break;
        }

        case 'enforce_contracts': {
          const rules = loadDatasetContracts(dataset);
          const report = evaluateDatasetContracts({ ...dataset, data: currentData }, rules);
          const failingIndices: number[] = [];
          report.results.forEach(res => {
            res.violations.forEach(v => failingIndices.push(v.rowIndex));
          });

          const uniqueIndices = new Set(failingIndices);
          const kept = currentData.filter((_, idx) => !uniqueIndices.has(idx));
          stepRowsAffected = currentData.length - kept.length;
          currentData = kept;
          message = `Enforced data contracts; purged ${stepRowsAffected} non-compliant row(s).`;
          break;
        }
      }
    } catch (err: any) {
      success = false;
      message = `Step failed: ${err?.message || 'Unknown error'}`;
    }

    totalCellsModified += stepCellsModified;
    stepResults.push({
      stepId: step.id,
      action: step.action,
      name: step.name,
      success,
      rowsAffected: stepRowsAffected,
      cellsModified: stepCellsModified,
      message,
    });
  }

  const baseUpdated: Dataset = {
    ...dataset,
    data: currentData,
    updatedAt: new Date().toISOString(),
  };

  const finalRowCount = currentData.length;
  const rowsDelta = initialRowCount - finalRowCount;

  const recipeSummary = `Recipe Execution: '${recipe.name}' applied ${activeSteps.length} step(s). Initial rows: ${initialRowCount}, Final rows: ${finalRowCount}, Delta: -${rowsDelta}, Cells modified: ${totalCellsModified}.`;

  const { updatedDataset } = createDatasetSnapshot(baseUpdated, {
    name: `Recipe: ${recipe.name}`,
    description: recipeSummary,
    tag: 'cleaned',
    createdBy: 'Recipe Pipeline Engine',
  });

  const executionReport: RecipeExecutionReport = {
    recipeId: recipe.id,
    recipeName: recipe.name,
    totalSteps: recipe.steps.length,
    executedSteps: activeSteps.length,
    initialRowCount,
    finalRowCount,
    rowsModified: rowsDelta,
    cellsModified: totalCellsModified,
    stepResults,
    timestamp: new Date().toISOString(),
  };

  return {
    updatedDataset,
    report: executionReport,
  };
}
