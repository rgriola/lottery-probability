import type { NumberPool } from '../types/lottery';

export interface GapStat {
  number: number;
  /** How many draws (within the current rules era) since this number last appeared. */
  drawsSinceLastSeen: number | null;
  /** Average gap between this number's appearances historically. */
  averageGap: number | null;
  /** drawsSinceLastSeen / averageGap. >1 means "overdue" relative to its own history. */
  overdueRatio: number | null;
}

/**
 * Analyzes how long it's been since each number last appeared, relative to
 * its historical average gap between appearances ("overdue" analysis).
 * @param drawNumbers - One array per draw, oldest first, already filtered to
 *   the current rules era (see `selectPoolNumbers`).
 */
export function calculateGaps(drawNumbers: number[][], pool: NumberPool): GapStat[] {
  const lastSeenDrawIndex = new Map<number, number>();
  const gaps = new Map<number, number[]>();

  drawNumbers.forEach((numbers, drawIndex) => {
    numbers.forEach((num) => {
      const last = lastSeenDrawIndex.get(num);
      if (last !== undefined) {
        const gapList = gaps.get(num) ?? [];
        gapList.push(drawIndex - last);
        gaps.set(num, gapList);
      }
      lastSeenDrawIndex.set(num, drawIndex);
    });
  });

  const totalDraws = drawNumbers.length;
  const stats: GapStat[] = [];

  for (let n = pool.min; n <= pool.max; n++) {
    const last = lastSeenDrawIndex.get(n);
    const numberGaps = gaps.get(n) ?? [];
    const averageGap =
      numberGaps.length > 0 ? numberGaps.reduce((s, g) => s + g, 0) / numberGaps.length : null;
    const drawsSinceLastSeen = last !== undefined ? totalDraws - 1 - last : null;
    const overdueRatio =
      drawsSinceLastSeen !== null && averageGap ? drawsSinceLastSeen / averageGap : null;

    stats.push({ number: n, drawsSinceLastSeen, averageGap, overdueRatio });
  }

  return stats;
}
