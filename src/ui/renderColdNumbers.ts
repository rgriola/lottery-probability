import type { GameConfig } from "../games/registry";
import type { NormalizedDraw } from "../types/lottery";

/** Renders a side-panel list of main-pool numbers that have NOT appeared in
 *  the most recent `count` draws ("cold" numbers), sorted ascending. */
export function renderColdNumbers(
  container: HTMLElement,
  game: GameConfig,
  draws: NormalizedDraw[],
  count: number,
): void {
  const recent = draws.slice(-count);
  const seen = new Set<number>();
  for (const draw of recent) {
    for (const n of draw.mainNumbers) seen.add(n);
  }

  const cold: number[] = [];
  for (let n = game.mainPool.min; n <= game.mainPool.max; n++) {
    if (!seen.has(n)) cold.push(n);
  }

  if (cold.length === 0) {
    container.innerHTML = `<p class="pool-meta">Every number in the pool has appeared in the last ${count} draws.</p>`;
    return;
  }

  const badges = cold
    .map((n) => `<span class="number-badge draw-ball cold-ball">${n}</span>`)
    .join("");

  container.innerHTML = `
    <p class="pool-meta">${cold.length} of ${game.mainPool.max - game.mainPool.min + 1} numbers not in last ${count} draws.</p>
    <div class="cold-numbers-grid">${badges}</div>`;
}
