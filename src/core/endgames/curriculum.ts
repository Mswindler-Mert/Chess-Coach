import type { Color } from '../games/model'

export type EndgameGoal = 'mate' | 'win' | 'draw'

export interface EndgameLesson {
  /** Stable id, also the i18n key suffix (`endgame.lesson.<id>`). */
  id: string
  fen: string
  /** The side the user plays; the engine plays the other one. */
  color: Color
  goal: EndgameGoal
  /** The user's moves allowed to reach the goal (for `draw`: moves to survive). */
  moveLimit: number
}

/**
 * The basic curriculum. Every position was checked with Stockfish 19 lite (depth 20–22):
 * the mates are forced, "win" positions evaluate around +5 or better, "draw" positions at 0.0.
 */
export const CURRICULUM: readonly EndgameLesson[] = [
  {
    id: 'queen-mate',
    fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1',
    color: 'white',
    goal: 'mate',
    moveLimit: 15,
  },
  {
    id: 'two-rooks-mate',
    fen: '8/8/8/4k3/8/8/8/R3K2R w - - 0 1',
    color: 'white',
    goal: 'mate',
    moveLimit: 15,
  },
  {
    id: 'rook-mate',
    fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1',
    color: 'white',
    goal: 'mate',
    moveLimit: 30,
  },
  {
    // White to move wins only by gaining the opposition with the spare pawn tempo (d2-d3).
    id: 'opposition',
    fen: '8/8/3k4/8/3K4/8/3P4/8 w - - 0 1',
    color: 'white',
    goal: 'win',
    moveLimit: 30,
  },
  {
    // Black's king is inside the square of the h-pawn once it steps towards it.
    id: 'square-rule',
    fen: '8/8/8/2k5/7P/8/8/K7 b - - 0 1',
    color: 'black',
    goal: 'draw',
    moveLimit: 15,
  },
  {
    id: 'lucena',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    color: 'white',
    goal: 'win',
    moveLimit: 40,
  },
  {
    // Rook on the 6th rank until the pawn advances, then checks from behind.
    id: 'philidor',
    fen: '4k3/7R/r7/3PK3/8/8/8/8 b - - 0 1',
    color: 'black',
    goal: 'draw',
    moveLimit: 30,
  },
]
