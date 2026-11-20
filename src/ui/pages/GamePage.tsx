import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Color, Game, PlayerInfo } from '../../core/games/model'
import { buildReplay, clocksAt, fenAt, formatClock, type Replay } from '../../core/games/replay'
import { getGame } from '../../db/games'
import { t } from '../../i18n'
import {
  endReasonLabel,
  formatDateTime,
  outcomeStyles,
  timeClassLabel,
  timeControlLabel,
} from '../format'
import { routeHref } from '../router'

const LAST_MOVE_STYLE = { backgroundColor: 'rgba(250, 204, 21, 0.45)' }

export function GamePage({ username, id }: { username: string; id: string }) {
  const [game, setGame] = useState<Game | null | undefined>(undefined)

  useEffect(() => {
    getGame(id).then(
      (g) => setGame(g ?? null),
      () => setGame(null),
    )
  }, [id])

  const back = (
    <a
      href={routeHref({ name: 'games', username })}
      className="self-start text-sm text-emerald-400 hover:underline"
    >
      ← {t('nav.backToGames')}
    </a>
  )

  if (game === undefined) return <p className="text-slate-400">{t('viewer.loading')}</p>
  if (game === null) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p className="text-rose-400">{t('viewer.notFound')}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {back}
      <Viewer game={game} />
    </div>
  )
}

function Viewer({ game }: { game: Game }) {
  const replay = useMemo<Replay | null>(() => {
    try {
      return buildReplay(game.pgn)
    } catch {
      return null
    }
  }, [game.pgn])

  if (!replay) return <p className="text-rose-400">{t('viewer.parseError')}</p>
  return <ReplayView game={game} replay={replay} />
}

function ReplayView({ game, replay }: { game: Game; replay: Replay }) {
  const total = replay.moves.length
  const [ply, setPly] = useState(0)
  const go = (next: number) => setPly(Math.max(0, Math.min(total, next)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.altKey || e.ctrlKey || e.metaKey) return
      const actions: Record<string, (p: number) => number> = {
        ArrowLeft: (p) => p - 1,
        ArrowRight: (p) => p + 1,
        Home: () => 0,
        End: () => total,
      }
      const action = actions[e.key]
      if (!action) return
      e.preventDefault()
      setPly((p) => Math.max(0, Math.min(total, action(p))))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  const lastMove = ply > 0 ? replay.moves[ply - 1] : undefined
  const squareStyles = lastMove
    ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE }
    : {}
  const clocks = clocksAt(replay, ply)
  const showClocks = game.timeClass !== 'daily'
  const topColor: Color = game.userColor === 'white' ? 'black' : 'white'
  const reason = endReasonLabel(game.endReason)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full max-w-[560px] flex-col gap-2 self-center lg:self-start">
        <PlayerBar
          player={game[topColor]}
          color={topColor}
          clock={showClocks ? clocks[topColor] : null}
        />
        <div className="aspect-square w-full touch-none select-none">
          <Chessboard
            options={{
              id: 'game-viewer',
              position: fenAt(replay, ply),
              boardOrientation: game.userColor,
              allowDragging: false,
              allowDrawingArrows: true,
              squareStyles,
              animationDurationInMs: 150,
              darkSquareStyle: { backgroundColor: '#769656' },
              lightSquareStyle: { backgroundColor: '#eeeed2' },
            }}
          />
        </div>
        <PlayerBar
          player={game[game.userColor]}
          color={game.userColor}
          clock={showClocks ? clocks[game.userColor] : null}
        />
        <Controls ply={ply} total={total} go={go} />
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold ${outcomeStyles[game.outcome]}`}
            >
              {t(`outcome.${game.outcome}`)}
            </span>
            {reason && <span className="text-slate-300">{reason}</span>}
          </div>
          <p className="text-slate-400">
            {timeClassLabel(game.timeClass)} · {timeControlLabel(game.timeControl)} ·{' '}
            {formatDateTime(game.endTime)}
          </p>
          {game.opening && <p className="text-slate-300">{game.opening.name}</p>}
          <a
            href={game.url}
            target="_blank"
            rel="noreferrer"
            className="self-start text-emerald-400 hover:underline"
          >
            {t('viewer.openOnChessCom')} ↗
          </a>
        </div>
        <MoveList replay={replay} ply={ply} go={go} />
        <p className="hidden text-xs text-slate-500 sm:block">{t('viewer.keyboardHint')}</p>
      </aside>
    </div>
  )
}

function PlayerBar({
  player,
  color,
  clock,
}: {
  player: PlayerInfo
  color: Color
  clock: number | null
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-label={t(`color.${color}`)}
          className={`inline-block size-3 shrink-0 rounded-sm border border-slate-500 ${
            color === 'white' ? 'bg-slate-100' : 'bg-slate-950'
          }`}
        />
        <span className="truncate font-medium">{player.username}</span>
        <span className="text-slate-400">({player.rating})</span>
      </span>
      {clock !== null && (
        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono tabular-nums">
          {formatClock(clock)}
        </span>
      )}
    </div>
  )
}

function Controls({ ply, total, go }: { ply: number; total: number; go: (ply: number) => void }) {
  const buttons = [
    { label: t('viewer.first'), icon: '⏮', target: 0, disabled: ply === 0 },
    { label: t('viewer.prev'), icon: '◀', target: ply - 1, disabled: ply === 0 },
    { label: t('viewer.next'), icon: '▶', target: ply + 1, disabled: ply === total },
    { label: t('viewer.last'), icon: '⏭', target: total, disabled: ply === total },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          aria-label={b.label}
          title={b.label}
          disabled={b.disabled}
          onClick={() => go(b.target)}
          className="min-h-11 rounded-lg bg-slate-800 text-lg hover:bg-slate-700 disabled:opacity-40"
        >
          {b.icon}
        </button>
      ))}
    </div>
  )
}

function MoveList({ replay, ply, go }: { replay: Replay; ply: number; go: (ply: number) => void }) {
  const listRef = useRef<HTMLOListElement>(null)
  // Scroll only the move list (not the page) so the current move stays visible.
  const scrollToActive = (el: HTMLButtonElement | null) => {
    const list = listRef.current
    if (!el || !list) return
    const top = el.offsetTop
    const bottom = top + el.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight
    }
  }

  const blackStarts = replay.startFen.split(' ')[1] === 'b'
  const startMoveNumber = Number(replay.startFen.split(' ')[5] ?? '1') || 1
  // Pad with an empty white slot when black moves first, so rows stay aligned.
  const cells: ({ san: string; ply: number } | null)[] = [
    ...(blackStarts ? [null] : []),
    ...replay.moves.map((m, i) => ({ san: m.san, ply: i + 1 })),
  ]
  const rows: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2))

  return (
    <ol
      ref={listRef}
      className="relative grid max-h-72 grid-cols-[2.5rem_1fr_1fr] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-2 text-sm lg:max-h-[480px]"
    >
      {rows.map((row, r) => (
        <li key={r} className="contents">
          <span className="py-1 pr-2 text-right text-slate-500">{startMoveNumber + r}.</span>
          {row.map((cell, c) =>
            cell ? (
              <button
                key={c}
                ref={cell.ply === ply ? scrollToActive : undefined}
                type="button"
                onClick={() => go(cell.ply)}
                className={`rounded px-2 py-1 text-left font-mono ${
                  cell.ply === ply ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
                }`}
              >
                {cell.san}
              </button>
            ) : (
              <span key={c} className="px-2 py-1 text-slate-600">
                …
              </span>
            ),
          )}
        </li>
      ))}
    </ol>
  )
}
