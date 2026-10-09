import type { NumberScore } from "./probabilityScore";
import type { OddEvenGroup } from "./oddEven";
import type { SumStats } from "./sumTotal";

/** One "suggested ticket": a candidate 5-main-number combo plus a bonus
 *  number, filtered to match historically common odd/even splits and sum
 *  ranges, then ranked by combined per-number score. */
export interface SuggestedCombo {
  numbers: number[];
  bonusNumber: number;
  sum: number;
  oddCount: number;
  evenCount: number;
  /** Average of the 5 numbers' individual probability scores (0-100). */
  score: number;
}

/**
 * Picks which odd/even splits count as "common enough" to keep, taking the
 * `topK` splits with the highest historical frequency (typically 2 and 3
 * odd out of 5 numbers).
 */
function pickAllowedOddCounts(groups: OddEvenGroup[], topK: number): Set<number> {
  const sorted = [...groups].sort((a, b) => b.percentage - a.percentage);
  return new Set(sorted.slice(0, topK).map((g) => g.oddCount));
}

/** Yields every k-length combination of items from `pool`, in the pool's
 *  existing order (so combos of higher-scored numbers are generated first,
 *  letting callers short-circuit once they have enough matches). */
function* combinations<T>(pool: T[], k: number): Generator<T[]> {
  const n = pool.length;
  if (k > n) return;
  const indices = Array.from({ length: k }, (_, i) => i);

  while (true) {
    yield indices.map((i) => pool[i]);

    let i = k - 1;
    while (i >= 0 && indices[i] === i + n - k) i--;
    if (i < 0) return;

    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
  }
}

/**
 * Generates ranked "suggested combination" tickets by:
 * 1. Restricting main numbers to the top `candidatePoolSize` highest-scored
 *    candidates (keeps the combination count computationally cheap).
 * 2. Enumerating every 5-number combo from that pool.
 * 3. Eliminating combos whose odd/even split or sum falls outside the
 *    historically common range (derived from real draw data, not a fixed
 *    hardcoded rule).
 * 4. Scoring survivors by the average of their members' individual
 *    probability scores, and returning the top `topN`.
 *
 * This is a statistical heuristic for narrowing the field, not a
 * prediction - every combination remains equally random in an actual draw.
 */
export function generateSuggestedCombinations(
  mainScores: NumberScore[],
  bonusScores: NumberScore[],
  oddEvenGroups: OddEvenGroup[],
  sumStats: SumStats,
  numbersPerDraw: number,
  options: { candidatePoolSize?: number; topN?: number; bonusPoolSize?: number } = {},
): SuggestedCombo[] {
  const { candidatePoolSize = 20, topN = 10, bonusPoolSize = 5 } = options;

  const allowedOddCounts = pickAllowedOddCounts(oddEvenGroups, 2);
  const sumMin = sumStats.mean - sumStats.stdDev;
  const sumMax = sumStats.mean + sumStats.stdDev;

  const candidatePool = [...mainScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(candidatePoolSize, mainScores.length));

  const bonusCandidates = [...bonusScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(bonusPoolSize, bonusScores.length));

  const survivors: SuggestedCombo[] = [];

  for (const combo of combinations(candidatePool, numbersPerDraw)) {
    const sum = combo.reduce((total, c) => total + c.number, 0);
    if (sum < sumMin || sum > sumMax) continue;

    const oddCount = combo.filter((c) => c.number % 2 !== 0).length;
    if (!allowedOddCounts.has(oddCount)) continue;

    const score = combo.reduce((total, c) => total + c.score, 0) / combo.length;

    survivors.push({
      numbers: combo.map((c) => c.number).sort((a, b) => a - b),
      bonusNumber: 0, // assigned below, round-robin across top bonus candidates
      sum,
      oddCount,
      evenCount: numbersPerDraw - oddCount,
      score,
    });
  }

  survivors.sort((a, b) => b.score - a.score);
  const top = survivors.slice(0, topN);

  return top.map((combo, i) => ({
    ...combo,
    bonusNumber: bonusCandidates.length > 0 ? bonusCandidates[i % bonusCandidates.length].number : 0,
  }));
}
