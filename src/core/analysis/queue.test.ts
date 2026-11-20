import { describe, expect, it } from 'vitest'
import { fixtureGames, OWNER } from '../../../tests/helpers'
import type { GameFilter } from '../games/filter'
import { normalizeGame, type Game } from '../games/model'
import { planAnalysisQueue } from './queue'

const games: Game[] = fixtureGames
  .map((g) => normalizeGame(g, OWNER))
  .filter((g): g is Game => g !== null)

const NOW = Date.UTC(2026, 10, 21)
const ALL: GameFilter = { timeClasses: ['blitz', 'rapid'], dateRange: 'all' }

describe('planAnalysisQueue', () => {
  it('queues only the selected tempos, newest first', () => {
    const queue = planAnalysisQueue(games, new Set(), ALL, NOW)
    expect(queue).toHaveLength(5)
    expect(queue.every((g) => g.timeClass === 'blitz' || g.timeClass === 'rapid')).toBe(true)
    expect(queue.map((g) => g.endTime)).toEqual(
      [...queue.map((g) => g.endTime)].sort((a, b) => b - a),
    )
  })

  it('queues only games inside the date range', () => {
    // Only the two rapid games from October 2026 are within 90 days of NOW.
    const queue = planAnalysisQueue(games, new Set(), { ...ALL, dateRange: '90d' }, NOW)
    expect(queue).toHaveLength(2)
    expect(queue.every((g) => g.endTime >= NOW - 90 * 86_400_000)).toBe(true)
    expect(planAnalysisQueue(games, new Set(), { ...ALL, dateRange: '30d' }, NOW)).toEqual([])
  })

  it('skips games that are already analysed', () => {
    const rapid: GameFilter = { timeClasses: ['rapid'], dateRange: 'all' }
    const [first] = planAnalysisQueue(games, new Set(), rapid, NOW)
    const queue = planAnalysisQueue(games, new Set([first?.id ?? '']), rapid, NOW)
    expect(queue).toHaveLength(1)
    expect(queue[0]?.id).not.toBe(first?.id)
  })

  it('moves the requested game to the front', () => {
    const all = planAnalysisQueue(games, new Set(), ALL, NOW)
    const last = all.at(-1)
    const queue = planAnalysisQueue(games, new Set(), ALL, NOW, last?.id)
    expect(queue[0]?.id).toBe(last?.id)
    expect(queue).toHaveLength(all.length)
  })

  it('ignores a requested game outside the filter', () => {
    const bullet = games.find((g) => g.timeClass === 'bullet')
    const queue = planAnalysisQueue(games, new Set(), ALL, NOW, bullet?.id)
    expect(queue.some((g) => g.id === bullet?.id)).toBe(false)
    const old = planAnalysisQueue(games, new Set(), ALL, NOW).at(-1)
    const recent = planAnalysisQueue(games, new Set(), { ...ALL, dateRange: '90d' }, NOW, old?.id)
    expect(recent.some((g) => g.id === old?.id)).toBe(false)
  })
})
