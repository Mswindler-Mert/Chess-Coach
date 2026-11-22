import { useEffect, useMemo, useState } from 'react'
import { normalizeUsername } from '../../core/api/username'
import { opponentOf, type Color } from '../../core/games/model'
import { guideIdForOpeningFamily } from '../../core/openings/guides'
import { summarizePrinciples } from '../../core/openings/principles'
import { openingStats, type OpeningStats } from '../../core/openings/stats'
import { loadOpenings, type OpeningsData } from '../../db/openings'
import { formatPercent, t } from '../../i18n'
import { formatDate, timeClassLabel } from '../format'
import { OpeningTrainer } from '../OpeningTrainer'
import { routeHref } from '../router'

/** Openings shown per colour before "show all". */
const TOP_OPENINGS = 8
/** Recent games listed with their principle warnings. */
const RECENT_WARNINGS = 10

const pct = formatPercent

export function OpeningsPage({
  username: rawUsername,
  initialGuideId = null,
  initialLineId = null,
}: {
  username: string
  initialGuideId?: string | null
  initialLineId?: string | null
}) {
  const username = normalizeUsername(rawUsername)
  if (!username) return <p className="text-rose-400">{t('home.username.invalid')}</p>
  return (
    <Openings
      username={username}
      initialGuideId={initialGuideId}
      initialLineId={initialLineId}
    />
  )
}

