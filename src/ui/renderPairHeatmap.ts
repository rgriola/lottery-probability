import { topPairs, type PairFrequencyResult } from '../stats/pairFrequency';

const CELL_SIZE = 10;
/** Reserved space along the top/left edges for number axis labels. */
const LABEL_MARGIN = 28;
const LABEL_INTERVAL = 5;

const CELL_EMPTY = { r: 245, g: 245, b: 245 }; // light grey, matches .insight-card background
const CELL_HOT = { r: 234, g: 88, b: 12 }; // --accent orange

function colorForCount(count: number, maxCount: number): string {
  if (maxCount <= 0 || count <= 0) return `rgb(${CELL_EMPTY.r}, ${CELL_EMPTY.g}, ${CELL_EMPTY.b})`;
  const t = count / maxCount;
  const r = Math.round(CELL_EMPTY.r + (CELL_HOT.r - CELL_EMPTY.r) * t);
  const g = Math.round(CELL_EMPTY.g + (CELL_HOT.g - CELL_EMPTY.g) * t);
  const b = Math.round(CELL_EMPTY.b + (CELL_HOT.b - CELL_EMPTY.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function draw(canvas: HTMLCanvasElement, result: PairFrequencyResult): void {
  const dpr = window.devicePixelRatio || 1;
  const gridSize = result.size * CELL_SIZE;
  const totalSize = gridSize + LABEL_MARGIN;

  canvas.style.width = `${totalSize}px`;
  canvas.style.height = `${totalSize}px`;
  canvas.width = Math.round(totalSize * dpr);
  canvas.height = Math.round(totalSize * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, totalSize, totalSize);

  // Cells (skip the diagonal - a number can't pair with itself).
  for (let i = 0; i < result.size; i++) {
    for (let j = 0; j < result.size; j++) {
      if (i === j) continue;
      ctx.fillStyle = colorForCount(result.matrix[i][j], result.maxCount);
      ctx.fillRect(
        LABEL_MARGIN + j * CELL_SIZE,
        LABEL_MARGIN + i * CELL_SIZE,
        CELL_SIZE - 0.5,
        CELL_SIZE - 0.5
      );
    }
  }

  // Axis labels every LABEL_INTERVAL numbers, along the left (rows) and top (columns).
  ctx.fillStyle = '#111';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < result.size; i++) {
    const num = result.min + i;
    if (num % LABEL_INTERVAL !== 0) continue;
    const center = LABEL_MARGIN + i * CELL_SIZE + CELL_SIZE / 2;

    ctx.textAlign = 'right';
    ctx.fillText(String(num), LABEL_MARGIN - 4, center);

    ctx.save();
    ctx.translate(center, LABEL_MARGIN - 4);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'left';
    ctx.fillText(String(num), 0, 0);
    ctx.restore();
  }
}

/** Wires up a hover tooltip showing the exact pair and co-occurrence count under the cursor. */
function attachTooltip(
  canvas: HTMLCanvasElement,
  tooltipEl: HTMLElement,
  result: PairFrequencyResult
): void {
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - LABEL_MARGIN;
    const y = e.clientY - rect.top - LABEL_MARGIN;
    const j = Math.floor(x / CELL_SIZE);
    const i = Math.floor(y / CELL_SIZE);

    if (i < 0 || i >= result.size || j < 0 || j >= result.size || i === j) {
      tooltipEl.style.display = 'none';
      return;
    }

    const a = result.min + i;
    const b = result.min + j;
    const count = result.matrix[i][j];
    tooltipEl.textContent = `${a} & ${b}: ${count} draw${count === 1 ? '' : 's'}`;
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = `${e.clientX + 14}px`;
    tooltipEl.style.top = `${e.clientY + 14}px`;
  };

  canvas.onmouseleave = () => {
    tooltipEl.style.display = 'none';
  };
}

/**
 * Renders a heatmap of how often every possible pair of main numbers has
 * appeared together, so clusters of frequently-co-occurring numbers (which a
 * single-number frequency chart can't reveal) become visible at a glance.
 */
export function renderPairHeatmap(
  canvas: HTMLCanvasElement,
  metaEl: HTMLElement,
  tooltipEl: HTMLElement,
  result: PairFrequencyResult
): void {
  draw(canvas, result);
  attachTooltip(canvas, tooltipEl, result);

  const top = topPairs(result, 1);
  metaEl.textContent =
    top.length > 0
      ? `Across ${result.totalDraws} draws, ${top[0].a} & ${top[0].b} is the most frequent pair (together ${top[0].count} times). Darker cells = more frequent pairings. Hover a cell for exact counts.`
      : 'Not enough data yet to compute pair frequency.';
}
