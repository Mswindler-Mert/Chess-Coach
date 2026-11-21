/** Exercises a day for the daily goal (puzzles, hanging-piece drills and endgame attempts). */
export const DAILY_GOAL = 10
/** How many items of each kind the daily plan suggests. */
export const PLAN_PUZZLES = 5
export const PLAN_DRILLS = 3
/** Activity older than this is dropped from the log. */
export const LOG_DAYS = 400

/** Exercises done per local calendar day, keyed "YYYY-MM-DD". */
export type ActivityLog = Record<string, number>

/** The local calendar day of `date` as "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function previousDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12)
}

/** The log with one more exercise today; days older than `LOG_DAYS` are dropped. */
export function addActivity(log: ActivityLog, today: Date, count = 1): ActivityLog {
  const cutoff = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - LOG_DAYS))
  const next: ActivityLog = {}
  for (const [day, n] of Object.entries(log)) if (day >= cutoff) next[day] = n
  const key = dayKey(today)
  next[key] = (next[key] ?? 0) + count
  return next
}

export interface Streak {
  /** Consecutive active days up to today, or up to yesterday while today is still open. */
  current: number
  /** The longest run in the log. */
  best: number
  /** Exercises done today. */
  today: number
}

export function streakOf(log: ActivityLog, today: Date): Streak {
  const active = (d: Date) => (log[dayKey(d)] ?? 0) > 0
  let cursor = active(today) ? today : previousDay(today)
  let current = 0
  while (active(cursor)) {
    current++
    cursor = previousDay(cursor)
  }
  // Best run: walk the sorted active days and count consecutive ones.
  const days = Object.keys(log)
    .filter((d) => (log[d] ?? 0) > 0)
    .sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of days) {
    const [y, m, d] = day.split('-').map(Number) as [number, number, number]
    const expected = prev ? dayKey(new Date(y, m - 1, d - 1, 12)) === prev : false
    run = expected ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return { current, best: Math.max(best, current), today: log[dayKey(today)] ?? 0 }
}

export type PlanItem =
  | { kind: 'puzzles'; count: number; due: number }
  | { kind: 'hanging'; count: number; due: number }
  | { kind: 'endgame'; lessonId: string }
  | { kind: 'review'; gameId: string; ply: number | null }

export interface PlanInput {
  puzzles: { due: number; fresh: number }
  drills: { due: number; fresh: number }
  /** First curriculum lesson not solved yet, if any. */
  nextLesson: string | null
  /** The newest analysed game and its first key moment (ply), if any. */
  lastGame: { gameId: string; ply: number | null } | null
}

/**
 * Today's plan, in order: due reviews first (puzzles, then hanging-piece drills), one endgame
 * lesson, and a look at the latest game. Kinds with nothing to do are left out.
 */
export function buildDailyPlan(input: PlanInput): PlanItem[] {
  const items: PlanItem[] = []
  const take = (q: { due: number; fresh: number }, max: number) => Math.min(max, q.due + q.fresh)
  const puzzles = take(input.puzzles, PLAN_PUZZLES)
  if (puzzles > 0) items.push({ kind: 'puzzles', count: puzzles, due: input.puzzles.due })
  const drills = take(input.drills, PLAN_DRILLS)
  if (drills > 0) items.push({ kind: 'hanging', count: drills, due: input.drills.due })
  if (input.nextLesson) items.push({ kind: 'endgame', lessonId: input.nextLesson })
  if (input.lastGame) items.push({ kind: 'review', ...input.lastGame })
  return items
}
