import { Dataset, DatasetVersion, ColumnMeta } from '../types';
import { exportToCSV, exportToJSON } from './dataEngine';

/**
 * Deep clones an array of objects or column metadata
 */
export function deepCloneData<T>(item: T): T {
  return JSON.parse(JSON.stringify(item));
}

/**
 * Ensures a dataset has at least an initial baseline version (v1.0)
 */
export function getDatasetVersions(dataset: Dataset): DatasetVersion[] {
  if (dataset.versions && dataset.versions.length > 0) {
    return dataset.versions;
  }

  // Generate baseline version if none exist
  const initialVersion: DatasetVersion = {
    id: `ver_init_${dataset.id}`,
    versionNumber: 1,
    name: 'v1.0 - Initial Baseline Snapshot',
    description: dataset.description || 'Initial dataset state upon import/creation',
    createdAt: dataset.createdAt || new Date().toISOString(),
    createdBy: 'System / Ingestion',
    tag: 'initial',
    rowCount: dataset.data?.length || 0,
    columnCount: dataset.columns?.length || 0,
    columns: deepCloneData(dataset.columns || []),
    data: deepCloneData(dataset.data || []),
    changeSummary: `Baseline version with ${dataset.data?.length || 0} rows and ${dataset.columns?.length || 0} columns`,
  };

  return [initialVersion];
}

/**
 * Creates and appends a new snapshot version to the dataset
 */
export function createDatasetSnapshot(
  dataset: Dataset,
  options?: {
    name?: string;
    description?: string;
    tag?: DatasetVersion['tag'];
    createdBy?: string;
  }
): { updatedDataset: Dataset; newVersion: DatasetVersion } {
  const existingVersions = getDatasetVersions(dataset);
  const nextVersionNum = existingVersions.length + 1;

  const defaultTag: DatasetVersion['tag'] = options?.tag || 'manual_snapshot';
  const defaultName = options?.name?.trim() || `v${nextVersionNum}.0 - Snapshot (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
  
  // Calculate diff compared to last version
  const lastVersion = existingVersions[0];
  let changeSummary = `Captured state with ${dataset.data.length} rows and ${dataset.columns.length} columns.`;
  if (lastVersion) {
    const rowDiff = dataset.data.length - lastVersion.rowCount;
    const colDiff = dataset.columns.length - lastVersion.columnCount;
    const rowText = rowDiff === 0 ? '0 row change' : rowDiff > 0 ? `+${rowDiff} rows` : `${rowDiff} rows`;
    const colText = colDiff === 0 ? '0 col change' : colDiff > 0 ? `+${colDiff} cols` : `${colDiff} cols`;
    changeSummary = `${dataset.data.length} rows, ${dataset.columns.length} cols (${rowText}, ${colText})`;
  }

  const newVersion: DatasetVersion = {
    id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    versionNumber: nextVersionNum,
    name: defaultName,
    description: options?.description?.trim() || `Snapshot captured on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    createdAt: new Date().toISOString(),
    createdBy: options?.createdBy || 'Current User',
    tag: defaultTag,
    rowCount: dataset.data.length,
    columnCount: dataset.columns.length,
    columns: deepCloneData(dataset.columns),
    data: deepCloneData(dataset.data),
    changeSummary,
  };

  const updatedVersions = [newVersion, ...existingVersions];

  const updatedDataset: Dataset = {
    ...dataset,
    versions: updatedVersions,
    currentVersionId: newVersion.id,
    updatedAt: new Date().toISOString(),
  };

  return { updatedDataset, newVersion };
}

/**
 * Restores a specific version snapshot into the dataset.
 * Automatically saves a backup snapshot of current live state before restoring!
 */
