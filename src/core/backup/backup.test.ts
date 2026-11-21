import { describe, expect, it } from 'vitest'
import type { PuzzleProgress } from '../training/leitner'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  mergeActivityLog,
  mergeEndgameProgress,
  newerRecords,
  readBackup,
  type Backup,
} from './backup'

const analysis = {
  gameId: 'g1',
  username: 'u',
  analyzedAt: 10,
  engine: 'stockfish-19-lite',
  depth: 12,
  version: 1,
  positions: [
    { score: { type: 'cp', value: 0 }, bestMove: 'e2e4', pv: ['e2e4'], depth: 12 },
    { score: { type: 'cp', value: 0 }, bestMove: null, pv: [], depth: 12 },
  ],
  moves: [
    {
      ply: 1,
      color: 'white',
      uci: 'e2e4',
      san: 'e4',
      winBefore: 50,
      winAfter: 50,
      loss: 0,
      moveClass: 'best',
      phase: 'opening',
    },
  ],
  summary: {
    white: { inaccuracy: 0, mistake: 0, blunder: 0 },
    black: { inaccuracy: 0, mistake: 0, blunder: 0 },
  },
} satisfies Backup['analyses'][number]

const progress = (puzzleId: string, lastAttemptAt: number): PuzzleProgress => ({
  puzzleId,
  username: 'u',
  box: 2,
  dueAt: lastAttemptAt + 1,
  attempts: 2,
  correct: 1,
  lastAttemptAt,
  lastCorrect: true,
})

const backup: Backup = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: 100,
  usernames: ['u'],
  analyses: [analysis],
  puzzleProgress: [progress('g1:5', 50)],
  endgameProgress: { lucena: { attempts: 3, solved: true, bestMoves: 12 } },
  activityLog: { '2026-11-22': 4 },
}

describe('readBackup', () => {
  it('accepts a valid backup', () => {
    const result = readBackup(JSON.stringify(backup))
    expect(result).toEqual({ ok: true, backup })
  })

  it('rejects files that are not backups', () => {
    expect(readBackup('not json')).toEqual({ ok: false, error: 'not-json' })
    expect(readBackup('{"format":"something-else"}')).toEqual({ ok: false, error: 'format' })
    expect(readBackup(JSON.stringify({ ...backup, version: 99 }))).toEqual({
      ok: false,
      error: 'version',
    })
  })

  it('rejects broken records', () => {
    const broken = { ...backup, analyses: [{ ...analysis, positions: [] }] }
    expect(readBackup(JSON.stringify(broken))).toEqual({ ok: false, error: 'shape' })
    const badLog = { ...backup, activityLog: { '2026-11-22': 'many' } }
    expect(readBackup(JSON.stringify(badLog))).toEqual({ ok: false, error: 'shape' })
  })
})

describe('newerRecords', () => {
  it('keeps incoming records that are new or newer', () => {
    const existing = new Map([
      ['a', progress('a', 10)],
      ['b', progress('b', 30)],
    ])
    const incoming = [progress('a', 20), progress('b', 30), progress('c', 5)]
    const result = newerRecords(
      existing,
      incoming,
      (p) => p.puzzleId,
      (p) => p.lastAttemptAt,
    )
    expect(result.map((p) => p.puzzleId)).toEqual(['a', 'c'])
  })
})

describe('mergeEndgameProgress', () => {
  it('takes the best of both devices', () => {
    const merged = mergeEndgameProgress(
      {
        lucena: { attempts: 3, solved: false, bestMoves: null },
        philidor: { attempts: 1, solved: true, bestMoves: 20 },
      },
      {
        lucena: { attempts: 1, solved: true, bestMoves: 15 },
        'rook-mate': { attempts: 2, solved: false, bestMoves: null },
      },
    )
    expect(merged).toEqual({
      lucena: { attempts: 3, solved: true, bestMoves: 15 },
      philidor: { attempts: 1, solved: true, bestMoves: 20 },
      'rook-mate': { attempts: 2, solved: false, bestMoves: null },
    })
  })
})

describe('mergeActivityLog', () => {
  it('keeps the larger count per day', () => {
    expect(
      mergeActivityLog({ '2026-11-21': 3, '2026-11-22': 1 }, { '2026-11-22': 5, '2026-11-20': 2 }),
    ).toEqual({
      '2026-11-20': 2,
      '2026-11-21': 3,
      '2026-11-22': 5,
    })
  })
})
