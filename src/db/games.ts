import { defaultHttpDeps } from '../core/api/chesscom'
import { syncGames, type SyncProgress, type SyncResult, type SyncStore } from '../core/api/sync'
import { DEFAULT_TIME_CLASSES } from '../core/games/filter'
import { normalizeGame, type Game, type TimeClass } from '../core/games/model'
import { db, type ChessCoachDb } from './schema'

export function createSyncStore(username: string, database: ChessCoachDb = db): SyncStore {
  return {
    async getFetchedAt() {
      const records = await database.archives.where('username').equals(username).toArray()
      return new Map(records.map((r) => [r.url, r.fetchedAt]))
    },
    async saveMonth(url, rawGames, fetchedAt) {
      const games = rawGames
        .map((raw) => normalizeGame(raw, username))
        .filter((g): g is Game => g !== null)
      await database.transaction('rw', database.games, database.archives, async () => {
        await database.games.bulkPut(games)
        await database.archives.put({ username, url, fetchedAt, rawGameCount: rawGames.length })
      })
    },
  }
}

type ProgressListener = (progress: SyncProgress) => void

const inFlight = new Map<
  string,
  { promise: Promise<SyncResult>; listeners: Set<ProgressListener> }
>()

/**
 * Downloads new games of `username` from Chess.com into IndexedDB.
 * Concurrent calls for the same user share one run, so requests never go out in parallel.
 */
export function syncUserGames(
  username: string,
  onProgress?: ProgressListener,
): Promise<SyncResult> {
  let entry = inFlight.get(username)
  if (!entry) {
    const listeners = new Set<ProgressListener>()
    const promise = syncGames(username, {
      ...defaultHttpDeps,
      store: createSyncStore(username),
      now: () => Date.now(),
      onProgress: (progress) => listeners.forEach((listener) => listener(progress)),
    }).finally(() => inFlight.delete(username))
    entry = { promise, listeners }
    inFlight.set(username, entry)
  }
  if (onProgress) entry.listeners.add(onProgress)
  return entry.promise
}

export function listGames(username: string): Promise<Game[]> {
  return db.games.where('username').equals(username).toArray()
}

export function getGame(id: string): Promise<Game | undefined> {
  return db.games.get(id)
}

export async function lastSyncedAt(username: string): Promise<number | null> {
  const records = await db.archives.where('username').equals(username).toArray()
  return records.length ? Math.max(...records.map((r) => r.fetchedAt)) : null
}

// --- settings ---

const LAST_USERNAME = 'lastUsername'
const TIME_CLASSES = 'timeClasses'

export async function getLastUsername(): Promise<string | null> {
  const record = await db.settings.get(LAST_USERNAME)
  return typeof record?.value === 'string' ? record.value : null
}

export async function setLastUsername(username: string): Promise<void> {
  await db.settings.put({ key: LAST_USERNAME, value: username })
}

export async function getTimeClasses(): Promise<TimeClass[]> {
  const record = await db.settings.get(TIME_CLASSES)
  return Array.isArray(record?.value) ? (record.value as TimeClass[]) : [...DEFAULT_TIME_CLASSES]
}

export async function setTimeClasses(timeClasses: TimeClass[]): Promise<void> {
  await db.settings.put({ key: TIME_CLASSES, value: timeClasses })
}