export function restoreDatasetVersion(
  dataset: Dataset,
  versionId: string,
  authorName: string = 'User'
): { updatedDataset: Dataset; restoredVersion: DatasetVersion; backupVersion: DatasetVersion } {
  const existingVersions = getDatasetVersions(dataset);
  const targetVersion = existingVersions.find(v => v.id === versionId);

  if (!targetVersion) {
    throw new Error(`Snapshot version with id "${versionId}" not found.`);
  }

  // 1. Create safety backup snapshot of current state before reverting
  const backupNum = existingVersions.length + 1;
  const backupVersion: DatasetVersion = {
    id: `ver_auto_backup_${Date.now()}`,
    versionNumber: backupNum,
    name: `Auto-Backup (Pre-Rollback to v${targetVersion.versionNumber})`,
    description: `Automated safety snapshot preserved immediately prior to reverting to "${targetVersion.name}"`,
    createdAt: new Date().toISOString(),
    createdBy: `${authorName} (Safety Engine)`,
    tag: 'system',
    rowCount: dataset.data.length,
    columnCount: dataset.columns.length,
    columns: deepCloneData(dataset.columns),
    data: deepCloneData(dataset.data),
    changeSummary: `Preserved state before rolling back to v${targetVersion.versionNumber}`,
  };

  // 2. Create a new "Reverted" entry to document the restore action
  const revertRecordNum = backupNum + 1;
  const revertedVersionRecord: DatasetVersion = {
    id: `ver_revert_${Date.now()}`,
    versionNumber: revertRecordNum,
    name: `Reverted to ${targetVersion.name}`,
    description: `Restored snapshot v${targetVersion.versionNumber}.0 state (${targetVersion.rowCount} rows, ${targetVersion.columnCount} columns)`,
    createdAt: new Date().toISOString(),
    createdBy: authorName,
    tag: 'reverted',
    rowCount: targetVersion.rowCount,
    columnCount: targetVersion.columnCount,
    columns: deepCloneData(targetVersion.columns),
    data: deepCloneData(targetVersion.data),
    changeSummary: `Restored from version "${targetVersion.name}" (${targetVersion.createdAt ? new Date(targetVersion.createdAt).toLocaleDateString() : 'earlier'})`,
  };

  const updatedVersions = [revertedVersionRecord, backupVersion, ...existingVersions];

  const updatedDataset: Dataset = {
    ...dataset,
    columns: deepCloneData(targetVersion.columns),
    data: deepCloneData(targetVersion.data),
    versions: updatedVersions,
    currentVersionId: revertedVersionRecord.id,
    updatedAt: new Date().toISOString(),
    history: [
      ...(dataset.history || []),
      {
        id: `hist_${Date.now()}`,
        timestamp: new Date().toISOString(),
        operation: 'RESTORE_VERSION_SNAPSHOT',
        details: `Restored dataset to snapshot "${targetVersion.name}" (v${targetVersion.versionNumber}) with ${targetVersion.rowCount} records.`,
        affectedRowCount: targetVersion.rowCount,
      },
    ],
  };

  return { updatedDataset, restoredVersion: targetVersion, backupVersion };
}

/**
 * Deletes a snapshot version from a dataset
 */
export function deleteDatasetVersion(dataset: Dataset, versionId: string): Dataset {
  const existingVersions = getDatasetVersions(dataset);
  const filtered = existingVersions.filter(v => v.id !== versionId);

  return {
    ...dataset,
    versions: filtered.length > 0 ? filtered : undefined,
    currentVersionId: dataset.currentVersionId === versionId ? (filtered[0]?.id || undefined) : dataset.currentVersionId,
  };
}

export interface VersionDiffSummary {
  rowCountDelta: number;
  columnCountDelta: number;
  currentRows: number;
  versionRows: number;
  currentCols: number;
  versionCols: number;
  addedColumns: string[];   // in current but not in version
  removedColumns: string[]; // in version but not in current
  identicalColumns: string[];
  isIdentical: boolean;
  notes: string[];
}

/**
 * Compares the current dataset state with a saved snapshot version
 */
