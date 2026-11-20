import { describe, expect, it } from 'vitest'
import { fixtureGames, OWNER } from '../../../tests/helpers'
import { normalizeGame, type Game } from '../games/model'
import { planAnalysisQueue } from './queue'

const games: Game[] = fixtureGames
  .map((g) => normalizeGame(g, OWNER))
  .filter((g): g is Game => g !== null)

describe('planAnalysisQueue', () => {
  it('queues only the selected tempos, newest first', () => {
    const queue = planAnalysisQueue(games, new Set(), ['blitz', 'rapid'])
    expect(queue).toHaveLength(5)
    expect(queue.every((g) => g.timeClass === 'blitz' || g.timeClass === 'rapid')).toBe(true)
    expect(queue.map((g) => g.endTime)).toEqual(
      [...queue.map((g) => g.endTime)].sort((a, b) => b - a),
    )
  })

  it('skips games that are already analysed', () => {
    const [first] = planAnalysisQueue(games, new Set(), ['rapid'])
    const queue = planAnalysisQueue(games, new Set([first?.id ?? '']), ['rapid'])
    expect(queue).toHaveLength(1)
    expect(queue[0]?.id).not.toBe(first?.id)
  })

  it('moves the requested game to the front', () => {
    const all = planAnalysisQueue(games, new Set(), ['blitz', 'rapid'])
    const last = all.at(-1)
    const queue = planAnalysisQueue(games, new Set(), ['blitz', 'rapid'], last?.id)
    expect(queue[0]?.id).toBe(last?.id)
    expect(queue).toHaveLength(all.length)
  })

  it('ignores a requested game outside the selected tempos', () => {
    const bullet = games.find((g) => g.timeClass === 'bullet')
    const queue = planAnalysisQueue(games, new Set(), ['rapid'], bullet?.id)
    expect(queue.some((g) => g.id === bullet?.id)).toBe(false)
  })
})
