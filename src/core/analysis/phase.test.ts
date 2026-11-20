import { describe, expect, it } from 'vitest'
import { fixtureGame } from '../../../tests/helpers'
import { buildReplay, fenAt } from '../games/replay'
import { detectPhase, nonPawnMaterial } from './phase'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('nonPawnMaterial', () => {
  it('counts both sides’ pieces, ignoring pawns and kings', () => {
    expect(nonPawnMaterial(START_FEN)).toBe(62)
    expect(nonPawnMaterial('8/5k2/8/8/8/8/R4K2/8 w - - 0 50')).toBe(5)
    expect(nonPawnMaterial('4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1')).toBe(0)
  })
})

describe('detectPhase', () => {
  it('calls the first 24 half-moves the opening', () => {
    expect(detectPhase(1, START_FEN)).toBe('opening')
    expect(detectPhase(24, START_FEN)).toBe('opening')
    expect(detectPhase(25, START_FEN)).toBe('middlegame')
  })

  it('switches to the endgame at 26 points of non-pawn material', () => {
    // Each side two rooks and a knight: 13 + 13 = 26.
    const fen26 = 'r1r1k1n1/pppppppp/8/8/8/8/PPPPPPPP/R1R1K1N1 w - - 0 40'
    expect(nonPawnMaterial(fen26)).toBe(26)
    expect(detectPhase(40, fen26)).toBe('endgame')
    // Black has a queen, bishop and knight instead: 13 + 15 = 28.
    const fen28 = 'q1b1k1n1/pppppppp/8/8/8/8/PPPPPPPP/R1R1K1N1 w - - 0 40'
    expect(nonPawnMaterial(fen28)).toBe(28)
    expect(detectPhase(40, fen28)).toBe('middlegame')
  })

  it('reaches the endgame in a real long game', () => {
    const replay = buildReplay(fixtureGame('532df7fd').pgn)
    const last = replay.moves.length
    expect(detectPhase(last, fenAt(replay, last - 1))).toBe('endgame')
  })
})
