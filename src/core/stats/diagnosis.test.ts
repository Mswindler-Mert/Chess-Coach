import { describe, expect, it } from 'vitest'
import type { GameAnalysis, MoveAnalysis } from '../analysis/types'
import type { Color, Game, Outcome } from '../games/model'
import { buildReplay } from '../games/replay'
import { classifyOpeningReply, diagnosePlayer, moveRangeForPly } from './diagnosis'

function makeGame(
  id: string,
  userColor: Color,
  outcome: Outcome,
  pgn: string,
): Game {
  return {
    id,
    username: 'tester',
    url: `https://example.com/${id}`,
    timeClass: 'rapid',
    timeControl: '600',
    rated: true,
    endTime: 1_700_000_000_000,
    userColor,
    outcome,
    resultCode: outcome === 'win' ? 'win' : 'checkmated',
    endReason: 'checkmated',
    white: { username: userColor === 'white' ? 'tester' : 'opp', rating: 500 },
    black: { username: userColor === 'black' ? 'tester' : 'opp', rating: 500 },
    opening: null,
    plies: null,
    pgn,
  }
}

function makeMove(
  ply: number,
  color: Color,
  san: string,
  moveClass: MoveAnalysis['moveClass'],
): MoveAnalysis {
  return {
    ply,
    color,
    uci: 'e2e4',
    san,
    winBefore: 55,
    winAfter: moveClass === 'blunder' ? 20 : 40,
    loss: moveClass === 'blunder' ? 35 : 15,
    moveClass,
    phase: ply <= 16 ? 'opening' : 'middlegame',
  }
}

function makeAnalysis(moves: MoveAnalysis[]): GameAnalysis {
  const counts = (c: Color) => ({
    inaccuracy: moves.filter((m) => m.color === c && m.moveClass === 'inaccuracy').length,
    mistake: moves.filter((m) => m.color === c && m.moveClass === 'mistake').length,
    blunder: moves.filter((m) => m.color === c && m.moveClass === 'blunder').length,
  })
  return {
    positions: [],
    moves,
    summary: { white: counts('white'), black: counts('black') },
  }
}

describe('moveRangeForPly', () => {
  it('maps half-moves to full-move ranges', () => {
    expect(moveRangeForPly(1)).toBe('1-5')
    expect(moveRangeForPly(10)).toBe('1-5')
    expect(moveRangeForPly(11)).toBe('6-10')
    expect(moveRangeForPly(20)).toBe('6-10')
    expect(moveRangeForPly(21)).toBe('11-20')
    expect(moveRangeForPly(40)).toBe('11-20')
    expect(moveRangeForPly(41)).toBe('21+')
  })
})

describe('classifyOpeningReply', () => {
  it('detects 1.e4 opponent replies for White', () => {
    expect(classifyOpeningReply('white', buildReplay('1. e4 d5 2. exd5 Qxd5'))).toBe('e4-d5')
    expect(classifyOpeningReply('white', buildReplay('1. e4 e5 2. Nf3 Nc6'))).toBe('e4-e5')
    expect(classifyOpeningReply('white', buildReplay('1. e4 c5 2. Nf3 d6'))).toBe('e4-c5')
    expect(classifyOpeningReply('white', buildReplay('1. e4 e6 2. d4 d5'))).toBe('e4-e6')
    expect(classifyOpeningReply('white', buildReplay('1. e4 c6 2. d4 d5'))).toBe('e4-c6')
  })

  it('detects early queen attacks against Black', () => {
    expect(classifyOpeningReply('black', buildReplay('1. e4 e5 2. Qh5 Nc6'))).toBe('vs-early-queen')
    expect(classifyOpeningReply('black', buildReplay('1. e4 e5 2. Bc4 Nc6 3. Qh5 g6'))).toBe(
      'vs-early-queen',
    )
    expect(classifyOpeningReply('black', buildReplay('1. e4 e5 2. Nf3 Nc6'))).toBe('vs-e4')
    expect(classifyOpeningReply('black', buildReplay('1. d4 d5 2. c4 e6'))).toBe('vs-d4')
  })
})

describe('diagnosePlayer', () => {
  it('counts hung pieces, move collapse buckets, and nemesis opening replies', () => {
    // Game 1: White hangs a knight on move 3 (ply 5: Ng5?? after 1.e4 d5 2.Nf3 dxe4 3.Ne5 -> wait: let's hang knight directly on f3->e5? No, 1.e4 d5 2.Nf3 Nf6 3.Ng5? defended? Let's do 1.e4 d5 2.Nf3 dxe4 3.Nd4?? e5 4.Nb5? Let's hang knight on h4 or bishop on a6!)
    // Simplest undeniable knight hang: 1. e4 d5 2. Nf3 dxe4 3. Ng5 h6 4. Nxe4 — wait, 1. e4 d5 2. Nc3 dxe4 3. Nxe4 -> let's use 1. e4 d5 2. Nf3 Nc6 3. Ng5? (not hung). 1. e4 d5 2. Bb5+ c6 3. Ba4 -> 1. e4 d5 2. Bc4?? (dxc4 hangs bishop!)
    const g1 = makeGame('g1', 'white', 'loss', '1. e4 d5 2. Bc4 dxc4')
    const a1 = makeAnalysis([
      makeMove(1, 'white', 'e4', 'best'),
      makeMove(2, 'black', 'd5', 'good'),
      makeMove(3, 'white', 'Bc4', 'blunder'), // ply 3 = move 2 (1-5), hangs bishop on c4!
    ])

    // Game 2: White plays 1.e4 d5 and loses again, hanging a bishop on move 2 too
    const g2 = makeGame('g2', 'white', 'loss', '1. e4 d5 2. Bc4 dxc4')
    const a2 = makeAnalysis([makeMove(3, 'white', 'Bc4', 'blunder')])

    // Game 3: White plays 1.e4 e5 and wins with no blunders
    const g3 = makeGame('g3', 'white', 'win', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5')
    const a3 = makeAnalysis([makeMove(1, 'white', 'e4', 'best')])

    const diag = diagnosePlayer([
      { game: g1, analysis: a1 },
      { game: g2, analysis: a2 },
      { game: g3, analysis: a3 },
    ])

    expect(diag.analyzedGames).toBe(3)
    expect(diag.totalErrors).toBe(2)
    expect(diag.worstPiece).toBe('b')
    expect(diag.hungPieces[0]).toMatchObject({ piece: 'b', count: 2, share: 1 })
    expect(diag.worstBucket).toBe('1-5')
    expect(diag.nemesisReply).toMatchObject({
      key: 'e4-d5',
      games: 2,
      wins: 0,
      losses: 2,
      winRate: 0,
      blundersPerGame: 1,
      guideId: 'e4-responses',
      lineId: 'scandinavian',
    })
  })

  it('handles empty input gracefully', () => {
    const diag = diagnosePlayer([])
    expect(diag.analyzedGames).toBe(0)
    expect(diag.worstPiece).toBeNull()
    expect(diag.worstBucket).toBeNull()
    expect(diag.nemesisReply).toBeNull()
    expect(diag.hungPieces).toEqual([])
  })
})
