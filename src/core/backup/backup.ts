import type { GameAnalysis } from '../analysis/types'
import type { ActivityLog } from '../training/daily'
import type { PuzzleProgress } from '../training/leitner'

export const BACKUP_FORMAT = 'chess-coach-backup'
export const BACKUP_VERSION = 1

/** One stored analysis, as in the database. */
export interface BackupAnalysis extends GameAnalysis {
  gameId: string
  username: string
  analyzedAt: number
  engine: string
  depth: number
  version: number
}

export interface EndgameProgress {
  attempts: number
  solved: boolean
  /** Fewest user moves in a successful attempt. */
  bestMoves: number | null
}

/**
 * Everything that is expensive to rebuild: analyses and training progress. Games are left out
 * (they are fetched again from Chess.com), and so are device preferences (filters, depth, language).
 */
export interface Backup {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: number
  /** Users whose data is inside, so the importing device knows whose games to fetch. */
  usernames: string[]
  analyses: BackupAnalysis[]
  puzzleProgress: PuzzleProgress[]
  endgameProgress: Record<string, EndgameProgress>
  activityLog: ActivityLog
}

export type BackupCheck =
  { ok: true; backup: Backup } | { ok: false; error: 'not-json' | 'format' | 'version' | 'shape' }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function isAnalysis(v: unknown): v is BackupAnalysis {
  return (
    isObject(v) &&
    typeof v.gameId === 'string' &&
    typeof v.username === 'string' &&
    typeof v.analyzedAt === 'number' &&
    Array.isArray(v.positions) &&
    Array.isArray(v.moves) &&
    v.positions.length === v.moves.length + 1 &&
    isObject(v.summary)
  )
}

function isProgress(v: unknown): v is PuzzleProgress {
  return (
    isObject(v) &&
    typeof v.puzzleId === 'string' &&
    typeof v.username === 'string' &&
    typeof v.box === 'number' &&
    typeof v.dueAt === 'number' &&
    typeof v.lastAttemptAt === 'number'
  )
}

/** Parses and checks a backup file's text. Nothing is trusted until this passes. */
export function readBackup(text: string): BackupCheck {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'not-json' }
  }
  if (!isObject(data) || data.format !== BACKUP_FORMAT) return { ok: false, error: 'format' }
  if (data.version !== BACKUP_VERSION) return { ok: false, error: 'version' }
  const { analyses, puzzleProgress, endgameProgress, activityLog, usernames } = data
  if (
    !Array.isArray(analyses) ||
    !analyses.every(isAnalysis) ||
    !Array.isArray(puzzleProgress) ||
    !puzzleProgress.every(isProgress) ||
    !isObject(endgameProgress) ||
    !isObject(activityLog) ||
    !Object.values(activityLog).every((n) => typeof n === 'number') ||
    !Array.isArray(usernames) ||
    !usernames.every((u) => typeof u === 'string')
  ) {
    return { ok: false, error: 'shape' }
  }
  return { ok: true, backup: data as unknown as Backup }
}

/** Incoming records that are new or newer than what is stored (by `stamp`). */
export function newerRecords<T>(
  existing: ReadonlyMap<string, T>,
  incoming: readonly T[],
  key: (record: T) => string,
  stamp: (record: T) => number,
): T[] {
  return incoming.filter((record) => {
    const current = existing.get(key(record))
    return !current || stamp(record) > stamp(current)
  })
}

/** Endgame progress from two devices: more attempts, solved on either, fewest moves. */
export function mergeEndgameProgress(
  a: Record<string, EndgameProgress>,
  b: Record<string, EndgameProgress>,
): Record<string, EndgameProgress> {
  const merged: Record<string, EndgameProgress> = { ...a }
  for (const [id, p] of Object.entries(b)) {
    const q = merged[id]
    if (!q) {
      merged[id] = p
      continue
    }
    const moves = [p.bestMoves, q.bestMoves].filter((m): m is number => m !== null)
    merged[id] = {
      attempts: Math.max(p.attempts, q.attempts),
      solved: p.solved || q.solved,
      bestMoves: moves.length ? Math.min(...moves) : null,
    }
  }
  return merged
}

/** Activity from two devices: the larger count per day (the same exercise is not counted twice). */
export function mergeActivityLog(a: ActivityLog, b: ActivityLog): ActivityLog {
  const merged: ActivityLog = { ...a }
  for (const [day, n] of Object.entries(b)) merged[day] = Math.max(merged[day] ?? 0, n)
  return merged
}
