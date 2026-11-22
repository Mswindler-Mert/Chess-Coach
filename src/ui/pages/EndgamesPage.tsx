import { Chess, type Square } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { sideToMove } from '../../core/analysis/analyzeGame'
import { formatScore } from '../../core/analysis/display'
import { describeMove, type MoveDetails } from '../../core/analysis/explainMove'
import type { Score } from '../../core/analysis/types'
import { flipScore } from '../../core/analysis/winPercent'
import { normalizeUsername } from '../../core/api/username'
import { CURRICULUM, type EndgameLesson } from '../../core/endgames/curriculum'
import type { OwnEndgame } from '../../core/endgames/fromGames'
import { judgeEndgame, type EndgameResult } from '../../core/endgames/judge'
import type { Color } from '../../core/games/model'
import {
  getEndgameProgress,
  getOwnEndgame,
  loadOwnEndgames,
  recordEndgameAttempt,
  type EndgameProgress,
} from '../../db/endgames'
import { recordActivity } from '../../db/daily'
import { getSharedEngine } from '../../engine/shared'
import { t } from '../../i18n'
import { EvalBar } from '../EvalBar'
import { formatDate } from '../format'
import { formatMoveBadge } from '../moveText'
import { routeHref } from '../router'
import { playMoveSan, playSound } from '../sound'
import { useBoardColors } from '../theme'

/** Engine strength while defending: enough to punish mistakes, quick on a phone. */
const ENGINE_DEPTH = 12

const SELECTED_STYLE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.55)' }
const LAST_MOVE_STYLE: CSSProperties = { backgroundColor: 'rgba(250, 204, 21, 0.35)' }
const TARGET_STYLE: CSSProperties = {
  background: 'radial-gradient(circle, rgba(15, 23, 42, 0.35) 22%, transparent 24%)',
}

const isOwn = (lesson: EndgameLesson): lesson is OwnEndgame => 'gameId' in lesson

function lessonTitle(lesson: EndgameLesson): string {
  return isOwn(lesson)
    ? t('endgame.own.title', { move: Math.ceil(lesson.ply / 2) })
    : t(`endgame.lesson.${lesson.id}` as Parameters<typeof t>[0])
}

export function EndgamesPage({
  username: rawUsername,
  lesson,
}: {
  username: string
  lesson?: string
}) {
  const username = normalizeUsername(rawUsername)
  if (!username) return <p className="text-rose-400">{t('home.username.invalid')}</p>
  return lesson ? (
    <LessonLoader username={username} id={lesson} />
  ) : (
    <EndgameList username={username} />
  )
}

