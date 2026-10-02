import { Dataset } from '../types';
import { round } from './statistics';
import { scanDatasetForPii } from './piiEngine';

export interface DatasheetMetadata {
  title: string;
  version: string;
  author: string;
  organization: string;
  license: string;
  fundingGrant: string;
  createdAt: string;
  lastUpdated: string;
  
  // Section 1: Motivation
  purposeAndMotivation: string;
  creatorsAndFunders: string;
  
  // Section 2: Composition
  instanceRepresentation: string;
  instanceCount: number;
  attributeCount: number;
  missingDataSummary: string;
  confidentialOrSensitiveAttributes: string;
  
  // Section 3: Collection Process
  collectionMechanism: string;
  participantConsentNotice: string;
  samplingStrategy: string;
  collectionTimeframe: string;
  
  // Section 4: Preprocessing & Data Hygiene
  preprocessingSteps: string;
  imputationApplied: string;
  anonymizationTechniques: string;
  
  // Section 5: Uses & Limitations
  recommendedTasks: string;
  prohibitedOrDiscouragedUses: string;
  biasesOrLimitations: string;
  
  // Section 6: Maintenance & Distribution
  contactEmail: string;
  retentionPolicy: string;
  hostingEnvironment: string;
}

/**
 * Automatically inspects dataset to initialize a pre-populated Gebru-compliant Datasheet
 */
export function generateDefaultDatasheet(dataset: Dataset): DatasheetMetadata {
  const rowCount = dataset.data.length;
  const colCount = dataset.columns.length;

  // Audit missing values
  let totalCells = rowCount * colCount;
  let missingCells = 0;
  dataset.data.forEach(row => {
    dataset.columns.forEach(col => {
      const v = row[col.name];
      if (v === null || v === undefined || v === '') {
        missingCells++;
      }
    });
  });
  const completeness = totalCells > 0 ? round(((totalCells - missingCells) / totalCells) * 100, 1) : 100;

  // Audit PII presence
  const piiScan = scanDatasetForPii(dataset);
  const sensitiveAttrs = piiScan.detections.map(d => `${d.column} (${d.type})`).join(', ') || 'None detected (Audited Clean)';

  return {
    title: `Datasheet for Dataset: ${dataset.name}`,
    version: '1.0.0',
    author: 'Primary Investigator & Analytics Lead',
    organization: 'Remix Research & Enterprise Analytics',
    license: 'CC-BY-4.0 (Attribution) / Restricted Research License',
    fundingGrant: 'Internal R&D / Institutional Research Grant',
    createdAt: dataset.createdAt || new Date().toISOString(),
    lastUpdated: dataset.updatedAt || new Date().toISOString(),

    // Motivation
    purposeAndMotivation: `This dataset was assembled to support quantitative and qualitative inquiry, statistical hypothesis testing, cohort longitudinal tracking, and predictive modeling for '${dataset.name}'.`,
    creatorsAndFunders: 'Collected and curated by the designated research team using Remix DataHub collection and telemetry interfaces.',

    // Composition
    instanceRepresentation: `Each instance in this dataset represents an individual observation, respondent survey submission, or experimental measurement comprising ${colCount} measured features.`,
    instanceCount: rowCount,
    attributeCount: colCount,
    missingDataSummary: `${missingCells.toLocaleString()} missing or null values observed across the corpus (${round(100 - completeness, 1)}% missingness, overall completeness: ${completeness}%).`,
    confidentialOrSensitiveAttributes: sensitiveAttrs,

    // Collection Process
    collectionMechanism: 'Digitally acquired via standardized structured digital forms, authenticated CSV/Excel file uploads, or observational sensor feeds.',
    participantConsentNotice: 'Informed consent obtained prior to questionnaire progression where applicable. Minors and vulnerable populations require guardian assent.',
    samplingStrategy: 'Stratified randomized survey sampling with voluntary response participation.',
    collectionTimeframe: 'Initial ingest recorded; continuous telemetry updates active in DataHub workspace.',

    // Preprocessing & Data Hygiene
    preprocessingSteps: 'Categorical type casting, whitespace trimming, duplicate record deduplication, and anomaly boundary validation applied.',
    imputationApplied: 'Deterministic median imputation for numeric attributes; mode imputation for categorical attributes where necessary.',
    anonymizationTechniques: piiScan.isClean 
      ? 'Zero direct PII detected. Column values audited for GDPR Article 32 compliance.'
      : `Sensitive columns (${sensitiveAttrs}) flagged for deterministic cryptographic hashing or partial masking prior to external distribution.`,

    // Uses & Limitations
    recommendedTasks: 'Cross-sectional hypothesis testing, descriptive statistics, demographic cohort segment comparisons, regression modeling, and survey frequency cross-tabulation.',
    prohibitedOrDiscouragedUses: 'Do NOT use for automated individual credit denial, punitive employment sanctions, or high-stakes clinical interventions without secondary verification.',
    biasesOrLimitations: 'Voluntary sampling response bias may skew demographic distributions towards tech-literate populations. Self-reported measurements may contain recall bias.',

    // Maintenance & Distribution
    contactEmail: 'research-governance@remixdatahub.internal',
    retentionPolicy: 'Retained for 5 years post-study publication in accordance with standard IRB / institutional governance standards.',
    hostingEnvironment: 'Encrypted cloud storage with role-based access control and client-side isolation.',
  };
}

/**
 * Converts a Datasheet into Markdown representation
 */
export function exportDatasheetToMarkdown(meta: DatasheetMetadata): string {
  return `# ${meta.title}
**Version:** ${meta.version} | **Last Updated:** ${meta.lastUpdated.split('T')[0]}  
**Organization:** ${meta.organization} | **Author:** ${meta.author}  
**License:** ${meta.license} | **Contact:** ${meta.contactEmail}

---

## 1. Motivation
* **Purpose:** ${meta.purposeAndMotivation}
* **Creators & Funding:** ${meta.creatorsAndFunders}
* **Funding Grant / Project Code:** ${meta.fundingGrant}

## 2. Composition
* **Instance Representation:** ${meta.instanceRepresentation}
* **Total Instances (Rows):** ${meta.instanceCount.toLocaleString()}
* **Total Features (Columns):** ${meta.attributeCount}
* **Missing Data & Completeness:** ${meta.missingDataSummary}
* **Confidential / Sensitive Features:** ${meta.confidentialOrSensitiveAttributes}

## 3. Collection Process
* **Collection Mechanism:** ${meta.collectionMechanism}
* **Sampling Strategy:** ${meta.samplingStrategy}
* **Participant Consent:** ${meta.participantConsentNotice}
* **Timeframe:** ${meta.collectionTimeframe}

## 4. Preprocessing & Data Hygiene
* **Cleaning & Filtering:** ${meta.preprocessingSteps}
* **Missing Value Imputation:** ${meta.imputationApplied}
* **Anonymization & Privacy:** ${meta.anonymizationTechniques}

## 5. Uses & Limitations
* **Intended Tasks:** ${meta.recommendedTasks}
* **Discouraged / Prohibited Uses:** ${meta.prohibitedOrDiscouragedUses}
* **Known Biases & Limits:** ${meta.biasesOrLimitations}

## 6. Distribution & Maintenance
* **Hosting Environment:** ${meta.hostingEnvironment}
* **Retention Policy:** ${meta.retentionPolicy}
* **Governance Contact:** ${meta.contactEmail}

---
*Generated according to Gebru et al. (2021) 'Datasheets for Datasets' standardized specification via Remix DataHub.*
`;
}
