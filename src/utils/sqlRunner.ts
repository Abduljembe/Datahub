import { ColumnMeta } from '../types';
import { generateColumnsFromData } from './dataEngine';
import { parseNumber, round } from './statistics';

export interface SqlQueryResult {
  columns: ColumnMeta[];
  data: Record<string, any>[];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}

/**
 * In-memory SQL engine for executing SQL queries on active datasets
 */
export function executeSQL(
  query: string,
  tableData: Record<string, any>[]
): {
  columns: string[];
  data: Record<string, any>[];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
} {
  const res = executeSql(query, 'dataset', tableData);
  const colNames = res.columns.map(c => c.name);
  // If no columns generated but data has keys, fallback to keys
  const finalCols = colNames.length > 0 ? colNames : (res.data[0] ? Object.keys(res.data[0]) : []);
  return {
    columns: finalCols,
    data: res.data,
    executionTimeMs: res.executionTimeMs,
    rowCount: res.rowCount,
    error: res.error,
  };
}

export function executeSql(
  query: string,
  tableName: string,
  tableData: Record<string, any>[]
): SqlQueryResult {
  const startTime = performance.now();
  const cleanedQuery = query.trim().replace(/;+$/, '');

  try {
    if (!cleanedQuery.toUpperCase().startsWith('SELECT')) {
      throw new Error('Only SELECT queries are supported in the in-memory engine.');
    }

    let records = [...tableData];
    
    // Check WHERE clause
    const whereMatch = cleanedQuery.match(/\bWHERE\b([\s\S]*?)(?=\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|$)/i);
    if (whereMatch) {
      const conditionStr = whereMatch[1].trim();
      records = records.filter(row => evaluateWhere(conditionStr, row));
    }

    // Check GROUP BY clause
    const groupMatch = cleanedQuery.match(/\bGROUP\s+BY\b([\s\S]*?)(?=\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|$)/i);
    const selectMatch = cleanedQuery.match(/\bSELECT\b([\s\S]*?)\bFROM\b/i);
    if (!selectMatch) throw new Error('Invalid SQL syntax: Missing SELECT ... FROM');
    
    const selectFieldsStr = selectMatch[1].trim();
    const isSelectAll = selectFieldsStr === '*';

    let resultData: Record<string, any>[] = [];

    if (groupMatch) {
      const groupCols = groupMatch[1].split(',').map(s => s.trim().replace(/["'`]/g, ''));
      resultData = executeGroupBy(records, groupCols, selectFieldsStr);
    } else {
      if (isSelectAll) {
        resultData = records;
      } else {
        resultData = records.map(row => projectRow(row, selectFieldsStr));
      }
    }

    // Check ORDER BY
    const orderMatch = cleanedQuery.match(/\bORDER\s+BY\b([\s\S]*?)(?=\bLIMIT\b|$)/i);
    if (orderMatch) {
      const orderClauses = orderMatch[1].split(',').map(s => s.trim());
      resultData.sort((a, b) => {
        for (const clause of orderClauses) {
          const parts = clause.split(/\s+/);
          const col = parts[0].replace(/["'`]/g, '');
          const dir = (parts[1] || 'ASC').toUpperCase();
          const vA = a[col];
          const vB = b[col];
          const nA = parseNumber(vA);
          const nB = parseNumber(vB);

          let cmp = 0;
          if (nA !== null && nB !== null) {
            cmp = nA - nB;
          } else {
            cmp = String(vA ?? '').localeCompare(String(vB ?? ''));
          }
          if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp;
        }
        return 0;
      });
    }

    // Check LIMIT / OFFSET
    const limitMatch = cleanedQuery.match(/\bLIMIT\b\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1], 10);
      const offset = limitMatch[2] ? parseInt(limitMatch[2], 10) : 0;
      resultData = resultData.slice(offset, offset + limit);
    }

    const executionTimeMs = round(performance.now() - startTime, 2);
    const columns = generateColumnsFromData(resultData);

    return {
      columns,
      data: resultData,
      executionTimeMs,
      rowCount: resultData.length,
    };
  } catch (err: any) {
    return {
      columns: [],
      data: [],
      executionTimeMs: round(performance.now() - startTime, 2),
      rowCount: 0,
      error: err.message || 'SQL execution failed',
    };
  }
}

function evaluateWhere(conditionStr: string, row: Record<string, any>): boolean {
  // Support simple AND / OR conditions
  // E.g. "age > 30 AND status = 'active'"
  const andClauses = conditionStr.split(/\bAND\b/i);
  for (const clause of andClauses) {
    const trimmed = clause.trim();
    if (!evalSingleCondition(trimmed, row)) return false;
  }
  return true;
}

function evalSingleCondition(expr: string, row: Record<string, any>): boolean {
  const match = expr.match(/([a-zA-Z0-9_]+)\s*(=|!=|>=|<=|>|<|LIKE|IS\s+NOT\s+NULL|IS\s+NULL)\s*([\s\S]*)/i);
  if (!match) return true;

  const field = match[1].replace(/["'`]/g, '');
  const op = match[2].toUpperCase().trim();
  let rawVal = (match[3] || '').trim().replace(/^['"]|['"]$/g, '');

  const cellVal = row[field];

  if (op === 'IS NULL') return cellVal === null || cellVal === undefined || cellVal === '';
  if (op === 'IS NOT NULL') return cellVal !== null && cellVal !== undefined && cellVal !== '';

  if (op === 'LIKE') {
    const pattern = rawVal.replace(/%/g, '.*');
    return new RegExp(`^${pattern}$`, 'i').test(String(cellVal));
  }

  const numCell = parseNumber(cellVal);
  const numTarget = parseNumber(rawVal);

  if (numCell !== null && numTarget !== null) {
    if (op === '=') return numCell === numTarget;
    if (op === '!=') return numCell !== numTarget;
    if (op === '>') return numCell > numTarget;
    if (op === '>=') return numCell >= numTarget;
    if (op === '<') return numCell < numTarget;
    if (op === '<=') return numCell <= numTarget;
  }

  const strCell = String(cellVal ?? '').toLowerCase();
  const strTarget = rawVal.toLowerCase();
  if (op === '=') return strCell === strTarget;
  if (op === '!=') return strCell !== strTarget;
  return true;
}

function projectRow(row: Record<string, any>, selectFieldsStr: string): Record<string, any> {
  const out: Record<string, any> = {};
  const fields = splitFields(selectFieldsStr);

  for (const f of fields) {
    const aliasMatch = f.match(/(.*?)\s+\bAS\b\s+(.*)/i);
    const expr = aliasMatch ? aliasMatch[1].trim() : f.trim();
    const alias = aliasMatch ? aliasMatch[2].trim().replace(/["'`]/g, '') : expr.replace(/["'`]/g, '');
    out[alias] = row[expr] !== undefined ? row[expr] : evalExpression(expr, row);
  }
  return out;
}

function executeGroupBy(
  records: Record<string, any>[],
  groupCols: string[],
  selectFieldsStr: string
): Record<string, any>[] {
  const groups: Record<string, Record<string, any>[]> = {};

  records.forEach(row => {
    const key = groupCols.map(c => String(row[c] ?? '')).join('___');
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  const fields = splitFields(selectFieldsStr);
  const result: Record<string, any>[] = [];

  for (const [key, rows] of Object.entries(groups)) {
    const first = rows[0];
    const outRow: Record<string, any> = {};

    for (const f of fields) {
      const aliasMatch = f.match(/(.*?)\s+\bAS\b\s+(.*)/i);
      const expr = aliasMatch ? aliasMatch[1].trim() : f.trim();
      const alias = aliasMatch ? aliasMatch[2].trim().replace(/["'`]/g, '') : expr.replace(/["'`]/g, '');

      // Check for aggregate functions: COUNT(*), SUM(col), AVG(col), MIN(col), MAX(col)
      const aggMatch = expr.match(/(COUNT|SUM|AVG|MIN|MAX)\((.*?)\)/i);
      if (aggMatch) {
        const fn = aggMatch[1].toUpperCase();
        const arg = aggMatch[2].trim().replace(/["'`]/g, '');

        if (fn === 'COUNT') {
          outRow[alias] = rows.length;
        } else {
          const vals = rows.map(r => parseNumber(r[arg])).filter(v => v !== null) as number[];
          if (vals.length === 0) {
            outRow[alias] = null;
          } else if (fn === 'SUM') {
            outRow[alias] = round(vals.reduce((a, b) => a + b, 0), 2);
          } else if (fn === 'AVG') {
            outRow[alias] = round(vals.reduce((a, b) => a + b, 0) / vals.length, 2);
          } else if (fn === 'MIN') {
            outRow[alias] = Math.min(...vals);
          } else if (fn === 'MAX') {
            outRow[alias] = Math.max(...vals);
          }
        }
      } else {
        outRow[alias] = first[expr] ?? expr;
      }
    }
    result.push(outRow);
  }

  return result;
}

function splitFields(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inParen = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '(') inParen++;
    else if (ch === ')') inParen--;

    if (ch === ',' && inParen === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function evalExpression(expr: string, row: Record<string, any>): any {
  if (row[expr] !== undefined) return row[expr];
  return null;
}
