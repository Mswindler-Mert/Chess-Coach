import { Chess } from 'chess.js'
import type { PositionRequest } from '../analysis/analyzeGame'
import { uciToSan } from '../analysis/display'
import type { GameAnalysis, MoveClass, Phase, PositionEval, Score } from '../analysis/types'
import { winPercent } from '../analysis/winPercent'
import type { Color, Game } from '../games/model'
import { fenAt, type Replay } from '../games/replay'

/** Error classes that become puzzles. Inaccuracies are too subtle at this level. */
export const PUZZLE_CLASSES: readonly MoveClass[] = ['mistake', 'blunder']

/** A move this close to the engine's best (in win%) also solves the puzzle. */
export const ACCEPT_MARGIN = 5

/** Plies of the refutation line shown after a wrong answer. */
const REFUTATION_PLIES = 4

export interface PuzzleMove {
  uci: string
  san: string
}

/** "Find the best move": the position before one of the user's own mistakes. */
export interface Puzzle {
  /** `${gameId}:${ply}` – stable across sessions. */
  id: string
  gameId: string
  /** Half-move (1-based) of the mistake in the game. */
  ply: number
  /** Position to solve; the user is to move. */
  fen: string
  /** The game's start position and moves up to `fen`, so the engine sees repetitions. */
  startFen: string
  moves: string[]
  color: Color
  phase: Phase
  moveClass: MoveClass
  /** What the user played in the game, and the engine's best move. */
  played: PuzzleMove
  solution: PuzzleMove
  /** Engine score of `fen` for the user. */
  bestScore: Score
  /** The opponent's best reply line after the move played in the game, in SAN. */
  refutation: string[]
  /** Win% the user had before and after the game move. */
  winBefore: number
  winAfter: number
  /** When the game ended (ms), for sorting and the date filter. */
  endTime: number
}

export const puzzleId = (gameId: string, ply: number) => `${gameId}:${ply}`

/** Turns an engine line (UCI) into SAN, stopping at the first illegal move. */
export function pvToSan(fen: string, pv: readonly string[], maxPlies = pv.length): string[] {
  const chess = new Chess(fen)
  const line: string[] = []
  for (const uci of pv.slice(0, maxPlies)) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
      })
      line.push(move.san)
    } catch {
      break
    }
  }
  return line
}

/** Puzzles from one analysed game: every mistake or blunder the user made. */
export function generatePuzzles(game: Game, replay: Replay, analysis: GameAnalysis): Puzzle[] {
  if (analysis.moves.length !== replay.moves.length) return []
  const puzzles: Puzzle[] = []
  for (const move of analysis.moves) {
    if (move.color !== game.userColor || !PUZZLE_CLASSES.includes(move.moveClass)) continue
    const index = move.ply - 1
    const before: PositionEval | undefined = analysis.positions[index]
    const after: PositionEval | undefined = analysis.positions[index + 1]
    if (!before?.bestMove || !after || before.bestMove === move.uci) continue

    const fen = fenAt(replay, index)
    const solutionSan = uciToSan(fen, before.bestMove)
    if (!solutionSan) continue
    puzzles.push({
      id: puzzleId(game.id, move.ply),
      gameId: game.id,
      ply: move.ply,
      fen,
      startFen: replay.startFen,
      moves: replay.moves.slice(0, index).map((m) => m.uci),
      color: move.color,
      phase: move.phase,
      moveClass: move.moveClass,
      played: { uci: move.uci, san: move.san },
      solution: { uci: before.bestMove, san: solutionSan },
      bestScore: before.score,
      refutation: pvToSan(fenAt(replay, move.ply), after.pv, REFUTATION_PLIES),
      winBefore: move.winBefore,
      winAfter: move.winAfter,
      endTime: game.endTime,
    })
  }
  return puzzles
}

/** The engine request for the position after the user tries `uci`. */
export function attemptPosition(puzzle: Puzzle, uci: string, fenAfter: string): PositionRequest {
  return { startFen: puzzle.startFen, moves: [...puzzle.moves, uci], fen: fenAfter }
}

export interface AnswerResult {
  correct: boolean
  /** True when the answer is exactly the engine's move. */
  exact: boolean
  /** Win% the attempt gives away compared with the engine's best move. */
  loss: number
}

/**
 * Judges an attempt. `afterScore` is the engine score of the position after the attempt
 * (for the opponent, who is then to move); it is not needed when the attempt is the solution.
 */
export function checkAnswer(
  puzzle: Puzzle,
  uci: string,
  afterScore: Score | null,
  margin = ACCEPT_MARGIN,
): AnswerResult {
  if (uci === puzzle.solution.uci) return { correct: true, exact: true, loss: 0 }
  if (!afterScore) throw new Error('A score is needed to judge a move other than the solution')
  const best = winPercent(puzzle.bestScore)
  const attempt = 100 - winPercent(afterScore)
  const loss = Math.max(0, best - attempt)
  return { correct: loss <= margin, exact: false, loss }
}

export interface PuzzleFilter {
  phase: Phase | 'all'
  color: Color | 'all'
}

export const ALL_PUZZLES: PuzzleFilter = { phase: 'all', color: 'all' }

export function filterPuzzles(puzzles: readonly Puzzle[], filter: PuzzleFilter): Puzzle[] {
  return puzzles.filter(
    (p) =>
      (filter.phase === 'all' || p.phase === filter.phase) &&
      (filter.color === 'all' || p.color === filter.color),
  )
}
