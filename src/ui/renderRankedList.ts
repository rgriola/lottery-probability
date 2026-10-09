import type { NumberScore } from '../stats/probabilityScore';

/** Renders a ranked table of the top N numbers by combined score. */
export function renderRankedTable(
  container: HTMLElement,
  scores: NumberScore[],
  topN: number
): void {
  const top = scores.slice(0, topN);

  const rows = top
    .map(
      (s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="number-badge">${s.number}</td>
          <td>${s.frequencyPercentage.toFixed(1)}%</td>
          <td class="status-${s.hotColdStatus}">${s.hotColdStatus}</td>
          <td>${s.drawsSinceLastSeen ?? '—'}</td>
          <td>${s.score.toFixed(1)}</td>
        </tr>`
    )
    .join('');

  container.innerHTML = `
    <table class="ranked-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Number</th>
          <th>Frequency</th>
          <th>Status</th>
          <th>Draws since seen</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
