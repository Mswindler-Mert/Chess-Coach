import { Chess, type Square } from 'chess.js'
import { hangingPieces } from '../analysis/hanging'
import type { GameAnalysis, MoveClass } from '../analysis/types'
import type { Color, Game } from '../games/model'
import { buildReplay, fenAt, type Replay } from '../games/replay'

export type HungPieceType = 'q' | 'r' | 'b' | 'n'

export type MoveRangeKey = '1-5' | '6-10' | '11-20' | '21+'

export type ReplyKey =
  | 'e4-e5'
  | 'e4-d5'
  | 'e4-c5'
  | 'e4-e6'
  | 'e4-c6'
  | 'e4-other'
  | 'vs-early-queen'
  | 'vs-e4'
  | 'vs-d4'

export interface HungPieceStat {
  piece: HungPieceType
  count: number
  share: number
}

export interface CollapseBucket {
  range: MoveRangeKey
  errors: number
  blunders: number
  share: number
}

export interface OpeningReplyStat {
  key: ReplyKey
  color: Color
  games: number
  wins: number
  draws: number
  losses: number
  winRate: number
  blundersPerGame: number
  guideId: string
  lineId: string
}

export interface PlayerDiagnosis {
  analyzedGames: number
  totalErrors: number
  totalHungPieces: number
  hungPieces: HungPieceStat[]
  worstPiece: HungPieceType | null
  collapseBuckets: CollapseBucket[]
  worstBucket: MoveRangeKey | null
  openingReplies: OpeningReplyStat[]
  nemesisReply: OpeningReplyStat | null
}

export interface DiagnosisEntry {
  game: Game
  analysis: GameAnalysis
  replay?: Replay
}

const SERIOUS: readonly MoveClass[] = ['mistake', 'blunder']
const MOVE_RANGES: readonly MoveRangeKey[] = ['1-5', '6-10', '11-20', '21+']
const PIECE_ORDER: readonly HungPieceType[] = ['q', 'r', 'b', 'n']

const REPLY_GUIDE_MAP: Record<ReplyKey, { color: Color; guideId: string; lineId: string }> = {
  'e4-e5': { color: 'white', guideId: 'italian', lineId: 'giuoco-piano' },
  'e4-d5': { color: 'white', guideId: 'e4-responses', lineId: 'scandinavian' },
  'e4-c5': { color: 'white', guideId: 'e4-responses', lineId: 'sicilian' },
  'e4-e6': { color: 'white', guideId: 'e4-responses', lineId: 'french' },
  'e4-c6': { color: 'white', guideId: 'e4-responses', lineId: 'caro-kann-white' },
  'e4-other': { color: 'white', guideId: 'e4-responses', lineId: 'scandinavian' },
  'vs-early-queen': { color: 'black', guideId: 'anti-traps', lineId: 'wayward-queen' },
  'vs-e4': { color: 'black', guideId: 'classical-e5', lineId: 'vs-italian' },
  'vs-d4': { color: 'black', guideId: 'qgd', lineId: 'main' },
}

export function moveRangeForPly(ply: number): MoveRangeKey {
  const moveNumber = Math.ceil(Math.max(1, ply) / 2)
  if (moveNumber <= 5) return '1-5'
  if (moveNumber <= 10) return '6-10'
  if (moveNumber <= 20) return '11-20'
  return '21+'
}

/** Classifies the opening reply the user faced in the first few plies. */
export function classifyOpeningReply(userColor: Color, replay: Replay): ReplyKey | null {
  const m1 = replay.moves[0]?.san
  const m2 = replay.moves[1]?.san
  const m3 = replay.moves[2]?.san
  const m5 = replay.moves[4]?.san
  if (!m1) return null

  if (userColor === 'white') {
    if (m1 !== 'e4' || !m2) return null
    if (m2 === 'e5') return 'e4-e5'
    if (m2 === 'd5') return 'e4-d5'
    if (m2 === 'c5') return 'e4-c5'
    if (m2 === 'e6') return 'e4-e6'
    if (m2 === 'c6') return 'e4-c6'
    return 'e4-other'
  }

  if (m1 === 'e4') {
    if (m3 === 'Qh5' || m3 === 'Qf3' || m5 === 'Qh5' || m5 === 'Qf3') {
      return 'vs-early-queen'
    }
    return 'vs-e4'
  }
  if (m1 === 'd4') return 'vs-d4'
  return null
}

function isHungPieceType(type: string): type is HungPieceType {
  return type === 'q' || type === 'r' || type === 'b' || type === 'n'
}

/**
 * Computes a concrete personal chess diagnosis across the user's analysed games:
 * 1) Which pieces they hang most often,
 * 2) Which move range they collapse in,
 * 3) Which opponent opening replies cause the most losses/blunders.
 */