export function compareDatasetWithVersion(dataset: Dataset, version: DatasetVersion): VersionDiffSummary {
  const currentRows = dataset.data?.length || 0;
  const versionRows = version.rowCount || version.data?.length || 0;
  const currentCols = dataset.columns?.length || 0;
  const versionCols = version.columnCount || version.columns?.length || 0;

  const rowCountDelta = currentRows - versionRows;
  const columnCountDelta = currentCols - versionCols;

  const currentColNames = new Set((dataset.columns || []).map(c => c.name));
  const versionColNames = new Set((version.columns || []).map(c => c.name));

  const addedColumns = (dataset.columns || []).map(c => c.name).filter(name => !versionColNames.has(name));
  const removedColumns = (version.columns || []).map(c => c.name).filter(name => !currentColNames.has(name));
  const identicalColumns = (dataset.columns || []).map(c => c.name).filter(name => versionColNames.has(name));

  const notes: string[] = [];
  if (rowCountDelta > 0) {
    notes.push(`Current dataset has ${rowCountDelta} more row(s) than this snapshot.`);
  } else if (rowCountDelta < 0) {
    notes.push(`Current dataset has ${Math.abs(rowCountDelta)} fewer row(s) than this snapshot.`);
  } else {
    notes.push(`Row count matches (${currentRows} rows).`);
  }

  if (addedColumns.length > 0) {
    notes.push(`Added columns in current: ${addedColumns.join(', ')}`);
  }
  if (removedColumns.length > 0) {
    notes.push(`Columns present in snapshot but absent currently: ${removedColumns.join(', ')}`);
  }

  const isIdentical = rowCountDelta === 0 && addedColumns.length === 0 && removedColumns.length === 0 && JSON.stringify(dataset.data) === JSON.stringify(version.data);

  return {
    rowCountDelta,
    columnCountDelta,
    currentRows,
    versionRows,
    currentCols,
    versionCols,
    addedColumns,
    removedColumns,
    identicalColumns,
    isIdentical,
    notes,
  };
}

/**
 * Forks a snapshot version into a brand new standalone Dataset
 */
export function forkVersionAsNewDataset(
  dataset: Dataset,
  version: DatasetVersion,
  customName?: string
): Dataset {
  const newName = customName?.trim() || `${dataset.name} (${version.name})`;
  const newId = `ds_fork_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const forkedDataset: Dataset = {
    id: newId,
    name: newName,
    description: `Forked from "${dataset.name}" (Snapshot: ${version.name}). ${version.description || ''}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceType: dataset.sourceType || 'manual',
    columns: deepCloneData(version.columns),
    data: deepCloneData(version.data),
    versions: [
      {
        id: `ver_init_${newId}`,
        versionNumber: 1,
        name: 'v1.0 - Initial Fork Snapshot',
        description: `Forked from parent dataset "${dataset.name}" at version ${version.name}`,
        createdAt: new Date().toISOString(),
        createdBy: 'Fork Operation',
        tag: 'initial',
        rowCount: version.rowCount,
        columnCount: version.columnCount,
        columns: deepCloneData(version.columns),
        data: deepCloneData(version.data),
        changeSummary: `Fork baseline: ${version.rowCount} rows, ${version.columnCount} columns`,
      },
    ],
  };

  return forkedDataset;
}

/**
 * Downloads a version snapshot as a CSV file
 */
export function exportVersionToCSV(version: DatasetVersion, datasetName: string) {
  const safeTitle = `${datasetName.replace(/[^a-z0-9_-]/gi, '_')}_${version.name.replace(/[^a-z0-9_-]/gi, '_')}`;
  const dummyDataset: Dataset = {
    id: version.id,
    name: safeTitle,
    description: version.description || '',
    createdAt: version.createdAt,
    updatedAt: version.createdAt,
    sourceType: 'manual',
    columns: version.columns,
    data: version.data,
  };
  exportToCSV(dummyDataset, safeTitle);
}

/**
 * Downloads a version snapshot as a JSON file
 */
export function exportVersionToJSON(version: DatasetVersion, datasetName: string) {
  const safeTitle = `${datasetName.replace(/[^a-z0-9_-]/gi, '_')}_${version.name.replace(/[^a-z0-9_-]/gi, '_')}`;
  const dummyDataset: Dataset = {
    id: version.id,
    name: safeTitle,
    description: version.description || '',
    createdAt: version.createdAt,
    updatedAt: version.createdAt,
    sourceType: 'manual',
    columns: version.columns,
    data: version.data,
  };
  exportToJSON(dummyDataset, safeTitle);
}
