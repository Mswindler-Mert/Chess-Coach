import { describe, expect, it } from 'vitest'
import { accountKey, accountName, gameSource, sourceOf } from './source'

describe('account keys', () => {
  it('keeps Chess.com names plain and prefixes Lichess ones', () => {
    expect(accountKey('chesscom', 'hikaru')).toBe('hikaru')
    expect(accountKey('lichess', 'thibault')).toBe('lichess:thibault')
    expect(sourceOf('hikaru')).toBe('chesscom')
    expect(sourceOf('lichess:thibault')).toBe('lichess')
    expect(accountName('lichess:thibault')).toBe('thibault')
    expect(accountName('hikaru')).toBe('hikaru')
  })

  it('tells games apart by id', () => {
    expect(gameSource('li-OOF6Pi6Z')).toBe('lichess')
    expect(gameSource('ce051fa6-c633-11f1-a078-02a8b201000f')).toBe('chesscom')
  })
})
