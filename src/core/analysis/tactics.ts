import { Chess, type Square } from 'chess.js'

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

/**
 * Pieces forked by the piece standing on `square` in `fen`: enemy pieces it attacks that are
 * worth taking — the king, anything more valuable than the attacker, or an undefended piece
 * worth at least a minor piece. Two or more of them make a fork.
 */
export function forkTargets(fen: string, square: string): string[] {
  let chess: Chess
  try {
    chess = new Chess(fen)
  } catch {
    return []
  }
  const attacker = chess.get(square as Square)
  if (!attacker) return []
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

/** True when playing `uci` in `fen` puts a piece where it forks two or more targets. */
export function isForkingMove(fen: string, uci: string): boolean {
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    })
    return forkTargets(chess.fen(), move.to).length >= 2
  } catch {
    return false
  }
}
