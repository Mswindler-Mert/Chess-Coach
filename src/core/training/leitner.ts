import type { Puzzle } from './puzzles'

/** Days until the next review for boxes 1–5. */
export const BOX_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const
export const MAX_BOX = BOX_INTERVALS_DAYS.length

const DAY_MS = 24 * 60 * 60 * 1000

export interface PuzzleProgress {
  puzzleId: string
  username: string
  /** Leitner box, 1–5. */
  box: number
  /** ms since epoch when the puzzle is due again. */
  dueAt: number
  attempts: number
  correct: number
  lastAttemptAt: number
  lastCorrect: boolean
}

export function intervalDays(box: number): number {
  const index = Math.min(Math.max(box, 1), MAX_BOX) - 1
  return BOX_INTERVALS_DAYS[index] ?? 1
}

/**
 * Progress after one attempt. Correct → next box (a new puzzle goes to box 1), wrong → box 1.
 * The puzzle is due again after the new box's interval.
 */
export function recordAttempt(
  previous: PuzzleProgress | undefined,
  ids: { puzzleId: string; username: string },
  correct: boolean,
  now: number,
): PuzzleProgress {
  const box = correct ? (previous ? Math.min(previous.box + 1, MAX_BOX) : 1) : 1
  return {
    ...ids,
    box,
    dueAt: now + intervalDays(box) * DAY_MS,
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
    lastAttemptAt: now,
    lastCorrect: correct,
  }
}

/** What the scheduler needs from a drill: puzzles, hanging-piece drills, … */
export interface Schedulable {
  id: string
  /** When the source game ended (ms); newer games come first among new items. */
  endTime: number
  ply: number
}

export interface PuzzleQueue<T extends Schedulable = Puzzle> {
  /** Items to show, in order: due reviews (most overdue first), then new ones (newest game first). */
  queue: T[]
  due: number
  fresh: number
  /** Seen puzzles not due yet. */
  waiting: number
}

export function planPuzzles<T extends Schedulable>(
  puzzles: readonly T[],
  progress: ReadonlyMap<string, PuzzleProgress>,
  now: number,
): PuzzleQueue<T> {
  const due: { puzzle: T; dueAt: number }[] = []
  const fresh: T[] = []
  let waiting = 0
  for (const puzzle of puzzles) {
    const p = progress.get(puzzle.id)
    if (!p) fresh.push(puzzle)
    else if (p.dueAt <= now) due.push({ puzzle, dueAt: p.dueAt })
    else waiting++
  }
  due.sort((a, b) => a.dueAt - b.dueAt)
  fresh.sort((a, b) => b.endTime - a.endTime || a.ply - b.ply)
  return {
    queue: [...due.map((d) => d.puzzle), ...fresh],
    due: due.length,
    fresh: fresh.length,
    waiting,
  }
}
