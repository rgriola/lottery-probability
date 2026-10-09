import type { SuggestedCombo } from "../stats/combinationGenerator";

/** Renders a ranked list of suggested 5+bonus combinations as ticket-style
 *  cards, with the filters used shown per-combo (sum, odd/even split, score). */
export function renderSuggestedCombinations(
  container: HTMLElement,
  combos: SuggestedCombo[],
): void {
  if (combos.length === 0) {
    container.innerHTML = `<p class="pool-meta">Not enough qualifying combinations found - try widening the filters.</p>`;
    return;
  }

  const rows = combos
    .map((combo, i) => {
      const mainBalls = combo.numbers
        .map((n) => `<span class="number-badge draw-ball">${n}</span>`)
        .join("");
      const bonusBall = `<span class="number-badge draw-ball draw-ball-bonus">${combo.bonusNumber}</span>`;

      return `
        <li class="suggested-combo">
          <span class="suggested-combo-rank">#${i + 1}</span>
          <span class="draw-balls suggested-combo-balls">${mainBalls}${bonusBall}</span>
          <span class="suggested-combo-stats">
            <span class="suggested-combo-stat">Sum <strong>${combo.sum}</strong></span>
            <span class="suggested-combo-stat">${combo.oddCount} odd / ${combo.evenCount} even</span>
            <span class="suggested-combo-stat">Score <strong>${combo.score.toFixed(1)}</strong></span>
          </span>
        </li>`;
    })
    .join("");

  container.innerHTML = `<ul class="suggested-combo-list">${rows}</ul>`;
}
