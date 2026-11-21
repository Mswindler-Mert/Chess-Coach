import { Chess, type PieceSymbol } from 'chess.js'

export interface MoveDetails {
  piece: PieceSymbol
  from: string
  to: string
  captured: PieceSymbol | null
  promotion: PieceSymbol | null
  castling: 'kingside' | 'queenside' | null
  check: boolean
  checkmate: boolean
  san: string
  uci: string
  fenAfter: string
}

export interface LineStep {
  fenBefore: string
  fenAfter: string
  move: MoveDetails
}

const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/

/**
 * Simulates a single move (UCI like "g1f3" or SAN like "Nf3" / "O-O") on `fen` and returns
 * structured details so the UI can explain it in plain language.
 */
export function describeMove(fen: string, moveInput: string): MoveDetails | null {
  try {
    const chess = new Chess(fen)
    const move = UCI_PATTERN.test(moveInput)
      ? chess.move({
          from: moveInput.slice(0, 2),
          to: moveInput.slice(2, 4),
          promotion: moveInput.length > 4 ? moveInput.slice(4, 5) : undefined,
        })
      : chess.move(moveInput)
    const castling: MoveDetails['castling'] = move.isKingsideCastle()
      ? 'kingside'
      : move.isQueensideCastle()
        ? 'queenside'
        : null
    return {
      piece: move.piece,
      from: move.from,
      to: move.to,
      captured: move.captured ?? null,
      promotion: move.promotion ?? null,
      castling,
      check: chess.inCheck(),
      checkmate: chess.isCheckmate(),
      san: move.san,
      uci: move.lan,
      fenAfter: chess.fen(),
    }
  } catch {
    return null
  }
}

/**
 * Expands a UCI line (e.g. a refutation PV) into step-by-step board states and move details,
 * stopping at the first illegal move.
 */
export function buildLineSteps(
  startFen: string,
  ucis: readonly string[],
  maxPlies = ucis.length,
): LineStep[] {
  const steps: LineStep[] = []
  let fen = startFen
  for (const uci of ucis.slice(0, maxPlies)) {
    const move = describeMove(fen, uci)
    if (!move) break
    steps.push({ fenBefore: fen, fenAfter: move.fenAfter, move })
    fen = move.fenAfter
  }
  return steps
}
