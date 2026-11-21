import { describe, expect, it } from 'vitest'
import { fixtureGame, fixtureGames, OWNER } from '../../../tests/helpers'
import { analyzeGame, type Evaluator } from '../analysis/analyzeGame'
import { normalizeGame, type Game } from '../games/model'
import { buildReplay } from '../games/replay'
import {
  blunderTrend,
  bucketFor,
  bucketStart,
  mainTimeClass,
  ratingHistory,
  summarize,
  userErrors,
  weeklyFocus,
  type GameErrors,
} from './dashboard'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 21, 12) // Saturday

function entry(over: Partial<GameErrors> & { endTime: number }): GameErrors {
  return {
    gameId: String(over.endTime),
    color: 'white',
    counts: { inaccuracy: 0, mistake: 0, blunder: 0 },
    byPhase: { opening: 0, middlegame: 0, endgame: 0 },
    byMotif: {},
    accuracy: null,
    ...over,
  }
}

describe('userErrors', () => {
  it('counts only the user’s mistakes and blunders, by phase', async () => {
    // ce051fa6: the user is White. Make 3. d3 (ply 5, White) a blunder and 3… Nc6 (Black) one too.
    const raw = fixtureGame('ce051fa6')
    const game = normalizeGame(raw, OWNER) as Game
    const replay = buildReplay(raw.pgn)
    const evaluate: Evaluator = async ({ moves }) => ({
      score: { type: 'cp', value: moves.length === 5 ? 500 : moves.length === 6 ? 900 : 0 },
      bestMove:
        moves.length === 4 || moves.length === 5
          ? 'a1a1'
          : (replay.moves[moves.length]?.uci ?? null),
      pv: [],
      depth: 12,
    })
    const analysis = await analyzeGame(replay, evaluate)
    const errors = userErrors(game, analysis)
    expect(errors.color).toBe('white')
    expect(errors.counts.blunder).toBe(1)
    expect(errors.byPhase).toEqual({ opening: 1, middlegame: 0, endgame: 0 })
    expect(errors.accuracy).toBeGreaterThan(0)
    expect(errors.accuracy).toBeLessThan(100)
  })
})

describe('summarize', () => {
  const entries = [
    entry({
      endTime: 1,
      counts: { inaccuracy: 2, mistake: 1, blunder: 2 },
      byPhase: { opening: 1, middlegame: 2, endgame: 0 },
    }),
    entry({
      endTime: 2,
      color: 'black',
      counts: { inaccuracy: 0, mistake: 1, blunder: 0 },
      byPhase: { opening: 0, middlegame: 0, endgame: 1 },
    }),
  ]

  it('averages errors per game', () => {
    const s = summarize(entries)
    expect(s).toMatchObject({ games: 2, blunders: 1, mistakes: 1, inaccuracies: 1 })
  })

  it('splits serious errors by phase with shares', () => {
    const s = summarize(entries)
    expect(s.byPhase.middlegame).toEqual({ errors: 2, share: 0.5 })
    expect(s.byPhase.opening.share).toBe(0.25)
  })

  it('compares colours', () => {
    expect(summarize(entries).byColor).toEqual({
      white: { games: 1, errorsPerGame: 3 },
      black: { games: 1, errorsPerGame: 1 },
    })
  })

  it('ranks motifs by frequency', () => {
    const s = summarize([
      entry({ endTime: 1, byMotif: { 'hanging-piece': 3, 'time-pressure': 1 } }),
      entry({ endTime: 2, byMotif: { 'time-pressure': 1, 'missed-mate': 1 } }),
    ])
    expect(s.byMotif).toEqual([
      { motif: 'hanging-piece', errors: 3 },
      { motif: 'time-pressure', errors: 2 },
      { motif: 'missed-mate', errors: 1 },
    ])
  })

  it('averages accuracy over games that have one', () => {
    const s = summarize([
      entry({ endTime: 1, accuracy: 90 }),
      entry({ endTime: 2, accuracy: 70 }),
      entry({ endTime: 3, accuracy: null }),
    ])
    expect(s.accuracy).toBe(80)
    expect(summarize([entry({ endTime: 1 })]).accuracy).toBeNull()
  })

  it('handles no games', () => {
    const s = summarize([])
    expect(s.games).toBe(0)
    expect(s.blunders).toBe(0)
    expect(s.byPhase.opening.share).toBe(0)
  })
})

