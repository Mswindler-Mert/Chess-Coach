import { describe, expect, it } from 'vitest'
import { parseBestMove, parseInfoLine, positionCommand } from './uci'

describe('parseInfoLine', () => {
  it('reads depth, score and principal variation', () => {
    const line =
      'info depth 10 seldepth 21 multipv 1 score cp 32 nodes 25009 nps 337959 hashfull 9 time 74 pv g1f3 b8c6 b1c3'
    expect(parseInfoLine(line)).toEqual({
      depth: 10,
      multipv: 1,
      score: { type: 'cp', value: 32 },
      bound: false,
      pv: ['g1f3', 'b8c6', 'b1c3'],
    })
  })

  it('reads mate scores, including mate 0', () => {
    expect(parseInfoLine('info depth 5 score mate -3 pv e8d8')?.score).toEqual({
      type: 'mate',
      value: -3,
    })
    expect(parseInfoLine('info depth 0 score mate 0')).toMatchObject({
      depth: 0,
      score: { type: 'mate', value: 0 },
      pv: [],
    })
  })

  it('flags bound scores', () => {
    expect(parseInfoLine('info depth 12 score cp 40 lowerbound nodes 9 pv e2e4')?.bound).toBe(true)
  })

  it('ignores lines without a score', () => {
    expect(parseInfoLine('info string NNUE evaluation using nn-61e7af4bb97d.nnue')).toBeNull()
    expect(parseInfoLine('info depth 3 currmove e2e4 currmovenumber 1')).toBeNull()
    expect(parseInfoLine('readyok')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('reads the best move', () => {
    expect(parseBestMove('bestmove g1f3 ponder b8c6')).toEqual({ bestMove: 'g1f3' })
    expect(parseBestMove('bestmove e7e8q')).toEqual({ bestMove: 'e7e8q' })
  })

  it('returns null as the move when the game is over', () => {
    expect(parseBestMove('bestmove (none)')).toEqual({ bestMove: null })
  })

  it('ignores other lines', () => {
    expect(parseBestMove('info depth 1 score cp 3 pv e2e4')).toBeNull()
  })
})

describe('positionCommand', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('builds the UCI position command', () => {
    expect(positionCommand(fen, [])).toBe(`position fen ${fen}`)
    expect(positionCommand(fen, ['e2e4', 'e7e5'])).toBe(`position fen ${fen} moves e2e4 e7e5`)
  })
})
