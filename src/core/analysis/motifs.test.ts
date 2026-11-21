import { describe, expect, it } from 'vitest'
import { fixtureGame, OWNER } from '../../../tests/helpers'
import { normalizeGame, type Game } from '../games/model'
import { buildReplay } from '../games/replay'
import { analyzeGame, type Evaluator } from './analyzeGame'
import {
  isMotif,
  lineMaterialChange,
  materialBalance,
  motifsForMove,
  tagGame,
  type MotifContext,
} from './motifs'
import type { MoveAnalysis, PositionEval, Score } from './types'

const cp = (value: number): Score => ({ type: 'cp', value })
const mate = (value: number): Score => ({ type: 'mate', value })
const pos = (score: Score, pv: string[] = [], bestMove: string | null = pv[0] ?? null) =>
  ({ score, pv, bestMove, depth: 12 }) satisfies PositionEval

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
// White's knight on e4 can be taken by the d5 pawn.
const KNIGHT_HANGS = 'rnbqkbnr/ppp1pppp/8/3p4/4N3/8/PPPPPPPP/R1BQKBNR b KQkq - 0 2'
// Black's knight on e5 can be taken by the d4 pawn; White to move.
const FREE_KNIGHT = 'rnbqkb1r/pppppppp/8/4n3/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 3'

function move(over: Partial<MoveAnalysis> = {}): MoveAnalysis {
  return {
    ply: 5,
    color: 'white',
    uci: 'a2a3',
    san: 'a3',
    winBefore: 50,
    winAfter: 25,
    loss: 25,
    moveClass: 'mistake',
    phase: 'opening',
    ...over,
  }
}

function ctx(over: Partial<MotifContext> = {}): MotifContext {
  return {
    move: move(),
    before: pos(cp(0), ['e2e4'], 'e2e4'),
    after: pos(cp(0)),
    fenBefore: START,
    fenAfter: START,
    clock: null,
    baseSeconds: null,
    ...over,
  }
}

// White's knight on b5 can fork the e8 king and a8 rook from c7.
const FORK_READY = 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1'

describe('materialBalance', () => {
  it('is zero at the start and counts pieces', () => {
    expect(materialBalance(START)).toBe(0)
    expect(materialBalance(KNIGHT_HANGS)).toBe(0)
    expect(materialBalance('4k3/8/8/8/8/8/8/R3K3 w - - 0 1')).toBe(5)
    expect(materialBalance('4k3/q7/8/8/8/8/8/R3K3 w - - 0 1')).toBe(-4)
  })
})

describe('lineMaterialChange', () => {
  it('measures what a line wins or loses for one side', () => {
    expect(lineMaterialChange(KNIGHT_HANGS, ['d5e4'], 'white')).toBe(-3)
    expect(lineMaterialChange(KNIGHT_HANGS, ['d5e4', 'd2d3'], 'white')).toBe(-3)
    expect(lineMaterialChange(KNIGHT_HANGS, ['d5e4', 'd2d3'], 'black')).toBe(3)
  })

  it('stops at an even ply so recaptures count', () => {
    // Bxf7+ Kxf7: the bishop is won back by the king, so White is down 2 (bishop for pawn).
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3'
    expect(lineMaterialChange(fen, ['c4f7', 'e8f7', 'g1f3'], 'white')).toBe(-2)
  })

  it('ignores illegal moves', () => {
    expect(lineMaterialChange(START, ['e2e5'], 'white')).toBe(0)
  })
})

