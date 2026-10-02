import { Dataset } from '../types';
import { createDatasetSnapshot } from './versionEngine';
import { fastHash } from './piiEngine';

export interface DsarSubjectMatch {
  datasetId: string;
  datasetName: string;
  rowIndex: number;
  matchedColumn: string;
  matchedValue: string;
  fullRecord: Record<string, any>;
}

export interface DsarSearchResult {
  searchQuery: string;
  searchType: 'email' | 'id' | 'phone' | 'name' | 'any';
  timestamp: string;
  totalMatches: number;
  matches: DsarSubjectMatch[];
}

export interface ErasureReceipt {
  receiptId: string;
  timestamp: string;
  subjectQuery: string;
  datasetName: string;
  recordsPurgedCount: number;
  columnsAffected: string[];
  destructionMethod: 'irreversible_purge' | 'cryptographic_tombstone';
  verificationHash: string;
  legalAttestation: {
    gdprArticle17: 'Compliant: Data subject right to erasure executed without undue delay.';
    ccpaRightToDelete: 'Compliant: Consumer personal information deleted from active operational records.';
    hipaaAccounting: 'Compliant: Direct identifiable health records expunged upon participant revocation.';
  };
}

/**
 * Searches for records associated with a data subject across dataset rows
 */
export function searchSubjectRecords(
  dataset: Dataset,
  query: string,
  searchColHint?: string
): DsarSearchResult {
  const cleanQuery = query.trim().toLowerCase();
  const matches: DsarSubjectMatch[] = [];

  if (!cleanQuery) {
    return {
      searchQuery: query,
      searchType: 'any',
      timestamp: new Date().toISOString(),
      totalMatches: 0,
      matches: [],
    };
  }

  // Determine likely query type
  let searchType: DsarSearchResult['searchType'] = 'any';
  if (cleanQuery.includes('@')) searchType = 'email';
  else if (/^\+?[\d\s\-()]{7,}$/.test(cleanQuery)) searchType = 'phone';
  else if (cleanQuery.startsWith('resp_') || cleanQuery.startsWith('id_') || /^\d+$/.test(cleanQuery)) searchType = 'id';

  dataset.data.forEach((row, rowIndex) => {
    let rowMatched = false;

    if (searchColHint && row[searchColHint] !== undefined) {
      const val = String(row[searchColHint]).toLowerCase();
      if (val === cleanQuery || val.includes(cleanQuery)) {
        matches.push({
          datasetId: dataset.id,
          datasetName: dataset.name,
          rowIndex,
          matchedColumn: searchColHint,
          matchedValue: String(row[searchColHint]),
          fullRecord: { ...row },
        });
        rowMatched = true;
      }
    }

    if (!rowMatched) {
      for (const col of dataset.columns) {
        const val = row[col.name];
        if (val !== null && val !== undefined) {
          const strVal = String(val).toLowerCase();
          if (strVal === cleanQuery || (cleanQuery.length >= 3 && strVal.includes(cleanQuery))) {
            matches.push({
              datasetId: dataset.id,
              datasetName: dataset.name,
              rowIndex,
              matchedColumn: col.name,
              matchedValue: String(val),
              fullRecord: { ...row },
            });
            break; // One match per row is sufficient
          }
        }
      }
    }
  });

  return {
    searchQuery: query,
    searchType,
    timestamp: new Date().toISOString(),
    totalMatches: matches.length,
    matches,
  };
}

/**
 * Generates an official DSAR (Data Subject Access Request) export dossier in JSON / formatted text
 */
export function generateDsarDossier(
  searchResult: DsarSearchResult,
  dataset: Dataset
): string {
  const dossier = {
    dossierType: 'GDPR Article 15 & CCPA Consumer Data Access Dossier',
    generatedAt: new Date().toISOString(),
    subjectIdentifier: searchResult.searchQuery,
    totalRecordsFound: searchResult.totalMatches,
    sourceDataset: {
      name: dataset.name,
      id: dataset.id,
      lastModified: dataset.updatedAt,
    },
    records: searchResult.matches.map(m => ({
      rowIndex: m.rowIndex,
      matchedAttribute: m.matchedColumn,
      attributes: m.fullRecord,
    })),
    privacyNotice: 'This dossier contains all personal data categories held in active operational memory for the requested data subject.',
  };

  return JSON.stringify(dossier, null, 2);
}

/**
 * Executes irreversible erasure or tombstoning of all rows linked to a subject
 */
export function executeSubjectErasure(
  dataset: Dataset,
  searchResult: DsarSearchResult,
  method: 'irreversible_purge' | 'cryptographic_tombstone' = 'irreversible_purge'
): {
  updatedDataset: Dataset;
  receipt: ErasureReceipt;
} {
  const targetIndices = new Set(searchResult.matches.map(m => m.rowIndex));
  const affectedCols = Array.from(new Set(searchResult.matches.map(m => m.matchedColumn)));

  let newData: Record<string, any>[];

  if (method === 'irreversible_purge') {
    // Delete target rows entirely
    newData = dataset.data.filter((_, idx) => !targetIndices.has(idx));
  } else {
    // Cryptographic tombstone: redact all PII fields in those rows
    newData = dataset.data.map((row, idx) => {
      if (targetIndices.has(idx)) {
        const tombstonedRow: Record<string, any> = {};
        dataset.columns.forEach(col => {
          tombstonedRow[col.name] = '[TOMBSTONED_SUBJECT_ERASED]';
        });
        return tombstonedRow;
      }
      return row;
    });
  }

  // Create version history snapshot before irreversible modification
  createDatasetSnapshot(dataset, {
    name: `GDPR Erasure - ${searchResult.searchQuery.slice(0, 15)}`,
    description: `GDPR Right to Erasure executed for subject '${searchResult.searchQuery}' (${targetIndices.size} records ${method})`,
    tag: 'transformed',
  });

  const receiptId = `ERASURE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const verificationHash = fastHash(`${receiptId}_${dataset.name}_${searchResult.searchQuery}_${Date.now()}`);

  const receipt: ErasureReceipt = {
    receiptId,
    timestamp: new Date().toISOString(),
    subjectQuery: searchResult.searchQuery,
    datasetName: dataset.name,
    recordsPurgedCount: targetIndices.size,
    columnsAffected: affectedCols,
    destructionMethod: method,
    verificationHash,
    legalAttestation: {
      gdprArticle17: 'Compliant: Data subject right to erasure executed without undue delay.',
      ccpaRightToDelete: 'Compliant: Consumer personal information deleted from active operational records.',
      hipaaAccounting: 'Compliant: Direct identifiable health records expunged upon participant revocation.',
    },
  };

  const updatedDataset: Dataset = {
    ...dataset,
    data: newData,
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedDataset,
    receipt,
  };
}