function EndgameList({ username }: { username: string }) {
  const [now] = useState(() => Date.now())
  const [own, setOwn] = useState<OwnEndgame[] | null>(null)
  const [progress, setProgress] = useState<Record<string, EndgameProgress>>({})

  useEffect(() => {
    void loadOwnEndgames(username, now).then(setOwn)
    void getEndgameProgress().then(setProgress)
  }, [username, now])

  return (
    <div className="flex flex-col gap-5">
      <a
        href={routeHref({ name: 'games', username })}
        className="self-start text-sm text-emerald-400 hover:underline"
      >
        ← {t('nav.backToGames')}
      </a>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{t('endgame.title')}</h1>
        <p className="text-sm text-slate-400">{t('endgame.intro')}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('endgame.own.heading')}</h2>
        {own === null ? (
          <p className="text-sm text-slate-400">{t('endgame.loading')}</p>
        ) : own.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
            {t('endgame.own.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {own.map((drill) => (
              <LessonCard
                key={drill.id}
                href={routeHref({ name: 'endgames', username, lesson: drill.id })}
                title={lessonTitle(drill)}
                body={t('endgame.own.body', {
                  date: formatDate(drill.endTime),
                  win: Math.round(drill.winBefore),
                  move: drill.playedSan,
                })}
                lesson={drill}
                progress={progress[drill.id]}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('endgame.curriculum.heading')}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CURRICULUM.map((lesson) => (
            <LessonCard
              key={lesson.id}
              href={routeHref({ name: 'endgames', username, lesson: lesson.id })}
              title={lessonTitle(lesson)}
              body={t(`endgame.desc.${lesson.id}` as Parameters<typeof t>[0])}
              lesson={lesson}
              progress={progress[lesson.id]}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}

function LessonCard({
  href,
  title,
  body,
  lesson,
  progress,
}: {
  href: string
  title: string
  body: string
  lesson: EndgameLesson
  progress: EndgameProgress | undefined
}) {
  return (
    <li>
      <a
        href={href}
        className="flex h-full flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3 hover:border-slate-600"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium">{title}</span>
          {progress?.solved && (
            <span className="text-xs text-emerald-400">✓ {t('endgame.solved')}</span>
          )}
        </span>
        <span className="text-sm text-slate-400">{body}</span>
        <span className="text-xs text-slate-500">
          {t(`endgame.goal.${lesson.goal}`, { moves: lesson.moveLimit })}
          {progress && ` · ${t('endgame.attempts', { count: progress.attempts })}`}
        </span>
      </a>
    </li>
  )
}

function LessonLoader({ username, id }: { username: string; id: string }) {
  const curriculum = CURRICULUM.find((l) => l.id === id)
  const [own, setOwn] = useState<OwnEndgame | null | undefined>(curriculum ? null : undefined)

  useEffect(() => {
    if (!curriculum) void getOwnEndgame(id).then(setOwn)
  }, [curriculum, id])

  const back = (
    <a
      href={routeHref({ name: 'endgames', username })}
      className="self-start text-sm text-emerald-400 hover:underline"
    >
      ← {t('endgame.back')}
    </a>
  )
  const lesson = curriculum ?? own
  if (lesson === undefined) return <p className="text-slate-400">{t('endgame.loading')}</p>
  if (lesson === null) {
    return (
      <div className="flex flex-col gap-3">
        {back}
        <p className="text-rose-400">{t('endgame.notFound')}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {back}
      <Play key={lesson.id} lesson={lesson} username={username} />
    </div>
  )
}

type Phase =
  | { status: 'playing'; thinking: boolean }
  | { status: 'done'; result: Exclude<EndgameResult, { outcome: 'continue' }> }
  | { status: 'error'; message: string }

function Play({ lesson, username }: { lesson: EndgameLesson; username: string }) {
  const chess = useRef(new Chess(lesson.fen))
  const boardColors = useBoardColors()
  const [fen, setFen] = useState(lesson.fen)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [userMoves, setUserMoves] = useState(0)
  const [phase, setPhase] = useState<Phase>({ status: 'playing', thinking: false })
  const [selected, setSelected] = useState<Square | null>(null)
  const [liveEval, setLiveEval] = useState<{ score: Score; turn: Color } | null>(null)
  const [moveFeedback, setMoveFeedback] = useState<{ tone: 'good' | 'warn'; text: string } | null>(
    null,
  )
  const [hintMove, setHintMove] = useState<MoveDetails | null>(null)
  const [hintLoading, setHintLoading] = useState(false)
  const promoted = useRef(false)
  const attempt = useRef(0)

  const myPrefix = lesson.color === 'white' ? 'w' : 'b'
  const canMove = phase.status === 'playing' && !phase.thinking

  const ownPlayed = useMemo(
    () => (isOwn(lesson) ? describeMove(lesson.fen, lesson.playedSan) : null),
    [lesson],
  )

  const restart = useCallback(() => {
    attempt.current++
    chess.current = new Chess(lesson.fen)
    promoted.current = false
    setFen(lesson.fen)
    setLastMove(null)
    setUserMoves(0)
    setSelected(null)
    setLiveEval(null)
    setMoveFeedback(null)
    setHintMove(null)
    setHintLoading(false)
    setPhase({ status: 'playing', thinking: false })
  }, [lesson.fen])

  async function requestHint() {
    if (!canMove || hintLoading) return
    setHintLoading(true)
    const run = attempt.current
    try {
      const engine = await getSharedEngine()
      const currentFen = chess.current.fen()
      const history = chess.current.history({ verbose: true }).map((m) => m.lan)
      const res = await engine.evaluate(
        { startFen: lesson.fen, moves: history, fen: currentFen },
        { depth: ENGINE_DEPTH },
      )
      if (run !== attempt.current) return
      setLiveEval({ score: res.score, turn: sideToMove(currentFen) })
      if (res.bestMove) {
        setHintMove(describeMove(currentFen, res.bestMove))
      }
    } finally {
      if (run === attempt.current) setHintLoading(false)
    }
  }

  function judge(moves: number, score: Score | null) {
    const c = chess.current
    return judgeEndgame({
      goal: lesson.goal,
      color: lesson.color,
      checkmate: c.isCheckmate(),
      rulesDraw:
        c.isStalemate() ||
        c.isInsufficientMaterial() ||
        c.isThreefoldRepetition() ||
        c.isDrawByFiftyMoves(),
      sideToMove: c.turn() === 'w' ? 'white' : 'black',
      userMoves: moves,
      moveLimit: lesson.moveLimit,
      score,
      promoted: promoted.current,
    })
  }

  function finish(result: EndgameResult, moves: number) {
    if (result.outcome === 'continue') return false
    playSound(result.outcome === 'success' ? 'correct' : 'wrong')
    setPhase({ status: 'done', result })
    void recordEndgameAttempt(lesson.id, result.outcome === 'success', moves)
    void recordActivity()
    return true
  }

  function tryMove(from: string, to: string): boolean {
    if (!canMove) return false
    let move
    try {
      move = chess.current.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    playMoveSan(move.san)
    if (move.promotion) promoted.current = true
    const moves = userMoves + 1
    setUserMoves(moves)
    setSelected(null)
    setHintMove(null)
    setLastMove({ from, to })
    setFen(chess.current.fen())
    if (finish(judge(moves, null), moves)) return true

    setPhase({ status: 'playing', thinking: true })
    const run = attempt.current
    void (async () => {
      try {
        const engine = await getSharedEngine()
        const afterUserFen = chess.current.fen()
        const history = chess.current.history({ verbose: true }).map((m) => m.lan)
        const reply = await engine.evaluate(
          { startFen: lesson.fen, moves: history, fen: afterUserFen },
          { depth: ENGINE_DEPTH },
        )
        if (run !== attempt.current) return // restarted meanwhile
        const oppTurn = sideToMove(afterUserFen)
        setLiveEval({ score: reply.score, turn: oppTurn })
        const userPerspective = flipScore(reply.score)
        const displayScore = formatScore(reply.score, oppTurn)
        if (lesson.goal === 'draw') {
          const ok =
            userPerspective.type === 'cp'
              ? userPerspective.value >= -150
              : userPerspective.value > 0
          setMoveFeedback({
            tone: ok ? 'good' : 'warn',
            text: t(ok ? 'endgame.eval.drawGood' : 'endgame.eval.drawWarn', {
              score: displayScore,
            }),
          })
        } else {
          const ok =
            userPerspective.type === 'mate'
              ? userPerspective.value > 0
              : userPerspective.value >= 350
          setMoveFeedback({
            tone: ok ? 'good' : 'warn',
            text: t(ok ? 'endgame.eval.good' : 'endgame.eval.warn', { score: displayScore }),
          })
        }
        if (finish(judge(moves, reply.score), moves)) return
        if (reply.bestMove) {
          const r = chess.current.move({
            from: reply.bestMove.slice(0, 2),
            to: reply.bestMove.slice(2, 4),
            promotion: reply.bestMove.length > 4 ? reply.bestMove.slice(4, 5) : undefined,
          })
          playMoveSan(r.san)
          setLastMove({ from: r.from, to: r.to })
          setFen(chess.current.fen())
        }
        if (finish(judge(moves, null), moves)) return
        setPhase({ status: 'playing', thinking: false })
      } catch (error) {
        if (run !== attempt.current) return
        setPhase({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    })()
    return true
  }

  const targets = useMemo(
    () =>
      selected
        ? new Chess(fen).moves({ square: selected, verbose: true }).map((m) => m.to as string)
        : [],
    [fen, selected],
  )

  function onSquareClick(square: string, pieceType: string | undefined) {
    if (!canMove) return
    if (selected && targets.includes(square) && tryMove(selected, square)) return
    setSelected(pieceType?.startsWith(myPrefix) ? (square as Square) : null)
  }

  const squareStyles: Record<string, CSSProperties> = {}
  if (lastMove) {
    squareStyles[lastMove.from] = LAST_MOVE_STYLE
    squareStyles[lastMove.to] = LAST_MOVE_STYLE
  }
  if (selected) {
    squareStyles[selected] = SELECTED_STYLE
    for (const square of targets) squareStyles[square] = TARGET_STYLE
  }

  const arrows = hintMove
    ? [{ startSquare: hintMove.from, endSquare: hintMove.to, color: 'rgba(16, 185, 129, 0.9)' }]
    : []

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex w-full max-w-[592px] items-stretch gap-2 self-center lg:self-start">
        {liveEval && (
          <EvalBar score={liveEval.score} sideToMove={liveEval.turn} orientation={lesson.color} />
        )}
        <div className="club-board-frame min-w-0 flex-1">
          <div className="aspect-square w-full touch-none select-none overflow-hidden rounded-[6px]">
            <Chessboard
              options={{
                id: 'endgame-board',
                position: fen,
                boardOrientation: lesson.color,
                allowDragging: canMove,
                canDragPiece: ({ piece }) => canMove && piece.pieceType.startsWith(myPrefix),
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  targetSquare ? tryMove(sourceSquare, targetSquare) : false,
                onSquareClick: ({ piece, square }) => onSquareClick(square, piece?.pieceType),
                arrows,
                allowDrawingArrows: true,
                squareStyles,
                animationDurationInMs: 150,
                ...boardColors,
              }}
            />
          </div>
        </div>
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 border-t-[3px] border-t-violet-400 bg-slate-900/95 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-bold text-slate-100">{lessonTitle(lesson)}</p>
            <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 font-mono text-xs text-slate-300 tabular-nums">
              {t('endgame.moves', { used: userMoves, limit: lesson.moveLimit })}
            </span>
          </div>
          <p className="text-[15px] text-slate-200">
            {t(`endgame.goal.${lesson.goal}`, { moves: lesson.moveLimit })} ·{' '}
            {t('puzzles.toMove', { color: t(`color.${lesson.color}`) })}
          </p>
          {!isOwn(lesson) && (
            <p className="text-sm leading-relaxed text-slate-400">
              {t(`endgame.hint.${lesson.id}` as Parameters<typeof t>[0])}
            </p>
          )}
          {isOwn(lesson) && (
            <p className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              {t('endgame.own.context', {
                move: ownPlayed ? formatMoveBadge(ownPlayed) : lesson.playedSan,
              })}
            </p>
          )}
        </div>

        {moveFeedback && phase.status === 'playing' && (
          <p
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-[15px] font-medium ${
              moveFeedback.tone === 'good'
                ? 'border-emerald-700/70 bg-emerald-950/35 text-emerald-200'
                : 'border-amber-700/70 bg-amber-950/35 text-amber-200'
            }`}
          >
            {moveFeedback.text}
          </p>
        )}

        {hintMove && phase.status === 'playing' && (
          <div className="flex items-center gap-2 rounded-xl border border-sky-700/70 bg-sky-950/30 px-3.5 py-2.5 text-[15px] font-semibold text-sky-200">
            <span>💡 {t('endgame.hintShown', { move: formatMoveBadge(hintMove) })}</span>
            <span className="font-mono text-xs font-normal text-slate-400">({hintMove.san})</span>
          </div>
        )}

        {phase.status === 'playing' && phase.thinking && (
          <p className="text-slate-400" role="status">
            {t('endgame.thinking')}
          </p>
        )}
        {phase.status === 'error' && (
          <p className="text-rose-400" role="alert">
            {t('puzzles.error', { message: phase.message })}
          </p>
        )}
        {phase.status === 'done' && (
          <p
            role="status"
            className={`rounded-xl border p-4 text-base font-semibold ${
              phase.result.outcome === 'success'
                ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-800 bg-rose-950/30 text-rose-300'
            }`}
          >
            {t(
              `endgame.result.${phase.result.outcome}.${phase.result.reason}` as Parameters<
                typeof t
              >[0],
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {phase.status === 'playing' && (
            <button
              type="button"
              disabled={!canMove || hintLoading}
              onClick={() => void requestHint()}
              className="min-h-11 rounded-lg border border-sky-600/70 bg-sky-950/30 px-4 font-medium text-sky-200 transition-colors hover:border-sky-400 disabled:opacity-40"
            >
              💡 {hintLoading ? '…' : t('endgame.hintBtn')}
            </button>
          )}
          <button
            type="button"
            onClick={restart}
            className="min-h-11 rounded-lg border border-slate-600 px-4 font-medium hover:border-slate-400"
          >
            ↺ {t('endgame.restart')}
          </button>
          {isOwn(lesson) && (
            <a
              href={routeHref({ name: 'game', username, id: lesson.gameId, ply: lesson.ply })}
              className="grid min-h-11 place-items-center rounded-lg border border-slate-700 px-4 text-slate-200 hover:border-slate-500"
            >
              📜 {t('endgame.own.viewGame')}
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}
