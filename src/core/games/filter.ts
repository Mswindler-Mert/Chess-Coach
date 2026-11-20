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
