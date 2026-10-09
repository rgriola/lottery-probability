import { BubbleController, Chart, LinearScale, PointElement, Tooltip } from 'chart.js';
import type { PairFrequencyResult } from '../stats/pairFrequency';
import { topPairs } from '../stats/pairFrequency';

Chart.register(BubbleController, PointElement, LinearScale, Tooltip);

// Recency color scale reuses the app's existing hot/cold palette: recently
// co-occurring pairs render warm/orange, long-dormant pairs render cool/blue.
const RECENT_COLOR = [249, 115, 22] as const; // #f97316 (hot)
const STALE_COLOR = [56, 189, 248] as const; // #38bdf8 (cold)
const MIN_RADIUS = 4;
const MAX_RADIUS = 18;
// Plotting every co-occurring pair (2000+) makes bubbles overlap into an
// unreadable solid mass; limiting to the strongest pairs keeps individual
// bubbles (and their size/color differences) visually distinguishable.
const TOP_N = 120;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolates between the "recent" and "stale" colors; t=0 is most recent, t=1 is most stale. */
function recencyColor(t: number, alpha: number): string {
  const r = Math.round(lerp(RECENT_COLOR[0], STALE_COLOR[0], t));
  const g = Math.round(lerp(RECENT_COLOR[1], STALE_COLOR[1], t));
  const b = Math.round(lerp(RECENT_COLOR[2], STALE_COLOR[2], t));
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

/**
 * Renders the strongest co-occurring pairs as bubbles at (number A, number B).
 * Two independent dimensions are encoded: bubble size is overall frequency
 * (how often the pair has appeared), and color is recency (how long since it
 * last appeared) - so a pair that's both common AND recently active looks
 * different from one that's common but has gone cold.
 */
export function renderPairBubbleChart(
  canvas: HTMLCanvasElement,
  metaEl: HTMLElement,
  result: PairFrequencyResult
): Chart {
  const pairs = topPairs(result, TOP_N);
  const maxCount = result.maxCount || 1;
  const recencyValues = pairs.map((p) => p.drawsSinceLastSeen ?? result.totalDraws);
  const maxRecency = Math.max(...recencyValues, 1);

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const points = pairs.map((p, i) => {
    const sizeIntensity = p.count / maxCount;
    const recencyT = recencyValues[i] / maxRecency;
    return {
      x: p.a,
      y: p.b,
      r: MIN_RADIUS + sizeIntensity * (MAX_RADIUS - MIN_RADIUS),
      count: p.count,
      drawsSinceLastSeen: p.drawsSinceLastSeen,
      color: recencyColor(recencyT, 0.75),
      borderColor: recencyColor(recencyT, 0.9),
    };
  });

  metaEl.textContent = `Showing the ${pairs.length} strongest pairs. Size = how often paired; color = recency (orange = recent, blue = long since).`;

  return new Chart(canvas, {
    type: 'bubble',
    data: {
      datasets: [
        {
          label: 'Pair frequency',
          data: points,
          backgroundColor: points.map((p) => p.color),
          borderColor: points.map((p) => p.borderColor),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: result.min,
          max: result.max,
          title: { display: true, text: 'Number' },
        },
        y: {
          min: result.min,
          max: result.max,
          title: { display: true, text: 'Number' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw = ctx.raw as { x: number; y: number; count: number; drawsSinceLastSeen: number | null };
              const recency =
                raw.drawsSinceLastSeen === null
                  ? ''
                  : raw.drawsSinceLastSeen === 0
                    ? ' (last draw)'
                    : ` (${raw.drawsSinceLastSeen} draws ago)`;
              return `${raw.x} & ${raw.y}: ${raw.count} draws${recency}`;
            },
          },
        },
      },
    },
  });
}

