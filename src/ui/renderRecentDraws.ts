import type { GameConfig } from '../games/registry';
import type { NormalizedDraw } from '../types/lottery';

/** Renders the most recent `count` draws as number-badge cards, newest first. */
export function renderRecentDraws(
  container: HTMLElement,
  game: GameConfig,
  draws: NormalizedDraw[],
  count: number
): void {
  const recent = draws.slice(-count).reverse();

  if (recent.length === 0) {
    container.innerHTML = '';
    return;
  }

  const cards = recent
    .map((draw) => {
      const mainBadges = draw.mainNumbers
        .map((n) => `<span class="number-badge draw-ball">${n}</span>`)
        .join('');
      const bonusBadge =
        draw.bonusNumber !== null
          ? `<span class="number-badge draw-ball draw-ball-bonus" title="${game.bonusName}">${draw.bonusNumber}</span>`
          : '';

      return `
        <li class="draw-card">
          <span class="draw-date">${draw.drawDate}</span>
          <span class="draw-balls">${mainBadges}${bonusBadge}</span>
        </li>`;
    })
    .join('');

  container.innerHTML = `<ul class="recent-draws-grid">${cards}</ul>`;
}
