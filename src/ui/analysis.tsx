import type { Motif } from '../core/analysis/motifs'
import type { ClassCounts } from '../core/analysis/types'
import { t } from '../i18n'
import { MOVE_CLASS_TEXT, MOVE_SYMBOLS, useAnalysisRunner } from './analysisStyles'
import { routeHref } from './router'

const ERROR_CLASSES = ['blunder', 'mistake', 'inaccuracy'] as const

/** Small chips with one side's error counts, e.g. "?? 2  ? 1". */
export function ErrorChips({ counts }: { counts: ClassCounts }) {
  const shown = ERROR_CLASSES.filter((c) => counts[c] > 0)
  if (shown.length === 0) {
    return <span className="text-xs text-emerald-400">{t('analysis.clean')}</span>
  }
  return (
    <span className="flex gap-2 text-xs font-semibold">
      {shown.map((c) => (
        <span
          key={c}
          title={t(`analysis.count.${c}`, { count: counts[c] })}
          className={MOVE_CLASS_TEXT[c]}
        >
          {MOVE_SYMBOLS[c]} {counts[c]}
        </span>
      ))}
    </span>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-emerald-500 transition-[width]"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  )
}

/** Motif labels as small chips; the main (first) motif stands out. Hover shows the explanation. */
export function MotifChips({ motifs }: { motifs: readonly Motif[] }) {
  if (motifs.length === 0) return null
  return (
    <span className="flex flex-wrap gap-1.5">
      {motifs.map((motif, i) => (
        <span
          key={motif}
          title={t(`motif.desc.${motif}`)}
          className={`rounded-full border px-2 py-0.5 text-xs ${
            i === 0 ? 'border-amber-500/70 text-amber-200' : 'border-slate-600 text-slate-300'
          }`}
        >
          {t(`motif.${motif}`)}
        </span>
      ))}
    </span>
  )
}

/** Small header note while background analysis runs; links to that user's game list. */
export function AnalysisBadge() {
  const runner = useAnalysisRunner()
  if (runner.status !== 'running' || !runner.username || runner.remaining === 0) return null
  return (
    <a
      href={routeHref({ name: 'games', username: runner.username })}
      className="flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200"
      title={t('analysis.badgeTitle')}
      role="status"
    >
      <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-emerald-400" />
      {t('analysis.badge', { remaining: runner.remaining })}
    </a>
  )
}
