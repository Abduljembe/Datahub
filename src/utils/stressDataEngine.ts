import { Dataset, ColumnMeta } from '../types';
import { createDatasetSnapshot } from './versionEngine';
import { loadDatasetContracts, ValidationRule } from './contractEngine';

export type StressScenarioType =
  | 'extreme_outliers'
  | 'sparse_missing'
  | 'duplicate_burst'
  | 'format_chaos'
  | 'adversarial_pii'
  | 'contract_breakers'
  | 'gemini_custom';

export interface StressScenarioDef {
  id: StressScenarioType;
  title: string;
  shortDesc: string;
  badge: string;
  iconName: string;
  description: string;
}

export const STRESS_SCENARIOS: StressScenarioDef[] = [
  {
    id: 'extreme_outliers',
    title: 'Extreme Outliers & Spikes',
    shortDesc: 'Spike metrics by 10x–50x, negative balances, and boundary extremes.',
    badge: '3σ Outliers',
    iconName: 'TrendingUp',
    description: 'Generates statistical anomalies that heavily shift mean and standard deviation, triggering z-score outlier detectors.',
  },
  {
    id: 'sparse_missing',
    title: 'Sparse Dropouts & Null Avalanche',
    shortDesc: 'Injects 50%–80% missing null cells simulating telemetry loss.',
    badge: 'Null Incomplete',
    iconName: 'HelpCircle',
    description: 'Simulates dropped packets, incomplete survey responses, and corrupted transmission buffers with blank or null entries.',
  },
  {
    id: 'duplicate_burst',
    title: 'Duplicate Replay Burst',
    shortDesc: 'Clones existing records to simulate double-submits and ETL retry loops.',
    badge: 'Redundancy',
    iconName: 'Copy',
    description: 'Injects redundant identical records into the dataset to test deduplication triggers and row hash collisions.',
  },
  {
    id: 'format_chaos',
    title: 'Format Chaos & Type Corruptions',
    shortDesc: 'String labels in numeric fields, malformed dates, and symbol pollution.',
    badge: 'Type Pollution',
    iconName: 'Zap',
    description: 'Injects values like "$1,200.00", "NaN", "N/A", "--", and illegal calendar dates that break statistical aggregators.',
  },
  {
    id: 'adversarial_pii',
    title: 'Adversarial PII Injections',
    shortDesc: 'Injects synthetic emails, fake credit cards, dummy SSNs, and spoofed IPs.',
    badge: 'Privacy Test',
    iconName: 'Lock',
    description: 'Tests your PII Guard with synthetic personally identifiable information across unexpected columns.',
  },
  {
    id: 'contract_breakers',
    title: 'Contract Breaker Payloads',
    shortDesc: 'Specifically crafted to violate your active Data Contracts & Expectations.',
    badge: 'Contract Risk',
    iconName: 'ShieldAlert',
    description: 'Evaluates your configured rules (ranges, whitelists, regex) and produces deliberate violations to verify alarm triggers.',
  },
  {
    id: 'gemini_custom',
    title: 'Gemini AI Custom Adversary',
    shortDesc: 'Generates domain-specific realistic edge cases from natural language.',
    badge: 'Gemini 3.8 Flash',
    iconName: 'Sparkles',
    description: 'Prompt Gemini with custom stress scenarios (e.g. "Simulate 5 fraudulent transactions with high latency").',
  },
];

/**
 * Generates synthetic stress data locally using deterministic heuristics
 */
