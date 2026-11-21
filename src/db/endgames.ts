import type { EndgameProgress } from '../core/backup/backup'
import { blownEndgames, type OwnEndgame } from '../core/endgames/fromGames'
import { applyGameFilter } from '../core/games/filter'
import { buildReplay } from '../core/games/replay'
import { getGameFilter, listGames } from './games'
import { db } from './schema'

/** Won endgames the user threw away, from analysed games in the shared filter, newest first. */
export async function loadOwnEndgames(username: string, now: number): Promise<OwnEndgame[]> {
  const [all, filter] = await Promise.all([listGames(username), getGameFilter()])
  const games = applyGameFilter(all, filter, now)
  const analyses = await db.analyses.bulkGet(games.map((g) => g.id))
  const drills: OwnEndgame[] = []
  games.forEach((game, i) => {
    const analysis = analyses[i]
    if (!analysis) return
    try {
      drills.push(...blownEndgames(game, buildReplay(game.pgn), analysis))
    } catch {
      // Unreadable PGN: no drills from this game.
    }
  })
  return drills
}

/** Finds one drill by id (`gameId:ply`) regardless of the current filter. */
export async function getOwnEndgame(id: string): Promise<OwnEndgame | null> {
  const [gameId] = id.split(':')
  if (!gameId) return null
  const [game, analysis] = await Promise.all([db.games.get(gameId), db.analyses.get(gameId)])
  if (!game || !analysis) return null
  try {
    return blownEndgames(game, buildReplay(game.pgn), analysis).find((d) => d.id === id) ?? null
  } catch {
    return null
  }
}

export type { EndgameProgress }

const PROGRESS_KEY = 'endgameProgress'

export async function getEndgameProgress(): Promise<Record<string, EndgameProgress>> {
  const record = await db.settings.get(PROGRESS_KEY)
  return record?.value && typeof record.value === 'object'
    ? (record.value as Record<string, EndgameProgress>)
    : {}
}

export async function recordEndgameAttempt(
  id: string,
  solved: boolean,
  moves: number,
): Promise<EndgameProgress> {
  return db.transaction('rw', db.settings, async () => {
    const all = await getEndgameProgress()
    const previous = all[id] ?? { attempts: 0, solved: false, bestMoves: null }
    const next: EndgameProgress = {
      attempts: previous.attempts + 1,
      solved: previous.solved || solved,
      bestMoves:
        solved && (previous.bestMoves === null || moves < previous.bestMoves)
          ? moves
          : previous.bestMoves,
    }
    await db.settings.put({ key: PROGRESS_KEY, value: { ...all, [id]: next } })
    return next
  })
}
