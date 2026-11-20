import type { ClassCounts, GameAnalysis, MoveClass, Phase } from '../analysis/types'
import type { DateRange } from '../games/filter'
import type { Color, Game, TimeClass } from '../games/model'

/** Errors that count on the dashboard: the ones that become puzzles. */
const SERIOUS: readonly MoveClass[] = ['mistake', 'blunder']
export const PHASES: readonly Phase[] = ['opening', 'middlegame', 'endgame']

const DAY_MS = 24 * 60 * 60 * 1000

/** One analysed game, reduced to the user's own errors. */
export interface GameErrors {
  gameId: string
  endTime: number
  color: Color
  counts: ClassCounts
  /** The user's mistakes + blunders per phase. */
  byPhase: Record<Phase, number>
}

export function userErrors(game: Game, analysis: GameAnalysis): GameErrors {
  const byPhase: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 }
  for (const move of analysis.moves) {
    if (move.color === game.userColor && SERIOUS.includes(move.moveClass)) byPhase[move.phase]++
  }
  return {
    gameId: game.id,
    endTime: game.endTime,
    color: game.userColor,
    counts: analysis.summary[game.userColor],
    byPhase,
  }
}

export interface DashboardSummary {
  games: number
  /** Averages per game. */
  blunders: number
  mistakes: number
  inaccuracies: number
  /** Mistakes + blunders per phase, with their share of all such errors (0–1). */
  byPhase: Record<Phase, { errors: number; share: number }>
  /** Games and mistakes + blunders per game, per colour played. */
  byColor: Record<Color, { games: number; errorsPerGame: number }>
}

const avg = (total: number, n: number) => (n > 0 ? total / n : 0)

export function summarize(entries: readonly GameErrors[]): DashboardSummary {
  const n = entries.length
  const sum = (f: (e: GameErrors) => number) => entries.reduce((s, e) => s + f(e), 0)
  const phaseTotals = Object.fromEntries(
    PHASES.map((p) => [p, sum((e) => e.byPhase[p])]),
  ) as Record<Phase, number>
  const allErrors = PHASES.reduce((s, p) => s + phaseTotals[p], 0)
  const colorStats = (color: Color) => {
    const own = entries.filter((e) => e.color === color)
    const errors = own.reduce((s, e) => s + e.counts.mistake + e.counts.blunder, 0)
    return { games: own.length, errorsPerGame: avg(errors, own.length) }
  }
  return {
    games: n,
    blunders: avg(
      sum((e) => e.counts.blunder),
      n,
    ),
    mistakes: avg(
      sum((e) => e.counts.mistake),
      n,
    ),
    inaccuracies: avg(
      sum((e) => e.counts.inaccuracy),
      n,
    ),
    byPhase: Object.fromEntries(
      PHASES.map((p) => [p, { errors: phaseTotals[p], share: avg(phaseTotals[p], allErrors) }]),
    ) as DashboardSummary['byPhase'],
    byColor: { white: colorStats('white'), black: colorStats('black') },
  }
}

export type Bucket = 'week' | 'month'

/** Weekly points for short ranges, monthly for "all". */
export function bucketFor(range: DateRange): Bucket {
  return range === 'all' ? 'month' : 'week'
}

/** Start (ms, UTC) of the week (Monday) or month containing `time`. */
export function bucketStart(time: number, bucket: Bucket): number {
  const d = new Date(time)
  if (bucket === 'month') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const mondayOffset = (d.getUTCDay() + 6) % 7
  return day - mondayOffset * DAY_MS
}

export interface TrendPoint {
  start: number
  games: number
  blundersPerGame: number
}

/** Blunders per game over time, oldest first; only periods with games appear. */
export function blunderTrend(entries: readonly GameErrors[], bucket: Bucket): TrendPoint[] {
  const groups = new Map<number, { games: number; blunders: number }>()
  for (const e of entries) {
    const key = bucketStart(e.endTime, bucket)
    const g = groups.get(key) ?? { games: 0, blunders: 0 }
    g.games++
    g.blunders += e.counts.blunder
    groups.set(key, g)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, g]) => ({ start, games: g.games, blundersPerGame: g.blunders / g.games }))
}

export interface RatingPoint {
  time: number
  rating: number
}

/** The user's rating after each rated game of one tempo, oldest first. */
export function ratingHistory(games: readonly Game[], timeClass: TimeClass): RatingPoint[] {
  return games
    .filter((g) => g.rated && g.timeClass === timeClass)
    .sort((a, b) => a.endTime - b.endTime)
    .map((g) => ({ time: g.endTime, rating: g[g.userColor].rating }))
}

/** The rated tempo with the most games: the default rating chart. */
export function mainTimeClass(games: readonly Game[]): TimeClass | null {
  const counts = new Map<TimeClass, number>()
  for (const g of games) if (g.rated) counts.set(g.timeClass, (counts.get(g.timeClass) ?? 0) + 1)
  let best: TimeClass | null = null
  for (const [tc, n] of counts) if (best === null || n > (counts.get(best) ?? 0)) best = tc
  return best
}

export interface Focus {
  phase: Phase
  errors: number
  /** True when the last 7 days had errors; otherwise the whole range was used. */
  thisWeek: boolean
}

/** "This week's focus": the phase with the most mistakes + blunders in the last 7 days. */
export function weeklyFocus(entries: readonly GameErrors[], now: number): Focus | null {
  const recent = entries.filter((e) => e.endTime >= now - 7 * DAY_MS)
  const pick = (list: readonly GameErrors[]) => {
    let best: { phase: Phase; errors: number } | null = null
    for (const phase of PHASES) {
      const errors = list.reduce((s, e) => s + e.byPhase[phase], 0)
      if (errors > 0 && (!best || errors > best.errors)) best = { phase, errors }
    }
    return best
  }
  const week = pick(recent)
  if (week) return { ...week, thisWeek: true }
  const all = pick(entries)
  return all ? { ...all, thisWeek: false } : null
}
