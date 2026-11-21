import { describe, expect, it } from 'vitest'
import { hangingPieces, staticExchange } from './hanging'

describe('staticExchange', () => {
  it('wins an undefended piece outright', () => {
    // White knight e4, attacked by the d5 pawn, nothing defends it.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4N3/8/PPPPPPPP/R1BQKB1R b KQkq - 0 2'
    expect(staticExchange(fen, 'e4', 'black')).toBe(3)
  })

  it('counts the recapture: a defended knight taken by a pawn still loses 2', () => {
    // Same, with d3 defending: dxe4 dxe4 → Black wins knight for pawn.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4N3/3P4/PPP1PPPP/R1BQKB1R b KQkq - 0 2'
    expect(staticExchange(fen, 'e4', 'black')).toBe(2)
  })

  it('does not take a defended piece with a more valuable one', () => {
    // Black queen d5 could take the e4 knight, but the d3 pawn recaptures.
    const fen = '4k3/8/8/3q4/4N3/3P4/8/4K3 b - - 0 1'
    expect(staticExchange(fen, 'e4', 'black')).toBe(0)
  })

  it('sees pieces lined up behind each other', () => {
    // The rook on e1 defends the e4 knight through nothing; the black rooks are doubled.
    // Rxe4 Rxe4 Rxe4: Black wins knight + rook for one rook.
    const fen = '4r1k1/4r3/8/8/4N3/8/8/4R1K1 b - - 0 1'
    expect(staticExchange(fen, 'e4', 'black')).toBe(3)
  })

  it('respects pins', () => {
    // The d7 knight attacks e5 but is pinned to the e8 king by the b5 bishop.
    const fen = '4k3/3n4/8/1B2N3/8/8/8/4K3 b - - 0 1'
    expect(staticExchange(fen, 'e5', 'black')).toBe(0)
    // Without the bishop the knight takes for free.
    expect(staticExchange('4k3/3n4/8/4N3/8/8/8/4K3 b - - 0 1', 'e5', 'black')).toBe(3)
  })

  it('returns 0 for empty squares and own pieces', () => {
    const fen = '4k3/8/8/8/4N3/8/8/4K3 b - - 0 1'
    expect(staticExchange(fen, 'e5', 'black')).toBe(0)
    expect(staticExchange(fen, 'e4', 'white')).toBe(0)
  })
})

describe('hangingPieces', () => {
  it('lists pieces that lose material, most valuable first', () => {
    // White: rook a5 and knight e4 both attacked by black pawns (b6, d5); bishop c1 safe.
    const fen = '4k3/8/1p6/R2p4/4N3/8/8/2B1K3 w - - 0 1'
    expect(hangingPieces(fen, 'white')).toEqual(['a5', 'e4'])
    expect(hangingPieces(fen, 'black')).toEqual([])
  })

  it('ignores pawns and the king', () => {
    const fen = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1'
    expect(hangingPieces(fen, 'white')).toEqual([])
  })

  it('does not report a piece whose capture is answered by an equal recapture', () => {
    // Knight e4 defended by the d3 pawn, attacked only by a knight: Nxe4 dxe4 is an even trade.
    const fen = '4k3/8/5n2/8/4N3/3P4/8/4K3 w - - 0 1'
    expect(hangingPieces(fen, 'white')).toEqual([])
  })
})
