import { describe, expect, it } from 'vitest'
import { fixtureGame, OWNER } from '../../../tests/helpers'
import { analyzeGame, type Evaluator } from '../analysis/analyzeGame'
import type { Motif } from '../analysis/motifs'
import { normalizeGame, type Game } from '../games/model'
import { buildReplay, fenAt } from '../games/replay'
import { checkSquares, generateHangingDrills } from './hangingDrills'

// ce051fa6: 1. e4 d5 2. Nc3 Kd7 3. d3 Nc6 4. Be3 Ke8 5. Be2 Nb4 6. a3 e5 7. axb4 Qg5 8. Bxg5 …
// 7… Qg5 (ply 14) puts Black's queen where the e3 bishop takes it.
const raw = fixtureGame('ce051fa6')
const replay = buildReplay(raw.pgn)
const asWhite = normalizeGame(raw, OWNER) as Game
const asBlack = normalizeGame(raw, raw.black.username) as Game

const evaluate: Evaluator = async ({ moves }) => ({
  score: { type: 'cp', value: 0 },
  bestMove: replay.moves[moves.length]?.uci ?? null,
  pv: [],
  depth: 12,
})
const analysis = await analyzeGame(replay, evaluate)

function motifsAt(entries: Record<number, Motif[]>): Motif[][] {
  return replay.moves.map((_, i) => entries[i + 1] ?? [])
}

describe('generateHangingDrills', () => {
  it('asks Black, after 7… Qg5, which piece hangs', () => {
    expect(asBlack.userColor).toBe('black')
    const drills = generateHangingDrills(
      asBlack,
      replay,
      analysis,
      motifsAt({ 14: ['hanging-piece'] }),
    )
    expect(drills).toEqual([
      expect.objectContaining({
        id: `hang:own:${asBlack.id}:14`,
        kind: 'own',
        ply: 14,
        fen: fenAt(replay, 14),
        color: 'black',
        answer: ['g5'],
        playedSan: 'Qg5',
      }),
    ])
  })

  it('asks White, before move 8, which enemy piece is free', () => {
    const drills = generateHangingDrills(
      asWhite,
      replay,
      analysis,
      motifsAt({ 15: ['missed-free-piece'] }),
    )
    expect(drills).toEqual([
      expect.objectContaining({
        id: `hang:free:${asWhite.id}:15`,
        kind: 'free',
        fen: fenAt(replay, 14),
        color: 'white',
        answer: ['g5'],
        bestSan: 'Bxg5',
      }),
    ])
  })

  it('skips tags on the opponent’s moves and moments without a static hang', () => {
    // Ply 14 is Black's move, so it is not White's drill; after 1. e4 nothing hangs.
    const motifs = motifsAt({ 14: ['hanging-piece'], 1: ['hanging-piece'] })
    expect(generateHangingDrills(asWhite, replay, analysis, motifs)).toEqual([])
  })
})

describe('checkSquares', () => {
  it('needs every answer and nothing else', () => {
    expect(checkSquares(['g5'], ['g5'])).toEqual({
      correct: true,
      found: ['g5'],
      missed: [],
      wrong: [],
    })
    expect(checkSquares(['g5', 'e4'], ['g5'])).toEqual({
      correct: false,
      found: ['g5'],
      missed: [],
      wrong: ['e4'],
    })
    expect(checkSquares([], ['g5', 'c3'])).toMatchObject({ correct: false, missed: ['g5', 'c3'] })
  })
})
