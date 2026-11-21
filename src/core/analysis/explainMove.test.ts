import { describe, expect, it } from 'vitest'
import { buildLineSteps, describeMove } from './explainMove'

describe('describeMove', () => {
  it('describes a normal pawn push from UCI or SAN', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const fromUci = describeMove(start, 'e2e4')
    const fromSan = describeMove(start, 'e4')
    expect(fromUci).toMatchObject({
      piece: 'p',
      from: 'e2',
      to: 'e4',
      captured: null,
      castling: null,
      check: false,
      checkmate: false,
      san: 'e4',
      uci: 'e2e4',
    })
    expect(fromSan).toEqual(fromUci)
  })

  it('describes captures, checks and castling', () => {
    const castleFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
    expect(describeMove(castleFen, 'e1g1')).toMatchObject({
      piece: 'k',
      castling: 'kingside',
      san: 'O-O',
    })

    const captureFen = '3qk3/8/8/3n4/4B3/8/8/4K3 w - - 0 1'
    expect(describeMove(captureFen, 'Bxd5')).toMatchObject({
      piece: 'b',
      from: 'e4',
      to: 'd5',
      captured: 'n',
      check: false,
    })
  })

  it('detects checkmate and promotion', () => {
    const promoFen = 'k7/4P3/4K3/8/8/8/8/8 w - - 0 1'
    expect(describeMove(promoFen, 'e7e8q')).toMatchObject({
      piece: 'p',
      promotion: 'q',
      check: true,
    })

    const mateFen = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'
    expect(describeMove(mateFen, 'a1a8')).toMatchObject({
      piece: 'r',
      check: true,
      checkmate: true,
    })
  })

  it('returns null for illegal moves', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(describeMove(start, 'e2e5')).toBeNull()
  })
})

describe('buildLineSteps', () => {
  it('expands legal UCI moves into sequential FEN steps', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const steps = buildLineSteps(start, ['e2e4', 'e7e5', 'g1f3'])
    expect(steps.map((s) => s.move.san)).toEqual(['e4', 'e5', 'Nf3'])
    expect(steps[0]?.fenBefore).toBe(start)
    expect(steps[1]?.fenBefore).toBe(steps[0]?.fenAfter)
  })
})
