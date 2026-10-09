import type { PairCount } from '../stats/pairFrequency';

/**
 * Renders a simple ranked table of the most frequently co-occurring number
 * pairs. Complements the heatmap/network views with exact, scannable figures
 * rather than requiring the reader to interpret color or line weight.
 */
export function renderTopPairsTable(
  tableBodyEl: HTMLElement,
  metaEl: HTMLElement,
  pairs: PairCount[],
  totalDraws: number
): void {
  if (pairs.length === 0) {
    tableBodyEl.innerHTML = '';
    metaEl.textContent = 'Not enough data yet to rank pairs.';
    return;
  }

  metaEl.textContent = `Top ${pairs.length} most frequent pairs across ${totalDraws} draws.`;

  tableBodyEl.innerHTML = pairs
    .map(
      (p, i) => `
        <tr>
          <td class="top-pairs-rank">${i + 1}</td>
          <td>
            <span class="draw-ball">${p.a}</span>
            <span class="draw-ball">${p.b}</span>
          </td>
          <td class="top-pairs-count">${p.count}</td>
        </tr>
      `
    )
    .join('');
}
