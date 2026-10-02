import { Dataset, ColumnMeta } from '../types';
import { parseNumber } from './statistics';

export interface PCAPoint {
  id: string | number;
  rowIndex: number;
  originalData: Record<string, any>;
  pc1: number;
  pc2: number;
  pc3?: number;
  cluster: number;
  label?: string;
}

export interface PCALoading {
  feature: string;
  pc1: number;
  pc2: number;
  pc3?: number;
  importance: number;
}

export interface PCAResult {
  points: PCAPoint[];
  explainedVariance: number[]; // Percentage per component e.g. [45.2, 28.6, 12.1]
  cumulativeVariance: number[]; // e.g. [45.2, 73.8, 85.9]
  loadings: PCALoading[];
  featureNames: string[];
  totalVariance: number;
  clusters: {
    id: number;
    name: string;
    color: string;
    count: number;
    percentage: number;
    centroid: Record<string, number>;
  }[];
}

const CLUSTER_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

/**
 * Standardize numeric matrix (mean 0, variance 1)
 */
function standardizeMatrix(matrix: number[][]): { standardized: number[][]; means: number[]; stds: number[] } {
  const numRows = matrix.length;
  const numCols = matrix[0].length;

  const means: number[] = new Array(numCols).fill(0);
  const stds: number[] = new Array(numCols).fill(0);

  // Compute means
  for (let j = 0; j < numCols; j++) {
    let sum = 0;
    for (let i = 0; i < numRows; i++) {
      sum += matrix[i][j];
    }
    means[j] = sum / numRows;
  }

  // Compute standard deviations
  for (let j = 0; j < numCols; j++) {
    let sumSquares = 0;
    for (let i = 0; i < numRows; i++) {
      sumSquares += Math.pow(matrix[i][j] - means[j], 2);
    }
    const variance = sumSquares / (numRows > 1 ? numRows - 1 : 1);
    stds[j] = Math.sqrt(variance) || 1e-6; // Avoid division by zero
  }

  // Standardize values
  const standardized: number[][] = [];
  for (let i = 0; i < numRows; i++) {
    const row: number[] = [];
    for (let j = 0; j < numCols; j++) {
      row.push((matrix[i][j] - means[j]) / stds[j]);
    }
    standardized.push(row);
  }

  return { standardized, means, stds };
}

/**
 * Compute covariance matrix
 */
function computeCovarianceMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const p = matrix[0].length;
  const cov: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));

  for (let j1 = 0; j1 < p; j1++) {
    for (let j2 = j1; j2 < p; j2++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += matrix[i][j1] * matrix[i][j2];
      }
      const val = sum / (n > 1 ? n - 1 : 1);
      cov[j1][j2] = val;
      cov[j2][j1] = val;
    }
  }

  return cov;
}

/**
 * Power iteration method to find dominant eigenvector and eigenvalue with deflation
 */
function powerIterationWithDeflation(cov: number[][], numComponents = 3): { eigenvalues: number[]; eigenvectors: number[][] } {
  const p = cov.length;
  const k = Math.min(numComponents, p);
  const eigenvalues: number[] = [];
  const eigenvectors: number[][] = [];

  // Deep copy of covariance matrix
  let currentMatrix = cov.map(row => [...row]);

  for (let comp = 0; comp < k; comp++) {
    // Random initial vector
    let v: number[] = Array.from({ length: p }, () => Math.random() - 0.5);
    // Normalize initial vector
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    v = v.map(x => x / norm);

    let lambda = 0;
    // Power iteration loop
    for (let iter = 0; iter < 100; iter++) {
      const vNext: number[] = new Array(p).fill(0);
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          vNext[i] += currentMatrix[i][j] * v[j];
        }
      }

      norm = Math.sqrt(vNext.reduce((s, x) => s + x * x, 0)) || 1e-10;
      lambda = norm;
      const vNormalized = vNext.map(x => x / norm);

      // Check convergence
      let diff = 0;
      for (let i = 0; i < p; i++) {
        diff += Math.abs(vNormalized[i] - v[i]);
      }
      v = vNormalized;
      if (diff < 1e-7) break;
    }

    eigenvalues.push(lambda);
    eigenvectors.push(v);

    // Matrix deflation: A_next = A - lambda * v * v^T
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        currentMatrix[i][j] -= lambda * v[i] * v[j];
      }
    }
  }

  return { eigenvalues, eigenvectors };
}

