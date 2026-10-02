import { Dataset, ColumnMeta } from '../types';
import { createDatasetSnapshot } from './versionEngine';

export type RuleType = 
  | 'not_null' 
  | 'unique' 
  | 'min_value' 
  | 'max_value' 
  | 'range' 
  | 'allowed_values' 
  | 'regex_match' 
  | 'string_length';

export type RuleSeverity = 'error' | 'warning';

export interface ValidationRule {
  id: string;
  column: string;
  name: string;
  type: RuleType;
  severity: RuleSeverity;
  enabled: boolean;
  params: {
    minValue?: number;
    maxValue?: number;
    allowedValues?: string[];
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  description?: string;
}

export interface RuleViolation {
  rowIndex: number;
  column: string;
  value: any;
  reason: string;
  rowSnapshot: Record<string, any>;
}

export interface RuleEvaluationResult {
  rule: ValidationRule;
  passed: boolean;
  passCount: number;
  failCount: number;
  passPercentage: number;
  violations: RuleViolation[];
}

export interface ContractEvaluationReport {
  datasetId: string;
  totalRules: number;
  passingRulesCount: number;
  failingRulesCount: number;
  overallPassRate: number;
  evaluatedRows: number;
  results: RuleEvaluationResult[];
  status: 'compliant' | 'warning' | 'violation';
}

const STORAGE_PREFIX = 'remix_contracts_';

/**
 * Loads rules for a dataset, with fallback to default rules
 */
export function loadDatasetContracts(dataset: Dataset): ValidationRule[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dataset.id}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load validation rules from localStorage:', e);
  }
  return generateRecommendedContracts(dataset);
}

/**
 * Saves rules for a dataset
 */
