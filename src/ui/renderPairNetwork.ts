import { topPairs, type PairCount, type PairFrequencyResult } from '../stats/pairFrequency';

/** How many of the strongest connections to draw - keeps the graph readable instead of an illegible tangle. */
const TOP_N = 40;
const CANVAS_SIZE = 520;
const NODE_RADIUS = 3;
const LABEL_INTERVAL = 5;

function polarPoint(center: number, radius: number, angle: number): { x: number; y: number } {
  return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
}

function draw(canvas: HTMLCanvasElement, result: PairFrequencyResult, pairs: PairCount[]): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${CANVAS_SIZE}px`;
  canvas.style.height = `${CANVAS_SIZE}px`;
  canvas.width = Math.round(CANVAS_SIZE * dpr);
  canvas.height = Math.round(CANVAS_SIZE * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const center = CANVAS_SIZE / 2;
  const circleRadius = CANVAS_SIZE / 2 - 36;
  // Numbers are spread evenly around the circle in order, starting at the top.
  const angleFor = (num: number) => ((num - result.min) / result.size) * Math.PI * 2 - Math.PI / 2;
  const maxCount = pairs.length > 0 ? pairs[0].count : 1;

  // Connections are drawn first so number nodes/labels render on top of them.
  pairs.forEach((p) => {
    const a = polarPoint(center, circleRadius, angleFor(p.a));
    const b = polarPoint(center, circleRadius, angleFor(p.b));
    const strength = p.count / maxCount;
    ctx.strokeStyle = `rgba(234, 88, 12, ${0.15 + strength * 0.65})`;
    ctx.lineWidth = 0.5 + strength * 2.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  });

  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let num = result.min; num <= result.max; num++) {
    const { x, y } = polarPoint(center, circleRadius, angleFor(num));
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (num % LABEL_INTERVAL === 0) {
      const label = polarPoint(center, circleRadius + 14, angleFor(num));
      ctx.fillText(String(num), label.x, label.y);
    }
  }
}

/**
 * Renders a circular network graph connecting the strongest co-occurring
 * number pairs, so clusters of numbers that tend to be drawn together stand
 * out visually without needing to parse a dense grid of cell colors.
 */
export function renderPairNetwork(
  canvas: HTMLCanvasElement,
  metaEl: HTMLElement,
  result: PairFrequencyResult
): void {
  const pairs = topPairs(result, TOP_N);
  draw(canvas, result, pairs);

  metaEl.textContent =
    pairs.length > 0
      ? `Showing the ${pairs.length} strongest connections across ${result.totalDraws} draws. Thicker, darker lines = more frequent pairings.`
      : 'Not enough data yet to compute pair frequency.';
}
