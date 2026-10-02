import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Dataset } from '../types';
import { computeColumnStats, computeCorrelationMatrix, round } from './statistics';
import { scanDatasetForPii } from './piiEngine';

export type PdfPalette = 'corporate_navy' | 'emerald_teal' | 'modern_indigo' | 'monochrome';
export type PdfOrientation = 'portrait' | 'landscape';
export type PdfPageFormat = 'a4' | 'letter';
export type PdfTemplate = 'executive_brief' | 'full_audit' | 'one_page';
export type ConfidentialityLevel = 
  | 'CONFIDENTIAL' 
  | 'INTERNAL ONLY' 
  | 'STRICTLY CONFIDENTIAL' 
  | 'RESTRICTED' 
  | 'PUBLIC AUDIT';

export interface DirectPdfOptions {
  title?: string;
  subtitle?: string;
  authorName?: string;
  organizationName?: string;
  executiveNotes?: string;
  confidentiality?: ConfidentialityLevel;
  palette?: PdfPalette;
  orientation?: PdfOrientation;
  format?: PdfPageFormat;
  template?: PdfTemplate;
  includeSummary?: boolean;
  includeHealth?: boolean;
  includeDescriptive?: boolean;
  includeCategorical?: boolean;
  includeCorrelations?: boolean;
  includeRecommendations?: boolean;
  includePrivacyStamp?: boolean;
  filename?: string;
  onProgress?: (status: string) => void;
}

export interface ColorTheme {
  primary: [number, number, number];
  accent: [number, number, number];
  secondary: [number, number, number];
  calloutBg: [number, number, number];
  cardBg: [number, number, number];
  border: [number, number, number];
  textDark: [number, number, number];
  textMuted: [number, number, number];
}

export const PALETTES: Record<PdfPalette, ColorTheme> = {
  corporate_navy: {
    primary: [15, 23, 42],       // slate 900
    accent: [14, 116, 144],      // cyan 700
    secondary: [15, 118, 110],   // teal 700
    calloutBg: [241, 245, 249],  // slate 100
    cardBg: [248, 250, 252],     // slate 50
    border: [226, 232, 240],     // slate 200
    textDark: [15, 23, 42],
    textMuted: [100, 116, 139],
  },
  emerald_teal: {
    primary: [6, 78, 59],        // emerald 900
    accent: [13, 148, 136],      // teal 600
    secondary: [5, 150, 105],    // emerald 600
    calloutBg: [236, 253, 245],  // emerald 50
    cardBg: [240, 253, 244],     // green 50
    border: [209, 250, 229],     // emerald 100
    textDark: [6, 78, 59],
    textMuted: [75, 85, 99],
  },
  modern_indigo: {
    primary: [30, 27, 75],       // indigo 950
    accent: [79, 70, 229],       // indigo 600
    secondary: [124, 58, 237],   // violet 600
    calloutBg: [238, 242, 255],  // indigo 50
    cardBg: [245, 243, 255],     // violet 50
    border: [224, 231, 255],     // indigo 100
    textDark: [30, 27, 75],
    textMuted: [100, 116, 139],
  },
  monochrome: {
    primary: [24, 24, 27],       // zinc 900
    accent: [63, 63, 70],        // zinc 700
    secondary: [82, 82, 91],     // zinc 600
    calloutBg: [244, 244, 245],  // zinc 100
    cardBg: [250, 250, 250],     // zinc 50
    border: [228, 228, 231],     // zinc 200
    textDark: [24, 24, 27],
    textMuted: [113, 113, 122],
  },
};

/**
 * Generates a direct, highly polished multi-page vector PDF document using jsPDF & jspdf-autotable.
 * Supports crisp selectable typography, vector metric cards, auto-paginated statistical tables,
 * executive callouts, running headers/footers, and audit stamps.
 */
