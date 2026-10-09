import type { NumberPool, NormalizedDraw } from "../types/lottery";

/** Pulls the relevant numbers out of one draw for a given pool field. */
function drawNumbers(draw: NormalizedDraw, field: "mainNumbers" | "bonusNumber"): number[] {
  if (field === "mainNumbers") return draw.mainNumbers;
  return draw.bonusNumber === null ? [] : [draw.bonusNumber];
}

/** Renders a side-panel list of pool numbers that have NOT appeared in the
 *  most recent `count` draws ("cold" numbers), sorted ascending. Works for
 *  either the main-number pool or the bonus-ball pool. */
export function renderColdNumbers(
  container: HTMLElement,
  pool: NumberPool,
  field: "mainNumbers" | "bonusNumber",
  draws: NormalizedDraw[],
  count: number,
): void {
  const recent = draws.slice(-count);
  const seen = new Set<number>();
  for (const draw of recent) {
    for (const n of drawNumbers(draw, field)) seen.add(n);
  }

  const cold: number[] = [];
  for (let n = pool.min; n <= pool.max; n++) {
    if (!seen.has(n)) cold.push(n);
  }

  if (cold.length === 0) {
    container.innerHTML = `<p class="pool-meta">Every number in the pool has appeared in the last ${count} draws.</p>`;
    return;
  }

  // For each cold number, count draws since its last appearance using the
  // full history (not just the visible window), so the gap is accurate even
  // for numbers that haven't hit in a very long time.
  const sinceLastSeen = new Map<number, number | null>();
  for (const n of cold) {
    let gap: number | null = null;
    for (let i = draws.length - 1; i >= 0; i--) {
      if (drawNumbers(draws[i], field).includes(n)) {
        gap = draws.length - 1 - i;
        break;
      }
    }
    sinceLastSeen.set(n, gap);
  }

  const badges = cold
    .map((n) => {
      const gap = sinceLastSeen.get(n) ?? null;
      const gapLabel = gap === null ? "never drawn" : `${gap} draws ago`;
      const gapText = gap === null ? "never" : `${gap}d ago`;
      return `<span class="number-badge draw-ball cold-ball" title="Last seen ${gapLabel}">${n}<small class="cold-ball-gap">${gapText}</small></span>`;
    })
    .join("");

  container.innerHTML = `
    <p class="pool-meta">${cold.length} of ${pool.max - pool.min + 1} numbers not in last ${count} draws.</p>
    <div class="cold-numbers-grid">${badges}</div>`;
}
