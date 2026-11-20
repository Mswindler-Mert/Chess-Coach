import { describe, expect, it } from 'vitest'
import { fixtureGame } from '../../../tests/helpers'
import { buildReplay, clocksAt, fenAt, formatClock, parseClocks } from './replay'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('parseClocks', () => {
  it('reads one clock per half-move in seconds', () => {
    const clocks = parseClocks(fixtureGame('d21dabaf').pgn)
    expect(clocks).toHaveLength(33)
    expect(clocks.slice(0, 2)).toEqual([180.8, 180.9])
  })

  it('handles hours', () => {
    expect(parseClocks('1. e4 {[%clk 2:31:08.9]}')).toEqual([9068.9])
  })

  it('returns nothing without clocks', () => {
    expect(parseClocks('1. e4 e5')).toEqual([])
  })
})

describe('buildReplay', () => {
  const replay = buildReplay(fixtureGame('ce051fa6').pgn)

  it('starts from the initial position', () => {
    expect(replay.startFen).toBe(START_FEN)
  })

  it('lists every move with its squares', () => {
    expect(replay.moves).toHaveLength(19)
    expect(replay.moves.slice(0, 3).map((m) => m.san)).toEqual(['e4', 'd5', 'Nc3'])
    expect(replay.moves[0]).toMatchObject({ from: 'e2', to: 'e4', uci: 'e2e4', clockSeconds: 1800 })
    expect(replay.moves.at(-1)?.san).toBe('Qd8#')
  })

  it('parses long games', () => {
    expect(buildReplay(fixtureGame('532df7fd').pgn).moves).toHaveLength(127)
  })
})

describe('fenAt', () => {
  const replay = buildReplay(fixtureGame('ce051fa6').pgn)

  it('returns the start position at ply 0 and the move position after', () => {
    expect(fenAt(replay, 0)).toBe(START_FEN)
    expect(fenAt(replay, 1)).toBe(replay.moves[0]?.fen)
    expect(fenAt(replay, 1)).toContain('4P3')
  })

  it('clamps out-of-range plies', () => {
    expect(fenAt(replay, -5)).toBe(START_FEN)
    expect(fenAt(replay, 999)).toBe(replay.moves.at(-1)?.fen)
  })
})

describe('clocksAt', () => {
  const replay = buildReplay(fixtureGame('d21dabaf').pgn)

  it('is empty before any move', () => {
    expect(clocksAt(replay, 0)).toEqual({ white: null, black: null })
  })

  it('tracks the latest clock of each side', () => {
    expect(clocksAt(replay, 1)).toEqual({ white: 180.8, black: null })
    expect(clocksAt(replay, 2)).toEqual({ white: 180.8, black: 180.9 })
  })
})

describe('formatClock', () => {
  it('formats minutes, tenths under 10 s and hours', () => {
    expect(formatClock(598)).toBe('9:58')
    expect(formatClock(7.4)).toBe('0:07.4')
    expect(formatClock(3723)).toBe('1:02:03')
    expect(formatClock(-1)).toBe('0:00.0')
  })
})
