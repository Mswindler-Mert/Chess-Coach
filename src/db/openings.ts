import { applyGameFilter, type GameFilter } from '../core/games/filter'
import type { Game } from '../core/games/model'
import { buildReplay } from '../core/games/replay'
import { checkPrinciples, type PrincipleWarning } from '../core/openings/principles'
import { getGameFilter, listGames } from './games'

export interface OpeningsData {
  filter: GameFilter
  /** Games matching the shared filter, newest first. */
  games: Game[]
  /** Principle warnings per game id (games whose PGN could not be read are left out). */
  warnings: Map<string, PrincipleWarning[]>
}

export async function loadOpenings(username: string, now: number): Promise<OpeningsData> {
  const [all, filter] = await Promise.all([listGames(username), getGameFilter()])
  const games = applyGameFilter(all, filter, now)
  const warnings = new Map<string, PrincipleWarning[]>()
  for (const game of games) {
    try {
      warnings.set(game.id, checkPrinciples(buildReplay(game.pgn), game.userColor))
    } catch {
      // Unreadable PGN: no principle check for this game.
    }
  }
  return { filter, games, warnings }
}
