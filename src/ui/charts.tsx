import { useState, type ReactNode } from 'react'
import { niceTicks } from '../core/stats/ticks'
import { t } from '../i18n'

// One series colour, validated (dataviz validator) on the dark chart surface #0f172a.
const SERIES = '#059669'
const GRID = '#1e293b'
const SURFACE = '#0f172a'

const W = 640
const H = 220
const PAD = { top: 16, right: 16, bottom: 28, left: 40 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

export interface ChartPoint {
  /** Short label under the axis and in the table. */
  label: string
  value: number
  /** Extra tooltip line, e.g. "4 oyun". */
  detail?: string
}

function formatValue(v: number, digits: number) {
  return v.toLocaleString('tr-TR', { maximumFractionDigits: digits })
}

function Frame({
  title,
  subtitle,
  table,
  children,
}: {
  title: string
  subtitle?: string
  table: { head: [string, string]; rows: [string, string][] }
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {children}
      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer select-none">{t('charts.table')}</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 font-normal">{table.head[0]}</th>
              <th className="py-1 text-right font-normal">{table.head[1]}</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map(([a, b], i) => (
              <tr key={i} className="border-t border-slate-800 text-slate-300">
                <td className="py-1">{a}</td>
                <td className="py-1 text-right tabular-nums">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Tooltip({ x, y, lines }: { x: number; y: number; lines: string[] }) {
  // Positioned in % of the SVG box so it scales with the chart.
  const left = (x / W) * 100
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs whitespace-nowrap text-slate-100 shadow"
      style={{ left: `${Math.min(88, Math.max(12, left))}%`, top: `${(y / H) * 100}%` }}
    >
      {lines.map((line, i) => (
        <div key={i} className={i === 0 ? 'font-semibold' : 'text-slate-400'}>
          {line}
        </div>
      ))}
    </div>
  )
}

function YGrid({
  ticks,
  y,
  digits,
}: {
  ticks: number[]
  y: (v: number) => number
  digits: number
}) {
  return (
    <>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke={GRID} />
          <text
            x={PAD.left - 6}
            y={y(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-slate-500 text-[11px]"
          >
            {formatValue(tick, digits)}
          </text>
        </g>
      ))}
    </>
  )
}

/** Labels for at most ~6 evenly spaced points, so they never collide. */
function xLabelIndexes(n: number, max = 6): Set<number> {
  if (n <= max) return new Set(Array.from({ length: n }, (_, i) => i))
  const step = Math.ceil((n - 1) / (max - 1))
  const set = new Set<number>()
  for (let i = 0; i < n; i += step) set.add(i)
  set.add(n - 1)
  return set
}

/** Columns from a zero baseline, one series, with hover tooltips. */
export function ColumnChart({
  title,
  subtitle,
  points,
  valueLabel,
  digits = 1,
}: {
  title: string
  subtitle?: string
  points: ChartPoint[]
  valueLabel: string
  digits?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...points.map((p) => p.value), 0)
  const ticks = niceTicks(0, max || 1)
  const top = ticks.at(-1) ?? 1
  const y = (v: number) => PAD.top + PLOT_H - (v / top) * PLOT_H
  const band = PLOT_W / Math.max(points.length, 1)
  const barW = Math.min(24, band - 2)
  const labels = xLabelIndexes(points.length)
  const hovered = hover !== null ? points[hover] : undefined

  return (
    <Frame
      title={title}
      subtitle={subtitle}
      table={{
        head: [t('charts.period'), valueLabel],
        rows: points.map((p) => [p.label, formatValue(p.value, digits)]),
      }}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <YGrid ticks={ticks} y={y} digits={digits} />
          {points.map((p, i) => {
            const x = PAD.left + band * i + (band - barW) / 2
            const barTop = y(p.value)
            const h = Math.max(0, PAD.top + PLOT_H - barTop)
            const r = Math.min(4, h, barW / 2)
            // 4px rounded data end, square at the baseline.
            const path = `M${x},${barTop + h}V${barTop + r}Q${x},${barTop} ${x + r},${barTop}H${x + barW - r}Q${x + barW},${barTop} ${x + barW},${barTop + r}V${barTop + h}Z`
            return (
              <g key={i}>
                {h > 0 && (
                  <path d={path} fill={SERIES} opacity={hover === null || hover === i ? 1 : 0.55} />
                )}
                {labels.has(i) && (
                  <text
                    x={x + barW / 2}
                    y={H - 8}
                    textAnchor="middle"
                    className="fill-slate-500 text-[11px]"
                  >
                    {p.label}
                  </text>
                )}
                <rect
                  x={PAD.left + band * i}
                  y={PAD.top}
                  width={band}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setHover(i)}
                />
              </g>
            )
          })}
        </svg>
        {hovered && hover !== null && (
          <Tooltip
            x={PAD.left + band * hover + band / 2}
            y={y(hovered.value) - 6}
            lines={[
              `${hovered.label}: ${formatValue(hovered.value, digits)} ${valueLabel}`,
              ...(hovered.detail ? [hovered.detail] : []),
            ]}
          />
        )}
      </div>
    </Frame>
  )
}

/** A single-series line with a faint area, end label and crosshair tooltip. */
export function LineChart({
  title,
  subtitle,
  points,
  valueLabel,
}: {
  title: string
  subtitle?: string
  points: ChartPoint[]
  valueLabel: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map((p) => p.value)
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const lo = ticks[0] ?? 0
  const hi = ticks.at(-1) ?? 1
  const y = (v: number) => PAD.top + PLOT_H - ((v - lo) / (hi - lo || 1)) * PLOT_H
  const x = (i: number) =>
    PAD.left + (points.length > 1 ? (i / (points.length - 1)) * PLOT_W : PLOT_W / 2)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join('')
  const area = `${line}L${x(points.length - 1)},${PAD.top + PLOT_H}L${x(0)},${PAD.top + PLOT_H}Z`
  const labels = xLabelIndexes(points.length, 5)
  const last = points.length - 1
  const hovered = hover !== null ? points[hover] : undefined

  function onMove(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!box || points.length === 0) return
    const svgX = ((event.clientX - box.left) / box.width) * W
    const ratio = (svgX - PAD.left) / PLOT_W
    setHover(Math.max(0, Math.min(last, Math.round(ratio * last))))
  }

  return (
    <Frame
      title={title}
      subtitle={subtitle}
      table={{
        head: [t('charts.date'), valueLabel],
        rows: points.map((p) => [p.label, formatValue(p.value, 0)]),
      }}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <YGrid ticks={ticks} y={y} digits={0} />
          <path d={area} fill={SERIES} opacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke={SERIES}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) =>
            labels.has(i) ? (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'}
                className="fill-slate-500 text-[11px]"
              >
                {p.label}
              </text>
            ) : null,
          )}
          {hover !== null && hovered && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="#475569" />
          )}
          {(hover !== null ? [hover] : [last]).map((i) => {
            const p = points[i]
            return p ? (
              <circle
                key={i}
                cx={x(i)}
                cy={y(p.value)}
                r={4}
                fill={SERIES}
                stroke={SURFACE}
                strokeWidth={2}
              />
            ) : null
          })}
          {hover === null && points[last] && (
            <text
              x={x(last) - 8}
              y={y(points[last].value) - 10}
              textAnchor="end"
              className="fill-slate-200 text-[12px] font-semibold"
            >
              {formatValue(points[last].value, 0)}
            </text>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
        {hovered && hover !== null && (
          <Tooltip
            x={x(hover)}
            y={y(hovered.value) - 8}
            lines={[`${formatValue(hovered.value, 0)} ${valueLabel}`, hovered.label]}
          />
        )}
      </div>
    </Frame>
  )
}

/** Horizontal bars for a few categories, value at the tip. */
export function BarList({
  title,
  subtitle,
  rows,
  valueHead,
  format,
}: {
  title: string
  subtitle?: string
  rows: { label: string; value: number; note?: string }[]
  valueHead: string
  format: (v: number) => string
}) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1
  return (
    <Frame
      title={title}
      subtitle={subtitle}
      table={{ head: ['', valueHead], rows: rows.map((r) => [r.label, format(r.value)]) }}
    >
      <ul className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex flex-col gap-1" title={row.note}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-slate-300">{row.label}</span>
              <span className="text-slate-200 tabular-nums">
                {format(row.value)}
                {row.note && <span className="ml-1 text-xs text-slate-500">{row.note}</span>}
              </span>
            </div>
            <div className="h-2 rounded-r bg-slate-800/60">
              <div
                className="h-2 rounded-r"
                style={{ width: `${(row.value / max) * 100}%`, backgroundColor: SERIES }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </div>
  )
}
