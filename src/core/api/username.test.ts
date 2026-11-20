import { describe, expect, it } from 'vitest'
import { normalizeUsername } from './username'

describe('normalizeUsername', () => {
  it('trims and lowercases', () => {
    expect(normalizeUsername('  Mswindler07 ')).toBe('mswindler07')
  })

  it('accepts underscores and hyphens', () => {
    expect(normalizeUsername('a_b-c')).toBe('a_b-c')
  })

  it('rejects empty, too short, too long and invalid characters', () => {
    expect(normalizeUsername('')).toBeNull()
    expect(normalizeUsername('ab')).toBeNull()
    expect(normalizeUsername('a'.repeat(26))).toBeNull()
    expect(normalizeUsername('bad name')).toBeNull()
    expect(normalizeUsername('../etc')).toBeNull()
  })
})
