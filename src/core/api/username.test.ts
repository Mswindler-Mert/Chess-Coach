import { describe, expect, it } from 'vitest'
import { normalizeAccount, normalizeUsername } from './username'

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

  it('reads Lichess account keys', () => {
    expect(normalizeUsername('lichess:Thibault')).toBe('lichess:thibault')
    expect(normalizeUsername('LICHESS:ab')).toBe('lichess:ab')
    expect(normalizeUsername('lichess:')).toBeNull()
    expect(normalizeUsername('lichess:_x')).toBeNull()
  })
})

describe('normalizeAccount', () => {
  it('uses each site’s rules', () => {
    expect(normalizeAccount('chesscom', 'Hikaru')).toBe('hikaru')
    expect(normalizeAccount('lichess', ' DrNykterstein ')).toBe('lichess:drnykterstein')
    // Lichess allows 2 characters and up to 30; Chess.com needs 3–25.
    expect(normalizeAccount('lichess', 'ab')).toBe('lichess:ab')
    expect(normalizeAccount('chesscom', 'ab')).toBeNull()
    expect(normalizeAccount('lichess', 'a'.repeat(30))).toBe(`lichess:${'a'.repeat(30)}`)
    expect(normalizeAccount('lichess', 'a'.repeat(31))).toBeNull()
  })
})
