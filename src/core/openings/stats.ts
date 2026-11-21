import type { Color, Game } from '../games/model'

/** Words that end an opening's family name: "Italian Game", "Sicilian Defense", … */
const FAMILY_ENDINGS = new Set([
  'Opening',
  'Defense',
  'Defence',
  'Game',
  'Gambit',
  'Attack',
  'System',
])

/** Chess.com sometimes names the same opening differently; these families are merged. */
const FAMILY_ALIASES: Record<string, string> = {
  'Giuoco Piano Game': 'Italian Game',
  'Kings Indian Defence': 'Kings Indian Defense',
}

/**
 * The opening family from Chess.com's detailed name:
 * "Kings Pawn Opening Leonardis Variation 2...Nf6 3.Nf3" → "Kings Pawn Opening",
 * "Pirc Defense Modern Defense Geller System" → "Pirc Defense".
 * Without such a word, the words before the first move number (at most three).
 */
export function openingFamily(name: string): string {
  const words = name.split(/\s+/).filter(Boolean)
  const end = words.findIndex((w) => FAMILY_ENDINGS.has(w))
  if (end >= 0) {
    const family = words.slice(0, end + 1).join(' ')
    return FAMILY_ALIASES[family] ?? family
  }
  const firstMove = words.findIndex((w) => /^\d/.test(w))
  return words.slice(0, Math.min(firstMove >= 0 ? firstMove : words.length, 3)).join(' ') || name
}

export interface OpeningStats {
  family: string
  color: Color
  games: number
  wins: number
  draws: number
  losses: number
  /** (wins + draws / 2) / games, 0–1. */
  score: number
  /** Newest game of this opening, for a link. */
  latestGameId: string
}

/** Results per opening family and colour, most played first. Games without an opening are skipped. */
export function openingStats(games: readonly Game[]): OpeningStats[] {
  const groups = new Map<string, OpeningStats & { latestTime: number }>()
  for (const game of games) {
    if (!game.opening) continue
    const family = openingFamily(game.opening.name)
    const key = `${game.userColor}:${family}`
    const s = groups.get(key) ?? {
      family,
      color: game.userColor,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      score: 0,
      latestGameId: game.id,
      latestTime: -Infinity,
    }
    s.games++
    if (game.outcome === 'win') s.wins++
    else if (game.outcome === 'draw') s.draws++
    else s.losses++
    if (game.endTime > s.latestTime) {
      s.latestTime = game.endTime
      s.latestGameId = game.id
    }
    groups.set(key, s)
  }
  return [...groups.values()]
    .map(({ latestTime: _latest, ...s }) => ({ ...s, score: (s.wins + s.draws / 2) / s.games }))
    .sort((a, b) => b.games - a.games || a.family.localeCompare(b.family))
}
