import type { NumberPool } from '../types/lottery';

export interface FrequencyStat {
  number: number;
  count: number;
  /** Percentage of all draws (within the current rules era) this number appeared in. */
  percentage: number;
}

/**
 * Computes how often each possible number in a pool has appeared.
 * @param drawNumbers - One array per draw, already filtered to the current
 *   rules era (see `selectPoolNumbers`).
 */
export function calculateFrequency(drawNumbers: number[][], pool: NumberPool): FrequencyStat[] {
  const counts = new Map<number, number>();
  for (let n = pool.min; n <= pool.max; n++) counts.set(n, 0);

  let totalDraws = 0;
  drawNumbers.forEach((numbers) => {
    totalDraws++;
    numbers.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
  });

  return Array.from(counts.entries()).map(([number, count]) => ({
    number,
    count,
    percentage: totalDraws > 0 ? (count / totalDraws) * 100 : 0,
  }));
}
