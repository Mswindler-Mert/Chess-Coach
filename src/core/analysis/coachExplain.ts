import { Chess, type PieceSymbol } from 'chess.js'
import type { Color } from '../games/model'
import { buildLineSteps, describeMove, type LineStep, type MoveDetails } from './explainMove'
import { cheapestCapturer, hangingPieces, staticExchange, type ThreatCapture } from './hanging'
import type { Motif } from './motifs'
import { forkTargets } from './tactics'

export type BestReason =
  | { kind: 'checkmate' }
  | { kind: 'forced-mate' }
  | { kind: 'free-capture'; gain: number }
  | { kind: 'fork'; targetCount: number }
  | { kind: 'pin' }
  | { kind: 'skewer' }
  | { kind: 'saves-piece'; piece: PieceSymbol; from: string }
  | { kind: 'castle' }
  | { kind: 'capture' }
  | { kind: 'gives-check' }
  | { kind: 'develops' }
  | { kind: 'active-rook'; file: string }
  | { kind: 'position' }

export type PlayedReason =
  | { kind: 'walked-into-mate' }
  | { kind: 'hanging-piece'; threat: ThreatCapture | null }
  | { kind: 'allowed-fork' }
  | { kind: 'allowed-pin' }
  | { kind: 'allowed-skewer' }
  | { kind: 'missed-free-piece'; targetSquare: string; targetPiece: PieceSymbol }
  | { kind: 'missed-mate' }
  | { kind: 'blew-winning' }
  | { kind: 'time-pressure' }
  | { kind: 'general' }

export type CoachTipKey = Motif | 'saves-piece' | 'general'

export interface MistakeCoaching {
  best: {
    move: MoveDetails
    reason: BestReason
  }
  played: {
    move: MoveDetails
    reason: PlayedReason
    enemyReply: MoveDetails | null
    refutationSteps: LineStep[]
  }
  tip: CoachTipKey
  hintSquare: string
}

export interface MistakeExplainInput {
  /** Position before the mistake (the user is to move). */
  fen: string
  color: Color
  playedUci: string
  bestUci: string
  /** Engine PV from the position after `playedUci` (opponent's refutation). */
  afterPlayedPv: readonly string[]
  motifs: readonly Motif[]
}

/**
 * Produces concrete, beginner-friendly coaching data for a mistake: why the engine's move works,
 * why the played move went wrong (with the opponent's immediate punishment), and what mental
 * checklist to use next time.
 */
export function explainMistake(input: MistakeExplainInput): MistakeCoaching | null {
  const bestMove = describeMove(input.fen, input.bestUci)
  const playedMove = describeMove(input.fen, input.playedUci)
  if (!bestMove || !playedMove) return null

  const enemy: Color = input.color === 'white' ? 'black' : 'white'
  const motifs = input.motifs
  const refutationSteps = buildLineSteps(playedMove.fenAfter, input.afterPlayedPv, 4)
  const enemyReply = refutationSteps[0]?.move ?? null

  const bestReason = classifyBestReason(input.fen, bestMove, input.color, enemy, motifs)
  const playedReason = classifyPlayedReason(playedMove, bestMove, input.color, enemy, motifs)

  const tip: CoachTipKey =
    motifs[0] ?? (bestReason.kind === 'saves-piece' ? 'saves-piece' : 'general')

  return {
    best: { move: bestMove, reason: bestReason },
    played: {
      move: playedMove,
      reason: playedReason,
      enemyReply,
      refutationSteps,
    },
    tip,
    hintSquare: bestMove.from,
  }
}