/**
 * K-Means++ Clustering on standardized PCA points
 */
function runKMeansClustering(
  points: { pc1: number; pc2: number; pc3?: number }[],
  k: number,
  maxIterations = 50
): number[] {
  const n = points.length;
  if (n === 0) return [];
  if (k <= 1 || k > n) return new Array(n).fill(0);

  // K-Means++ initialization
  const centroids: { x: number; y: number; z: number }[] = [];
  // Choose first centroid randomly
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push({
    x: points[firstIdx].pc1,
    y: points[firstIdx].pc2,
    z: points[firstIdx].pc3 || 0,
  });

  // Choose subsequent centroids proportional to distance squared
  while (centroids.length < k) {
    const distances = points.map(p => {
      let minDist = Infinity;
      for (const c of centroids) {
        const d = Math.pow(p.pc1 - c.x, 2) + Math.pow(p.pc2 - c.y, 2) + Math.pow((p.pc3 || 0) - c.z, 2);
        if (d < minDist) minDist = d;
      }
      return minDist;
    });

    const sumDist = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * sumDist;
    let chosenIdx = 0;
    for (let i = 0; i < n; i++) {
      r -= distances[i];
      if (r <= 0) {
        chosenIdx = i;
        break;
      }
    }

    centroids.push({
      x: points[chosenIdx].pc1,
      y: points[chosenIdx].pc2,
      z: points[chosenIdx].pc3 || 0,
    });
  }

  let assignments: number[] = new Array(n).fill(0);

  // Lloyd's iterative refinement
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;

    // Assignment step
    for (let i = 0; i < n; i++) {
      const p = points[i];
      let bestCluster = 0;
      let bestDist = Infinity;

      for (let c = 0; c < k; c++) {
        const dist = Math.pow(p.pc1 - centroids[c].x, 2) + 
                     Math.pow(p.pc2 - centroids[c].y, 2) + 
                     Math.pow((p.pc3 || 0) - centroids[c].z, 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = c;
        }
      }

      if (assignments[i] !== bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }

    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const clusterPoints = points.filter((_, idx) => assignments[idx] === c);
      if (clusterPoints.length > 0) {
        centroids[c] = {
          x: clusterPoints.reduce((sum, p) => sum + p.pc1, 0) / clusterPoints.length,
          y: clusterPoints.reduce((sum, p) => sum + p.pc2, 0) / clusterPoints.length,
          z: clusterPoints.reduce((sum, p) => sum + (p.pc3 || 0), 0) / clusterPoints.length,
        };
      }
    }
  }

  return assignments;
}

/**
 * Executes full Principal Component Analysis & Clustering pipeline on dataset
 */
