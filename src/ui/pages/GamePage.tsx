import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { sideToMove } from '../../core/analysis/analyzeGame'
import { formatScore, uciToSan } from '../../core/analysis/display'
import { gameAccuracy, whiteWinPercents } from '../../core/analysis/accuracy'
import { tagGame, type Motif } from '../../core/analysis/motifs'
import { hangingPieces } from '../../core/analysis/hanging'
import { keyMoments } from '../../core/analysis/review'
import type { MoveAnalysis } from '../../core/analysis/types'
import type { Color, Game, PlayerInfo } from '../../core/games/model'
import { buildReplay, clocksAt, fenAt, formatClock, type Replay } from '../../core/games/replay'
import { gameSource } from '../../core/api/source'
import { getAnalysis } from '../../db/analyses'
import { filterByDateRange, type GameFilter } from '../../core/games/filter'
import { getGame, getGameFilter } from '../../db/games'
import type { AnalysisRecord } from '../../db/schema'
import { analysisRunner } from '../../engine/runner'
import { formatNumber, formatPercent, t } from '../../i18n'
import { ErrorChips, MotifChips, ProgressBar } from '../analysis'
import { EvalBar } from '../EvalBar'
import { EvalGraph } from '../EvalGraph'
import { MOVE_CLASS_TEXT, MOVE_SYMBOLS, useAnalysisRunner } from '../analysisStyles'
import { playMoveSan } from '../sound'
import {
  endReasonLabel,
  formatDateTime,
  outcomeStyles,
  timeClassLabel,
  timeControlLabel,
} from '../format'
import { routeHref } from '../router'