function classifyBestReason(
  fenBefore: string,
  best: MoveDetails,
  color: Color,
  enemy: Color,
  motifs: readonly Motif[],
): BestReason {
  if (best.checkmate) return { kind: 'checkmate' }
  if (motifs.includes('missed-mate')) return { kind: 'forced-mate' }
  if (motifs.includes('missed-fork')) {
    const targets = forkTargets(best.fenAfter, best.to)
    return { kind: 'fork', targetCount: Math.max(2, targets.length) }
  }
  if (motifs.includes('missed-pin')) return { kind: 'pin' }
  if (motifs.includes('missed-skewer')) return { kind: 'skewer' }
  if (best.captured) {
    const see = staticExchange(fenBefore, best.to, color)
    if (see >= 2 || motifs.includes('missed-free-piece')) {
      return { kind: 'free-capture', gain: Math.max(see, 1) }
    }
  }
  // Did the best move rescue a piece that was hanging on its origin square?
  const hangingBefore = hangingPieces(fenBefore, color)
  if (hangingBefore.includes(best.from) && !hangingPieces(best.fenAfter, color).includes(best.to)) {
    return { kind: 'saves-piece', piece: best.piece, from: best.from }
  }
  if (best.castling) return { kind: 'castle' }
  if (best.captured) return { kind: 'capture' }
  // Even without the motif tag, check if the best move created a fork.
  if (
    forkTargets(best.fenAfter, best.to).length >= 2 &&
    staticExchange(best.fenAfter, best.to, enemy) === 0
  ) {
    return { kind: 'fork', targetCount: forkTargets(best.fenAfter, best.to).length }
  }
  if (best.check) return { kind: 'gives-check' }
  const backRank = color === 'white' ? '1' : '8'
  if ((best.piece === 'n' || best.piece === 'b') && best.from.endsWith(backRank)) {
    return { kind: 'develops' }
  }
  if (best.piece === 'r' && isOpenFileForColor(best.fenAfter, best.to[0] ?? 'e', color)) {
    return { kind: 'active-rook', file: best.to[0] ?? 'e' }
  }
  return { kind: 'position' }
}

function isOpenFileForColor(fen: string, file: string, color: Color): boolean {
  try {
    const board = new Chess(fen).board()
    const col = file.charCodeAt(0) - 'a'.charCodeAt(0)
    if (col < 0 || col > 7) return false
    const friendly = color === 'white' ? 'w' : 'b'
    for (let r = 0; r < 8; r++) {
      const cell = board[r]?.[col]
      if (cell && cell.type === 'p' && cell.color === friendly) return false
    }
    return true
  } catch {
    return false
  }
}

function classifyPlayedReason(
  played: MoveDetails,
  best: MoveDetails,
  color: Color,
  enemy: Color,
  motifs: readonly Motif[],
): PlayedReason {
  if (motifs.includes('walked-into-mate')) return { kind: 'walked-into-mate' }
  if (motifs.includes('allowed-fork')) return { kind: 'allowed-fork' }
  if (motifs.includes('allowed-pin')) return { kind: 'allowed-pin' }
  if (motifs.includes('allowed-skewer')) return { kind: 'allowed-skewer' }
  if (motifs.includes('hanging-piece')) {
    const hanging = hangingPieces(played.fenAfter, color)
    const square = hanging.includes(played.to) ? played.to : hanging[0]
    const threat = square ? cheapestCapturer(played.fenAfter, square, enemy) : null
    return { kind: 'hanging-piece', threat }
  }
  if (motifs.includes('missed-free-piece') && best.captured) {
    return { kind: 'missed-free-piece', targetSquare: best.to, targetPiece: best.captured }
  }
  if (motifs.includes('missed-mate')) return { kind: 'missed-mate' }
  if (motifs.includes('blew-winning-position')) return { kind: 'blew-winning' }
  if (motifs.includes('time-pressure')) return { kind: 'time-pressure' }
  // Fallback: if the played move actually left a piece statically hanging even without the tag.
  const hanging = hangingPieces(played.fenAfter, color)
  if (hanging.length > 0) {
    const square = hanging.includes(played.to) ? played.to : hanging[0]
    const threat = square ? cheapestCapturer(played.fenAfter, square, enemy) : null
    if (threat) return { kind: 'hanging-piece', threat }
  }
  return { kind: 'general' }
}