function Openings({
  username,
  initialGuideId,
  initialLineId,
}: {
  username: string
  initialGuideId: string | null
  initialLineId: string | null
}) {
  const [now] = useState(() => Date.now())
  const [tab, setTab] = useState<'learn' | 'stats'>('learn')
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(initialGuideId)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(initialLineId)
  const [data, setData] = useState<OpeningsData | null>(null)

  useEffect(() => {
    void loadOpenings(username, now).then(setData)
  }, [username, now])

  const stats = useMemo(() => (data ? openingStats(data.games) : []), [data])
  const principles = useMemo(
    () => (data ? summarizePrinciples([...data.warnings.values()]) : null),
    [data],
  )

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{t('openings.title')}</h1>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              type="button"
              aria-pressed={tab === 'learn'}
              onClick={() => setTab('learn')}
              className={`min-h-9 rounded-lg px-3.5 text-sm font-medium transition-colors ${
                tab === 'learn'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              📖 {t('openings.tab.learn')}
            </button>
            <button
              type="button"
              aria-pressed={tab === 'stats'}
              onClick={() => setTab('stats')}
              className={`min-h-9 rounded-lg px-3.5 text-sm font-medium transition-colors ${
                tab === 'stats'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              📊 {t('openings.tab.stats')}
            </button>
          </div>
        </div>
      </header>

      {tab === 'learn' ? (
        <OpeningTrainer
          key={`${selectedGuideId ?? 'list'}:${selectedLineId ?? ''}`}
          initialGuideId={selectedGuideId}
          initialLineId={selectedLineId}
        />
      ) : !data || !principles ? (
        <p className="text-slate-400">{t('openings.loading')}</p>
      ) : (
        <OpeningStatsView
          username={username}
          data={data}
          stats={stats}
          principles={principles}
          onStudyGuide={(id) => {
            setSelectedGuideId(id)
            setSelectedLineId(null)
            setTab('learn')
          }}
        />
      )}
    </div>
  )
}

function OpeningStatsView({
  username,
  data,
  stats,
  principles,
  onStudyGuide,
}: {
  username: string
  data: OpeningsData
  stats: OpeningStats[]
  principles: ReturnType<typeof summarizePrinciples>
  onStudyGuide: (guideId: string) => void
}) {
  const scope = [
    data.filter.timeClasses.map(timeClassLabel).join(', ') || '—',
    t(`games.range.${data.filter.dateRange}`),
  ].join(' · ')
  const recent = data.games
    .filter((g) => (data.warnings.get(g.id)?.length ?? 0) > 0)
    .slice(0, RECENT_WARNINGS)
  const worstPrinciple = [...principles.rates]
    .filter((r) => r.games > 0)
    .sort((a, b) => b.share - a.share)[0]

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-slate-400">
        {t('openings.scope', { scope, games: data.games.length })}
      </p>

      {data.games.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">
          {t('openings.empty')}
        </p>
      ) : (
        <>
          {/* Beginner-friendly Coach Summary instead of raw data */}
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 border-t-[3px] border-t-teal-400 bg-slate-900/95 p-5">
            <p className="font-mono text-xs font-bold tracking-wider text-teal-300 uppercase">
              💡 {t('openings.stats.coachTitle')}
            </p>
            <p className="text-[15px] leading-relaxed text-slate-100">
              {worstPrinciple
                ? t('openings.stats.coachTop', {
                    principle: t(`principle.${worstPrinciple.principle}`),
                    share: pct(worstPrinciple.share),
                    advice: t(`principle.desc.${worstPrinciple.principle}`),
                  })
                : t('openings.stats.coachClean')}
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={routeHref({ name: 'puzzles', username, focus: 'opening' })}
                className="grid min-h-10 place-items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                {t('openings.practice.link')}
              </a>
            </div>
          </section>

          {/* Opening principles with plain-language explanations under every row */}
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-5">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-bold text-slate-100">
                {t('openings.principles.title')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('openings.principles.subtitle', { games: principles.games })}
              </p>
            </div>
            <ul className="flex flex-col gap-3.5">
              {principles.rates.map((r) => (
                <li key={r.principle} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-100">
                      {t(`principle.${r.principle}`)}
                    </span>
                    <span className="font-mono text-xs text-slate-300 tabular-nums">
                      {pct(r.share)}{' '}
                      <span className="text-slate-500">
                        ({t('dashboard.games', { count: r.games })})
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-400"
                      style={{ width: `${Math.max(r.share > 0 ? 4 : 0, r.share * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">{t(`principle.desc.${r.principle}`)}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {(['white', 'black'] as const).map((color) => (
              <OpeningTable
                key={color}
                color={color}
                username={username}
                rows={stats.filter((s) => s.color === color)}
                onStudyGuide={onStudyGuide}
              />
            ))}
          </div>

          {recent.length > 0 && (
            <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="font-semibold">{t('openings.recent.title')}</h2>
              <ul className="flex flex-col divide-y divide-slate-800">
                {recent.map((game) => (
                  <li key={game.id} className="flex flex-col gap-1.5 py-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <a
                        href={routeHref({ name: 'game', username, id: game.id })}
                        className="font-medium text-slate-200 hover:underline"
                      >
                        {opponentOf(game).username}
                        <span className="text-slate-500"> · {t(`color.${game.userColor}`)}</span>
                      </a>
                      <span className="text-xs text-slate-500">
                        {formatDate(game.endTime)} · {game.opening?.name ?? '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.warnings.get(game.id)?.map((w) => (
                        <a
                          key={w.principle}
                          href={routeHref({ name: 'game', username, id: game.id, ply: w.ply })}
                          title={t(`principle.desc.${w.principle}`)}
                          className="rounded-full border border-amber-500/60 px-2 py-0.5 text-xs text-amber-200 hover:border-amber-400"
                        >
                          {t(`principle.${w.principle}`)}
                          {w.count > 1 && ` ×${w.count}`}
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="text-xs text-slate-500">{t('openings.note')}</p>
    </div>
  )
}

function OpeningTable({
  color,
  username,
  rows,
  onStudyGuide,
}: {
  color: Color
  username: string
  rows: OpeningStats[]
  onStudyGuide: (guideId: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? rows : rows.slice(0, TOP_OPENINGS)
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
      <h2 className="font-semibold">{t('openings.table.title', { color: t(`color.${color}`) })}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{t('openings.table.none')}</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="py-1 font-normal">{t('openings.table.opening')}</th>
              <th className="py-1 text-right font-normal">{t('openings.table.games')}</th>
              <th className="py-1 text-right font-normal">{t('openings.table.wdl')}</th>
              <th className="py-1 text-right font-normal">{t('openings.table.score')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const guideId = guideIdForOpeningFamily(row.family)
              return (
                <tr key={row.family} className="border-t border-slate-800">
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={routeHref({ name: 'game', username, id: row.latestGameId })}
                        title={t('openings.table.latest')}
                        className="text-slate-200 hover:underline"
                      >
                        {row.family}
                      </a>
                      {guideId && (
                        <button
                          type="button"
                          onClick={() => onStudyGuide(guideId)}
                          className="rounded-md bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-300 hover:bg-teal-500/25"
                        >
                          📖 {t('openings.stats.studyGuide')}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{row.games}</td>
                  <td className="py-2 text-right whitespace-nowrap text-slate-400 tabular-nums">
                    {row.wins}/{row.draws}/{row.losses}
                  </td>
                  <td className="py-2 text-right tabular-nums">{pct(row.score)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {rows.length > TOP_OPENINGS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start text-sm text-emerald-400 hover:underline"
        >
          {showAll ? t('openings.table.less') : t('openings.table.all', { count: rows.length })}
        </button>
      )}
    </section>
  )
}
