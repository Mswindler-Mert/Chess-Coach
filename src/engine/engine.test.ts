import { createRequire } from 'node:module'
import { afterAll, describe, expect, it } from 'vitest'
import { fixtureGame, OWNER } from '../../tests/helpers'
import { analyzeGame } from '../core/analysis/analyzeGame'
import { tagGame } from '../core/analysis/motifs'
import { normalizeGame, type Game } from '../core/games/model'
import { buildReplay } from '../core/games/replay'
import { UciEngine, type EngineTransport } from './engine'

// The real Stockfish build the app ships (lite, single-threaded WASM), run through Node.
interface NodeStockfish {
  processCommand(command: string): void
  listener?: (line: string) => void
  terminate(): void
}
const require = createRequire(import.meta.url)
const loadStockfish = require('stockfish') as (
  flavor: string,
  onMessage: (line: string) => void,
) => NodeStockfish

function nodeTransport(): EngineTransport {
  let listener: (line: string) => void = () => {}
  const engine = loadStockfish('lite-single', (line) => listener(line))
  return {
    send: (command) => engine.processCommand(command),
    onLine: (l) => {
      listener = l
    },
    terminate: () => engine.terminate(),
  }
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('UciEngine with Stockfish', { timeout: 60_000 }, () => {
  const engine = new UciEngine(nodeTransport())
  afterAll(() => engine.terminate())

  it('starts and evaluates the start position', async () => {
    await engine.init({ Hash: 16 })
    const result = await engine.evaluate(
      { startFen: START_FEN, moves: [], fen: START_FEN },
      { depth: 8 },
    )
    expect(result.depth).toBe(8)
    expect(result.score.type).toBe('cp')
    expect(Math.abs(result.score.value)).toBeLessThan(100)
    expect(result.bestMove).toMatch(/^[a-h][1-8][a-h][1-8]$/)
    expect(result.pv[0]).toBe(result.bestMove)
  })

  it('finds mate in one for the side to move', async () => {
    // Scholar's mate: white plays Qxf7#.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4'
    const result = await engine.evaluate({ startFen: fen, moves: [], fen }, { depth: 6 })
    expect(result.score).toEqual({ type: 'mate', value: 1 })
    expect(result.bestMove).toBe('h5f7')
  })

  it('queues concurrent requests', async () => {
    const position = { startFen: START_FEN, moves: ['e2e4'], fen: '' }
    const [a, b] = await Promise.all([
      engine.evaluate(position, { depth: 4 }),
      engine.evaluate({ ...position, moves: ['e2e4', 'e7e5'] }, { depth: 5 }),
    ])
    expect(a.depth).toBe(4)
    expect(b.depth).toBe(5)
  })

  it('analyses a real game and finds the losing side’s errors', async () => {
    // ce051fa6: the user (black) gets mated on move 10.
    const replay = buildReplay(fixtureGame('ce051fa6').pgn)
    await engine.newGame()
    const analysis = await analyzeGame(replay, (p) => engine.evaluate(p, { depth: 8 }))
    expect(analysis.positions).toHaveLength(replay.moves.length + 1)
    const black = analysis.summary.black
    expect(black.mistake + black.blunder).toBeGreaterThan(0)
    expect(analysis.moves.at(-1)?.winAfter).toBe(100)

    // 7… Qg5?? (ply 14) puts the queen where 8. Bxg5 takes it for free.
    const game = normalizeGame(fixtureGame('ce051fa6'), OWNER) as Game
    const tags = tagGame(game, replay, analysis)
    expect(analysis.moves[13]?.san).toBe('Qg5')
    expect(tags[13]).toContain('hanging-piece')
  })
})
