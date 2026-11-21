import { describe, expect, it } from 'vitest'
import { fixtureGame, OWNER } from '../../../tests/helpers'
import { analyzeGame, type Evaluator } from '../analysis/analyzeGame'
import type { GameAnalysis, PositionEval } from '../analysis/types'
import { normalizeGame, type Game } from '../games/model'
import { buildReplay } from '../games/replay'
import {
  ALL_PUZZLES,
  attemptPosition,
  checkAnswer,
  filterPuzzles,
  generatePuzzles,
  pvToSan,
  type Puzzle,
} from './puzzles'

// ce051fa6: the user is White: 1. e4 d5 2. Nc3 Kd7 3. d3 Nc6 … 10. Qd8#
const raw = fixtureGame('ce051fa6')
const game = normalizeGame(raw, OWNER) as Game
const replay = buildReplay(raw.pgn)

/** Fake engine: equal everywhere, the played move is best, except `overrides` (keyed by ply). */
function evaluator(overrides: Record<number, Partial<PositionEval>>): Evaluator {
  return async ({ moves }) => ({
    score: { type: 'cp', value: 0 },
    bestMove: replay.moves[moves.length]?.uci ?? null,
    pv: [],
    depth: 12,
    ...overrides[moves.length],
  })
}

// 3. d3 (ply 5) is a mistake: 3. exd5 was best, and Black is +3 after it.
// 3… Nc6 (ply 6, the opponent's) is a blunder, which must not become a puzzle.
const analysis: GameAnalysis = await analyzeGame(
  replay,
  evaluator({
    4: { bestMove: 'e4d5', pv: ['e4d5'] },
    5: { score: { type: 'cp', value: 300 }, bestMove: 'g8f6', pv: ['d5e4', 'd3e4'] },
    6: { score: { type: 'cp', value: 500 } },
  }),
)

describe('generatePuzzles', () => {
  const puzzles = generatePuzzles(game, replay, analysis)

  it('makes a puzzle from each of the user’s mistakes only', () => {
    expect(game.userColor).toBe('white')
    expect(analysis.moves[5]?.moveClass).toBe('blunder') // the opponent's
    expect(puzzles).toHaveLength(1)
  })

  it('describes the position, the game move and the solution', () => {
    const [puzzle] = puzzles
    expect(puzzle).toMatchObject({
      id: `${game.id}:5`,
      gameId: game.id,
      ply: 5,
      fen: replay.moves[3]?.fen,
      startFen: replay.startFen,
      moves: ['e2e4', 'd7d5', 'b1c3', 'e8d7'],
      color: 'white',
      phase: 'opening',
      moveClass: 'mistake',
      motifs: [],
      played: { uci: 'd2d3', san: 'd3' },
      solution: { uci: 'e4d5', san: 'exd5' },
      bestScore: { type: 'cp', value: 0 },
      refutation: ['dxe4', 'dxe4+'],
      winBefore: 50,
      endTime: game.endTime,
    })
    expect(puzzle?.winAfter).toBeCloseTo(24.9, 1)
  })

  it('skips analyses that do not match the game', () => {
    expect(generatePuzzles(game, replay, { ...analysis, moves: analysis.moves.slice(1) })).toEqual(
      [],
    )
  })

  it('makes no puzzles from a clean game', async () => {
    const clean = await analyzeGame(replay, evaluator({}))
    expect(generatePuzzles(game, replay, clean)).toEqual([])
  })
})

describe('pvToSan', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('converts an engine line', () => {
    expect(pvToSan(fen, ['e2e4', 'e7e5', 'g1f3'])).toEqual(['e4', 'e5', 'Nf3'])
    expect(pvToSan(fen, ['e2e4', 'e7e5', 'g1f3'], 2)).toEqual(['e4', 'e5'])
  })

  it('stops at an illegal move', () => {
    expect(pvToSan(fen, ['e2e4', 'e2e4', 'g1f3'])).toEqual(['e4'])
  })
})

describe('checkAnswer', () => {
  const [puzzle] = generatePuzzles(game, replay, analysis) as [Puzzle]

  it('accepts the engine move without asking the engine again', () => {
    expect(checkAnswer(puzzle, 'e4d5', null)).toEqual({ correct: true, exact: true, loss: 0 })
  })

  it('accepts a move within 5 win% of the best', () => {
    // After the attempt the opponent is slightly better: about 3.7 win% lost.
    const result = checkAnswer(puzzle, 'g1f3', { type: 'cp', value: 40 })
    expect(result.correct).toBe(true)
    expect(result.exact).toBe(false)
    expect(result.loss).toBeCloseTo(3.7, 1)
  })

  it('rejects a move that loses more', () => {
    const result = checkAnswer(puzzle, 'd2d3', { type: 'cp', value: 300 })
    expect(result.correct).toBe(false)
    expect(result.loss).toBeCloseTo(25.1, 1)
  })

  it('accepts a checkmate', () => {
    expect(checkAnswer(puzzle, 'x', { type: 'mate', value: 0 }).correct).toBe(true)
  })

  it('needs a score for other moves', () => {
    expect(() => checkAnswer(puzzle, 'g1f3', null)).toThrow('A score is needed')
  })

  it('builds the engine request for an attempt', () => {
    expect(attemptPosition(puzzle, 'g1f3', 'fen')).toEqual({
      startFen: puzzle.startFen,
      moves: [...puzzle.moves, 'g1f3'],
      fen: 'fen',
    })
  })
})

describe('filterPuzzles', () => {
  const base = generatePuzzles(game, replay, analysis)[0] as Puzzle
  const puzzles: Puzzle[] = [
    base,
    { ...base, id: 'b', color: 'black', phase: 'endgame', motifs: ['hanging-piece'] },
    { ...base, id: 'c', phase: 'middlegame', motifs: ['time-pressure', 'hanging-piece'] },
  ]

  it('filters by phase and colour', () => {
    expect(filterPuzzles(puzzles, ALL_PUZZLES)).toHaveLength(3)
    expect(filterPuzzles(puzzles, { ...ALL_PUZZLES, phase: 'endgame' }).map((p) => p.id)).toEqual([
      'b',
    ])
    expect(filterPuzzles(puzzles, { ...ALL_PUZZLES, color: 'white' })).toHaveLength(2)
    expect(filterPuzzles(puzzles, { ...ALL_PUZZLES, phase: 'opening', color: 'black' })).toEqual([])
  })

  it('filters by any of a puzzle’s motifs', () => {
    expect(
      filterPuzzles(puzzles, { ...ALL_PUZZLES, motif: 'hanging-piece' }).map((p) => p.id),
    ).toEqual(['b', 'c'])
    expect(filterPuzzles(puzzles, { ...ALL_PUZZLES, motif: 'missed-mate' })).toEqual([])
  })
})
