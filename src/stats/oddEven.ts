/** How often draws fell into each odd/even split of the main numbers. */
export interface OddEvenGroup {
  oddCount: number;
  evenCount: number;
  count: number;
  /** Percentage of all draws that had this exact odd/even split. */
  percentage: number;
}

/**
 * Groups draws by how many of their numbers were odd vs. even (e.g. "3
 * odd / 2 even"), so the UI can show which splits occur most often.
 * @param drawNumbers - One array per draw (already era-filtered).
 * @param numbersPerDraw - How many numbers are drawn each time (e.g. 5),
 *   used to pre-seed every possible split with a zero count.
 */
export function calculateOddEvenDistribution(
  drawNumbers: number[][],
  numbersPerDraw: number
): OddEvenGroup[] {
  const counts = new Map<number, number>();
  for (let odd = 0; odd <= numbersPerDraw; odd++) counts.set(odd, 0);

  let totalDraws = 0;
  drawNumbers.forEach((numbers) => {
    totalDraws++;
    const oddCount = numbers.filter((n) => n % 2 !== 0).length;
    counts.set(oddCount, (counts.get(oddCount) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([a], [b]) => a - b)
    .map(([oddCount, count]) => ({
      oddCount,
      evenCount: numbersPerDraw - oddCount,
      count,
      percentage: totalDraws > 0 ? (count / totalDraws) * 100 : 0,
    }));
}