describe('motifsForMove', () => {
  it('gives no motifs to good moves', () => {
    expect(motifsForMove(ctx({ move: move({ moveClass: 'good' }) }))).toEqual([])
  })

  it('finds a hanging piece', () => {
    const result = motifsForMove(ctx({ fenAfter: KNIGHT_HANGS, after: pos(cp(300), ['d5e4']) }))
    expect(result).toContain('hanging-piece')
  })

  it('does not call a lost pawn a hanging piece', () => {
    const pawnHangs = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2'
    expect(motifsForMove(ctx({ fenAfter: pawnHangs, after: pos(cp(100), ['d5e4']) }))).toEqual([])
  })

  it('finds a free piece that was not taken', () => {
    const result = motifsForMove(
      ctx({ fenBefore: FREE_KNIGHT, before: pos(cp(300), ['d4e5', 'e7e6'], 'd4e5') }),
    )
    expect(result).toEqual(['missed-free-piece'])
  })

  it('does not flag a missed piece when the best move is not a capture', () => {
    const result = motifsForMove(
      ctx({ fenBefore: FREE_KNIGHT, before: pos(cp(300), ['g1f3'], 'g1f3') }),
    )
    expect(result).not.toContain('missed-free-piece')
  })

  it('finds a fork the mover walked into', () => {
    const result = motifsForMove(
      ctx({
        move: move({ color: 'black', moveClass: 'blunder' }),
        fenAfter: FORK_READY,
        after: pos(cp(500), ['b5c7', 'e8d7', 'c7a8', 'd7c8']),
      }),
    )
    expect(result).toEqual(['hanging-piece', 'allowed-fork'])
  })

  it('does not call a plain capture a fork', () => {
    const result = motifsForMove(ctx({ fenAfter: KNIGHT_HANGS, after: pos(cp(300), ['d5e4']) }))
    expect(result).not.toContain('allowed-fork')
  })

  it('finds a fork the mover missed', () => {
    const result = motifsForMove(
      ctx({
        move: move({ uci: 'e1e2', san: 'Ke2' }),
        fenBefore: FORK_READY,
        before: pos(cp(500), ['b5c7', 'e8d7', 'c7a8', 'd7c8'], 'b5c7'),
      }),
    )
    expect(result).toEqual(['missed-fork'])
  })

  it('finds a missed mate and walking into mate', () => {
    expect(motifsForMove(ctx({ before: pos(mate(2), ['h5f7']), after: pos(cp(-300)) }))).toContain(
      'missed-mate',
    )
    // Still mating after the move (the opponent is getting mated): nothing missed.
    expect(
      motifsForMove(ctx({ before: pos(mate(3), ['h5f7']), after: pos(mate(-2)) })),
    ).not.toContain('missed-mate')
    expect(motifsForMove(ctx({ after: pos(mate(2)) }))).toContain('walked-into-mate')
    // Already being mated before: no new walk into mate.
    expect(motifsForMove(ctx({ before: pos(mate(-4)), after: pos(mate(3)) }))).not.toContain(
      'walked-into-mate',
    )
  })

  it('finds a winning position thrown away', () => {
    const result = motifsForMove(ctx({ move: move({ winBefore: 85, winAfter: 45 }) }))
    expect(result).toContain('blew-winning-position')
    expect(motifsForMove(ctx({ move: move({ winBefore: 75, winAfter: 40 }) }))).toEqual([])
  })

  it('flags time pressure under 10% of the base time', () => {
    expect(motifsForMove(ctx({ clock: 17, baseSeconds: 180 }))).toEqual(['time-pressure'])
    expect(motifsForMove(ctx({ clock: 19, baseSeconds: 180 }))).toEqual([])
    expect(motifsForMove(ctx({ clock: 5, baseSeconds: null }))).toEqual([])
  })

  it('lists motifs in priority order', () => {
    const result = motifsForMove(
      ctx({
        move: move({ winBefore: 90, winAfter: 10, moveClass: 'blunder' }),
        fenAfter: KNIGHT_HANGS,
        after: pos(cp(600), ['d5e4']),
        clock: 3,
        baseSeconds: 180,
      }),
    )
    expect(result).toEqual(['hanging-piece', 'blew-winning-position', 'time-pressure'])
  })
})

describe('tagGame', () => {
  const raw = fixtureGame('ce051fa6')
  const game = normalizeGame(raw, OWNER) as Game
  const replay = buildReplay(raw.pgn)

  it('tags each move of a real game', async () => {
    // White had a forced mate before 3. d3 (ply 5) and threw it away.
    const evaluate: Evaluator = async ({ moves }) => ({
      score: moves.length === 4 ? mate(3) : cp(0),
      bestMove: moves.length === 4 ? 'a1a1' : (replay.moves[moves.length]?.uci ?? null),
      pv: [],
      depth: 12,
    })
    const analysis = await analyzeGame(replay, evaluate)
    const tags = tagGame(game, replay, analysis)
    expect(tags).toHaveLength(replay.moves.length)
    expect(tags[4]).toEqual(['missed-mate', 'blew-winning-position'])
    expect(tags.filter((t) => t.length > 0)).toHaveLength(1)
  })

  it('recognises stored motif names', () => {
    expect(isMotif('hanging-piece')).toBe(true)
    expect(isMotif('opening')).toBe(false)
  })
})
