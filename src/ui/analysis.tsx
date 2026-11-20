import type { ClassCounts } from '../core/analysis/types'
import { t } from '../i18n'
import { MOVE_CLASS_TEXT, MOVE_SYMBOLS } from './analysisStyles'

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
