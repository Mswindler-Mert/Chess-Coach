import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChessComError } from '../../core/api/chesscom'
import type { SyncProgress } from '../../core/api/sync'
import { normalizeUsername } from '../../core/api/username'
import {
  ALL_TIME_CLASSES,
  applyGameFilter,
  countByTimeClass,
  DATE_RANGES,
  filterByDateRange,
  FEW_GAMES_THRESHOLD,
  toggleTimeClass,
  type DateRange,
} from '../../core/games/filter'
import { opponentOf, type Game, type TimeClass } from '../../core/games/model'
import {
  getDateRange,
  getTimeClasses,
  lastSyncedAt,
  listGames,
  setDateRange,
  setLastUsername,
  setTimeClasses,
  syncUserGames,
} from '../../db/games'
import {
  DEPTH_OPTIONS,
  getAnalysisDepth,
  getAutoAnalyze,
  listAnalysisSummaries,
  setAnalysisDepth,
  setAutoAnalyze,
  type AnalysisSummary,
} from '../../db/analyses'
import { analysisRunner } from '../../engine/runner'
import { formatNumber, t, type MessageKey } from '../../i18n'
import { ErrorChips, ProgressBar } from '../analysis'
import { useAnalysisRunner } from '../analysisStyles'
import {
  formatDate,
  formatDateTime,
  outcomeStyles,
  timeClassLabel,
  timeControlLabel,
} from '../format'
import { autoAnalyzeAfterSync } from '../background'
import { routeHref } from '../router'

const PAGE_SIZE = 50

type SyncState =
  | { status: 'running'; progress: SyncProgress | null }
  | { status: 'done' }
  | { status: 'error'; message: MessageKey }

function errorMessage(error: unknown): MessageKey {
  if (error instanceof ChessComError) {
    if (error.kind === 'not-found') return 'sync.error.notFound'
    if (error.kind === 'rate-limited') return 'sync.error.rateLimited'
    if (error.kind === 'network') return 'sync.error.network'
  }
  return 'sync.error.other'
}

export function GamesPage({ username: rawUsername }: { username: string }) {
  const username = normalizeUsername(rawUsername)
  if (!username) {
    return <p className="text-rose-400">{t('home.username.invalid')}</p>
  }
  return <GamesView username={username} />
}

