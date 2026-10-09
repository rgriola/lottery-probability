import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import type { NumberScore } from '../stats/probabilityScore';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const TOP_HIGHLIGHT_COLOR = 'rgba(234, 88, 12, 0.85)'; // top-ranked numbers
const BASE_COLOR = 'rgba(59, 130, 246, 0.55)';

// renderScoreChart's canvas always sits on the dark .pool-section card, so its
// axis text/gridlines need light colors to stay readable against that background.
const AXIS_TEXT_ON_DARK = '#e8eaed';
const GRID_LINE_ON_DARK = 'rgba(232, 234, 237, 0.15)';

/**
 * Renders a bar chart of combined probability scores across every number in
 * a pool, ordered numerically (not by rank) so it reads like a familiar
 * frequency histogram, with the top-ranked numbers highlighted.
 */
export function renderScoreChart(
  canvas: HTMLCanvasElement,
  scores: NumberScore[],
  topHighlightCount: number
): Chart {
  const byNumber = [...scores].sort((a, b) => a.number - b.number);
  const topNumbers = new Set(
    [...scores]
      .sort((a, b) => b.score - a.score)
      .slice(0, topHighlightCount)
      .map((s) => s.number)
  );

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: byNumber.map((s) => String(s.number)),
      datasets: [
        {
          label: 'Combined score',
          data: byNumber.map((s) => Math.round(s.score * 10) / 10),
          backgroundColor: byNumber.map((s) =>
            topNumbers.has(s.number) ? TOP_HIGHLIGHT_COLOR : BASE_COLOR
          ),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: { display: true, text: 'Score (0-100)', color: AXIS_TEXT_ON_DARK },
          ticks: { color: AXIS_TEXT_ON_DARK },
          grid: { color: GRID_LINE_ON_DARK },
        },
        x: {
          ticks: { autoSkip: true, maxTicksLimit: 24, color: AXIS_TEXT_ON_DARK },
          grid: { color: GRID_LINE_ON_DARK },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

/** Renders a generic bar chart from pre-labeled buckets (e.g. sum ranges or odd/even splits). */
export function renderHistogramChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  counts: number[],
  yAxisLabel: string
): Chart {
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: yAxisLabel,
          data: counts,
          backgroundColor: BASE_COLOR,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: yAxisLabel } },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}
