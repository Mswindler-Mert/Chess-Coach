/** Round, readable axis ticks covering `min`–`max` (steps of 1, 2, 2.5 or 5 × 10ⁿ). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min, min + 1]
  const raw = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  // The last tick is always at or above max, so marks never overflow the axis.
  for (let v = start; ; v += step) {
    ticks.push(Number(v.toFixed(6)))
    if (v >= max - 1e-9) break
  }
  return ticks
}