export function generateDeterministicStressData(
  dataset: Dataset,
  scenario: StressScenarioType,
  count: number = 5
): Record<string, any>[] {
  const data = dataset.data || [];
  const columns = dataset.columns || [];
  const baseSample = data.length > 0 ? data[Math.floor(Math.random() * data.length)] : {};
  const generated: Record<string, any>[] = [];

  // Inspect numeric boundaries from dataset
  const numBounds: Record<string, { min: number; max: number; mean: number }> = {};
  columns.filter(c => c.type === 'number').forEach(col => {
    const nums = data
      .map(r => r[col.name])
      .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
      .map(Number);
    if (nums.length > 0) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      numBounds[col.name] = { min, max, mean };
    } else {
      numBounds[col.name] = { min: 10, max: 100, mean: 50 };
    }
  });

  // Active validation rules for contract breakers
  const contracts: ValidationRule[] = loadDatasetContracts(dataset);

  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};
    const refRow = data.length > 0 ? data[i % data.length] : {};

    columns.forEach((col) => {
      const colName = col.name;
      const colType = col.type;
      const refVal = refRow[colName];

      if (scenario === 'extreme_outliers') {
        if (colType === 'number') {
          const b = numBounds[colName] || { min: 10, max: 100, mean: 50 };
          const mode = i % 4;
          if (mode === 0) row[colName] = Math.round(b.max * (10 + i * 5)); // 10x-25x spike
          else if (mode === 1) row[colName] = b.min >= 0 ? -Math.round(b.max * 0.5) : Math.round(b.min * 10); // negative boundary
          else if (mode === 2) row[colName] = 0; // zero boundary
          else row[colName] = Math.round(b.max * 100); // 100x outlier
        } else {
          row[colName] = refVal !== undefined ? refVal : `Sample_${i + 1}`;
        }
      } 
      else if (scenario === 'sparse_missing') {
        // 70% chance of being null
        const isNull = Math.random() < 0.7;
        row[colName] = isNull ? null : (refVal !== undefined ? refVal : `Data_${i + 1}`);
      } 
      else if (scenario === 'duplicate_burst') {
        // Exact copy of existing row
        row[colName] = refVal !== undefined ? refVal : `Duplicate_${i + 1}`;
      } 
      else if (scenario === 'format_chaos') {
        if (colType === 'number') {
          const chaosValues = [
            `$${(1500 * (i + 1)).toLocaleString()} USD`,
            'N/A',
            'NaN',
            '--',
            'null',
            'undefined',
            'ERR_DIV_0',
            '#VALUE!'
          ];
          row[colName] = chaosValues[i % chaosValues.length];
        } else if (colType === 'date') {
          const badDates = ['2026/31/12', 'yesterday', '9999-99-99', '00-00-0000', 'Not a Date'];
          row[colName] = badDates[i % badDates.length];
        } else {
          row[colName] = `### corrupted_${i} ###`;
        }
      } 
      else if (scenario === 'adversarial_pii') {
        const dummyPiiCards = [
          '4532-8192-0192-4821',
          '5425-9921-8201-9923',
          '3782-822463-10005',
          '6011-0009-9013-9421'
        ];
        const dummyEmails = [
          `ceo.adversary.${i}@confidential-leak.org`,
          `patient_record_${i}@internal-hospital.med`,
          `exec_target_${i}@unencrypted-domain.io`
        ];
        const dummySsns = [
          `000-12-${1000 + i}`,
          `666-45-${2000 + i}`,
          `987-65-${3000 + i}`
        ];
        const dummyIps = [
          `192.168.1.${10 + i}`,
          `10.0.0.${50 + i}`,
          `172.16.4.${100 + i}`
        ];

        const colLower = colName.toLowerCase();
        if (colLower.includes('email') || colType === 'string') {
          row[colName] = dummyEmails[i % dummyEmails.length];
        } else if (colLower.includes('phone') || colLower.includes('card') || colType === 'number') {
          row[colName] = dummyPiiCards[i % dummyPiiCards.length];
        } else {
          row[colName] = dummySsns[i % dummySsns.length];
        }
      } 
      else if (scenario === 'contract_breakers') {
        const rule = contracts.find(r => r.column === colName && r.enabled);
        if (rule) {
          if (rule.type === 'not_null') {
            row[colName] = null;
          } else if (rule.type === 'min_value' && rule.params.minValue !== undefined) {
            row[colName] = rule.params.minValue - 50; // below min
          } else if (rule.type === 'max_value' && rule.params.maxValue !== undefined) {
            row[colName] = rule.params.maxValue + 500; // above max
          } else if (rule.type === 'range') {
            row[colName] = (rule.params.maxValue || 100) + 999;
          } else if (rule.type === 'allowed_values' && rule.params.allowedValues) {
            row[colName] = `INVALID_CATEGORY_ENUM_${i}`;
          } else if (rule.type === 'regex_match') {
            row[colName] = '!!!INVALID_REGEX_STRING!!!';
          } else {
            row[colName] = refVal;
          }
        } else {
          row[colName] = refVal !== undefined ? refVal : `Val_${i + 1}`;
        }
      } 
      else {
        // Fallback default
        row[colName] = refVal !== undefined ? refVal : `Test_${i + 1}`;
      }
    });

    generated.push(row);
  }

  return generated;
}

/**
 * Generates synthetic stress data using Gemini 3.8 Flash, with deterministic fallback
 */
export async function generateAiStressData(
  dataset: Dataset,
  scenario: StressScenarioType,
  customPrompt: string = '',
  count: number = 5
): Promise<{ records: Record<string, any>[]; isAiGenerated: boolean; modelUsed?: string }> {
  try {
    const payload = {
      columns: dataset.columns,
      sampleRows: dataset.data.slice(0, 3),
      scenario,
      customPrompt,
      count,
    };

    const res = await fetch('/api/gemini/generate-stress-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.records) && json.records.length > 0) {
        return {
          records: json.records,
          isAiGenerated: true,
          modelUsed: json.modelUsed || 'gemini-3.8-flash',
        };
      }
    }
  } catch (err) {
    console.warn('AI Stress generation call failed. Falling back to deterministic engine.', err);
  }

  // Graceful fallback to deterministic generator
  const fallbackRecords = generateDeterministicStressData(dataset, scenario, count);
  return {
    records: fallbackRecords,
    isAiGenerated: false,
    modelUsed: 'DataHub Deterministic Engine (Offline/Fallback)',
  };
}

/**
 * Commits the generated stress rows to the dataset with a rollback snapshot
 */
export function injectStressRows(
  dataset: Dataset,
  newRows: Record<string, any>[],
  mode: 'append' | 'replace',
  scenarioLabel: string
): { updatedDataset: Dataset; count: number } {
  let finalData: Record<string, any>[] = [];

  if (mode === 'append') {
    finalData = [...dataset.data, ...newRows];
  } else {
    finalData = [...newRows];
  }

  const baseUpdated: Dataset = {
    ...dataset,
    data: finalData,
    updatedAt: new Date().toISOString(),
  };

  const summary = mode === 'append'
    ? `Stress Test: Injected ${newRows.length} synthetic rows via '${scenarioLabel}'. Total rows: ${finalData.length}.`
    : `Stress Test: Replaced dataset with ${newRows.length} isolated synthetic stress benchmark rows.`;

  const { updatedDataset } = createDatasetSnapshot(baseUpdated, {
    name: `Stress Injection (${scenarioLabel})`,
    description: summary,
    tag: 'synthetic',
    createdBy: 'Synthetic Stress Engine',
  });

  return {
    updatedDataset,
    count: newRows.length,
  };
}
