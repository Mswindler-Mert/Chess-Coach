import { Chess, type Square } from 'chess.js'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Phase } from '../../core/analysis/types'
import { opponentOf, type Color } from '../../core/games/model'
import {
  intervalDays,
  planPuzzles,
  recordAttempt,
  type PuzzleProgress,
} from '../../core/training/leitner'
import {
  ALL_PUZZLES,
  filterPuzzles,
  type AnswerResult,
  type Puzzle,
  type PuzzleFilter,
} from '../../core/training/puzzles'
import { normalizeUsername } from '../../core/api/username'
import { getAnalysisDepth } from '../../db/analyses'
import { getGame } from '../../db/games'
import {
  listPuzzleProgress,
  loadPuzzles,
  savePuzzleProgress,
  type PuzzleSet,
} from '../../db/puzzles'
import { judgeAttempt } from '../../engine/judge'
import { t } from '../../i18n'
import { MOVE_CLASS_TEXT } from '../analysisStyles'
import { formatDate } from '../format'
import { routeHref } from '../router'

const SELECTED_STYLE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.55)' }
const TARGET_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, rgba(15, 23, 42, 0.35) 22%, transparent 24%)',
}
const ARROW_GOOD = 'rgba(16, 185, 129, 0.9)'
const ARROW_BAD = 'rgba(244, 63, 94, 0.85)'

const PHASES: (Phase | 'all')[] = ['all', 'opening', 'middlegame', 'endgame']
const COLORS: (Color | 'all')[] = ['all', 'white', 'black']

type Answer =
  | { status: 'solving' }
  | { status: 'checking'; uci: string; san: string; fen: string }
  | { status: 'done'; uci: string | null; san: string | null; fen: string; result: AnswerResult }
  | { status: 'error'; message: string }

export function PuzzlePage({
  username: rawUsername,
  focus,
}: {
  username: string
  /** A phase to preselect, e.g. from the dashboard's weekly focus. */
  focus?: string
}) {
  const username = normalizeUsername(rawUsername)
  if (!username) return <p className="text-rose-400">{t('home.username.invalid')}</p>
  return <PuzzleTrainer username={username} initialFilter={filterFromFocus(focus)} />
}

function filterFromFocus(focus: string | undefined): PuzzleFilter {
  return PHASES.includes(focus as Phase) ? { ...ALL_PUZZLES, phase: focus as Phase } : ALL_PUZZLES
}

function PuzzleTrainer({
  username,
  initialFilter,
}: {
  username: string
  initialFilter: PuzzleFilter
}) {
  const [now] = useState(() => Date.now())
  const [set, setSet] = useState<PuzzleSet | null>(null)
  const [progress, setProgress] = useState<Map<string, PuzzleProgress> | null>(null)
  const [filter, setFilter] = useState<PuzzleFilter>(initialFilter)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [session, setSession] = useState({ correct: 0, total: 0 })

  useEffect(() => {
    void Promise.all([loadPuzzles(username, now), listPuzzleProgress(username)]).then(
      ([puzzles, saved]) => {
        setSet(puzzles)
        setProgress(saved)
      },
    )
  }, [username, now])

  const plan = useMemo(
    () => (set && progress ? planPuzzles(filterPuzzles(set.puzzles, filter), progress, now) : null),
    [set, progress, filter, now],
  )
  // Keep showing the puzzle just answered until the user asks for the next one.
  const current =
    (currentId && set?.puzzles.find((p) => p.id === currentId)) || plan?.queue[0] || null

  function onAnswered(puzzle: Puzzle, correct: boolean) {
    setCurrentId(puzzle.id)
    setSession((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    const next = recordAttempt(
      progress?.get(puzzle.id),
      { puzzleId: puzzle.id, username },
      correct,
      Date.now(),
    )
    setProgress((map) => new Map(map).set(puzzle.id, next))
    void savePuzzleProgress(next)
  }

  function onNext() {
    setCurrentId(null)
  }

  function onFilter(next: PuzzleFilter) {
    setFilter(next)
    setCurrentId(null)
  }

  const back = (
    <a
      href={routeHref({ name: 'games', username })}
      className="self-start text-sm text-emerald-400 hover:underline"
    >
      ← {t('nav.backToGames')}
    </a>
  )

  if (!set || !plan) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p className="text-slate-400">{t('puzzles.loading')}</p>
      </div>
    )
  }

  const filtered = filterPuzzles(set.puzzles, filter).length

  return (
    <div className="flex flex-col gap-4">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('puzzles.title')}</h1>
        <p className="text-sm text-slate-400">
          {t('puzzles.queue', { due: plan.due, fresh: plan.fresh })}
          {session.total > 0 && ` · ${t('puzzles.session', session)}`}
        </p>
      </header>

      <Filters filter={filter} onChange={onFilter} />

      {current ? (
        <PuzzleBoard
          key={current.id}
          puzzle={current}
          username={username}
          answeredBox={currentId === current.id ? progress?.get(current.id)?.box : undefined}
          onAnswered={onAnswered}
          onNext={onNext}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-300">
          <p>
            {set.analyzed === 0
              ? t('puzzles.empty.noAnalysis')
              : set.puzzles.length === 0
                ? t('puzzles.empty.noMistakes')
                : filtered === 0
                  ? t('puzzles.empty.filtered')
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

      <p className="text-xs text-slate-500">
        {t('puzzles.scope', { analyzed: set.analyzed, games: set.games })}
      </p>
    </div>
  )
}

function Filters({
  filter,
  onChange,
}: {
  filter: PuzzleFilter
  onChange: (filter: PuzzleFilter) => void
}) {
  const chip = (active: boolean) =>
    `min-h-9 rounded-full border px-3 text-sm font-medium ${
      active
        ? 'border-emerald-500 bg-emerald-600/20 text-emerald-200'
        : 'border-slate-700 text-slate-400 hover:border-slate-500'
    }`
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t('puzzles.filter.phase')}</legend>
        <span className="text-sm text-slate-400">{t('puzzles.filter.phase')}</span>
        {PHASES.map((phase) => (
          <button
            key={phase}
            type="button"
            aria-pressed={filter.phase === phase}
            onClick={() => onChange({ ...filter, phase })}
            className={chip(filter.phase === phase)}
          >
            {phase === 'all' ? t('puzzles.filter.all') : t(`phase.${phase}`)}
          </button>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t('puzzles.filter.color')}</legend>
        <span className="text-sm text-slate-400">{t('puzzles.filter.color')}</span>
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-pressed={filter.color === color}
            onClick={() => onChange({ ...filter, color })}
            className={chip(filter.color === color)}
          >
            {color === 'all' ? t('puzzles.filter.all') : t(`color.${color}`)}
          </button>
        ))}
      </fieldset>
    </div>
  )
}

