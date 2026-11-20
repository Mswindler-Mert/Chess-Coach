import { Chess } from 'chess.js'
import { fenAt, type Replay } from '../games/replay'
import type { Color } from '../games/model'
import { classifyMove, countClasses } from './classify'
import { detectPhase } from './phase'
import type { GameAnalysis, MoveAnalysis, PositionEval } from './types'
import { moveWinPercents } from './winPercent'

/** A position to evaluate: the game's start position plus the moves played so far. */
export interface PositionRequest {
  startFen: string
  /** Moves from `startFen` in UCI notation, so the engine knows about repetitions. */
  moves: string[]
  /** The resulting position. */
  fen: string
}

export type Evaluator = (position: PositionRequest) => Promise<PositionEval>

export interface AnalyzeOptions {
  /** Stops between positions; the returned promise then rejects with the abort reason. */
  signal?: AbortSignal
  /** Called after each position with how many of `total` positions are done. */
  onProgress?: (done: number, total: number) => void
}

export function sideToMove(fen: string): Color {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white'
}

/** Positions whose result is fixed by the rules; the engine is not asked about them. */
export function terminalEval(fen: string): PositionEval | null {
  const chess = new Chess(fen)
  if (chess.isCheckmate())
    return { score: { type: 'mate', value: 0 }, bestMove: null, pv: [], depth: 0 }
  if (chess.isStalemate() || chess.isInsufficientMaterial()) {
    return { score: { type: 'cp', value: 0 }, bestMove: null, pv: [], depth: 0 }
  }
  return null
}

/** Evaluates every position of the game in order, one at a time. */
export async function evaluatePositions(
  replay: Replay,
  evaluate: Evaluator,
  { signal, onProgress }: AnalyzeOptions = {},
): Promise<PositionEval[]> {
  const total = replay.moves.length + 1
  const positions: PositionEval[] = []
  for (let ply = 0; ply < total; ply++) {
    signal?.throwIfAborted()
    const fen = fenAt(replay, ply)
    const moves = replay.moves.slice(0, ply).map((m) => m.uci)
    positions.push(terminalEval(fen) ?? (await evaluate({ startFen: replay.startFen, moves, fen })))
    onProgress?.(ply + 1, total)
  }
  return positions
}

/** Turns position evaluations into per-move win% loss, labels and phases. */
export function analyzeMoves(replay: Replay, positions: readonly PositionEval[]): MoveAnalysis[] {
  return replay.moves.map((move, index) => {
    const before = positions[index]
    const after = positions[index + 1]
    if (!before || !after) throw new Error(`Missing evaluation around ply ${index + 1}`)
    const fenBefore = fenAt(replay, index)
    const ply = index + 1
    const { winBefore, winAfter, loss } = moveWinPercents(before.score, after.score)
    return {
      ply,
      color: sideToMove(fenBefore),
      uci: move.uci,
      san: move.san,
      winBefore,
      winAfter,
      loss,
      moveClass: classifyMove(loss, before.bestMove === move.uci),
      phase: detectPhase(ply, fenBefore),
    }
  })
}

/** Full analysis of one game: evaluations, per-move labels and per-side counts. */
export async function analyzeGame(
  replay: Replay,
  evaluate: Evaluator,
  options?: AnalyzeOptions,
): Promise<GameAnalysis> {
  const positions = await evaluatePositions(replay, evaluate, options)
  const moves = analyzeMoves(replay, positions)
  return { positions, moves, summary: countClasses(moves) }
}
