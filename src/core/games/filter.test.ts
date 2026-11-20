import { describe, expect, it } from 'vitest'
import { fixtureGames, OWNER } from '../../../tests/helpers'
import {
  ALL_TIME_CLASSES,
  applyGameFilter,
  countByTimeClass,
  dateRangeStart,
  DEFAULT_DATE_RANGE,
  DEFAULT_TIME_CLASSES,
  filterByDateRange,
  filterGames,
  isDateRange,
  toggleTimeClass,
  type DateRange,
} from './filter'
import { normalizeGame, type Game } from './model'

const games: Game[] = fixtureGames
  .map((g) => normalizeGame(g, OWNER))
  .filter((g): g is Game => g !== null)

describe('filterGames', () => {
  it('keeps only blitz and rapid by default, newest first', () => {
    const result = filterGames(games, DEFAULT_TIME_CLASSES)
    expect(result).toHaveLength(5)
    expect(new Set(result.map((g) => g.timeClass))).toEqual(new Set(['blitz', 'rapid']))
    expect(result.map((g) => g.endTime)).toEqual(
      [...result.map((g) => g.endTime)].sort((a, b) => b - a),
    )
  })

  it('shows everything when all tempos are selected', () => {
    expect(filterGames(games, ALL_TIME_CLASSES)).toHaveLength(games.length)
  })

  it('shows nothing when no tempo is selected', () => {
    expect(filterGames(games, [])).toEqual([])
  })
})

describe('countByTimeClass', () => {
  it('counts games per tempo', () => {
    expect(countByTimeClass(games)).toEqual({ bullet: 1, blitz: 3, rapid: 2, daily: 1 })
  })
})

describe('toggleTimeClass', () => {
  it('adds and removes a tempo in canonical order', () => {
    expect(toggleTimeClass(['rapid', 'daily'], 'bullet')).toEqual(['bullet', 'rapid', 'daily'])
    expect(toggleTimeClass(['rapid', 'daily'], 'rapid')).toEqual(['daily'])
  })
})

describe('date ranges', () => {
  const NOW = Date.UTC(2026, 10, 21)
  const DAY = 86_400_000
  const at = (daysAgo: number) => ({
    ...games[0]!,
    id: `g${daysAgo}`,
    endTime: NOW - daysAgo * DAY,
  })
  const sample = [at(1), at(29), at(31), at(89), at(91), at(400)]

  it('defaults to the last 30 days', () => {
    expect(DEFAULT_DATE_RANGE).toBe('30d')
  })

  it('computes the start of each range', () => {
    expect(dateRangeStart('30d', NOW)).toBe(NOW - 30 * DAY)
    expect(dateRangeStart('90d', NOW)).toBe(NOW - 90 * DAY)
    expect(dateRangeStart('all', NOW)).toBeNull()
  })

  it('keeps games that ended within the range', () => {
    const ids = (range: DateRange) => filterByDateRange(sample, range, NOW).map((g) => g.id)
    expect(ids('30d')).toEqual(['g1', 'g29'])
    expect(ids('90d')).toEqual(['g1', 'g29', 'g31', 'g89'])
    expect(ids('all')).toHaveLength(6)
  })

  it('includes a game exactly at the start of the range', () => {
    expect(filterByDateRange([at(30)], '30d', NOW)).toHaveLength(1)
  })

  it('recognises stored values', () => {
    expect(isDateRange('90d')).toBe(true)
    expect(isDateRange('7d')).toBe(false)
    expect(isDateRange(null)).toBe(false)
  })
})

describe('applyGameFilter', () => {
  const NOW = Date.UTC(2026, 10, 21)

  it('combines tempos and date range, newest first', () => {
    const result = applyGameFilter(
      games,
      { timeClasses: ['rapid', 'daily'], dateRange: '90d' },
      NOW,
    )
    expect(result.map((g) => g.timeClass)).toEqual(['rapid', 'rapid'])
    expect(
      applyGameFilter(games, { timeClasses: DEFAULT_TIME_CLASSES, dateRange: 'all' }, NOW),
    ).toHaveLength(5)
  })
})
