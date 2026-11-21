import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  mergeActivityLog,
  mergeEndgameProgress,
  newerRecords,
  type Backup,
} from '../core/backup/backup'
import { getActivityLog } from './daily'
import { getEndgameProgress } from './endgames'
import { db } from './schema'

/** Everything worth carrying to another device, as one object. */
export async function exportBackup(now: number): Promise<Backup> {
  const [analyses, puzzleProgress, endgameProgress, activityLog] = await Promise.all([
    db.analyses.toArray(),
    db.puzzleProgress.toArray(),
    getEndgameProgress(),
    getActivityLog(),
  ])
  const usernames = [...new Set(analyses.map((a) => a.username))].sort()
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now,
    usernames,
    analyses,
    puzzleProgress,
    endgameProgress,
    activityLog,
  }
}

export interface ImportResult {
  analyses: number
  puzzleProgress: number
  usernames: string[]
}

/**
 * Merges a checked backup into this device: newer analyses and puzzle progress replace older ones,
 * endgame progress and activity are combined. Nothing on this device is deleted.
 */
export async function importBackup(backup: Backup): Promise<ImportResult> {
  return db.transaction('rw', db.analyses, db.puzzleProgress, db.settings, async () => {
    const storedAnalyses = await db.analyses.bulkGet(backup.analyses.map((a) => a.gameId))
    const analysisMap = new Map(
      storedAnalyses.filter((a) => a !== undefined).map((a) => [a.gameId, a]),
    )
    const analyses = newerRecords(
      analysisMap,
      backup.analyses,
      (a) => a.gameId,
      (a) => a.analyzedAt,
    )
    await db.analyses.bulkPut(analyses)

    const storedProgress = await db.puzzleProgress.bulkGet(
      backup.puzzleProgress.map((p) => p.puzzleId),
    )
    const progressMap = new Map(
      storedProgress.filter((p) => p !== undefined).map((p) => [p.puzzleId, p]),
    )
    const progress = newerRecords(
      progressMap,
      backup.puzzleProgress,
      (p) => p.puzzleId,
      (p) => p.lastAttemptAt,
    )
    await db.puzzleProgress.bulkPut(progress)

    const [endgames, log] = await Promise.all([getEndgameProgress(), getActivityLog()])
    await db.settings.bulkPut([
      { key: 'endgameProgress', value: mergeEndgameProgress(endgames, backup.endgameProgress) },
      { key: 'activityLog', value: mergeActivityLog(log, backup.activityLog) },
    ])
    return {
      analyses: analyses.length,
      puzzleProgress: progress.length,
      usernames: backup.usernames,
    }
  })
}
