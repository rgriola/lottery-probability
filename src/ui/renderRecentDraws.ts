import type { GameConfig } from '../games/registry';
import type { NormalizedDraw } from '../types/lottery';
import type { SumStats } from '../stats/sumTotal';
import { formatIsoDate } from '../utils/formatDate';

/** Repeat tier for a number within the visible draw window: how many times
 *  (1st, 2nd, 3rd+) it has appeared so far, counting only numbers that
 *  reappear at least once somewhere in the window. */
function buildRepeatTiers(
  windowDraws: NormalizedDraw[],
  pick: (draw: NormalizedDraw) => number | null
): Map<NormalizedDraw, number> {
  const totalCounts = new Map<number, number>();
  for (const draw of windowDraws) {
    const n = pick(draw);
    if (n === null) continue;
    totalCounts.set(n, (totalCounts.get(n) ?? 0) + 1);
  }

  const runningCounts = new Map<number, number>();
  const tierByDraw = new Map<NormalizedDraw, number>();
  for (const draw of windowDraws) {
    const n = pick(draw);
    if (n === null) continue;
    if ((totalCounts.get(n) ?? 0) < 2) continue;
    const occurrence = (runningCounts.get(n) ?? 0) + 1;
    runningCounts.set(n, occurrence);
    tierByDraw.set(draw, Math.min(occurrence, 3));
  }
  return tierByDraw;
}

/** Renders the most recent `count` draws as number-badge cards, newest first. */
export function renderRecentDraws(
  container: HTMLElement,
  game: GameConfig,
  draws: NormalizedDraw[],
  count: number,
  sumStats: SumStats
): void {
  const startIndex = Math.max(0, draws.length - count);
  const windowDraws = draws.slice(startIndex);

  if (windowDraws.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Main-number repeat tiers are per-number (shared across all five slots),
  // so compute them once per draw rather than per slot.
  const mainTierByDraw = new Map<NormalizedDraw, Map<number, number>>();
  {
    const totalCounts = new Map<number, number>();
    for (const draw of windowDraws) {
      for (const n of draw.mainNumbers) {
        totalCounts.set(n, (totalCounts.get(n) ?? 0) + 1);
      }
    }
    const runningCounts = new Map<number, number>();
    for (const draw of windowDraws) {
      const tiers = new Map<number, number>();
      for (const n of draw.mainNumbers) {
        if ((totalCounts.get(n) ?? 0) < 2) continue;
        const occurrence = (runningCounts.get(n) ?? 0) + 1;
        runningCounts.set(n, occurrence);
        tiers.set(n, Math.min(occurrence, 3));
      }
      mainTierByDraw.set(draw, tiers);
    }
  }
  const bonusTierByDraw = buildRepeatTiers(windowDraws, (d) => d.bonusNumber);

  const tierLabel = (tier: number) =>
    tier === 1 ? '1st repeat' : tier === 2 ? '2nd repeat' : '3rd+ repeat';

  const cards = windowDraws
    .slice()
    .reverse()
    .map((draw) => {
      const mainTiers = mainTierByDraw.get(draw)!;
      const mainBadges = draw.mainNumbers
        .map((n) => {
          const tier = mainTiers.get(n);
          const tierClass = tier ? ` draw-ball-repeat-${tier}` : '';
          const title = tier
            ? ` title="Repeats within the last ${count} draws (${tierLabel(tier)})"`
            : '';
          return `<span class="number-badge draw-ball${tierClass}"${title}>${n}</span>`;
        })
        .join('');
      const bonusTier = bonusTierByDraw.get(draw);
      const bonusBadge =
        draw.bonusNumber !== null
          ? `<span class="number-badge draw-ball draw-ball-bonus${
              bonusTier ? ` draw-ball-bonus-repeat-${bonusTier}` : ''
            }" title="${game.bonusName}${
              bonusTier ? ` \u2014 repeats within the last ${count} draws (${tierLabel(bonusTier)})` : ''
            }">${draw.bonusNumber}</span>`
          : '';
      const total = draw.mainNumbers.reduce((sum, n) => sum + n, 0);
      const zScore = sumStats.stdDev > 0 ? (total - sumStats.mean) / sumStats.stdDev : 0;
      const zClass = zScore >= 0 ? 'draw-total-z-high' : 'draw-total-z-low';
      const zSign = zScore >= 0 ? '+' : '-';
      const zLabel = `${zSign}${Math.abs(zScore).toFixed(1)}\u03c3`;

      return `
        <li class="draw-card">
          <div class="draw-card-header">
            <span class="draw-date">${formatIsoDate(draw.drawDate)}</span>
            <span class="draw-total" title="Main numbers total (${zLabel} vs. the era average)">
              <span class="draw-total-value">${total}</span>
              <span class="draw-total-z ${zClass}">${zLabel}</span>
            </span>
          </div>
          <span class="draw-balls">${mainBadges}${bonusBadge}</span>
        </li>`;
    })
    .join('');

  container.innerHTML = `<ul class="recent-draws-grid">${cards}</ul>`;
}