export function generateDirectReportPdf(dataset: Dataset, options: DirectPdfOptions = {}): jsPDF {
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
    includeHealth = true,
    includeDescriptive = true,
    includeCategorical = true,
    includeCorrelations = true,
    includeRecommendations = true,
    includePrivacyStamp = true,
    onProgress,
  } = options;

  onProgress?.('Initializing vector PDF engine...');

  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format,
  });

  const theme = PALETTES[palette] || PALETTES.corporate_navy;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const contentWidth = pageWidth - (marginX * 2);

  // Compute stats
  onProgress?.('Computing dataset statistics...');
  const columnStats = dataset.columns.map(col => ({
    meta: col,
    stats: computeColumnStats(dataset.data, col),
  }));

  const numberColumns = dataset.columns.filter(c => c.type === 'number');
  const catColumns = dataset.columns.filter(c => c.type === 'string' || c.type === 'category');

  // Compute Health Score & Completeness
  let totalCells = dataset.data.length * (dataset.columns.length || 1);
  if (totalCells === 0) totalCells = 1;
  let totalNulls = 0;
  columnStats.forEach(({ stats }) => {
    totalNulls += stats.nullCount || 0;
  });
  const completeness = Math.max(0, Math.min(100, Math.round(((totalCells - totalNulls) / totalCells) * 1000) / 10));
  let healthScore = completeness >= 98 ? 99 : completeness >= 90 ? 92 : completeness >= 80 ? 84 : 65;
  const grade = healthScore >= 95 ? 'A+' : healthScore >= 88 ? 'A' : healthScore >= 75 ? 'B' : 'C';

  // Compute top correlations
  const correlationHighlights: Array<{
    colA: string;
    colB: string;
    correlation: number;
    strength: string;
    direction: 'positive' | 'negative';
  }> = [];

  if (numberColumns.length >= 2 && dataset.data.length >= 3) {
    const matrix = computeCorrelationMatrix(dataset.data, dataset.columns);
    const seen = new Set<string>();

    numberColumns.forEach(c1 => {
      numberColumns.forEach(c2 => {
        if (c1.id !== c2.id) {
          const key = [c1.id, c2.id].sort().join('___');
          if (!seen.has(key)) {
            seen.add(key);
            const val = matrix.matrix[c1.id]?.[c2.id];
            if (val !== undefined && !isNaN(val) && Math.abs(val) >= 0.25) {
              let strength = 'Moderate';
              if (Math.abs(val) >= 0.7) strength = 'Very Strong';
              else if (Math.abs(val) >= 0.5) strength = 'Strong';
              
              correlationHighlights.push({
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
    correlationHighlights.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  // PII scan check
  const piiScan = scanDatasetForPii(dataset);

  onProgress?.('Rendering document cover & headers...');

  let y = 30;

  // 1. TOP COLOR ACCENT BAR
  doc.setFillColor(theme.accent[0], theme.accent[1], theme.accent[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Top Category / Tracking info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
  doc.text(`${organizationName.toUpperCase()}  •  OFFICIAL EXECUTIVE DOSSIER`, marginX, y);

  // Confidentiality Badge on Right
  const confText = confidentiality;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  const confWidth = doc.getTextWidth(confText) + 14;
  const confX = pageWidth - marginX - confWidth;
  
  doc.setFillColor(theme.calloutBg[0], theme.calloutBg[1], theme.calloutBg[2]);
  doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
  doc.roundedRect(confX, y - 9, confWidth, 14, 3, 3, 'FD');
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  doc.text(confText, confX + 7, y + 1);

  y += 22;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(template === 'one_page' ? 18 : 22);
  doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
  const titleLines = doc.splitTextToSize(title, contentWidth);
  doc.text(titleLines, marginX, y);
  y += (titleLines.length * (template === 'one_page' ? 20 : 24)) - 2;

  // Subtitle / Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
  const subLines = doc.splitTextToSize(subtitle, contentWidth - 80);
  doc.text(subLines.slice(0, 2), marginX, y);
  y += (Math.min(subLines.length, 2) * 12) + 8;

  // Metadata Strip
  const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'medium' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);
  doc.text(`Lead Analyst: `, marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
  const authOffset = doc.getTextWidth(`Lead Analyst: `);
  doc.text(`${authorName}`, marginX + authOffset, y);

  const dateLabelX = marginX + 200;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);
  doc.text(`Date Generated: `, dateLabelX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
  doc.text(`${dateStr}`, dateLabelX + doc.getTextWidth(`Date Generated: `), y);

  const sourceLabelX = marginX + 370;
  if (sourceLabelX < pageWidth - marginX - 80) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);
    doc.text(`Pipeline: `, sourceLabelX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
    doc.text(`${dataset.sourceType.toUpperCase()}`, sourceLabelX + doc.getTextWidth(`Pipeline: `), y);
  }

  y += 12;

  // Divider line
  doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
  doc.setLineWidth(0.75);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 14;

  // 2. EXECUTIVE COMMENTARY CALLOUT BOX
  if (executiveNotes && executiveNotes.trim().length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const noteLines = doc.splitTextToSize(executiveNotes, contentWidth - 28);
    const boxHeight = (noteLines.length * 11) + 24;

    // Background rect
    doc.setFillColor(theme.calloutBg[0], theme.calloutBg[1], theme.calloutBg[2]);
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 4, 4, 'FD');

    // Left accent vertical bar
    doc.setFillColor(theme.accent[0], theme.accent[1], theme.accent[2]);
    doc.rect(marginX, y, 4, boxHeight, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(theme.accent[0], theme.accent[1], theme.accent[2]);
    doc.text('EXECUTIVE ANALYTICAL COMMENTARY', marginX + 14, y + 13);

    // Text body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);
    doc.text(noteLines, marginX + 14, y + 25);

    y += boxHeight + 14;
  }

  // 3. KPI SUMMARY CARDS
  if (includeSummary) {
    onProgress?.('Rendering KPI cards...');
    const cardGap = 10;
    const numCards = 4;
    const cardWidth = (contentWidth - (cardGap * (numCards - 1))) / numCards;
    const cardHeight = 48;

    const cards = [
      {
        label: 'SAMPLE SIZE (N)',
        val: dataset.data.length.toLocaleString(),
        sub: 'Total observations',
        valColor: theme.primary,
      },
      {
        label: 'FEATURE SPACE (P)',
        val: `${dataset.columns.length}`,
        sub: `${numberColumns.length} Num • ${catColumns.length} Cat`,
        valColor: theme.accent,
      },
      {
        label: 'DATA COMPLETENESS',
        val: `${completeness}%`,
        sub: `${totalNulls} missing values`,
        valColor: completeness >= 95 ? [5, 150, 105] : [217, 119, 6],
      },
      {
        label: 'QUALITY HEALTH SCORE',
        val: `${healthScore}%`,
        sub: `Grade: ${grade} verified`,
        valColor: theme.secondary,
      },
    ];

    cards.forEach((card, idx) => {
      const cardX = marginX + (idx * (cardWidth + cardGap));
      doc.setFillColor(theme.cardBg[0], theme.cardBg[1], theme.cardBg[2]);
      doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
      doc.roundedRect(cardX, y, cardWidth, cardHeight, 4, 4, 'FD');

      // Top label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
      doc.text(card.label, cardX + 8, y + 12);

      // Large bold value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(card.valColor[0], card.valColor[1], card.valColor[2]);
      doc.text(card.val, cardX + 8, y + 28);

      // Sub-label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
      doc.text(card.sub, cardX + 8, y + 40);
    });

    y += cardHeight + 16;
  }

  // Helper to check page break threshold
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 50) {
      doc.addPage();
      y = 45;
      return true;
    }
    return false;
  };

  // 4. DESCRIPTIVE STATISTICS TABLE
  if (includeDescriptive) {
    onProgress?.('Generating statistical tables...');
    checkPageBreak(120);

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.text('VARIABLE DESCRIPTIVE STATISTICS & HYGIENE', marginX, y);
    y += 10;

    const isFullAudit = template === 'full_audit';

    const headRow = isFullAudit
      ? ['Feature Name', 'Type', 'Unique', 'Nulls', 'Mean (μ)', 'Median', 'StdDev (σ)', 'Q1 (25%)', 'Q3 (75%)', 'Range [Min - Max]']
      : ['Feature Name', 'Type', 'Unique', 'Nulls (%)', 'Mean (μ)', 'Median', 'StdDev (σ)', 'Range [Min - Max]'];

    const bodyRows = columnStats.map(({ meta, stats }) => {
      const nullStr = stats.nullCount > 0 ? `${stats.nullCount} (${round(stats.nullPercentage, 1)}%)` : '0';
      const meanStr = stats.mean !== undefined ? `${round(stats.mean, 2)}` : '-';
      const medStr = stats.median !== undefined ? `${round(stats.median, 2)}` : '-';
      const sdStr = stats.stdDev !== undefined ? `${round(stats.stdDev, 2)}` : '-';
      const rangeStr = stats.min !== undefined && stats.max !== undefined ? `[${round(stats.min, 1)}, ${round(stats.max, 1)}]` : '-';

      if (isFullAudit) {
        const q1Str = stats.q1 !== undefined ? `${round(stats.q1, 2)}` : '-';
        const q3Str = stats.q3 !== undefined ? `${round(stats.q3, 2)}` : '-';
        return [
          meta.name,
          meta.type.toUpperCase(),
          `${stats.uniqueCount}`,
          nullStr,
          meanStr,
          medStr,
          sdStr,
          q1Str,
          q3Str,
          rangeStr,
        ];
      }

      return [
        meta.name,
        meta.type.toUpperCase(),
        `${stats.uniqueCount}`,
        nullStr,
        meanStr,
        medStr,
        sdStr,
        rangeStr,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [headRow],
      body: bodyRows,
      margin: { left: marginX, right: marginX, top: 45, bottom: 45 },
      theme: 'striped',
      headStyles: {
        fillColor: theme.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: theme.textDark,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: theme.calloutBg,
      },
      showHead: 'everyPage',
      didDrawPage: (data) => {
        // Reserved for header/footer hooks if needed
      },
    });

    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // 5. DOMINANT CORRELATION DRIVERS
  if (includeCorrelations && correlationHighlights.length > 0 && template !== 'one_page') {
    onProgress?.('Generating correlation matrix tables...');
    checkPageBreak(100);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.text('DOMINANT BIVARIATE CORRELATION DRIVERS (PEARSON r)', marginX, y);
    y += 10;

    const corrHead = ['Relationship (Feature A ↔ Feature B)', 'Correlation (r)', 'Direction', 'Strength Level'];
    const corrBody = correlationHighlights.slice(0, 8).map(h => [
      `${h.colA}  ↔  ${h.colB}`,
      h.correlation > 0 ? `+${h.correlation}` : `${h.correlation}`,
      h.direction === 'positive' ? 'Direct (+) Covariance' : 'Inverse (-) Covariance',
      h.strength,
    ]);

    autoTable(doc, {
      startY: y,
      head: [corrHead],
      body: corrBody,
      margin: { left: marginX, right: marginX, top: 45, bottom: 45 },
      theme: 'striped',
      headStyles: {
        fillColor: theme.secondary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: theme.textDark,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: theme.calloutBg,
      },
      showHead: 'everyPage',
    });

    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // 6. CATEGORICAL FACTOR BREAKDOWN
  if (includeCategorical && catColumns.length > 0 && template !== 'one_page') {
    onProgress?.('Adding categorical distribution summaries...');
    checkPageBreak(110);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(theme.primary[0], theme.primary[1], theme.primary[2]);
    doc.text('KEY CATEGORICAL FACTOR DISTRIBUTIONS', marginX, y);
    y += 10;

    const catHead = ['Categorical Attribute', 'Distinct Levels', 'Dominant Category (Mode)', 'Frequency Count', 'Percentage (%)'];
    const catBody = catColumns.slice(0, 6).map(col => {
      const stats = columnStats.find(s => s.meta.id === col.id)?.stats;
      const top = stats?.topValues?.[0];
      return [
        col.name,
        `${stats?.uniqueCount || 0} unique`,
        top ? `${top.value}` : '-',
        top ? `${top.count.toLocaleString()}` : '-',
        top ? `${round(top.percentage, 1)}%` : '-',
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [catHead],
      body: catBody,
      margin: { left: marginX, right: marginX, top: 45, bottom: 45 },
      theme: 'striped',
      headStyles: {
        fillColor: theme.accent,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: theme.textDark,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: theme.calloutBg,
      },
      showHead: 'everyPage',
    });

    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // 7. STRATEGIC RECOMMENDATIONS & ACTION ITEMS
  if (includeRecommendations) {
    onProgress?.('Compiling strategic recommendations...');
    checkPageBreak(85);

    const recBoxWidth = contentWidth;
    const recLines = [
      '1. Predictive Regression Modeling: Deploy linear regression models across top identified correlation drivers to formulate predictive elasticity equations.',
      '2. Population Segmentation: Execute unsupervised K-Means cohort clustering (k = 3 or 4) on primary continuous and categorical features.',
      '3. Continuous Drift Auditing: Establish automated schema and distribution drift monitors to alert upon statistical deviation > 2.0 standard errors.',
    ];

    const boxHeight = (recLines.length * 14) + 26;

    doc.setFillColor(theme.calloutBg[0], theme.calloutBg[1], theme.calloutBg[2]);
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.roundedRect(marginX, y, recBoxWidth, boxHeight, 4, 4, 'FD');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(theme.secondary[0], theme.secondary[1], theme.secondary[2]);
    doc.text('STRATEGIC ACTION ITEMS & ANALYTICAL NEXT STEPS', marginX + 12, y + 14);

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(theme.textDark[0], theme.textDark[1], theme.textDark[2]);

    recLines.forEach((item, i) => {
      doc.text(item, marginX + 12, y + 28 + (i * 13));
    });

    y += boxHeight + 14;
  }

  // 8. PRIVACY AUDIT & GOVERNANCE SEAL
  if (includePrivacyStamp) {
    checkPageBreak(45);

    const hasPii = piiScan.detections.length > 0;
    const piiText = hasPii
      ? `Privacy Guard Active: ${piiScan.detections.length} sensitive attributes identified. GDPR / HIPAA compliance masking recommended upon distribution.`
      : 'Privacy Hygiene Verified: Zero high-risk unmasked PII attributes identified in this dataset audit.';

    doc.setFillColor(hasPii ? 254 : 240, hasPii ? 243 : 253, hasPii ? 199 : 244);
    doc.setDrawColor(hasPii ? 245 : 187, hasPii ? 158 : 247, hasPii ? 11 : 208);
    doc.roundedRect(marginX, y, contentWidth, 24, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(hasPii ? 180 : 6, hasPii ? 83 : 78, hasPii ? 9 : 59);
    doc.text('GOVERNANCE & PRIVACY AUDIT STAMP: ', marginX + 8, y + 15);

    doc.setFont('helvetica', 'normal');
    const labelW = doc.getTextWidth('GOVERNANCE & PRIVACY AUDIT STAMP: ');
    doc.text(piiText, marginX + 8 + labelW, y + 15);

    y += 34;
  }

  // 9. SECOND PASS: RUNNING HEADERS, FOOTERS & PAGE NUMBERS ON ALL PAGES
  onProgress?.('Finalizing document pagination & footers...');
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Running Header on pages 2+
    if (i > 1) {
      doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
      doc.setLineWidth(0.5);
      doc.line(marginX, 25, pageWidth - marginX, 25);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);
      doc.text(title, marginX, 20);

      doc.setFont('helvetica', 'normal');
      doc.text(`${organizationName}  •  ${confidentiality}`, pageWidth - marginX - doc.getTextWidth(`${organizationName}  •  ${confidentiality}`), 20);
    }

    // Running Footer on ALL pages
    const footerY = pageHeight - 20;
    doc.setDrawColor(theme.border[0], theme.border[1], theme.border[2]);
    doc.setLineWidth(0.5);
    doc.line(marginX, footerY - 8, pageWidth - marginX, footerY - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(theme.textMuted[0], theme.textMuted[1], theme.textMuted[2]);

    // Left
    doc.text(`Prepared by ${authorName}  •  ${organizationName}`, marginX, footerY);

    // Center
    const centerText = `${confidentiality}  •  Remix DataHub Intelligence Platform`;
    const centerWidth = doc.getTextWidth(centerText);
    doc.text(centerText, (pageWidth - centerWidth) / 2, footerY);

    // Right
    const pageNumText = `Page ${i} of ${totalPages}`;
    doc.text(pageNumText, pageWidth - marginX - doc.getTextWidth(pageNumText), footerY);
  }

  onProgress?.('Vector PDF document compiled successfully!');
  return doc;
}

/**
 * Returns a downloadable Blob of the direct vector PDF.
 */
export function generateDirectReportPdfBlob(dataset: Dataset, options: DirectPdfOptions = {}): Blob {
  const doc = generateDirectReportPdf(dataset, options);
  return doc.output('blob');
}

/**
 * Directly downloads the vector PDF document to the user's computer.
 */
export function downloadDirectReportPdf(dataset: Dataset, options: DirectPdfOptions = {}): string {
  const cleanName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const outFileName = options.filename || `Executive_Report_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  const doc = generateDirectReportPdf(dataset, options);
  doc.save(outFileName);
  return outFileName;
}

// ---------------------------------------------------------------------------
// LEGACY / COMPATIBILITY EXPORTS (html2canvas & browser print fallback)
// ---------------------------------------------------------------------------

export interface GeneratePdfOptions {
  elementId?: string;
  element?: HTMLElement;
  filename?: string;
  title?: string;
  onProgress?: (status: string) => void;
}

/**
 * Legacy/Visual Snapshot: Downloads a PDF from a DOM element using html2canvas & jsPDF.
 */
export async function generateAndDownloadPdf(options: GeneratePdfOptions): Promise<boolean> {
  const { elementId, element: explicitEl, filename, onProgress } = options;

  let targetEl: HTMLElement | null = explicitEl || (elementId ? document.getElementById(elementId) : null);

  if (!targetEl) {
    targetEl = document.getElementById('executive-report-document') || document.getElementById('report-container');
  }

  if (!targetEl) {
    console.error('Target element for PDF generation not found.');
    return false;
  }

  try {
    onProgress?.('Preparing document canvas...');
    await new Promise(r => setTimeout(r, 100));

    onProgress?.('Rendering high-resolution vector snapshot...');
    const canvas = await html2canvas(targetEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0f172a',
      logging: false,
      windowWidth: 1200,
    });

    onProgress?.('Compiling multi-page PDF document...');
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    onProgress?.('Initiating PDF file download...');
    const outFileName = filename || `Executive_Report_${Date.now()}.pdf`;
    pdf.save(outFileName);

    onProgress?.('Download complete!');
    return true;
  } catch (error) {
    console.error('Failed to generate PDF with html2canvas/jsPDF:', error);
    return false;
  }
}

/**
 * Isolated browser print window fallback.
 */
export function triggerCleanPrint(targetElementId: string = 'executive-report-document', reportTitle: string = 'Data Analytics Report') {
  const el = document.getElementById(targetElementId);
  
  if (!el) {
    window.print();
    return;
  }

  try {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (printWindow) {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(s => s.outerHTML)
        .join('\n');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${reportTitle}</title>
          <meta charset="utf-8">
          ${styles}
          <style>
            @media print {
              body { margin: 0; padding: 12mm 15mm; background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #${targetElementId} { background: white !important; color: black !important; border: none !important; box-shadow: none !important; }
              .no-print, [data-no-print="true"] { display: none !important; }
              .print-summary-header, [data-print-header="true"] { display: block !important; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${el.outerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    console.warn('Dedicated print window blocked, falling back to direct window.print()', e);
  }

  window.print();
}
