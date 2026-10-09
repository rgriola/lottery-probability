/** Mean and standard deviation of a set of draws' number sums. */
export interface SumStats {
  mean: number;
  stdDev: number;
}

/**
 * Computes the mean and (population) standard deviation of draws' number
 * sums, used to express how unusually high/low a given draw's total was
 * (e.g. "+1.2σ" above the long-run average).
 * @param drawNumbers - One array per draw (already era-filtered).
 */
export function calculateSumStats(drawNumbers: number[][]): SumStats {
  const sums = drawNumbers.map((numbers) => numbers.reduce((total, n) => total + n, 0));
  if (sums.length === 0) return { mean: 0, stdDev: 0 };

  const mean = sums.reduce((total, s) => total + s, 0) / sums.length;
  const variance = sums.reduce((total, s) => total + (s - mean) ** 2, 0) / sums.length;
  return { mean, stdDev: Math.sqrt(variance) };
}

/** How often draws' number sums fell into a given range bucket. */
export interface SumBucket {
  rangeMin: number;
  rangeMax: number;
  label: string;
  count: number;
  /** Percentage of all draws whose sum fell in this bucket. */
  percentage: number;
}

/**
 * Buckets draws by the sum of their numbers (e.g. 2+10+40+23+45 = 120),
 * since certain sum ranges occur far more often than others in a grid of
 * randomly-drawn numbers (sums cluster near the middle of the possible
 * range, just like rolling multiple dice).
 * @param drawNumbers - One array per draw (already era-filtered).
 * @param bucketSize - Width of each sum range bucket, e.g. 20 covers sums
 *   120-139 in one bucket.
 */
export function calculateSumDistribution(drawNumbers: number[][], bucketSize = 20): SumBucket[] {
  const sums = drawNumbers.map((numbers) => numbers.reduce((total, n) => total + n, 0));
  if (sums.length === 0) return [];

  const minSum = Math.min(...sums);
  const maxSum = Math.max(...sums);
  const firstBucketStart = Math.floor(minSum / bucketSize) * bucketSize;
  const lastBucketStart = Math.floor(maxSum / bucketSize) * bucketSize;

  const buckets: SumBucket[] = [];
  for (let start = firstBucketStart; start <= lastBucketStart; start += bucketSize) {
    const rangeMin = start;
    const rangeMax = start + bucketSize - 1;
    buckets.push({
      rangeMin,
      rangeMax,
      label: `${rangeMin}-${rangeMax}`,
      count: 0,
      percentage: 0,
    });
  }

  sums.forEach((sum) => {
    const bucket = buckets.find((b) => sum >= b.rangeMin && sum <= b.rangeMax);
    if (bucket) bucket.count++;
  });

  buckets.forEach((b) => {
    b.percentage = (b.count / sums.length) * 100;
  });

  return buckets;
}
