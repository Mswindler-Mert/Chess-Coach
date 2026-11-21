import { Chess, type Square } from 'chess.js'

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

const DIAGONALS: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]
const STRAIGHTS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

function load(fen: string): Chess | null {
  try {
    return new Chess(fen)
  } catch {
    return null
  }
}

/**
 * Pieces forked by the piece standing on `square` in `fen`: enemy pieces it attacks that are
 * worth taking — the king, anything more valuable than the attacker, or an undefended piece
 * worth at least a minor piece. Two or more of them make a fork.
 */
export function forkTargets(fen: string, square: string): string[] {
  const chess = load(fen)
  const attacker = chess?.get(square as Square)
  if (!chess || !attacker) return []
  const enemy = attacker.color === 'w' ? 'b' : 'w'
  const attackerValue = VALUES[attacker.type] ?? 0
  const targets: string[] = []
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy) continue
      const value = VALUES[cell.type] ?? 0
      if (cell.type !== 'k' && value < 3) continue // pawns are not fork targets
      if (!chess.attackers(cell.square, attacker.color).includes(square as Square)) continue
      const defended = chess.isAttacked(cell.square, enemy)
      if (cell.type === 'k' || value > attackerValue || !defended) targets.push(cell.square)
    }
  }
  return targets
}

export interface LineTactic {
  kind: 'pin' | 'skewer'
  /** The attacked piece in front, and the piece behind it on the same line. */
  front: string
  back: string
}

/**
 * Pins and skewers made by the bishop, rook or queen on `square` in `fen`. Along each of its
 * lines, the first enemy piece is the front and the next enemy piece (with nothing in between)
 * the back:
 * - pin: the back piece (often the king) is worth more than the front one, which is at least a
 *   minor piece — moving the front piece would lose the back one.
 * - skewer: the front piece is the king or worth more than the back one, which is at least a
 *   minor piece — when the front piece steps aside, the back one falls.
 */
export function lineTactics(fen: string, square: string): LineTactic[] {
  const chess = load(fen)
  const piece = chess?.get(square as Square)
  if (!chess || !piece || !'brq'.includes(piece.type)) return []
  const directions = [
    ...(piece.type !== 'r' ? DIAGONALS : []),
    ...(piece.type !== 'b' ? STRAIGHTS : []),
  ]
  const file0 = square.charCodeAt(0) - 97
  const rank0 = Number(square[1])
  const found: LineTactic[] = []
  for (const [df, dr] of directions) {
    const hits: { square: string; type: string; color: string }[] = []
    for (
      let f = file0 + df, r = rank0 + dr;
      f >= 0 && f < 8 && r >= 1 && r <= 8;
      f += df, r += dr
    ) {
      const sq = `${String.fromCharCode(97 + f)}${r}`
      const cell = chess.get(sq as Square)
      if (!cell) continue
      hits.push({ square: sq, type: cell.type, color: cell.color })
      if (hits.length === 2) break
    }
    const [front, back] = hits
    if (!front || !back || front.color === piece.color || back.color === piece.color) continue
    const fv = VALUES[front.type] ?? 0
    const bv = VALUES[back.type] ?? 0
    if (front.type !== 'k' && fv >= 3 && bv > fv) {
      found.push({ kind: 'pin', front: front.square, back: back.square })
    } else if ((front.type === 'k' || fv > bv) && bv >= 3 && back.type !== 'k') {
      found.push({ kind: 'skewer', front: front.square, back: back.square })
    }
  }
  return found
}

export interface MoveTactics {
  fork: boolean
  pin: boolean
  skewer: boolean
}

const NONE: MoveTactics = { fork: false, pin: false, skewer: false }

/** The tactics created by the piece that plays `uci` in `fen`. */
export function moveTactics(fen: string, uci: string): MoveTactics {
  const chess = load(fen)
  if (!chess) return NONE
  try {
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    })
    const after = chess.fen()
    const lines = lineTactics(after, move.to)
    return {
      fork: forkTargets(after, move.to).length >= 2,
      pin: lines.some((l) => l.kind === 'pin'),
      skewer: lines.some((l) => l.kind === 'skewer'),
    }
  } catch {
    return NONE
  }
}

/** True when playing `uci` in `fen` puts a piece where it forks two or more targets. */
export function isForkingMove(fen: string, uci: string): boolean {
  return moveTactics(fen, uci).fork
}
