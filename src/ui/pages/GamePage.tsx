import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { sideToMove } from '../../core/analysis/analyzeGame'
import { formatScore, uciToSan } from '../../core/analysis/display'
import type { MoveAnalysis } from '../../core/analysis/types'
import type { Color, Game, PlayerInfo } from '../../core/games/model'
import { buildReplay, clocksAt, fenAt, formatClock, type Replay } from '../../core/games/replay'
import { getAnalysis } from '../../db/analyses'
import { filterByDateRange, type GameFilter } from '../../core/games/filter'
import { getGame, getGameFilter } from '../../db/games'
import type { AnalysisRecord } from '../../db/schema'
import { analysisRunner } from '../../engine/runner'
import { t } from '../../i18n'
import { ErrorChips, ProgressBar } from '../analysis'
import { MOVE_CLASS_TEXT, MOVE_SYMBOLS, useAnalysisRunner } from '../analysisStyles'
import {
  endReasonLabel,
  formatDateTime,
  outcomeStyles,
  timeClassLabel,
  timeControlLabel,
} from '../format'
import { routeHref } from '../router'

const LAST_MOVE_STYLE = { backgroundColor: 'rgba(250, 204, 21, 0.45)' }

export function GamePage({
  username,
  id,
  initialPly = 0,
}: {
  username: string
  id: string
  /** Half-move to show first, e.g. the mistake a puzzle came from. */
  initialPly?: number
}) {
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
      <Viewer game={game} initialPly={initialPly} />
    </div>
  )
}

function Viewer({ game, initialPly }: { game: Game; initialPly: number }) {
  const replay = useMemo<Replay | null>(() => {
    try {
      return buildReplay(game.pgn)
    } catch {
      return null
    }
  }, [game.pgn])

  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null)
  useEffect(() => {
    const load = () => void getAnalysis(game.id).then((record) => setAnalysis(record ?? null))
    load()
    return analysisRunner.onSaved(load)
  }, [game.id])

  if (!replay) return <p className="text-rose-400">{t('viewer.parseError')}</p>
  // Ignore an analysis that does not match the moves (should not happen, but never mislabel).
  const matching = analysis && analysis.moves.length === replay.moves.length ? analysis : null
  return <ReplayView game={game} replay={replay} analysis={matching} initialPly={initialPly} />
}

function ReplayView({
  game,
  replay,
  analysis,
  initialPly,
}: {
  game: Game
  replay: Replay
  analysis: AnalysisRecord | null
  initialPly: number
}) {
  const total = replay.moves.length
  const [ply, setPly] = useState(() => Math.max(0, Math.min(total, initialPly)))
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
        {analysis ? (
          <MoveInsight game={game} replay={replay} analysis={analysis} ply={ply} />
        ) : (
          <AnalyzePrompt game={game} />
        )}
        <MoveList replay={replay} moves={analysis?.moves ?? null} ply={ply} go={go} />
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

function MoveInsight({
  game,
  replay,
  analysis,
  ply,
}: {
  game: Game
  replay: Replay
  analysis: AnalysisRecord
  ply: number
}) {
  const position = analysis.positions[ply]
  const fen = fenAt(replay, ply)
  const move = ply > 0 ? analysis.moves[ply - 1] : undefined
  const before = ply > 0 ? analysis.positions[ply - 1] : undefined
  const isError =
    move?.moveClass === 'inaccuracy' ||
    move?.moveClass === 'mistake' ||
    move?.moveClass === 'blunder'
  const better =
    isError && before?.bestMove ? uciToSan(fenAt(replay, ply - 1), before.bestMove) : null
  const moveNumber = Math.ceil(ply / 2)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {move ? (
          <p className="font-medium">
            <span className="font-mono">
              {moveNumber}
              {move.color === 'white' ? '.' : '…'} {move.san}
            </span>{' '}
            <span className={MOVE_CLASS_TEXT[move.moveClass]}>
              {t(`moveClass.${move.moveClass}`)}
            </span>
            <span className="text-slate-500"> · {t(`phase.${move.phase}`)}</span>
          </p>
        ) : (
          <p className="font-medium">{t('viewer.analysis.startPosition')}</p>
        )}
        {position && (
          <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono tabular-nums">
            {t('viewer.analysis.eval', { score: formatScore(position.score, sideToMove(fen)) })}
          </span>
        )}
      </div>
      {move && (
        <p className="text-slate-400">
          {t('viewer.analysis.winChance', {
            color: t(`color.${move.color}`),
            before: Math.round(move.winBefore),
            after: Math.round(move.winAfter),
          })}
        </p>
      )}
      {better && (
        <p className="text-emerald-300">{t('viewer.analysis.better', { move: better })}</p>
      )}
      <div className="flex flex-col gap-1 border-t border-slate-800 pt-2 text-xs">
        {(['white', 'black'] as const).map((color) => (
          <p key={color} className="flex items-center justify-between gap-2">
            <span className={color === game.userColor ? 'text-slate-200' : 'text-slate-400'}>
              {game[color].username}
            </span>
            <ErrorChips counts={analysis.summary[color]} />
          </p>
        ))}
        <p className="text-slate-500">{t('viewer.analysis.engine', { depth: analysis.depth })}</p>
      </div>
    </div>
  )
}

