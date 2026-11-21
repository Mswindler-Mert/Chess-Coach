import { describe, expect, it } from 'vitest'
import { fixtureGame } from '../../../tests/helpers'
import { buildReplay } from '../games/replay'
import { gameAccuracy, moveAccuracy, whiteWinPercents } from './accuracy'
import { analyzeGame, type Evaluator } from './analyzeGame'
import type { PositionEval } from './types'

// ce051fa6: 19 plies, White mates on move 10.
const replay = buildReplay(fixtureGame('ce051fa6').pgn)

function evaluator(scores: Record<number, number> = {}): Evaluator {
  return async ({ moves }) =>
    ({
      score: { type: 'cp', value: scores[moves.length] ?? 0 },
      bestMove: replay.moves[moves.length]?.uci ?? null,
      pv: [],
      depth: 12,
    }) satisfies PositionEval
}

describe('moveAccuracy', () => {
  it('is 100 without a loss and falls with the win% drop', () => {
    expect(moveAccuracy(50, 50)).toBe(100)
    expect(moveAccuracy(40, 60)).toBe(100)
    expect(moveAccuracy(60, 50)).toBeCloseTo(64.6, 1)
    expect(moveAccuracy(50, 20)).toBeCloseTo(25.8, 1)
    expect(moveAccuracy(100, 0)).toBe(0)
  })
})

describe('whiteWinPercents', () => {
  it('turns side-to-move scores into White’s win%', async () => {
    // After 1. e4 (ply 1) Black is to move and −100: White is better.
    const analysis = await analyzeGame(replay, evaluator({ 1: -100 }))
    const wins = whiteWinPercents(analysis)
    expect(wins).toHaveLength(20)
    expect(wins[0]).toBe(50)
    expect(wins[1]).toBeGreaterThan(55)
    // The final position is checkmate with Black to move: White has won.
    expect(wins.at(-1)).toBe(100)
  })
})

describe('gameAccuracy', () => {
  it('gives 100 when nobody loses anything', async () => {
    const analysis = await analyzeGame(replay, evaluator())
    const accuracy = gameAccuracy(analysis)
    expect(accuracy.white).toBeCloseTo(100, 5)
    expect(accuracy.black).toBeCloseTo(100, 5)
  })

  it('punishes the side that blundered', async () => {
    // Black's 3… Nc6 (ply 6) leaves White +5 (score for White, who is to move at ply 6).
    const analysis = await analyzeGame(replay, evaluator({ 6: 500 }))
    const accuracy = gameAccuracy(analysis)
    expect(accuracy.black).toBeLessThan(80)
    expect(accuracy.white).toBeGreaterThan(accuracy.black ?? 100)
  })

  it('is null without moves', () => {
    const start: PositionEval = {
      score: { type: 'cp', value: 0 },
      bestMove: null,
      pv: [],
      depth: 1,
    }
    expect(gameAccuracy({ positions: [start], moves: [] })).toEqual({ white: null, black: null })
  })
})
