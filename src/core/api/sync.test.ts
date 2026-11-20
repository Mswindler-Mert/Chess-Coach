import { describe, expect, it } from 'vitest'
import { fixtureArchives, fixtureGames, jsonResponse } from '../../../tests/helpers'
import type { RawGame } from './types'
import { monthEndMs, parseArchiveUrl, planSync, syncGames, type SyncProgress } from './sync'

const NOV_2026 = 'https://api.chess.com/pub/player/mswindler07/games/2026/11'
const OCT_2026 = 'https://api.chess.com/pub/player/mswindler07/games/2026/10'
const APR_2022 = 'https://api.chess.com/pub/player/mswindler07/games/2022/04'

describe('parseArchiveUrl', () => {
  it('reads year and month', () => {
    expect(parseArchiveUrl(NOV_2026)).toEqual({ year: 2026, month: 11 })
  })

  it('returns null for other URLs', () => {
    expect(parseArchiveUrl('https://example.com')).toBeNull()
  })
})

describe('monthEndMs', () => {
  it('is the first moment of the next month in UTC', () => {
    expect(monthEndMs({ year: 2026, month: 11 })).toBe(Date.UTC(2026, 11, 1))
    expect(monthEndMs({ year: 2026, month: 12 })).toBe(Date.UTC(2027, 0, 1))
  })
})

describe('planSync', () => {
  it('fetches every month on the first sync', () => {
    expect(planSync(fixtureArchives, new Map())).toEqual(fixtureArchives)
  })

  it('skips finished months that were fetched after they ended', () => {
    const fetchedAt = new Map(fixtureArchives.map((url) => [url, Date.UTC(2026, 10, 20)]))
    // Only November 2026 was still running when it was fetched.
    expect(planSync(fixtureArchives, fetchedAt)).toEqual([NOV_2026])
  })

  it('refetches a month that was fetched while it was still running', () => {
    const fetchedAt = new Map([
      [APR_2022, Date.UTC(2022, 5, 1)],
      [OCT_2026, Date.UTC(2026, 9, 15)],
      [NOV_2026, Date.UTC(2026, 11, 2)],
    ])
    expect(planSync([APR_2022, OCT_2026, NOV_2026], fetchedAt)).toEqual([OCT_2026])
  })
})

describe('syncGames', () => {
  it('fetches only needed months, newest first, one at a time, and saves each', async () => {
    const urls: string[] = []
    let inFlight = 0
    let maxInFlight = 0
    const saved: { url: string; games: RawGame[]; fetchedAt: number }[] = []
    const progress: SyncProgress[] = []

    const result = await syncGames('mswindler07', {
      fetch: async (url) => {
        urls.push(url)
        inFlight++
        maxInFlight = Math.max(maxInFlight, inFlight)
        await Promise.resolve()
        inFlight--
        if (url.endsWith('/archives'))
          return jsonResponse({ archives: [APR_2022, OCT_2026, NOV_2026] })
        return jsonResponse({ games: url === NOV_2026 ? fixtureGames.slice(0, 2) : fixtureGames })
      },
      sleep: async () => {},
      now: () => 1000,
      store: {
        getFetchedAt: async () => new Map([[APR_2022, Date.UTC(2023, 0, 1)]]),
        saveMonth: async (url, games, fetchedAt) => {
          saved.push({ url, games, fetchedAt })
        },
      },
      onProgress: (p) => progress.push(p),
    })

    expect(urls.slice(1)).toEqual([NOV_2026, OCT_2026])
    expect(maxInFlight).toBe(1)
    expect(saved.map((s) => s.url)).toEqual([NOV_2026, OCT_2026])
    expect(saved[0]?.fetchedAt).toBe(1000)
    expect(progress).toEqual([
      { done: 0, total: 2 },
      { done: 1, total: 2 },
      { done: 2, total: 2 },
    ])
    expect(result).toEqual({ monthsFetched: 2, gamesFetched: 2 + fixtureGames.length })
  })
})
