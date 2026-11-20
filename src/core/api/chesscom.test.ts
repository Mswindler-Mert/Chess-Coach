import { describe, expect, it } from 'vitest'
import { fixtureArchives, fixtureGames, jsonResponse } from '../../../tests/helpers'
import {
  archivesUrl,
  ChessComError,
  fetchArchives,
  fetchMonth,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_RETRIES,
  type HttpDeps,
} from './chesscom'

function deps(responses: (Response | Error)[]): HttpDeps & { urls: string[]; waits: number[] } {
  const urls: string[] = []
  const waits: number[] = []
  return {
    urls,
    waits,
    fetch: async (url: string) => {
      urls.push(url)
      const next = responses.shift()
      if (!next) throw new Error('unexpected request')
      if (next instanceof Error) throw next
      return next
    },
    sleep: async (ms: number) => {
      waits.push(ms)
    },
  }
}

describe('archivesUrl', () => {
  it('builds the archives endpoint', () => {
    expect(archivesUrl('mswindler07')).toBe(
      'https://api.chess.com/pub/player/mswindler07/games/archives',
    )
  })
})

describe('fetchArchives', () => {
  it('returns the archive URLs', async () => {
    const d = deps([jsonResponse({ archives: fixtureArchives })])
    await expect(fetchArchives('mswindler07', d)).resolves.toEqual(fixtureArchives)
  })

  it('throws not-found for an unknown user', async () => {
    const d = deps([jsonResponse({ message: 'not found' }, 404)])
    await expect(fetchArchives('nobody-here', d)).rejects.toMatchObject({ kind: 'not-found' })
  })

  it('throws network when fetch fails', async () => {
    const d = deps([new TypeError('Failed to fetch')])
    await expect(fetchArchives('mswindler07', d)).rejects.toMatchObject({ kind: 'network' })
  })

  it('throws http for other errors', async () => {
    const d = deps([jsonResponse({}, 500)])
    const error = await fetchArchives('mswindler07', d).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ChessComError)
    expect(error).toMatchObject({ kind: 'http', status: 500 })
  })
})

describe('fetchMonth', () => {
  it('retries after 429 with growing waits, then succeeds', async () => {
    const d = deps([
      jsonResponse({}, 429),
      jsonResponse({}, 429),
      jsonResponse({ games: fixtureGames }),
    ])
    const games = await fetchMonth(fixtureArchives[0] ?? '', d)
    expect(games).toHaveLength(fixtureGames.length)
    expect(d.waits).toEqual([RATE_LIMIT_BASE_DELAY_MS, RATE_LIMIT_BASE_DELAY_MS * 2])
  })

  it('gives up after the retry limit', async () => {
    const d = deps(Array.from({ length: RATE_LIMIT_RETRIES + 1 }, () => jsonResponse({}, 429)))
    await expect(fetchMonth('x/games/2026/11', d)).rejects.toMatchObject({ kind: 'rate-limited' })
    expect(d.waits).toHaveLength(RATE_LIMIT_RETRIES)
  })
})
