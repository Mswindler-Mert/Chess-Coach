import { applyGameFilter, type GameFilter } from '../core/games/filter'
import type { Game } from '../core/games/model'
import { userErrors, type GameErrors } from '../core/stats/dashboard'
import { getGameFilter, listGames } from './games'
import { db } from './schema'

export interface DashboardData {
  filter: GameFilter
  /** Games matching the shared filter (tempos + date range), newest first. */
  games: Game[]
  /** The analysed ones among them, reduced to the user's errors. */
  errors: GameErrors[]
}

export async function loadDashboard(username: string, now: number): Promise<DashboardData> {
  const [all, filter] = await Promise.all([listGames(username), getGameFilter()])
  const games = applyGameFilter(all, filter, now)
  const analyses = await db.analyses.bulkGet(games.map((g) => g.id))
  const errors: GameErrors[] = []
  games.forEach((game, i) => {
    const analysis = analyses[i]
    if (analysis && analysis.moves.length > 0) errors.push(userErrors(game, analysis))
  })
  return { filter, games, errors }
}
