import { describe, expect, it } from 'vitest'
import { formatTimeControl, parseTimeControl } from './timeControl'

const units = { minutes: 'dk', days: 'gün' }

describe('parseTimeControl', () => {
  it('parses live controls with and without increment', () => {
    expect(parseTimeControl('1800')).toEqual({
      kind: 'live',
      baseSeconds: 1800,
      incrementSeconds: 0,
    })
    expect(parseTimeControl('180+2')).toEqual({
      kind: 'live',
      baseSeconds: 180,
      incrementSeconds: 2,
    })
  })

  it('parses daily controls', () => {
    expect(parseTimeControl('1/259200')).toEqual({ kind: 'daily', secondsPerMove: 259200 })
  })

  it('returns null for unknown formats', () => {
    expect(parseTimeControl('-')).toBeNull()
  })
})

describe('formatTimeControl', () => {
  it('formats for the game list', () => {
    expect(formatTimeControl('1800', units)).toBe('30 dk')
    expect(formatTimeControl('180+2', units)).toBe('3+2')
    expect(formatTimeControl('60', units)).toBe('1 dk')
    expect(formatTimeControl('30', units)).toBe('0.5 dk')
    expect(formatTimeControl('1/259200', units)).toBe('3 gün')
    expect(formatTimeControl('weird', units)).toBe('weird')
  })
})
