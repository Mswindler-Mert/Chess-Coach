import { describe, expect, it } from 'vitest'
import { intervalDays, planPuzzles, recordAttempt, type PuzzleProgress } from './leitner'
import type { Puzzle } from './puzzles'

const NOW = Date.UTC(2026, 10, 21, 12)
const DAY = 86_400_000
const ids = { puzzleId: 'g:5', username: 'u' }

describe('intervalDays', () => {
  it('uses 1, 3, 7, 14 and 30 days for boxes 1–5', () => {
    expect([1, 2, 3, 4, 5].map(intervalDays)).toEqual([1, 3, 7, 14, 30])
  })
})

describe('recordAttempt', () => {
  it('puts a new puzzle solved correctly into box 1, due tomorrow', () => {
    const p = recordAttempt(undefined, ids, true, NOW)
    expect(p).toEqual({
      ...ids,
      box: 1,
      dueAt: NOW + DAY,
      attempts: 1,
      correct: 1,
      lastAttemptAt: NOW,
      lastCorrect: true,
    })
  })

  it('moves up one box per correct answer, up to box 5', () => {
    let p: PuzzleProgress | undefined
    const boxes: number[] = []
    for (let i = 0; i < 7; i++) {
      p = recordAttempt(p, ids, true, NOW)
      boxes.push(p.box)
    }
    expect(boxes).toEqual([1, 2, 3, 4, 5, 5, 5])
    expect(p?.dueAt).toBe(NOW + 30 * DAY)
    expect(p?.correct).toBe(7)
  })

  it('sends a wrong answer back to box 1', () => {
    const inBox4 = { ...recordAttempt(undefined, ids, true, NOW), box: 4, attempts: 5, correct: 4 }
    const p = recordAttempt(inBox4, ids, false, NOW)
    expect(p).toMatchObject({
      box: 1,
      dueAt: NOW + DAY,
      attempts: 6,
      correct: 4,
      lastCorrect: false,
    })
  })
})

describe('planPuzzles', () => {
  const puzzle = (id: string, endTime: number, ply = 1) => ({ id, endTime, ply }) as Puzzle
  const progress = (puzzleId: string, dueAt: number): PuzzleProgress => ({
    ...recordAttempt(undefined, { puzzleId, username: 'u' }, true, 0),
    dueAt,
  })

  it('shows due reviews first (most overdue first), then new puzzles (newest game first)', () => {
    const puzzles = [
      puzzle('new-old', 1),
      puzzle('due-late', 2),
      puzzle('waiting', 3),
      puzzle('new-recent', 9, 7),
      puzzle('new-recent-early', 9, 3),
      puzzle('due-early', 4),
    ]
    const map = new Map([
      ['due-late', progress('due-late', NOW - DAY)],
      ['due-early', progress('due-early', NOW - 5 * DAY)],
      ['waiting', progress('waiting', NOW + DAY)],
    ])
    const plan = planPuzzles(puzzles, map, NOW)
    expect(plan.queue.map((p) => p.id)).toEqual([
      'due-early',
      'due-late',
      'new-recent-early',
      'new-recent',
      'new-old',
    ])
    expect(plan).toMatchObject({ due: 2, fresh: 3, waiting: 1 })
  })

  it('counts a puzzle due exactly now as due', () => {
    const plan = planPuzzles([puzzle('a', 1)], new Map([['a', progress('a', NOW)]]), NOW)
    expect(plan.due).toBe(1)
  })
})
