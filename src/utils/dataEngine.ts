import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnDataType, ColumnMeta, Dataset, PivotConfig, PivotTableData, AggregationFunction } from '../types';
import { parseNumber, round } from './statistics';

/**
 * Infer data types from values
 */
export function inferColumnType(values: any[]): ColumnDataType {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'string';

  let numCount = 0;
  let boolCount = 0;
  let dateCount = 0;
  const uniqueVals = new Set(nonNull);

  for (const v of nonNull) {
    if (typeof v === 'boolean' || v === 'true' || v === 'false' || v === 'TRUE' || v === 'FALSE') {
      boolCount++;
    } else if (typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')) {
      numCount++;
    } else if (typeof v === 'string' && !isNaN(Date.parse(v)) && (v.includes('-') || v.includes('/') || v.includes('T')) && v.length > 5) {
      dateCount++;
    }
  }

  const threshold = nonNull.length * 0.75;
  if (boolCount >= threshold) return 'boolean';
  if (numCount >= threshold) return 'number';
  if (dateCount >= threshold) return 'date';
  if (uniqueVals.size < Math.min(15, nonNull.length * 0.25)) return 'category';
  return 'string';
}

/**
 * Auto-detect and generate schema metadata from raw records
 */
export function generateColumnsFromData(data: Record<string, any>[]): ColumnMeta[] {
  if (!data || data.length === 0) return [];
  const keys = Array.from(new Set(data.flatMap(row => Object.keys(row))));

  return keys.map(key => {
    const values = data.map(r => r[key]);
    const inferredType = inferColumnType(values);
    const uniqueCount = new Set(values.filter(v => v !== null && v !== undefined && v !== '')).size;
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;

    return {
      id: key,
      name: key,
      type: inferredType,
      nullable: nullCount > 0,
      uniqueCount,
      sampleValues: values.slice(0, 3),
    };
  });
}

/**
 * Parses raw CSV string
 */
export function parseCSV(csvString: string): { data: Record<string, any>[]; columns: ColumnMeta[] } {
  const result = Papa.parse<Record<string, any>>(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  const rawData = result.data.filter(row => row && Object.keys(row).length > 0);
  const columns = generateColumnsFromData(rawData);
  return { data: rawData, columns };
}

/**
 * Parses Excel file buffer or base64
 */
export function parseExcel(data: ArrayBuffer): { sheets: Record<string, { data: Record<string, any>[]; columns: ColumnMeta[] }> } {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheets: Record<string, { data: Record<string, any>[]; columns: ColumnMeta[] }> = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
    if (rawData.length > 0) {
      sheets[sheetName] = {
        data: rawData,
        columns: generateColumnsFromData(rawData),
      };
    }
  }

  return { sheets };
}

/**
 * Parses JSON string or nested JSON
 */
export function parseJSON(jsonString: string): { data: Record<string, any>[]; columns: ColumnMeta[] } {
  let parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) {
    if (parsed.data && Array.isArray(parsed.data)) {
      parsed = parsed.data;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      parsed = parsed.items;
    } else if (parsed.results && Array.isArray(parsed.results)) {
      parsed = parsed.results;
    } else {
      parsed = [parsed];
    }
  }

  // Flatten single-level nested objects if necessary
  const flattenedData = parsed.map((item: any) => {
    const flat: Record<string, any> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        for (const [subK, subV] of Object.entries(v as object)) {
          flat[`${k}_${subK}`] = subV;
        }
      } else {
        flat[k] = v;
      }
    }
    return flat;
  });

  return {
    data: flattenedData,
    columns: generateColumnsFromData(flattenedData),
  };
}

/**
 * Export helpers
 */
