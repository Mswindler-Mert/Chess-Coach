import type { Color } from '../games/model'
import type { MoveAnalysis } from './types'

/** How many key moments the game review lists. */
export const KEY_MOMENTS = 3

const ERRORS = new Set(['inaccuracy', 'mistake', 'blunder'])

/**
 * The moves where `color` lost the most (inaccuracies and worse), at most `limit` of them,
 * in game order — "where the game was lost".
 */
export function keyMoments(
  moves: readonly MoveAnalysis[],
  color: Color,
  limit = KEY_MOMENTS,
): MoveAnalysis[] {
  return moves
    .filter((m) => m.color === color && ERRORS.has(m.moveClass))
    .sort((a, b) => b.loss - a.loss || a.ply - b.ply)
    .slice(0, limit)
    .sort((a, b) => a.ply - b.ply)
}
