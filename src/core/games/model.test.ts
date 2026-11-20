import { describe, expect, it } from 'vitest'
import { fixtureGame, fixtureGames, OWNER } from '../../../tests/helpers'
import { normalizeGame, openingFromEcoUrl, opponentOf, outcomeFromResult, userOf } from './model'

describe('outcomeFromResult', () => {
  it('maps Chess.com result codes', () => {
    expect(outcomeFromResult('win')).toBe('win')
    for (const code of ['checkmated', 'timeout', 'resigned', 'abandoned', 'lose']) {
      expect(outcomeFromResult(code)).toBe('loss')
    }
    for (const code of [
      'stalemate',
      'agreed',
      'repetition',
      'insufficient',
      'timevsinsufficient',
    ]) {
      expect(outcomeFromResult(code)).toBe('draw')
    }
  })
})

describe('openingFromEcoUrl', () => {
  it('builds a readable name', () => {
    expect(
      openingFromEcoUrl('https://www.chess.com/openings/Three-Knights-Opening-3...Bc5'),
    ).toEqual({
      name: 'Three Knights Opening 3...Bc5',
      url: 'https://www.chess.com/openings/Three-Knights-Opening-3...Bc5',
    })
  })

  it('returns null without a URL', () => {
    expect(openingFromEcoUrl(undefined)).toBeNull()
    expect(openingFromEcoUrl('https://www.chess.com/')).toBeNull()
  })
})

describe('normalizeGame', () => {
  it('converts a rapid win as white', () => {
    const game = normalizeGame(fixtureGame('ce051fa6'), OWNER)
    expect(game).toMatchObject({
      id: 'ce051fa6-c633-11f1-a078-02a8b201000f',
      username: 'mswindler07',
      timeClass: 'rapid',
      timeControl: '1800',
      userColor: 'white',
      outcome: 'win',
      resultCode: 'win',
      endTime: 1791806195000,
      plies: 19,
      opening: { name: 'Scandinavian Defense Closed' },
    })
    expect(game && userOf(game).username).toBe('Mswindler07')
    expect(game && opponentOf(game).username).toBe('OGET3555')
  })

  it('converts a daily loss as black', () => {
    expect(normalizeGame(fixtureGame('f798149a'), OWNER)).toMatchObject({
      timeClass: 'daily',
      userColor: 'black',
      outcome: 'loss',
      resultCode: 'resigned',
    })
  })

  it('treats stalemate as a draw', () => {
    expect(normalizeGame(fixtureGame('532df7fd'), OWNER)?.outcome).toBe('draw')
  })

  it('matches the owner case-insensitively', () => {
    expect(normalizeGame(fixtureGame('ce051fa6'), 'MSWINDLER07')?.userColor).toBe('white')
  })

  it('skips variants and games of other players', () => {
    expect(normalizeGame(fixtureGame('d98ef833'), OWNER)).toBeNull() // odds chess
    expect(normalizeGame(fixtureGame('b966118f'), OWNER)).toBeNull() // chess960
    expect(normalizeGame(fixtureGame('ce051fa6'), 'someone-else')).toBeNull()
  })

  it('keeps all standard fixture games', () => {
    const kept = fixtureGames.map((g) => normalizeGame(g, OWNER)).filter((g) => g !== null)
    expect(kept).toHaveLength(7)
  })
})
