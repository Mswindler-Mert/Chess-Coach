import { uciToSan } from '../analysis/display'
import { hangingPieces } from '../analysis/hanging'
import type { Motif } from '../analysis/motifs'
import type { GameAnalysis } from '../analysis/types'
import type { Color, Game } from '../games/model'
import { fenAt, type Replay } from '../games/replay'

/**
 * - `own`: right after one of your moves — which of your pieces now hang?
 * - `free`: before one of your moves — which enemy piece could you take for free?
 */
export type DrillKind = 'own' | 'free'

/** "Tap the hanging pieces": a real moment from the user's games. */
export interface HangingDrill {
  /** `hang:${kind}:${gameId}:${ply}` – stable, shares the puzzle progress table. */
  id: string
  kind: DrillKind
  gameId: string
  /** The user's half-move (1-based) this drill is about. */
  ply: number
  /** The position shown. */
  fen: string
  /** The user's colour: the board is shown from this side. */
  color: Color
  /** Squares to tap: hanging user pieces (`own`) or free enemy pieces (`free`). */
  answer: string[]
  /** The move the user played in the game. */
  playedSan: string
  /** The engine's move in the position before the user's move. */
  bestSan: string | null
  endTime: number
}

/**
 * Drills from one analysed game: every user move tagged `hanging-piece` (after it) or
 * `missed-free-piece` (before it) where pieces really hang in the static sense. Moments where the
 * material is lost to a deeper tactic only are left to the puzzles.
 */
export function generateHangingDrills(
  game: Game,
  replay: Replay,
  analysis: GameAnalysis,
  motifs: readonly Motif[][],
): HangingDrill[] {
  if (analysis.moves.length !== replay.moves.length) return []
  const enemy: Color = game.userColor === 'white' ? 'black' : 'white'
  const drills: HangingDrill[] = []
  analysis.moves.forEach((move, index) => {
    if (move.color !== game.userColor) return
    const tags = motifs[index] ?? []
    const fenBefore = fenAt(replay, index)
    const best = analysis.positions[index]?.bestMove
    const base = {
      gameId: game.id,
      ply: move.ply,
      color: game.userColor,
      playedSan: move.san,
      bestSan: best ? uciToSan(fenBefore, best) : null,
      endTime: game.endTime,
    }
    if (tags.includes('hanging-piece')) {
      const fen = fenAt(replay, move.ply)
      const answer = hangingPieces(fen, game.userColor)
      if (answer.length > 0) {
        drills.push({ ...base, id: `hang:own:${game.id}:${move.ply}`, kind: 'own', fen, answer })
      }
    }
    if (tags.includes('missed-free-piece')) {
      const answer = hangingPieces(fenBefore, enemy)
      if (answer.length > 0) {
        drills.push({
          ...base,
          id: `hang:free:${game.id}:${move.ply}`,
          kind: 'free',
          fen: fenBefore,
          answer,
        })
      }
    }
  })
  return drills
}

export interface SquareCheck {
  correct: boolean
  /** Answer squares the user tapped, answer squares missed, and taps that were not answers. */
  found: string[]
  missed: string[]
  wrong: string[]
}

/** Correct when every answer square is tapped and nothing else. */
export function checkSquares(selected: readonly string[], answer: readonly string[]): SquareCheck {
  const picked = new Set(selected)
  const wanted = new Set(answer)
  const found = answer.filter((s) => picked.has(s))
  const missed = answer.filter((s) => !picked.has(s))
  const wrong = [...picked].filter((s) => !wanted.has(s))
  return { correct: missed.length === 0 && wrong.length === 0, found, missed, wrong }
}
