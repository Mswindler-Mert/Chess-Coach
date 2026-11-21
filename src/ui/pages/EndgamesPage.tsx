import { Chess, type Square } from 'chess.js'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Chessboard } from 'react-chessboard'
import { normalizeUsername } from '../../core/api/username'
import { CURRICULUM, type EndgameLesson } from '../../core/endgames/curriculum'
import type { OwnEndgame } from '../../core/endgames/fromGames'
import { judgeEndgame, type EndgameResult } from '../../core/endgames/judge'
import type { Score } from '../../core/analysis/types'
import {
  getEndgameProgress,
  getOwnEndgame,
  loadOwnEndgames,
  recordEndgameAttempt,
  type EndgameProgress,
} from '../../db/endgames'
import { getSharedEngine } from '../../engine/shared'
import { t } from '../../i18n'
import { formatDate } from '../format'
import { routeHref } from '../router'

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
  const [fen, setFen] = useState(lesson.fen)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [userMoves, setUserMoves] = useState(0)
  const [phase, setPhase] = useState<Phase>({ status: 'playing', thinking: false })
  const [selected, setSelected] = useState<Square | null>(null)
  const promoted = useRef(false)
  const attempt = useRef(0)

  const myPrefix = lesson.color === 'white' ? 'w' : 'b'
  const canMove = phase.status === 'playing' && !phase.thinking

  const restart = useCallback(() => {
    attempt.current++
    chess.current = new Chess(lesson.fen)
    promoted.current = false
    setFen(lesson.fen)
    setLastMove(null)
    setUserMoves(0)
    setSelected(null)
    setPhase({ status: 'playing', thinking: false })
  }, [lesson.fen])

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
    setPhase({ status: 'done', result })
    void recordEndgameAttempt(lesson.id, result.outcome === 'success', moves)
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
    if (move.promotion) promoted.current = true
    const moves = userMoves + 1
    setUserMoves(moves)
    setSelected(null)
    setLastMove({ from, to })
    setFen(chess.current.fen())
    if (finish(judge(moves, null), moves)) return true

    setPhase({ status: 'playing', thinking: true })
    const run = attempt.current
    void (async () => {
      try {
        const engine = await getSharedEngine()
        const history = chess.current.history({ verbose: true }).map((m) => m.lan)
        const reply = await engine.evaluate(
          { startFen: lesson.fen, moves: history, fen: chess.current.fen() },
          { depth: ENGINE_DEPTH },
        )
        if (run !== attempt.current) return // restarted meanwhile
        if (finish(judge(moves, reply.score), moves)) return
        if (reply.bestMove) {
          const r = chess.current.move({
            from: reply.bestMove.slice(0, 2),
            to: reply.bestMove.slice(2, 4),
            promotion: reply.bestMove.length > 4 ? reply.bestMove.slice(4, 5) : undefined,
          })
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

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="aspect-square w-full max-w-[560px] touch-none self-center select-none lg:self-start">
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
            allowDrawingArrows: true,
            squareStyles,
            animationDurationInMs: 150,
            darkSquareStyle: { backgroundColor: '#769656' },
            lightSquareStyle: { backgroundColor: '#eeeed2' },
          }}
        />
      </div>

      <aside className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="text-base font-semibold">{lessonTitle(lesson)}</p>
          <p className="text-slate-300">
            {t(`endgame.goal.${lesson.goal}`, { moves: lesson.moveLimit })} ·{' '}
            {t('puzzles.toMove', { color: t(`color.${lesson.color}`) })}
          </p>
          {!isOwn(lesson) && (
            <p className="text-slate-400">
              {t(`endgame.hint.${lesson.id}` as Parameters<typeof t>[0])}
            </p>
          )}
          {isOwn(lesson) && (
            <a
              href={routeHref({ name: 'game', username, id: lesson.gameId, ply: lesson.ply })}
              className="self-start text-emerald-400 hover:underline"
            >
              {t('endgame.own.view', { move: lesson.playedSan })}
            </a>
          )}
          <p className="text-slate-400 tabular-nums">
            {t('endgame.moves', { used: userMoves, limit: lesson.moveLimit })}
          </p>
        </div>

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
            className={`rounded-xl border p-3 font-semibold ${
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

        <button
          type="button"
          onClick={restart}
          className="min-h-11 self-start rounded-lg border border-slate-600 px-4 font-medium hover:border-slate-400"
        >
          {t('endgame.restart')}
        </button>
      </aside>
    </div>
  )
}
