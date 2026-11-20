import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ArchivesResponse, MonthResponse, RawGame } from '../src/core/api/types'

function readFixture<T>(name: string): T {
  const path = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

/** Real Chess.com games of `mswindler07`, one per interesting case. */
export const fixtureGames: RawGame[] = readFixture<MonthResponse>('chesscom-games.json').games
export const fixtureArchives: string[] =
  readFixture<ArchivesResponse>('chesscom-archives.json').archives

export const OWNER = 'mswindler07'

export function fixtureGame(uuidPrefix: string): RawGame {
  const game = fixtureGames.find((g) => g.uuid.startsWith(uuidPrefix))
  if (!game) throw new Error(`No fixture game ${uuidPrefix}`)
  return game
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
