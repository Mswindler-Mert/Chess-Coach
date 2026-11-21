import type { Color, Game, Outcome, TimeClass } from '../games/model'
import { ChessComError } from './chesscom'
import { accountName, LICHESS_GAME_PREFIX } from './source'
import type { SyncProgress, SyncResult } from './sync'

const API_BASE = 'https://lichess.org/api'

/** The first sync of a Lichess account fetches at most this many recent games. */
export const LICHESS_FIRST_SYNC_MAX = 2000
/** Games are saved in batches of this size while the stream comes in. */
const SAVE_BATCH = 100

/** The fields of Lichess' game export (NDJSON) that the app uses. */
export interface LichessGame {
  id: string
  rated: boolean
  variant: string
  speed: string
  createdAt: number
  lastMoveAt: number
  status: string
  players: Record<Color, { user?: { name: string; id: string }; rating?: number; aiLevel?: number }>
  winner?: Color
  opening?: { eco: string; name: string }
  moves: string
  pgn?: string
  clock?: { initial: number; increment: number }
  daysPerTurn?: number
}

export function lichessGamesUrl(name: string, options: { since?: number; max?: number }): string {
  const params = new URLSearchParams({
    pgnInJson: 'true',
    clocks: 'true',
    opening: 'true',
    sort: 'dateDesc',
  })
  if (options.since !== undefined) params.set('since', String(options.since))
  if (options.max !== undefined) params.set('max', String(options.max))
  return `${API_BASE}/games/user/${encodeURIComponent(name)}?${params}`
}

/** One game per line; blank or broken lines are skipped. */
export function parseNdjson(text: string): LichessGame[] {
  const games: LichessGame[] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      games.push(JSON.parse(line) as LichessGame)
    } catch {
      // A broken line (e.g. a cut-off stream) is ignored.
    }
  }
  return games
}

const SPEEDS: Record<string, TimeClass> = {
  ultraBullet: 'bullet',
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rapid',
  // Classical is a long game like rapid: the app treats both the same way.
  classical: 'rapid',
  correspondence: 'daily',
}

/** Lichess statuses as the app's end-reason codes (shared with Chess.com where they match). */
const STATUSES: Record<string, string> = {
  mate: 'checkmated',
  resign: 'resigned',
  outoftime: 'timeout',
  timeout: 'abandoned',
  stalemate: 'stalemate',
  draw: 'agreed',
  insufficientMaterialClaim: 'insufficient',
}

/** Games that never really started. */
const SKIPPED_STATUSES = new Set(['created', 'started', 'aborted', 'noStart'])

function timeControl(raw: LichessGame): string {
  if (raw.speed === 'correspondence') return `1/${(raw.daysPerTurn ?? 1) * 86400}`
  if (!raw.clock) return '-'
  return raw.clock.increment > 0
    ? `${raw.clock.initial}+${raw.clock.increment}`
    : String(raw.clock.initial)
}

function playerName(player: LichessGame['players'][Color]): string {
  if (player.user) return player.user.name
  return player.aiLevel ? `Stockfish ${player.aiLevel}` : 'Anonymous'
}

/**
 * Converts a Lichess game into the app's model, from the point of view of `account`
 * ("lichess:name"). Returns null for variants, unfinished games and games the user did not play.
 */
export function normalizeLichessGame(raw: LichessGame, account: string): Game | null {
  if (raw.variant !== 'standard' || SKIPPED_STATUSES.has(raw.status) || !raw.pgn) return null
  const name = accountName(account)
  let userColor: Color
  if (raw.players.white.user?.id === name) userColor = 'white'
  else if (raw.players.black.user?.id === name) userColor = 'black'
  else return null

  const reason = STATUSES[raw.status] ?? raw.status
  const outcome: Outcome = !raw.winner ? 'draw' : raw.winner === userColor ? 'win' : 'loss'
  const plies = raw.moves.trim() ? raw.moves.trim().split(/\s+/).length : 0
  if (plies === 0) return null
  return {
    id: `${LICHESS_GAME_PREFIX}${raw.id}`,
    username: account,
    url: `https://lichess.org/${raw.id}`,
    timeClass: SPEEDS[raw.speed] ?? 'rapid',
    timeControl: timeControl(raw),
    rated: raw.rated,
    endTime: raw.lastMoveAt,
    userColor,
    outcome,
    resultCode: outcome === 'win' ? 'win' : reason,
    endReason: reason,
    white: { username: playerName(raw.players.white), rating: raw.players.white.rating ?? 0 },
    black: { username: playerName(raw.players.black), rating: raw.players.black.rating ?? 0 },
    opening: raw.opening
      ? { name: raw.opening.name, url: `https://lichess.org/opening/${raw.opening.eco}` }
      : null,
    plies,
    pgn: raw.pgn,
  }
}

export interface LichessStore {
  /** End time (ms) of the newest stored game of this account, or null. */
  newestEndTime(): Promise<number | null>
  saveGames(games: Game[], fetchedAt: number): Promise<void>
}

export interface LichessSyncDeps {
  fetch: (url: string, init?: RequestInit) => Promise<Response>
  now: () => number
  store: LichessStore
  /** `done` = games received so far; `total` is 0 (unknown while streaming). */
  onProgress?: (progress: SyncProgress) => void
}

/**
 * Fetches the account's new games in one streamed request: everything after the newest stored
 * game, or the latest `LICHESS_FIRST_SYNC_MAX` games on the first sync. Games are saved in batches
 * as they arrive. Errors use the same kinds as Chess.com so the UI handles both alike.
 */
export async function syncLichess(account: string, deps: LichessSyncDeps): Promise<SyncResult> {
  const newest = await deps.store.newestEndTime()
  const url = lichessGamesUrl(
    accountName(account),
    newest === null ? { max: LICHESS_FIRST_SYNC_MAX } : { since: newest + 1 },
  )
  let response: Response
  try {
    response = await deps.fetch(url, { headers: { Accept: 'application/x-ndjson' } })
  } catch (error) {
    throw new ChessComError('network', `Network error for ${url}: ${String(error)}`)
  }
  if (response.status === 404) throw new ChessComError('not-found', `Not found: ${url}`, 404)
  if (response.status === 429) throw new ChessComError('rate-limited', `Rate limited: ${url}`, 429)
  if (!response.ok)
    throw new ChessComError('http', `HTTP ${response.status}: ${url}`, response.status)

  const fetchedAt = deps.now()
  let received = 0
  let batch: Game[] = []
  const flush = async () => {
    if (batch.length === 0) return
    await deps.store.saveGames(batch, fetchedAt)
    batch = []
  }
  const take = async (lines: string) => {
    for (const raw of parseNdjson(lines)) {
      received++
      const game = normalizeLichessGame(raw, account)
      if (game) batch.push(game)
      if (batch.length >= SAVE_BATCH) await flush()
    }
    deps.onProgress?.({ done: received, total: 0 })
  }

  deps.onProgress?.({ done: 0, total: 0 })
  const reader = response.body?.getReader()
  if (reader) {
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const cut = buffer.lastIndexOf('\n')
      if (cut >= 0) {
        await take(buffer.slice(0, cut))
        buffer = buffer.slice(cut + 1)
      }
      if (done) break
    }
    await take(buffer)
  } else {
    await take(await response.text())
  }
  await flush()
  // An empty sync still records the check, so "last synced" stays right.
  if (received === 0) await deps.store.saveGames([], fetchedAt)
  return { monthsFetched: 0, gamesFetched: received }
}
