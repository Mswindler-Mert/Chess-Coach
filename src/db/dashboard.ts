import { tagGame } from '../core/analysis/motifs'
import { applyGameFilter, type GameFilter } from '../core/games/filter'
import { buildReplay, type Replay } from '../core/games/replay'
import type { Game } from '../core/games/model'
import { userErrors, type GameErrors } from '../core/stats/dashboard'
import { diagnosePlayer, type DiagnosisEntry, type PlayerDiagnosis } from '../core/stats/diagnosis'
import { getGameFilter, listGames } from './games'
import { db } from './schema'

export interface DashboardData {
  filter: GameFilter
  /** Games matching the shared filter (tempos + date range), newest first. */
  games: Game[]
  /** The analysed ones among them, reduced to the user's errors. */
  errors: GameErrors[]
  /** Personal diagnosis: most hung pieces, collapse move range, and nemesis opening replies. */
  diagnosis: PlayerDiagnosis
}

export async function loadDashboard(username: string, now: number): Promise<DashboardData> {
  const [all, filter] = await Promise.all([listGames(username), getGameFilter()])
  const games = applyGameFilter(all, filter, now)
  const analyses = await db.analyses.bulkGet(games.map((g) => g.id))
  const errors: GameErrors[] = []
  const diagEntries: DiagnosisEntry[] = []
  games.forEach((game, i) => {
    const analysis = analyses[i]
    if (!analysis || analysis.moves.length === 0) return
    let replay: Replay | undefined
    let motifs: ReturnType<typeof tagGame> = []
    try {
      replay = buildReplay(game.pgn)
      motifs = tagGame(game, replay, analysis)
    } catch {
      // Unreadable PGN: count the errors without motifs.
    }
    errors.push(userErrors(game, analysis, motifs))
    diagEntries.push({ game, analysis, replay })
  })
  return { filter, games, errors, diagnosis: diagnosePlayer(diagEntries) }
}
