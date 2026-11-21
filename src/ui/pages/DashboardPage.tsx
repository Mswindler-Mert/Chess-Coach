import { useEffect, useMemo, useState } from 'react'
import { normalizeUsername } from '../../core/api/username'
import type { TimeClass } from '../../core/games/model'
import {
  blunderTrend,
  bucketFor,
  mainTimeClass,
  PHASES,
  ratingHistory,
  summarize,
  weeklyFocus,
} from '../../core/stats/dashboard'
import { loadDashboard, type DashboardData } from '../../db/dashboard'
import { t } from '../../i18n'
import { BarList, ColumnChart, LineChart, StatTile } from '../charts'
import { timeClassLabel } from '../format'
import { routeHref } from '../router'

const weekFormat = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
const monthFormat = new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })

const fmt1 = (v: number) => v.toLocaleString('tr-TR', { maximumFractionDigits: 1 })
const pct = (v: number) => `%${Math.round(v * 100)}`

export function DashboardPage({ username: rawUsername }: { username: string }) {
  const username = normalizeUsername(rawUsername)
  if (!username) return <p className="text-rose-400">{t('home.username.invalid')}</p>
  return <Dashboard username={username} />
}

function Dashboard({ username }: { username: string }) {
  const [now] = useState(() => Date.now())
  const [data, setData] = useState<DashboardData | null>(null)
  const [ratingClass, setRatingClass] = useState<TimeClass | null>(null)

  useEffect(() => {
    void loadDashboard(username, now).then(setData)
  }, [username, now])

  const stats = useMemo(() => {
    if (!data) return null
    const bucket = bucketFor(data.filter.dateRange)
    return {
      summary: summarize(data.errors),
      bucket,
      trend: blunderTrend(data.errors, bucket),
      focus: weeklyFocus(data.errors, now),
      defaultClass: mainTimeClass(data.games),
    }
  }, [data, now])

  const back = (
    <a
      href={routeHref({ name: 'games', username })}
      className="self-start text-sm text-emerald-400 hover:underline"
    >
      ← {t('nav.backToGames')}
    </a>
  )

  if (!data || !stats) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p className="text-slate-400">{t('dashboard.loading')}</p>
      </div>
    )
  }

  const { summary, trend, focus, bucket } = stats
  const ratedClasses = data.filter.timeClasses.filter((tc) =>
    data.games.some((g) => g.rated && g.timeClass === tc),
  )
  const shownClass =
    ratingClass && ratedClasses.includes(ratingClass) ? ratingClass : stats.defaultClass
  const ratings = shownClass ? ratingHistory(data.games, shownClass) : []
  const scope = [
    data.filter.timeClasses.map(timeClassLabel).join(', ') || '—',
    t(`games.range.${data.filter.dateRange}`),
  ].join(' · ')

  return (
    <div className="flex flex-col gap-5">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-400">
          {t('dashboard.scope', { scope, analyzed: summary.games, games: data.games.length })}
        </p>
      </header>

      {summary.games === 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">
          <p>{t('dashboard.empty')}</p>
          <a
            href={routeHref({ name: 'games', username })}
            className="self-start text-emerald-400 hover:underline"
          >
            {t('puzzles.goToGames')}
          </a>
        </div>
      ) : (
        <>
          {focus && (
            <section className="flex flex-col gap-2 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
              <h2 className="text-sm text-emerald-300">{t('dashboard.focus.title')}</h2>
              <p className="text-lg font-semibold">
                {t('dashboard.focus.phase', {
                  phase: t(`phase.${focus.phase}`),
                  errors: focus.errors,
                })}
              </p>
              <p className="text-sm text-slate-400">
                {focus.thisWeek ? t('dashboard.focus.week') : t('dashboard.focus.range')}
              </p>
              <a
                href={routeHref({ name: 'puzzles', username, focus: focus.phase })}
                className="grid min-h-10 place-items-center self-start rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                {t('dashboard.focus.practice', { phase: t(`phase.${focus.phase}`) })}
              </a>
            </section>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={t('dashboard.tile.games')} value={String(summary.games)} />
            <StatTile label={t('dashboard.tile.blunders')} value={fmt1(summary.blunders)} />
            <StatTile label={t('dashboard.tile.mistakes')} value={fmt1(summary.mistakes)} />
            <StatTile label={t('dashboard.tile.inaccuracies')} value={fmt1(summary.inaccuracies)} />
          </div>

          {trend.length > 0 && (
            <ColumnChart
              title={t('dashboard.trend.title')}
              subtitle={t(bucket === 'week' ? 'dashboard.trend.weekly' : 'dashboard.trend.monthly')}
              valueLabel={t('dashboard.trend.unit')}
              points={trend.map((p) => ({
                label: (bucket === 'week' ? weekFormat : monthFormat).format(p.start),
                value: p.blundersPerGame,
                detail: t('dashboard.games', { count: p.games }),
              }))}
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <BarList
              title={t('dashboard.phase.title')}
              subtitle={t('dashboard.phase.subtitle')}
              valueHead={t('dashboard.phase.head')}
              format={(v) => String(v)}
              rows={PHASES.map((phase) => ({
                label: t(`phase.${phase}`),
                value: summary.byPhase[phase].errors,
                note: pct(summary.byPhase[phase].share),
              }))}
            />
            <BarList
              title={t('dashboard.color.title')}
              subtitle={t('dashboard.color.subtitle')}
              valueHead={t('dashboard.color.head')}
              format={fmt1}
              rows={(['white', 'black'] as const).map((color) => ({
                label: t(`color.${color}`),
                value: summary.byColor[color].errorsPerGame,
                note: t('dashboard.games', { count: summary.byColor[color].games }),
              }))}
            />
          </div>
        </>
      )}

      {ratings.length > 1 && shownClass && (
        <div className="flex flex-col gap-2">
          {ratedClasses.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('games.filter.label')}>
              {ratedClasses.map((tc) => (
                <button
                  key={tc}
                  type="button"
                  aria-pressed={tc === shownClass}
                  onClick={() => setRatingClass(tc)}
                  className={`min-h-9 rounded-full border px-3 text-sm font-medium ${
                    tc === shownClass
                      ? 'border-emerald-500 bg-emerald-600/20 text-emerald-200'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {timeClassLabel(tc)}
                </button>
              ))}
            </div>
          )}
          <LineChart
            title={t('dashboard.rating.title', { tempo: timeClassLabel(shownClass) })}
            subtitle={t('dashboard.rating.subtitle', { count: ratings.length })}
            valueLabel={t('dashboard.rating.unit')}
            points={ratings.map((p) => ({ label: dayFormat.format(p.time), value: p.rating }))}
          />
        </div>
      )}

      <p className="text-xs text-slate-500">{t('dashboard.note')}</p>
    </div>
  )
}
