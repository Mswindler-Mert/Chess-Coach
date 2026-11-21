import { describe, expect, it } from 'vitest'
import { fixtureGames, OWNER } from '../../../tests/helpers'
import { normalizeGame, type Game } from '../games/model'
import { openingFamily, openingStats } from './stats'

const games: Game[] = fixtureGames
  .map((g) => normalizeGame(g, OWNER))
  .filter((g): g is Game => g !== null)

describe('openingFamily', () => {
  it('keeps the name up to the family word', () => {
    expect(openingFamily('Kings Pawn Opening Leonardis Variation 2...Nf6 3.Nf3')).toBe(
      'Kings Pawn Opening',
    )
    expect(openingFamily('Pirc Defense Modern Defense Geller System 2...Nf6')).toBe('Pirc Defense')
    expect(openingFamily('Italian Game Two Knights Defense')).toBe('Italian Game')
    expect(openingFamily('Queens Gambit Declined')).toBe('Queens Gambit')
    expect(openingFamily('Three Knights Opening 3...Bc5')).toBe('Three Knights Opening')
  })

  it('merges names Chess.com uses for the same opening', () => {
    expect(openingFamily('Giuoco Piano Game 4.O O Nf6 5.d3 O O')).toBe('Italian Game')
  })

  it('takes the part before the colon in Lichess names', () => {
    expect(openingFamily('Scandinavian Defense: Mieses-Kotroc Variation')).toBe(
      'Scandinavian Defense',
    )
    expect(openingFamily('Four Knights Game: Italian Variation')).toBe('Four Knights Game')
    expect(openingFamily('Sicilian Defense: Closed, Grand Prix Attack')).toBe('Sicilian Defense')
    expect(openingFamily("Queen's Indian Accelerated")).toBe("Queen's Indian Accelerated")
  })

  it('falls back to the words before the moves', () => {
    expect(openingFamily('Ruy Lopez 3...a6')).toBe('Ruy Lopez')
    expect(openingFamily('Caro Kann Exchange Panov Attack')).toBe('Caro Kann Exchange Panov Attack')
    expect(openingFamily('Center Counter Something Else')).toBe('Center Counter Something')
  })
})

describe('openingStats', () => {
  it('groups by family and colour with results', () => {
    const stats = openingStats(games)
    const withOpening = games.filter((g) => g.opening)
    expect(stats.reduce((s, x) => s + x.games, 0)).toBe(withOpening.length)
    for (const s of stats) {
      expect(s.wins + s.draws + s.losses).toBe(s.games)
      expect(s.score).toBeCloseTo((s.wins + s.draws / 2) / s.games)
    }
    expect(stats.map((s) => s.games)).toEqual([...stats.map((s) => s.games)].sort((a, b) => b - a))
  })

  it('separates colours and points at the newest game', () => {
    const base = games[0] as Game
    const make = (
      id: string,
      color: 'white' | 'black',
      endTime: number,
      outcome: Game['outcome'],
    ) =>
      ({
        ...base,
        id,
        userColor: color,
        endTime,
        outcome,
        opening: { name: 'Italian Game Two Knights', url: '' },
      }) satisfies Game
    const stats = openingStats([
      make('a', 'white', 1, 'win'),
      make('b', 'white', 3, 'draw'),
      make('c', 'white', 2, 'loss'),
      make('d', 'black', 4, 'win'),
    ])
    expect(stats[0]).toEqual({
      family: 'Italian Game',
      color: 'white',
      games: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      score: 0.5,
      latestGameId: 'b',
    })
    expect(stats[1]).toMatchObject({ color: 'black', games: 1, score: 1 })
  })
})
