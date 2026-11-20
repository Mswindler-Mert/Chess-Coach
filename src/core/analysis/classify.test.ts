import { describe, expect, it } from 'vitest'
import { classifyMove, countClasses } from './classify'
import type { MoveAnalysis, MoveClass } from './types'

describe('classifyMove', () => {
  it('uses the 10 / 20 / 30 win% thresholds', () => {
    expect(classifyMove(9.99, false)).toBe('good')
    expect(classifyMove(10, false)).toBe('inaccuracy')
    expect(classifyMove(19.9, false)).toBe('inaccuracy')
    expect(classifyMove(20, false)).toBe('mistake')
    expect(classifyMove(30, false)).toBe('blunder')
    expect(classifyMove(80, false)).toBe('blunder')
  })

  it('always calls the engine’s best move best', () => {
    expect(classifyMove(0, true)).toBe('best')
    // A shallow search can disagree with itself one ply later; the best move is still best.
    expect(classifyMove(12, true)).toBe('best')
  })

  it('accepts custom thresholds', () => {
    expect(classifyMove(15, false, { inaccuracy: 5, mistake: 10, blunder: 15 })).toBe('blunder')
  })
})

describe('countClasses', () => {
  const move = (color: 'white' | 'black', moveClass: MoveClass): MoveAnalysis => ({
    ply: 1,
    color,
    uci: 'e2e4',
    san: 'e4',
    winBefore: 50,
    winAfter: 50,
    loss: 0,
    moveClass,
    phase: 'opening',
  })

  it('counts inaccuracies, mistakes and blunders per side', () => {
    const counts = countClasses([
      move('white', 'blunder'),
      move('white', 'blunder'),
      move('white', 'best'),
      move('black', 'mistake'),
      move('black', 'inaccuracy'),
      move('black', 'good'),
    ])
    expect(counts).toEqual({
      white: { inaccuracy: 0, mistake: 0, blunder: 2 },
      black: { inaccuracy: 1, mistake: 1, blunder: 0 },
    })
  })
})
