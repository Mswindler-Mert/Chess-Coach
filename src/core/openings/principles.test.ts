import { describe, expect, it } from 'vitest'
import { fixtureGames } from '../../../tests/helpers'
import { buildReplay } from '../games/replay'
import { checkPrinciples, summarizePrinciples, type PrincipleWarning } from './principles'

const principles = (pgn: string, color: 'white' | 'black') =>
  checkPrinciples(buildReplay(pgn), color).map((w) => w.principle)

describe('checkPrinciples', () => {
  it('passes a sound opening', () => {
    const pgn =
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 d6 6. Nc3 O-O 7. Be3 Be6 8. Bxc5 dxc5 9. Bxe6 fxe6 10. Qe2 Qd6'
    expect(principles(pgn, 'white')).toEqual([])
    expect(principles(pgn, 'black')).toEqual([])
  })

  it('flags an early queen sortie', () => {
    const warnings = checkPrinciples(
      buildReplay('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#'),
      'white',
    )
    expect(warnings).toEqual([{ principle: 'early-queen', ply: 3, count: 1 }])
  })

  it('flags edge pawns, repeated piece moves, no castling and undeveloped pieces', () => {
    const pgn =
      '1. a4 e5 2. h4 d5 3. Nc3 Nf6 4. Nb5 c6 5. Na3 Bd6 6. Nb1 O-O 7. Ra3 Re8 8. Rb3 h6 9. Ra3 a6 10. Rb3 b6'
    const warnings = checkPrinciples(buildReplay(pgn), 'white')
    expect(warnings).toEqual([
      { principle: 'edge-pawns', ply: 1, count: 2 },
      { principle: 'same-piece-twice', ply: 7, count: 6 },
      { principle: 'no-castling', ply: 19, count: 1 },
      { principle: 'undeveloped-pieces', ply: 19, count: 3 },
    ])
  })

  it('flags castling after move 10', () => {
    const pgn =
      '1. d4 d5 2. Nf3 Nf6 3. e3 e6 4. Bd3 Bd6 5. Nc3 Nc6 6. Bd2 Bd7 7. a3 a6 8. h3 h6 9. Qe2 Qe7 10. Rb1 Rb8 11. O-O O-O'
    expect(principles(pgn, 'white')).toEqual(['edge-pawns', 'late-castling'])
  })

  it('does not judge castling or development in short games', () => {
    expect(principles('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', 'white')).toEqual([])
  })

  it('skips games from a custom position', () => {
    const replay = { ...buildReplay('1. e4 e5'), startFen: '8/8/8/8/8/8/8/K6k w - - 0 1' }
    expect(checkPrinciples(replay, 'white')).toEqual([])
  })

  it('runs on every fixture game', () => {
    for (const game of fixtureGames.filter((g) => g.rules === 'chess')) {
      for (const color of ['white', 'black'] as const) {
        const warnings = checkPrinciples(buildReplay(game.pgn), color)
        expect(warnings.every((w) => w.ply > 0 && w.count > 0)).toBe(true)
      }
    }
  })
})

describe('summarizePrinciples', () => {
  it('gives the share of games with each warning', () => {
    const w = (principle: PrincipleWarning['principle']): PrincipleWarning => ({
      principle,
      ply: 1,
      count: 1,
    })
    const summary = summarizePrinciples([
      [w('early-queen'), w('edge-pawns')],
      [w('edge-pawns')],
      [],
    ])
    expect(summary.games).toBe(3)
    expect(summary.rates.find((r) => r.principle === 'edge-pawns')).toEqual({
      principle: 'edge-pawns',
      games: 2,
      share: 2 / 3,
    })
    expect(summary.rates.find((r) => r.principle === 'no-castling')?.share).toBe(0)
  })
})
