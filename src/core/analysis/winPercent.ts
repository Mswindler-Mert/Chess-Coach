import type { Score } from './types'

/** Lichess' fitted curve from centipawns to winning chances. */
const WIN_CURVE = -0.00368208

/** Win% (0–100) of the side to move. Mate scores count as 100 / 0. */
export function winPercent(score: Score): number {
  if (score.type === 'mate') return score.value > 0 ? 100 : 0
  return 50 + 50 * (2 / (1 + Math.exp(WIN_CURVE * score.value)) - 1)
}

/**
 * How much win% the mover gave away with one move.
 * `before` is scored for the mover (it is their turn), `after` for the opponent.
 */
export function moveWinPercents(
  before: Score,
  after: Score,
): { winBefore: number; winAfter: number; loss: number } {
  const winBefore = winPercent(before)
  const winAfter = 100 - winPercent(after)
  return { winBefore, winAfter, loss: Math.max(0, winBefore - winAfter) }
}

/** Score of the same position from the other side's point of view. */
export function flipScore(score: Score): Score {
  return { type: score.type, value: -score.value }
}
