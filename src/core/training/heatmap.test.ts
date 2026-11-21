import { describe, expect, it } from 'vitest'
import { buildHeatmap, heatLevel } from './heatmap'

describe('heatLevel', () => {
  it('maps counts relative to the daily goal', () => {
    expect(heatLevel(0, 10)).toBe(0)
    expect(heatLevel(1, 10)).toBe(1)
    expect(heatLevel(3, 10)).toBe(2)
    expect(heatLevel(6, 10)).toBe(3)
    expect(heatLevel(10, 10)).toBe(4)
    expect(heatLevel(18, 10)).toBe(4)
  })
})

describe('buildHeatmap', () => {
  it('builds Monday-aligned weeks and computes active/goal/last-7-day totals', () => {
    // 2026-11-22 is a Sunday.
    const today = new Date(2026, 10, 22, 12)
    const log = {
      '2026-11-22': 10,
      '2026-11-21': 4,
      '2026-11-10': 12,
    }
    const result = buildHeatmap(log, today, 4, 10)
    expect(result.weeks).toHaveLength(4)
    for (const col of result.weeks) expect(col).toHaveLength(7)

    const lastCell = result.weeks[3]?.[6]
    expect(lastCell).toEqual({
      date: '2026-11-22',
      count: 10,
      level: 4,
      isToday: true,
      isFuture: false,
    })
    expect(result.activeDays).toBe(3)
    expect(result.goalDays).toBe(2)
    expect(result.last7Days).toBe(14)
  })

  it('marks days after today in the current week as future with 0 count', () => {
    // 2026-11-18 is a Wednesday.
    const today = new Date(2026, 10, 18, 12)
    const result = buildHeatmap({ '2026-11-18': 5 }, today, 2, 10)
    const lastWeek = result.weeks[1]!
    expect(lastWeek[2]?.isToday).toBe(true)
    expect(lastWeek[3]?.isFuture).toBe(true)
    expect(lastWeek[6]?.isFuture).toBe(true)
  })
})
