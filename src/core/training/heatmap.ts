import { DAILY_GOAL, dayKey, type ActivityLog } from './daily'

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export interface HeatmapCell {
  date: string
  count: number
  level: HeatLevel
  isToday: boolean
  isFuture: boolean
}

export interface HeatmapSummary {
  /** Columns (weeks), each with 7 cells (Mon..Sun). */
  weeks: HeatmapCell[][]
  /** Total active days (count > 0) in the log. */
  activeDays: number
  /** Days that reached `DAILY_GOAL` in the log. */
  goalDays: number
  /** Total exercises completed in the last 7 calendar days (including today). */
  last7Days: number
}

/** Maps a day's exercise count to an intensity level (0–4) relative to `DAILY_GOAL`. */
export function heatLevel(count: number, goal = DAILY_GOAL): HeatLevel {
  if (count <= 0) return 0
  if (count >= goal) return 4
  if (count >= Math.ceil(goal * 0.6)) return 3
  if (count >= Math.ceil(goal * 0.3)) return 2
  return 1
}

/**
 * Builds a Monday-aligned activity heatmap ending on the week containing `today`,
 * plus summary counters (active days, goal days, last 7 days total).
 */
export function buildHeatmap(
  log: ActivityLog,
  today: Date,
  weekCount = 16,
  goal = DAILY_GOAL,
): HeatmapSummary {
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
  const todayStr = dayKey(todayMid)
  // Day of week with Monday = 0 .. Sunday = 6.
  const dow = (todayMid.getDay() + 6) % 7
  const endSunday = new Date(
    todayMid.getFullYear(),
    todayMid.getMonth(),
    todayMid.getDate() + (6 - dow),
    12,
  )
  const totalDays = weekCount * 7
  const startMonday = new Date(
    endSunday.getFullYear(),
    endSunday.getMonth(),
    endSunday.getDate() - (totalDays - 1),
    12,
  )

  const weeks: HeatmapCell[][] = []
  for (let w = 0; w < weekCount; w++) {
    const col: HeatmapCell[] = []
    for (let d = 0; d < 7; d++) {
      const dateObj = new Date(
        startMonday.getFullYear(),
        startMonday.getMonth(),
        startMonday.getDate() + w * 7 + d,
        12,
      )
      const date = dayKey(dateObj)
      const isFuture = date > todayStr
      const count = isFuture ? 0 : (log[date] ?? 0)
      col.push({
        date,
        count,
        level: heatLevel(count, goal),
        isToday: date === todayStr,
        isFuture,
      })
    }
    weeks.push(col)
  }

  let activeDays = 0
  let goalDays = 0
  for (const n of Object.values(log)) {
    if (n > 0) activeDays++
    if (n >= goal) goalDays++
  }

  let last7Days = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(todayMid.getFullYear(), todayMid.getMonth(), todayMid.getDate() - i, 12)
    last7Days += log[dayKey(d)] ?? 0
  }

  return { weeks, activeDays, goalDays, last7Days }
}
