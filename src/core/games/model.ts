import type { RawGame, RawTimeClass } from '../api/types'

export type TimeClass = RawTimeClass
export type Color = 'white' | 'black'
export type Outcome = 'win' | 'loss' | 'draw'

export interface PlayerInfo {
  username: string
  rating: number
}

export interface Opening {
  /** Human-readable name from Chess.com, e.g. "Scandinavian Defense Closed". */
  name: string
  url: string
}

/** A standard-chess game from the point of view of `username` (the app user). */
export interface Game {
  /** Chess.com game uuid */
  id: string
  /** Lowercase Chess.com username whose archive this game came from. */
  username: string
  url: string
  timeClass: TimeClass
  timeControl: string
  rated: boolean
  /** ms since epoch */
  endTime: number
  userColor: Color
  outcome: Outcome
  /** The user's raw Chess.com result, e.g. checkmated, timeout, stalemate. */
  resultCode: string
  white: PlayerInfo
  black: PlayerInfo
  opening: Opening | null
  /** Number of half-moves; null when unknown. */
  plies: number | null
  pgn: string
}

const DRAW_CODES = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
])

/** Maps a Chess.com player result code to win / loss / draw for that player. */
export function outcomeFromResult(code: string): Outcome {
  if (code === 'win') return 'win'
  if (DRAW_CODES.has(code)) return 'draw'
  return 'loss'
}

/** Turns `https://www.chess.com/openings/Three-Knights-Opening-3...Bc5` into a readable name. */
export function openingFromEcoUrl(url: string | undefined): Opening | null {
  if (!url) return null
  const slug = url.split('/openings/')[1]
  if (!slug) return null
  const name = decodeURIComponent(slug).replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  return name ? { name, url } : null
}

/** Chess.com's TCN uses two characters per half-move. */
function pliesFromTcn(tcn: string | undefined): number | null {
  return tcn === undefined ? null : Math.floor(tcn.length / 2)
}

/**
 * Converts a raw Chess.com game into our model. Returns null for games we do not keep:
 * variants (Chess960, odds chess, …) and games the owner did not play.
 */
export function normalizeGame(raw: RawGame, owner: string): Game | null {
  if (raw.rules !== 'chess') return null

  const ownerLower = owner.toLowerCase()
  let userColor: Color
  if (raw.white.username.toLowerCase() === ownerLower) userColor = 'white'
  else if (raw.black.username.toLowerCase() === ownerLower) userColor = 'black'
  else return null

  const me = raw[userColor]
  return {
    id: raw.uuid,
    username: ownerLower,
    url: raw.url,
    timeClass: raw.time_class,
    timeControl: raw.time_control,
    rated: raw.rated,
    endTime: raw.end_time * 1000,
    userColor,
    outcome: outcomeFromResult(me.result),
    resultCode: me.result,
    white: { username: raw.white.username, rating: raw.white.rating },
    black: { username: raw.black.username, rating: raw.black.rating },
    opening: openingFromEcoUrl(raw.eco),
    plies: pliesFromTcn(raw.tcn),
    pgn: raw.pgn,
  }
}

export function opponentOf(game: Game): PlayerInfo {
  return game.userColor === 'white' ? game.black : game.white
}

export function userOf(game: Game): PlayerInfo {
  return game[game.userColor]
}
