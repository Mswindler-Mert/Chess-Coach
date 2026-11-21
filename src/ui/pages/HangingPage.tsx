import { Chess, type Square } from 'chess.js'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { describeMove } from '../../core/analysis/explainMove'
import { cheapestCapturer, type ThreatCapture } from '../../core/analysis/hanging'
import { normalizeUsername } from '../../core/api/username'
import type { Color } from '../../core/games/model'
import {
  intervalDays,
  planPuzzles,
  recordAttempt,
  type PuzzleProgress,
} from '../../core/training/leitner'
import {
  checkSquares,
  type HangingDrill,
  type SquareCheck,
} from '../../core/training/hangingDrills'
import { recordActivity } from '../../db/daily'
import { loadHangingDrills } from '../../db/hanging'
import { listPuzzleProgress, savePuzzleProgress } from '../../db/puzzles'
import { t } from '../../i18n'
import { formatDate } from '../format'
import { formatMoveAction, formatPlayedSentence, formatThreatSentence } from '../moveText'
import { routeHref } from '../router'
import { playSound } from '../sound'

const ring = (color: string): CSSProperties => ({ boxShadow: `inset 0 0 0 4px ${color}` })
const LAST_MOVE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.35)' }
const SELECTED = ring('rgba(250, 204, 21, 0.95)')
const FOUND = ring('rgba(16, 185, 129, 0.95)')
const MISSED = ring('rgba(244, 63, 94, 0.95)')
const WRONG = ring('rgba(251, 146, 60, 0.95)')
const ARROW_THREAT = 'rgba(244, 63, 94, 0.9)'
const ARROW_GOOD = 'rgba(16, 185, 129, 0.9)'

export function HangingPage({ username: rawUsername }: { username: string }) {
  const username = normalizeUsername(rawUsername)
  if (!username) return <p className="text-rose-400">{t('home.username.invalid')}</p>
  return <HangingTrainer username={username} />
}

function HangingTrainer({ username }: { username: string }) {
  const [now] = useState(() => Date.now())
  const [drills, setDrills] = useState<HangingDrill[] | null>(null)
  const [progress, setProgress] = useState<Map<string, PuzzleProgress> | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [session, setSession] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    void Promise.all([loadHangingDrills(username, now), listPuzzleProgress(username)]).then(
      ([list, saved]) => {
        setDrills(list)
        setProgress(saved)
      },
    )
  }, [username, now])

  const plan = useMemo(
    () => (drills && progress ? planPuzzles(drills, progress, now) : null),
    [drills, progress, now],
  )
  const current = (currentId && drills?.find((d) => d.id === currentId)) || plan?.queue[0] || null

  function onAnswered(drill: HangingDrill, correct: boolean) {
    playSound(correct ? 'correct' : 'wrong')
    void recordActivity()
    setCurrentId(drill.id)
    setSession((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    const next = recordAttempt(
      progress?.get(drill.id),
      { puzzleId: drill.id, username },
      correct,
      Date.now(),
    )
    setProgress((map) => new Map(map).set(drill.id, next))
    void savePuzzleProgress(next)
  }

  const back = (
    <a
      href={routeHref({ name: 'games', username })}
      className="self-start text-sm text-emerald-400 hover:underline"
    >
      ← {t('nav.backToGames')}
    </a>
  )

  if (!drills || !plan) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p className="text-slate-400">{t('hanging.loading')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('hanging.title')}</h1>
        <p className="text-sm text-slate-400">
          {t('puzzles.queue', { due: plan.due, fresh: plan.fresh })}
          {session.total > 0 && ` · ${t('puzzles.session', session)}`}
        </p>
        <p className="text-sm text-slate-400">{t('hanging.intro')}</p>
      </header>

      {current ? (
        <Drill
          key={current.id}
          drill={current}
          username={username}
          box={currentId === current.id ? progress?.get(current.id)?.box : undefined}
          onAnswered={onAnswered}
          onNext={() => setCurrentId(null)}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">
          <p>
            {drills.length === 0
              ? t('hanging.empty')
              : t('puzzles.empty.done', { waiting: plan.waiting })}
          </p>
          <a
            href={routeHref({ name: 'games', username })}
            className="self-start text-emerald-400 hover:underline"
          >
            {t('puzzles.goToGames')}
          </a>
        </div>
      )}
    </div>
  )
}

function pieceName(fen: string, square: string): string {
  const piece = new Chess(fen).get(square as Square)
  return piece ? t(`piece.${piece.type}` as Parameters<typeof t>[0]) : ''
}

