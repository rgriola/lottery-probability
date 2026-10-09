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
