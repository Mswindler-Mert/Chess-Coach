import { Chess } from 'chess.js'
import type { Color } from '../games/model'
import type { Score } from './types'

/**
 * Score as players read it, from White's point of view: "+1.3", "-0.4", "M3" (White mates in 3),
 * "-M2" (Black mates in 2), "1-0" / "0-1" when the side to move is already checkmated.
 */
export function formatScore(score: Score, sideToMove: Color): string {
  const other: Color = sideToMove === 'white' ? 'black' : 'white'
  if (score.type === 'mate') {
    if (score.value === 0) return sideToMove === 'white' ? '0-1' : '1-0'
    const matingSide = score.value > 0 ? sideToMove : other
    const moves = Math.abs(score.value)
    return matingSide === 'white' ? `M${moves}` : `-M${moves}`
  }
  const white = sideToMove === 'white' ? score.value : -score.value
  const pawns = white / 100
  if (Math.abs(pawns) < 0.05) return '0.0'
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`
}

/** A UCI move ("g1f3") in standard notation ("Nf3") for the position `fen`; null if illegal. */
export function uciToSan(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    })
    return move.san
  } catch {
    return null
  }
}
