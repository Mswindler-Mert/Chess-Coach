import { applyGameFilter, type GameFilter } from '../games/filter'
import type { Game } from '../games/model'

/**
 * Games still waiting for analysis: only those matching the shared filter (tempos and date range),
 * newest first. `priorityId` (a game the user opened and asked for) goes to the front.
 */
export function planAnalysisQueue(
  games: readonly Game[],
  analyzedIds: ReadonlySet<string>,
  filter: GameFilter,
  now: number,
  priorityId?: string,
): Game[] {
  const pending = applyGameFilter(games, filter, now).filter((g) => !analyzedIds.has(g.id))
  const index = priorityId ? pending.findIndex((g) => g.id === priorityId) : -1
  if (index <= 0) return pending
  const [priority] = pending.splice(index, 1)
  return priority ? [priority, ...pending] : pending
}