const LAST_MOVE_STYLE = { backgroundColor: 'rgba(250, 204, 21, 0.45)' }
const BEST_ARROW = 'rgba(16, 185, 129, 0.85)'
const THREAT_STYLE = { boxShadow: 'inset 0 0 0 4px rgba(244, 63, 94, 0.9)' }

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
  const [showArrow, setShowArrow] = useState(true)
  const [showThreats, setShowThreats] = useState(false)
  const review = useMemo(
    () =>
      analysis
        ? {
            wins: whiteWinPercents(analysis),
            accuracy: gameAccuracy(analysis),
            motifs: tagGame(game, replay, analysis),
          }
        : null,
    [analysis, game, replay],
  )
  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(total, next))
    if (clamped !== ply && clamped > 0) {
      const moved = replay.moves[clamped - 1]
      if (moved) playMoveSan(moved.san)
    }
    setPly(clamped)
  }

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
      setPly((p) => {
        const clamped = Math.max(0, Math.min(total, action(p)))
        if (clamped !== p && clamped > 0) {
          const moved = replay.moves[clamped - 1]
          if (moved) playMoveSan(moved.san)
        }
        return clamped
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total, replay.moves])

  const lastMove = ply > 0 ? replay.moves[ply - 1] : undefined
  const fen = fenAt(replay, ply)
  const threats = useMemo(
    () => (showThreats ? [...hangingPieces(fen, 'white'), ...hangingPieces(fen, 'black')] : []),
    [fen, showThreats],
  )
  const squareStyles: Record<string, React.CSSProperties> = lastMove
    ? { [lastMove.from]: LAST_MOVE_STYLE, [lastMove.to]: LAST_MOVE_STYLE }
    : {}
  for (const square of threats) {
    squareStyles[square] = { ...squareStyles[square], ...THREAT_STYLE }
  }
  const clocks = clocksAt(replay, ply)
  const showClocks = game.timeClass !== 'daily'
  const topColor: Color = game.userColor === 'white' ? 'black' : 'white'
  const reason = endReasonLabel(game.endReason)
  // The engine's best move in the position on the board, as an arrow.
  const positionEval = analysis?.positions[ply]
  const bestMove = positionEval && showArrow ? positionEval.bestMove : null
  const arrows = bestMove
    ? [{ startSquare: bestMove.slice(0, 2), endSquare: bestMove.slice(2, 4), color: BEST_ARROW }]
    : []

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full max-w-[592px] flex-col gap-2 self-center lg:self-start">
        <PlayerBar
          player={game[topColor]}
          color={topColor}
          clock={showClocks ? clocks[topColor] : null}
        />
        <div className="flex items-stretch gap-2">
          {positionEval && (
            <EvalBar
              score={positionEval.score}
              sideToMove={sideToMove(fen)}
              orientation={game.userColor}
            />
          )}
          <div className="aspect-square min-w-0 flex-1 touch-none select-none overflow-hidden rounded-md shadow-lg shadow-black/40">
            <Chessboard
              options={{
                id: 'game-viewer',
                position: fen,
                boardOrientation: game.userColor,
                allowDragging: false,
                allowDrawingArrows: true,
                arrows,
                squareStyles,
                animationDurationInMs: 150,
                darkSquareStyle: { backgroundColor: '#769656' },
                lightSquareStyle: { backgroundColor: '#eeeed2' },
              }}
            />
          </div>
        </div>
        <PlayerBar
          player={game[game.userColor]}
          color={game.userColor}
          clock={showClocks ? clocks[game.userColor] : null}
        />
        <Controls ply={ply} total={total} go={go} />
        <label className="flex items-center gap-2 self-start text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showThreats}
            onChange={(e) => setShowThreats(e.target.checked)}
            className="size-4 accent-rose-500"
          />
          {t('viewer.review.threats')}
        </label>
        {showThreats && (
          <p className="text-xs text-slate-500">{t('viewer.review.threatsLegend')}</p>
        )}
        {analysis && review && (
          <>
            <EvalGraph wins={review.wins} moves={analysis.moves} ply={ply} onSelect={go} />
            <label className="flex items-center gap-2 self-start text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showArrow}
                onChange={(e) => setShowArrow(e.target.checked)}
                className="size-4 accent-emerald-500"
              />
              {t('viewer.review.bestArrow')}
            </label>
          </>
        )}
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
            {t(`viewer.open.${gameSource(game.id)}`)} ↗
          </a>
        </div>
        {analysis && review ? (
          <>
            <MoveInsight
              game={game}
              replay={replay}
              analysis={analysis}
              ply={ply}
              motifs={review.motifs}
              accuracy={review.accuracy}
            />
            <KeyMoments game={game} analysis={analysis} motifs={review.motifs} go={go} ply={ply} />
          </>
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
  motifs,
  accuracy,
}: {
  game: Game
  replay: Replay
  analysis: AnalysisRecord
  ply: number
  motifs: Motif[][]
  accuracy: Record<Color, number | null>
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
  const moveMotifs = ply > 0 ? (motifs[ply - 1] ?? []) : []
  const nextBest = position?.bestMove ? uciToSan(fen, position.bestMove) : null

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
      {nextBest && (
        <p className="text-slate-400">{t('viewer.review.nextBest', { move: nextBest })}</p>
      )}
      {moveMotifs.length > 0 && (
        <div className="flex flex-col gap-1">
          <MotifChips motifs={moveMotifs} />
          <p className="text-xs text-slate-400">{t(`motif.desc.${moveMotifs[0] as Motif}`)}</p>
        </div>
      )}
      <div className="flex flex-col gap-1 border-t border-slate-800 pt-2 text-xs">
        {(['white', 'black'] as const).map((color) => (
          <p key={color} className="flex items-center justify-between gap-2">
            <span className={color === game.userColor ? 'text-slate-200' : 'text-slate-400'}>
              {game[color].username}
            </span>
            <span className="flex items-center gap-3">
              {accuracy[color] !== null && (
                <span className="text-slate-300 tabular-nums">
                  {t('viewer.review.accuracy', { value: formatNumber(accuracy[color] ?? 0, 1) })}
                </span>
              )}
              <ErrorChips counts={analysis.summary[color]} />
            </span>
          </p>
        ))}
        <p className="text-slate-500">{t('viewer.analysis.engine', { depth: analysis.depth })}</p>
      </div>
    </div>
  )
}

/** The user's biggest mistakes of the game, each a button that jumps to the move. */
function KeyMoments({
  game,
  analysis,
  motifs,
  ply,
  go,
}: {
  game: Game
  analysis: AnalysisRecord
  motifs: Motif[][]
  ply: number
  go: (ply: number) => void
}) {
  const moments = keyMoments(analysis.moves, game.userColor)
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
      <h2 className="font-semibold">{t('viewer.review.keyMoments')}</h2>
      {moments.length === 0 ? (
        <p className="text-slate-400">{t('viewer.review.noKeyMoments')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {moments.map((m) => {
            const motif = motifs[m.ply - 1]?.[0]
            return (
              <li key={m.ply}>
                <button
                  type="button"
                  onClick={() => go(m.ply)}
                  aria-pressed={ply === m.ply}
                  className={`flex w-full flex-wrap items-baseline gap-x-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-800 ${
                    ply === m.ply ? 'bg-slate-800' : ''
                  }`}
                >
                  <span className="font-mono">
                    {Math.ceil(m.ply / 2)}
                    {m.color === 'white' ? '.' : '…'} {m.san}
                    <span className={MOVE_CLASS_TEXT[m.moveClass]}>
                      {MOVE_SYMBOLS[m.moveClass]}
                    </span>
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    {formatPercent(m.winBefore / 100)} → {formatPercent(m.winAfter / 100)}
                  </span>
                  {motif && <span className="text-xs text-amber-200">{t(`motif.${motif}`)}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
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
