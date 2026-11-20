export type TimeControl =
  | { kind: 'live'; baseSeconds: number; incrementSeconds: number }
  | { kind: 'daily'; secondsPerMove: number }

/** Parses Chess.com time controls: "600", "180+2" (live) or "1/259200" (daily). */
export function parseTimeControl(value: string): TimeControl | null {
  const daily = /^1\/(\d+)$/.exec(value)
  if (daily) return { kind: 'daily', secondsPerMove: Number(daily[1]) }

  const live = /^(\d+)(?:\+(\d+))?$/.exec(value)
  if (live) {
    return {
      kind: 'live',
      baseSeconds: Number(live[1]),
      incrementSeconds: live[2] === undefined ? 0 : Number(live[2]),
    }
  }
  return null
}

/** Short label for the game list, e.g. "10 dk", "3+2", "1 gün". Units come from `units`. */
export function formatTimeControl(value: string, units: { minutes: string; days: string }): string {
  const tc = parseTimeControl(value)
  if (!tc) return value
  if (tc.kind === 'daily') return `${Math.round(tc.secondsPerMove / 86400)} ${units.days}`
  const minutes = tc.baseSeconds / 60
  const base = Number.isInteger(minutes) ? String(minutes) : String(Math.round(minutes * 10) / 10)
  return tc.incrementSeconds > 0 ? `${base}+${tc.incrementSeconds}` : `${base} ${units.minutes}`
}
