import type { Score } from '../analysis/types'
import type { Color } from '../games/model'
import type { EndgameGoal } from './curriculum'

/** A "win" goal is reached by promoting while at least this far ahead (or by a forced mate). */
export const PROMOTION_WIN_CP = 500
/** Below this (for the user) a mate or win goal is lost: the advantage is gone. */
export const ADVANTAGE_LOST_CP = 200
/** Below this (for the user) a draw goal is lost. */
export const DRAW_LOST_CP = -500

export type EndgameResult =
  | { outcome: 'continue' }
  | {
      outcome: 'success'
      reason: 'mate' | 'forced-mate' | 'promoted' | 'held' | 'rules-draw'
    }
  | { outcome: 'fail'; reason: 'mated' | 'rules-draw' | 'advantage-lost' | 'lost' | 'limit' }

export interface EndgameState {
  goal: EndgameGoal
  color: Color
  /** Position facts after the last ply. */
  checkmate: boolean
  /** Stalemate, insufficient material, threefold repetition or fifty-move rule. */
  rulesDraw: boolean
  sideToMove: Color
  /** The user's moves so far and the allowance. */
  userMoves: number
  moveLimit: number
  /** Engine score of the current position for the side to move, when known. */
  score: Score | null
  /** The user has promoted a pawn in this attempt. */
  promoted: boolean
}

/** Score from the user's point of view. */
function forUser(score: Score, sideToMove: Color, user: Color): Score {
  return sideToMove === user ? score : { type: score.type, value: -score.value }
}

/** Decides whether an endgame attempt is won, lost or still going. */
export function judgeEndgame(s: EndgameState): EndgameResult {
  if (s.checkmate) {
    return s.sideToMove === s.color
      ? { outcome: 'fail', reason: 'mated' }
      : { outcome: 'success', reason: 'mate' }
  }
  if (s.rulesDraw) {
    return s.goal === 'draw'
      ? { outcome: 'success', reason: 'rules-draw' }
      : { outcome: 'fail', reason: 'rules-draw' }
  }

  if (s.score) {
    const mine = forUser(s.score, s.sideToMove, s.color)
    const winningMate = mine.type === 'mate' && mine.value > 0
    const losingMate = mine.type === 'mate' && mine.value <= 0
    if (s.goal === 'draw') {
      if (losingMate || (mine.type === 'cp' && mine.value <= DRAW_LOST_CP)) {
        return { outcome: 'fail', reason: 'lost' }
      }
    } else {
      if (losingMate || (mine.type === 'cp' && mine.value < ADVANTAGE_LOST_CP)) {
        return { outcome: 'fail', reason: 'advantage-lost' }
      }
      if (s.goal === 'win') {
        if (winningMate) return { outcome: 'success', reason: 'forced-mate' }
        if (s.promoted && mine.type === 'cp' && mine.value >= PROMOTION_WIN_CP) {
          return { outcome: 'success', reason: 'promoted' }
        }
      }
    }
  }

  // The allowance is checked when it is the user's turn again.
  if (s.userMoves >= s.moveLimit && s.sideToMove === s.color) {
    return s.goal === 'draw'
      ? { outcome: 'success', reason: 'held' }
      : { outcome: 'fail', reason: 'limit' }
  }
  return { outcome: 'continue' }
}