export function executePCA(
  dataset: Dataset,
  selectedColumns?: string[],
  kClusters = 3,
  labelColumn?: string
): PCAResult | null {
  // 1. Identify numeric columns
  const numericCols = (selectedColumns && selectedColumns.length >= 2)
    ? selectedColumns
    : dataset.columns.filter(c => c.type === 'number').map(c => c.name);

  if (numericCols.length < 2 || dataset.data.length < 3) {
    return null;
  }

  // 2. Extract and filter valid complete numeric rows
  const rawMatrix: number[][] = [];
  const validRowIndices: number[] = [];

  for (let i = 0; i < dataset.data.length; i++) {
    const row = dataset.data[i];
    let isValid = true;
    const numRow: number[] = [];

    for (const col of numericCols) {
      const val = parseNumber(row[col]);
      if (val === null) {
        isValid = false;
        break;
      }
      numRow.push(val);
    }

    if (isValid) {
      rawMatrix.push(numRow);
      validRowIndices.push(i);
    }
  }

  if (rawMatrix.length < 3) {
    return null;
  }

  // 3. Standardize matrix
  const { standardized } = standardizeMatrix(rawMatrix);

  // 4. Compute Covariance matrix
  const covMatrix = computeCovarianceMatrix(standardized);

  // 5. Compute Eigenvalues & Eigenvectors
  const numComponents = Math.min(3, numericCols.length);
  const { eigenvalues, eigenvectors } = powerIterationWithDeflation(covMatrix, numComponents);

  const totalEigenvalueSum = eigenvalues.reduce((a, b) => a + b, 0) || 1;
  const explainedVariance = eigenvalues.map(ev => Number(((ev / totalEigenvalueSum) * 100).toFixed(1)));
  
  let cum = 0;
  const cumulativeVariance = explainedVariance.map(v => {
    cum += v;
    return Number(Math.min(100, cum).toFixed(1));
  });

  // 6. Project standardized data onto principal components
  const pcScores: { pc1: number; pc2: number; pc3?: number }[] = [];
  for (let i = 0; i < standardized.length; i++) {
    const row = standardized[i];
    
    // PC1 score
    let score1 = 0;
    for (let j = 0; j < numericCols.length; j++) {
      score1 += row[j] * (eigenvectors[0]?.[j] || 0);
    }

    // PC2 score
    let score2 = 0;
    for (let j = 0; j < numericCols.length; j++) {
      score2 += row[j] * (eigenvectors[1]?.[j] || 0);
    }

    // PC3 score
    let score3 = 0;
    if (eigenvectors[2]) {
      for (let j = 0; j < numericCols.length; j++) {
        score3 += row[j] * eigenvectors[2][j];
      }
    }

    pcScores.push({
      pc1: Number(score1.toFixed(3)),
      pc2: Number(score2.toFixed(3)),
      pc3: eigenvectors[2] ? Number(score3.toFixed(3)) : undefined,
    });
  }

  // 7. Run K-Means Clustering on projected PC space
  const clusterAssignments = runKMeansClustering(pcScores, kClusters);

  // 8. Assemble PCAPoint items
  const points: PCAPoint[] = [];
  for (let i = 0; i < pcScores.length; i++) {
    const origIdx = validRowIndices[i];
    const origRow = dataset.data[origIdx];
    const label = labelColumn ? String(origRow[labelColumn] ?? `Row #${origIdx + 1}`) : `Row #${origIdx + 1}`;

    points.push({
      id: `pca_${origIdx}`,
      rowIndex: origIdx,
      originalData: origRow,
      pc1: pcScores[i].pc1,
      pc2: pcScores[i].pc2,
      pc3: pcScores[i].pc3,
      cluster: clusterAssignments[i] || 0,
      label,
    });
  }

  // 9. Assemble Loadings (Feature Contributions)
  const loadings: PCALoading[] = [];
  for (let j = 0; j < numericCols.length; j++) {
    const l1 = eigenvectors[0]?.[j] || 0;
    const l2 = eigenvectors[1]?.[j] || 0;
    const l3 = eigenvectors[2]?.[j];
    const importance = Math.sqrt(l1 * l1 + l2 * l2);

    loadings.push({
      feature: numericCols[j],
      pc1: Number(l1.toFixed(3)),
      pc2: Number(l2.toFixed(3)),
      pc3: l3 !== undefined ? Number(l3.toFixed(3)) : undefined,
      importance: Number(importance.toFixed(3)),
    });
  }

  // Sort loadings by overall importance
  loadings.sort((a, b) => b.importance - a.importance);

  // 10. Compute Cluster Profiles & Centroids
  const clusters = [];
  for (let c = 0; c < kClusters; c++) {
    const clusterPoints = points.filter(p => p.cluster === c);
    const count = clusterPoints.length;
    const percentage = Number(((count / points.length) * 100).toFixed(1));

    const centroid: Record<string, number> = {};
    for (const col of numericCols) {
      if (count > 0) {
        const sum = clusterPoints.reduce((acc, p) => acc + (parseNumber(p.originalData[col]) || 0), 0);
        centroid[col] = Number((sum / count).toFixed(2));
      } else {
        centroid[col] = 0;
      }
    }

    clusters.push({
      id: c,
      name: `Cluster ${String.fromCharCode(65 + c)} (k=${c + 1})`,
      color: CLUSTER_COLORS[c % CLUSTER_COLORS.length],
      count,
      percentage,
      centroid,
    });
  }

  return {
    points,
    explainedVariance,
    cumulativeVariance,
    loadings,
    featureNames: numericCols,
    totalVariance: totalEigenvalueSum,
    clusters,
  };
}
