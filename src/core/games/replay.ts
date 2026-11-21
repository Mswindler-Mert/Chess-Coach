import { Chess } from 'chess.js'

export interface ReplayMove {
  san: string
  from: string
  to: string
  /** Move in UCI notation, e.g. "e2e4" or "e7e8q". */
  uci: string
  /** Moving piece: p, n, b, r, q or k. */
  piece: string
  /** True for captures, including en passant. */
  capture: boolean
  /** True for castling (either side). */
  castle: boolean
  /** Position after this move. */
  fen: string
  /** Mover's remaining clock after this move, in seconds; null if the PGN has none. */
  clockSeconds: number | null
}

export interface Replay {
  startFen: string
  moves: ReplayMove[]
}

const CLOCK_PATTERN = /\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\]/

/** Reads `{[%clk 0:09:58.3]}` values, one per half-move, in seconds. */
export function parseClocks(pgn: string): number[] {
  const clocks: number[] = []
  for (const match of pgn.matchAll(new RegExp(CLOCK_PATTERN, 'g'))) {
    clocks.push(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]))
  }
  return clocks
}

/** Parses a PGN into every position of the game, so a viewer can step through it. */
export function buildReplay(pgn: string): Replay {
  const chess = new Chess()
  chess.loadPgn(pgn)
  const history = chess.history({ verbose: true })
  const clocks = parseClocks(pgn)
  const hasClocks = clocks.length === history.length

  const startFen = history[0]?.before ?? chess.fen()
  const moves = history.map((move, index) => ({
    san: move.san,
    from: move.from,
    to: move.to,
    uci: move.lan,
    piece: move.piece,
    capture: move.isCapture() || move.isEnPassant(),
    castle: move.isKingsideCastle() || move.isQueensideCastle(),
    fen: move.after,
    clockSeconds: hasClocks ? (clocks[index] ?? null) : null,
  }))
  return { startFen, moves }
}

/** FEN at `ply` (0 = start position). Clamps out-of-range values. */
export function fenAt(replay: Replay, ply: number): string {
  if (ply <= 0) return replay.startFen
  const move = replay.moves[Math.min(ply, replay.moves.length) - 1]
  return move ? move.fen : replay.startFen
}

/**
 * Remaining clocks for both sides at `ply`: the latest clock each side showed up to that point.
 * Before a side has moved its value is null.
 */
export function clocksAt(
  replay: Replay,
  ply: number,
): { white: number | null; black: number | null } {
  let white: number | null = null
  let black: number | null = null
  const upTo = Math.min(Math.max(ply, 0), replay.moves.length)
  for (let i = 0; i < upTo; i++) {
    const clock = replay.moves[i]?.clockSeconds ?? null
    // The start position may have black to move (rare), so read the side from the FEN.
    if (sideAfterPly(replay, i) === 'white') white = clock
    else black = clock
  }
  return { white, black }
}

/** Which side made half-move `index` (0-based). */
function sideAfterPly(replay: Replay, index: number): 'white' | 'black' {
  const whiteStarts = replay.startFen.split(' ')[1] !== 'b'
  const isEven = index % 2 === 0
  return isEven === whiteStarts ? 'white' : 'black'
}

/** "9:58", "0:07.4" under 10 s, "1:02:03" over an hour. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = total < 10 ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
