import type { Color } from '../games/model'
import type { GameAnalysis } from './types'
import { winPercent } from './winPercent'

/**
 * Accuracy of one move (0–100) from the mover's win% before and after it, as on Lichess:
 * no loss is 100, a 10-point drop about 65, a 30-point drop about 26.
 */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  if (winAfter >= winBefore) return 100
  const drop = winBefore - winAfter
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * drop) - 3.166924740191411
  // Lichess adds one point of "uncertainty bonus".
  return Math.min(100, Math.max(0, raw + 1))
}

function stdDev(values: readonly number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
}

/** White's win% for every position of the game. */
export function whiteWinPercents(analysis: Pick<GameAnalysis, 'positions' | 'moves'>): number[] {
  const first = analysis.moves[0]?.color ?? 'white'
  return analysis.positions.map((position, i) => {
    const toMove: Color = (i % 2 === 0) === (first === 'white') ? 'white' : 'black'
    const win = winPercent(position.score)
    return toMove === 'white' ? win : 100 - win
  })
}

/**
 * Game accuracy per side (0–100), following Lichess: the mean of a volatility-weighted mean and the
 * harmonic mean of the move accuracies. Calm stretches weigh less, and one blunder pulls the
 * harmonic mean down hard. Null for a side without moves.
 */
export function gameAccuracy(
  analysis: Pick<GameAnalysis, 'positions' | 'moves'>,
): Record<Color, number | null> {
  const wins = whiteWinPercents(analysis)
  const moves = analysis.moves
  if (moves.length === 0 || wins.length !== moves.length + 1) return { white: null, black: null }

  const size = Math.min(8, Math.max(2, Math.floor(wins.length / 10)))
  const windows: number[][] = []
  for (let i = 0; i < Math.min(size - 2, moves.length); i++) windows.push(wins.slice(0, size))
  for (let i = 0; i + size <= wins.length; i++) windows.push(wins.slice(i, i + size))
  const weights = windows.map((w) => Math.min(12, Math.max(0.5, stdDev(w))))

  const perSide: Record<Color, { accuracy: number; weight: number }[]> = { white: [], black: [] }
  moves.forEach((move, i) => {
    const before = wins[i] as number
    const after = wins[i + 1] as number
    const accuracy =
      move.color === 'white' ? moveAccuracy(before, after) : moveAccuracy(100 - before, 100 - after)
    perSide[move.color].push({ accuracy, weight: weights[i] ?? 0.5 })
  })

  const combine = (list: { accuracy: number; weight: number }[]): number | null => {
    if (list.length === 0) return null
    const weightSum = list.reduce((s, x) => s + x.weight, 0)
    const weighted = list.reduce((s, x) => s + x.accuracy * x.weight, 0) / weightSum
    const harmonic = list.length / list.reduce((s, x) => s + 1 / Math.max(1, x.accuracy), 0)
    return (weighted + harmonic) / 2
  }
  return { white: combine(perSide.white), black: combine(perSide.black) }
}
