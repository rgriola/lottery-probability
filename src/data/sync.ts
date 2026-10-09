import type { GameConfig, NormalizedDraw } from '../types/lottery';
import { fetchDraws } from './socrataAdapter';
import { getDraws, getSyncMeta, saveDraws, setSyncMeta } from './db';

export interface SyncResult {
  draws: NormalizedDraw[];
  newDrawCount: number;
  lastSyncDate: string | null;
}

/**
 * Syncs a game's draw history: fetches only draws newer than the last sync
 * (or the full history on first run), stores them in IndexedDB, and returns
 * the complete up-to-date draw list for analysis.
 */
export async function syncGame(game: GameConfig): Promise<SyncResult> {
  const meta = await getSyncMeta(game.id);
  const fetched = await fetchDraws(game, meta?.lastSyncDate);

  if (fetched.length > 0) {
    await saveDraws(fetched);
    const latestDate = fetched[fetched.length - 1].drawDate;
    const allDraws = await getDraws(game.id);

    await setSyncMeta({
      gameId: game.id,
      lastSyncDate: latestDate,
      drawCount: allDraws.length,
    });

    return { draws: allDraws, newDrawCount: fetched.length, lastSyncDate: latestDate };
  }

  const existingDraws = await getDraws(game.id);
  return {
    draws: existingDraws,
    newDrawCount: 0,
    lastSyncDate: meta?.lastSyncDate ?? null,
  };
}

/** Loads whatever draw history is already cached, without hitting the network. */
export async function loadCachedDraws(game: GameConfig): Promise<SyncResult> {
  const meta = await getSyncMeta(game.id);
  const draws = await getDraws(game.id);
  return { draws, newDrawCount: 0, lastSyncDate: meta?.lastSyncDate ?? null };
}
