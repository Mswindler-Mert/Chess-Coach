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
import { recordActivity } from '../../db/daily'
import { judgeAttempt } from '../../engine/judge'
import { t } from '../../i18n'
import { explainMistake, type MistakeCoaching } from '../../core/analysis/coachExplain'
import { isMotif, MOTIFS, type Motif } from '../../core/analysis/motifs'
import { MotifChips } from '../analysis'
import { MOVE_CLASS_TEXT } from '../analysisStyles'
import { formatDate } from '../format'
import {
  formatBestReason,
  formatCoachTip,
  formatEnemyReply,
  formatMoveAction,
  formatPlayedReason,
} from '../moveText'
import { routeHref } from '../router'
import { playMoveSan, playSound } from '../sound'
import { useBoardColors } from '../theme'

const SELECTED_STYLE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.55)' }
const LAST_MOVE_STYLE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.4)' }
const HINT_STYLE: CSSProperties = { boxShadow: 'inset 0 0 0 4px rgba(56, 189, 248, 0.95)' }
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
  if (isMotif(focus)) return { ...ALL_PUZZLES, motif: focus }
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
    playSound(correct ? 'correct' : 'wrong')
    void recordActivity()
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

      <Filters filter={filter} onChange={onFilter} puzzles={set.puzzles} />

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
  puzzles,
}: {
  filter: PuzzleFilter
  onChange: (filter: PuzzleFilter) => void
  puzzles: readonly Puzzle[]
}) {
  // Only motifs that occur (plus the selected one), with how many puzzles have each.
  const motifCounts = new Map<Motif, number>()
  for (const p of puzzles) {
    for (const m of p.motifs) motifCounts.set(m, (motifCounts.get(m) ?? 0) + 1)
  }
  const motifs = MOTIFS.filter((m) => motifCounts.has(m) || filter.motif === m)
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
      {motifs.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-slate-400">
          {t('puzzles.filter.motif')}
          <select
            value={filter.motif}
            onChange={(e) =>
              onChange({ ...filter, motif: isMotif(e.target.value) ? e.target.value : 'all' })
            }
            className="min-h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-slate-100"
          >
            <option value="all">{t('puzzles.filter.all')}</option>
            {motifs.map((m) => (
              <option key={m} value={m}>
                {t(`motif.${m}`)} ({motifCounts.get(m) ?? 0})
              </option>
            ))}
          </select>
        </label>
      )}
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
  const boardColors = useBoardColors()
  const [answer, setAnswer] = useState<Answer>({ status: 'solving' })
  const [selected, setSelected] = useState<Square | null>(null)
  const [opponent, setOpponent] = useState<string | null>(null)
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0)
  const [reviewMode, setReviewMode] = useState<'best' | 'played'>('best')
  const [refStep, setRefStep] = useState(0)

  const coaching = useMemo(
    () =>
      explainMistake({
        fen: puzzle.fen,
        color: puzzle.color,
        playedUci: puzzle.played.uci,
        bestUci: puzzle.solution.uci,
        afterPlayedPv: puzzle.refutationUci,
        motifs: puzzle.motifs,
      }),
    [puzzle],
  )

  useEffect(() => {
    void getGame(puzzle.gameId).then((game) => {
      if (game) setOpponent(opponentOf(game).username)
    })
  }, [puzzle.gameId])

  const myPrefix = puzzle.color === 'white' ? 'w' : 'b'
  const solving = answer.status === 'solving'
  // Motifs describe the game move's error, so they would give the answer away: show them after.
  const answered = answer.status === 'done'

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
  const refSteps = coaching?.played.refutationSteps ?? []

  // Determine which board position, arrows and square highlights to show.
  let position: string
  let arrows: { startSquare: string; endSquare: string; color: string }[] = []
  const squareStyles: Record<string, CSSProperties> = {}

  if (done && reviewMode === 'played' && coaching) {
    if (refStep === 0) {
      position = coaching.played.move.fenAfter
      squareStyles[coaching.played.move.from] = LAST_MOVE_STYLE
      squareStyles[coaching.played.move.to] = LAST_MOVE_STYLE
      if (coaching.played.enemyReply) {
        arrows = [arrow(coaching.played.enemyReply.uci, ARROW_BAD)]
      }
    } else {
      const step = refSteps[Math.min(refStep, refSteps.length) - 1]
      position = step ? step.fenAfter : coaching.played.move.fenAfter
      if (step) {
        squareStyles[step.move.from] = LAST_MOVE_STYLE
        squareStyles[step.move.to] = LAST_MOVE_STYLE
      }
      const nextStep = refSteps[refStep]
      if (nextStep) {
        arrows = [arrow(nextStep.move.uci, ARROW_BAD)]
      }
    }
  } else {
    position =
      answer.status === 'checking'
        ? answer.fen
        : done && done.result.correct
          ? done.fen
          : puzzle.fen
    if (wrong) {
      arrows = [
        arrow(puzzle.solution.uci, ARROW_GOOD),
        ...(done.uci && done.uci !== puzzle.solution.uci ? [arrow(done.uci, ARROW_BAD)] : []),
      ]
    } else if (done && done.result.correct) {
      arrows = [arrow(puzzle.solution.uci, ARROW_GOOD)]
    }
    if (solving) {
      if (hintLevel >= 2 && coaching) {
        squareStyles[coaching.hintSquare] = HINT_STYLE
      }
      if (selected) {
        squareStyles[selected] = SELECTED_STYLE
        for (const square of targets) squareStyles[square] = TARGET_STYLE
      }
    }
  }

  function stepRefutation(next: number) {
    const clamped = Math.max(0, Math.min(refSteps.length, next))
    if (clamped !== refStep) {
      if (clamped > 0) {
        const s = refSteps[clamped - 1]
        if (s) playMoveSan(s.move.san)
      } else if (coaching) {
        playMoveSan(coaching.played.move.san)
      }
    }
    setRefStep(clamped)
  }

  const moveNumber = Math.ceil(puzzle.ply / 2)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex w-full max-w-[560px] flex-col gap-2.5 self-center lg:self-start">
        <div className="club-board-frame w-full">
          <div className="aspect-square w-full touch-none select-none overflow-hidden rounded-[6px]">
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
                ...boardColors,
              }}
            />
          </div>
        </div>

        {done && coaching && (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                aria-pressed={reviewMode === 'best'}
                onClick={() => setReviewMode('best')}
                className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                  reviewMode === 'best'
                    ? 'bg-emerald-600/25 text-emerald-200 ring-1 ring-emerald-500/70'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-100'
                }`}
              >
                ✓ {t('coach.viewBest')}
              </button>
              <button
                type="button"
                aria-pressed={reviewMode === 'played'}
                onClick={() => {
                  setReviewMode('played')
                  setRefStep(0)
                  playMoveSan(coaching.played.move.san)
                }}
                className={`min-h-9 rounded-lg px-3 text-sm font-medium transition-colors ${
                  reviewMode === 'played'
                    ? 'bg-rose-600/25 text-rose-200 ring-1 ring-rose-500/70'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-100'
                }`}
              >
                ✕ {t('coach.viewPlayed')}
              </button>
            </div>
            {reviewMode === 'played' && refSteps.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">
                    {t('coach.watchLine')} (
                    {t('coach.step', { step: refStep, total: refSteps.length })})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={refStep === 0}
                      onClick={() => stepRefutation(refStep - 1)}
                      className="min-h-8 rounded-md bg-slate-800 px-3 text-xs font-semibold hover:bg-slate-700 disabled:opacity-40"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={refStep >= refSteps.length}
                      onClick={() => stepRefutation(refStep + 1)}
                      className="min-h-8 rounded-md bg-rose-600/80 px-3 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
                    >
                      ▶
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  {refStep === 0 && coaching.played.enemyReply
                    ? formatEnemyReply(coaching.played.enemyReply)
                    : refStep > 0 && refSteps[refStep - 1]
                      ? `${refStep}. ${formatMoveAction(refSteps[refStep - 1]!.move)}`
                      : null}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-white">{t('puzzles.prompt')}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-xs font-medium text-slate-200">
              <span
                aria-hidden="true"
                className={`inline-block size-2.5 rounded-sm border border-slate-400 ${
                  puzzle.color === 'white' ? 'bg-slate-100' : 'bg-slate-950'
                }`}
              />
              {t('coach.turnYours', { color: t(`color.${puzzle.color}`) })}
            </span>
          </div>
          <p className="text-xs text-slate-400">
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
          {answered && <MotifChips motifs={puzzle.motifs} />}
        </div>

        {solving && hintLevel >= 1 && coaching && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-sky-700/60 bg-sky-950/30 p-3 text-sm">
            <p className="font-semibold text-sky-300">💡 {t('coach.howToThink')}</p>
            <p className="text-slate-200">{formatCoachTip(coaching)}</p>
            {hintLevel >= 2 && (
              <p className="text-xs font-medium text-sky-300">{t('coach.hintPieceMsg')}</p>
            )}
          </div>
        )}

        <Feedback puzzle={puzzle} coaching={coaching} answer={answer} box={answeredBox} />

        <div className="flex flex-wrap gap-2">
          {solving && coaching && hintLevel < 2 && (
            <button
              type="button"
              onClick={() => setHintLevel((h) => (h === 0 ? 1 : 2))}
              className="min-h-11 rounded-lg border border-sky-600/70 bg-sky-950/30 px-4 font-medium text-sky-200 transition-colors hover:border-sky-400"
            >
              💡 {hintLevel === 0 ? t('coach.hint') : t('coach.hintPiece')}
            </button>
          )}
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
  coaching,
  answer,
  box,
}: {
  puzzle: Puzzle
  coaching: MistakeCoaching | null
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
    <div role="status" className="flex flex-col gap-2.5">
      <div
        className={`flex flex-col gap-1.5 rounded-xl border p-3.5 ${
          result.correct ? 'border-emerald-700 bg-emerald-950/40' : 'border-rose-800 bg-rose-950/30'
        }`}
      >
        {result.correct ? (
          <p className="text-base font-semibold text-emerald-300">
            {result.exact
              ? t('puzzles.correct', { move: san ?? '' })
              : t('puzzles.correctAlt', { move: san ?? '', best: puzzle.solution.san })}
          </p>
        ) : (
          <>
            <p className="text-base font-semibold text-rose-300">
              {san ? t('puzzles.wrong', { move: san }) : t('puzzles.revealed')}
            </p>
            <p className="font-medium text-emerald-300">
              {t('puzzles.solution', {
                move: coaching ? formatMoveAction(coaching.best.move) : puzzle.solution.san,
              })}
            </p>
          </>
        )}
        {coaching && (
          <div className="mt-1 flex flex-col gap-0.5 border-t border-slate-800/80 pt-2">
            <p className="text-xs font-semibold tracking-wide text-emerald-300/90 uppercase">
              ✓ {t('coach.whyGood')}
            </p>
            <p className="text-slate-200">
              {formatBestReason(coaching.best.move, coaching.best.reason)}
            </p>
          </div>
        )}
      </div>

      {coaching ? (
        <>
          <div className="flex flex-col gap-1 rounded-xl border border-rose-900/60 bg-slate-900 p-3.5">
            <p className="text-xs font-semibold tracking-wide text-rose-300 uppercase">
              ✕ {t('coach.whyBad')}
            </p>
            <p className="text-slate-200">{formatPlayedReason(coaching)}</p>
            <p className="text-xs text-slate-400">
              {t('viewer.analysis.winChance', {
                color: t(`color.${puzzle.color}`),
                before: Math.round(puzzle.winBefore),
                after: Math.round(puzzle.winAfter),
              })}
            </p>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-amber-700/50 bg-amber-950/20 p-3.5">
            <p className="text-xs font-semibold tracking-wide text-amber-300 uppercase">
              💡 {t('coach.howToThink')}
            </p>
            <p className="text-slate-200">{formatCoachTip(coaching)}</p>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-slate-300">{t('puzzles.gameMove', { move: puzzle.played.san })}</p>
          {puzzle.refutation.length > 0 && (
            <p className="text-slate-400">
              {t('puzzles.refutation', { line: puzzle.refutation.join(' ') })}
            </p>
          )}
        </div>
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
