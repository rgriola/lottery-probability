import type { NumberPool } from '../types/lottery';
import type { FrequencyStat } from './frequency';

export type HotColdStatus = 'hot' | 'cold' | 'neutral';

export interface HotColdStat {
  number: number;
  status: HotColdStatus;
  /** Ratio of actual frequency to expected (uniform-random) frequency. 1.0 = exactly as expected. */
  deviation: number;
}

const HOT_THRESHOLD = 1.3;
const COLD_THRESHOLD = 0.7;

/**
 * Flags each number as "hot" (appearing notably more than a uniform random
 * draw would predict), "cold" (notably less), or "neutral".
 */
export function calculateHotCold(
  frequencies: FrequencyStat[],
  pool: NumberPool,
  totalDraws: number
): HotColdStat[] {
  const poolSize = pool.max - pool.min + 1;
  // Expected appearances per number if every draw picked `pool.count` numbers uniformly at random.
  const expectedCount = totalDraws > 0 ? (totalDraws * pool.count) / poolSize : 0;

  return frequencies.map(({ number, count }) => {
    const deviation = expectedCount > 0 ? count / expectedCount : 0;
    let status: HotColdStatus = 'neutral';
    if (deviation > HOT_THRESHOLD) status = 'hot';
    else if (deviation < COLD_THRESHOLD) status = 'cold';

    return { number, status, deviation };
  });
}