export function saveDatasetContracts(datasetId: string, rules: ValidationRule[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${datasetId}`, JSON.stringify(rules));
  } catch (e) {
    console.error('Failed to save validation rules to localStorage:', e);
  }
}

/**
 * Generates recommended validation rules based on column metadata & data distribution
 */
export function generateRecommendedContracts(dataset: Dataset): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const data = dataset.data || [];
  const columns = dataset.columns || [];

  columns.forEach((col) => {
    // 1. Not-null rule if current data has >= 95% non-null values
    const nonNullCount = data.filter(r => r[col.name] !== null && r[col.name] !== undefined && r[col.name] !== '').length;
    if (data.length > 0 && nonNullCount / data.length >= 0.95) {
      rules.push({
        id: `rule_nn_${col.name}`,
        column: col.name,
        name: `${col.name} Not Null`,
        type: 'not_null',
        severity: 'error',
        enabled: true,
        params: {},
        description: `Values in '${col.name}' must not be null or empty.`,
      });
    }

    // 2. Uniqueness rule for ID or primary-key-like columns
    const colLower = col.name.toLowerCase();
    if (colLower.endsWith('_id') || colLower === 'id' || colLower === 'key' || colLower === 'uuid') {
      rules.push({
        id: `rule_uniq_${col.name}`,
        column: col.name,
        name: `${col.name} Unique Identifier`,
        type: 'unique',
        severity: 'error',
        enabled: true,
        params: {},
        description: `Each '${col.name}' must be completely unique across all records.`,
      });
    }

    // 3. Number range contract
    if (col.type === 'number') {
      const nums = data
        .map(r => r[col.name])
        .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
        .map(v => Number(v));

      if (nums.length > 0) {
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        
        // If non-negative metric (e.g. age, price, count)
        if (min >= 0 && (colLower.includes('age') || colLower.includes('price') || colLower.includes('count') || colLower.includes('qty'))) {
          rules.push({
            id: `rule_min_${col.name}`,
            column: col.name,
            name: `${col.name} Non-Negative`,
            type: 'min_value',
            severity: 'error',
            enabled: true,
            params: { minValue: 0 },
            description: `'${col.name}' cannot be negative (>= 0).`,
          });
        } else {
          // Broad reasonable bounds: 20% margin
          const lowerBound = Math.floor(min >= 0 ? min * 0.5 : min * 1.5);
          const upperBound = Math.ceil(max >= 0 ? max * 1.5 : max * 0.5);
          rules.push({
            id: `rule_range_${col.name}`,
            column: col.name,
            name: `${col.name} In Expected Range`,
            type: 'range',
            severity: 'warning',
            enabled: false, // optional by default
            params: { minValue: lowerBound, maxValue: upperBound },
            description: `'${col.name}' should stay between ${lowerBound} and ${upperBound}.`,
          });
        }
      }
    }

    // 4. Categorical / allowed values whitelist
    if (col.type === 'category' || col.type === 'string') {
      const distinct = Array.from(
        new Set(
          data
            .map(r => r[col.name])
            .filter(v => v !== null && v !== undefined && v !== '')
            .map(v => String(v).trim())
        )
      );

      if (distinct.length >= 2 && distinct.length <= 8) {
        rules.push({
          id: `rule_allowed_${col.name}`,
          column: col.name,
          name: `${col.name} Allowed Whitelist`,
          type: 'allowed_values',
          severity: 'warning',
          enabled: true,
          params: { allowedValues: distinct },
          description: `'${col.name}' must belong to allowed categories: ${distinct.join(', ')}.`,
        });
      }
    }
  });

  return rules;
}

/**
 * Evaluates all active rules against dataset rows
 */
export function evaluateDatasetContracts(dataset: Dataset, rules: ValidationRule[]): ContractEvaluationReport {
  const activeRules = rules.filter(r => r.enabled);
  const data = dataset.data || [];
  const evaluatedRows = data.length;

  const results: RuleEvaluationResult[] = activeRules.map((rule) => {
    const violations: RuleViolation[] = [];
    const col = rule.column;

    if (rule.type === 'unique') {
      const seen = new Map<string, number[]>();
      data.forEach((row, idx) => {
        const raw = row[col];
        if (raw !== null && raw !== undefined && raw !== '') {
          const key = String(raw).trim();
          if (!seen.has(key)) seen.set(key, []);
          seen.get(key)!.push(idx);
        }
      });

      seen.forEach((indices, key) => {
        if (indices.length > 1) {
          indices.forEach(idx => {
            violations.push({
              rowIndex: idx,
              column: col,
              value: key,
              reason: `Duplicate value '${key}' appears ${indices.length} times`,
              rowSnapshot: data[idx],
            });
          });
        }
      });
    } else {
      data.forEach((row, idx) => {
        const val = row[col];
        const isNullOrEmpty = val === null || val === undefined || val === '';

        if (rule.type === 'not_null') {
          if (isNullOrEmpty) {
            violations.push({
              rowIndex: idx,
              column: col,
              value: null,
              reason: `Value is null or missing in required column`,
              rowSnapshot: row,
            });
          }
        } else if (!isNullOrEmpty) {
          // Check value-specific conditions
          if (rule.type === 'min_value' && rule.params.minValue !== undefined) {
            const num = Number(val);
            if (isNaN(num) || num < rule.params.minValue) {
              violations.push({
                rowIndex: idx,
                column: col,
                value: val,
                reason: `Value ${val} is below minimum allowed ${rule.params.minValue}`,
                rowSnapshot: row,
              });
            }
          } else if (rule.type === 'max_value' && rule.params.maxValue !== undefined) {
            const num = Number(val);
            if (isNaN(num) || num > rule.params.maxValue) {
              violations.push({
                rowIndex: idx,
                column: col,
                value: val,
                reason: `Value ${val} exceeds maximum allowed ${rule.params.maxValue}`,
                rowSnapshot: row,
              });
            }
          } else if (rule.type === 'range') {
            const num = Number(val);
            const min = rule.params.minValue ?? -Infinity;
            const max = rule.params.maxValue ?? Infinity;
            if (isNaN(num) || num < min || num > max) {
              violations.push({
                rowIndex: idx,
                column: col,
                value: val,
                reason: `Value ${val} is outside expected range [${min}, ${max}]`,
                rowSnapshot: row,
              });
            }
          } else if (rule.type === 'allowed_values' && rule.params.allowedValues) {
            const strVal = String(val).trim();
            if (!rule.params.allowedValues.includes(strVal)) {
              violations.push({
                rowIndex: idx,
                column: col,
                value: val,
                reason: `'${strVal}' is not in allowed list [${rule.params.allowedValues.join(', ')}]`,
                rowSnapshot: row,
              });
            }
          } else if (rule.type === 'regex_match' && rule.params.pattern) {
            try {
              const regex = new RegExp(rule.params.pattern);
              if (!regex.test(String(val))) {
                violations.push({
                  rowIndex: idx,
                  column: col,
                  value: val,
                  reason: `'${val}' failed regex pattern /${rule.params.pattern}/`,
                  rowSnapshot: row,
                });
              }
            } catch (err) {
              // Invalid regex pattern
            }
          } else if (rule.type === 'string_length') {
            const len = String(val).length;
            const min = rule.params.minLength ?? 0;
            const max = rule.params.maxLength ?? Infinity;
            if (len < min || len > max) {
              violations.push({
                rowIndex: idx,
                column: col,
                value: val,
                reason: `Length ${len} is outside allowed [${min}, ${max}]`,
                rowSnapshot: row,
              });
            }
          }
        }
      });
    }

    const failCount = violations.length;
    const passCount = Math.max(0, evaluatedRows - failCount);
    const passPercentage = evaluatedRows > 0 ? Math.round((passCount / evaluatedRows) * 100) : 100;

    return {
      rule,
      passed: failCount === 0,
      passCount,
      failCount,
      passPercentage,
      violations,
    };
  });

  const passingRulesCount = results.filter(r => r.passed).length;
  const failingRulesCount = results.filter(r => !r.passed).length;
  const overallPassRate = activeRules.length > 0 
    ? Math.round((passingRulesCount / activeRules.length) * 100) 
    : 100;

  const hasCriticalFail = results.some(r => !r.passed && r.rule.severity === 'error');
  const status = hasCriticalFail 
    ? 'violation' 
    : failingRulesCount > 0 
    ? 'warning' 
    : 'compliant';

  return {
    datasetId: dataset.id,
    totalRules: activeRules.length,
    passingRulesCount,
    failingRulesCount,
    overallPassRate,
    evaluatedRows,
    results,
    status,
  };
}

/**
 * Removes all rows violating a specific rule or all failing rules, creating a snapshot
 */
export function purgeViolatingRows(
  dataset: Dataset,
  violatingRowIndices: number[],
  actionLabel: string
): { updatedDataset: Dataset; removedCount: number } {
  const indexSet = new Set(violatingRowIndices);
  const newData = dataset.data.filter((_, idx) => !indexSet.has(idx));
  const removedCount = dataset.data.length - newData.length;

  const baseUpdated: Dataset = {
    ...dataset,
    data: newData,
    updatedAt: new Date().toISOString(),
  };

  const description = `Contract Remediation: Purged ${removedCount} row(s) violating ${actionLabel}.`;
  const { updatedDataset } = createDatasetSnapshot(baseUpdated, {
    name: `Contract Clean (${actionLabel})`,
    description,
    tag: 'filtered',
    createdBy: 'Data Contracts Engine',
  });

  return {
    updatedDataset,
    removedCount,
  };
}
