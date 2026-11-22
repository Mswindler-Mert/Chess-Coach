import type { HungPieceType, PlayerDiagnosis } from '../core/stats/diagnosis'
import { formatNumber, formatPercent, t } from '../i18n'
import { routeHref } from './router'

const PIECE_ICONS: Record<HungPieceType, string> = {
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
}

export function DiagnosisCard({
  username,
  diagnosis,
}: {
  username: string
  diagnosis: PlayerDiagnosis
}) {
  if (diagnosis.analyzedGames === 0) {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-slate-800 border-t-[3px] border-t-rose-400 bg-slate-900/95 p-5 shadow-lg shadow-black/25">
        <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-rose-300 uppercase">
          🩺 {t('diagnosis.kicker')}
        </span>
        <h2 className="text-lg font-bold text-slate-100">{t('diagnosis.title')}</h2>
        <p className="text-sm text-slate-400">{t('diagnosis.empty')}</p>
      </section>
    )
  }

  const maxPieceCount = diagnosis.hungPieces[0]?.count ?? 1
  const maxBucketErrors = Math.max(1, ...diagnosis.collapseBuckets.map((b) => b.errors))
  const worstBucketObj = diagnosis.collapseBuckets.find((b) => b.range === diagnosis.worstBucket)
  const topReplies = diagnosis.openingReplies.slice(0, 4)

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-lg shadow-black/25">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-rose-300 uppercase">
            🩺 {t('diagnosis.kicker')}
          </span>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">
            {t('diagnosis.title')}
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          {t('diagnosis.subtitle', { games: diagnosis.analyzedGames })}
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 1. Most Hung Pieces */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 border-t-[3px] border-t-rose-400 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-100">{t('diagnosis.hung.title')}</h3>
            {diagnosis.hungPieces.length === 0 ? (
              <p className="text-xs text-slate-400">{t('diagnosis.hung.empty')}</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {diagnosis.hungPieces.map((item, idx) => (
                    <li key={item.piece} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                          <span aria-hidden="true" className="text-base leading-none">
                            {PIECE_ICONS[item.piece]}
                          </span>
                          {t(`diagnosis.piece.${item.piece}`)}
                        </span>
                        <span className="font-mono text-slate-300 tabular-nums">
                          {t('diagnosis.hung.times', { count: item.count })}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full ${idx === 0 ? 'bg-rose-400' : 'bg-rose-500/55'}`}
                          style={{ width: `${Math.max(10, (item.count / maxPieceCount) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {diagnosis.worstPiece && (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs leading-relaxed text-rose-200">
                    {t('diagnosis.hung.verdict', {
                      piece: t(`diagnosis.piece.${diagnosis.worstPiece}`),
                      count: diagnosis.hungPieces[0]?.count ?? 0,
                    })}
                  </p>
                )}
              </>
            )}
          </div>
          <a
            href={routeHref({ name: 'hanging', username })}
            className="text-xs font-semibold text-rose-300 hover:text-rose-200 hover:underline"
          >
            {t('diagnosis.hung.cta')}
          </a>
        </div>

        {/* 2. Collapse Move Range */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 border-t-[3px] border-t-amber-400 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-100">{t('diagnosis.collapse.title')}</h3>
            {diagnosis.totalErrors === 0 ? (
              <p className="text-xs text-slate-400">{t('diagnosis.collapse.empty')}</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {diagnosis.collapseBuckets.map((bucket) => {
                    const isPeak = bucket.range === diagnosis.worstBucket && bucket.errors > 0
                    return (
                      <li key={bucket.range} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-medium ${isPeak ? 'font-bold text-amber-300' : 'text-slate-300'}`}
                          >
                            {t(`diagnosis.collapse.range.${bucket.range}`)}
                          </span>
                          <span className="font-mono text-slate-400 tabular-nums">
                            {t('diagnosis.collapse.errors', { count: bucket.errors })} (
                            {formatPercent(bucket.share)})
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full ${isPeak ? 'bg-amber-400' : 'bg-slate-600'}`}
                            style={{
                              width:
                                bucket.errors > 0
                                  ? `${Math.max(8, (bucket.errors / maxBucketErrors) * 100)}%`
                                  : '0%',
                            }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {diagnosis.worstBucket && worstBucketObj && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-100">
                    {t(`diagnosis.collapse.verdict.${diagnosis.worstBucket}`, {
                      share: formatPercent(worstBucketObj.share),
                    })}
                  </p>
                )}
              </>
            )}
          </div>
          <a
            href={routeHref({ name: 'puzzles', username })}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 hover:underline"
          >
            {t('overview.kpi.pendingAction')}
          </a>
        </div>

        {/* 3. Nemesis Opening Replies with Direct Board Jump */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 border-t-[3px] border-t-sky-400 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-100">{t('diagnosis.openings.title')}</h3>
            {topReplies.length === 0 ? (
              <p className="text-xs text-slate-400">{t('diagnosis.openings.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {topReplies.map((reply, idx) => (
                  <li
                    key={reply.key}
                    className={`flex flex-col gap-1.5 rounded-lg border p-2.5 ${
                      idx === 0
                        ? 'border-sky-500/40 bg-sky-950/30'
                        : 'border-slate-800 bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {t(`diagnosis.reply.${reply.key}`)}
                      </span>
                      <a
                        href={routeHref({
                          name: 'openings',
                          username,
                          guide: reply.guideId,
                          line: reply.lineId,
                        })}
                        className="shrink-0 rounded-md bg-sky-500/20 px-2 py-0.5 text-[11px] font-semibold text-sky-200 ring-1 ring-sky-500/40 transition-colors hover:bg-sky-500/30"
                      >
                        {t('diagnosis.openings.cta')}
                      </a>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {t('diagnosis.openings.stats', {
                        games: reply.games,
                        win: Math.round(reply.winRate * 100),
                        blunders: formatNumber(reply.blundersPerGame, 1),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <a
            href={routeHref({ name: 'openings', username, guide: 'e4-responses' })}
            className="text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline"
          >
            1.e4 {t('diagnosis.openings.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}
