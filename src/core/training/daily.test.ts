import { describe, expect, it } from 'vitest'
import { addActivity, buildDailyPlan, dayKey, LOG_DAYS, streakOf, type ActivityLog } from './daily'

// Local dates at noon, so the tests do not depend on the machine's time zone.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)
const TODAY = day(2026, 11, 22)

describe('dayKey', () => {
  it('formats the local calendar day', () => {
    expect(dayKey(TODAY)).toBe('2026-11-22')
    expect(dayKey(day(2026, 1, 5))).toBe('2026-01-05')
    expect(dayKey(new Date(2026, 10, 22, 0, 0, 1))).toBe('2026-11-22')
    expect(dayKey(new Date(2026, 10, 22, 23, 59, 59))).toBe('2026-11-22')
  })
})

describe('addActivity', () => {
  it('counts exercises per day', () => {
    let log: ActivityLog = {}
    log = addActivity(log, TODAY)
    log = addActivity(log, TODAY, 2)
    expect(log).toEqual({ '2026-11-22': 3 })
  })

  it('drops days older than the log window', () => {
    const old = dayKey(new Date(2026, 10, 22 - LOG_DAYS - 1, 12))
    const log = addActivity({ [old]: 5, '2026-11-01': 2 }, TODAY)
    expect(log).toEqual({ '2026-11-01': 2, '2026-11-22': 1 })
  })
})

describe('streakOf', () => {
  it('counts consecutive days up to today', () => {
    const log = { '2026-11-20': 1, '2026-11-21': 4, '2026-11-22': 2 }
    expect(streakOf(log, TODAY)).toEqual({ current: 3, best: 3, today: 2 })
  })

  it('keeps yesterday’s streak alive while today is still open', () => {
    const log = { '2026-11-20': 1, '2026-11-21': 4 }
    expect(streakOf(log, TODAY)).toEqual({ current: 2, best: 2, today: 0 })
  })

  it('breaks after a missed day and remembers the best run', () => {
    const log = {
      '2026-10-30': 1,
      '2026-10-31': 1,
      '2026-11-01': 1,
      '2026-11-02': 1,
      '2026-11-21': 0,
      '2026-11-22': 1,
    }
    expect(streakOf(log, TODAY)).toEqual({ current: 1, best: 4, today: 1 })
  })

  it('crosses month ends', () => {
    const log = { '2026-11-30': 1, '2026-12-01': 1 }
    expect(streakOf(log, day(2026, 12, 1)).current).toBe(2)
  })

  it('is zero without activity', () => {
    expect(streakOf({}, TODAY)).toEqual({ current: 0, best: 0, today: 0 })
  })
})

describe('buildDailyPlan', () => {
  it('lists puzzles, drills, a lesson and the last game', () => {
    const plan = buildDailyPlan({
      puzzles: { due: 2, fresh: 10 },
      drills: { due: 0, fresh: 1 },
      nextLesson: 'rook-mate',
      lastGame: { gameId: 'g1', ply: 21 },
    })
    expect(plan).toEqual([
      { kind: 'puzzles', count: 5, due: 2 },
      { kind: 'hanging', count: 1, due: 0 },
      { kind: 'endgame', lessonId: 'rook-mate' },
      { kind: 'review', gameId: 'g1', ply: 21 },
    ])
  })

  it('leaves out kinds with nothing to do', () => {
    const plan = buildDailyPlan({
      puzzles: { due: 0, fresh: 0 },
      drills: { due: 0, fresh: 0 },
      nextLesson: null,
      lastGame: null,
    })
    expect(plan).toEqual([])
  })
})
