import { filterGames } from '../games/filter'
import type { Game, TimeClass } from '../games/model'

/**
 * Games still waiting for analysis: only the tempos selected in the filter, newest first.
 * `priorityId` (a game the user opened and asked for) goes to the front.
 */
export function planAnalysisQueue(
  games: readonly Game[],
  analyzedIds: ReadonlySet<string>,
  timeClasses: readonly TimeClass[],
  priorityId?: string,
): Game[] {
  const pending = filterGames(games, timeClasses).filter((g) => !analyzedIds.has(g.id))
  const index = priorityId ? pending.findIndex((g) => g.id === priorityId) : -1
  if (index <= 0) return pending
  const [priority] = pending.splice(index, 1)
  return priority ? [priority, ...pending] : pending
}
