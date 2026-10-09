import type { NumberScore } from '../stats/probabilityScore';

type SortKey = 'rank' | 'number' | 'frequency' | 'status' | 'sinceSeen' | 'score';

interface Column {
  key: SortKey;
  label: string;
}

const COLUMNS: Column[] = [
  { key: 'rank', label: 'Rank' },
  { key: 'number', label: 'Number' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'status', label: 'Status' },
  { key: 'sinceSeen', label: 'Draws since seen' },
  { key: 'score', label: 'Score' },
];

/** A ranked row with its original rank baked in, so that rank stays fixed
 * (reflecting score order) even when the table is re-sorted by another column. */
interface RankedRow extends NumberScore {
  rank: number;
}

function compareRows(a: RankedRow, b: RankedRow, key: SortKey): number {
  switch (key) {
    case 'rank':
      return a.rank - b.rank;
    case 'number':
      return a.number - b.number;
    case 'frequency':
      return a.frequencyPercentage - b.frequencyPercentage;
    case 'status':
      return a.hotColdStatus.localeCompare(b.hotColdStatus);
    case 'sinceSeen':
      return (a.drawsSinceLastSeen ?? -1) - (b.drawsSinceLastSeen ?? -1);
    case 'score':
      return a.score - b.score;
  }
}

/** Renders a ranked table of the top N numbers by combined score, with
 * click-to-sort column headers. Sorting only reorders the displayed rows;
 * it does not change which numbers made the top-N cut. */
export function renderRankedTable(
  container: HTMLElement,
  scores: NumberScore[],
  topN: number
): void {
  const rows: RankedRow[] = scores.slice(0, topN).map((s, i) => ({ ...s, rank: i + 1 }));
  let sortKey: SortKey = 'rank';
  let sortAsc = true;

  function render(): void {
    const sorted = [...rows].sort((a, b) => {
      const cmp = compareRows(a, b, sortKey);
      return sortAsc ? cmp : -cmp;
    });

    const headerCells = COLUMNS.map((col) => {
      const isActive = col.key === sortKey;
      const arrow = isActive ? (sortAsc ? ' ▲' : ' ▼') : '';
      return `<th class="sortable${isActive ? ' sorted' : ''}" data-key="${col.key}">${col.label}${arrow}</th>`;
    }).join('');

    const bodyRows = sorted
      .map(
        (s) => `
        <tr>
          <td>${s.rank}</td>
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
          <tr>${headerCells}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>`;

    container.querySelectorAll<HTMLTableCellElement>('th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key as SortKey;
        if (key === sortKey) {
          sortAsc = !sortAsc;
        } else {
          sortKey = key;
          sortAsc = true;
        }
        render();
      });
    });
  }

  render();
}