describe('bucketStart', () => {
  it('starts weeks on Monday (UTC)', () => {
    expect(bucketStart(NOW, 'week')).toBe(Date.UTC(2026, 10, 16))
    expect(bucketStart(Date.UTC(2026, 10, 16, 0, 0, 1), 'week')).toBe(Date.UTC(2026, 10, 16))
    expect(bucketStart(Date.UTC(2026, 10, 15, 23), 'week')).toBe(Date.UTC(2026, 10, 9))
  })

  it('starts months on the 1st', () => {
    expect(bucketStart(NOW, 'month')).toBe(Date.UTC(2026, 10, 1))
  })

  it('uses weeks for short ranges and months for all', () => {
    expect(bucketFor('30d')).toBe('week')
    expect(bucketFor('90d')).toBe('week')
    expect(bucketFor('all')).toBe('month')
  })
})

describe('blunderTrend', () => {
  it('averages blunders per game per period, oldest first', () => {
    const blunders = (n: number, endTime: number) =>
      entry({ endTime, counts: { inaccuracy: 0, mistake: 0, blunder: n } })
    const trend = blunderTrend(
      [blunders(3, NOW), blunders(1, NOW - DAY), blunders(4, NOW - 8 * DAY)],
      'week',
    )
    expect(trend).toEqual([
      { start: Date.UTC(2026, 10, 9), games: 1, blundersPerGame: 4, accuracy: null },
      { start: Date.UTC(2026, 10, 16), games: 2, blundersPerGame: 2, accuracy: null },
    ])
  })

  it('averages accuracy per period, skipping games without one', () => {
    const trend = blunderTrend(
      [
        entry({ endTime: NOW, accuracy: 80 }),
        entry({ endTime: NOW - DAY, accuracy: 60 }),
        entry({ endTime: NOW - 2 * DAY, accuracy: null }),
      ],
      'week',
    )
    expect(trend).toHaveLength(1)
    expect(trend[0]?.accuracy).toBe(70)
  })
})

describe('ratingHistory and mainTimeClass', () => {
  const games = fixtureGames
    .map((g) => normalizeGame(g, OWNER))
    .filter((g): g is Game => g !== null)

  it('lists the user’s rating after each rated game, oldest first', () => {
    const history = ratingHistory(games, 'blitz')
    const blitz = games.filter((g) => g.rated && g.timeClass === 'blitz')
    expect(history).toHaveLength(blitz.length)
    expect(history.map((p) => p.time)).toEqual(
      [...history.map((p) => p.time)].sort((a, b) => a - b),
    )
    const first = blitz.sort((a, b) => a.endTime - b.endTime)[0] as Game
    expect(history[0]?.rating).toBe(first[first.userColor].rating)
  })

  it('picks the most played rated tempo', () => {
    expect(mainTimeClass(games)).toBe('blitz')
    expect(mainTimeClass([])).toBeNull()
  })
})

describe('weeklyFocus', () => {
  const phaseErrors = (endTime: number, opening: number, endgame: number) =>
    entry({ endTime, byPhase: { opening, middlegame: 0, endgame } })

  it('picks the phase with the most errors in the last 7 days', () => {
    const focus = weeklyFocus(
      [phaseErrors(NOW - DAY, 1, 3), phaseErrors(NOW - 20 * DAY, 9, 0)],
      NOW,
    )
    expect(focus).toEqual({ kind: 'phase', phase: 'endgame', errors: 3, thisWeek: true })
  })

  it('falls back to the whole range when the week was clean', () => {
    const focus = weeklyFocus(
      [phaseErrors(NOW - DAY, 0, 0), phaseErrors(NOW - 20 * DAY, 2, 1)],
      NOW,
    )
    expect(focus).toEqual({ kind: 'phase', phase: 'opening', errors: 2, thisWeek: false })
  })

  it('prefers the most frequent motif, ties going to the higher priority', () => {
    const withMotifs = (endTime: number, byMotif: GameErrors['byMotif']) =>
      entry({ endTime, byPhase: { opening: 5, middlegame: 0, endgame: 0 }, byMotif })
    const focus = weeklyFocus(
      [
        withMotifs(NOW - DAY, { 'time-pressure': 2, 'hanging-piece': 2 }),
        withMotifs(NOW - 2 * DAY, { 'missed-mate': 1 }),
      ],
      NOW,
    )
    expect(focus).toEqual({ kind: 'motif', motif: 'hanging-piece', errors: 2, thisWeek: true })
  })

  it('returns null without errors', () => {
    expect(weeklyFocus([phaseErrors(NOW, 0, 0)], NOW)).toBeNull()
  })
})
