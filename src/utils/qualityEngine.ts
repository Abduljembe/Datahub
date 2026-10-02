import { ColumnMeta, ColumnDataType } from '../types';
import { parseNumber, round } from './statistics';

export interface DataQualityIssue {
  id: string;
  category: 'missing' | 'duplicate' | 'type_inconsistency' | 'whitespace_casing';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedCount: number;
  affectedPercentage: number;
  columnName?: string;
  suggestedFix: string;
  fixActionType: 
    | 'deduplicate' 
    | 'drop_null_rows' 
    | 'impute_col' 
    | 'impute_all_numeric' 
    | 'impute_all_categorical' 
    | 'cast_col_type' 
    | 'clean_currency' 
    | 'trim_whitespace' 
    | 'standardize_sentinels'
    | 'autofix_all';
  fixPayload?: any;
}

export interface ColumnQualityReport {
  columnName: string;
  detectedType: ColumnDataType;
  inferredSuggestedType?: ColumnDataType;
  totalCount: number;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  hasWhitespaceIssues: boolean;
  hasMixedTypes: boolean;
  hasCurrencyOrNumbersInString: boolean;
  hasDateStrings: boolean;
  hasBooleanStrings: boolean;
  typeInconsistencyCount: number;
  sampleIssues: string[];
}

export interface DataQualityReport {
  score: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  gradeColor: string;
  completenessScore: number;
  uniquenessScore: number;
  consistencyScore: number;
  rowCount: number;
  colCount: number;
  duplicateRowCount: number;
  duplicatePercentage: number;
  totalMissingCells: number;
  totalCells: number;
  missingPercentage: number;
  incompleteRowCount: number;
  incompleteRowPercentage: number;
  typeInconsistencyCount: number;
  issues: DataQualityIssue[];
  columnReports: ColumnQualityReport[];
}

const SENTINEL_NULL_STRINGS = new Set([
  'null', 'NULL', 'Null',
  'n/a', 'N/A', 'NA', 'na',
  'nan', 'NaN', 'NAN',
  'undefined', 'UNDEFINED',
  '-', '--', '---', '?', '??',
  'none', 'NONE', 'None',
  '#n/a', '#N/A', '#value!', '#VALUE!', '#ref!', '#REF!'
]);

export function isValueEmptyOrSentinel(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '') return true;
    if (SENTINEL_NULL_STRINGS.has(trimmed)) return true;
  }
  return false;
}

export function cleanCurrencyString(val: string): number | null {
  if (!val) return null;
  // Remove currency symbols, commas, spaces
  const cleaned = val.replace(/[$€£¥₹,\s%]/g, '');
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

export function isDateString(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 5 || trimmed.length > 35) return false;
  // Check for common date separators
  if (!trimmed.includes('-') && !trimmed.includes('/') && !trimmed.includes('T')) return false;
  const parsed = Date.parse(trimmed);
  return !isNaN(parsed) && isNaN(Number(trimmed));
}

export function isBooleanString(val: string): boolean {
  if (typeof val === 'boolean') return true;
  if (typeof val !== 'string') return false;
  const lower = val.trim().toLowerCase();
  return ['true', 'false', 'yes', 'no', 't', 'f', 'y', 'n', '1', '0'].includes(lower);
}

/**
 * Comprehensive Data Quality Diagnoser
 */
