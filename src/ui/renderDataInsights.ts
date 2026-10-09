import { renderHistogramChart } from '../charts/renderChart';
import { calculateOddEvenDistribution } from '../stats/oddEven';
import { calculateSumDistribution } from '../stats/sumTotal';
import { calculatePairFrequency, topPairs } from '../stats/pairFrequency';
import { renderPairHeatmap } from './renderPairHeatmap';
import { renderPairNetwork } from './renderPairNetwork';
import { renderTopPairsTable } from './renderTopPairsTable';

/**
 * Renders the "Data Insights" panel: how draws' main numbers split between
 * odd/even, and how their sums ("ball totals") are distributed. Both reveal
 * patterns that are invisible when looking at individual number frequency
 * alone - e.g. sums cluster near the middle of the possible range, and
 * balanced odd/even splits are far more common than all-odd or all-even.
 */
export function renderDataInsights(
  oddEvenCanvas: HTMLCanvasElement,
  oddEvenMetaEl: HTMLElement,
  sumCanvas: HTMLCanvasElement,
  sumMetaEl: HTMLElement,
  topPairsTableBodyEl: HTMLElement,
  topPairsMetaEl: HTMLElement,
  networkCanvas: HTMLCanvasElement,
  networkMetaEl: HTMLElement,
  heatmapCanvas: HTMLCanvasElement,
  heatmapMetaEl: HTMLElement,
  heatmapTooltipEl: HTMLElement,
  mainNumbers: number[][],
  numbersPerDraw: number,
  mainPool: { min: number; max: number }
): void {
  const oddEvenGroups = calculateOddEvenDistribution(mainNumbers, numbersPerDraw);
  const mostCommonSplit = oddEvenGroups.reduce((best, g) => (g.count > best.count ? g : best));

  renderHistogramChart(
    oddEvenCanvas,
    oddEvenGroups.map((g) => `${g.oddCount} odd / ${g.evenCount} even`),
    oddEvenGroups.map((g) => g.count),
    'Draws'
  );
  oddEvenMetaEl.textContent = `Across ${mainNumbers.length} draws, the most common split is ${mostCommonSplit.oddCount} odd / ${mostCommonSplit.evenCount} even (${mostCommonSplit.percentage.toFixed(1)}% of draws).`;

  const sumBuckets = calculateSumDistribution(mainNumbers, 20);
  if (sumBuckets.length > 0) {
    const mostCommonBucket = sumBuckets.reduce((best, b) => (b.count > best.count ? b : best));

    renderHistogramChart(
      sumCanvas,
      sumBuckets.map((b) => b.label),
      sumBuckets.map((b) => b.count),
      'Draws'
    );
    sumMetaEl.textContent = `Ball total (sum of all main numbers) clusters around ${mostCommonBucket.label} (${mostCommonBucket.percentage.toFixed(1)}% of draws).`;
  } else {
    sumMetaEl.textContent = '';
  }

  const pairResult = calculatePairFrequency(mainNumbers, mainPool.min, mainPool.max);

  renderTopPairsTable(topPairsTableBodyEl, topPairsMetaEl, topPairs(pairResult, 15), pairResult.totalDraws);
  renderPairNetwork(networkCanvas, networkMetaEl, pairResult);
  renderPairHeatmap(heatmapCanvas, heatmapMetaEl, heatmapTooltipEl, pairResult);
}
