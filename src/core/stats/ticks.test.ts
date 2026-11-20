import { describe, expect, it } from 'vitest'
import { niceTicks } from './ticks'

describe('niceTicks', () => {
  it('covers the range with round steps', () => {
    expect(niceTicks(0, 3.2)).toEqual([0, 1, 2, 3, 4])
    expect(niceTicks(0, 0.8)).toEqual([0, 0.2, 0.4, 0.6, 0.8])
    expect(niceTicks(287, 341)).toEqual([280, 300, 320, 340, 360])
  })

  it('handles a flat range', () => {
    expect(niceTicks(300, 300)).toEqual([300, 301])
  })
})