function Drill({
  drill,
  username,
  box,
  onAnswered,
  onNext,
}: {
  drill: HangingDrill
  username: string
  box: number | undefined
  onAnswered: (drill: HangingDrill, correct: boolean) => void
  onNext: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [result, setResult] = useState<SquareCheck | null>(null)
  const [viewMode, setViewMode] = useState<'threat' | 'better'>('threat')

  const enemy: Color = drill.color === 'white' ? 'black' : 'white'
  const playedMove = useMemo(
    () => describeMove(drill.fenBefore, drill.playedUci),
    [drill.fenBefore, drill.playedUci],
  )
  const bestMove = useMemo(
    () => (drill.bestUci ? describeMove(drill.fenBefore, drill.bestUci) : null),
    [drill.fenBefore, drill.bestUci],
  )
  const threats = useMemo(() => {
    const attacker: Color = drill.kind === 'own' ? enemy : drill.color
    return drill.answer
      .map((sq) => cheapestCapturer(drill.fen, sq, attacker))
      .filter((item): item is ThreatCapture => item !== null)
  }, [drill.answer, drill.color, drill.fen, drill.kind, enemy])

  function toggle(square: string, hasPiece: boolean) {
    if (result || !hasPiece) return
    setSelected((list) =>
      list.includes(square) ? list.filter((s) => s !== square) : [...list, square],
    )
  }

  function check(picks: string[]) {
    const outcome = checkSquares(picks, drill.answer)
    setResult(outcome)
    onAnswered(drill, outcome.correct)
  }

  const showingBetter = result !== null && viewMode === 'better' && bestMove !== null
  const boardFen = showingBetter ? drill.fenBefore : drill.fen

  const squareStyles: Record<string, CSSProperties> = {}
  if (!showingBetter) {
    // Highlight the move the user just played in "own" drills so they immediately see what happened.
    if (drill.kind === 'own' && playedMove) {
      squareStyles[playedMove.from] = LAST_MOVE
      squareStyles[playedMove.to] = LAST_MOVE
    }
    if (result) {
      for (const s of result.found) squareStyles[s] = { ...squareStyles[s], ...FOUND }
      for (const s of result.missed) squareStyles[s] = { ...squareStyles[s], ...MISSED }
      for (const s of result.wrong) squareStyles[s] = { ...squareStyles[s], ...WRONG }
    } else {
      for (const s of selected) squareStyles[s] = { ...squareStyles[s], ...SELECTED }
    }
  }

  const arrows = showingBetter
    ? [
        {
          startSquare: bestMove.from,
          endSquare: bestMove.to,
          color: ARROW_GOOD,
        },
        ...(playedMove
          ? [{ startSquare: playedMove.from, endSquare: playedMove.to, color: ARROW_THREAT }]
          : []),
      ]
    : result
      ? threats.map((th) => ({
          startSquare: th.from,
          endSquare: th.to,
          color: drill.kind === 'own' ? ARROW_THREAT : ARROW_GOOD,
        }))
      : []

  const moveNumber = Math.ceil(drill.ply / 2)
  const answerText = drill.answer
    .map((s) => t('hanging.square', { square: s, piece: pieceName(drill.fen, s) }))
    .join(', ')

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full max-w-[560px] flex-col gap-2.5 self-center lg:self-start">
        <div className="aspect-square w-full touch-none select-none overflow-hidden rounded-md shadow-lg shadow-black/40">
          <Chessboard
            options={{
              id: 'hanging-board',
              position: boardFen,
              boardOrientation: drill.color,
              allowDragging: false,
              allowDrawingArrows: false,
              onSquareClick: ({ piece, square }) => toggle(square, piece !== null),
              arrows,
              squareStyles,
              darkSquareStyle: { backgroundColor: '#769656' },
              lightSquareStyle: { backgroundColor: '#eeeed2' },
            }}
          />
        </div>

        {result && bestMove && (
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-2">
            <button
              type="button"
              aria-pressed={viewMode === 'threat'}
              onClick={() => setViewMode('threat')}
              className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                viewMode === 'threat'
                  ? 'bg-rose-600/25 text-rose-200 ring-1 ring-rose-500/70'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-100'
              }`}
            >
              🎯 {t('coach.showHanging')}
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'better'}
              onClick={() => setViewMode('better')}
              className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                viewMode === 'better'
                  ? 'bg-emerald-600/25 text-emerald-200 ring-1 ring-emerald-500/70'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-100'
              }`}
            >
              ✓ {t('coach.showBetter')}
            </button>
          </div>
        )}
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-xs font-semibold text-slate-100">
              <span
                aria-hidden="true"
                className={`inline-block size-2.5 rounded-sm border border-slate-400 ${
                  drill.color === 'white' ? 'bg-slate-100' : 'bg-slate-950'
                }`}
              />
              {t('coach.youAre', { color: t(`color.${drill.color}`) })}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-0.5 text-xs text-slate-300">
              {drill.kind === 'own'
                ? t('coach.turnEnemy', { color: t(`color.${enemy}`) })
                : t('coach.turnYours', { color: t(`color.${drill.color}`) })}
            </span>
          </div>

          {drill.kind === 'own' ? (
            <>
              <p className="text-base font-semibold text-white">
                {playedMove
                  ? `${moveNumber}. ${formatPlayedSentence(playedMove)}`
                  : t('hanging.prompt.own', {
                      move: `${moveNumber}${drill.color === 'white' ? '.' : '…'} ${drill.playedSan}`,
                    })}
              </p>
              <p className="text-slate-200">
                {t('hanging.prompt.own', {
                  move: `${moveNumber}${drill.color === 'white' ? '.' : '…'} ${drill.playedSan}`,
                }).split('. ')[1] ?? t('hanging.how')}
              </p>
            </>
          ) : (
            <p className="text-base font-semibold text-white">{t('hanging.prompt.free')}</p>
          )}
          <p className="text-slate-400">{t('hanging.how')}</p>
          <p className="text-xs text-slate-500">{formatDate(drill.endTime)}</p>
        </div>

        {result && (
          <div role="status" className="flex flex-col gap-2.5">
            <div
              className={`flex flex-col gap-2 rounded-xl border p-3.5 ${
                result.correct
                  ? 'border-emerald-700 bg-emerald-950/40'
                  : 'border-rose-800 bg-rose-950/30'
              }`}
            >
              <p
                className={`text-base font-semibold ${result.correct ? 'text-emerald-300' : 'text-rose-300'}`}
              >
                {result.correct ? t('hanging.correct') : t('hanging.wrong')}
              </p>
              {threats.length > 0 ? (
                <ul className="flex flex-col gap-1 text-slate-200">
                  {threats.map((th) => (
                    <li key={th.to}>{formatThreatSentence(th, drill.kind)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300">
                  {t(drill.kind === 'own' ? 'hanging.answer.own' : 'hanging.answer.free', {
                    pieces: answerText,
                  })}
                </p>
              )}
              {bestMove && (
                <p className="border-t border-slate-800/80 pt-2 font-medium text-emerald-300">
                  ✓ {t('coach.betterSuggestion', { action: formatMoveAction(bestMove) })}
                </p>
              )}
              {!result.correct && <p className="text-xs text-slate-400">{t('hanging.legend')}</p>}
            </div>

            <div className="flex flex-col gap-1 rounded-xl border border-amber-700/50 bg-amber-950/20 p-3.5">
              <p className="text-xs font-semibold tracking-wide text-amber-300 uppercase">
                💡 {t('coach.howToThink')}
              </p>
              <p className="text-slate-200">
                {t(
                  drill.kind === 'own' ? 'coach.tip.hanging-piece' : 'coach.tip.missed-free-piece',
                )}
              </p>
            </div>

            {box !== undefined && (
              <p className="text-xs text-slate-500">
                {t('puzzles.nextDue', { days: intervalDays(box) })}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!result && (
            <>
              <button
                type="button"
                disabled={selected.length === 0}
                onClick={() => check(selected)}
                className="min-h-11 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {t('hanging.check')}
              </button>
              <button
                type="button"
                onClick={() => check([])}
                className="min-h-11 rounded-lg border border-slate-600 px-4 font-medium hover:border-slate-400"
              >
                {t('puzzles.reveal')}
              </button>
            </>
          )}
          {result && (
            <>
              <button
                type="button"
                onClick={onNext}
                className="min-h-11 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500"
              >
                {t('puzzles.next')}
              </button>
              <a
                href={routeHref({ name: 'game', username, id: drill.gameId, ply: drill.ply })}
                className="grid min-h-11 place-items-center rounded-lg border border-slate-700 px-4 text-slate-200 hover:border-slate-500"
              >
                {t('puzzles.viewGame')}
              </a>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
