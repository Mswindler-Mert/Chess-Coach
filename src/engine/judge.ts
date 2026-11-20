import { terminalEval } from '../core/analysis/analyzeGame'
import {
  attemptPosition,
  checkAnswer,
  type AnswerResult,
  type Puzzle,
} from '../core/training/puzzles'
import { getSharedEngine } from './shared'

/**
 * Judges a puzzle attempt. The engine's own move is accepted at once; any other move is searched
 * (in the worker) to the same depth as the analysis and accepted if it is nearly as good.
 */
export async function judgeAttempt(
  puzzle: Puzzle,
  uci: string,
  fenAfter: string,
  depth: number,
): Promise<AnswerResult> {
  if (uci === puzzle.solution.uci) return checkAnswer(puzzle, uci, null)
  const terminal = terminalEval(fenAfter)
  if (terminal) return checkAnswer(puzzle, uci, terminal.score)
  const engine = await getSharedEngine()
  const result = await engine.evaluate(attemptPosition(puzzle, uci, fenAfter), { depth })
  return checkAnswer(puzzle, uci, result.score)
}
