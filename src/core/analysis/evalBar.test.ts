import { describe, expect, it } from 'vitest'
import { evalBarState } from './evalBar'

describe('evalBarState', () => {
  it('centers an equal position at 50%', () => {
    expect(evalBarState({ type: 'cp', value: 0 }, 'white')).toEqual({
      whiteShare: 50,
      favored: 'white',
      label: '0.0',
    })
    expect(evalBarState({ type: 'cp', value: -3 }, 'black')).toEqual({
      whiteShare: 50.3,
      favored: 'white',
      label: '0.0',
    })
  })

  it('flips black-to-move scores to White perspective', () => {
    const state = evalBarState({ type: 'cp', value: 250 }, 'black')
    expect(state.favored).toBe('black')
    expect(state.whiteShare).toBeLessThan(35)
    expect(state.label).toBe('2.5')
  })

  it('clamps extreme centipawn scores to 5–95 and rounds large numbers', () => {
    const whiteUp = evalBarState({ type: 'cp', value: 1540 }, 'white')
    expect(whiteUp).toEqual({ whiteShare: 95, favored: 'white', label: '15' })

    const blackUp = evalBarState({ type: 'cp', value: -1200 }, 'white')
    expect(blackUp).toEqual({ whiteShare: 5, favored: 'black', label: '12' })
  })

  it('fills the bar completely for forced mate and checkmate', () => {
    expect(evalBarState({ type: 'mate', value: 3 }, 'white')).toEqual({
      whiteShare: 100,
      favored: 'white',
      label: 'M3',
    })
    expect(evalBarState({ type: 'mate', value: 2 }, 'black')).toEqual({
      whiteShare: 0,
      favored: 'black',
      label: 'M2',
    })
    expect(evalBarState({ type: 'mate', value: 0 }, 'white')).toEqual({
      whiteShare: 0,
      favored: 'black',
      label: '0-1',
    })
    expect(evalBarState({ type: 'mate', value: 0 }, 'black')).toEqual({
      whiteShare: 100,
      favored: 'white',
      label: '1-0',
    })
  })
})
