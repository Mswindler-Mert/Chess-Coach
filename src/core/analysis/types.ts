import type { Color } from '../games/model'

/**
 * Engine score from the point of view of the side to move, as UCI reports it.
 * `mate` is moves to mate: positive = side to move mates, negative = side to move gets mated,
 * 0 = side to move is already checkmated.
 */
export type Score = { type: 'cp'; value: number } | { type: 'mate'; value: number }

/** Evaluation of one position. */
export interface PositionEval {
  score: Score
  /** Best move in UCI notation (e.g. "e2e4", "e7e8q"); null when the game is over. */
  bestMove: string | null
  /** Principal variation in UCI notation, starting with `bestMove`. */
  pv: string[]
  /** Search depth reached; 0 for positions decided without the engine (mate, stalemate). */
  depth: number
}

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

export type Phase = 'opening' | 'middlegame' | 'endgame'

export interface MoveAnalysis {
  /** 1-based half-move number: ply 1 is the first move of the game. */
  ply: number
  color: Color
  /** Move played, in UCI notation. */
  uci: string
  san: string
  /** Mover's win% before and after the move (0–100). */
  winBefore: number
  winAfter: number
  /** winBefore − winAfter, never negative. */
  loss: number
  moveClass: MoveClass
  /** Phase of the position the move was played in. */
  phase: Phase
}

export type ClassCounts = Record<'inaccuracy' | 'mistake' | 'blunder', number>

export interface GameAnalysis {
  /** Evaluation of every position: index 0 is the start, index i is after ply i. */
  positions: PositionEval[]
  moves: MoveAnalysis[]
  summary: Record<Color, ClassCounts>
}