export function analyzeDataQuality(
  data: Record<string, any>[],
  columns: ColumnMeta[]
): DataQualityReport {
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    return {
      score: 100,
      grade: 'A+',
      gradeColor: 'text-emerald-400',
      completenessScore: 100,
      uniquenessScore: 100,
      consistencyScore: 100,
      rowCount: 0,
      colCount: 0,
      duplicateRowCount: 0,
      duplicatePercentage: 0,
      totalMissingCells: 0,
      totalCells: 0,
      missingPercentage: 0,
      incompleteRowCount: 0,
      incompleteRowPercentage: 0,
      typeInconsistencyCount: 0,
      issues: [],
      columnReports: []
    };
  }

  const rowCount = data.length;
  const colCount = columns.length;
  const totalCells = rowCount * colCount;

  // 1. DUPLICATE ROWS DETECTION
  const seenRows = new Map<string, number>();
  let duplicateRowCount = 0;

  data.forEach(row => {
    const key = JSON.stringify(row);
    const count = seenRows.get(key) || 0;
    if (count >= 1) {
      duplicateRowCount++;
    }
    seenRows.set(key, count + 1);
  });

  const duplicatePercentage = round((duplicateRowCount / rowCount) * 100, 1);

  // 2. MISSING VALUES & COLUMN CONSISTENCY ANALYSIS
  let totalMissingCells = 0;
  let incompleteRowCount = 0;
  let totalTypeInconsistencies = 0;

  data.forEach(row => {
    let rowHasMissing = false;
    columns.forEach(col => {
      const val = row[col.name];
      if (isValueEmptyOrSentinel(val)) {
        totalMissingCells++;
        rowHasMissing = true;
      }
    });
    if (rowHasMissing) incompleteRowCount++;
  });

  const missingPercentage = totalCells > 0 ? round((totalMissingCells / totalCells) * 100, 1) : 0;
  const incompleteRowPercentage = round((incompleteRowCount / rowCount) * 100, 1);

  const columnReports: ColumnQualityReport[] = [];
  const issues: DataQualityIssue[] = [];

  // Inspect each column in depth
  columns.forEach(col => {
    const vals = data.map(r => r[col.name]);
    let nullCount = 0;
    let currencyOrNumCount = 0;
    let dateStrCount = 0;
    let boolStrCount = 0;
    let whitespaceCount = 0;
    let nonNumericInNumCol = 0;
    const nonNullVals: any[] = [];
    const sampleIssues: string[] = [];

    vals.forEach(v => {
      if (isValueEmptyOrSentinel(v)) {
        nullCount++;
      } else {
        nonNullVals.push(v);
        if (typeof v === 'string') {
          if (v !== v.trim() || /\s{2,}/.test(v)) {
            whitespaceCount++;
          }
          if (col.type === 'string' || col.type === 'category') {
            const cleanNum = cleanCurrencyString(v);
            if (cleanNum !== null && !isNaN(cleanNum) && /[0-9]/.test(v)) {
              currencyOrNumCount++;
            }
            if (isDateString(v)) {
              dateStrCount++;
            }
            if (isBooleanString(v)) {
              boolStrCount++;
            }
          }
        }
        if (col.type === 'number') {
          const parsed = parseNumber(v);
          if (parsed === null) {
            nonNumericInNumCol++;
          }
        }
      }
    });

    const uniqueCount = new Set(nonNullVals).size;
    const nullPct = round((nullCount / rowCount) * 100, 1);
    const nonNullLen = nonNullVals.length;

    let inferredSuggestedType: ColumnDataType | undefined = undefined;
    if (col.type === 'string' || col.type === 'category') {
      if (nonNullLen > 0 && currencyOrNumCount / nonNullLen >= 0.8) {
        inferredSuggestedType = 'number';
      } else if (nonNullLen > 0 && dateStrCount / nonNullLen >= 0.8) {
        inferredSuggestedType = 'date';
      } else if (nonNullLen > 0 && boolStrCount / nonNullLen >= 0.9) {
        inferredSuggestedType = 'boolean';
      }
    }

    const typeInconsistencyCount = (col.type === 'number' ? nonNumericInNumCol : 0) + 
      (inferredSuggestedType ? (col.type === 'string' ? currencyOrNumCount : 0) : 0);

    totalTypeInconsistencies += typeInconsistencyCount;

    if (nullCount > 0) {
      sampleIssues.push(`${nullCount} missing / sentinel values (${nullPct}%)`);
    }
    if (inferredSuggestedType && inferredSuggestedType !== col.type) {
      sampleIssues.push(`Stored as ${col.type}, but contains mostly ${inferredSuggestedType} values`);
    }
    if (nonNumericInNumCol > 0) {
      sampleIssues.push(`${nonNumericInNumCol} non-numeric string values in numeric column`);
    }
    if (whitespaceCount > 0) {
      sampleIssues.push(`${whitespaceCount} entries with untrimmed whitespace`);
    }

    columnReports.push({
      columnName: col.name,
      detectedType: col.type,
      inferredSuggestedType,
      totalCount: rowCount,
      nullCount,
      nullPercentage: nullPct,
      uniqueCount,
      hasWhitespaceIssues: whitespaceCount > 0,
      hasMixedTypes: nonNumericInNumCol > 0,
      hasCurrencyOrNumbersInString: currencyOrNumCount > 0,
      hasDateStrings: dateStrCount > 0,
      hasBooleanStrings: boolStrCount > 0,
      typeInconsistencyCount,
      sampleIssues,
    });

    // Generate Issue for Column Missing Values
    if (nullPct >= 5) {
      issues.push({
        id: `issue_missing_${col.name}`,
        category: 'missing',
        severity: nullPct >= 20 ? 'high' : 'medium',
        title: `Missing values in "${col.name}"`,
        description: `${nullCount.toLocaleString()} out of ${rowCount.toLocaleString()} rows (${nullPct}%) have missing or empty values.`,
        affectedCount: nullCount,
        affectedPercentage: nullPct,
        columnName: col.name,
        suggestedFix: col.type === 'number' ? 'Impute with column median / mean' : 'Impute with mode / default value',
        fixActionType: 'impute_col',
        fixPayload: {
          column: col.name,
          strategy: col.type === 'number' ? 'median' : 'mode'
        }
      });
    }

    // Generate Issue for Type Inconsistencies
    if (inferredSuggestedType && inferredSuggestedType !== col.type) {
      issues.push({
        id: `issue_type_${col.name}`,
        category: 'type_inconsistency',
        severity: 'medium',
        title: `Type Mismatch in "${col.name}"`,
        description: `Column is defined as ${col.type}, but ${round((currencyOrNumCount / (nonNullLen || 1)) * 100, 0)}% of values are valid ${inferredSuggestedType}s.`,
        affectedCount: currencyOrNumCount || dateStrCount || boolStrCount,
        affectedPercentage: round(((currencyOrNumCount || dateStrCount || boolStrCount) / (rowCount || 1)) * 100, 1),
        columnName: col.name,
        suggestedFix: `Convert column type to "${inferredSuggestedType}" and clean formatting`,
        fixActionType: 'cast_col_type',
        fixPayload: {
          column: col.name,
          targetType: inferredSuggestedType
        }
      });
    }

    // Generate Issue for Non-numeric in number column
    if (nonNumericInNumCol > 0) {
      issues.push({
        id: `issue_non_numeric_${col.name}`,
        category: 'type_inconsistency',
        severity: 'high',
        title: `Invalid entries in numeric column "${col.name}"`,
        description: `${nonNumericInNumCol} rows contain string text in a numeric column, preventing numerical computation.`,
        affectedCount: nonNumericInNumCol,
        affectedPercentage: round((nonNumericInNumCol / rowCount) * 100, 1),
        columnName: col.name,
        suggestedFix: `Coerce invalid text to null & impute median`,
        fixActionType: 'impute_col',
        fixPayload: {
          column: col.name,
          strategy: 'median'
        }
      });
    }

    // Generate Issue for Whitespace
    if (whitespaceCount > Math.max(3, rowCount * 0.05)) {
      issues.push({
        id: `issue_whitespace_${col.name}`,
        category: 'whitespace_casing',
        severity: 'low',
        title: `Untrimmed whitespace in "${col.name}"`,
        description: `${whitespaceCount} values contain leading, trailing, or double whitespace that can cause false categorical splits.`,
        affectedCount: whitespaceCount,
        affectedPercentage: round((whitespaceCount / rowCount) * 100, 1),
        columnName: col.name,
        suggestedFix: `Trim leading & trailing whitespace`,
        fixActionType: 'trim_whitespace',
        fixPayload: {
          column: col.name
        }
      });
    }
  });

  // Generate Issue for Duplicate Rows
  if (duplicateRowCount > 0) {
    issues.push({
      id: 'issue_duplicates_dataset',
      category: 'duplicate',
      severity: duplicatePercentage >= 5 ? 'high' : 'medium',
      title: `${duplicateRowCount.toLocaleString()} Duplicate Rows Detected`,
      description: `${duplicateRowCount} identical row records (${duplicatePercentage}%) exist in the dataset, which may bias statistical estimations.`,
      affectedCount: duplicateRowCount,
      affectedPercentage: duplicatePercentage,
      suggestedFix: 'Remove duplicate rows and preserve unique occurrences',
      fixActionType: 'deduplicate',
    });
  }

  // 3. COMPUTE HEALTH SCORES
  // Completeness (0-100): 100 - missing percentage
  const completenessScore = Math.max(0, round(100 - missingPercentage * 2, 1));
  
  // Uniqueness (0-100): 100 - duplicate percentage
  const uniquenessScore = Math.max(0, round(100 - duplicatePercentage * 2.5, 1));

  // Consistency (0-100): 100 - type inconsistency penalty
  const consistencyPenalty = Math.min(100, (totalTypeInconsistencies / (totalCells || 1)) * 500);
  const consistencyScore = Math.max(0, round(100 - consistencyPenalty, 1));

  // Weighted Overall Quality Score
  const score = round(
    completenessScore * 0.4 + uniquenessScore * 0.3 + consistencyScore * 0.3,
    1
  );

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'A+';
  let gradeColor = 'text-emerald-400';

  if (score >= 95) {
    grade = 'A+';
    gradeColor = 'text-emerald-400';
  } else if (score >= 85) {
    grade = 'A';
    gradeColor = 'text-teal-400';
  } else if (score >= 70) {
    grade = 'B';
    gradeColor = 'text-cyan-400';
  } else if (score >= 50) {
    grade = 'C';
    gradeColor = 'text-amber-400';
  } else {
    grade = 'D';
    gradeColor = 'text-rose-400';
  }

  return {
    score,
    grade,
    gradeColor,
    completenessScore,
    uniquenessScore,
    consistencyScore,
    rowCount,
    colCount,
    duplicateRowCount,
    duplicatePercentage,
    totalMissingCells,
    totalCells,
    missingPercentage,
    incompleteRowCount,
    incompleteRowPercentage,
    typeInconsistencyCount: totalTypeInconsistencies,
    issues: issues.sort((a, b) => {
      const sevMap = { high: 3, medium: 2, low: 1 };
      return sevMap[b.severity] - sevMap[a.severity];
    }),
    columnReports,
  };
}

