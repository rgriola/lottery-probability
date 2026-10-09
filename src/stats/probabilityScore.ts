import type { NormalizedDraw, NumberPool } from '../types/lottery';
import { selectPoolNumbers } from './eraFilter';
import { calculateFrequency, type FrequencyStat } from './frequency';
import { calculateHotCold, type HotColdStatus } from './hotCold';
import { calculateGaps } from './gapAnalysis';

export interface NumberScore {
  number: number;
  frequencyPercentage: number;
  hotColdStatus: HotColdStatus;
  deviation: number;
  drawsSinceLastSeen: number | null;
  overdueRatio: number | null;
  /** 0-100 combined score: simple average of three normalized signals (frequency, hot/cold, overdue). */
  score: number;
}

/** Min-max normalizes a set of values to a 0-100 scale. */
function normalize(values: (number | null)[]): number[] {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;
  const range = max - min;

  return values.map((v) => {
    if (v === null || !Number.isFinite(v)) return 0;
    return range > 0 ? ((v - min) / range) * 100 : 50;
  });
}

/**
 * Builds a single, transparent ranked list for one pool (main numbers or
 * bonus ball): each number's frequency %, hot/cold status, and overdue ratio
 * are shown individually, plus a combined score that's a simple unweighted
 * average of the three (normalized 0-100) - easy to explain, nothing hidden.
 */
export function rankNumbers(
  draws: NormalizedDraw[],
  pool: NumberPool,
  field: 'mainNumbers' | 'bonusNumber'
): NumberScore[] {
  const drawNumbers = selectPoolNumbers(draws, pool, field);
  const frequencies = calculateFrequency(drawNumbers, pool);
  const hotCold = calculateHotCold(frequencies, pool, drawNumbers.length);
  const gaps = calculateGaps(drawNumbers, pool);

  const freqNormalized = normalize(frequencies.map((f) => f.percentage));
  const deviationNormalized = normalize(hotCold.map((h) => h.deviation));
  const overdueNormalized = normalize(gaps.map((g) => g.overdueRatio));

  const byNumber = new Map<number, FrequencyStat>(frequencies.map((f) => [f.number, f]));

  return hotCold.map((hc, i) => {
    const freq = byNumber.get(hc.number)!;
    const gap = gaps[i];
    const score = (freqNormalized[i] + deviationNormalized[i] + overdueNormalized[i]) / 3;

    return {
      number: hc.number,
      frequencyPercentage: freq.percentage,
      hotColdStatus: hc.status,
      deviation: hc.deviation,
      drawsSinceLastSeen: gap.drawsSinceLastSeen,
      overdueRatio: gap.overdueRatio,
      score,
    };
  }).sort((a, b) => b.score - a.score);
}
