import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChessComError } from '../../core/api/chesscom'
import type { SyncProgress } from '../../core/api/sync'
import { normalizeUsername } from '../../core/api/username'
import {
  ALL_TIME_CLASSES,
  countByTimeClass,
  filterGames,
  toggleTimeClass,
} from '../../core/games/filter'
import { opponentOf, type Game, type TimeClass } from '../../core/games/model'
import {
  getTimeClasses,
  lastSyncedAt,
  listGames,
  setLastUsername,
  setTimeClasses,
  syncUserGames,
} from '../../db/games'
import { t, type MessageKey } from '../../i18n'
import {
  formatDate,
  formatDateTime,
  outcomeStyles,
  timeClassLabel,
  timeControlLabel,
} from '../format'
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
  const [sync, setSync] = useState<SyncState>({ status: 'running', progress: null })
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const [limit, setLimit] = useState(PAGE_SIZE)

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
  }, [username, reload])

  useEffect(() => {
    void getTimeClasses().then(setSelected)
    void reload()
    runSync()
  }, [reload, runSync])

  function onRefresh() {
    setSync({ status: 'running', progress: null })
    runSync()
  }

  const counts = useMemo(() => countByTimeClass(games ?? []), [games])
  const visible = useMemo(
    () => (games && timeClasses ? filterGames(games, timeClasses) : []),
    [games, timeClasses],
  )

  function onToggle(tc: TimeClass) {
    if (!timeClasses) return
    const next = toggleTimeClass(timeClasses, tc)
    setSelected(next)
    setLimit(PAGE_SIZE)
    void setTimeClasses(next)
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('games.title', { username })}</h1>
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
            <GameRow game={game} username={username} />
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

function GameRow({ game, username }: { game: Game; username: string }) {
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