export function exportToCSV(dataset: Dataset, filename?: string) {
  const csv = Papa.unparse(dataset.data);
  downloadBlob(csv, `${filename || dataset.name || 'dataset'}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJSON(dataset: Dataset, filename?: string) {
  const jsonStr = JSON.stringify(dataset.data, null, 2);
  downloadBlob(jsonStr, `${filename || dataset.name || 'dataset'}.json`, 'application/json');
}

export function exportToExcel(dataset: Dataset, filename?: string) {
  const worksheet = XLSX.utils.json_to_sheet(dataset.data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, dataset.name.substring(0, 31) || 'Data');
  XLSX.writeFile(workbook, `${filename || dataset.name || 'dataset'}.xlsx`);
}

export function exportToSQL(dataset: Dataset, tableName?: string): string {
  const table = (tableName || dataset.name || 'dataset_table').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  if (dataset.data.length === 0) return `-- Empty table\nCREATE TABLE ${table} ();`;

  const cols = dataset.columns;
  const colDefs = cols.map(c => {
    let type = 'VARCHAR(255)';
    if (c.type === 'number') type = 'NUMERIC';
    if (c.type === 'boolean') type = 'BOOLEAN';
    if (c.type === 'date') type = 'TIMESTAMP';
    return `  "${c.name}" ${type}`;
  }).join(',\n');

  const createTable = `CREATE TABLE IF NOT EXISTS "${table}" (\n  "id" SERIAL PRIMARY KEY,\n${colDefs}\n);\n\n`;

  const insertStatements = dataset.data.slice(0, 1000).map(row => {
    const colNames = cols.map(c => `"${c.name}"`).join(', ');
    const values = cols.map(c => {
      const val = row[c.name];
      if (val === null || val === undefined) return 'NULL';
      if (c.type === 'number') return isNaN(Number(val)) ? 'NULL' : Number(val);
      if (c.type === 'boolean') return Boolean(val) ? 'TRUE' : 'FALSE';
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');

    return `INSERT INTO "${table}" (${colNames}) VALUES (${values});`;
  }).join('\n');

  return createTable + insertStatements;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Data Cleaning & Transformation Pipeline Operations
 */
export function applyDataCleaning(
  dataset: Dataset,
  operation: {
    type: 'drop_nulls' | 'impute' | 'remove_outliers' | 'filter' | 'sort' | 'rename_col' | 'cast_type' | 'add_calculated_col' | 'deduplicate';
    column?: string;
    params?: any;
  }
): { updatedData: Record<string, any>[]; updatedColumns: ColumnMeta[]; logDescription: string } {
  let data = [...dataset.data];
  let columns = [...dataset.columns];
  let logDescription = '';

  switch (operation.type) {
    case 'drop_nulls': {
      const col = operation.column;
      const initialCount = data.length;
      if (col) {
        data = data.filter(row => row[col] !== null && row[col] !== undefined && row[col] !== '');
        logDescription = `Dropped ${initialCount - data.length} rows with nulls in column "${col}"`;
      } else {
        data = data.filter(row => Object.values(row).every(v => v !== null && v !== undefined && v !== ''));
        logDescription = `Dropped ${initialCount - data.length} rows containing any missing value`;
      }
      break;
    }

    case 'impute': {
      const col = operation.column!;
      const strategy = operation.params?.strategy || 'mean'; // 'mean' | 'median' | 'mode' | 'constant' | 'ffill'
      const constantVal = operation.params?.constantValue;

      // Find replacement value
      let fillVal: any = 0;
      const colMeta = columns.find(c => c.name === col);
      const validVals = data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');

      if (strategy === 'constant') {
        fillVal = constantVal;
      } else if (strategy === 'ffill') {
        // Forward fill handled in loop
      } else if (colMeta?.type === 'number') {
        const numVals = validVals.map(v => parseNumber(v)).filter(v => v !== null) as number[];
        if (strategy === 'mean' && numVals.length > 0) {
          fillVal = round(numVals.reduce((a, b) => a + b, 0) / numVals.length, 2);
        } else if (strategy === 'median' && numVals.length > 0) {
          numVals.sort((a, b) => a - b);
          fillVal = numVals[Math.floor(numVals.length / 2)];
        }
      } else {
        // Mode
        const freq: Record<string, number> = {};
        for (const v of validVals) freq[String(v)] = (freq[String(v)] || 0) + 1;
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        fillVal = sorted[0]?.[0] || 'Unknown';
      }

      let lastVal = fillVal;
      let imputedCount = 0;
      data = data.map(row => {
        const val = row[col];
        if (val === null || val === undefined || val === '') {
          imputedCount++;
          return { ...row, [col]: strategy === 'ffill' ? lastVal : fillVal };
        }
        lastVal = val;
        return row;
      });

      logDescription = `Imputed ${imputedCount} missing values in "${col}" using ${strategy} (${fillVal})`;
      break;
    }

    case 'remove_outliers': {
      const col = operation.column!;
      const numVals = data.map(r => parseNumber(r[col])).filter(v => v !== null) as number[];
      if (numVals.length > 4) {
        numVals.sort((a, b) => a - b);
        const q1 = numVals[Math.floor(numVals.length * 0.25)];
        const q3 = numVals[Math.floor(numVals.length * 0.75)];
        const iqr = q3 - q1;
        const minBound = q1 - 1.5 * iqr;
        const maxBound = q3 + 1.5 * iqr;

        const initial = data.length;
        data = data.filter(row => {
          const v = parseNumber(row[col]);
          return v === null || (v >= minBound && v <= maxBound);
        });
        logDescription = `Removed ${initial - data.length} outlier rows in "${col}" outside [${round(minBound, 1)}, ${round(maxBound, 1)}]`;
      }
      break;
    }

    case 'filter': {
      const { column: filterCol, operator, value } = operation.params;
      const initial = data.length;
      data = data.filter(row => {
        const cell = row[filterCol];
        if (operator === '=') return String(cell).toLowerCase() === String(value).toLowerCase();
        if (operator === '!=') return String(cell).toLowerCase() !== String(value).toLowerCase();
        if (operator === 'contains') return String(cell).toLowerCase().includes(String(value).toLowerCase());
        const numCell = parseNumber(cell);
        const numVal = parseNumber(value);
        if (numCell !== null && numVal !== null) {
          if (operator === '>') return numCell > numVal;
          if (operator === '>=') return numCell >= numVal;
          if (operator === '<') return numCell < numVal;
          if (operator === '<=') return numCell <= numVal;
        }
        return true;
      });
      logDescription = `Filtered data where "${filterCol}" ${operator} "${value}" (${initial - data.length} rows excluded)`;
      break;
    }

    case 'sort': {
      const { column: sortCol, order } = operation.params;
      data.sort((a, b) => {
        const vA = a[sortCol];
        const vB = b[sortCol];
        const nA = parseNumber(vA);
        const nB = parseNumber(vB);
        if (nA !== null && nB !== null) {
          return order === 'asc' ? nA - nB : nB - nA;
        }
        return order === 'asc' ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
      });
      logDescription = `Sorted dataset by "${sortCol}" (${order.toUpperCase()})`;
      break;
    }

    case 'deduplicate': {
      const initial = data.length;
      const seen = new Set<string>();
      data = data.filter(row => {
        const key = JSON.stringify(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      logDescription = `Removed ${initial - data.length} duplicate rows`;
      break;
    }

    case 'rename_col': {
      const oldName = operation.column!;
      const newName = operation.params.newName;
      data = data.map(row => {
        const newRow = { ...row };
        newRow[newName] = newRow[oldName];
        delete newRow[oldName];
        return newRow;
      });
      columns = columns.map(c => (c.name === oldName ? { ...c, id: newName, name: newName } : c));
      logDescription = `Renamed column "${oldName}" to "${newName}"`;
      break;
    }

    case 'cast_type': {
      const col = operation.column!;
      const targetType: ColumnDataType = operation.params.targetType;
      data = data.map(row => {
        const val = row[col];
        let transformed = val;
        if (targetType === 'number') transformed = parseNumber(val);
        else if (targetType === 'boolean') transformed = Boolean(val);
        else if (targetType === 'string' || targetType === 'category') transformed = String(val ?? '');
        return { ...row, [col]: transformed };
      });
      columns = columns.map(c => (c.name === col ? { ...c, type: targetType } : c));
      logDescription = `Cast column "${col}" to type ${targetType}`;
      break;
    }

    case 'add_calculated_col': {
      const { newColumnName, colA, operator, colB, constant } = operation.params;
      data = data.map(row => {
        const valA = parseNumber(row[colA]) ?? 0;
        const valB = colB ? (parseNumber(row[colB]) ?? 0) : (parseNumber(constant) ?? 0);
        let res = 0;
        if (operator === '+') res = valA + valB;
        else if (operator === '-') res = valA - valB;
        else if (operator === '*') res = valA * valB;
        else if (operator === '/') res = valB !== 0 ? valA / valB : 0;
        else if (operator === '%') res = valB !== 0 ? (valA / valB) * 100 : 0;
        else if (operator === 'log') res = valA > 0 ? Math.log(valA) : 0;
        else if (operator === 'sqrt') res = valA >= 0 ? Math.sqrt(valA) : 0;

        return { ...row, [newColumnName]: round(res, 3) };
      });
      columns = generateColumnsFromData(data);
      logDescription = `Created calculated column "${newColumnName}" (${colA} ${operator} ${colB || constant})`;
      break;
    }
  }

  return { updatedData: data, updatedColumns: columns, logDescription };
}

/**
 * Pivot Table Aggregator
 */
export function computePivotTable(data: Record<string, any>[], config: PivotConfig): PivotTableData {
  const { rowFields, colFields, valueField, aggregation } = config;
  if (!rowFields.length || !valueField) {
    return { rowHeaders: [], colHeaders: [], matrix: [], rowTotals: [], colTotals: [], grandTotal: null };
  }

  // Extract unique row combos and column combos
  const rowKeySet = new Set<string>();
  const colKeySet = new Set<string>();

  data.forEach(row => {
    const rKey = rowFields.map(f => String(row[f] ?? 'N/A')).join(' | ');
    const cKey = colFields.length > 0 ? colFields.map(f => String(row[f] ?? 'N/A')).join(' | ') : 'Value';
    rowKeySet.add(rKey);
    colKeySet.add(cKey);
  });

  const rowHeaders = Array.from(rowKeySet).sort();
  const colHeaders = Array.from(colKeySet).sort();

  // Bucket values: rowKey -> colKey -> number[]
  const buckets: Record<string, Record<string, number[]>> = {};

  data.forEach(row => {
    const rKey = rowFields.map(f => String(row[f] ?? 'N/A')).join(' | ');
    const cKey = colFields.length > 0 ? colFields.map(f => String(row[f] ?? 'N/A')).join(' | ') : 'Value';
    const num = parseNumber(row[valueField]);

    if (!buckets[rKey]) buckets[rKey] = {};
    if (!buckets[rKey][cKey]) buckets[rKey][cKey] = [];
    if (num !== null) buckets[rKey][cKey].push(num);
  });

  function aggregate(arr: number[] | undefined): number | null {
    if (!arr || arr.length === 0) return null;
    if (aggregation === 'COUNT') return arr.length;
    if (aggregation === 'SUM') return round(arr.reduce((a, b) => a + b, 0), 2);
    if (aggregation === 'AVG') return round(arr.reduce((a, b) => a + b, 0) / arr.length, 2);
    if (aggregation === 'MIN') return Math.min(...arr);
    if (aggregation === 'MAX') return Math.max(...arr);
    if (aggregation === 'MEDIAN') {
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    }
    return null;
  }

  const matrix: (number | null)[][] = [];
  const rowTotals: (number | null)[] = [];

  for (let r = 0; r < rowHeaders.length; r++) {
    const rKey = rowHeaders[r];
    matrix[r] = [];
    const allRowVals: number[] = [];

    for (let c = 0; c < colHeaders.length; c++) {
      const cKey = colHeaders[c];
      const vals = buckets[rKey]?.[cKey] || [];
      const agg = aggregate(vals);
      matrix[r][c] = agg;
      allRowVals.push(...vals);
    }
    rowTotals[r] = aggregate(allRowVals);
  }

  // Column totals
  const colTotals: (number | null)[] = [];
  const allGrandVals: number[] = [];
  for (let c = 0; c < colHeaders.length; c++) {
    const cKey = colHeaders[c];
    const allColVals: number[] = [];
    for (let r = 0; r < rowHeaders.length; r++) {
      const rKey = rowHeaders[r];
      const vals = buckets[rKey]?.[cKey] || [];
      allColVals.push(...vals);
    }
    colTotals[c] = aggregate(allColVals);
    allGrandVals.push(...allColVals);
  }

  const grandTotal = aggregate(allGrandVals);

  return {
    rowHeaders,
    colHeaders,
    matrix,
    rowTotals,
    colTotals,
    grandTotal,
  };
}

/**
 * Convenience helper for missing value imputation
 */
export function imputeMissing(
  data: Record<string, any>[],
  column: string,
  strategy: 'mean' | 'median' | 'mode' | 'zero' | 'custom',
  customValue?: any
): Record<string, any>[] {
  const validVals = data.map(r => r[column]).filter(v => v !== null && v !== undefined && v !== '');
  let fillVal: any = 0;

  if (strategy === 'zero') {
    fillVal = 0;
  } else if (strategy === 'custom') {
    fillVal = customValue ?? '';
  } else if (strategy === 'mean') {
    const numVals = validVals.map(v => parseNumber(v)).filter(v => v !== null) as number[];
    fillVal = numVals.length > 0 ? round(numVals.reduce((a, b) => a + b, 0) / numVals.length, 2) : 0;
  } else if (strategy === 'median') {
    const numVals = validVals.map(v => parseNumber(v)).filter(v => v !== null) as number[];
    if (numVals.length > 0) {
      numVals.sort((a, b) => a - b);
      fillVal = numVals[Math.floor(numVals.length / 2)];
    }
  } else if (strategy === 'mode') {
    const freq: Record<string, number> = {};
    for (const v of validVals) freq[String(v)] = (freq[String(v)] || 0) + 1;
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    fillVal = sorted[0]?.[0] || 'Unknown';
  }

  return data.map(row => {
    const val = row[column];
    if (val === null || val === undefined || val === '') {
      return { ...row, [column]: fillVal };
    }
    return row;
  });
}

/**
 * Convenience helper for row filtering
 */
export function filterRows(
  data: Record<string, any>[],
  filters: { column: string; operator: string; value: any }[]
): Record<string, any>[] {
  return data.filter(row => {
    return filters.every(f => {
      const cell = row[f.column];
      if (f.operator === 'is_not_null') return cell !== null && cell !== undefined && cell !== '';
      if (f.operator === 'equals') return String(cell).toLowerCase() === String(f.value).toLowerCase();
      if (f.operator === 'contains') return String(cell).toLowerCase().includes(String(f.value).toLowerCase());
      
      const numCell = parseNumber(cell);
      const numVal = parseNumber(f.value);
      if (numCell !== null && numVal !== null) {
        if (f.operator === 'greater_than') return numCell > numVal;
        if (f.operator === 'less_than') return numCell < numVal;
      }
      return true;
    });
  });
}

/**
 * Convenience helper for sorting
 */
export function sortDataset(
  data: Record<string, any>[],
  column: string,
  direction: 'asc' | 'desc'
): Record<string, any>[] {
  const sorted = [...data];
  sorted.sort((a, b) => {
    const vA = a[column];
    const vB = b[column];
    const nA = parseNumber(vA);
    const nB = parseNumber(vB);
    if (nA !== null && nB !== null) {
      return direction === 'asc' ? nA - nB : nB - nA;
    }
    return direction === 'asc' ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
  });
  return sorted;
}

/**
 * Convenience helper for 2D cross-tabulation pivot matrix
 */
export function generatePivotTable(
  data: Record<string, any>[],
  rowField: string,
  colField: string,
  valField: string,
  aggType: 'sum' | 'mean' | 'count' | 'min' | 'max'
) {
  const rowKeySet = new Set<string>();
  const colKeySet = new Set<string>();

  data.forEach(row => {
    rowKeySet.add(String(row[rowField] ?? 'Unknown'));
    colKeySet.add(String(row[colField] ?? 'Unknown'));
  });

  const rowKeys = Array.from(rowKeySet).sort();
  const colKeys = Array.from(colKeySet).sort();

  const buckets: Record<string, Record<string, number[]>> = {};

  data.forEach(row => {
    const rKey = String(row[rowField] ?? 'Unknown');
    const cKey = String(row[colField] ?? 'Unknown');
    const val = Number(row[valField]);

    if (!buckets[rKey]) buckets[rKey] = {};
    if (!buckets[rKey][cKey]) buckets[rKey][cKey] = [];
    if (!isNaN(val)) buckets[rKey][cKey].push(val);
  });

  const agg = (vals: number[] | undefined) => {
    if (!vals || vals.length === 0) return 0;
    if (aggType === 'sum') return vals.reduce((a, b) => a + b, 0);
    if (aggType === 'mean') return vals.reduce((a, b) => a + b, 0) / vals.length;
    if (aggType === 'count') return vals.length;
    if (aggType === 'min') return Math.min(...vals);
    if (aggType === 'max') return Math.max(...vals);
    return 0;
  };

  const matrix: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  const allVals: number[] = [];

  rowKeys.forEach(rKey => {
    matrix[rKey] = {};
    const rVals: number[] = [];
    colKeys.forEach(cKey => {
      const vals = buckets[rKey]?.[cKey] || [];
      matrix[rKey][cKey] = round(agg(vals), 2);
      rVals.push(...vals);
      allVals.push(...vals);
    });
    rowTotals[rKey] = round(agg(rVals), 2);
  });

  colKeys.forEach(cKey => {
    const cVals: number[] = [];
    rowKeys.forEach(rKey => {
      const vals = buckets[rKey]?.[cKey] || [];
      cVals.push(...vals);
    });
    colTotals[cKey] = round(agg(cVals), 2);
  });

  const grandTotal = round(agg(allVals), 2);

  return {
    rowKeys,
    colKeys,
    matrix,
    rowTotals,
    colTotals,
    grandTotal,
  };
}

