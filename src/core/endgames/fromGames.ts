import { NOT_WINNING, WINNING } from '../analysis/motifs'
import { terminalEval } from '../analysis/analyzeGame'
import type { GameAnalysis } from '../analysis/types'
import type { Game } from '../games/model'
import { fenAt, type Replay } from '../games/replay'
import type { EndgameLesson } from './curriculum'

/** Moves allowed to convert a won endgame from the user's own games. */
export const OWN_ENDGAME_MOVES = 40

/** "Win this": a won endgame the user threw away, replayed against the engine. */
export interface OwnEndgame extends EndgameLesson {
  gameId: string
  /** The half-move (1-based) where the win was thrown away. */
  ply: number
  /** The move played in the game. */
  playedSan: string
  winBefore: number
  endTime: number
}

/**
 * Endgame positions where the user was winning (≥ 80 win%) and the move played dropped it to
 * 50 or less. The drill starts from the position before that move, goal "win".
 */
export function blownEndgames(game: Game, replay: Replay, analysis: GameAnalysis): OwnEndgame[] {
  if (analysis.moves.length !== replay.moves.length) return []
  const drills: OwnEndgame[] = []
  for (const move of analysis.moves) {
    if (move.color !== game.userColor || move.phase !== 'endgame') continue
    if (move.winBefore < WINNING || move.winAfter > NOT_WINNING) continue
    const fen = fenAt(replay, move.ply - 1)
    if (terminalEval(fen)) continue
    drills.push({
      id: `${game.id}:${move.ply}`,
      fen,
      color: move.color,
      goal: 'win',
      moveLimit: OWN_ENDGAME_MOVES,
      gameId: game.id,
      ply: move.ply,
      playedSan: move.san,
      winBefore: move.winBefore,
      endTime: game.endTime,
    })
  }
  return drills
}
