import { describe, expect, it } from 'vitest'
import { formatScore, uciToSan } from './display'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('formatScore', () => {
  it('shows centipawns in pawns from White’s side', () => {
    expect(formatScore({ type: 'cp', value: 132 }, 'white')).toBe('+1.3')
    expect(formatScore({ type: 'cp', value: 132 }, 'black')).toBe('-1.3')
    expect(formatScore({ type: 'cp', value: -45 }, 'black')).toBe('+0.5')
    expect(formatScore({ type: 'cp', value: 3 }, 'black')).toBe('0.0')
  })

  it('shows forced mates', () => {
    expect(formatScore({ type: 'mate', value: 3 }, 'white')).toBe('M3')
    expect(formatScore({ type: 'mate', value: 3 }, 'black')).toBe('-M3')
    expect(formatScore({ type: 'mate', value: -2 }, 'black')).toBe('M2')
  })

  it('shows the result once the side to move is checkmated', () => {
    expect(formatScore({ type: 'mate', value: 0 }, 'black')).toBe('1-0')
    expect(formatScore({ type: 'mate', value: 0 }, 'white')).toBe('0-1')
  })
})

describe('uciToSan', () => {
  it('converts engine moves to standard notation', () => {
    expect(uciToSan(START_FEN, 'g1f3')).toBe('Nf3')
    expect(uciToSan('8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'e7e8q')).toBe('e8=Q')
  })

  it('returns null for illegal moves', () => {
    expect(uciToSan(START_FEN, 'e2e5')).toBeNull()
  })
})
