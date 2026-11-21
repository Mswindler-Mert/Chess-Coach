import { Dexie } from 'dexie'
import { defaultHttpDeps } from '../core/api/chesscom'
import { syncLichess, type LichessStore } from '../core/api/lichess'
import { sourceOf } from '../core/api/source'
import { syncGames, type SyncProgress, type SyncResult, type SyncStore } from '../core/api/sync'
import {
  DEFAULT_DATE_RANGE,
  DEFAULT_TIME_CLASSES,
  isDateRange,
  type DateRange,
  type GameFilter,
} from '../core/games/filter'
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

/** The archives row that records when a Lichess account was last checked. */
const LICHESS_SYNC_URL = 'lichess:games'

export function createLichessStore(account: string, database: ChessCoachDb = db): LichessStore {
  return {
    async newestEndTime() {
      const newest = await database.games
        .where('[username+endTime]')
        .between([account, Dexie.minKey], [account, Dexie.maxKey])
        .last()
      return newest?.endTime ?? null
    },
    async saveGames(games, fetchedAt) {
      await database.transaction('rw', database.games, database.archives, async () => {
        await database.games.bulkPut(games)
        const previous = await database.archives.get([account, LICHESS_SYNC_URL])
        await database.archives.put({
          username: account,
          url: LICHESS_SYNC_URL,
          fetchedAt,
          rawGameCount: (previous?.rawGameCount ?? 0) + games.length,
        })
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
 * Downloads new games of `username` (a Chess.com name or a "lichess:" key) into IndexedDB.
 * Concurrent calls for the same user share one run, so requests never go out in parallel.
 */
export function syncUserGames(
  username: string,
  onProgress?: ProgressListener,
): Promise<SyncResult> {
  let entry = inFlight.get(username)
  if (!entry) {
    const listeners = new Set<ProgressListener>()
    const onProgress = (progress: SyncProgress) =>
      listeners.forEach((listener) => listener(progress))
    const run =
      sourceOf(username) === 'lichess'
        ? syncLichess(username, {
            fetch: (url, init) => globalThis.fetch(url, init),
            now: () => Date.now(),
            store: createLichessStore(username),
            onProgress: notify,
          })
        : syncGames(username, {
            ...defaultHttpDeps,
            store: createSyncStore(username),
            now: () => Date.now(),
            onProgress: notify,
          })
    const promise = run.finally(() => inFlight.delete(username))
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
const DATE_RANGE = 'dateRange'

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

export async function getDateRange(): Promise<DateRange> {
  const record = await db.settings.get(DATE_RANGE)
  return isDateRange(record?.value) ? record.value : DEFAULT_DATE_RANGE
}

export async function setDateRange(range: DateRange): Promise<void> {
  await db.settings.put({ key: DATE_RANGE, value: range })
}

/** The saved filter shared by the game list, analysis and (later) puzzles and the dashboard. */
export async function getGameFilter(): Promise<GameFilter> {
  const [timeClasses, dateRange] = await Promise.all([getTimeClasses(), getDateRange()])
  return { timeClasses, dateRange }
}
