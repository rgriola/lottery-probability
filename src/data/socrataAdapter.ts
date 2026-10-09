import type { GameConfig, NormalizedDraw, SocrataRow } from '../types/lottery';

const SOCRATA_BASE = 'https://data.ny.gov/resource';

/**
 * Fetches rows for a game's Socrata dataset and normalizes them.
 *
 * @param game - The game config describing the dataset and row parser.
 * @param sinceDate - If provided (YYYY-MM-DD), only fetches draws strictly
 *   after this date (used for incremental sync). Omit for a full history fetch.
 */
export async function fetchDraws(
  game: GameConfig,
  sinceDate?: string
): Promise<NormalizedDraw[]> {
  const params = new URLSearchParams({
    $order: 'draw_date ASC',
    $limit: '50000',
  });

  if (sinceDate) {
    params.set('$where', `draw_date > '${sinceDate}T00:00:00.000'`);
  }

  const url = `${SOCRATA_BASE}/${game.datasetId}.json?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${game.name} data: ${response.status} ${response.statusText}`
    );
  }

  const rows: SocrataRow[] = await response.json();

  return rows
    .map((row) => game.parseRow(row))
    .filter((draw): draw is NormalizedDraw => draw !== null);
}