/**
 * Execute automated cleanup transformations based on issue payload or master auto-fix
 */
export function executeQualityCleanup(
  data: Record<string, any>[],
  columns: ColumnMeta[],
  actionType: DataQualityIssue['fixActionType'],
  payload?: any
): { cleanedData: Record<string, any>[]; updatedColumns: ColumnMeta[]; message: string } {
  let working = [...data];
  let cols = [...columns];

  if (actionType === 'autofix_all') {
    const initialRows = working.length;
    
    // 1. Deduplicate
    const seen = new Set<string>();
    const deduped: Record<string, any>[] = [];
    working.forEach(r => {
      const key = JSON.stringify(r);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(r);
      }
    });
    const dupsRemoved = initialRows - deduped.length;
    working = deduped;

    // 2. Standardize sentinels & trim whitespace & auto-cast numbers
    const updatedCols = cols.map(col => {
      // Check if column can be upgraded to number
      const vals = working.map(r => r[col.name]).filter(v => !isValueEmptyOrSentinel(v));
      const numValidCount = vals.filter(v => {
        if (typeof v === 'number') return true;
        if (typeof v === 'string') {
          const clean = cleanCurrencyString(v);
          return clean !== null && !isNaN(clean);
        }
        return false;
      }).length;

      const shouldBeNumber = vals.length > 0 && numValidCount / vals.length >= 0.85;
      if (shouldBeNumber && col.type !== 'number') {
        return { ...col, type: 'number' as ColumnDataType };
      }
      return col;
    });

    cols = updatedCols;

    // 3. Clean row values
    working = working.map(row => {
      const newRow: Record<string, any> = {};
      cols.forEach(col => {
        const v = row[col.name];
        if (isValueEmptyOrSentinel(v)) {
          newRow[col.name] = null;
        } else if (col.type === 'number') {
          const num = typeof v === 'number' ? v : cleanCurrencyString(String(v));
          newRow[col.name] = num !== null ? num : null;
        } else if (typeof v === 'string') {
          newRow[col.name] = v.trim();
        } else {
          newRow[col.name] = v;
        }
      });
      return newRow;
    });

    // 4. Impute missing values per column
    cols.forEach(col => {
      const nonNulls = working.map(r => r[col.name]).filter(v => v !== null && v !== undefined && v !== '');
      if (nonNulls.length > 0 && nonNulls.length < working.length) {
        if (col.type === 'number') {
          const nums = nonNulls.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
          const median = nums.length > 0 ? nums[Math.floor(nums.length / 2)] : 0;
          working = working.map(r => {
            if (r[col.name] === null || r[col.name] === undefined || r[col.name] === '') {
              return { ...r, [col.name]: median };
            }
            return r;
          });
        } else {
          const freq: Record<string, number> = {};
          nonNulls.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
          const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
          working = working.map(r => {
            if (r[col.name] === null || r[col.name] === undefined || r[col.name] === '') {
              return { ...r, [col.name]: mode };
            }
            return r;
          });
        }
      }
    });

    return {
      cleanedData: working,
      updatedColumns: cols,
      message: `✨ Auto-Fix Applied: Removed ${dupsRemoved} duplicates, standardized data types, and imputed all missing values.`
    };
  }

  if (actionType === 'deduplicate') {
    const initialRows = working.length;
    const seen = new Set<string>();
    working = working.filter(r => {
      const key = JSON.stringify(r);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      cleanedData: working,
      updatedColumns: cols,
      message: `🧹 Removed ${initialRows - working.length} duplicate rows.`
    };
  }

  if (actionType === 'drop_null_rows') {
    const initialRows = working.length;
    working = working.filter(row => {
      return Object.values(row).every(v => !isValueEmptyOrSentinel(v));
    });
    return {
      cleanedData: working,
      updatedColumns: cols,
      message: `🩹 Dropped ${initialRows - working.length} rows with missing values.`
    };
  }

  if (actionType === 'impute_col' && payload?.column) {
    const colName = payload.column;
    const colMeta = cols.find(c => c.name === colName);
    const nonNulls = working.map(r => r[colName]).filter(v => !isValueEmptyOrSentinel(v));
    
    let replacement: any = 0;
    if (colMeta?.type === 'number') {
      const nums = nonNulls.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      replacement = nums.length > 0 ? nums[Math.floor(nums.length / 2)] : 0;
    } else {
      const freq: Record<string, number> = {};
      nonNulls.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
      replacement = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    }

    let count = 0;
    working = working.map(r => {
      if (isValueEmptyOrSentinel(r[colName])) {
        count++;
        return { ...r, [colName]: replacement };
      }
      return r;
    });

    return {
      cleanedData: working,
      updatedColumns: cols,
      message: `🪄 Imputed ${count} missing values in "${colName}" with ${replacement}.`
    };
  }

  if (actionType === 'cast_col_type' && payload?.column && payload?.targetType) {
    const { column: colName, targetType } = payload;
    cols = cols.map(c => c.name === colName ? { ...c, type: targetType } : c);

    if (targetType === 'number') {
      working = working.map(r => {
        const v = r[colName];
        if (isValueEmptyOrSentinel(v)) return { ...r, [colName]: null };
        const num = typeof v === 'number' ? v : cleanCurrencyString(String(v));
        return { ...r, [colName]: num };
      });
    } else if (targetType === 'boolean') {
      working = working.map(r => {
        const v = r[colName];
        if (isValueEmptyOrSentinel(v)) return { ...r, [colName]: null };
        const lower = String(v).trim().toLowerCase();
        const bool = ['true', 'yes', 't', 'y', '1'].includes(lower);
        return { ...r, [colName]: bool };
      });
    }

    return {
      cleanedData: working,
      updatedColumns: cols,
      message: `🔄 Cast column "${colName}" to ${targetType}.`
    };
  }

  if (actionType === 'trim_whitespace' && payload?.column) {
    const colName = payload.column;
    working = working.map(r => {
      const v = r[colName];
      if (typeof v === 'string') {
        return { ...r, [colName]: v.trim() };
      }
      return r;
    });
    return {
      cleanedData: working,
      updatedColumns: cols,
      message: `🔤 Trimmed whitespace in "${colName}".`
    };
  }

  return {
    cleanedData: working,
    updatedColumns: cols,
    message: 'Cleanup operation completed.'
  };
}
