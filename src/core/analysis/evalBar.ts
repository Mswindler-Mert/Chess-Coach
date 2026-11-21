import type { Color } from '../games/model'
import type { Score } from './types'
import { flipScore, winPercent } from './winPercent'

export interface EvalBarState {
  /** White's share of the bar, 0–100 (clamped to 5–95 for non-mate scores). */
  whiteShare: number
  /** Side that is ahead (or White when equal), where the short label is placed. */
  favored: Color
  /** Compact label for the narrow bar, e.g. "0.0", "1.4", "12", "M3", "1-0". */
  label: string
}

/**
 * Computes the height and compact label for a vertical evaluation bar from a UCI score
 * (which is given from `sideToMove`'s perspective).
 */
export function evalBarState(score: Score, sideToMove: Color): EvalBarState {
  if (score.type === 'mate') {
    if (score.value === 0) {
      return sideToMove === 'white'
        ? { whiteShare: 0, favored: 'black', label: '0-1' }
        : { whiteShare: 100, favored: 'white', label: '1-0' }
    }
    const whiteScore = sideToMove === 'white' ? score : flipScore(score)
    const whiteMates = whiteScore.value > 0
    return {
      whiteShare: whiteMates ? 100 : 0,
      favored: whiteMates ? 'white' : 'black',
      label: `M${Math.abs(whiteScore.value)}`,
    }
  }

  const whiteScore = sideToMove === 'white' ? score : flipScore(score)
  const raw = winPercent(whiteScore)
  const whiteShare = Math.min(95, Math.max(5, Math.round(raw * 10) / 10))
  const pawns = Math.abs(whiteScore.value) / 100
  const label = pawns < 0.05 ? '0.0' : pawns >= 10 ? String(Math.round(pawns)) : pawns.toFixed(1)
  return {
    whiteShare,
    favored: whiteScore.value >= 0 ? 'white' : 'black',
    label,
  }
}