export function diagnosePlayer(entries: readonly DiagnosisEntry[]): PlayerDiagnosis {
  const pieceCounts: Record<HungPieceType, number> = { q: 0, r: 0, b: 0, n: 0 }
  const bucketErrors: Record<MoveRangeKey, number> = { '1-5': 0, '6-10': 0, '11-20': 0, '21+': 0 }
  const bucketBlunders: Record<MoveRangeKey, number> = { '1-5': 0, '6-10': 0, '11-20': 0, '21+': 0 }
  const replyAcc = new Map<
    ReplyKey,
    { games: number; wins: number; draws: number; losses: number; blunders: number }
  >()

  let totalErrors = 0
  let totalHungPieces = 0

  for (const entry of entries) {
    const { game, analysis } = entry
    let replay = entry.replay
    if (!replay && game.pgn) {
      try {
        replay = buildReplay(game.pgn)
      } catch {
        replay = undefined
      }
    }

    let gameBlunders = 0
    for (const move of analysis.moves) {
      if (move.color !== game.userColor || !SERIOUS.includes(move.moveClass)) continue
      totalErrors++
      const range = moveRangeForPly(move.ply)
      bucketErrors[range]++
      if (move.moveClass === 'blunder') {
        bucketBlunders[range]++
        gameBlunders++
      }

      if (replay && move.ply >= 1 && move.ply <= replay.moves.length) {
        const fenBefore = fenAt(replay, move.ply - 1)
        const fenAfter = fenAt(replay, move.ply)
        const beforeSet = new Set(hangingPieces(fenBefore, game.userColor))
        const afterHung = hangingPieces(fenAfter, game.userColor)
        const movedTo = replay.moves[move.ply - 1]?.to

        // Count pieces newly left hanging after this mistake/blunder (or the piece just moved into a trap).
        const newlyHung = afterHung.filter((sq) => !beforeSet.has(sq) || sq === movedTo)
        if (newlyHung.length > 0) {
          try {
            const board = new Chess(fenAfter)
            for (const sq of newlyHung) {
              const p = board.get(sq as Square)
              if (p && isHungPieceType(p.type)) {
                pieceCounts[p.type]++
                totalHungPieces++
              }
            }
          } catch {
            // Ignore malformed FEN.
          }
        }
      }
    }

    if (replay) {
      const replyKey = classifyOpeningReply(game.userColor, replay)
      if (replyKey) {
        const cur = replyAcc.get(replyKey) ?? {
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          blunders: 0,
        }
        cur.games++
        if (game.outcome === 'win') cur.wins++
        else if (game.outcome === 'draw') cur.draws++
        else cur.losses++
        cur.blunders += gameBlunders
        replyAcc.set(replyKey, cur)
      }
    }
  }

  const hungPieces: HungPieceStat[] = PIECE_ORDER.map((piece) => ({
    piece,
    count: pieceCounts[piece],
    share: totalHungPieces > 0 ? pieceCounts[piece] / totalHungPieces : 0,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)

  const collapseBuckets: CollapseBucket[] = MOVE_RANGES.map((range) => ({
    range,
    errors: bucketErrors[range],
    blunders: bucketBlunders[range],
    share: totalErrors > 0 ? bucketErrors[range] / totalErrors : 0,
  }))

  let worstBucket: MoveRangeKey | null = null
  let maxBucketErrors = 0
  for (const b of collapseBuckets) {
    if (b.errors > maxBucketErrors) {
      maxBucketErrors = b.errors
      worstBucket = b.range
    }
  }

  const openingReplies: OpeningReplyStat[] = [...replyAcc.entries()]
    .map(([key, acc]) => {
      const meta = REPLY_GUIDE_MAP[key]
      return {
        key,
        color: meta.color,
        games: acc.games,
        wins: acc.wins,
        draws: acc.draws,
        losses: acc.losses,
        winRate: acc.games > 0 ? acc.wins / acc.games : 0,
        blundersPerGame: acc.games > 0 ? acc.blunders / acc.games : 0,
        guideId: meta.guideId,
        lineId: meta.lineId,
      }
    })
    .sort((a, b) => {
      // Prioritize replies where the user struggles most (lower win rate, higher blunders/game).
      const painA = (1 - a.winRate) * 2 + a.blundersPerGame
      const painB = (1 - b.winRate) * 2 + b.blundersPerGame
      return painB - painA || b.games - a.games
    })

  // Prefer a nemesis reply with at least 2 games if any exists, otherwise the top painful reply.
  const multiGame = openingReplies.filter((r) => r.games >= 2)
  const nemesisReply = multiGame[0] ?? openingReplies[0] ?? null

  return {
    analyzedGames: entries.length,
    totalErrors,
    totalHungPieces,
    hungPieces,
    worstPiece: hungPieces[0]?.piece ?? null,
    collapseBuckets,
    worstBucket,
    openingReplies,
    nemesisReply,
  }
}
