import { useEffect, useMemo, useState } from 'react'
import { normalizeUsername } from '../../core/api/username'
import { opponentOf, type Color } from '../../core/games/model'
import { summarizePrinciples } from '../../core/openings/principles'
import { openingStats, type OpeningStats } from '../../core/openings/stats'
import { loadOpenings, type OpeningsData } from '../../db/openings'
import { t } from '../../i18n'
import { BarList } from '../charts'
import { formatDate, timeClassLabel } from '../format'
import { routeHref } from '../router'

/** Openings shown per colour before "show all". */
const TOP_OPENINGS = 8
/** Recent games listed with their principle warnings. */
const RECENT_WARNINGS = 10

const pct = (v: number) => `%${Math.round(v * 100)}`

export function OpeningsPage({ username: rawUsername }: { username: string }) {
  const username = normalizeUsername(rawUsername)
  if (!username) return <p className="text-rose-400">{t('home.username.invalid')}</p>
  return <Openings username={username} />
}

function Openings({ username }: { username: string }) {
  const [now] = useState(() => Date.now())
  const [data, setData] = useState<OpeningsData | null>(null)

  useEffect(() => {
    void loadOpenings(username, now).then(setData)
  }, [username, now])

  const stats = useMemo(() => (data ? openingStats(data.games) : []), [data])
  const principles = useMemo(
    () => (data ? summarizePrinciples([...data.warnings.values()]) : null),
    [data],
  )

  const back = (
    <a
      href={routeHref({ name: 'games', username })}
      className="self-start text-sm text-emerald-400 hover:underline"
    >
      ← {t('nav.backToGames')}
    </a>
  )

  if (!data || !principles) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p className="text-slate-400">{t('openings.loading')}</p>
      </div>
    )
  }

  const scope = [
    data.filter.timeClasses.map(timeClassLabel).join(', ') || '—',
    t(`games.range.${data.filter.dateRange}`),
  ].join(' · ')
  const recent = data.games
    .filter((g) => (data.warnings.get(g.id)?.length ?? 0) > 0)
    .slice(0, RECENT_WARNINGS)

  return (
    <div className="flex flex-col gap-5">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('openings.title')}</h1>
        <p className="text-sm text-slate-400">
          {t('openings.scope', { scope, games: data.games.length })}
        </p>
      </header>

      {data.games.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">
          {t('openings.empty')}
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-2 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
            <p className="text-sm text-slate-300">{t('openings.practice.body')}</p>
            <a
              href={routeHref({ name: 'puzzles', username, focus: 'opening' })}
              className="grid min-h-10 place-items-center self-start rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {t('openings.practice.link')}
            </a>
          </section>

          <BarList
            title={t('openings.principles.title')}
            subtitle={t('openings.principles.subtitle', { games: principles.games })}
            valueHead={t('openings.principles.head')}
            format={pct}
            rows={principles.rates.map((r) => ({
              label: t(`principle.${r.principle}`),
              value: r.share,
              note: t('dashboard.games', { count: r.games }),
            }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            {(['white', 'black'] as const).map((color) => (
              <OpeningTable
                key={color}
                color={color}
                username={username}
                rows={stats.filter((s) => s.color === color)}
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
}: {
  color: Color
  username: string
  rows: OpeningStats[]
}) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? rows : rows.slice(0, TOP_OPENINGS)
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
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
            {shown.map((row) => (
              <tr key={row.family} className="border-t border-slate-800">
                <td className="py-1.5 pr-2">
                  <a
                    href={routeHref({ name: 'game', username, id: row.latestGameId })}
                    title={t('openings.table.latest')}
                    className="text-slate-200 hover:underline"
                  >
                    {row.family}
                  </a>
                </td>
                <td className="py-1.5 text-right tabular-nums">{row.games}</td>
                <td className="py-1.5 text-right whitespace-nowrap text-slate-400 tabular-nums">
                  {row.wins}/{row.draws}/{row.losses}
                </td>
                <td className="py-1.5 text-right tabular-nums">{pct(row.score)}</td>
              </tr>
            ))}
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
