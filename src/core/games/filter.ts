import type { Game, TimeClass } from './model'

export const ALL_TIME_CLASSES: readonly TimeClass[] = ['bullet', 'blitz', 'rapid', 'daily']

/**
 * Default tempos for the list and for analysis. Bullet is too fast to learn from and daily clocks
 * are not real game clocks; both stay hidden until the user turns them on.
 */
export const DEFAULT_TIME_CLASSES: readonly TimeClass[] = ['blitz', 'rapid']

/** Games whose tempo is in `timeClasses`, newest first. */
export function filterGames(games: readonly Game[], timeClasses: readonly TimeClass[]): Game[] {
  const wanted = new Set(timeClasses)
  return games.filter((g) => wanted.has(g.timeClass)).sort((a, b) => b.endTime - a.endTime)
}

export type DateRange = '30d' | '90d' | 'all'

export const DATE_RANGES: readonly DateRange[] = ['30d', '90d', 'all']

/**
 * Default date range for the list, analysis and (later) puzzles and the dashboard: recent games
 * show the user's current level best.
 */
export const DEFAULT_DATE_RANGE: DateRange = '30d'

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_DAYS: Record<Exclude<DateRange, 'all'>, number> = { '30d': 30, '90d': 90 }

/** Below this many games in the selected range, the UI suggests widening it. */
export const FEW_GAMES_THRESHOLD = 10

export function isDateRange(value: unknown): value is DateRange {
  return typeof value === 'string' && (DATE_RANGES as readonly string[]).includes(value)
}

/** Earliest end time (ms) inside the range, or null for "all". */
export function dateRangeStart(range: DateRange, now: number): number | null {
  return range === 'all' ? null : now - RANGE_DAYS[range] * DAY_MS
}

/** Games that ended within `range` before `now`. */
export function filterByDateRange(games: readonly Game[], range: DateRange, now: number): Game[] {
  const start = dateRangeStart(range, now)
  return start === null ? [...games] : games.filter((g) => g.endTime >= start)
}

/** The filter every module shares: tempos plus date range. */
export interface GameFilter {
  timeClasses: readonly TimeClass[]
  dateRange: DateRange
}

/** Games matching both the tempos and the date range, newest first. */
export function applyGameFilter(games: readonly Game[], filter: GameFilter, now: number): Game[] {
  return filterGames(filterByDateRange(games, filter.dateRange, now), filter.timeClasses)
}

/** Number of games per tempo, for the filter buttons. */
export function countByTimeClass(games: readonly Game[]): Record<TimeClass, number> {
  const counts: Record<TimeClass, number> = { bullet: 0, blitz: 0, rapid: 0, daily: 0 }
  for (const g of games) counts[g.timeClass]++
  return counts
}

/** Adds or removes one tempo, keeping the canonical order. */
export function toggleTimeClass(selected: readonly TimeClass[], timeClass: TimeClass): TimeClass[] {
  const next = new Set(selected)
  if (next.has(timeClass)) next.delete(timeClass)
  else next.add(timeClass)
  return ALL_TIME_CLASSES.filter((tc) => next.has(tc))
}
