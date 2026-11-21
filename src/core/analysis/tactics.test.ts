import { describe, expect, it } from 'vitest'
import { forkTargets, isForkingMove } from './tactics'

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