function GamesView({ username }: { username: string }) {
  const [games, setGames] = useState<Game[] | null>(null)
  const [timeClasses, setSelected] = useState<TimeClass[] | null>(null)
  const [dateRange, setRange] = useState<DateRange | null>(null)
  // One reference time per visit, so the list does not shift while it is open.
  const [now] = useState(() => Date.now())
  const [sync, setSync] = useState<SyncState>({ status: 'running', progress: null })
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [summaries, setSummaries] = useState<Map<string, AnalysisSummary>>(new Map())
  useEffect(() => {
    const load = () => void listAnalysisSummaries(username).then(setSummaries)
    load()
    return analysisRunner.onSaved(load)
  }, [username])

  const reload = useCallback(
    () =>
      Promise.all([listGames(username), lastSyncedAt(username)]).then(([list, at]) => {
        setGames(list)
        setSyncedAt(at)
      }),
    [username],
  )

  // State starts as "running", so the first sync on mount needs no synchronous setState.
  const runSync = useCallback(() => {
    syncUserGames(username, (progress) => {
      setSync({ status: 'running', progress })
      void reload()
    })
      .then(async () => {
        await setLastUsername(username)
        await reload()
        setSync({ status: 'done' })
      })
      .catch((error: unknown) => setSync({ status: 'error', message: errorMessage(error) }))
      // New (or, offline, already stored) games get analysed if automatic analysis is on.
      .finally(() => void autoAnalyzeAfterSync(username))
  }, [username, reload])

  useEffect(() => {
    void getTimeClasses().then(setSelected)
    void getDateRange().then(setRange)
    void reload()
    runSync()
  }, [reload, runSync])

  function onRefresh() {
    setSync({ status: 'running', progress: null })
    runSync()
  }

  // Tempo counts follow the date range, so each button says what it would add.
  const counts = useMemo(
    () => countByTimeClass(games && dateRange ? filterByDateRange(games, dateRange, now) : []),
    [games, dateRange, now],
  )
  const visible = useMemo(
    () =>
      games && timeClasses && dateRange
        ? applyGameFilter(games, { timeClasses, dateRange }, now)
        : [],
    [games, timeClasses, dateRange, now],
  )
  const fewGames =
    dateRange !== null &&
    dateRange !== 'all' &&
    visible.length > 0 &&
    visible.length < FEW_GAMES_THRESHOLD

  function onRange(range: DateRange) {
    setRange(range)
    setLimit(PAGE_SIZE)
    // Games that just entered the filter get analysed too (if automatic analysis is on).
    void setDateRange(range).then(() => autoAnalyzeAfterSync(username))
  }

  function onToggle(tc: TimeClass) {
    if (!timeClasses) return
    const next = toggleTimeClass(timeClasses, tc)
    setSelected(next)
    setLimit(PAGE_SIZE)
    void setTimeClasses(next).then(() => autoAnalyzeAfterSync(username))
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t('games.title', { username })}</h1>
          <div className="flex flex-wrap gap-2">
            <a
              href={routeHref({ name: 'hanging', username })}
              className="grid min-h-10 place-items-center rounded-lg border border-emerald-600 px-4 text-sm font-semibold text-emerald-200 hover:border-emerald-400"
            >
              {t('hanging.open')}
            </a>
            <a
              href={routeHref({ name: 'endgames', username })}
              className="grid min-h-10 place-items-center rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-100 hover:border-slate-400"
            >
              {t('endgame.open')}
            </a>
            <a
              href={routeHref({ name: 'openings', username })}
              className="grid min-h-10 place-items-center rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-100 hover:border-slate-400"
            >
              {t('openings.open')}
            </a>
            <a
              href={routeHref({ name: 'dashboard', username })}
              className="grid min-h-10 place-items-center rounded-lg border border-slate-600 px-4 text-sm font-semibold text-slate-100 hover:border-slate-400"
            >
              {t('dashboard.open')}
            </a>
            <a
              href={routeHref({ name: 'puzzles', username })}
              className="grid min-h-10 place-items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              ♞ {t('puzzles.open')}
            </a>
          </div>
        </div>
        <SyncStatus sync={sync} syncedAt={syncedAt} username={username} onRefresh={onRefresh} />
      </header>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm text-slate-400">{t('games.filter.label')}</legend>
        <div className="flex flex-wrap gap-2">
          {ALL_TIME_CLASSES.map((tc) => {
            const active = timeClasses?.includes(tc) ?? false
            return (
              <button
                key={tc}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(tc)}
                className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
                  active
                    ? 'border-emerald-500 bg-emerald-600/20 text-emerald-200'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {timeClassLabel(tc)} <span className="opacity-70">{counts[tc]}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm text-slate-400">{t('games.range.label')}</legend>
        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map((range) => {
            const active = dateRange === range
            return (
              <button
                key={range}
                type="button"
                aria-pressed={active}
                onClick={() => onRange(range)}
                className={`min-h-10 rounded-full border px-4 text-sm font-medium ${
                  active
                    ? 'border-emerald-500 bg-emerald-600/20 text-emerald-200'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {t(`games.range.${range}`)}
              </button>
            )
          })}
        </div>
        {fewGames && (
          <p className="text-sm text-amber-300" role="note">
            {t('games.range.fewGames')}
          </p>
        )}
      </fieldset>

      {games && timeClasses && dateRange && (
        <AnalysisPanel username={username} games={games} eligible={visible} summaries={summaries} />
      )}

      {games && (
        <p className="text-sm text-slate-400">
          {t('games.count', { shown: visible.length, total: games.length })}
        </p>
      )}

      {games && visible.length === 0 && sync.status !== 'running' && (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">
          {games.length === 0 ? t('games.empty') : t('games.emptyFiltered')}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {visible.slice(0, limit).map((game) => (
          <li key={game.id}>
            <GameRow game={game} username={username} summary={summaries.get(game.id)} />
          </li>
        ))}
      </ul>

      {visible.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          className="min-h-11 rounded-lg border border-slate-700 text-slate-200 hover:border-slate-500"
        >
          {t('games.showMore')}
        </button>
      )}
    </div>
  )
}

function SyncStatus({
  sync,
  syncedAt,
  username,
  onRefresh,
}: {
  sync: SyncState
  syncedAt: number | null
  username: string
  onRefresh: () => void
}) {
  if (sync.status === 'running') {
    const { progress } = sync
    const pct = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0
    return (
      <div className="flex flex-col gap-2" role="status">
        <p className="text-sm text-slate-300">
          {t('sync.running')}{' '}
          {progress && progress.total > 0 && (
            <span className="text-slate-400">{t('sync.progress', { ...progress })}</span>
          )}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {sync.status === 'error' ? (
        <p className="text-rose-400" role="alert">
          {t(sync.message, { username })}
        </p>
      ) : (
        <p className="text-slate-400">
          {t('sync.upToDate')}{' '}
          {syncedAt !== null && t('sync.lastSynced', { time: formatDateTime(syncedAt) })}
        </p>
      )}
      <button
        type="button"
        onClick={onRefresh}
        className="text-emerald-400 underline-offset-2 hover:underline"
      >
        {t('sync.refresh')}
      </button>
    </div>
  )
}

function AnalysisPanel({
  username,
  games,
  eligible,
  summaries,
}: {
  username: string
  games: Game[]
  /** Games in the selected tempos: the ones analysis covers. */
  eligible: Game[]
  summaries: Map<string, AnalysisSummary>
}) {
  const runner = useAnalysisRunner()
  const [depth, setDepth] = useState<number | null>(null)
  const [auto, setAuto] = useState<boolean | null>(null)
  useEffect(() => {
    void getAutoAnalyze().then(setAuto)
  }, [])
  useEffect(() => {
    void getAnalysisDepth().then(setDepth)
  }, [])

  const analyzed = eligible.filter((g) => summaries.has(g.id)).length
  const running = runner.status === 'running' && runner.username === username
  const current = running ? runner.current : null
  const currentGame = current ? games.find((g) => g.id === current.gameId) : undefined
  const allDone = analyzed === eligible.length

  function onDepth(value: number) {
    setDepth(value)
    void setAnalysisDepth(value)
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t('analysis.title')}</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            {t('analysis.depth')}
            <select
              value={depth ?? ''}
              disabled={depth === null}
              onChange={(e) => onDepth(Number(e.target.value))}
              className="min-h-10 rounded-lg border border-slate-700 bg-slate-950 px-2 text-slate-100"
            >
              {DEPTH_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          {running ? (
            <button
              type="button"
              onClick={() => analysisRunner.pause()}
              className="min-h-10 rounded-lg border border-slate-600 px-4 text-sm font-medium hover:border-slate-400"
            >
              {t('analysis.pause')}
            </button>
          ) : (
            <button
              type="button"
              disabled={allDone}
              onClick={() => analysisRunner.start(username)}
              className="min-h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {t('analysis.start')}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-300">
        {allDone && eligible.length > 0
          ? t('analysis.allDone')
          : t('analysis.progress', { analyzed, total: eligible.length })}
      </p>
      <ProgressBar value={eligible.length ? analyzed / eligible.length : 0} />

      {running && (
        <div className="flex flex-col gap-1.5" role="status">
          <p className="text-sm text-slate-400">
            {current && currentGame
              ? t('analysis.running', {
                  opponent: opponentOf(currentGame).username,
                  done: current.done,
                  total: current.total,
                })
              : t('analysis.starting')}
          </p>
          {current && <ProgressBar value={current.done / current.total} />}
        </div>
      )}

      {runner.status === 'error' && (
        <p className="text-sm text-rose-400" role="alert">
          {t('analysis.error', { message: runner.error ?? '' })}
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={auto ?? false}
          disabled={auto === null}
          onChange={(e) => {
            const on = e.target.checked
            setAuto(on)
            void setAutoAnalyze(on)
            if (on) analysisRunner.start(username)
          }}
          className="size-4 accent-emerald-500"
        />
        {t('analysis.auto')}
      </label>
      <p className="text-xs text-slate-500">{t('analysis.hint')}</p>
    </section>
  )
}

function GameRow({
  game,
  username,
  summary,
}: {
  game: Game
  username: string
  summary: AnalysisSummary | undefined
}) {
  const opponent = opponentOf(game)
  return (
    <a
      href={routeHref({ name: 'game', username, id: game.id })}
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3 hover:border-slate-600"
    >
      <span
        title={t(`outcome.${game.outcome}`)}
        className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${outcomeStyles[game.outcome]}`}
      >
        {t(`outcome.short.${game.outcome}`)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span
            aria-label={t(`color.${game.userColor}`)}
            title={t(`color.${game.userColor}`)}
            className={`inline-block size-3 shrink-0 rounded-sm border border-slate-500 ${
              game.userColor === 'white' ? 'bg-slate-100' : 'bg-slate-950'
            }`}
          />
          <span className="truncate font-medium">
            {opponent.username} <span className="text-slate-400">({opponent.rating})</span>
          </span>
        </div>
        <p className="truncate text-xs text-slate-400">{game.opening?.name ?? '—'}</p>
        {summary && (
          <span className="flex items-center gap-3">
            {summary.accuracy[game.userColor] !== null && (
              <span className="text-xs text-slate-300 tabular-nums">
                {t('viewer.review.accuracy', {
                  value: formatNumber(summary.accuracy[game.userColor] ?? 0, 0),
                })}
              </span>
            )}
            <ErrorChips counts={summary.counts[game.userColor]} />
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-slate-400">
        <span>
          {timeClassLabel(game.timeClass)} · {timeControlLabel(game.timeControl)}
          {!game.rated && ` · ${t('games.unrated')}`}
        </span>
        <span>
          {formatDate(game.endTime)}
          {game.plies !== null && ` · ${t('games.moves', { count: Math.ceil(game.plies / 2) })}`}
        </span>
      </div>
    </a>
  )
}
