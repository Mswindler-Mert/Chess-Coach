import type { Score } from '../core/analysis/types'

export interface InfoLine {
  depth: number
  multipv: number
  score: Score
  /** True for "lowerbound"/"upperbound" scores, which are not final for that depth. */
  bound: boolean
  pv: string[]
}

/** Parses a UCI `info … score …` line. Returns null for info lines without a score. */
export function parseInfoLine(line: string): InfoLine | null {
  const tokens = line.trim().split(/\s+/)
  if (tokens[0] !== 'info') return null

  let depth: number | null = null
  let multipv = 1
  let score: Score | null = null
  let bound = false
  let pv: string[] = []

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]
    if (token === 'string') return null // free text, never a score
    if (token === 'depth') depth = Number(tokens[++i])
    else if (token === 'multipv') multipv = Number(tokens[++i])
    else if (token === 'score') {
      const type = tokens[++i]
      const value = Number(tokens[++i])
      if ((type === 'cp' || type === 'mate') && Number.isFinite(value)) score = { type, value }
    } else if (token === 'lowerbound' || token === 'upperbound') bound = true
    else if (token === 'pv') {
      pv = tokens.slice(i + 1)
      break
    }
  }

  if (depth === null || !Number.isFinite(depth) || score === null) return null
  return { depth, multipv, score, bound, pv }
}

/** Parses `bestmove e2e4 [ponder e7e5]`. `(none)` (game over) becomes null. */
export function parseBestMove(line: string): { bestMove: string | null } | null {
  const tokens = line.trim().split(/\s+/)
  if (tokens[0] !== 'bestmove') return null
  const move = tokens[1]
  return { bestMove: move && move !== '(none)' ? move : null }
}

/** The `position` command for a start FEN plus moves played from it. */
export function positionCommand(startFen: string, moves: readonly string[]): string {
  return moves.length > 0
    ? `position fen ${startFen} moves ${moves.join(' ')}`
    : `position fen ${startFen}`
}
