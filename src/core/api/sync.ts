import { fetchArchives, fetchMonth, type HttpDeps } from './chesscom'
import type { RawGame } from './types'

export interface ArchiveMonth {
  year: number
  /** 1–12 */
  month: number
}

/** Reads year and month from an archive URL such as `.../games/2026/11`. */
export function parseArchiveUrl(url: string): ArchiveMonth | null {
  const match = /\/games\/(\d{4})\/(\d{2})\/?$/.exec(url)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) }
}

/** Start of the month after `month`, in ms since epoch (UTC). */
export function monthEndMs({ year, month }: ArchiveMonth): number {
  return Date.UTC(year, month, 1)
}

/**
 * Picks which archive months need fetching, oldest first.
 * A month is fetched when it was never fetched, or when the last fetch happened before the month
 * was over (so it may be missing games). Finished months fetched after they ended are skipped.
 *
 * @param fetchedAt archive URL → time of last successful fetch (ms)
 */
export function planSync(
  archiveUrls: readonly string[],
  fetchedAt: ReadonlyMap<string, number>,
): string[] {
  return archiveUrls.filter((url) => {
    const last = fetchedAt.get(url)
    if (last === undefined) return true
    const month = parseArchiveUrl(url)
    if (!month) return true
    return last < monthEndMs(month)
  })
}

export interface SyncStore {
  /** Archive URL → last fetch time (ms) for this user. */
  getFetchedAt(): Promise<Map<string, number>>
  /** Saves one month's games and marks the month as fetched at `fetchedAt`. */
  saveMonth(archiveUrl: string, games: RawGame[], fetchedAt: number): Promise<void>
}

export interface SyncProgress {
  done: number
  total: number
}

export interface SyncDeps extends HttpDeps {
  store: SyncStore
  now: () => number
  onProgress?: (progress: SyncProgress) => void
}

export interface SyncResult {
  monthsFetched: number
  gamesFetched: number
}

/** Fetches new and unfinished months one by one and saves each as soon as it arrives. */
export async function syncGames(username: string, deps: SyncDeps): Promise<SyncResult> {
  const archiveUrls = await fetchArchives(username, deps)
  const toFetch = planSync(archiveUrls, await deps.store.getFetchedAt())
  // Newest months first, so the latest games show up quickly.
  toFetch.reverse()

  let gamesFetched = 0
  deps.onProgress?.({ done: 0, total: toFetch.length })
  for (const [index, url] of toFetch.entries()) {
    const fetchedAt = deps.now()
    const games = await fetchMonth(url, deps)
    await deps.store.saveMonth(url, games, fetchedAt)
    gamesFetched += games.length
    deps.onProgress?.({ done: index + 1, total: toFetch.length })
  }
  return { monthsFetched: toFetch.length, gamesFetched }
}
