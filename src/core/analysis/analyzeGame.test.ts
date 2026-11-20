import { describe, expect, it, vi } from 'vitest'
import { fixtureGame } from '../../../tests/helpers'
import { buildReplay } from '../games/replay'
import { analyzeGame, sideToMove, terminalEval, type Evaluator } from './analyzeGame'
import type { PositionEval } from './types'

// ce051fa6: a 19-ply rapid game that ends with 10. Qd8#.
const replay = buildReplay(fixtureGame('ce051fa6').pgn)

/**
 * A fake engine: every position is equal and the played move is "best", except the scores
 * given in `overrides` (keyed by ply = number of moves played).
 */
function fakeEvaluator(overrides: Record<number, Partial<PositionEval>> = {}): Evaluator {
  return vi.fn<Evaluator>(async ({ moves }) => ({
    score: { type: 'cp', value: 0 },
    bestMove: replay.moves[moves.length]?.uci ?? null,
    pv: [],
    depth: 12,
    ...overrides[moves.length],
  }))
}

describe('terminalEval', () => {
  it('scores checkmate as mate 0 for the mated side', () => {
    const mated = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    expect(terminalEval(mated)).toMatchObject({ score: { type: 'mate', value: 0 }, bestMove: null })
  })

  it('scores stalemate as a draw', () => {
    expect(terminalEval('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')?.score).toEqual({ type: 'cp', value: 0 })
  })

  it('leaves normal positions to the engine', () => {
    expect(terminalEval(replay.startFen)).toBeNull()
  })
})

describe('analyzeGame', () => {
  it('evaluates every position once, except the final checkmate', async () => {
    const evaluate = fakeEvaluator()
    const analysis = await analyzeGame(replay, evaluate)
    expect(analysis.positions).toHaveLength(20)
    expect(evaluate).toHaveBeenCalledTimes(19)
    expect(analysis.positions.at(-1)?.score).toEqual({ type: 'mate', value: 0 })
  })

  it('sends the moves played so far, so the engine sees repetitions', async () => {
    const evaluate = fakeEvaluator()
    await analyzeGame(replay, evaluate)
    expect(evaluate).toHaveBeenNthCalledWith(3, {
      startFen: replay.startFen,
      moves: ['e2e4', 'd7d5'],
      fen: replay.moves[1]?.fen,
    })
  })

  it('labels each move for its mover', async () => {
    const analysis = await analyzeGame(replay, fakeEvaluator())
    expect(analysis.moves).toHaveLength(19)
    expect(analysis.moves.map((m) => m.color).slice(0, 3)).toEqual(['white', 'black', 'white'])
    expect(analysis.moves.every((m) => m.moveClass === 'best')).toBe(true)
    expect(analysis.moves.every((m) => m.phase === 'opening')).toBe(true)
    // The mating move wins the game outright.
    expect(analysis.moves.at(-1)).toMatchObject({ san: 'Qd8#', winAfter: 100, ply: 19 })
  })

  it('finds a blunder from the scores around it', async () => {
    // After ply 6 the side to move (white) is +5: black's 6th half-move was a blunder.
    const analysis = await analyzeGame(
      replay,
      fakeEvaluator({ 5: { bestMove: 'a1a1' }, 6: { score: { type: 'cp', value: 500 } } }),
    )
    const blunder = analysis.moves[5]
    expect(blunder).toMatchObject({ ply: 6, color: 'black', moveClass: 'blunder' })
    expect(blunder?.loss).toBeCloseTo(36.3, 1)
    expect(analysis.summary.black.blunder).toBe(1)
    expect(analysis.summary.white).toEqual({ inaccuracy: 0, mistake: 0, blunder: 0 })
  })

  it('reports progress per position', async () => {
    const onProgress = vi.fn<(done: number, total: number) => void>()
    await analyzeGame(replay, fakeEvaluator(), { onProgress })
    expect(onProgress).toHaveBeenCalledTimes(20)
    expect(onProgress).toHaveBeenLastCalledWith(20, 20)
  })

  it('stops when aborted', async () => {
    const controller = new AbortController()
    const evaluate: Evaluator = async (position) => {
      if (position.moves.length === 3) controller.abort(new Error('paused'))
      return { score: { type: 'cp', value: 0 }, bestMove: null, pv: [], depth: 1 }
    }
    await expect(analyzeGame(replay, evaluate, { signal: controller.signal })).rejects.toThrow(
      'paused',
    )
  })
})

describe('sideToMove', () => {
  it('reads the FEN', () => {
    expect(sideToMove(replay.startFen)).toBe('white')
    expect(sideToMove(replay.moves[0]?.fen ?? '')).toBe('black')
  })
})