function PuzzleBoard({
  puzzle,
  username,
  answeredBox,
  onAnswered,
  onNext,
}: {
  puzzle: Puzzle
  username: string
  /** Leitner box after the answer, once answered. */
  answeredBox: number | undefined
  onAnswered: (puzzle: Puzzle, correct: boolean) => void
  onNext: () => void
}) {
  const [answer, setAnswer] = useState<Answer>({ status: 'solving' })
  const [selected, setSelected] = useState<Square | null>(null)
  const [opponent, setOpponent] = useState<string | null>(null)

  useEffect(() => {
    void getGame(puzzle.gameId).then((game) => {
      if (game) setOpponent(opponentOf(game).username)
    })
  }, [puzzle.gameId])

  const myPrefix = puzzle.color === 'white' ? 'w' : 'b'
  const solving = answer.status === 'solving'

  const targets = useMemo(() => {
    if (!selected) return []
    return new Chess(puzzle.fen).moves({ square: selected, verbose: true }).map((m) => m.to)
  }, [puzzle.fen, selected])

  function tryMove(from: string, to: string): boolean {
    if (!solving) return false
    const chess = new Chess(puzzle.fen)
    let move
    try {
      // Promote to a queen; under-promotion is never the answer at this level.
      move = chess.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    setSelected(null)
    const attempt = { uci: move.lan, san: move.san, fen: chess.fen() }
    setAnswer({ status: 'checking', ...attempt })
    void (async () => {
      try {
        const depth = await getAnalysisDepth()
        const result = await judgeAttempt(puzzle, attempt.uci, attempt.fen, depth)
        setAnswer({ status: 'done', ...attempt, result })
        onAnswered(puzzle, result.correct)
      } catch (error) {
        setAnswer({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    })()
    return true
  }

  function onReveal() {
    setSelected(null)
    setAnswer({
      status: 'done',
      uci: null,
      san: null,
      fen: puzzle.fen,
      result: { correct: false, exact: false, loss: 0 },
    })
    onAnswered(puzzle, false)
  }

  function onSquareClick(square: string, pieceType: string | undefined) {
    if (!solving) return
    if (selected && targets.includes(square as Square) && tryMove(selected, square)) return
    setSelected(pieceType?.startsWith(myPrefix) ? (square as Square) : null)
  }

  const done = answer.status === 'done' ? answer : null
  const wrong = done && !done.result.correct
  // After a wrong answer, go back to the puzzle position and show both moves as arrows.
  const position =
    answer.status === 'checking' ? answer.fen : done && done.result.correct ? done.fen : puzzle.fen
  const arrows = wrong
    ? [
        arrow(puzzle.solution.uci, ARROW_GOOD),
        ...(done.uci && done.uci !== puzzle.solution.uci ? [arrow(done.uci, ARROW_BAD)] : []),
      ]
    : []

  const squareStyles: Record<string, CSSProperties> = {}
  if (selected) {
    squareStyles[selected] = SELECTED_STYLE
    for (const square of targets) squareStyles[square] = TARGET_STYLE
  }
  const moveNumber = Math.ceil(puzzle.ply / 2)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="aspect-square w-full max-w-[560px] touch-none self-center select-none lg:self-start">
        <Chessboard
          options={{
            id: 'puzzle-board',
            position,
            boardOrientation: puzzle.color,
            allowDragging: solving,
            canDragPiece: ({ piece }) => solving && piece.pieceType.startsWith(myPrefix),
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              targetSquare ? tryMove(sourceSquare, targetSquare) : false,
            onSquareClick: ({ piece, square }) => onSquareClick(square, piece?.pieceType),
            arrows,
            allowDrawingArrows: false,
            squareStyles,
            animationDurationInMs: 150,
            darkSquareStyle: { backgroundColor: '#769656' },
            lightSquareStyle: { backgroundColor: '#eeeed2' },
          }}
        />
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-base font-semibold">{t('puzzles.prompt')}</p>
          <p className="text-slate-300">
            {t('puzzles.toMove', { color: t(`color.${puzzle.color}`) })}
          </p>
          <p className="text-slate-400">
            {t('puzzles.context', {
              date: formatDate(puzzle.endTime),
              opponent: opponent ?? '…',
              move: moveNumber,
            })}{' '}
            · {t(`phase.${puzzle.phase}`)} ·{' '}
            <span className={MOVE_CLASS_TEXT[puzzle.moveClass]}>
              {t(`moveClass.${puzzle.moveClass}`)}
            </span>
          </p>
        </div>

        <Feedback puzzle={puzzle} answer={answer} box={answeredBox} />

        <div className="flex flex-wrap gap-2">
          {solving && (
            <button
              type="button"
              onClick={onReveal}
              className="min-h-11 rounded-lg border border-slate-600 px-4 font-medium hover:border-slate-400"
            >
              {t('puzzles.reveal')}
            </button>
          )}
          {(done || answer.status === 'error') && (
            <button
              type="button"
              onClick={onNext}
              className="min-h-11 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500"
            >
              {t('puzzles.next')}
            </button>
          )}
          {done && (
            <a
              href={routeHref({ name: 'game', username, id: puzzle.gameId, ply: puzzle.ply })}
              className="grid min-h-11 place-items-center rounded-lg border border-slate-700 px-4 text-slate-200 hover:border-slate-500"
            >
              {t('puzzles.viewGame')}
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}

function Feedback({
  puzzle,
  answer,
  box,
}: {
  puzzle: Puzzle
  answer: Answer
  box: number | undefined
}) {
  if (answer.status === 'solving') return null
  if (answer.status === 'checking') {
    return (
      <p className="text-slate-300" role="status">
        {t('puzzles.checking')}
      </p>
    )
  }
  if (answer.status === 'error') {
    return (
      <p className="text-rose-400" role="alert">
        {t('puzzles.error', { message: answer.message })}
      </p>
    )
  }

  const { result, san } = answer
  return (
    <div
      role="status"
      className={`flex flex-col gap-1.5 rounded-xl border p-3 ${
        result.correct ? 'border-emerald-700 bg-emerald-950/40' : 'border-rose-800 bg-rose-950/30'
      }`}
    >
      {result.correct ? (
        <p className="font-semibold text-emerald-300">
          {result.exact
            ? t('puzzles.correct', { move: san ?? '' })
            : t('puzzles.correctAlt', { move: san ?? '', best: puzzle.solution.san })}
        </p>
      ) : (
        <>
          <p className="font-semibold text-rose-300">
            {san ? t('puzzles.wrong', { move: san }) : t('puzzles.revealed')}
          </p>
          <p className="text-emerald-300">{t('puzzles.solution', { move: puzzle.solution.san })}</p>
        </>
      )}
      <p className="text-slate-300">{t('puzzles.gameMove', { move: puzzle.played.san })}</p>
      {puzzle.refutation.length > 0 && (
        <p className="text-slate-400">
          {t('puzzles.refutation', { line: puzzle.refutation.join(' ') })}
        </p>
      )}
      {box !== undefined && (
        <p className="text-xs text-slate-500">
          {t('puzzles.nextDue', { days: intervalDays(box) })}
        </p>
      )}
    </div>
  )
}

function arrow(uci: string, color: string) {
  return { startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color }
}
