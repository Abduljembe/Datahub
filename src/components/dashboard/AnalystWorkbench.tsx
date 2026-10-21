import React, { useState, useMemo } from 'react';
import {
  Code,
  FileCode,
  Terminal,
  BookOpen,
  Sparkles,
  Sliders,
  Wand2,
  Copy,
  Check,
  Search,
  ArrowRight,
  Database,
  Table,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Download,
  Filter,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { Dataset, ColumnMeta, AppTab } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { round, parseNumber, computeColumnStats } from '../../utils/statistics';

interface AnalystWorkbenchProps {
  dataset: Dataset | null;
  onUpdateDataset: (updatedDataset: Dataset) => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenCopilot: () => void;
}

type WorkbenchTab = 'insights' | 'dictionary' | 'codegen' | 'transforms';
type CodeLanguage = 'python' | 'sql' | 'r';

export const AnalystWorkbench: React.FC<AnalystWorkbenchProps> = ({
  dataset,
  onUpdateDataset,
  onNavigateTab,
  onOpenCopilot
}) => {
  const { isDark } = useTheme();

  // Active sub-tab in Analyst Workbench
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('insights');
  const [selectedLang, setSelectedLang] = useState<CodeLanguage>('python');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedDict, setCopiedDict] = useState<boolean>(false);
  const [dictSearch, setDictSearch] = useState<string>('');
  const [dictTypeFilter, setDictTypeFilter] = useState<'all' | 'number' | 'string' | 'date'>('all');
  
  // Transform tool states
  const [transformCol, setTransformCol] = useState<string>('');
  const [transformFeedback, setTransformFeedback] = useState<string | null>(null);

  // Numeric and non-numeric columns
  const numericCols = useMemo(() => {
    if (!dataset?.columns) return [];
    return dataset.columns.filter(c => c.type === 'number');
  }, [dataset]);

  // Set default transform column
  React.useEffect(() => {
    if (numericCols.length > 0 && !transformCol) {
      setTransformCol(numericCols[0].name);
    }
  }, [numericCols, transformCol]);

  // 1. AUTOMATED ALGORITHMIC FINDINGS & INSIGHTS FEED
  const algorithmicInsights = useMemo(() => {
    if (!dataset || !dataset.data || dataset.data.length === 0) return [];

    const insights: {
      id: string;
      title: string;
      description: string;
      level: 'high' | 'info' | 'success' | 'warn';
      icon: any;
      actionLabel?: string;
      onAction?: () => void;
    }[] = [];

    // Check 1: Pairwise Pearson Correlation scan
    if (numericCols.length >= 2) {
      let maxR = 0;
      let topPair: [string, string] = ['', ''];

      for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
          const colA = numericCols[i].name;
          const colB = numericCols[j].name;
          
          const pairs = dataset.data
            .map(r => ({ a: parseNumber(r[colA]), b: parseNumber(r[colB]) }))
            .filter((p): p is { a: number; b: number } => p.a !== null && p.b !== null);

          if (pairs.length > 5) {
            const n = pairs.length;
            const sumA = pairs.reduce((acc, p) => acc + p.a, 0);
            const sumB = pairs.reduce((acc, p) => acc + p.b, 0);
            const sumAB = pairs.reduce((acc, p) => acc + p.a * p.b, 0);
            const sumAA = pairs.reduce((acc, p) => acc + p.a * p.a, 0);
            const sumBB = pairs.reduce((acc, p) => acc + p.b * p.b, 0);

            const num = n * sumAB - sumA * sumB;
            const den = Math.sqrt((n * sumAA - sumA * sumA) * (n * sumBB - sumB * sumB));
            if (den > 0) {
              const r = num / den;
              if (Math.abs(r) > Math.abs(maxR) && Math.abs(r) < 0.999) {
                maxR = r;
                topPair = [colA, colB];
              }
            }
          }
        }
      }

      if (Math.abs(maxR) >= 0.5) {
        insights.push({
          id: 'top-correlation',
          title: `Strong ${maxR > 0 ? 'Positive' : 'Inverse'} Correlation (r = ${round(maxR, 3)})`,
          description: `Variables "${topPair[0]}" and "${topPair[1]}" exhibit an R² of ${round(maxR * maxR, 3)}. This indicates significant predictive co-variance.`,
          level: 'high',
          icon: TrendingUp,
          actionLabel: 'Inspect in Analysis Suite',
          onAction: () => onNavigateTab('analysis')
        });
      }
    }

    // Check 2: Missingness inspection
    const columnsWithNulls = dataset.columns
      .map(col => {
        const nullCount = dataset.data.filter(r => r[col.name] === null || r[col.name] === undefined || r[col.name] === '').length;
        const rate = (nullCount / dataset.data.length) * 100;
        return { name: col.name, nullCount, rate };
      })
      .filter(c => c.nullCount > 0)
      .sort((a, b) => b.rate - a.rate);

    if (columnsWithNulls.length > 0) {
      const topNullCol = columnsWithNulls[0];
      insights.push({
        id: 'missing-cells',
        title: `${columnsWithNulls.length} Dimension(s) Contain Missing Values`,
        description: `Column "${topNullCol.name}" has ${topNullCol.nullCount} empty cells (${round(topNullCol.rate, 1)}% missing). Imputation recommended prior to regression.`,
        level: topNullCol.rate > 15 ? 'warn' : 'info',
        icon: AlertTriangle,
        actionLabel: '1-Click Median Impute',
        onAction: () => handleImputeMedian(topNullCol.name)
      });
    } else {
      insights.push({
        id: 'clean-data',
        title: 'Zero Missing Values (100% Completeness)',
        description: `All ${dataset.columns.length} dimensions across ${dataset.data.length} records are fully populated. Matrix is ready for statistical inference.`,
        level: 'success',
        icon: CheckCircle2
      });
    }

    // Check 3: Skewness / Outliers check on primary numeric column
    if (numericCols.length > 0) {
      const col = numericCols[0];
      const stats = computeColumnStats(dataset.data, col);
      if (stats.outliersCount && stats.outliersCount > 0) {
        insights.push({
          id: 'outliers-fence',
          title: `${stats.outliersCount} Extreme Outlier(s) in "${col.name}"`,
          description: `Values exceed the 1.5× IQR threshold (range: ${round(stats.min ?? 0, 1)} to ${round(stats.max ?? 0, 1)}). Mean is ${round(stats.mean ?? 0, 1)} vs Median ${round(stats.median ?? 0, 1)}.`,
          level: 'warn',
          icon: BarChart3,
          actionLabel: 'Winsorize Extreme Values',
          onAction: () => handleWinsorizeColumn(col.name)
        });
      }
    }

    // Check 4: Dataset Structure & Information Density
    insights.push({
      id: 'schema-density',
      title: `Memory Footprint & Matrix Shape: ${dataset.data.length.toLocaleString()} × ${dataset.columns.length}`,
      description: `Comprising ${numericCols.length} continuous numeric variables and ${dataset.columns.length - numericCols.length} discrete/categorical fields. Zero-egress local processing.`,
      level: 'info',
      icon: Database
    });

    return insights;
  }, [dataset, numericCols]);

  // 2. DETAILED DATA DICTIONARY PROFILING MATRIX
  const columnProfiles = useMemo(() => {
    if (!dataset?.columns || !dataset.data) return [];
    
    return dataset.columns.map(col => {
      const stats = computeColumnStats(dataset.data, col);
      return {
        col,
        stats
      };
    });
  }, [dataset]);

  // Filtered dictionary rows
  const filteredProfiles = useMemo(() => {
    return columnProfiles.filter(({ col }) => {
      const matchesSearch = col.name.toLowerCase().includes(dictSearch.toLowerCase());
      const matchesType = dictTypeFilter === 'all' || col.type === dictTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [columnProfiles, dictSearch, dictTypeFilter]);

  // 3. CODE GENERATOR TEMPLATES
  const generatedCode = useMemo(() => {
    if (!dataset) return '';
    const datasetName = dataset.name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'research_dataset';
    const numColNames = numericCols.map(c => c.name);
    const firstNum = numColNames[0] || 'value';
    const secondNum = numColNames[1] || numColNames[0] || 'target';

    if (selectedLang === 'python') {
      return `# ====================================================================
# Python / Pandas Exploratory Data Analysis & Modeling Pipeline
# Dataset: ${dataset.name} (${dataset.data.length} rows, ${dataset.columns.length} columns)
# Generated by AI Studio Data Analyst Engine
# ====================================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# 1. Load dataset
df = pd.read_csv("${datasetName}.csv")
print("=== DATASET SHAPE ===")
print(f"Rows: {df.shape[0]:,}, Columns: {df.shape[1]}")
print("\\n=== SCHEMA & MISSING VALUES ===")
print(df.info())
print("\\nNull counts per column:\\n", df.isnull().sum())

# 2. Summary Statistics (Five-Number Summary + Mean/Std)
print("\\n=== NUMERICAL DESCRIPTIVE STATISTICS ===")
print(df.describe().T)

# 3. Clean & Impute Missing Data (Median strategy for numerical)
numerical_cols = ${JSON.stringify(numColNames)}
for col in numerical_cols:
    if col in df.columns and df[col].isnull().any():
        median_val = df[col].median()
        df[col].fillna(median_val, inplace=True)
        print(f"Imputed missing in {col} with median: {median_val:.2f}")

# 4. Feature Engineering & Transformations
if "${firstNum}" in df.columns:
    # Standardized Z-Score
    mean_val = df["${firstNum}"].mean()
    std_val = df["${firstNum}"].std()
    df["${firstNum}_zscore"] = (df["${firstNum}"] - mean_val) / (std_val if std_val != 0 else 1)
    
    # Log Transformation (handled for non-negative values)
    df["${firstNum}_log"] = np.log1p(df["${firstNum}"].clip(lower=0))

# 5. Correlation Matrix & Visualizations
if len(numerical_cols) >= 2:
    corr_matrix = df[numerical_cols].corr(method='pearson')
    print("\\n=== PEARSON CORRELATION MATRIX ===")
    print(corr_matrix.round(3))

    # Plot Correlation Heatmap
    plt.figure(figsize=(9, 7))
    sns.heatmap(corr_matrix, annot=True, cmap="mako", fmt=".2f", linewidths=0.5)
    plt.title("Correlation Matrix - ${dataset.name}", fontsize=12, fontweight="bold")
    plt.tight_layout()
    plt.show()

# 6. Scatter Plot & Ordinary Least Squares (OLS) Trend
if "${firstNum}" in df.columns and "${secondNum}" in df.columns:
    plt.figure(figsize=(8, 5))
    sns.regplot(data=df, x="${firstNum}", y="${secondNum}", scatter_kws={'alpha': 0.6}, line_kws={'color': 'crimson'})
    plt.title("Bivariate Regression: ${firstNum} vs ${secondNum}")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.show()
`;
    }

    if (selectedLang === 'sql') {
      const colDefinitions = dataset.columns.map(c => {
        const sqlType = c.type === 'number' ? 'NUMERIC(14, 4)' : c.type === 'date' ? 'TIMESTAMP' : 'VARCHAR(255)';
        return `  ${c.name.replace(/[^a-zA-Z0-9_]/g, '_')} ${sqlType}`;
      }).join(',\n');

      const aggColumns = numericCols.slice(0, 4).map(c => {
        const safeName = c.name.replace(/[^a-zA-Z0-9_]/g, '_');
        return `  AVG(${safeName}) AS avg_${safeName},\n  STDDEV(${safeName}) AS std_${safeName},\n  MIN(${safeName}) AS min_${safeName},\n  MAX(${safeName}) AS max_${safeName}`;
      }).join(',\n');

      return `-- ====================================================================
-- SQL Schema DDL & Analytical Queries (PostgreSQL / Snowflake / BigQuery)
-- Dataset: ${dataset.name}
-- ====================================================================

-- 1. Create Target Table Schema
CREATE TABLE ${datasetName} (
  record_id SERIAL PRIMARY KEY,
${colDefinitions},
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Basic Dataset Health & Descriptive Metrics
SELECT 
  COUNT(*) AS total_observations,
${aggColumns || '  1 AS placeholder'}
FROM ${datasetName};

-- 3. Detect Statistical Outliers via Z-Score (> 3 Standard Deviations)
WITH stats AS (
  SELECT 
    AVG(${firstNum}) AS mean_target,
    STDDEV(${firstNum}) AS std_target
  FROM ${datasetName}
)
SELECT 
  t.*,
  ROUND(((t.${firstNum} - s.mean_target) / NULLIF(s.std_target, 0)), 3) AS z_score
FROM ${datasetName} t
CROSS JOIN stats s
WHERE ABS(t.${firstNum} - s.mean_target) > 3 * s.std_target
ORDER BY ABS(z_score) DESC;

-- 4. Percentile Distribution (Deciles / Quartiles)
SELECT 
  NTILE(4) OVER (ORDER BY ${firstNum} ASC) AS quartile,
  COUNT(*) AS count_in_quartile,
  MIN(${firstNum}) AS quartile_min,
  MAX(${firstNum}) AS quartile_max
FROM ${datasetName}
GROUP BY 1
ORDER BY 1;
`;
    }

    // R Tidyverse
    return `# ====================================================================
# R / Tidyverse Exploratory Data Analysis & Statistical Modeling
# Dataset: ${dataset.name}
# ====================================================================

library(tidyverse)
library(corrr)

# 1. Ingest Dataset
df <- read_csv("${datasetName}.csv")

# 2. Glimpse Schema and Data Types
glimpse(df)

# 3. Comprehensive Summary
summary(df)

# 4. Handle Missing Data with Median Imputation
df_clean <- df %>%
  mutate(across(where(is.numeric), ~replace_na(., median(., na.rm = TRUE))))

# 5. Correlation Analysis
cor_results <- df_clean %>%
  select(where(is.numeric)) %>%
  correlate() %>%
  rearrange()

print(cor_results)

# 6. Bivariate Regression Plot
ggplot(df_clean, aes(x = \`${firstNum}\`, y = \`${secondNum}\`)) +
  geom_point(alpha = 0.6, color = "#4f46e5") +
  geom_smooth(method = "lm", color = "#dc2626", se = TRUE) +
  theme_minimal() +
  labs(
    title = "Scatter Plot with Linear Regression Fit",
    subtitle = "Dataset: ${dataset.name}",
    x = "${firstNum}",
    y = "${secondNum}"
  )
`;
  }, [dataset, selectedLang, numericCols]);

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy data dictionary as Markdown table
  const handleCopyDictionaryMarkdown = () => {
    if (!dataset) return;
    let md = `# Data Dictionary: ${dataset.name}\n\n`;
    md += `| Column Name | Inferred Type | Null Count | Null % | Unique | Min | Mean | Median | Max | Std Dev |\n`;
    md += `|---|---|---|---|---|---|---|---|---|---|\n`;

    columnProfiles.forEach(({ col, stats }) => {
      md += `| ${col.name} | \`${col.type}\` | ${stats.nullCount} | ${round(stats.nullPercentage, 1)}% | ${stats.uniqueCount} | ${stats.min !== undefined ? round(stats.min, 2) : '-'} | ${stats.mean !== undefined ? round(stats.mean, 2) : '-'} | ${stats.median !== undefined ? round(stats.median, 2) : '-'} | ${stats.max !== undefined ? round(stats.max, 2) : '-'} | ${stats.stdDev !== undefined ? round(stats.stdDev, 2) : '-'} |\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedDict(true);
    setTimeout(() => setCopiedDict(false), 2000);
  };

  // 4. TRANSFORMATION ACTIONS
  const handleTransformZScore = (colName: string) => {
    if (!dataset || !dataset.data) return;
    const colMeta = dataset.columns.find(c => c.name === colName) || { id: colName, name: colName, type: 'number', nullable: true };
    const stats = computeColumnStats(dataset.data, colMeta);
    if (!stats.mean || !stats.stdDev || stats.stdDev === 0) {
      setTransformFeedback(`Cannot standardize "${colName}": zero variance or insufficient data.`);
      return;
    }

    const newColName = `${colName}_zscore`;
    const mean = stats.mean;
    const std = stats.stdDev;

    const updatedData = dataset.data.map(row => {
      const val = parseNumber(row[colName]);
      const z = val !== null ? round((val - mean) / std, 3) : null;
      return { ...row, [newColName]: z };
    });

    const colExists = dataset.columns.some(c => c.name === newColName);
    const updatedCols: ColumnMeta[] = colExists
      ? dataset.columns
      : [...dataset.columns, { id: newColName, name: newColName, type: 'number', nullable: true }];

    onUpdateDataset({
      ...dataset,
      data: updatedData,
      columns: updatedCols,
      updatedAt: new Date().toISOString()
    });

    setTransformFeedback(`Engineered "${newColName}": Standardized Z-Score generated for ${updatedData.length} records.`);
    setTimeout(() => setTransformFeedback(null), 4000);
  };

  const handleTransformLog = (colName: string) => {
    if (!dataset || !dataset.data) return;
    const newColName = `${colName}_log10`;

    const updatedData = dataset.data.map(row => {
      const val = parseNumber(row[colName]);
      const logVal = val !== null && val > 0 ? round(Math.log10(val + 1), 3) : 0;
      return { ...row, [newColName]: logVal };
    });

    const colExists = dataset.columns.some(c => c.name === newColName);
    const updatedCols: ColumnMeta[] = colExists
      ? dataset.columns
      : [...dataset.columns, { id: newColName, name: newColName, type: 'number', nullable: true }];

    onUpdateDataset({
      ...dataset,
      data: updatedData,
      columns: updatedCols,
      updatedAt: new Date().toISOString()
    });

    setTransformFeedback(`Engineered "${newColName}": Log10(x + 1) variance stabilization applied.`);
    setTimeout(() => setTransformFeedback(null), 4000);
  };

  const handleTransformMinMax = (colName: string) => {
    if (!dataset || !dataset.data) return;
    const colMeta = dataset.columns.find(c => c.name === colName) || { id: colName, name: colName, type: 'number', nullable: true };
    const stats = computeColumnStats(dataset.data, colMeta);
    if (stats.min === undefined || stats.max === undefined || stats.max === stats.min) {
      setTransformFeedback(`Cannot min-max scale "${colName}": range is zero.`);
      return;
    }

    const min = stats.min;
    const max = stats.max;
    const range = max - min;
    const newColName = `${colName}_scaled`;

    const updatedData = dataset.data.map(row => {
      const val = parseNumber(row[colName]);
      const scaled = val !== null ? round((val - min) / range, 3) : null;
      return { ...row, [newColName]: scaled };
    });

    const colExists = dataset.columns.some(c => c.name === newColName);
    const updatedCols: ColumnMeta[] = colExists
      ? dataset.columns
      : [...dataset.columns, { id: newColName, name: newColName, type: 'number', nullable: true }];

    onUpdateDataset({
      ...dataset,
      data: updatedData,
      columns: updatedCols,
      updatedAt: new Date().toISOString()
    });

    setTransformFeedback(`Engineered "${newColName}": Normalized into [0, 1] range.`);
    setTimeout(() => setTransformFeedback(null), 4000);
  };

  const handleImputeMedian = (colName: string) => {
    if (!dataset || !dataset.data) return;
    const colMeta = dataset.columns.find(c => c.name === colName) || { id: colName, name: colName, type: 'number', nullable: true };
    const stats = computeColumnStats(dataset.data, colMeta);
    const median = stats.median ?? 0;
    let filledCount = 0;

    const updatedData = dataset.data.map(row => {
      if (row[colName] === null || row[colName] === undefined || row[colName] === '') {
        filledCount++;
        return { ...row, [colName]: round(median, 2) };
      }
      return row;
    });

    onUpdateDataset({
      ...dataset,
      data: updatedData,
      updatedAt: new Date().toISOString()
    });

    setTransformFeedback(`Imputed ${filledCount} missing values in "${colName}" with median (${round(median, 2)}).`);
    setTimeout(() => setTransformFeedback(null), 4000);
  };

  const handleWinsorizeColumn = (colName: string) => {
    if (!dataset || !dataset.data) return;
    const colMeta = dataset.columns.find(c => c.name === colName) || { id: colName, name: colName, type: 'number', nullable: true };
    const stats = computeColumnStats(dataset.data, colMeta);
    if (!stats.mean || !stats.stdDev) return;

    const lower = stats.mean - 3 * stats.stdDev;
    const upper = stats.mean + 3 * stats.stdDev;
    let bounded = 0;

    const updatedData = dataset.data.map(row => {
      const val = parseNumber(row[colName]);
      if (val !== null) {
        if (val > upper) {
          bounded++;
          return { ...row, [colName]: round(upper, 2) };
        } else if (val < lower) {
          bounded++;
          return { ...row, [colName]: round(lower, 2) };
        }
      }
      return row;
    });

    onUpdateDataset({
      ...dataset,
      data: updatedData,
      updatedAt: new Date().toISOString()
    });

    setTransformFeedback(`Winsorized ${bounded} values in "${colName}" to Gaussian ±3σ fences.`);
    setTimeout(() => setTransformFeedback(null), 4000);
  };

  const handleDropDuplicates = () => {
    if (!dataset || !dataset.data) return;
    const seen = new Set<string>();
    const deduplicated: Record<string, any>[] = [];

    dataset.data.forEach(row => {
      const hash = JSON.stringify(row);
      if (!seen.has(hash)) {
        seen.add(hash);
        deduplicated.push(row);
      }
    });

    const removed = dataset.data.length - deduplicated.length;

    onUpdateDataset({
      ...dataset,
      data: deduplicated,
      updatedAt: new Date().toISOString()
    });

    setTransformFeedback(
      removed > 0
        ? `Deduplication complete: Removed ${removed} exact duplicate row(s).`
        : 'Zero duplicate rows detected. Dataset integrity verified.'
    );
    setTimeout(() => setTransformFeedback(null), 4000);
  };

  return (
    <div className={`rounded-2xl border transition-colors overflow-hidden ${
      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Data Analyst Power Workbench
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PRO ANALYST
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Instant schema profiling, automated statistical findings, Python/SQL code export, and feature engineering
            </p>
          </div>
        </div>

        {/* Workbench Sub-Tab Switcher */}
        <div className={`p-1 rounded-xl border flex items-center gap-1 self-start sm:self-auto ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {[
            { id: 'insights', label: 'Findings Feed', icon: Sparkles, count: algorithmicInsights.length },
            { id: 'dictionary', label: 'Data Dictionary', icon: BookOpen, count: dataset?.columns.length || 0 },
            { id: 'codegen', label: 'Export Code (Python/SQL)', icon: Code },
            { id: 'transforms', label: 'Feature Engineering', icon: Wand2 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkbenchTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {transformFeedback && (
        <div className="p-3 mx-4 sm:mx-5 mt-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{transformFeedback}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-4 sm:p-5">

        {/* TAB 1: AUTOMATED FINDINGS FEED */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <span>Algorithmic observations calculated dynamically on active records</span>
              <button onClick={onOpenCopilot} className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Deep Dive with AI Copilot</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {algorithmicInsights.map(insight => {
                const Icon = insight.icon;
                const borderClass =
                  insight.level === 'high' ? 'border-indigo-500/40 bg-indigo-950/20' :
                  insight.level === 'warn' ? 'border-amber-500/40 bg-amber-950/20' :
                  insight.level === 'success' ? 'border-emerald-500/40 bg-emerald-950/20' :
                  'border-slate-800 bg-slate-950/60';

                const badgeColor =
                  insight.level === 'high' ? 'text-indigo-400 bg-indigo-500/20' :
                  insight.level === 'warn' ? 'text-amber-400 bg-amber-500/20' :
                  insight.level === 'success' ? 'text-emerald-400 bg-emerald-500/20' :
                  'text-cyan-400 bg-cyan-500/20';

                return (
                  <div key={insight.id} className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${borderClass}`}>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${badgeColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                        </div>
                        <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${badgeColor}`}>
                          {insight.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">
                        {insight.description}
                      </p>
                    </div>

                    {insight.actionLabel && insight.onAction && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-end">
                        <button
                          onClick={insight.onAction}
                          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          <span>{insight.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DATA DICTIONARY PROFILER */}
        {activeTab === 'dictionary' && (
          <div className="space-y-3">
            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dictSearch}
                    onChange={(e) => setDictSearch(e.target.value)}
                    placeholder="Search column schema..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  {(['all', 'number', 'string', 'date'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDictTypeFilter(t)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold capitalize ${
                        dictTypeFilter === t
                          ? 'bg-slate-800 text-cyan-300 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDictionaryMarkdown}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Copy Data Dictionary formatted as Markdown table for README or Notion"
                >
                  {copiedDict ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedDict ? 'Copied Markdown' : 'Copy Markdown Schema'}</span>
                </button>
              </div>
            </div>

            {/* Profiling Table */}
            <div className="rounded-xl border border-slate-800 overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Column</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Missing</th>
                    <th className="py-2.5 px-3">Unique</th>
                    <th className="py-2.5 px-3">Min</th>
                    <th className="py-2.5 px-3">Median</th>
                    <th className="py-2.5 px-3">Mean</th>
                    <th className="py-2.5 px-3">Max</th>
                    <th className="py-2.5 px-3">StdDev</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-200">
                  {filteredProfiles.map(({ col, stats }) => (
                    <tr key={col.name} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                        <span>{col.name}</span>
                        {stats.nullCount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${stats.nullCount} missing`} />
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          col.type === 'number' ? 'bg-cyan-500/20 text-cyan-300' :
                          col.type === 'date' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {col.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        {stats.nullCount > 0 ? (
                          <span className="text-amber-400 font-bold">{stats.nullCount} ({round(stats.nullPercentage, 1)}%)</span>
                        ) : (
                          <span className="text-emerald-500 font-medium">0%</span>
                        )}
                      </td>
                      <td className="py-2 px-3 tabular-nums text-slate-300">
                        {stats.uniqueCount.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 tabular-nums text-slate-300">
                        {stats.min !== undefined ? round(stats.min, 2) : '-'}
                      </td>
                      <td className="py-2 px-3 tabular-nums font-bold text-cyan-300">
                        {stats.median !== undefined ? round(stats.median, 2) : '-'}
                      </td>
                      <td className="py-2 px-3 tabular-nums text-indigo-300">
                        {stats.mean !== undefined ? round(stats.mean, 2) : '-'}
                      </td>
                      <td className="py-2 px-3 tabular-nums text-slate-300">
                        {stats.max !== undefined ? round(stats.max, 2) : '-'}
                      </td>
                      <td className="py-2 px-3 tabular-nums text-slate-400">
                        {stats.stdDev !== undefined ? round(stats.stdDev, 2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {col.type === 'number' && (
                          <button
                            onClick={() => {
                              setTransformCol(col.name);
                              setActiveTab('transforms');
                            }}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            Transform →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CODE GENERATOR (PYTHON / SQL / R) */}
        {activeTab === 'codegen' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
                {(['python', 'sql', 'r'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      selectedLang === lang
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang === 'python' ? 'Python (Pandas)' : lang === 'sql' ? 'ANSI SQL / DDL' : 'R (Tidyverse)'}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code Script'}</span>
              </button>
            </div>

            <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs overflow-x-auto max-h-96 text-slate-300 leading-relaxed">
              <pre>{generatedCode}</pre>
            </div>
          </div>
        )}

        {/* TAB 4: FEATURE ENGINEERING & MATH TRANSFORMS */}
        {activeTab === 'transforms' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Target Numerical Column:</span>
                <select
                  value={transformCol}
                  onChange={(e) => setTransformCol(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-white font-mono"
                >
                  {numericCols.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs text-slate-400">
                1-click mathematical feature transformations executed entirely in client-side RAM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Z-Score Standardization */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Standardize Z-Score</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                      (x - μ) / σ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Normalizes values so distribution has mean = 0 and standard deviation = 1.
                  </p>
                </div>
                <button
                  onClick={() => transformCol && handleTransformZScore(transformCol)}
                  className="mt-3 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3" />
                  <span>Generate Z-Score Column</span>
                </button>
              </div>

              {/* Log10 Transform */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Log10 Transform</span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                      log10(x + 1)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Compresses positive right-skewed tails and stabilizes heteroscedastic variance.
                  </p>
                </div>
                <button
                  onClick={() => transformCol && handleTransformLog(transformCol)}
                  className="mt-3 w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3" />
                  <span>Apply Log10 Column</span>
                </button>
              </div>

              {/* Min-Max Scaling */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Min-Max Scale</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      [0.0, 1.0]
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Rescales continuous metrics strictly between 0 and 1 for machine learning.
                  </p>
                </div>
                <button
                  onClick={() => transformCol && handleTransformMinMax(transformCol)}
                  className="mt-3 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Zap className="w-3 h-3" />
                  <span>Apply Min-Max Column</span>
                </button>
              </div>

              {/* Deduplication & Median Fill */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Hygiene Actions</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Data Prep
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Remove redundant duplicate records or impute missing values with column median.
                  </p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleDropDuplicates}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Drop Duplicates
                  </button>
                  <button
                    onClick={() => transformCol && handleImputeMedian(transformCol)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Median Impute
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
