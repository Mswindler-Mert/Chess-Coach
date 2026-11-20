import { Dexie, type EntityTable } from 'dexie'
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

export class ChessCoachDb extends Dexie {
  declare games: EntityTable<Game, 'id'>
  declare archives: Dexie.Table<ArchiveRecord, [string, string]>
  declare settings: EntityTable<SettingRecord, 'key'>

  constructor(name = 'chess-coach') {
    super(name)
    this.version(1).stores({
      games: 'id, username, [username+endTime], [username+timeClass]',
      archives: '[username+url], username',
      settings: 'key',
    })
  }
}

export const db = new ChessCoachDb()
