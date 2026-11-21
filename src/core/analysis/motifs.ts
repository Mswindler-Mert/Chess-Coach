import { Chess } from 'chess.js'
import type { Game } from '../games/model'
import { fenAt, type Replay } from '../games/replay'
import { parseTimeControl } from '../games/timeControl'
import type { GameAnalysis, MoveAnalysis, PositionEval } from './types'

/**
 * Why a move went wrong, in priority order (the first one is the "main" motif).
 * UI labels live in i18n (`motif.*`); CLAUDE.md calls them asili-tas, bedava-tasi-almadi, …
 */
export const MOTIFS = [
  'hanging-piece',
  'missed-free-piece',
  'missed-mate',
  'walked-into-mate',
  'blew-winning-position',
  'time-pressure',
] as const
export type Motif = (typeof MOTIFS)[number]

export function isMotif(value: unknown): value is Motif {
  return typeof value === 'string' && (MOTIFS as readonly string[]).includes(value)
}

/** Material (P=1, N=B=3, R=5, Q=9) a line must win or lose to count as a piece. */
export const MATERIAL_SWING = 2
/** Plies of the engine line inspected for material changes. */
export const LINE_PLIES = 4
export const WINNING = 80
export const NOT_WINNING = 50
/** Time pressure: less than this share of the base time left on the clock. */
export const LOW_TIME_SHARE = 0.1

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }

/** White's material minus Black's, from the FEN board. */
export function materialBalance(fen: string): number {
  let balance = 0
  for (const ch of fen.split(' ')[0] ?? '') {
    const value = VALUES[ch.toLowerCase()]
    if (value) balance += ch === ch.toUpperCase() ? value : -value
  }
  return balance
}

/**
 * Material change for `color` along the first plies of `pv` from `fen`. Measured after an even
 * number of plies (so a recapture is counted), or after one ply if the line is that short.
 */
export function lineMaterialChange(
  fen: string,
  pv: readonly string[],
  color: 'white' | 'black',
  maxPlies = LINE_PLIES,
): number {
  const chess = new Chess(fen)
  const sign = color === 'white' ? 1 : -1
  const start = materialBalance(fen) * sign
  let plies = Math.min(maxPlies, pv.length)
  if (plies > 1 && plies % 2 === 1) plies--
  for (const uci of pv.slice(0, plies)) {
    try {
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
      })
    } catch {
      break
    }
  }
  return materialBalance(chess.fen()) * sign - start
}

function isCapture(fen: string, uci: string): boolean {
  try {
    const move = new Chess(fen).move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    })
    return move.isCapture() || move.isEnPassant()
  } catch {
    return false
  }
}

const isError = (move: MoveAnalysis) =>
  move.moveClass === 'inaccuracy' || move.moveClass === 'mistake' || move.moveClass === 'blunder'

export interface MotifContext {
  move: MoveAnalysis
  before: PositionEval
  after: PositionEval
  fenBefore: string
  fenAfter: string
  /** Mover's clock after the move (s), or null. */
  clock: number | null
  /** Base time of the game (s); null for daily games or unknown controls. */
  baseSeconds: number | null
}

/** Motifs of one move, in priority order. Only inaccuracies and worse get motifs. */
export function motifsForMove(ctx: MotifContext): Motif[] {
  const { move, before, after, fenBefore, fenAfter, clock, baseSeconds } = ctx
  if (!isError(move)) return []
  const motifs: Motif[] = []

  // After the move, the opponent's best line wins material.
  if (lineMaterialChange(fenAfter, after.pv, move.color) <= -MATERIAL_SWING) {
    motifs.push('hanging-piece')
  }
  // The best move captured something that stays won, and a different move was played.
  if (
    before.bestMove &&
    before.bestMove !== move.uci &&
    isCapture(fenBefore, before.bestMove) &&
    lineMaterialChange(fenBefore, before.pv, move.color) >= MATERIAL_SWING
  ) {
    motifs.push('missed-free-piece')
  }
  // Scores are for the side to move: `before` is the mover's, `after` the opponent's.
  const hadMate = before.score.type === 'mate' && before.score.value > 0
  const stillMates = after.score.type === 'mate' && after.score.value <= 0
  if (hadMate && !stillMates) motifs.push('missed-mate')
  const wasGettingMated = before.score.type === 'mate' && before.score.value < 0
  if (!wasGettingMated && after.score.type === 'mate' && after.score.value > 0) {
    motifs.push('walked-into-mate')
  }
  if (move.winBefore >= WINNING && move.winAfter <= NOT_WINNING) {
    motifs.push('blew-winning-position')
  }
  if (clock !== null && baseSeconds && clock < baseSeconds * LOW_TIME_SHARE) {
    motifs.push('time-pressure')
  }
  return motifs
}

/** Motifs for every move of an analysed game (index = ply − 1). */
export function tagGame(game: Game, replay: Replay, analysis: GameAnalysis): Motif[][] {
  if (analysis.moves.length !== replay.moves.length) return analysis.moves.map(() => [])
  const tc = parseTimeControl(game.timeControl)
  // Daily clocks are per-move deadlines, not game clocks: no time pressure there.
  const baseSeconds = tc?.kind === 'live' && game.timeClass !== 'daily' ? tc.baseSeconds : null
  return analysis.moves.map((move, index) => {
    const before = analysis.positions[index]
    const after = analysis.positions[index + 1]
    if (!before || !after) return []
    return motifsForMove({
      move,
      before,
      after,
      fenBefore: fenAt(replay, index),
      fenAfter: fenAt(replay, index + 1),
      clock: replay.moves[index]?.clockSeconds ?? null,
      baseSeconds,
    })
  })
}
