import { applyGameFilter } from '../core/games/filter'
import { buildReplay } from '../core/games/replay'
import type { PuzzleProgress } from '../core/training/leitner'
import { generatePuzzles, type Puzzle } from '../core/training/puzzles'
import { getGameFilter, listGames } from './games'
import { db } from './schema'

export interface PuzzleSet {
  puzzles: Puzzle[]
  /** Games in the shared filter, and how many of them are analysed. */
  games: number
  analyzed: number
}

/**
 * Puzzles from the analysed games that match the shared filter (tempos + date range).
 * Puzzles are rebuilt from the analyses each time, so they are never out of date.
 */
export async function loadPuzzles(username: string, now: number): Promise<PuzzleSet> {
  const [games, filter] = await Promise.all([listGames(username), getGameFilter()])
  const eligible = applyGameFilter(games, filter, now)
  const analyses = await db.analyses.bulkGet(eligible.map((g) => g.id))
  const puzzles: Puzzle[] = []
  let analyzed = 0
  eligible.forEach((game, i) => {
    const analysis = analyses[i]
    if (!analysis) return
    analyzed++
    try {
      puzzles.push(...generatePuzzles(game, buildReplay(game.pgn), analysis))
    } catch {
      // A PGN that cannot be replayed gives no puzzles.
    }
  })
  return { puzzles, games: eligible.length, analyzed }
}

export async function listPuzzleProgress(username: string): Promise<Map<string, PuzzleProgress>> {
  const records = await db.puzzleProgress.where('username').equals(username).toArray()
  return new Map(records.map((r) => [r.puzzleId, r]))
}

export async function savePuzzleProgress(progress: PuzzleProgress): Promise<void> {
  await db.puzzleProgress.put(progress)
}
