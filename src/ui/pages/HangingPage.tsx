import { Chess, type Square } from 'chess.js'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { normalizeUsername } from '../../core/api/username'
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
import { routeHref } from '../router'
import { playSound } from '../sound'

const ring = (color: string): CSSProperties => ({ boxShadow: `inset 0 0 0 4px ${color}` })
const SELECTED = ring('rgba(250, 204, 21, 0.95)')
const FOUND = ring('rgba(16, 185, 129, 0.95)')
const MISSED = ring('rgba(244, 63, 94, 0.95)')
const WRONG = ring('rgba(251, 146, 60, 0.95)')

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

  const squareStyles: Record<string, CSSProperties> = {}
  if (result) {
    for (const s of result.found) squareStyles[s] = FOUND
    for (const s of result.missed) squareStyles[s] = MISSED
    for (const s of result.wrong) squareStyles[s] = WRONG
  } else {
    for (const s of selected) squareStyles[s] = SELECTED
  }
  const moveNumber = Math.ceil(drill.ply / 2)
  const answerText = drill.answer
    .map((s) => t('hanging.square', { square: s, piece: pieceName(drill.fen, s) }))
    .join(', ')

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="aspect-square w-full max-w-[560px] touch-none self-center select-none lg:self-start">
        <Chessboard
          options={{
            id: 'hanging-board',
            position: drill.fen,
            boardOrientation: drill.color,
            allowDragging: false,
            allowDrawingArrows: false,
            onSquareClick: ({ piece, square }) => toggle(square, piece !== null),
            squareStyles,
            darkSquareStyle: { backgroundColor: '#769656' },
            lightSquareStyle: { backgroundColor: '#eeeed2' },
          }}
        />
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-base font-semibold">
            {drill.kind === 'own'
              ? t('hanging.prompt.own', {
                  move: `${moveNumber}${drill.color === 'white' ? '.' : '…'} ${drill.playedSan}`,
                })
              : t('hanging.prompt.free')}
          </p>
          <p className="text-slate-400">{t('hanging.how')}</p>
          <p className="text-xs text-slate-500">{formatDate(drill.endTime)}</p>
        </div>

        {result && (
          <div
            role="status"
            className={`flex flex-col gap-1.5 rounded-xl border p-3 ${
              result.correct
                ? 'border-emerald-700 bg-emerald-950/40'
                : 'border-rose-800 bg-rose-950/30'
            }`}
          >
            <p className={`font-semibold ${result.correct ? 'text-emerald-300' : 'text-rose-300'}`}>
              {result.correct ? t('hanging.correct') : t('hanging.wrong')}
            </p>
            <p className="text-slate-300">
              {t(drill.kind === 'own' ? 'hanging.answer.own' : 'hanging.answer.free', {
                pieces: answerText,
              })}
            </p>
            {drill.bestSan && (
              <p className="text-emerald-300">
                {t(drill.kind === 'own' ? 'hanging.better.own' : 'hanging.better.free', {
                  move: drill.bestSan,
                  played: drill.playedSan,
                })}
              </p>
            )}
            {!result.correct && <p className="text-xs text-slate-400">{t('hanging.legend')}</p>}
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
