import { describe, expect, it, vi } from 'vitest'
import { lichessNdjson } from '../../../tests/helpers'
import { buildReplay } from '../games/replay'
import type { Game } from '../games/model'
import { ChessComError } from './chesscom'
import {
  LICHESS_FIRST_SYNC_MAX,
  lichessGamesUrl,
  normalizeLichessGame,
  parseNdjson,
  syncLichess,
  type LichessGame,
  type LichessStore,
} from './lichess'

const ACCOUNT = 'lichess:thibault'
const raws = parseNdjson(lichessNdjson)
const byId = (id: string) => raws.find((g) => g.id === id) as LichessGame

describe('parseNdjson', () => {
  it('reads one game per line and skips junk', () => {
    expect(raws.map((g) => g.id)).toEqual(['OOF6Pi6Z', '3M4Rq5YT', 'PlVtgcLv'])
    expect(parseNdjson('\n{"id":"a"}\nnot json\n\n')).toEqual([{ id: 'a' }])
  })
})

describe('normalizeLichessGame', () => {
  it('turns a won game into the app’s model', () => {
    const game = normalizeLichessGame(byId('OOF6Pi6Z'), ACCOUNT)
    expect(game).toMatchObject({
      id: 'li-OOF6Pi6Z',
      username: ACCOUNT,
      url: 'https://lichess.org/OOF6Pi6Z',
      timeClass: 'blitz',
      timeControl: '180',
      rated: true,
      userColor: 'white',
      outcome: 'win',
      resultCode: 'win',
      endReason: 'resigned',
      white: { username: 'thibault', rating: 1754 },
      black: { username: 'rivala', rating: 1783 },
      opening: { name: 'Scandinavian Defense: Mieses-Kotroc Variation' },
      plies: 25,
    })
    expect(game?.endTime).toBe(byId('OOF6Pi6Z').lastMoveAt)
  })

  it('reads losses, increments and the user as Black', () => {
    expect(normalizeLichessGame(byId('3M4Rq5YT'), ACCOUNT)).toMatchObject({
      timeControl: '300+3',
      userColor: 'white',
      outcome: 'loss',
      resultCode: 'resigned',
    })
    expect(normalizeLichessGame(byId('PlVtgcLv'), ACCOUNT)).toMatchObject({
      userColor: 'black',
      outcome: 'win',
      endReason: 'timeout',
    })
  })

  it('keeps PGNs that replay with clocks', () => {
    const game = normalizeLichessGame(byId('OOF6Pi6Z'), ACCOUNT) as Game
    const replay = buildReplay(game.pgn)
    expect(replay.moves).toHaveLength(25)
    expect(replay.moves[0]?.clockSeconds).toBe(180)
  })

  it('maps draws, speeds and correspondence', () => {
    const base = byId('OOF6Pi6Z')
    const draw = { ...base, status: 'stalemate', winner: undefined }
    expect(normalizeLichessGame(draw, ACCOUNT)).toMatchObject({
      outcome: 'draw',
      resultCode: 'stalemate',
      endReason: 'stalemate',
    })
    expect(normalizeLichessGame({ ...base, speed: 'classical' }, ACCOUNT)?.timeClass).toBe('rapid')
    expect(normalizeLichessGame({ ...base, speed: 'ultraBullet' }, ACCOUNT)?.timeClass).toBe(
      'bullet',
    )
    const daily = { ...base, speed: 'correspondence', daysPerTurn: 3, clock: undefined }
    expect(normalizeLichessGame(daily, ACCOUNT)).toMatchObject({
      timeClass: 'daily',
      timeControl: '1/259200',
    })
  })

  it('skips variants, aborted games and other people’s games', () => {
    const base = byId('OOF6Pi6Z')
    expect(normalizeLichessGame({ ...base, variant: 'chess960' }, ACCOUNT)).toBeNull()
    expect(normalizeLichessGame({ ...base, status: 'aborted' }, ACCOUNT)).toBeNull()
    expect(normalizeLichessGame(base, 'lichess:someoneelse')).toBeNull()
  })

  it('names anonymous and computer opponents', () => {
    const base = byId('OOF6Pi6Z')
    const ai = { ...base, players: { ...base.players, black: { aiLevel: 4 } } }
    expect(normalizeLichessGame(ai, ACCOUNT)?.black).toEqual({ username: 'Stockfish 4', rating: 0 })
  })
})

describe('lichessGamesUrl', () => {
  it('asks for PGNs with clocks and openings, newest first', () => {
    const url = new URL(lichessGamesUrl('thibault', { max: 10 }))
    expect(url.pathname).toBe('/api/games/user/thibault')
    expect(url.searchParams.get('pgnInJson')).toBe('true')
    expect(url.searchParams.get('clocks')).toBe('true')
    expect(url.searchParams.get('max')).toBe('10')
    expect(url.searchParams.has('since')).toBe(false)
  })
})

function memoryStore(newest: number | null): LichessStore & { saved: Game[]; calls: number } {
  const store = {
    saved: [] as Game[],
    calls: 0,
    newestEndTime: async () => newest,
    saveGames: async (games: Game[]) => {
      store.calls++
      store.saved.push(...games)
    },
  }
  return store
}

describe('syncLichess', () => {
  it('fetches the latest games on the first sync and saves them', async () => {
    const store = memoryStore(null)
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(lichessNdjson),
    )
    const progress = vi.fn<(p: { done: number; total: number }) => void>()
    const result = await syncLichess(ACCOUNT, { fetch, now: () => 1, store, onProgress: progress })
    expect(result).toEqual({ monthsFetched: 0, gamesFetched: 3 })
    expect(store.saved.map((g) => g.id)).toEqual(['li-OOF6Pi6Z', 'li-3M4Rq5YT', 'li-PlVtgcLv'])
    const url = new URL(fetch.mock.calls[0]?.[0] as string)
    expect(url.searchParams.get('max')).toBe(String(LICHESS_FIRST_SYNC_MAX))
    expect(progress).toHaveBeenLastCalledWith({ done: 3, total: 0 })
  })

  it('only asks for games after the newest stored one', async () => {
    const store = memoryStore(5000)
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(''),
    )
    const result = await syncLichess(ACCOUNT, { fetch, now: () => 1, store })
    expect(new URL(fetch.mock.calls[0]?.[0] as string).searchParams.get('since')).toBe('5001')
    expect(result.gamesFetched).toBe(0)
    // The empty check is still recorded.
    expect(store.calls).toBe(1)
  })

  it('reports missing users and rate limits like Chess.com', async () => {
    const run = (status: number) =>
      syncLichess(ACCOUNT, {
        fetch: async () => new Response('', { status }),
        now: () => 1,
        store: memoryStore(null),
      })
    await expect(run(404)).rejects.toMatchObject({ kind: 'not-found' })
    await expect(run(429)).rejects.toMatchObject({ kind: 'rate-limited' })
    await expect(run(500)).rejects.toBeInstanceOf(ChessComError)
  })
})
