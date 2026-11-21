import { tagGame } from '../core/analysis/motifs'
import { applyGameFilter } from '../core/games/filter'
import { buildReplay } from '../core/games/replay'
import { generateHangingDrills, type HangingDrill } from '../core/training/hangingDrills'
import { getGameFilter, listGames } from './games'
import { db } from './schema'

/** Hanging-piece drills from the analysed games in the shared filter (tempos + date range). */
export async function loadHangingDrills(username: string, now: number): Promise<HangingDrill[]> {
  const [all, filter] = await Promise.all([listGames(username), getGameFilter()])
  const games = applyGameFilter(all, filter, now)
  const analyses = await db.analyses.bulkGet(games.map((g) => g.id))
  const drills: HangingDrill[] = []
  games.forEach((game, i) => {
    const analysis = analyses[i]
    if (!analysis) return
    try {
      const replay = buildReplay(game.pgn)
      drills.push(...generateHangingDrills(game, replay, analysis, tagGame(game, replay, analysis)))
    } catch {
      // Unreadable PGN: no drills from this game.
    }
  })
  return drills
}
