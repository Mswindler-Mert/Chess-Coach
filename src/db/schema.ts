import { Dexie, type EntityTable } from 'dexie'
import type { GameAnalysis } from '../core/analysis/types'
import type { Game } from '../core/games/model'

export interface ArchiveRecord {
  username: string
  url: string
  /** ms since epoch of the last successful fetch */
  fetchedAt: number
  /** Number of raw games in the month (including skipped variants). */
  rawGameCount: number
}

export interface SettingRecord {
  key: string
  value: unknown
}

/** Engine analysis of one game. A game is analysed once and never again. */
export interface AnalysisRecord extends GameAnalysis {
  gameId: string
  username: string
  /** ms since epoch */
  analyzedAt: number
  engine: string
  depth: number
  /** Bumped when the analysis format changes, so old records can be told apart. */
  version: number
}

export class ChessCoachDb extends Dexie {
  declare games: EntityTable<Game, 'id'>
  declare archives: Dexie.Table<ArchiveRecord, [string, string]>
  declare settings: EntityTable<SettingRecord, 'key'>
  declare analyses: EntityTable<AnalysisRecord, 'gameId'>

  constructor(name = 'chess-coach') {
    super(name)
    this.version(1).stores({
      games: 'id, username, [username+endTime], [username+timeClass]',
      archives: '[username+url], username',
      settings: 'key',
    })
    this.version(2).stores({
      analyses: 'gameId, username',
    })
  }
}

export const db = new ChessCoachDb()
