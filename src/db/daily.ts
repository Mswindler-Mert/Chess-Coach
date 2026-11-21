import { tagGame } from '../core/analysis/motifs'
import { keyMoments } from '../core/analysis/review'
import { CURRICULUM } from '../core/endgames/curriculum'
import { applyGameFilter, type GameFilter } from '../core/games/filter'
import { buildReplay } from '../core/games/replay'
import {
  addActivity,
  buildDailyPlan,
  streakOf,
  type ActivityLog,
  type PlanItem,
  type Streak,
} from '../core/training/daily'
import { generateHangingDrills, type HangingDrill } from '../core/training/hangingDrills'
import { planPuzzles } from '../core/training/leitner'
import { generatePuzzles, type Puzzle } from '../core/training/puzzles'
import { getEndgameProgress } from './endgames'
import { getGameFilter, listGames } from './games'
import { listPuzzleProgress } from './puzzles'
import { db } from './schema'

const LOG_KEY = 'activityLog'

export async function getActivityLog(): Promise<ActivityLog> {
  const record = await db.settings.get(LOG_KEY)
  return record?.value && typeof record.value === 'object' ? (record.value as ActivityLog) : {}
}

/** Counts one finished exercise (puzzle, hanging-piece drill, endgame attempt) for today. */
export async function recordActivity(): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const log = await getActivityLog()
    await db.settings.put({ key: LOG_KEY, value: addActivity(log, new Date()) })
  })
}

export interface DailyData {
  plan: PlanItem[]
  streak: Streak
}

/**
 * Today's plan from the analysed games in the shared filter. Each game is replayed once and
 * feeds both the puzzles and the hanging-piece drills.
 */
export async function loadDailyPlan(
  username: string,
  now: number,
  /** The filter on screen, when the caller has it; otherwise the saved one. */
  shownFilter?: GameFilter,
): Promise<DailyData> {
  const [all, filter, progress, endgames, log] = await Promise.all([
    listGames(username),
    shownFilter ?? getGameFilter(),
    listPuzzleProgress(username),
    getEndgameProgress(),
    getActivityLog(),
  ])
  const games = applyGameFilter(all, filter, now)
  const analyses = await db.analyses.bulkGet(games.map((g) => g.id))
  const puzzles: Puzzle[] = []
  const drills: HangingDrill[] = []
  let lastGame: { gameId: string; ply: number | null } | null = null
  games.forEach((game, i) => {
    const analysis = analyses[i]
    if (!analysis) return
    try {
      const replay = buildReplay(game.pgn)
      puzzles.push(...generatePuzzles(game, replay, analysis))
      drills.push(...generateHangingDrills(game, replay, analysis, tagGame(game, replay, analysis)))
      // `games` is newest first, so the first analysed one is the latest game.
      lastGame ??= {
        gameId: game.id,
        ply: keyMoments(analysis.moves, game.userColor)[0]?.ply ?? null,
      }
    } catch {
      // Unreadable PGN: skip the game.
    }
  })
  const p = planPuzzles(puzzles, progress, now)
  const d = planPuzzles(drills, progress, now)
  const nextLesson = CURRICULUM.find((l) => !endgames[l.id]?.solved)?.id ?? null
  return {
    plan: buildDailyPlan({
      puzzles: { due: p.due, fresh: p.fresh },
      drills: { due: d.due, fresh: d.fresh },
      nextLesson,
      lastGame,
    }),
    streak: streakOf(log, new Date(now)),
  }
}
