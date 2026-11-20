import { describe, expect, it } from 'vitest'
import { flipScore, moveWinPercents, winPercent } from './winPercent'

const cp = (value: number) => ({ type: 'cp', value }) as const
const mate = (value: number) => ({ type: 'mate', value }) as const

describe('winPercent', () => {
  it('is 50 for an equal position', () => {
    expect(winPercent(cp(0))).toBe(50)
  })

  it('follows the win% curve', () => {
    expect(winPercent(cp(300))).toBeCloseTo(75.1, 1)
    expect(winPercent(cp(-300))).toBeCloseTo(24.9, 1)
  })

  it('is symmetric', () => {
    for (const value of [37, 150, 800]) {
      expect(winPercent(cp(value)) + winPercent(cp(-value))).toBeCloseTo(100, 10)
    }
  })

  it('treats mate as 100 / 0, and being checkmated as 0', () => {
    expect(winPercent(mate(3))).toBe(100)
    expect(winPercent(mate(-2))).toBe(0)
    expect(winPercent(mate(0))).toBe(0)
  })

  it('barely changes in already won positions', () => {
    expect(winPercent(cp(800)) - winPercent(cp(600))).toBeLessThan(5)
  })
})

describe('moveWinPercents', () => {
  it('measures the mover’s loss from both sides’ scores', () => {
    // Equal before, opponent +5 after: a big drop for the mover.
    const result = moveWinPercents(cp(0), cp(500))
    expect(result.winBefore).toBe(50)
    expect(result.winAfter).toBeCloseTo(13.7, 1)
    expect(result.loss).toBeCloseTo(36.3, 1)
  })

  it('never reports a negative loss', () => {
    expect(moveWinPercents(cp(0), cp(-200)).loss).toBe(0)
  })

  it('loses nothing when keeping a forced mate or delivering mate', () => {
    expect(moveWinPercents(mate(3), mate(-2)).loss).toBe(0)
    expect(moveWinPercents(mate(1), mate(0)).loss).toBe(0)
  })

  it('loses everything when walking into mate from equality', () => {
    expect(moveWinPercents(cp(0), mate(1)).loss).toBe(50)
  })
})

describe('flipScore', () => {
  it('negates the score', () => {
    expect(flipScore(cp(120))).toEqual(cp(-120))
    expect(flipScore(mate(-3))).toEqual(mate(3))
  })
})
