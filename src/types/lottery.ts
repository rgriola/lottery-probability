/**
 * Uniform lottery data model.
 *
 * Every supported game (Mega Millions, Powerball, ...) is adapted into this
 * single shape so the rest of the app (storage, stats, charts) never has to
 * know about game-specific quirks like field names or number counts.
 */

/** Describes a pool of numbers a game draws from (main numbers or bonus ball). */
export interface NumberPool {
  /** Lowest possible number (inclusive). */
  min: number;
  /** Highest possible number (inclusive). */
  max: number;
  /** How many numbers are drawn from this pool per draw. */
  count: number;
  /**
   * ISO date (YYYY-MM-DD) of the first draw under these exact min/max/count
   * rules. Draws before this date used a different number pool (a prior
   * "rules era") and must be excluded when analyzing this pool, since their
   * numbers aren't comparable to the current format.
   *
   * Main and bonus pools change independently (e.g. Mega Millions' main pool
   * has been 1-70 since 2017, but its Mega Ball pool changed again in 2025),
   * so each pool tracks its own cutoff rather than sharing one per game.
   */
  effectiveSince: string;
}

/** A single historical drawing, normalized to the uniform shape. */
export interface NormalizedDraw {
  gameId: string;
  /** ISO date string (YYYY-MM-DD) of the drawing. */
  drawDate: string;
  /** The main numbers drawn, sorted ascending. */
  mainNumbers: number[];
  /** The bonus number drawn (Mega Ball / Powerball), or null if unavailable. */
  bonusNumber: number | null;
}

/** Raw row shape returned by a Socrata dataset (all values are strings). */
export type SocrataRow = Record<string, string>;

/** Configuration describing how to fetch and normalize one game's data. */
export interface GameConfig {
  id: string;
  name: string;
  mainPool: NumberPool;
  bonusPool: NumberPool;
  bonusName: string;
  /** Socrata dataset (resource) id on data.ny.gov. */
  datasetId: string;
  /** Converts one raw Socrata row into a NormalizedDraw, or null if invalid. */
  parseRow: (row: SocrataRow) => NormalizedDraw | null;
  /** Whether this game is wired up for syncing/analysis yet. */
  enabled: boolean;
}
