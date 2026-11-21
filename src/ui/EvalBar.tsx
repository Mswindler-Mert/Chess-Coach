import { formatScore } from '../core/analysis/display'
import { evalBarState } from '../core/analysis/evalBar'
import type { Score } from '../core/analysis/types'
import type { Color } from '../core/games/model'
import { t } from '../i18n'

/**
 * Vertical evaluation bar placed alongside the chessboard. White's portion sits at the bottom
 * when viewing from White's side, and at the top when flipped to Black's side.
 */
export function EvalBar({
  score,
  sideToMove,
  orientation,
}: {
  score: Score
  sideToMove: Color
  orientation: Color
}) {
  const { whiteShare, favored, label } = evalBarState(score, sideToMove)
  const whiteAtBottom = orientation === 'white'
  const labelAtBottom = (favored === 'white') === whiteAtBottom
  const fullScore = formatScore(score, sideToMove)

  return (
    <div
      role="img"
      aria-label={t('viewer.analysis.eval', { score: fullScore })}
      title={t('viewer.analysis.eval', { score: fullScore })}
      className="relative flex w-6 shrink-0 flex-col overflow-hidden rounded-md border border-slate-700/80 bg-slate-800 select-none sm:w-7"
    >
      <div
        className={`w-full transition-[height] duration-300 ease-out ${
          whiteAtBottom ? 'bg-slate-800' : 'bg-slate-100'
        }`}
        style={{ height: `${whiteAtBottom ? 100 - whiteShare : whiteShare}%` }}
      />
      <div className={`w-full flex-1 ${whiteAtBottom ? 'bg-slate-100' : 'bg-slate-800'}`} />
      {/* Midpoint tick */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-slate-500/50"
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 text-center font-mono text-[10px] leading-none font-bold ${
          labelAtBottom ? 'bottom-1' : 'top-1'
        } ${favored === 'white' ? 'text-slate-900' : 'text-slate-100'}`}
      >
        {label}
      </span>
    </div>
  )
}
