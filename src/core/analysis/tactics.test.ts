import { describe, expect, it } from 'vitest'
import { forkTargets, isForkingMove, lineTactics, moveTactics } from './tactics'

// White knight b5 can jump to c7, checking e8 and hitting the a8 rook.
const KNIGHT_FORK = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1'

describe('forkTargets', () => {
  it('lists the king and a more valuable piece', () => {
    expect(forkTargets('r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', 'c7').sort()).toEqual(['a8', 'e8'])
  })

  it('ignores defended pieces worth no more than the attacker', () => {
    // The queen hits two knights, both defended by pawns.
    const fen = '4k3/8/1p3p2/2n1n3/3Q4/8/8/4K3 b - - 0 1'
    expect(forkTargets(fen, 'd4')).toEqual([])
    // Without the pawns both knights are fair game.
    expect(forkTargets('4k3/8/8/2n1n3/3Q4/8/8/4K3 b - - 0 1', 'd4').sort()).toEqual(['c5', 'e5'])
  })

  it('counts undefended minor pieces', () => {
    // (King on h8, off the queen's lines.)
    const fen = '7k/8/8/2n3n1/8/4Q3/8/4K3 b - - 0 1'
    expect(forkTargets(fen, 'e3').sort()).toEqual(['c5', 'g5'])
  })

  it('ignores pawns and empty squares', () => {
    expect(forkTargets('4k3/8/3p1p2/4N3/8/8/8/4K3 b - - 0 1', 'e5')).toEqual([])
    expect(forkTargets(KNIGHT_FORK, 'h4')).toEqual([])
  })
})

describe('isForkingMove', () => {
  it('recognises a fork', () => {
    expect(isForkingMove(KNIGHT_FORK, 'b5c7')).toBe(true)
  })

  it('rejects quiet and illegal moves', () => {
    expect(isForkingMove(KNIGHT_FORK, 'b5d4')).toBe(false)
    expect(isForkingMove(KNIGHT_FORK, 'b5b6')).toBe(false)
  })
})

// Black's rook on c6 is pinned to the king on e8 once White's bishop reaches a4.
const PIN_READY = '4k3/8/2r5/8/8/8/8/3BK3 w - - 0 1'
// White's rook checks along the 8th rank, and the queen on a8 is behind the king.
const SKEWER_READY = 'q3k3/8/8/8/8/8/8/4K2R w - - 0 1'

describe('lineTactics', () => {
  it('finds a pin against the king', () => {
    expect(lineTactics('4k3/8/2n5/8/B7/8/8/4K3 b - - 0 1', 'a4')).toEqual([
      { kind: 'pin', front: 'c6', back: 'e8' },
    ])
  })

  it('finds a skewer of king and queen', () => {
    expect(lineTactics('q3k2R/8/8/8/8/8/8/4K3 b - - 0 1', 'h8')).toEqual([
      { kind: 'skewer', front: 'e8', back: 'a8' },
    ])
  })

  it('needs two enemy pieces in a row on an open line', () => {
    // Own piece in between, pawn in front, or only one piece on the line: nothing.
    expect(lineTactics('4k3/3P4/2n5/8/B7/8/8/4K3 b - - 0 1', 'a4')).toEqual([])
    expect(lineTactics('4k3/3p4/8/8/B7/8/8/4K3 b - - 0 1', 'a4')).toEqual([])
    expect(lineTactics('4k3/8/8/8/B7/8/8/4K3 b - - 0 1', 'a4')).toEqual([])
  })

  it('only looks along lines the piece can use', () => {
    // A rook does not pin along a diagonal; a knight has no lines.
    expect(lineTactics('4k3/8/2n5/8/R7/8/8/4K3 b - - 0 1', 'a4')).toEqual([])
    expect(lineTactics('4k3/8/2n5/8/N7/8/8/4K3 b - - 0 1', 'a4')).toEqual([])
  })
})

describe('moveTactics', () => {
  it('describes what a move creates', () => {
    expect(moveTactics(PIN_READY, 'd1a4')).toEqual({ fork: false, pin: true, skewer: false })
    expect(moveTactics(SKEWER_READY, 'h1h8')).toEqual({ fork: false, pin: false, skewer: true })
    expect(moveTactics(KNIGHT_FORK, 'b5c7')).toEqual({ fork: true, pin: false, skewer: false })
  })

  it('returns nothing for illegal moves', () => {
    expect(moveTactics(PIN_READY, 'd1d8')).toEqual({ fork: false, pin: false, skewer: false })
  })
})
