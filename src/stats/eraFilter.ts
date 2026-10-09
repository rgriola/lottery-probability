import type { NormalizedDraw, NumberPool } from '../types/lottery';

/**
 * Filters draws down to only those at or after a pool's `effectiveSince`
 * date, and extracts just the numbers relevant to that pool (main numbers
 * or the single bonus number). This is the shared entry point every stats
 * function uses so draws from a prior rules era never leak into analysis.
 */
export function selectPoolNumbers(
  draws: NormalizedDraw[],
  pool: NumberPool,
  field: 'mainNumbers' | 'bonusNumber'
): number[][] {
  return draws
    .filter((draw) => draw.drawDate >= pool.effectiveSince)
    .map((draw) => {
      if (field === 'mainNumbers') return draw.mainNumbers;
      return draw.bonusNumber !== null ? [draw.bonusNumber] : [];
    });
}
