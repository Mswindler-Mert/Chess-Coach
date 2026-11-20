import { describe, expect, it } from 'vitest'
import { fixtureGames, OWNER } from '../../../tests/helpers'
import {
  ALL_TIME_CLASSES,
  countByTimeClass,
  DEFAULT_TIME_CLASSES,
  filterGames,
  toggleTimeClass,
} from './filter'
import { normalizeGame, type Game } from './model'

const games: Game[] = fixtureGames
  .map((g) => normalizeGame(g, OWNER))
  .filter((g): g is Game => g !== null)

describe('filterGames', () => {
  it('keeps only rapid and daily by default, newest first', () => {
    const result = filterGames(games, DEFAULT_TIME_CLASSES)
    expect(result.map((g) => g.timeClass)).toEqual(['rapid', 'rapid', 'daily'])
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
