import type { ClassCounts, MoveAnalysis, MoveClass } from './types'
import type { Color } from '../games/model'

/** Mover's win% loss at which a move gets each label. */
export const CLASS_THRESHOLDS = {
  inaccuracy: 10,
  mistake: 20,
  blunder: 30,
} as const

/** Labels a move by the win% it lost. The engine's own best move is always "best". */
export function classifyMove(
  loss: number,
  isBestMove: boolean,
  thresholds: Record<keyof typeof CLASS_THRESHOLDS, number> = CLASS_THRESHOLDS,
): MoveClass {
  if (isBestMove) return 'best'
  if (loss >= thresholds.blunder) return 'blunder'
  if (loss >= thresholds.mistake) return 'mistake'
  if (loss >= thresholds.inaccuracy) return 'inaccuracy'
  return 'good'
}

/** Number of inaccuracies, mistakes and blunders per side. */
export function countClasses(moves: readonly MoveAnalysis[]): Record<Color, ClassCounts> {
  const empty = (): ClassCounts => ({ inaccuracy: 0, mistake: 0, blunder: 0 })
  const counts = { white: empty(), black: empty() }
  for (const move of moves) {
    const c = move.moveClass
    if (c === 'inaccuracy' || c === 'mistake' || c === 'blunder') counts[move.color][c]++
  }
  return counts
}
