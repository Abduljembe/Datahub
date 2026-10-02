import React, { useMemo } from 'react';
import { Dataset } from '../../types';
import { computeColumnStats, computeCorrelationMatrix, round } from '../../utils/statistics';
import { scanDatasetForPii } from '../../utils/piiEngine';
import { DirectPdfOptions, PALETTES, ColorTheme } from '../../utils/pdfGenerator';
import { ShieldCheck, Sparkles, TrendingUp, AlertTriangle, Layers, Database } from 'lucide-react';

interface DocumentSheetPreviewProps {
  dataset: Dataset;
  options: DirectPdfOptions;
  activePage: number;
  onPageChange: (page: number) => void;
  zoom: number; // e.g. 0.8, 1, 1.2
  viewMode: 'single' | 'continuous';
  setTotalPages: (count: number) => void;
}

export const DocumentSheetPreview: React.FC<DocumentSheetPreviewProps> = ({
  dataset,
  options,
  activePage,
  onPageChange,
  zoom,
  viewMode,
  setTotalPages,
}) => {
  const {
    title = dataset.name,
    subtitle = dataset.description || 'Comprehensive statistical audit, data quality profile, and distribution dossier.',
    authorName = 'Enterprise Analytics Team',
    organizationName = 'Data Intelligence Division',
    executiveNotes = 'This report summarizes current feature distributions, data quality indices, and correlation drivers extracted from the dataset. All metrics have been validated against standard statistical parameters.',
    confidentiality = 'CONFIDENTIAL',
    palette = 'corporate_navy',
    orientation = 'portrait',
    format = 'a4',
    template = 'executive_brief',
    includeSummary = true,
    includeDescriptive = true,
    includeCategorical = true,
    includeCorrelations = true,
    includeRecommendations = true,
    includePrivacyStamp = true,
  } = options;

  const theme: ColorTheme = PALETTES[palette] || PALETTES.corporate_navy;

  const rgb = (arr: [number, number, number]) => `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
  const rgba = (arr: [number, number, number], alpha: number) => `rgba(${arr[0]}, ${arr[1]}, ${arr[2]}, ${alpha})`;

  // Calculate statistics
  const { columnStats, numberColumns, catColumns, completeness, healthScore, grade, totalNulls, correlationHighlights, piiScan } = useMemo(() => {
    const colStats = dataset.columns.map(col => ({
      meta: col,
      stats: computeColumnStats(dataset.data, col),
    }));

    const numCols = dataset.columns.filter(c => c.type === 'number');
    const cCols = dataset.columns.filter(c => c.type === 'string' || c.type === 'category');

    let totalCells = dataset.data.length * (dataset.columns.length || 1);
    if (totalCells === 0) totalCells = 1;
    let nulls = 0;
    colStats.forEach(({ stats }) => {
      nulls += stats.nullCount || 0;
    });
    const comp = Math.max(0, Math.min(100, Math.round(((totalCells - nulls) / totalCells) * 1000) / 10));
    const hScore = comp >= 98 ? 99 : comp >= 90 ? 92 : comp >= 80 ? 84 : 65;
    const grd = hScore >= 95 ? 'A+' : hScore >= 88 ? 'A' : hScore >= 75 ? 'B' : 'C';

    const corrList: Array<{
      colA: string;
      colB: string;
      correlation: number;
      strength: string;
      direction: 'positive' | 'negative';
    }> = [];

    if (numCols.length >= 2 && dataset.data.length >= 3) {
      const matrix = computeCorrelationMatrix(dataset.data, dataset.columns);
      const seen = new Set<string>();

      numCols.forEach(c1 => {
        numCols.forEach(c2 => {
          if (c1.id !== c2.id) {
            const key = [c1.id, c2.id].sort().join('___');
            if (!seen.has(key)) {
              seen.add(key);
              const val = matrix.matrix[c1.id]?.[c2.id];
              if (val !== undefined && !isNaN(val) && Math.abs(val) >= 0.25) {
                let strength = 'Moderate';
                if (Math.abs(val) >= 0.7) strength = 'Very Strong';
                else if (Math.abs(val) >= 0.5) strength = 'Strong';
                
                corrList.push({
                  colA: c1.name,
                  colB: c2.name,
                  correlation: round(val, 3),
                  strength,
                  direction: val > 0 ? 'positive' : 'negative',
                });
              }
            }
          }
        });
      });
      corrList.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    }

    const pScan = scanDatasetForPii(dataset);

    return {
      columnStats: colStats,
      numberColumns: numCols,
      catColumns: cCols,
      completeness: comp,
      healthScore: hScore,
      grade: grd,
      totalNulls: nulls,
      correlationHighlights: corrList,
      piiScan: pScan,
    };
  }, [dataset]);

  // Determine pagination split
  // In single page template or small datasets: 1 page.
  // In full audit or larger datasets: split into 2 or 3 pages.
  const isOnePage = template === 'one_page';
  const isFullAudit = template === 'full_audit';

  // Page 1 gets up to 7 columns if there's other content, or up to 10.
  const maxColPage1 = isOnePage ? columnStats.length : isFullAudit ? 6 : 8;
  const page1Columns = columnStats.slice(0, maxColPage1);
  const remainingColumns = isOnePage ? [] : columnStats.slice(maxColPage1);

  // If there are remaining columns or extra sections, page count is at least 2.
  const hasExtraPageContent = remainingColumns.length > 0 || 
    (includeCorrelations && correlationHighlights.length > 0) || 
    (includeCategorical && catColumns.length > 0) ||
    includeRecommendations;

  const totalCalculatedPages = isOnePage ? 1 : hasExtraPageContent ? (remainingColumns.length > 10 ? 3 : 2) : 1;

  React.useEffect(() => {
    setTotalPages(totalCalculatedPages);
  }, [totalCalculatedPages, setTotalPages]);

  // Page 2 columns vs Page 3 columns
  const page2Columns = remainingColumns.slice(0, 10);
  const page3Columns = remainingColumns.slice(10);

  // Paper styling
  const isLandscape = orientation === 'landscape';
  // Aspect ratio: A4 is 210 x 297mm (1 : 1.414). Letter is 8.5 x 11in (1 : 1.294)
  const ratio = format === 'letter' ? (isLandscape ? 11 / 8.5 : 8.5 / 11) : (isLandscape ? 297 / 210 : 210 / 297);
  
  // Base width in px for preview: portrait 720px, landscape 920px
  const baseWidth = isLandscape ? 880 : 680;
  const baseHeight = Math.round(baseWidth / ratio);

  // Render header component for pages 2+
  const renderRunningHeader = (pageNumber: number) => (
    <div className="pb-3 mb-4 border-b flex items-center justify-between text-[11px]" style={{ borderColor: rgb(theme.border) }}>
      <div className="font-bold tracking-tight truncate max-w-[320px]" style={{ color: rgb(theme.textMuted) }}>
        {title}
      </div>
      <div className="font-medium text-[10px] tracking-wide" style={{ color: rgb(theme.textMuted) }}>
        {organizationName.toUpperCase()} • <span className="font-bold" style={{ color: rgb(theme.accent) }}>{confidentiality}</span>
      </div>
    </div>
  );

  // Render footer component
  const renderRunningFooter = (pageNumber: number) => (
    <div className="mt-auto pt-3 border-t flex items-center justify-between text-[10px]" style={{ borderColor: rgb(theme.border) }}>
      <div className="text-slate-400 font-medium truncate max-w-[240px]">
        Prepared by {authorName} • {organizationName}
      </div>
      <div className="font-mono text-[9.5px] tracking-wider" style={{ color: rgb(theme.textMuted) }}>
        {confidentiality} • Remix DataHub Intelligence
      </div>
      <div className="font-bold" style={{ color: rgb(theme.primary) }}>
        Page {pageNumber} of {totalCalculatedPages}
      </div>
    </div>
  );

  // PAGE 1 CONTENT
  const renderPage1 = () => (
    <div 
      className="bg-white text-slate-900 rounded-sm shadow-2xl relative flex flex-col mx-auto p-8 border border-slate-200 select-text transition-transform"
      style={{
        width: `${baseWidth}px`,
        minHeight: `${baseHeight}px`,
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Accent Strip */}
      <div 
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: rgb(theme.accent) }}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between mt-1 mb-3">
        <div className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5" style={{ color: rgb(theme.accent) }}>
          <span>{organizationName}</span>
          <span className="opacity-40">•</span>
          <span>Official Executive Dossier</span>
        </div>

        <div 
          className="px-2.5 py-0.5 rounded text-[9.5px] font-bold tracking-wider uppercase border"
          style={{ 
            backgroundColor: rgb(theme.calloutBg), 
            borderColor: rgb(theme.border),
            color: rgb(theme.primary) 
          }}
        >
          {confidentiality}
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="mb-3">
        <h1 
          className="text-xl font-extrabold tracking-tight leading-snug"
          style={{ color: rgb(theme.primary) }}
        >
          {title}
        </h1>
        <p className="text-xs leading-relaxed mt-1" style={{ color: rgb(theme.textMuted) }}>
          {subtitle}
        </p>
      </div>

      {/* Metadata Strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[10.5px] py-2 border-y mb-4" style={{ borderColor: rgb(theme.border) }}>
        <div>
          <span className="font-bold text-slate-700">Lead Analyst: </span>
          <span style={{ color: rgb(theme.textMuted) }}>{authorName}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Date Generated: </span>
          <span style={{ color: rgb(theme.textMuted) }}>{new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
        </div>
        <div>
          <span className="font-bold text-slate-700">Pipeline Source: </span>
          <span className="font-bold uppercase" style={{ color: rgb(theme.accent) }}>{dataset.sourceType}</span>
        </div>
      </div>

      {/* Executive Commentary Callout */}
      {executiveNotes && executiveNotes.trim().length > 0 && (
        <div 
          className="p-3.5 rounded-lg border mb-4 relative overflow-hidden"
          style={{ 
            backgroundColor: rgb(theme.calloutBg),
            borderColor: rgb(theme.border)
          }}
        >
          <div 
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ backgroundColor: rgb(theme.accent) }}
          />
          <div className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: rgb(theme.accent) }}>
            Executive Analytical Commentary
          </div>
          <p className="text-[11px] leading-relaxed text-slate-700 pl-1">
            {executiveNotes}
          </p>
        </div>
      )}

      {/* KPI Cards Row */}
      {includeSummary && (
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {[
            { label: 'SAMPLE SIZE (N)', val: dataset.data.length.toLocaleString(), sub: 'Total observations', color: theme.primary },
            { label: 'FEATURE SPACE (P)', val: `${dataset.columns.length}`, sub: `${numberColumns.length} Num • ${catColumns.length} Cat`, color: theme.accent },
            { label: 'DATA COMPLETENESS', val: `${completeness}%`, sub: `${totalNulls} null cells`, color: completeness >= 95 ? [5, 150, 105] : [217, 119, 6] },
            { label: 'QUALITY HEALTH', val: `${healthScore}%`, sub: `Grade: ${grade} verified`, color: theme.secondary },
          ].map((card, i) => (
            <div 
              key={i}
              className="p-2.5 rounded-lg border"
              style={{ 
                backgroundColor: rgb(theme.cardBg),
                borderColor: rgb(theme.border) 
              }}
            >
              <div className="text-[8.5px] font-bold tracking-wider uppercase" style={{ color: rgb(theme.textMuted) }}>
                {card.label}
              </div>
              <div className="text-base font-extrabold mt-0.5" style={{ color: rgb(card.color as any) }}>
                {card.val}
              </div>
              <div className="text-[8.5px] mt-0.5 truncate" style={{ color: rgb(theme.textMuted) }}>
                {card.sub}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Descriptive Statistics Table (Page 1 slice) */}
      {includeDescriptive && page1Columns.length > 0 && (
        <div className="mb-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between" style={{ color: rgb(theme.primary) }}>
            <span>Variable Descriptive Statistics &amp; Hygiene</span>
            {remainingColumns.length > 0 && (
              <span className="text-[9px] font-normal text-slate-400">
                (Showing 1–{page1Columns.length} of {columnStats.length} features • Continued on Page 2)
              </span>
            )}
          </div>

          <div className="rounded-lg overflow-hidden border" style={{ borderColor: rgb(theme.border) }}>
            <table className="w-full text-left border-collapse text-[9.5px]">
              <thead>
                <tr style={{ backgroundColor: rgb(theme.primary), color: '#ffffff' }}>
                  <th className="py-1.5 px-2.5 font-bold">Feature Name</th>
                  <th className="py-1.5 px-2 font-bold">Type</th>
                  <th className="py-1.5 px-2 font-bold">Unique</th>
                  <th className="py-1.5 px-2 font-bold">Nulls (%)</th>
                  <th className="py-1.5 px-2 font-bold">Mean (μ)</th>
                  <th className="py-1.5 px-2 font-bold">Median</th>
                  <th className="py-1.5 px-2 font-bold">StdDev (σ)</th>
                  {isFullAudit && <th className="py-1.5 px-2 font-bold">Q1 / Q3</th>}
                  <th className="py-1.5 px-2 font-bold">Range [Min - Max]</th>
                </tr>
              </thead>
              <tbody>
                {page1Columns.map(({ meta, stats }, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? '#ffffff' : rgb(theme.calloutBg);
                  const nullStr = stats.nullCount > 0 ? `${stats.nullCount} (${round(stats.nullPercentage, 1)}%)` : '0';
                  const meanStr = stats.mean !== undefined ? `${round(stats.mean, 2)}` : '-';
                  const medStr = stats.median !== undefined ? `${round(stats.median, 2)}` : '-';
                  const sdStr = stats.stdDev !== undefined ? `${round(stats.stdDev, 2)}` : '-';
                  const rangeStr = stats.min !== undefined && stats.max !== undefined ? `[${round(stats.min, 1)}, ${round(stats.max, 1)}]` : '-';
                  const qStr = stats.q1 !== undefined && stats.q3 !== undefined ? `${round(stats.q1, 1)} / ${round(stats.q3, 1)}` : '-';

                  return (
                    <tr key={meta.id} style={{ backgroundColor: rowBg, color: rgb(theme.textDark) }} className="border-t" >
                      <td className="py-1.5 px-2.5 font-semibold">{meta.name}</td>
                      <td className="py-1.5 px-2 uppercase font-mono text-[8.5px] opacity-75">{meta.type}</td>
                      <td className="py-1.5 px-2">{stats.uniqueCount}</td>
                      <td className="py-1.5 px-2">{nullStr}</td>
                      <td className="py-1.5 px-2 font-mono">{meanStr}</td>
                      <td className="py-1.5 px-2 font-mono">{medStr}</td>
                      <td className="py-1.5 px-2 font-mono">{sdStr}</td>
                      {isFullAudit && <td className="py-1.5 px-2 font-mono">{qStr}</td>}
                      <td className="py-1.5 px-2 font-mono">{rangeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* If 1-page template, show compact recommendations or privacy on page 1 */}
      {isOnePage && includeRecommendations && (
        <div 
          className="p-3 rounded-lg border mb-3"
          style={{ backgroundColor: rgb(theme.calloutBg), borderColor: rgb(theme.border) }}
        >
          <div className="text-[10px] font-bold uppercase mb-1" style={{ color: rgb(theme.secondary) }}>
            Strategic Analytical Next Steps
          </div>
          <p className="text-[9.5px] text-slate-700 leading-snug">
            1. Predictive Regression: Formulate regression models across top correlation drivers. • 2. Cohort Clustering: Execute unsupervised K-Means (k=3). • 3. Continuous Drift Auditing: Monitor statistical deviations &gt; 2.0 SE.
          </p>
        </div>
      )}

      {isOnePage && includePrivacyStamp && (
        <div className="p-2.5 rounded border mb-2 flex items-center gap-2 bg-emerald-50 border-emerald-200 text-emerald-900 text-[9px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span><strong>GOVERNANCE AUDIT STAMP:</strong> {piiScan.detections.length > 0 ? `${piiScan.detections.length} sensitive attributes identified.` : 'Zero high-risk unmasked PII attributes identified.'}</span>
        </div>
      )}

      {/* Running Footer */}
      {renderRunningFooter(1)}
    </div>
  );

  // PAGE 2 CONTENT
  const renderPage2 = () => (
    <div 
      className="bg-white text-slate-900 rounded-sm shadow-2xl relative flex flex-col mx-auto p-8 border border-slate-200 select-text transition-transform"
      style={{
        width: `${baseWidth}px`,
        minHeight: `${baseHeight}px`,
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {renderRunningHeader(2)}

      {/* Continuation of Descriptive Statistics if any */}
      {includeDescriptive && page2Columns.length > 0 && (
        <div className="mb-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between" style={{ color: rgb(theme.primary) }}>
            <span>Variable Descriptive Statistics (Continuation)</span>
            <span className="text-[9px] font-normal text-slate-400">
              Features {maxColPage1 + 1}–{maxColPage1 + page2Columns.length} of {columnStats.length}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border mb-4" style={{ borderColor: rgb(theme.border) }}>
            <table className="w-full text-left border-collapse text-[9.5px]">
              <thead>
                <tr style={{ backgroundColor: rgb(theme.primary), color: '#ffffff' }}>
                  <th className="py-1.5 px-2.5 font-bold">Feature Name</th>
                  <th className="py-1.5 px-2 font-bold">Type</th>
                  <th className="py-1.5 px-2 font-bold">Unique</th>
                  <th className="py-1.5 px-2 font-bold">Nulls (%)</th>
                  <th className="py-1.5 px-2 font-bold">Mean (μ)</th>
                  <th className="py-1.5 px-2 font-bold">Median</th>
                  <th className="py-1.5 px-2 font-bold">StdDev (σ)</th>
                  {isFullAudit && <th className="py-1.5 px-2 font-bold">Q1 / Q3</th>}
                  <th className="py-1.5 px-2 font-bold">Range [Min - Max]</th>
                </tr>
              </thead>
              <tbody>
                {page2Columns.map(({ meta, stats }, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? '#ffffff' : rgb(theme.calloutBg);
                  const nullStr = stats.nullCount > 0 ? `${stats.nullCount} (${round(stats.nullPercentage, 1)}%)` : '0';
                  const meanStr = stats.mean !== undefined ? `${round(stats.mean, 2)}` : '-';
                  const medStr = stats.median !== undefined ? `${round(stats.median, 2)}` : '-';
                  const sdStr = stats.stdDev !== undefined ? `${round(stats.stdDev, 2)}` : '-';
                  const rangeStr = stats.min !== undefined && stats.max !== undefined ? `[${round(stats.min, 1)}, ${round(stats.max, 1)}]` : '-';
                  const qStr = stats.q1 !== undefined && stats.q3 !== undefined ? `${round(stats.q1, 1)} / ${round(stats.q3, 1)}` : '-';

                  return (
                    <tr key={meta.id} style={{ backgroundColor: rowBg, color: rgb(theme.textDark) }} className="border-t" >
                      <td className="py-1.5 px-2.5 font-semibold">{meta.name}</td>
                      <td className="py-1.5 px-2 uppercase font-mono text-[8.5px] opacity-75">{meta.type}</td>
                      <td className="py-1.5 px-2">{stats.uniqueCount}</td>
                      <td className="py-1.5 px-2">{nullStr}</td>
                      <td className="py-1.5 px-2 font-mono">{meanStr}</td>
                      <td className="py-1.5 px-2 font-mono">{medStr}</td>
                      <td className="py-1.5 px-2 font-mono">{sdStr}</td>
                      {isFullAudit && <td className="py-1.5 px-2 font-mono">{qStr}</td>}
                      <td className="py-1.5 px-2 font-mono">{rangeStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dominant Bivariate Correlations Table */}
      {includeCorrelations && correlationHighlights.length > 0 && (
        <div className="mb-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: rgb(theme.primary) }}>
            Dominant Bivariate Correlation Drivers (Pearson r)
          </div>

          <div className="rounded-lg overflow-hidden border" style={{ borderColor: rgb(theme.border) }}>
            <table className="w-full text-left border-collapse text-[9.5px]">
              <thead>
                <tr style={{ backgroundColor: rgb(theme.secondary), color: '#ffffff' }}>
                  <th className="py-1.5 px-2.5 font-bold">Relationship (Feature A ↔ Feature B)</th>
                  <th className="py-1.5 px-2 font-bold">Correlation (r)</th>
                  <th className="py-1.5 px-2 font-bold">Direction</th>
                  <th className="py-1.5 px-2 font-bold">Strength Level</th>
                </tr>
              </thead>
              <tbody>
                {correlationHighlights.slice(0, 6).map((h, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : rgb(theme.calloutBg) }} className="border-t">
                    <td className="py-1.5 px-2.5 font-semibold">{h.colA} ↔ {h.colB}</td>
                    <td className="py-1.5 px-2 font-mono font-bold">{h.correlation > 0 ? `+${h.correlation}` : h.correlation}</td>
                    <td className="py-1.5 px-2">{h.direction === 'positive' ? 'Direct (+) Covariance' : 'Inverse (-) Covariance'}</td>
                    <td className="py-1.5 px-2 font-semibold" style={{ color: rgb(theme.accent) }}>{h.strength}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categorical Breakdown */}
      {includeCategorical && catColumns.length > 0 && (
        <div className="mb-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: rgb(theme.primary) }}>
            Key Categorical Factor Distributions
          </div>

          <div className="rounded-lg overflow-hidden border" style={{ borderColor: rgb(theme.border) }}>
            <table className="w-full text-left border-collapse text-[9.5px]">
              <thead>
                <tr style={{ backgroundColor: rgb(theme.accent), color: '#ffffff' }}>
                  <th className="py-1.5 px-2.5 font-bold">Categorical Attribute</th>
                  <th className="py-1.5 px-2 font-bold">Distinct Levels</th>
                  <th className="py-1.5 px-2 font-bold">Dominant Category (Mode)</th>
                  <th className="py-1.5 px-2 font-bold">Frequency</th>
                  <th className="py-1.5 px-2 font-bold">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {catColumns.slice(0, 5).map((col, i) => {
                  const s = columnStats.find(cs => cs.meta.id === col.id)?.stats;
                  const top = s?.topValues?.[0];
                  return (
                    <tr key={col.id} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : rgb(theme.calloutBg) }} className="border-t">
                      <td className="py-1.5 px-2.5 font-semibold">{col.name}</td>
                      <td className="py-1.5 px-2">{s?.uniqueCount || 0} unique</td>
                      <td className="py-1.5 px-2 font-medium">{top ? top.value : '-'}</td>
                      <td className="py-1.5 px-2 font-mono">{top ? top.count.toLocaleString() : '-'}</td>
                      <td className="py-1.5 px-2 font-mono font-bold">{top ? `${round(top.percentage, 1)}%` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations Box */}
      {includeRecommendations && (
        <div 
          className="p-3.5 rounded-lg border mb-4"
          style={{ backgroundColor: rgb(theme.calloutBg), borderColor: rgb(theme.border) }}
        >
          <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: rgb(theme.secondary) }}>
            Strategic Action Items &amp; Analytical Next Steps
          </div>
          <div className="text-[10px] text-slate-700 space-y-1 leading-relaxed">
            <p>1. <strong>Predictive Regression Modeling:</strong> Deploy linear regression models across top identified correlation drivers to formulate predictive elasticity equations.</p>
            <p>2. <strong>Population Segmentation:</strong> Execute unsupervised K-Means cohort clustering (k = 3 or 4) on primary continuous and categorical features.</p>
            <p>3. <strong>Continuous Drift Auditing:</strong> Establish automated schema and distribution drift monitors to alert upon statistical deviation &gt; 2.0 standard errors.</p>
          </div>
        </div>
      )}

      {/* Governance & Privacy Audit Seal */}
      {includePrivacyStamp && (
        <div 
          className="p-2.5 rounded-lg border mb-3 flex items-center gap-2 text-[9.5px]"
          style={{
            backgroundColor: piiScan.detections.length > 0 ? '#fef3c7' : '#ecfdf5',
            borderColor: piiScan.detections.length > 0 ? '#f59e0b' : '#a7f3d0',
            color: piiScan.detections.length > 0 ? '#92400e' : '#065f46',
          }}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <div>
            <strong>GOVERNANCE &amp; PRIVACY AUDIT STAMP: </strong>
            <span>
              {piiScan.detections.length > 0
                ? `Privacy Guard Active: ${piiScan.detections.length} sensitive attributes identified. Masking recommended upon distribution.`
                : 'Privacy Hygiene Verified: Zero high-risk unmasked PII attributes identified in this dataset audit.'}
            </span>
          </div>
        </div>
      )}

      {renderRunningFooter(2)}
    </div>
  );

  // PAGE 3 CONTENT (If extra columns exist in full audit)
  const renderPage3 = () => (
    <div 
      className="bg-white text-slate-900 rounded-sm shadow-2xl relative flex flex-col mx-auto p-8 border border-slate-200 select-text transition-transform"
      style={{
        width: `${baseWidth}px`,
        minHeight: `${baseHeight}px`,
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {renderRunningHeader(3)}

      <div className="mb-4">
        <div className="text-[10.5px] font-bold uppercase tracking-wider mb-2" style={{ color: rgb(theme.primary) }}>
          Extended Feature Space Registry
        </div>

        <div className="rounded-lg overflow-hidden border mb-4" style={{ borderColor: rgb(theme.border) }}>
          <table className="w-full text-left border-collapse text-[9.5px]">
            <thead>
              <tr style={{ backgroundColor: rgb(theme.primary), color: '#ffffff' }}>
                <th className="py-1.5 px-2.5 font-bold">Feature Name</th>
                <th className="py-1.5 px-2 font-bold">Type</th>
                <th className="py-1.5 px-2 font-bold">Unique</th>
                <th className="py-1.5 px-2 font-bold">Nulls (%)</th>
                <th className="py-1.5 px-2 font-bold">Mean (μ)</th>
                <th className="py-1.5 px-2 font-bold">Median</th>
                <th className="py-1.5 px-2 font-bold">StdDev (σ)</th>
                {isFullAudit && <th className="py-1.5 px-2 font-bold">Q1 / Q3</th>}
                <th className="py-1.5 px-2 font-bold">Range [Min - Max]</th>
              </tr>
            </thead>
            <tbody>
              {page3Columns.map(({ meta, stats }, idx) => {
                const isEven = idx % 2 === 0;
                const rowBg = isEven ? '#ffffff' : rgb(theme.calloutBg);
                const nullStr = stats.nullCount > 0 ? `${stats.nullCount} (${round(stats.nullPercentage, 1)}%)` : '0';
                const meanStr = stats.mean !== undefined ? `${round(stats.mean, 2)}` : '-';
                const medStr = stats.median !== undefined ? `${round(stats.median, 2)}` : '-';
                const sdStr = stats.stdDev !== undefined ? `${round(stats.stdDev, 2)}` : '-';
                const rangeStr = stats.min !== undefined && stats.max !== undefined ? `[${round(stats.min, 1)}, ${round(stats.max, 1)}]` : '-';
                const qStr = stats.q1 !== undefined && stats.q3 !== undefined ? `${round(stats.q1, 1)} / ${round(stats.q3, 1)}` : '-';

                return (
                  <tr key={meta.id} style={{ backgroundColor: rowBg, color: rgb(theme.textDark) }} className="border-t" >
                    <td className="py-1.5 px-2.5 font-semibold">{meta.name}</td>
                    <td className="py-1.5 px-2 uppercase font-mono text-[8.5px] opacity-75">{meta.type}</td>
                    <td className="py-1.5 px-2">{stats.uniqueCount}</td>
                    <td className="py-1.5 px-2">{nullStr}</td>
                    <td className="py-1.5 px-2 font-mono">{meanStr}</td>
                    <td className="py-1.5 px-2 font-mono">{medStr}</td>
                    <td className="py-1.5 px-2 font-mono">{sdStr}</td>
                    {isFullAudit && <td className="py-1.5 px-2 font-mono">{qStr}</td>}
                    <td className="py-1.5 px-2 font-mono">{rangeStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {renderRunningFooter(3)}
    </div>
  );

  return (
    <div 
      className="w-full flex flex-col items-center justify-start gap-8 py-4 px-2"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
        transition: 'transform 0.15s ease-out',
      }}
    >
      {viewMode === 'continuous' ? (
        <>
          {renderPage1()}
          {totalCalculatedPages >= 2 && renderPage2()}
          {totalCalculatedPages >= 3 && renderPage3()}
        </>
      ) : (
        <>
          {activePage === 1 && renderPage1()}
          {activePage === 2 && renderPage2()}
          {activePage === 3 && renderPage3()}
        </>
      )}
    </div>
  );
};
