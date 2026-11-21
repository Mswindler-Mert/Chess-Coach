import { gameAccuracy } from '../analysis/accuracy'
import { MOTIFS, type Motif } from '../analysis/motifs'
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
  /** The user's mistakes + blunders per motif (a move can have several). */
  byMotif: Partial<Record<Motif, number>>
  /** The user's game accuracy (0–100), null for a game without the user's moves. */
  accuracy: number | null
}

/** `motifs` comes from `tagGame` (index = ply − 1); without it no motifs are counted. */
export function userErrors(
  game: Game,
  analysis: GameAnalysis,
  motifs: readonly Motif[][] = [],
): GameErrors {
  const byPhase: Record<Phase, number> = { opening: 0, middlegame: 0, endgame: 0 }
  const byMotif: Partial<Record<Motif, number>> = {}
  analysis.moves.forEach((move, index) => {
    if (move.color !== game.userColor || !SERIOUS.includes(move.moveClass)) return
    byPhase[move.phase]++
    for (const motif of motifs[index] ?? []) byMotif[motif] = (byMotif[motif] ?? 0) + 1
  })
  return {
    gameId: game.id,
    endTime: game.endTime,
    color: game.userColor,
    counts: analysis.summary[game.userColor],
    byPhase,
    byMotif,
    accuracy: gameAccuracy(analysis)[game.userColor],
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
  /** Mistakes + blunders with each motif, most frequent first; motifs never seen are left out. */
  byMotif: { motif: Motif; errors: number }[]
  /** Mean game accuracy over games that have one; null when none do. */
  accuracy: number | null
}

const avg = (total: number, n: number) => (n > 0 ? total / n : 0)

function meanAccuracy(entries: readonly GameErrors[]): number | null {
  const values = entries.map((e) => e.accuracy).filter((a): a is number => a !== null)
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null
}

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
    byMotif: MOTIFS.map((motif) => ({ motif, errors: sum((e) => e.byMotif[motif] ?? 0) }))
      .filter((m) => m.errors > 0)
      .sort((a, b) => b.errors - a.errors),
    accuracy: meanAccuracy(entries),
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
  /** Mean accuracy of the period's games; null when none has one. */
  accuracy: number | null
}

/** Blunders per game over time, oldest first; only periods with games appear. */
export function blunderTrend(entries: readonly GameErrors[], bucket: Bucket): TrendPoint[] {
  const groups = new Map<number, GameErrors[]>()
  for (const e of entries) {
    const key = bucketStart(e.endTime, bucket)
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, list]) => ({
      start,
      games: list.length,
      blundersPerGame: list.reduce((s, e) => s + e.counts.blunder, 0) / list.length,
      accuracy: meanAccuracy(list),
    }))
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

export type Focus =
  | { kind: 'motif'; motif: Motif; errors: number; thisWeek: boolean }
  | { kind: 'phase'; phase: Phase; errors: number; thisWeek: boolean }

function topMotif(list: readonly GameErrors[]) {
  let best: { motif: Motif; errors: number } | null = null
  for (const motif of MOTIFS) {
    const errors = list.reduce((s, e) => s + (e.byMotif[motif] ?? 0), 0)
    if (errors > 0 && (!best || errors > best.errors)) best = { motif, errors }
  }
  return best
}

function topPhase(list: readonly GameErrors[]) {
  let best: { phase: Phase; errors: number } | null = null
  for (const phase of PHASES) {
    const errors = list.reduce((s, e) => s + e.byPhase[phase], 0)
    if (errors > 0 && (!best || errors > best.errors)) best = { phase, errors }
  }
  return best
}

/**
 * "This week's focus": the most frequent motif among the user's mistakes + blunders in the last
 * 7 days (ties go to the higher-priority motif). Without motifs, the phase with the most errors.
 * A clean week falls back to the whole range.
 */
export function weeklyFocus(entries: readonly GameErrors[], now: number): Focus | null {
  const recent = entries.filter((e) => e.endTime >= now - 7 * DAY_MS)
  for (const [list, thisWeek] of [
    [recent, true],
    [entries, false],
  ] as const) {
    const motif = topMotif(list)
    if (motif) return { kind: 'motif', ...motif, thisWeek }
    const phase = topPhase(list)
    if (phase) return { kind: 'phase', ...phase, thisWeek }
  }
  return null
}
