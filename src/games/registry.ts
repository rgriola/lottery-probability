import type { GameConfig, NormalizedDraw, SocrataRow } from '../types/lottery';
export type { GameConfig } from '../types/lottery';

/**
 * Parses a space-separated string of numbers (as used in Socrata's
 * `winning_numbers` fields) into an array of integers.
 */
function parseNumberList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .trim()
    .split(/\s+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n));
}

/**
 * Mega Millions: 5 main numbers (1-70) in `winning_numbers`, plus a
 * separate `mega_ball` field.
 * Dataset: https://dev.socrata.com/foundry/data.ny.gov/5xaw-6ayf
 *
 * Rule history (verified against the live dataset):
 *  - Main pool was 1-70 starting the 2017-10-31 draw (previously 1-75).
 *  - Mega Ball pool shrank from 1-25 to 1-24 starting the 2025-04-08 draw.
 */
export const megaMillions: GameConfig = {
  id: 'mega-millions',
  name: 'Mega Millions',
  mainPool: { min: 1, max: 70, count: 5, effectiveSince: '2017-10-31' },
  bonusPool: { min: 1, max: 24, count: 1, effectiveSince: '2025-04-08' },
  bonusName: 'Mega Ball',
  datasetId: '5xaw-6ayf',
  enabled: true,
  parseRow(row: SocrataRow): NormalizedDraw | null {
    const mainNumbers = parseNumberList(row.winning_numbers);
    const bonusNumber = row.mega_ball ? parseInt(row.mega_ball, 10) : NaN;
    const drawDate = row.draw_date ? row.draw_date.slice(0, 10) : null;

    if (!drawDate || mainNumbers.length !== 5 || !Number.isFinite(bonusNumber)) {
      return null;
    }

    return {
      gameId: 'mega-millions',
      drawDate,
      mainNumbers: mainNumbers.sort((a, b) => a - b),
      bonusNumber,
    };
  },
};

/**
 * Powerball: Socrata packs all 6 numbers into one `winning_numbers` field -
 * the first 5 are the main numbers and the LAST one is the Powerball,
 * unlike Mega Millions which splits the bonus ball into its own field.
 * Dataset: https://dev.socrata.com/foundry/data.ny.gov/d6yy-54nr
 *
 * Rule history (verified against the live dataset): both pools changed
 * together starting the 2015-10-07 draw (main 1-59 -> 1-69, bonus 1-35 -> 1-26).
 *
 * Phase 2: flip `enabled` to true once the Mega Millions pipeline is proven
 * end-to-end - the adapter below already normalizes it to the same shape.
 */
export const powerball: GameConfig = {
  id: 'powerball',
  name: 'Powerball',
  mainPool: { min: 1, max: 69, count: 5, effectiveSince: '2015-10-07' },
  bonusPool: { min: 1, max: 26, count: 1, effectiveSince: '2015-10-07' },
  bonusName: 'Powerball',
  datasetId: 'd6yy-54nr',
  enabled: false,
  parseRow(row: SocrataRow): NormalizedDraw | null {
    const allNumbers = parseNumberList(row.winning_numbers);
    const drawDate = row.draw_date ? row.draw_date.slice(0, 10) : null;

    if (!drawDate || allNumbers.length !== 6) {
      return null;
    }

    const mainNumbers = allNumbers.slice(0, 5).sort((a, b) => a - b);
    const bonusNumber = allNumbers[5];

    return {
      gameId: 'powerball',
      drawDate,
      mainNumbers,
      bonusNumber,
    };
  },
};

export const games: GameConfig[] = [megaMillions, powerball];

export function getGame(id: string): GameConfig | undefined {
  return games.find((g) => g.id === id);
}
