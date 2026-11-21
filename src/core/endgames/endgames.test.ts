import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { fixtureGame, OWNER } from '../../../tests/helpers'
import { analyzeGame, sideToMove, terminalEval, type Evaluator } from '../analysis/analyzeGame'
import { detectPhase } from '../analysis/phase'
import type { Score } from '../analysis/types'
import { normalizeGame, type Game } from '../games/model'
import { buildReplay, fenAt } from '../games/replay'
import { CURRICULUM } from './curriculum'
import { blownEndgames, OWN_ENDGAME_MOVES } from './fromGames'
import { judgeEndgame, type EndgameState } from './judge'

const cp = (value: number): Score => ({ type: 'cp', value })
const mate = (value: number): Score => ({ type: 'mate', value })

describe('CURRICULUM', () => {
  it('has unique ids and legal, playable positions with the user to move', () => {
    expect(new Set(CURRICULUM.map((l) => l.id)).size).toBe(CURRICULUM.length)
    for (const lesson of CURRICULUM) {
      expect(() => new Chess(lesson.fen)).not.toThrow()
      expect(sideToMove(lesson.fen)).toBe(lesson.color)
      expect(terminalEval(lesson.fen)).toBeNull()
      expect(lesson.moveLimit).toBeGreaterThan(0)
    }
  })
})

describe('judgeEndgame', () => {
  const base: EndgameState = {
    goal: 'mate',
    color: 'white',
    checkmate: false,
    rulesDraw: false,
    sideToMove: 'black',
    userMoves: 3,
    moveLimit: 15,
    score: null,
    promoted: false,
  }

  it('wins by checkmating and loses by being mated', () => {
    expect(judgeEndgame({ ...base, checkmate: true })).toEqual({
      outcome: 'success',
      reason: 'mate',
    })
    expect(judgeEndgame({ ...base, checkmate: true, sideToMove: 'white' })).toEqual({
      outcome: 'fail',
      reason: 'mated',
    })
  })

  it('treats a rules draw as success only for draw goals', () => {
    expect(judgeEndgame({ ...base, rulesDraw: true }).outcome).toBe('fail')
    expect(judgeEndgame({ ...base, goal: 'draw', rulesDraw: true })).toEqual({
      outcome: 'success',
      reason: 'rules-draw',
    })
  })

  it('reads the engine score from the side to move', () => {
    // Black to move and Black is mated in 3 → White (the user) has a forced mate.
    expect(judgeEndgame({ ...base, goal: 'win', score: mate(-3) })).toEqual({
      outcome: 'success',
      reason: 'forced-mate',
    })
    // A mate goal is not done until the mate is on the board.
    expect(judgeEndgame({ ...base, score: mate(-3) })).toEqual({ outcome: 'continue' })
  })

  it('fails a mate or win goal once the advantage is gone', () => {
    expect(judgeEndgame({ ...base, score: cp(-150) })).toEqual({
      outcome: 'fail',
      reason: 'advantage-lost',
    })
    expect(judgeEndgame({ ...base, goal: 'win', score: cp(-250) }).outcome).toBe('continue')
  })

  it('counts a promotion that keeps a big lead as a win', () => {
    const won = { ...base, goal: 'win' as const, promoted: true, score: cp(-700) }
    expect(judgeEndgame(won)).toEqual({ outcome: 'success', reason: 'promoted' })
    expect(judgeEndgame({ ...won, promoted: false }).outcome).toBe('continue')
  })

  it('fails a draw goal when the position is lost', () => {
    // White (the engine) to move, so positive scores are good for White.
    const draw = {
      ...base,
      goal: 'draw' as const,
      color: 'black' as const,
      sideToMove: 'white' as const,
    }
    expect(judgeEndgame({ ...draw, score: cp(600) })).toEqual({ outcome: 'fail', reason: 'lost' })
    expect(judgeEndgame({ ...draw, score: mate(4) }).outcome).toBe('fail')
    expect(judgeEndgame({ ...draw, score: cp(80) }).outcome).toBe('continue')
  })

  it('applies the move limit on the user’s turn', () => {
    const atLimit = { ...base, userMoves: 15, sideToMove: 'white' as const }
    expect(judgeEndgame(atLimit)).toEqual({ outcome: 'fail', reason: 'limit' })
    expect(judgeEndgame({ ...atLimit, sideToMove: 'black' }).outcome).toBe('continue')
    expect(judgeEndgame({ ...atLimit, goal: 'draw' })).toEqual({
      outcome: 'success',
      reason: 'held',
    })
  })
})

describe('blownEndgames', () => {
  // 532df7fd: a 127-ply blitz game that ends in an endgame.
  const raw = fixtureGame('532df7fd')
  const game = normalizeGame(raw, OWNER) as Game
  const replay = buildReplay(raw.pgn)
  // The user's last move played in an endgame position.
  const target = [...replay.moves.keys()].reverse().find((i) => {
    const fen = fenAt(replay, i)
    return sideToMove(fen) === game.userColor && detectPhase(i + 1, fen) === 'endgame'
  }) as number

  it('turns a thrown-away won endgame into a "win this" drill', async () => {
    // The user is +6 before the target move and level after it.
    const evaluate: Evaluator = async ({ moves }) => ({
      score: moves.length === target ? cp(600) : cp(0),
      bestMove: moves.length === target ? 'a1a1' : (replay.moves[moves.length]?.uci ?? null),
      pv: [],
      depth: 12,
    })
    const analysis = await analyzeGame(replay, evaluate)
    const drills = blownEndgames(game, replay, analysis)
    expect(drills).toEqual([
      expect.objectContaining({
        id: `${game.id}:${target + 1}`,
        fen: fenAt(replay, target),
        color: game.userColor,
        goal: 'win',
        moveLimit: OWN_ENDGAME_MOVES,
        ply: target + 1,
        playedSan: replay.moves[target]?.san,
      }),
    ])
  })

  it('ignores games without such a moment', async () => {
    const evaluate: Evaluator = async ({ moves }) => ({
      score: cp(0),
      bestMove: replay.moves[moves.length]?.uci ?? null,
      pv: [],
      depth: 12,
    })
    expect(blownEndgames(game, replay, await analyzeGame(replay, evaluate))).toEqual([])
  })
})
