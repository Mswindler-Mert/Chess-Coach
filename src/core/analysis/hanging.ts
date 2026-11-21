import { Chess, type Square } from 'chess.js'
import type { Color } from '../games/model'

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 1000 }

/** Pieces worth at least this count as "hanging" (pawns are left out on purpose). */
export const MIN_HANGING_VALUE = 3

const letter = (color: Color) => (color === 'white' ? 'w' : 'b')

/** `fen` with `color` to move and no en-passant square, so we can try its captures. */
function withTurn(fen: string, color: Color): string {
  const parts = fen.split(' ')
  parts[1] = letter(color)
  parts[3] = '-'
  return parts.join(' ')
}

/**
 * Static exchange on `square`: the material `attacker` wins by starting a capture sequence there,
 * each side always recapturing with its least valuable piece and free to stop when that pays.
 * Captures are real legal moves, so pins and pieces lined up behind each other are handled.
 * Returns 0 when there is nothing to capture or capturing loses material.
 */
export function staticExchange(fen: string, square: string, attacker: Color): number {
  let chess: Chess
  try {
    chess = new Chess(withTurn(fen, attacker))
  } catch {
    return 0
  }
  const target = chess.get(square as Square)
  if (!target || target.color === letter(attacker)) return 0

  // gains[i] = value of the piece captured by the i-th capture of the sequence.
  const gains: number[] = []
  let onSquare = VALUES[target.type] ?? 0
  for (let i = 0; i < 32; i++) {
    const captures = chess
      .moves({ verbose: true })
      .filter((m) => m.to === square && (m.isCapture() || m.isEnPassant()))
    if (captures.length === 0) break
    const cheapest = captures.reduce((a, b) =>
      (VALUES[a.piece] ?? 0) <= (VALUES[b.piece] ?? 0) ? a : b,
    )
    gains.push(onSquare)
    onSquare = VALUES[cheapest.piece] ?? 0
    try {
      chess.move(cheapest)
    } catch {
      break
    }
    // A king capture ends the sequence: the king may not be recaptured.
    if (cheapest.piece === 'k') break
  }
  if (gains.length === 0) return 0
  // Each side may stop instead of recapturing: best(i) = max(0, gains[i] − best(i + 1)).
  let best = 0
  for (let i = gains.length - 1; i >= 1; i--) best = Math.max(0, (gains[i] as number) - best)
  return Math.max(0, (gains[0] as number) - best)
}

/**
 * Pieces of `color` (minor pieces and up, never the king) the other side could win material
 * against right now by capturing them. Sorted by value, then square.
 */
export function hangingPieces(fen: string, color: Color): string[] {
  let chess: Chess
  try {
    chess = new Chess(fen)
  } catch {
    return []
  }
  const enemy: Color = color === 'white' ? 'black' : 'white'
  const found: { square: string; value: number }[] = []
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== letter(color) || cell.type === 'k') continue
      const value = VALUES[cell.type] ?? 0
      if (value < MIN_HANGING_VALUE) continue
      if (staticExchange(fen, cell.square, enemy) > 0) found.push({ square: cell.square, value })
    }
  }
  return found
    .sort((a, b) => b.value - a.value || a.square.localeCompare(b.square))
    .map((f) => f.square)
}
