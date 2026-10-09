/** How often each possible pair of main numbers has appeared together in the same draw. */
export interface PairFrequencyResult {
  min: number;
  max: number;
  /** Numbers in the pool (max - min + 1). */
  size: number;
  /** Symmetric co-occurrence matrix, indexed by (number - min). Diagonal is always 0. */
  matrix: number[][];
  /** Symmetric matrix of the draw index (0-based, oldest-first) each pair last co-occurred in, or -1 if never. */
  lastSeenMatrix: number[][];
  /** Highest co-occurrence count across all pairs, used to normalize heatmap color intensity. */
  maxCount: number;
  totalDraws: number;
}

export interface PairCount {
  a: number;
  b: number;
  count: number;
  /** Draws since this pair last appeared together (null if it never has). */
  drawsSinceLastSeen: number | null;
}

/**
 * Builds a full pairwise co-occurrence matrix across a pool's number range:
 * matrix[i][j] is how many draws contained both (min + i) and (min + j).
 * @param drawNumbers - One array per draw, oldest first (already era-filtered).
 */
export function calculatePairFrequency(
  drawNumbers: number[][],
  min: number,
  max: number
): PairFrequencyResult {
  const size = max - min + 1;
  const matrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));
  const lastSeenMatrix: number[][] = Array.from({ length: size }, () => new Array(size).fill(-1));
  let maxCount = 0;

  drawNumbers.forEach((numbers, drawIndex) => {
    for (let i = 0; i < numbers.length; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const a = numbers[i] - min;
        const b = numbers[j] - min;
        if (a < 0 || a >= size || b < 0 || b >= size) continue;
        matrix[a][b]++;
        matrix[b][a]++;
        lastSeenMatrix[a][b] = drawIndex;
        lastSeenMatrix[b][a] = drawIndex;
        if (matrix[a][b] > maxCount) maxCount = matrix[a][b];
      }
    }
  });

  return { min, max, size, matrix, lastSeenMatrix, maxCount, totalDraws: drawNumbers.length };
}

/** Returns the `n` most frequently co-occurring pairs, sorted highest-first. */
export function topPairs(result: PairFrequencyResult, n: number): PairCount[] {
  const list: PairCount[] = [];
  for (let i = 0; i < result.size; i++) {
    for (let j = i + 1; j < result.size; j++) {
      const count = result.matrix[i][j];
      if (count > 0) {
        const lastSeen = result.lastSeenMatrix[i][j];
        const drawsSinceLastSeen = lastSeen >= 0 ? result.totalDraws - 1 - lastSeen : null;
        list.push({ a: result.min + i, b: result.min + j, count, drawsSinceLastSeen });
      }
    }
  }
  return list.sort((x, y) => y.count - x.count).slice(0, n);
}

