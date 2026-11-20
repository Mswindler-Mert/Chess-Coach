import type { Phase } from './types'

/** The first 12 moves (24 half-moves) count as the opening. */
export const OPENING_PLIES = 24

/** Endgame once both sides' combined non-pawn material is at most this (N/B=3, R=5, Q=9). */
export const ENDGAME_MATERIAL = 26

const PIECE_VALUES: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 }

/** Combined non-pawn material of both sides, read from the FEN's board field. */
export function nonPawnMaterial(fen: string): number {
  const board = fen.split(' ')[0] ?? ''
  let total = 0
  for (const ch of board.toLowerCase()) total += PIECE_VALUES[ch] ?? 0
  return total
}

/**
 * Phase of the position in which half-move `ply` (1-based) is played; `fen` is that position.
 * The opening wins over the endgame rule, so early mass trades still count as opening.
 */
export function detectPhase(ply: number, fen: string): Phase {
  if (ply <= OPENING_PLIES) return 'opening'
  if (nonPawnMaterial(fen) <= ENDGAME_MATERIAL) return 'endgame'
  return 'middlegame'
}