function AnalyzePrompt({ game }: { game: Game }) {
  const runner = useAnalysisRunner()
  const [filter, setFilter] = useState<GameFilter | null>(null)
  const [now] = useState(() => Date.now())
  useEffect(() => {
    void getGameFilter().then(setFilter)
  }, [])

  const current = runner.status === 'running' ? runner.current : null
  const isRunning = current?.gameId === game.id
  // Analysis only covers games matching the shared filter, so explain which part excludes this one.
  const tempoOk = filter?.timeClasses.includes(game.timeClass) ?? false
  const rangeOk = filter ? filterByDateRange([game], filter.dateRange, now).length > 0 : false

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
      {isRunning && current ? (
        <div className="flex flex-col gap-1.5" role="status">
          <p className="text-slate-300">
            {t('viewer.analysis.running', { done: current.done, total: current.total })}
          </p>
          <ProgressBar value={current.done / current.total} />
        </div>
      ) : (
        <>
          <p className="text-slate-300">{t('viewer.analysis.none')}</p>
          {filter &&
            (tempoOk && rangeOk ? (
              <button
                type="button"
                onClick={() => analysisRunner.start(game.username, game.id)}
                className="min-h-10 self-start rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500"
              >
                {t('viewer.analysis.analyze')}
              </button>
            ) : (
              <p className="text-slate-400">
                {tempoOk
                  ? t('viewer.analysis.outOfRange', { range: t(`games.range.${filter.dateRange}`) })
                  : t('viewer.analysis.filteredOut', { tempo: timeClassLabel(game.timeClass) })}
              </p>
            ))}
        </>
      )}
      {runner.status === 'error' && (
        <p className="text-rose-400" role="alert">
          {t('analysis.error', { message: runner.error ?? '' })}
        </p>
      )}
    </div>
  )
}

function symbolFor(moves: MoveAnalysis[] | null, ply: number, active: boolean) {
  const move = moves?.[ply - 1]
  const symbol = move && MOVE_SYMBOLS[move.moveClass]
  if (!move || !symbol) return null
  return (
    <span className={`ml-0.5 font-bold ${active ? 'text-white' : MOVE_CLASS_TEXT[move.moveClass]}`}>
      {symbol}
    </span>
  )
}

function MoveList({
  replay,
  moves,
  ply,
  go,
}: {
  replay: Replay
  moves: MoveAnalysis[] | null
  ply: number
  go: (ply: number) => void
}) {
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
                {symbolFor(moves, cell.ply, cell.ply === ply)}
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
