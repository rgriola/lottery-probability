import type { NormalizedDraw } from '../types/lottery';

const DB_NAME = 'lottery-probability';
const DB_VERSION = 1;
const DRAWS_STORE = 'draws';
const META_STORE = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DRAWS_STORE)) {
        // Keyed by `${gameId}_${drawDate}` so re-syncing never creates duplicates.
        const store = db.createObjectStore(DRAWS_STORE, { keyPath: 'id' });
        store.createIndex('gameId', 'gameId', { unique: false });
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'gameId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

interface StoredDraw extends NormalizedDraw {
  id: string;
}

interface SyncMeta {
  gameId: string;
  lastSyncDate: string;
  drawCount: number;
}

/** Saves (or updates) a batch of normalized draws for a game. */
export async function saveDraws(draws: NormalizedDraw[]): Promise<void> {
  if (draws.length === 0) return;
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAWS_STORE, 'readwrite');
    const store = tx.objectStore(DRAWS_STORE);

    draws.forEach((draw) => {
      const record: StoredDraw = { ...draw, id: `${draw.gameId}_${draw.drawDate}` };
      store.put(record);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Returns all stored draws for a game, sorted oldest to newest. */
export async function getDraws(gameId: string): Promise<NormalizedDraw[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAWS_STORE, 'readonly');
    const index = tx.objectStore(DRAWS_STORE).index('gameId');
    const request = index.getAll(IDBKeyRange.only(gameId));

    request.onsuccess = () => {
      const draws = (request.result as StoredDraw[]).sort((a, b) =>
        a.drawDate.localeCompare(b.drawDate)
      );
      resolve(draws);
    };
    request.onerror = () => reject(request.error);
  });
}

/** Reads sync metadata (last synced date, draw count) for a game. */
export async function getSyncMeta(gameId: string): Promise<SyncMeta | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const request = tx.objectStore(META_STORE).get(gameId);
    request.onsuccess = () => resolve((request.result as SyncMeta) ?? null);
    request.onerror = () => reject(request.error);
  });
}

/** Writes sync metadata for a game after a successful sync. */
export async function setSyncMeta(meta: SyncMeta): Promise<void> {
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    tx.objectStore(META_STORE).put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
