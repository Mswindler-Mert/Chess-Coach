import type { PointerEvent } from 'react'
import type { MoveAnalysis, MoveClass } from '../core/analysis/types'
import { t } from '../i18n'

const W = 640
const H = 120
const PAD = 4
// White's share of the winning chances is drawn light on the dark surface (#0f172a).
const AREA = '#cbd5e1'
const LINE = '#e2e8f0'
const GRID = '#334155'
const CURRENT = '#10b981'
const SURFACE = '#0f172a'
// The move-class colours used in the move list, so a dot and its "??" match.
const MARKERS: Partial<Record<MoveClass, string>> = {
  inaccuracy: '#fde047',
  mistake: '#fb923c',
  blunder: '#fb7185',
}

/**
 * White's winning chances through the game (0 at the bottom, 100 at the top). Inaccuracies,
 * mistakes and blunders are dots; tapping or dragging jumps to that move.
 */
export function EvalGraph({
  wins,
  moves,
  ply,
  onSelect,
}: {
  /** White's win% for each position: index 0 is the start, index i is after ply i. */
  wins: readonly number[]
  moves: readonly MoveAnalysis[]
  ply: number
  onSelect: (ply: number) => void
}) {
  const last = Math.max(1, wins.length - 1)
  const x = (i: number) => PAD + (i / last) * (W - 2 * PAD)
  const y = (win: number) => PAD + (1 - win / 100) * (H - 2 * PAD)
  const line = wins.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w)}`).join('')
  const area = `${line}L${x(wins.length - 1)},${H - PAD}L${x(0)},${H - PAD}Z`

  function select(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / box.width
    onSelect(Math.max(0, Math.min(last, Math.round(((ratio * W - PAD) / (W - 2 * PAD)) * last))))
  }

  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="flex justify-between text-xs text-slate-400">
        <span>{t('viewer.review.graph')}</span>
        <span className="hidden sm:inline">{t('viewer.review.graphHint')}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-pointer touch-none rounded-lg bg-slate-900"
        role="img"
        aria-label={t('viewer.review.graph')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          select(e)
        }}
        onPointerMove={(e) => {
          if (e.buttons) select(e)
        }}
      >
        <line x1={PAD} x2={W - PAD} y1={y(50)} y2={y(50)} stroke={GRID} />
        <path d={area} fill={AREA} opacity={0.22} />
        <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" />
        <line x1={x(ply)} x2={x(ply)} y1={PAD} y2={H - PAD} stroke={CURRENT} strokeWidth={2} />
        {moves.map((move) => {
          const color = MARKERS[move.moveClass]
          const win = wins[move.ply]
          if (!color || win === undefined) return null
          return (
            <circle
              key={move.ply}
              cx={x(move.ply)}
              cy={y(win)}
              r={4}
              fill={color}
              stroke={SURFACE}
              strokeWidth={2}
            >
              <title>{`${Math.ceil(move.ply / 2)}${move.color === 'white' ? '.' : '…'} ${move.san}`}</title>
            </circle>
          )
        })}
      </svg>
    </figure>
  )
}
