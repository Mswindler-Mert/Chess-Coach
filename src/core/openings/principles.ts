import { Chess, type Square } from 'chess.js'
import type { Color } from '../games/model'
import { fenAt, type Replay } from '../games/replay'

const STANDARD_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** The user's first this many moves are checked against opening principles. */
export const OPENING_MOVES = 10
/** Moving the queen within this many own moves counts as early. */
export const EARLY_QUEEN_MOVES = 5
/** Two or more minor pieces still at home after the opening counts as undeveloped. */
export const UNDEVELOPED_LIMIT = 2

export const PRINCIPLES = [
  'early-queen',
  'no-castling',
  'late-castling',
  'same-piece-twice',
  'edge-pawns',
  'undeveloped-pieces',
] as const
export type Principle = (typeof PRINCIPLES)[number]

export interface PrincipleWarning {
  principle: Principle
  /** Half-move (1-based) where it shows, for a link into the game. */
  ply: number
  /** How many times, for repeatable warnings (e.g. 2 edge-pawn moves). */
  count: number
}

const MINOR_HOMES: Record<Color, string[]> = {
  white: ['b1', 'g1', 'c1', 'f1'],
  black: ['b8', 'g8', 'c8', 'f8'],
}

/**
 * Opening-principle warnings for the user's side of one game. Only games from the standard
 * start position are checked; games shorter than the opening window get no castling or
 * development warnings.
 */
export function checkPrinciples(replay: Replay, color: Color): PrincipleWarning[] {
  if (replay.startFen !== STANDARD_START) return []
  const own = replay.moves
    .map((move, index) => ({ move, ply: index + 1 }))
    .filter(({ ply }) => (ply % 2 === 1) === (color === 'white'))
  const window = own.slice(0, OPENING_MOVES)
  const warnings: PrincipleWarning[] = []
  const add = (principle: Principle, ply: number, count = 1) =>
    warnings.push({ principle, ply, count })

  // Early queen: the first queen move within the first five own moves.
  const queen = own.slice(0, EARLY_QUEEN_MOVES).find(({ move }) => move.piece === 'q')
  if (queen) add('early-queen', queen.ply)

  // Castling: by own move 10, later, or never (only judged once the opening is over).
  if (own.length >= OPENING_MOVES) {
    const castled = own.findIndex(({ move }) => move.castle)
    const tenth = own[OPENING_MOVES - 1] as (typeof own)[number]
    if (castled < 0) add('no-castling', tenth.ply)
    else if (castled >= OPENING_MOVES) add('late-castling', own[castled]?.ply ?? tenth.ply)
  }

  // Same piece twice before all minor pieces are out. Captures and escapes from an attack are
  // fine: they answer threats rather than waste time.
  const homes = new Set(MINOR_HOMES[color])
  const moved = new Set<string>() // squares of pieces that have moved, by current square
  let repeats = 0
  let firstRepeat = 0
  for (const { move, ply } of window) {
    if (move.piece !== 'p' && move.piece !== 'k' && !move.castle) {
      if (
        moved.has(move.from) &&
        homes.size > 0 &&
        !move.capture &&
        !isUnderAttack(fenAt(replay, ply - 1), move.from, color)
      ) {
        repeats++
        firstRepeat ||= ply
      }
      moved.delete(move.from)
      moved.add(move.to)
    }
    homes.delete(move.from)
  }
  if (repeats > 0) add('same-piece-twice', firstRepeat, repeats)

  // Edge pawns: quiet a- or h-pawn moves.
  const edge = window.filter(
    ({ move }) => move.piece === 'p' && !move.capture && /^[ah]/.test(move.from),
  )
  if (edge.length > 0) add('edge-pawns', edge[0]?.ply ?? 0, edge.length)

  // Undeveloped: minor pieces still at home (never moved, not captured) after the opening.
  if (own.length >= OPENING_MOVES) {
    const last = window.at(-1) as (typeof window)[number]
    const board = (replay.moves[last.ply - 1]?.fen ?? '').split(' ')[0] ?? ''
    const homeLeft = MINOR_HOMES[color].filter(
      (sq) => !window.some(({ move }) => move.from === sq) && pieceAt(board, sq, color),
    )
    if (homeLeft.length >= UNDEVELOPED_LIMIT) add('undeveloped-pieces', last.ply, homeLeft.length)
  }

  return warnings.sort((a, b) => a.ply - b.ply)
}

/** True when the piece of `color` on `square` is attacked by the other side in `fen`. */
function isUnderAttack(fen: string, square: string, color: Color): boolean {
  try {
    return new Chess(fen).isAttacked(square as Square, color === 'white' ? 'b' : 'w')
  } catch {
    return false
  }
}

/** True when `square` holds a knight or bishop of `color` on the FEN board. */
function pieceAt(board: string, square: string, color: Color): boolean {
  const file = square.charCodeAt(0) - 97
  const rank = Number(square[1])
  const row = board.split('/')[8 - rank] ?? ''
  let col = 0
  for (const ch of row) {
    if (/\d/.test(ch)) col += Number(ch)
    else {
      if (col === file) return color === 'white' ? 'NB'.includes(ch) : 'nb'.includes(ch)
      col++
    }
  }
  return false
}

export interface PrincipleSummary {
  games: number
  /** Share of checked games (0–1) with each warning, in PRINCIPLES order. */
  rates: { principle: Principle; games: number; share: number }[]
}

export function summarizePrinciples(perGame: readonly PrincipleWarning[][]): PrincipleSummary {
  const games = perGame.length
  return {
    games,
    rates: PRINCIPLES.map((principle) => {
      const n = perGame.filter((w) => w.some((x) => x.principle === principle)).length
      return { principle, games: n, share: games ? n / games : 0 }
    }),
  }
}
