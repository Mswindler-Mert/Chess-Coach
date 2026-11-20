import type { ClassCounts } from '../core/analysis/types'
import type { Color } from '../core/games/model'
import { db, type AnalysisRecord } from './schema'

export const ANALYSIS_VERSION = 1
export const ENGINE_NAME = 'stockfish-19-lite'

export const DEPTH_OPTIONS = [10, 12, 14, 16] as const
export const DEFAULT_DEPTH = 12

export type AnalysisSummary = Record<Color, ClassCounts>

export function getAnalysis(gameId: string): Promise<AnalysisRecord | undefined> {
  return db.analyses.get(gameId)
}

export async function saveAnalysis(record: AnalysisRecord): Promise<void> {
  await db.analyses.put(record)
}

export async function analyzedGameIds(username: string): Promise<Set<string>> {
  const keys = await db.analyses.where('username').equals(username).primaryKeys()
  return new Set(keys)
}

/** Per-game error counts for the game list. */
export async function listAnalysisSummaries(
  username: string,
): Promise<Map<string, AnalysisSummary>> {
  const summaries = new Map<string, AnalysisSummary>()
  await db.analyses
    .where('username')
    .equals(username)
    .each((record) => summaries.set(record.gameId, record.summary))
  return summaries
}

// --- settings ---

const DEPTH_KEY = 'analysisDepth'

export async function getAnalysisDepth(): Promise<number> {
  const record = await db.settings.get(DEPTH_KEY)
  const value = record?.value
  return typeof value === 'number' && (DEPTH_OPTIONS as readonly number[]).includes(value)
    ? value
    : DEFAULT_DEPTH
}

export async function setAnalysisDepth(depth: number): Promise<void> {
  await db.settings.put({ key: DEPTH_KEY, value: depth })
}
